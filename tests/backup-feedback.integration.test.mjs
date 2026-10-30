import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { evaluate, startBrowserHarness, waitFor } from './helpers/browser-harness.mjs';
const sessionToken = 'backup-feedback-integration-local-token';
const existingArchive = {
  name: 'bak_existing_r1_existing.zip',
  fileSize: 120,
  selection: 63,
};
const successfulArchive = {
  name: 'bak_feedback_success_r1_created.zip',
  fileSize: 240,
  selection: 63,
};
const testModeArchiveName = 'bak_feedback_test_mode_must_not_exist.zip';

function createLocalApi() {
  const requests = [];
  const backupItems = [{ ...existingArchive }];
  const outcomes = [];
  const unmappedRoutes = [];
  let currentJob = null;
  let activeOutcome = null;
  let statusReads = 0;
  let jobSequence = 0;
  let holdNextStatus = false;
  let releaseStatus;
  let holdNextAdmission = false;
  let releaseAdmission;
  const mock = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    const url = new URL(request.url, 'http://127.0.0.1');
    const authenticated =
      request.headers.token === sessionToken &&
      request.headers.authorization === `Bearer ${sessionToken}`;
    const record = {
      method: request.method,
      path: url.pathname,
      body,
      authenticated,
      status: null,
      responseBody: null,
    };
    requests.push(record);
    const send = (value, status = 200) => {
      record.status = status;
      record.responseBody = value;
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(value));
    };
    const requireSession = () => {
      if (authenticated) return false;
      send({ error: 'Local fixture session required' }, 401);
      return true;
    };

    if (url.pathname === '/sd-api/preInfo') {
      send({
        testMode: false,
        testWebUIAuthBypass: false,
        testWebUIOriginRateLimitBypass: false,
      });
    } else if (url.pathname === '/sd-api/signin/salt') {
      send({ salt: 'backup-feedback-integration-local-salt' });
    } else if (url.pathname === '/sd-api/hello') {
      if (!requireSession()) send({});
    } else if (url.pathname === '/sd-api/baseInfo') {
      if (!requireSession()) {
        send({
          appChannel: 'local-fixture',
          version: 'fixture',
          versionSimple: 'fixture',
          versionNew: '',
          versionNewNote: '',
          versionCode: 1,
          versionNewCode: 0,
          memoryAlloc: 0,
          memoryUsedSys: 0,
          uptime: 0,
          OS: 'linux',
          arch: 'x64',
          justForTest: false,
          containerMode: false,
          extraTitle: '',
        });
      }
    } else if (url.pathname === '/sd-api/checkSecurity') {
      if (!requireSession()) send({ isOk: true });
    } else if (url.pathname === '/sd-api/configs/customText') {
      if (!requireSession()) send({ texts: {}, helpInfo: {}, previewInfo: {} });
    } else if (url.pathname === '/sd-api/activity/recent') {
      if (!requireSession()) send({ result: true, items: [], timestamp: 0 });
    } else if (url.pathname === '/sd-api/endpoints') {
      if (!requireSession()) send([]);
    } else if (url.pathname === '/sd-api/dice/config/advanced/get') {
      if (!requireSession()) send({ show: false });
    } else if (url.pathname === '/sd-api/utils/news') {
      if (!requireSession())
        send({ result: true, checked: true, news: '', newsMark: 'local-mark' });
    } else if (url.pathname === '/sd-api/backup/config_get') {
      if (!requireSession()) {
        send({
          autoBackupEnable: false,
          autoBackupTime: '0 0 * * *',
          autoBackupSelection: 0,
          backupCleanStrategy: 0,
          backupCleanKeepCount: 5,
          backupCleanKeepDur: '720h',
          backupCleanTrigger: 0,
          backupCleanCron: '0 0 * * *',
          autoBackupSelectionList: ['base'],
        });
      }
    } else if (url.pathname === '/sd-api/backup/list') {
      if (!requireSession()) send({ items: backupItems.map(item => ({ ...item })) });
    } else if (url.pathname === '/sd-api/backup/status') {
      if (requireSession()) return;
      if (holdNextStatus) {
        holdNextStatus = false;
        await new Promise(resolve => {
          releaseStatus = resolve;
        });
        releaseStatus = undefined;
      }
      if (currentJob?.status === 'running' && activeOutcome) {
        statusReads++;
        if (statusReads === 2) {
          currentJob = { ...currentJob, stage: 'archiving', completedFiles: 1, totalFiles: 2 };
        } else if (statusReads >= 3) {
          const success = activeOutcome.responseBody.success === true;
          currentJob = {
            ...currentJob,
            status: success ? 'succeeded' : 'failed',
            stage: success ? 'finalizing' : 'archiving',
            completedFiles: success ? 2 : 1,
            filename: success ? activeOutcome.archive.name : undefined,
            error: success ? undefined : 'Local backup disk is full',
            finishedAt: Date.now(),
          };
          if (success) backupItems.push({ ...activeOutcome.archive });
          activeOutcome = null;
        }
      }
      send({ job: currentJob });
    } else if (url.pathname === '/sd-api/backup/do_backup' && request.method === 'POST') {
      if (requireSession()) return;
      if (holdNextAdmission) {
        holdNextAdmission = false;
        await new Promise(resolve => {
          releaseAdmission = resolve;
        });
        releaseAdmission = undefined;
      }
      const outcome = outcomes.shift();
      if (!outcome) {
        send({ error: 'No controlled backup outcome was queued' }, 409);
        return;
      }
      if (outcome.responseBody.testMode) {
        send({ testMode: true });
        return;
      }
      activeOutcome = outcome;
      statusReads = 0;
      currentJob = {
        id: `backup-${++jobSequence}`,
        status: 'running',
        stage: 'snapshot',
        completedFiles: 0,
        totalFiles: 0,
        startedAt: Date.now(),
      };
      const admittedJob = currentJob;
      if (outcome.responseBody.lostResponse) {
        currentJob = {
          ...currentJob,
          status: 'succeeded',
          stage: 'finalizing',
          completedFiles: 2,
          totalFiles: 2,
          filename: outcome.archive.name,
          finishedAt: Date.now(),
        };
        backupItems.push({ ...outcome.archive });
        activeOutcome = null;
        holdNextStatus = true;
      }
      send({ success: true, job: admittedJob }, 202);
    } else {
      unmappedRoutes.push(`${request.method} ${url.pathname}`);
      send({ error: `Unmapped local fixture route: ${request.method} ${url.pathname}` }, 404);
    }
  });

  return {
    mock,
    requests,
    backupItems,
    unmappedRoutes,
    hasHeldAdmission: () => Boolean(releaseAdmission),
    releaseHeldAdmission: () => releaseAdmission?.(),
    holdAdmission() {
      holdNextAdmission = true;
    },
    hasHeldStatus: () => Boolean(releaseStatus),
    releaseHeldStatus: () => releaseStatus?.(),
    holdStatus() {
      holdNextStatus = true;
    },
    enqueue(responseBody, archive) {
      outcomes.push({ responseBody, archive });
    },
  };
}

