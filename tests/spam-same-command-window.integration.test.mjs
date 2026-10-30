import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness, waitFor } from './helpers/browser-harness.mjs';

const defaultSpamSameCommandWindowSec = 30;
const initialSpamSameCommandWindowSec = 42;
const fieldInputExpression = `document.querySelector(
  'input[name="spamSameCommandWindowSec"]'
)`;

function clickExpression(cdp, expression, description) {
  return waitFor(
    () =>
      evaluate(
        cdp,
        `(() => {
    const element = (${expression});
    if (!element) throw new Error(${JSON.stringify(`Could not locate ${description}`)});
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error(${JSON.stringify(`${description} is not visible`)});
    }
    const topElement = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    if (!topElement || (element !== topElement && !element.contains(topElement))) {
      throw new Error(
        ${JSON.stringify(`${description} is covered by `)} +
          (topElement?.className?.baseVal ?? topElement?.className ?? topElement?.tagName ?? 'unknown'),
      );
    }
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`,
      ),
    `${description} to become actionable`,
  ).then(async point => {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
    });
  });
}

async function replaceInputWith(cdp, value) {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    modifiers: 2,
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    modifiers: 2,
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  if (value === '') {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Backspace',
      code: 'Backspace',
      windowsVirtualKeyCode: 8,
      nativeVirtualKeyCode: 8,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Backspace',
      code: 'Backspace',
      windowsVirtualKeyCode: 8,
      nativeVirtualKeyCode: 8,
    });
  } else {
    await cdp.send('Input.insertText', { text: value });
  }
}
async function waitForSaveEnabled(cdp) {
  await waitFor(
    () =>
      evaluate(
        cdp,
        `[...document.querySelectorAll('.settings-save-actions button')]
          .some(button => button.textContent.trim() === '保存设置' && !button.disabled)`,
      ),
    'settings save action to become enabled',
  );
}

function createSettingsMock(requests) {
  const state = {
    config: {
      commandPrefix: ['.'],
      diceMasters: ['10000001'],
      noticeIds: [],
      rateLimitEnabled: true,
      personalReplenishRate: '@every 3s',
      personalBurst: 3,
      groupReplenishRate: '@every 3s',
      groupBurst: 3,
      spamSameCommandWindowSec: initialSpamSameCommandWindowSec,
      spamRecoveryMultiplierMax: 5,
    },
  };
  const sessionToken = 'spam-clear-local-test-token';
  const server = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    response.setHeader('Content-Type', 'application/json');
    const authenticated = request.headers.token === sessionToken;
    const call = {
      method: request.method,
      url: request.url,
      body,
      authenticated,
      status: 200,
    };
    requests.push(call);
    const send = value => {
      call.response = value;
      response.end(JSON.stringify(value));
    };

    if (request.url === '/sd-api/preInfo') {
      send({ testMode: false, testWebUIAuthBypass: false, testWebUIOriginRateLimitBypass: false });
    } else if (request.url === '/sd-api/signin/salt') {
      send({ salt: 'local-spam-clear-test-salt' });
    } else if (request.url === '/sd-api/signin' && request.method === 'POST') {
      if (body?.password !== 'defaultSignin') {
        response.statusCode = 401;
        call.status = 401;
        send({ error: 'Unexpected local signin payload' });
      } else {
        send({ token: sessionToken });
      }
    } else if (request.url === '/sd-api/hello') {
      if (authenticated) send({});
      else {
        response.statusCode = 401;
        call.status = 401;
        send({ error: 'Local session required' });
      }
    } else if (!authenticated) {
      response.statusCode = 401;
      call.status = 401;
      send({ error: 'Local session required' });
    } else if (request.url === '/sd-api/baseInfo') {
      send({
        appChannel: 'test',
        version: 'test-build',
        versionSimple: 'test',
        versionNew: 'test',
        versionNewNote: '',
        versionCode: 1,
        versionNewCode: 1,
        memoryAlloc: 1000000,
        memoryUsedSys: 2000000,
        uptime: 123,
        OS: 'linux',
        arch: 'x64',
        justForTest: true,
        containerMode: false,
      });
    } else if (request.url === '/sd-api/configs/customText') {
      send({ texts: { COC: {}, DND: {} }, helpInfo: {}, previewInfo: {} });
    } else if (request.url === '/sd-api/checkSecurity') {
      send({ isOk: true });
    } else if (request.url === '/sd-api/endpoints') {
      send([]);
    } else if (request.url === '/sd-api/utils/news') {
      send({ result: true, news: '', checked: true, newsMark: 'spam-clear-test' });
    } else if (request.url === '/sd-api/activity/recent') {
      send({ result: true, items: [], timestamp: Date.now() });
    } else if (request.url === '/sd-api/log/fetchAndClear') {
      send([]);
    } else if (request.url === '/sd-api/dice/recentMessage') {
      send([]);
    } else if (request.url === '/sd-api/dice/config/get') {
      send({ ...state.config });
    } else if (request.url === '/sd-api/dice/config/advanced/get') {
      send({
        show: false,
        enable: false,
        storyLogBackendUrl: '',
        storyLogApiVersion: '',
        storyLogBackendToken: '',
        customReplyCooldown: 5,
        exposeDangerousSealInst: false,
        allowFilesystemUnrestrictedAccess: false,
      });
    } else if (request.url === '/sd-api/dice/config/set' && request.method === 'POST') {
      const value = body?.spamSameCommandWindowSec;
      // Mirrors Core: null and values below 1 are ignored while the endpoint returns success.
      if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
        state.config.spamSameCommandWindowSec = Math.trunc(value);
      }
      send({});
    } else {
      send({});
    }
  });
  return { server, state };
}

