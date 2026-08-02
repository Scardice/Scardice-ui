import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiSource = await readFile(
  new URL('../src/api/im_connections/index.ts', import.meta.url),
  'utf8',
);
const storeSource = await readFile(new URL('../src/store/index.ts', import.meta.url), 'utf8');
const pageSource = await readFile(
  new URL('../src/components/PageConnectInfoItems.vue', import.meta.url),
  'utf8',
);

// 1. API contract check
assert(
  apiSource.includes('export interface OfficialQQTestResult'),
  'OfficialQQTestResult interface must be exported',
);
assert(apiSource.includes('testOnly: true'), 'OfficialQQTestResult must specify testOnly: true');
assert(apiSource.includes('exists: boolean'), 'OfficialQQTestResult must include exists: boolean');
assert(
  apiSource.includes('testOnly?: boolean'),
  'postAddOfficialQQ signature must include testOnly option',
);

// 2. Store forwarding check
assert(
  storeSource.includes(
    'async addImConnection(form: addImConnectionForm, officialQQTestOnly?: boolean)',
  ),
  'addImConnection must accept officialQQTestOnly parameter',
);
assert(
  storeSource.includes('officialQQTestOnly'),
  'postAddOfficialQQ in store must pass officialQQTestOnly',
);

// 3. Component test-then-add UI & guard check
assert(
  pageSource.includes('testOfficialQQManual'),
  'PageConnectInfoItems must contain testOfficialQQManual method',
);
assert(
  pageSource.includes(
    '!officialQQTestTested || !officialQQTestResult || officialQQTestResult.exists',
  ),
  'Disabled gate for manual add must require successful non-duplicate test',
);
assert(
  pageSource.includes('resetOfficialQQManualTestState()'),
  'PageConnectInfoItems must reset test state on form/cred changes',
);
assert(
  pageSource.includes('isOfficialQQTestResult(conn)'),
  'goStepTwo must reject test-shaped response if final add unexpectedly returns it',
);

// 4. Prohibited symbols check
assert(!pageSource.includes('useWebhook'), 'Must not contain useWebhook');
assert(!pageSource.includes('webhookPath'), 'Must not contain webhookPath');

// 5. QR direct flow preservation check
assert(
  pageSource.includes("form.officialQQLoginMode === 'qrcode'"),
  'QR login mode must be preserved',
);
assert(pageSource.includes('isOfficialQQQrWaiting'), 'QR waiting predicate must be preserved');

console.log('All Task 8 static assertions passed successfully!');
