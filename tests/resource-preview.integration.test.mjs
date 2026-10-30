import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness } from './helpers/browser-harness.mjs';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);

function createResourceApi() {
  const requests = [];
  const server = createHttpServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname !== '/sd-api/resource/data') {
      response.writeHead(404, { 'Content-Type': 'application/json' }).end('{"err":"not found"}');
      return;
    }
    const path = url.searchParams.get('path');
    const record = { path, thumbnail: url.searchParams.get('thumbnail'), status: null };
    requests.push(record);
    if (path === 'data/images/bad.png') {
      record.status = 422;
      response.writeHead(422, { 'Content-Type': 'application/json' });
      response.end('{"err":"图片资源无法读取或解码","result":false}');
      return;
    }
    record.status = 200;
    response.writeHead(200, { 'Content-Type': 'image/png' });
    response.end(png);
  });
  return { server, requests };
}

test(
  'rejected image shows an accessible failure while a valid sibling image decodes',
  { timeout: 120000 },
  async () => {
    const fixture = createResourceApi();
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: fixture.server,
        name: 'resource-preview',
        vite: {
          plugins: [
            {
              name: 'resource-preview-integration-entry',
              configureServer(server) {
                server.middlewares.use('/__resource_preview_test__', async (_request, response) => {
                  response.setHeader('Content-Type', 'text/html; charset=utf-8');
                  const html = `<!doctype html><html><head><style>#good .el-image, #good img { width: 128px; height: 96px; }</style></head><body><div id="app"></div><script type="module">
                    import { createApp, h } from 'vue';
                    import ResourceRender from '/src/components/utils/resource-render.vue';
                    createApp({ render: () => h('main', [
                      h('section', { id: 'bad' }, [h(ResourceRender, { data: { path: 'data/images/bad.png', name: '坏图.png', type: 'image' }, mini: true })]),
                      h('section', { id: 'good' }, [h(ResourceRender, { data: { path: 'data/images/good.png', name: '好图.png', type: 'image' }, mini: true })]),
                    ]) }).mount('#app');
                  </script></body></html>`;
                  response.end(await server.transformIndexHtml('/index.html', html));
                });
              },
            },
          ],
        },
      });
      const { cdp } = browser;
      await browser.navigate(
        '/__resource_preview_test__',
        `(() => {
          const alert = document.querySelector('#bad [role="alert"]');
          const image = document.querySelector('#good img');
          if (!alert || !image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
            return false;
          }
          const alertStyle = getComputedStyle(alert);
          const alertRect = alert.getBoundingClientRect();
          const imageStyle = getComputedStyle(image);
          const imageRect = image.getBoundingClientRect();
          return alertRect.width > 0 && alertRect.height > 0 &&
            alertStyle.visibility !== 'hidden' && alertStyle.display !== 'none' &&
            Number(alertStyle.opacity) > 0 &&
            imageRect.width > 0 && imageRect.height > 0 &&
            imageStyle.visibility !== 'hidden' && imageStyle.display !== 'none' &&
            Number(imageStyle.opacity) > 0;
        })()`,
        'the failed and successful resource previews',
      );

      const state = await evaluate(
        cdp,
        `(() => {
          const alert = document.querySelector('#bad [role="alert"]');
          const image = document.querySelector('#good img');
          return {
            failureVisible: Boolean(alert?.innerText.trim()),
            failureLabel: alert?.getAttribute('aria-label') ?? null,
            goodImage: image ? {
              complete: image.complete,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              alt: image.alt,
            } : null,
          };
        })()`,
      );
      assert.equal(state.failureVisible, true, 'the rejected preview exposes a visible failure');
      assert.ok(state.failureLabel?.trim(), 'the failure has an accessible name');
      assert.ok(
        state.goodImage?.complete &&
          state.goodImage.naturalWidth > 0 &&
          state.goodImage.naturalHeight > 0,
        'the valid sibling preview still decodes',
      );
      assert.equal(state.goodImage.alt, '好图.png');
      assert.equal(
        fixture.requests.find(request => request.path === 'data/images/bad.png')?.status,
        422,
      );
      assert.equal(
        fixture.requests.find(request => request.path === 'data/images/good.png')?.status,
        200,
      );
      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.pageErrors, []);
      assert.deepEqual(browser.externalRequests, []);
    } finally {
      await browser?.close();
    }
  },
);
