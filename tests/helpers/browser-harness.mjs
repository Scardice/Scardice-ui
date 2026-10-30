import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const uiRoot = fileURLToPath(new URL('../..', import.meta.url));
const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);
const elementPlusComponents = fileURLToPath(
  new URL('./es/components/', import.meta.resolve('element-plus/package.json')),
);
// Vite 7 expands the types export first; these style entries only ship .mjs files.
const elementPlusStyles = readdirSync(elementPlusComponents, { withFileTypes: true })
  .filter(
    entry =>
      entry.isDirectory() && existsSync(join(elementPlusComponents, entry.name, 'style/css.mjs')),
  )
  .map(entry => `element-plus/es/components/${entry.name}/style/css`)
  .sort();

export async function waitFor(check, description, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError}` : ''}`);
}

function startCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) {
      const callbacks = pending.get(message.id);
      if (!callbacks) return;
      pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(message.error.message));
      else callbacks.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });
  socket.addEventListener('close', () => {
    for (const { reject } of pending.values()) reject(new Error('CDP connection closed'));
    pending.clear();
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) {
      const registered = listeners.get(method) ?? [];
      registered.push(listener);
      listeners.set(method, registered);
    },
    close() {
      socket.close();
    },
  };
}

export async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ?? response.exceptionDetails.text,
    );
  }
  return response.result.value;
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    const onError = error => reject(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Local API fixture did not bind a TCP port');
  }
  return address.port;
}

async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
    server.closeAllConnections?.();
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('close', resolve));
  child.kill('SIGTERM');
  if (await Promise.race([exited.then(() => true), delay(1500).then(() => false)])) return;
  child.kill('SIGKILL');
  await exited;
}

async function waitForStableDocument(
  vite,
  cdp,
  navigation,
  readyExpression,
  description,
  { afterTimeOrigin, timeout = 30000 } = {},
) {
  const readState = () =>
    evaluate(
      cdp,
      `(() => ({
        complete: document.readyState === 'complete',
        ready: Boolean(${readyExpression}),
        timeOrigin: performance.timeOrigin,
      }))()`,
    );
  const isReady = state => state.complete && state.ready && state.timeOrigin !== afterTimeOrigin;

  return waitFor(
    async () => {
      const state = await readState();
      if (!isReady(state) || navigation.loading) return null;
      const generation = navigation.generation;
      await vite.waitForRequestsIdle();

      // Vite 7's crawl promise is one-shot; lazy imports have separate optimizer batches.
      const optimizer = vite.environments.client.depsOptimizer;
      if (optimizer) {
        await optimizer.scanProcessing;
        while (true) {
          const metadata = optimizer.metadata;
          await Promise.all(metadata.depInfoList.map(info => info.processing));
          // Optimizer commit resolves processing promises before it schedules a full reload.
          await delay(0);
          if (
            metadata === optimizer.metadata &&
            !metadata.depInfoList.some(info => info.processing)
          )
            break;
        }
      }

      const settled = await readState();
      return isReady(settled) &&
        !navigation.loading &&
        generation === navigation.generation &&
        state.timeOrigin === settled.timeOrigin
        ? settled
        : null;
    },
    description,
    timeout,
  );
}

