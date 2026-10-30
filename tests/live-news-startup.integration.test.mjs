import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness, waitFor } from './helpers/browser-harness.mjs';
const sessionToken = 'live-news-startup-local-test-token';
const validNews = {
  result: true,
  checked: false,
  news: '<p>Local news release one</p>',
  newsMark: 'local-news-mark-one',
};
const updatedNews = {
  result: true,
  checked: true,
  news: '<p>Local news release two</p>',
  newsMark: 'local-news-mark-two',
};

const readNewsButtonExpression = `([...document.querySelectorAll('.dialog-feed button')]
  .find(button => button.textContent.trim() === '标记为已读') ?? null)`;

function createLocalApi(requests, readRequests) {
  let newsMode = 'failure';
  let readMode = 'refresh-fails';
  const mock = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    const url = new URL(request.url, 'http://127.0.0.1');
    const authenticated = request.headers.token === sessionToken;
    const record = {
      method: request.method,
      path: url.pathname,
      body,
      token: request.headers.token,
      status: null,
    };
    requests.push(record);
    const send = value => {
      record.status = response.statusCode;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(value));
    };
    if (url.pathname === '/sd-api/preInfo') {
      send({ testMode: false, testWebUIAuthBypass: false, testWebUIOriginRateLimitBypass: false });
    } else if (url.pathname === '/sd-api/signin/salt') {
      send({ salt: 'live-news-local-test-salt' });
    } else if (url.pathname === '/sd-api/signin' && request.method === 'POST') {
      if (body?.password !== 'defaultSignin') {
        response.statusCode = 401;
        send({ error: 'Unexpected local signin payload' });
      } else send({ token: sessionToken });
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
    } else if (url.pathname === '/sd-api/utils/news' && request.method === 'GET') {
      if (newsMode === 'failure') {
        response.statusCode = 404;
        send({ result: false });
      } else if (newsMode === 'empty') {
        send({ result: true, checked: true, news: '', newsMark: 'empty-news-mark' });
      } else send(newsMode === 'updated' ? updatedNews : validNews);
    } else if (url.pathname === '/sd-api/utils/check_news' && request.method === 'POST') {
      readRequests.push(record);
      if (readMode === 'refresh-fails') {
        newsMode = 'failure';
      } else if (readMode === 'refresh-updates') {
        newsMode = 'updated';
      }
      send({ result: true, newsMark: body?.newsMark });
    } else {
      send({});
    }
  });

  return {
    mock,
    setNewsMode(mode) {
      newsMode = mode;
    },
    setReadMode(mode) {
      readMode = mode;
    },
  };
}