test(
  'keyboard-clearing the repeat-command window saves and reads back default 30',
  { timeout: 120000 },
  async () => {
    const requests = [];
    const { server, state } = createSettingsMock(requests);
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: server,
        name: 'spam-command-window',
        chromiumArgs: ['--window-size=1600,1100'],
      });
      const { cdp } = browser;
      await browser.navigate(
        '/#/misc/base-setting',
        `document.querySelector('.settings-workspace') &&
          [...document.querySelectorAll('.settings-nav button')]
            .some(button => button.textContent.trim() === '刷屏防护') &&
          [...document.querySelectorAll('.settings-save-actions button')]
            .some(button => button.textContent.trim() === '保存设置' && button.disabled)`,
        'the loaded settings workspace',
      );

      await clickExpression(
        cdp,
        `[...document.querySelectorAll('.settings-nav button')]
          .find(button => button.textContent.trim() === '刷屏防护')`,
        'spam-protection category',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.querySelector('#settings-category-heading')?.textContent.trim() ===
              '刷屏防护' && (${fieldInputExpression})?.value === ${JSON.stringify(
                String(initialSpamSameCommandWindowSec),
              )}`,
          ),
        'the repeat-command setting',
      );

      await clickExpression(cdp, fieldInputExpression, 'repeat-command input');
      await replaceInputWith(cdp, '');
      await waitFor(
        () => evaluate(cdp, `(${fieldInputExpression})?.value === ''`),
        'keyboard input to clear the repeat-command value',
      );
      await waitForSaveEnabled(cdp);

      const beforePost = requests.filter(
        call => call.method === 'POST' && call.url === '/sd-api/dice/config/set',
      ).length;
      const beforeGet = requests.filter(
        call => call.method === 'GET' && call.url === '/sd-api/dice/config/get',
      ).length;
      await clickExpression(
        cdp,
        `[...document.querySelectorAll('.settings-save-actions button')]
          .find(button => button.textContent.trim() === '保存设置')`,
        'save settings action',
      );
      await waitFor(
        () =>
          requests.filter(call => call.method === 'POST' && call.url === '/sd-api/dice/config/set')
            .length > beforePost &&
          requests.filter(call => call.method === 'GET' && call.url === '/sd-api/dice/config/get')
            .length > beforeGet,
        'default value save and read-back requests',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `(${fieldInputExpression})?.value === ${JSON.stringify(
              String(defaultSpamSameCommandWindowSec),
            )} &&
              [...document.querySelectorAll('.settings-save-actions button')]
                .some(button => button.textContent.trim() === '保存设置' && button.disabled)`,
          ),
        'the persisted default value',
      );

      const clearPost = requests
        .filter(call => call.method === 'POST' && call.url === '/sd-api/dice/config/set')
        .at(-1);
      const clearGet = requests
        .filter(call => call.method === 'GET' && call.url === '/sd-api/dice/config/get')
        .at(-1);
      assert.equal(
        clearPost?.body?.spamSameCommandWindowSec,
        defaultSpamSameCommandWindowSec,
        'keyboard clearing saves the default rather than null or the old value',
      );
      assert.equal(clearPost?.status, 200);
      assert.equal(clearPost?.authenticated, true);
      assert.equal(
        clearGet?.response?.spamSameCommandWindowSec,
        defaultSpamSameCommandWindowSec,
        'the authenticated read-back returns the persisted default',
      );
      assert.ok(requests.indexOf(clearGet) > requests.indexOf(clearPost));
      assert.equal(state.config.spamSameCommandWindowSec, defaultSpamSameCommandWindowSec);
      assert.equal(
        await evaluate(cdp, `(${fieldInputExpression})?.value`),
        String(defaultSpamSameCommandWindowSec),
      );

      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.pageErrors, []);
      assert.deepEqual(browser.externalRequests, []);
    } finally {
      await browser?.close();
    }
  },
);
