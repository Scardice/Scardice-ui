import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness, waitFor } from './helpers/browser-harness.mjs';
const storyFixture = {
  id: 1,
  name: 'Pagination Story Fixture',
  groupId: 'UI-test-group',
  createdAt: 1700000000,
  updatedAt: 1700000000,
  size: 3,
};
const storySecondPageFixture = {
  ...storyFixture,
  id: 2,
  name: 'Second-page Story Fixture',
  updatedAt: 1700000100,
};
const banFixtures = Array.from({ length: 11 }, (_, index) => ({
  ID: `UI-test-ban-${index + 1}`,
  name: `UI Pagination Ban User ${String(index + 1).padStart(2, '0')}`,
  rank: -30,
  reasons: ['Loopback pagination fixture'],
  times: [1700000000],
  places: ['UI test group'],
}));

function createLocalApi(requests) {
  const sessionToken = 'pagination-count-local-test-token';
  const mock = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    const url = new URL(request.url, 'http://127.0.0.1');
    requests.push({
      method: request.method,
      path: url.pathname,
      query: url.search,
      body,
      token: request.headers.token,
    });
    response.setHeader('Content-Type', 'application/json');

    const send = value => response.end(JSON.stringify(value));
    const authenticated = request.headers.token === sessionToken;
    if (url.pathname === '/sd-api/preInfo') {
      send({ testMode: false, testWebUIAuthBypass: false, testWebUIOriginRateLimitBypass: false });
    } else if (url.pathname === '/sd-api/signin/salt') {
      send({ salt: 'pagination-count-local-test-salt' });
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
      send({ result: true, checked: true, news: '', newsMark: 'pagination-test' });
    } else if (url.pathname === '/sd-api/story/info') {
      send([3, 40, 3, 40]);
    } else if (url.pathname === '/sd-api/story/logs/page') {
      const pageNum = Number(url.searchParams.get('pageNum') ?? 1);
      const data = pageNum === 2 ? [storySecondPageFixture] : [storyFixture];
      send({ result: true, total: 40, data, pageNum, pageSize: 20 });
    } else if (url.pathname === '/sd-api/banconfig/list') {
      send(banFixtures);
    } else {
      send({});
    }
  });
  return { mock, sessionToken };
}

test(
  'Story and Ban pagers change visible pages and Story state survives tab switching',
  { timeout: 120000 },
  async () => {
    const requests = [];
    const { mock } = createLocalApi(requests);
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: mock,
        name: 'pagination',
      });
      const { cdp } = browser;
      await browser.navigate(
        '/#/mod/story',
        `document.body.innerText.includes(${JSON.stringify(storyFixture.name)}) &&
          document.querySelector(
            '.story-pagination .el-pager li.is-active'
          )?.textContent.trim() === '1'`,
        'Story page one and its pager',
      );

      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const next = document.querySelector('.story-pagination .btn-next');
            if (!next || next.disabled) return false;
            next.click();
            return true;
          })()`,
        ),
        true,
        'Story next-page control should be available',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.body.innerText.includes(${JSON.stringify(storySecondPageFixture.name)}) &&
              !document.body.innerText.includes(${JSON.stringify(storyFixture.name)}) &&
              document.querySelector(
                '.story-pagination .el-pager li.is-active'
              )?.textContent.trim() === '2'`,
          ),
        'Story page two data',
      );
      assert.ok(
        requests.some(
          request =>
            request.path === '/sd-api/story/logs/page' &&
            new URLSearchParams(request.query).get('pageNum') === '2',
        ),
        'changing Story pages requests page two from Core',
      );

      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const tab = [...document.querySelectorAll('.el-tabs__item')]
              .find(item => item.textContent.trim() === '日志备份');
            if (!tab) return false;
            tab.click();
            return true;
          })()`,
        ),
        true,
        'the Story backup tab should be available',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.querySelector(
              '.el-tabs__item.is-active'
            )?.textContent.trim() === '日志备份'`,
          ),
        'the Story backup tab',
      );
      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const tab = [...document.querySelectorAll('.el-tabs__item')]
              .find(item => item.textContent.trim() === '日志列表');
            if (!tab) return false;
            tab.click();
            return true;
          })()`,
        ),
        true,
        'the Story log-list tab should be available',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.querySelector(
              '.el-tabs__item.is-active'
            )?.textContent.trim() === '日志列表' &&
              document.body.innerText.includes(${JSON.stringify(storySecondPageFixture.name)}) &&
              document.querySelector(
                '.story-pagination .el-pager li.is-active'
              )?.textContent.trim() === '2'`,
          ),
        'Story page two after returning to the log list',
      );

      await browser.navigate(
        '/#/misc/ban',
        `document.body.innerText.includes(${JSON.stringify(banFixtures[0].name)}) &&
          document.querySelector(
            '.ban-pagination .el-pager li.is-active'
          )?.textContent.trim() === '1'`,
        'Ban page one and its pager',
      );
      assert.equal(
        await evaluate(
          cdp,
          `(() => {
            const next = document.querySelector('.ban-pagination .btn-next');
            if (!next || next.disabled) return false;
            next.click();
            return true;
          })()`,
        ),
        true,
        'Ban next-page control should be available',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.body.innerText.includes(${JSON.stringify(banFixtures[10].name)}) &&
              !document.body.innerText.includes(${JSON.stringify(banFixtures[0].name)}) &&
              document.querySelector(
                '.ban-pagination .el-pager li.is-active'
              )?.textContent.trim() === '2'`,
          ),
        'Ban page two data',
      );

      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.pageErrors, []);
      assert.deepEqual(browser.externalRequests, []);
    } finally {
      await browser?.close();
    }
  },
);
