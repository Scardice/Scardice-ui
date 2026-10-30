import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness, waitFor } from './helpers/browser-harness.mjs';
const fixtureDeck = {
  enable: true,
  errText: '',
  filename: 'cancel-regression.json',
  format: 'json',
  formatVersion: 1,
  fileFormat: 'json',
  name: 'Deck cancel fixture',
  version: '1.0.0',
  author: 'UI regression test',
  license: '',
  command: { deckcanceltest: true },
  date: '',
  updateDate: '',
  desc: 'Stateful local fixture for Deck cancellation.',
  updateUrls: null,
  etag: '',
  cloud: false,
};

function createDeckApi(requests) {
  let decks = [{ ...fixtureDeck }];
  const sessionToken = 'deck-cancel-local-test-token';
  const unmappedRoutes = [];
  const server = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    const url = new URL(request.url, 'http://127.0.0.1');
    requests.push({
      method: request.method,
      path: url.pathname,
      body,
      token: request.headers.token,
    });
    response.setHeader('Content-Type', 'application/json');

    const send = value => response.end(JSON.stringify(value));
    const authenticated = request.headers.token === sessionToken;
    if (url.pathname === '/sd-api/preInfo') {
      send({ testMode: false, testWebUIAuthBypass: false, testWebUIOriginRateLimitBypass: false });
    } else if (url.pathname === '/sd-api/signin/salt') {
      send({ salt: 'local-deck-cancel-test-salt' });
    } else if (url.pathname === '/sd-api/signin' && request.method === 'POST') {
      if (body?.password !== 'defaultSignin') {
        response.statusCode = 401;
        send({ error: 'Unexpected local signin payload' });
      } else {
        send({ token: sessionToken });
      }
    } else if (url.pathname === '/sd-api/hello') {
      if (authenticated) send({});
      else {
        response.statusCode = 401;
        send({ error: 'Local session required' });
      }
    } else if (!authenticated) {
      response.statusCode = 401;
      send({ error: 'Local session required' });
    } else if (url.pathname === '/sd-api/baseInfo') {
      send({
        appChannel: 'test',
        version: 'test',
        versionSimple: 'test',
        versionNew: '',
        versionNewNote: '',
        versionCode: 0,
        versionNewCode: 0,
        memoryAlloc: 0,
        memoryUsedSys: 0,
        uptime: 0,
        OS: 'test',
        arch: 'test',
        justForTest: true,
        containerMode: false,
      });
    } else if (url.pathname === '/sd-api/checkSecurity') {
      send({ isOk: true });
    } else if (url.pathname === '/sd-api/configs/customText') {
      send({ texts: {}, helpInfo: {}, previewInfo: {} });
    } else if (url.pathname === '/sd-api/activity/recent') {
      send({ result: true, items: [], timestamp: 0 });
    } else if (url.pathname === '/sd-api/endpoints') {
      send([]);
    } else if (url.pathname === '/sd-api/dice/config/advanced/get') {
      send({ show: false });
    } else if (url.pathname === '/sd-api/utils/news') {
      send({ result: true, checked: true, news: '', newsMark: 'deck-cancel-test' });
    } else if (url.pathname === '/sd-api/backup/config_get') {
      send({
        autoBackupEnable: false,
        autoBackupTime: '',
        autoBackupSelection: 0,
        backupCleanStrategy: 0,
        backupCleanKeepCount: 0,
        backupCleanKeepDur: '',
        backupCleanTrigger: 0,
        backupCleanCron: '',
        autoBackupSelectionList: [],
      });
    } else if (url.pathname === '/sd-api/deck/list') {
      send(decks);
    } else if (url.pathname === '/sd-api/deck/delete' && request.method === 'POST') {
      decks = decks.filter(deck => deck.filename !== body?.filename);
      send({});
    } else if (url.pathname === '/sd-api/deck/reload' && request.method === 'POST') {
      send({ testMode: false });
    } else {
      unmappedRoutes.push(`${request.method} ${url.pathname}`);
      response.statusCode = 404;
      send({ error: `Unexpected test request: ${request.method} ${url.pathname}` });
    }
  });
  return { server, unmappedRoutes };
}

test(
  'canceling Deck deletion keeps the item and sends no delete request',
  { timeout: 120000 },
  async () => {
    const requests = [];
    const fixture = createDeckApi(requests);
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: fixture.server,
        name: 'deck-cancel',
      });
      const { cdp } = browser;
      await browser.navigate(
        '/#/mod/deck',
        `([...document.querySelectorAll('.deck-list .deck-item')].some(card =>
          card.textContent.includes(${JSON.stringify(fixtureDeck.name)}) &&
          [...card.querySelectorAll('button')]
            .some(button => button.textContent.trim() === '删除')
        ))`,
        'the stateful Deck fixture',
      );

      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const card = [...document.querySelectorAll('.deck-list .deck-item')]
              .find(item => item.textContent.includes(${JSON.stringify(fixtureDeck.name)}));
            const button = [...(card?.querySelectorAll('button') ?? [])]
              .find(item => item.textContent.trim() === '删除');
            if (!button) return false;
            button.click();
            return true;
          })()`,
        ),
        true,
        'the Deck item exposes its delete action',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `(() => {
              const dialog = document.querySelector('.el-message-box');
              const cancel = [...(dialog?.querySelectorAll('button') ?? [])]
                .find(button => button.textContent.trim() === '取消');
              return Boolean(
                dialog?.textContent.includes(${JSON.stringify(fixtureDeck.name)}) && cancel
              );
            })()`,
          ),
        'the Deck delete confirmation',
      );
      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const dialog = document.querySelector('.el-message-box');
            const cancel = [...(dialog?.querySelectorAll('button') ?? [])]
              .find(button => button.textContent.trim() === '取消');
            if (!cancel) return false;
            cancel.click();
            return true;
          })()`,
        ),
        true,
        'the confirmation exposes a cancel action',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `!document.querySelector('.el-message-box') &&
              [...document.querySelectorAll('.deck-list .deck-item')]
                .some(card => card.textContent.includes(${JSON.stringify(fixtureDeck.name)}))`,
          ),
        'the canceled confirmation to close with the Deck intact',
      );
      await evaluate(
        cdp,
        'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
      );

      const observed = await evaluate(
        cdp,
        `({
          visible: document.body.innerText.includes(${JSON.stringify(fixtureDeck.name)}),
          cardCount: document.querySelectorAll('.deck-list .deck-item').length,
        })`,
      );
      assert.deepEqual(observed, { visible: true, cardCount: 1 });
      assert.equal(
        requests.filter(
          request => request.method === 'POST' && request.path === '/sd-api/deck/delete',
        ).length,
        0,
        'cancel does not call the delete API',
      );
      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.pageErrors, []);
      assert.deepEqual(browser.externalRequests, []);
      assert.deepEqual(fixture.unmappedRoutes, []);
    } finally {
      await browser?.close();
    }
  },
);