const visibleBackupDialog = `(() => [...document.querySelectorAll('.el-dialog')].find(dialog =>
  dialog.getClientRects().length > 0 && dialog.innerText.includes('备份范围')) ?? null)()`;

async function clickVisibleButton(cdp, label, inBackupDialog = false) {
  const root = inBackupDialog ? visibleBackupDialog : 'document';
  const clicked = await evaluate(
    cdp,
    `(() => {
      const root = ${root};
      const button = [...(root?.querySelectorAll('button') ?? [])].find(candidate =>
        candidate.getClientRects().length > 0 && candidate.innerText.trim() === ${JSON.stringify(label)});
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  assert.equal(clicked, true, `visible ${JSON.stringify(label)} button should exist`);
}

test(
  'backup submission feedback and admission recovery follow server state',
  { timeout: 120000 },
  async () => {
    const fixture = createLocalApi();
    let browser;

    try {
      browser = await startBrowserHarness({
        apiServer: fixture.mock,
        name: 'backup-feedback',
        sessionToken,
      });
      const { cdp } = browser;
      await browser.navigate(
        '/#/misc/backup',
        `document.querySelector('.backup-workspace') !== null &&
          document.body.innerText.includes(${JSON.stringify(existingArchive.name)})`,
        'the authenticated backup page and existing archive',
      );
      await waitFor(
        () =>
          fixture.requests.some(request => request.path === '/sd-api/backup/config_get') &&
          fixture.requests.some(request => request.path === '/sd-api/backup/list'),
        'the backup fixture requests',
      );

      const runScenario = async (label, responseBody, archive) => {
        await waitFor(
          () => evaluate(cdp, '!document.querySelector(".el-message[role=alert]")'),
          `${label} prior feedback to expire`,
          8000,
        );
        const priorBackupCount = fixture.requests.filter(
          request => request.path === '/sd-api/backup/do_backup',
        ).length;
        fixture.enqueue(responseBody, archive);
        fixture.holdAdmission();

        await clickVisibleButton(cdp, '立即备份');
        await waitFor(
          () => evaluate(cdp, `Boolean(${visibleBackupDialog})`),
          `${label} backup selection dialog`,
        );
        await clickVisibleButton(cdp, '立即备份', true);
        await waitFor(
          () =>
            fixture.requests.filter(request => request.path === '/sd-api/backup/do_backup').length >
            priorBackupCount,
          `${label} backup request`,
        );
        await waitFor(() => fixture.hasHeldAdmission(), `${label} held admission response`);

        try {
          const pending = await waitFor(
            () =>
              evaluate(
                cdp,
                `(() => {
                  const progress = document.querySelector(
                    '.backup-progress [role="progressbar"]'
                  );
                  const start = document.querySelector(
                    '.backup-workspace .workspace-actions button'
                  );
                  const state = {
                    dialogClosed: !Boolean(${visibleBackupDialog}),
                    progressVisible: Boolean(progress),
                    indeterminate: Boolean(
                      progress?.querySelector('.el-progress-bar__inner--indeterminate')
                    ),
                    startDisabled: start?.disabled === true,
                  };
                  return Object.values(state).every(Boolean) ? state : null;
                })()`,
              ),
            `${label} immediate pending state`,
            2000,
          );
          assert.deepEqual(pending, {
            dialogClosed: true,
            progressVisible: true,
            indeterminate: true,
            startDisabled: true,
          });
          assert.equal(
            fixture.requests.filter(request => request.path === '/sd-api/backup/do_backup').length,
            priorBackupCount + 1,
            `${label}: the busy guard prevents a duplicate submission`,
          );
        } finally {
          fixture.releaseHeldAdmission();
        }

        if (responseBody.lostResponse) {
          await waitFor(() => fixture.hasHeldStatus(), 'lost-response status reconciliation');
          assert.equal(
            await evaluate(
              cdp,
              `document.querySelector(
                '.backup-workspace .workspace-actions button'
              )?.disabled === true`,
            ),
            true,
            'submission stays locked while the accepted request response is unknown',
          );
          fixture.releaseHeldStatus();
        }

        const feedback = await waitFor(
          () =>
            evaluate(
              cdp,
              `(() => {
                const messages = [...document.querySelectorAll('.el-message[role="alert"]')]
                  .filter(message => message.getClientRects().length > 0);
                return messages.at(-1)?.textContent.trim() || null;
              })()`,
            ),
          `${label} user-visible feedback`,
        );
        const rendered = await waitFor(
          () =>
            evaluate(
              cdp,
              `(() => {
                const rows = [...document.querySelectorAll('.backup-list .backup-name')]
                  .map(row => row.textContent.trim());
                if (
                  ${Boolean(archive)} &&
                  !rows.includes(${JSON.stringify(archive?.name ?? '')})
                ) return null;
                const error = document.querySelector('.backup-progress-error')?.textContent.trim();
                if (${responseBody.success === false} && !error) return null;
                return {
                  rows,
                  error: error || null,
                  filename:
                    document.querySelector('.backup-progress-filename')?.textContent.trim() ?? null,
                  startDisabled:
                    document.querySelector(
                      '.backup-workspace .workspace-actions button'
                    )?.disabled ?? null,
                };
              })()`,
            ),
          `${label} authoritative backup result`,
        );
        assert.ok(feedback, `${label}: feedback is exposed to the user`);
        assert.equal(
          fixture.requests.filter(request => request.path === '/sd-api/backup/do_backup').length,
          priorBackupCount + 1,
          `${label}: one user action starts one request`,
        );
        return rendered;
      };

      const failed = await runScenario('failed job', { success: false });
      assert.ok(
        failed.error?.includes('Local backup disk is full'),
        'the server failure detail reaches the user',
      );
      assert.ok(failed.rows.includes(existingArchive.name));
      assert.ok(!failed.rows.includes(successfulArchive.name));

      const succeeded = await runScenario('successful job', { success: true }, successfulArchive);
      assert.equal(succeeded.filename, successfulArchive.name);
      assert.ok(succeeded.rows.includes(existingArchive.name));
      assert.ok(succeeded.rows.includes(successfulArchive.name));
      assert.equal(succeeded.startDisabled, false);

      const displayOnly = await runScenario('display-only response', { testMode: true });
      assert.ok(displayOnly.rows.includes(existingArchive.name));
      assert.ok(displayOnly.rows.includes(successfulArchive.name));
      assert.ok(!displayOnly.rows.includes(testModeArchiveName));
      assert.equal(displayOnly.startDisabled, false);

      cdp.on('Fetch.requestPaused', event => {
        void cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' });
      });
      await cdp.send('Fetch.enable', {
        patterns: [{ urlPattern: '*/backup/do_backup', requestStage: 'Response' }],
      });
      const recoveredArchive = {
        ...successfulArchive,
        name: 'bak_recovered_response_r1_created.zip',
      };
      const recovered = await runScenario(
        'lost accepted response',
        { success: true, lostResponse: true },
        recoveredArchive,
      );
      assert.equal(recovered.filename, recoveredArchive.name);
      assert.ok(recovered.rows.includes(recoveredArchive.name));
      assert.equal(recovered.startDisabled, false);
      assert.equal(
        fixture.requests.filter(request => request.path === '/sd-api/backup/do_backup').at(-1)
          ?.status,
        202,
        'the lost response belongs to a server-admitted backup',
      );
      await cdp.send('Fetch.disable');

      fixture.holdStatus();
      await cdp.send('Fetch.enable', {
        patterns: [{ urlPattern: '*/backup/do_backup', requestStage: 'Request' }],
      });
      const admittedRequestCount = fixture.requests.filter(
        request => request.path === '/sd-api/backup/do_backup',
      ).length;
      await clickVisibleButton(cdp, '立即备份');
      await waitFor(
        () => evaluate(cdp, `Boolean(${visibleBackupDialog})`),
        'not-admitted request selection dialog',
      );
      await clickVisibleButton(cdp, '立即备份', true);
      await waitFor(() => fixture.hasHeldStatus(), 'not-admitted request status reconciliation');
      fixture.releaseHeldStatus();
      const notAdmitted = await waitFor(
        () =>
          evaluate(
            cdp,
            `(() => {
              const start = document.querySelector(
                '.backup-workspace .workspace-actions button'
              );
              if (start?.disabled || !document.querySelector('.backup-progress-error')) return null;
              return {
                filename:
                  document.querySelector('.backup-progress-filename')?.textContent.trim() ?? null,
                rows: [...document.querySelectorAll('.backup-name')]
                  .map(row => row.textContent.trim()),
              };
            })()`,
          ),
        'not-admitted request to clear stale result and allow retry',
      );
      assert.equal(
        notAdmitted.filename,
        null,
        'the previous archive is not presented as the new request result',
      );
      assert.deepEqual(notAdmitted.rows, recovered.rows);
      assert.equal(
        fixture.requests.filter(request => request.path === '/sd-api/backup/do_backup').length,
        admittedRequestCount,
        'a request failed before transport is not treated as admitted',
      );
      await cdp.send('Fetch.disable');

      assert.deepEqual(fixture.unmappedRoutes, []);
      assert.deepEqual(browser.externalRequests, []);
      assert.deepEqual(await browser.getUnhandledRejections(), []);
      assert.deepEqual(browser.pageErrors, []);
    } finally {
      await browser?.close();
    }
  },
);