test(
  'optional news failures preserve the authenticated workspace and recover read state',
  { timeout: 120000 },
  async () => {
    const requests = [];
    const readRequests = [];
    const fixture = createLocalApi(requests, readRequests);
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: fixture.mock,
        name: 'live-news-startup',
      });
      const { cdp } = browser;
      const workspaceReady = `document.querySelector('.news-button') &&
        document.querySelector('.connection-status')?.textContent.includes('已连接')`;
      const clickReadNews = async () => {
        const clicked = await evaluate(
          cdp,
          `(() => {
            const button = ${readNewsButtonExpression};
            if (!button || button.disabled) return false;
            button.click();
            return true;
          })()`,
        );
        assert.equal(clicked, true, 'the enabled “标记为已读” action should be available');
      };

      await browser.navigate('/#/', workspaceReady, 'the signed-in main workspace');
      await waitFor(
        () => requests.some(request => request.path === '/sd-api/utils/news'),
        'the startup news request',
      );
      const startupNewsRequest = requests
        .filter(request => request.path === '/sd-api/utils/news')
        .at(-1);
      assert.equal(
        startupNewsRequest?.status,
        404,
        'the fixture should reject the initial request',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `(() => {
              const message = [...document.querySelectorAll('.el-message[role="alert"]')]
                .find(element => element.getClientRects().length > 0);
              return Boolean(message?.textContent.trim() && ${workspaceReady});
            })()`,
          ),
        'visible news failure beside a usable workspace',
      );
      assert.deepEqual(browser.pageErrors, [], 'an optional news failure stays out of page errors');
      assert.deepEqual(
        await browser.getUnhandledRejections(),
        [],
        'an optional news failure is handled',
      );
      assert.ok(
        requests.some(request => request.path === '/sd-api/signin' && request.method === 'POST'),
        'the scenario uses ordinary sign-in',
      );
      assert.ok(
        requests.some(
          request => request.path === '/sd-api/baseInfo' && request.token === sessionToken,
        ),
        'authenticated workspace requests continue after the optional failure',
      );

      await evaluate(cdp, `document.querySelector('.news-button').click()`);
      await waitFor(
        () => evaluate(cdp, `Boolean(document.querySelector('.dialog-feed [role="alert"]'))`),
        'the persistent news failure state',
      );
      const failedDialog = await evaluate(
        cdp,
        `(() => {
          const dialog = document.querySelector('.dialog-feed');
          const alert = dialog?.querySelector('[role="alert"]');
          const confirm = ${readNewsButtonExpression};
          return {
            alertVisible: Boolean(alert && alert.getBoundingClientRect().height > 0),
            alertHasExplanation: Boolean(alert?.textContent.trim()),
            contentVisible: Boolean(dialog?.querySelector('[data-news-content]')),
            confirmDisabled: confirm?.disabled === true,
          };
        })()`,
      );
      assert.deepEqual(failedDialog, {
        alertVisible: true,
        alertHasExplanation: true,
        contentVisible: false,
        confirmDisabled: true,
      });
      assert.equal(
        readRequests.length,
        0,
        'a failed initial fetch must not mark an unknown item as read',
      );

      fixture.setNewsMode('valid');
      const beforeAvailableReload = requests.filter(
        request => request.path === '/sd-api/utils/news',
      ).length;
      await browser.reload(workspaceReady, 'the workspace reloaded with available news');
      await waitFor(
        () =>
          requests.filter(request => request.path === '/sd-api/utils/news').length >
          beforeAvailableReload,
        'the available news request',
      );
      await evaluate(cdp, `document.querySelector('.news-button').click()`);
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.querySelector('.dialog-feed')?.textContent.includes(
              ${JSON.stringify('Local news release one')}
            )`,
          ),
        'the available news content',
      );

      const beforeFailedRead = readRequests.length;
      const beforeFailedRefresh = requests.filter(
        request => request.path === '/sd-api/utils/news',
      ).length;
      await clickReadNews();
      await waitFor(
        () =>
          readRequests.length === beforeFailedRead + 1 &&
          requests.filter(request => request.path === '/sd-api/utils/news').length >
            beforeFailedRefresh,
        'the read action and failed refresh',
      );
      await waitFor(
        () => evaluate(cdp, `Boolean(document.querySelector('.dialog-feed [role="alert"]'))`),
        'the failed refresh state beside retained news',
      );
      assert.deepEqual(await browser.getUnhandledRejections(), [], 'a failed refresh is handled');
      const retainedNews = await evaluate(
        cdp,
        `(() => {
          const dialog = document.querySelector('.dialog-feed');
          const badge = document.querySelector('.news-button .el-badge__content');
          return {
            oldContentRetained:
              dialog?.textContent.includes(${JSON.stringify('Local news release one')}) ?? false,
            failureVisible: Boolean(dialog?.querySelector('[role="alert"]')),
            unreadBadgeVisible: Boolean(badge && getComputedStyle(badge).display !== 'none'),
          };
        })()`,
      );
      assert.equal(readRequests.at(-1).body.newsMark, validNews.newsMark);
      assert.deepEqual(retainedNews, {
        oldContentRetained: true,
        failureVisible: true,
        unreadBadgeVisible: true,
      });

      fixture.setReadMode('refresh-updates');
      const beforeRecoveredRead = readRequests.length;
      const beforeRecoveredRefresh = requests.filter(
        request => request.path === '/sd-api/utils/news',
      ).length;
      await clickReadNews();
      await waitFor(
        () =>
          readRequests.length === beforeRecoveredRead + 1 &&
          requests.filter(request => request.path === '/sd-api/utils/news').length >
            beforeRecoveredRefresh,
        'the recovered read action and refresh',
      );
      await waitFor(
        () =>
          evaluate(
            cdp,
            `(() => {
              const dialog = document.querySelector('.dialog-feed');
              return !dialog || dialog.getClientRects().length === 0;
            })()`,
          ),
        'the dialog to close after the successful refresh',
      );
      assert.equal(
        readRequests.at(-1).body.newsMark,
        validNews.newsMark,
        'the failed refresh does not advance the next read mark',
      );
      await evaluate(cdp, `document.querySelector('.news-button').click()`);
      await waitFor(
        () =>
          evaluate(
            cdp,
            `document.querySelector('.dialog-feed')?.textContent.includes(
              ${JSON.stringify('Local news release two')}
            )`,
          ),
        'the updated news content',
      );
      const recoveredRead = await evaluate(
        cdp,
        `(() => {
          const badge = document.querySelector('.news-button .el-badge__content');
          return {
            failureVisible: Boolean(document.querySelector('.dialog-feed [role="alert"]')),
            unreadBadgeHidden: !badge || getComputedStyle(badge).display === 'none',
          };
        })()`,
      );
      assert.deepEqual(recoveredRead, { failureVisible: false, unreadBadgeHidden: true });

      fixture.setNewsMode('empty');
      const beforeEmptyReload = requests.filter(
        request => request.path === '/sd-api/utils/news',
      ).length;
      await browser.reload(workspaceReady, 'the workspace reloaded with empty news');
      await waitFor(
        () =>
          requests.filter(request => request.path === '/sd-api/utils/news').length >
          beforeEmptyReload,
        'the empty successful news response',
      );
      await evaluate(cdp, `document.querySelector('.news-button').click()`);
      await waitFor(
        () => evaluate(cdp, `Boolean(document.querySelector('.dialog-feed [role="status"]'))`),
        'the empty-news state',
      );
      assert.deepEqual(
        await evaluate(
          cdp,
          `({
            emptyStateVisible: Boolean(document.querySelector('.dialog-feed [role="status"]')),
            failureVisible: Boolean(document.querySelector('.dialog-feed [role="alert"]')),
          })`,
        ),
        { emptyStateVisible: true, failureVisible: false },
      );

      assert.deepEqual(browser.pageErrors, [], 'news failures stay inside the news flow');
      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.externalRequests, []);
    } finally {
      await browser?.close();
    }
  },
);