export async function startBrowserHarness({
  apiServer,
  name,
  sessionToken,
  vite: viteOverrides = {},
  chromiumArgs = [],
}) {
  const workDir = mkdtempSync(join(tmpdir(), `scardice-${name}-`));
  const profileDir = join(workDir, 'chromium-profile');
  const cacheDir = join(workDir, 'vite-cache');
  mkdirSync(profileDir);

  const previousApiURL = process.env.VITE_APP_APIURL;
  let vite;
  let chrome;
  let cdp;
  let closed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    const errors = [];
    if (cdp) {
      try {
        await cdp.send('Browser.close');
      } catch {
        // The browser may close the transport before acknowledging Browser.close.
      }
      cdp.close();
    }
    try {
      await stopChild(chrome);
    } catch (error) {
      errors.push(error);
    }
    try {
      if (vite) await vite.close();
    } catch (error) {
      errors.push(error);
    }
    try {
      await closeServer(apiServer);
    } catch (error) {
      errors.push(error);
    }
    if (previousApiURL === undefined) delete process.env.VITE_APP_APIURL;
    else process.env.VITE_APP_APIURL = previousApiURL;
    rmSync(workDir, { recursive: true, force: true });
    if (errors.length) throw new AggregateError(errors, 'Browser harness cleanup failed');
  };

  try {
    const apiPort = await listen(apiServer);
    const apiOrigin = `http://127.0.0.1:${apiPort}`;
    process.env.VITE_APP_APIURL = apiOrigin;

    vite = await createViteServer({
      ...viteOverrides,
      root: uiRoot,
      configFile: join(uiRoot, 'vite.config.ts'),
      cacheDir,
      // Component auto-imports inject these paths after Vite's initial dependency scan.
      optimizeDeps: {
        ...viteOverrides.optimizeDeps,
        include: [...(viteOverrides.optimizeDeps?.include ?? []), ...elementPlusStyles],
      },
      server: {
        ...viteOverrides.server,
        host: '127.0.0.1',
        port: 0,
        strictPort: true,
      },
    });
    await vite.listen();
    const viteAddress = vite.httpServer.address();
    if (!viteAddress || typeof viteAddress === 'string') {
      throw new Error('Vite did not bind a TCP port');
    }
    const viteUrl = `http://127.0.0.1:${viteAddress.port}`;
    await waitFor(async () => (await fetch(viteUrl)).ok, 'Vite frontend');

    chrome = spawn(
      process.env.CHROMIUM_BIN ?? 'chromium',
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE ::1',
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=0',
        '--remote-allow-origins=*',
        ...chromiumArgs,
        `--user-data-dir=${profileDir}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    let chromeStartError;
    chrome.once('error', error => {
      chromeStartError = error;
    });
    const cdpPort = await waitFor(async () => {
      if (chromeStartError) {
        throw new Error(`Chromium failed to start: ${chromeStartError.message}`);
      }
      if (chrome.exitCode !== null) throw new Error('Chromium exited before exposing CDP');
      try {
        return (
          Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n', 1)[0]) ||
          null
        );
      } catch {
        return null;
      }
    }, 'Chromium DevTools port');
    const target = await waitFor(async () => {
      if (chromeStartError) {
        throw new Error(`Chromium failed to start: ${chromeStartError.message}`);
      }
      if (chrome.exitCode !== null) throw new Error('Chromium exited before exposing CDP');
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      if (!response.ok) return null;
      return (await response.json()).find(
        item => item.type === 'page' && item.webSocketDebuggerUrl,
      );
    }, 'Chromium page target');

    cdp = startCdp(target.webSocketDebuggerUrl);
    const pageErrors = [];
    const externalRequests = [];
    cdp.on('Runtime.exceptionThrown', event => {
      const details = event.exceptionDetails;
      pageErrors.push(details?.exception?.description ?? details?.text ?? 'JavaScript exception');
    });
    cdp.on('Network.requestWillBeSent', event => {
      try {
        const requestUrl = new URL(event.request.url);
        if (
          ['http:', 'https:', 'ws:', 'wss:'].includes(requestUrl.protocol) &&
          !loopbackHosts.has(requestUrl.hostname)
        ) {
          externalRequests.push(event.request.url);
        }
      } catch {
        // Browser-internal URLs are outside the HTTP boundary this harness observes.
      }
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const navigation = { frameId: frameTree.frame.id, generation: 0, loading: false };
    cdp.on('Page.frameNavigated', ({ frame }) => {
      if (!frame.parentId) {
        navigation.frameId = frame.id;
        navigation.generation++;
      }
    });
    cdp.on('Page.frameStartedLoading', ({ frameId }) => {
      if (frameId === navigation.frameId) navigation.loading = true;
    });
    cdp.on('Page.frameStoppedLoading', ({ frameId }) => {
      if (frameId === navigation.frameId) navigation.loading = false;
    });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__scardiceTestUnhandled = [];
        window.addEventListener('unhandledrejection', event => {
          window.__scardiceTestUnhandled.push(
            String(event.reason?.stack ?? event.reason?.message ?? event.reason)
          );
        });
        ${
          sessionToken
            ? `if (location.origin === ${JSON.stringify(viteUrl)}) {
                 localStorage.setItem('t', ${JSON.stringify(sessionToken)});
               }`
            : ''
        }
      `,
    });

    const navigate = async (path, readyExpression, description, options) => {
      const url = new URL(path, `${viteUrl}/`).href;
      await cdp.send('Page.navigate', { url });
      return waitForStableDocument(vite, cdp, navigation, readyExpression, description, options);
    };
    const reload = async (readyExpression, description, options = {}) => {
      const priorTimeOrigin = await evaluate(cdp, 'performance.timeOrigin');
      await cdp.send('Page.reload', { ignoreCache: true });
      return waitForStableDocument(vite, cdp, navigation, readyExpression, description, {
        ...options,
        afterTimeOrigin: priorTimeOrigin,
      });
    };

    return {
      cdp,
      close,
      externalRequests,
      getUnhandledRejections: () => evaluate(cdp, 'window.__scardiceTestUnhandled ?? []'),
      navigate,
      pageErrors,
      reload,
    };
  } catch (error) {
    try {
      await close();
    } catch {
      // Preserve the startup error, which identifies the failed lifecycle step.
    }
    throw error;
  }
}
