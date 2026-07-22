import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const sourcePath = new URL('../src/api/index.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const sourceFile = ts.createSourceFile(sourcePath.pathname, source, ts.ScriptTarget.Latest, true);
const declarations = sourceFile.statements.filter(statement => {
  if (ts.isFunctionDeclaration(statement)) {
    return statement.name?.text === 'getApiBaseURL';
  }
  if (!ts.isVariableStatement(statement)) {
    return false;
  }
  return statement.declarationList.declarations.some(
    declaration =>
      ts.isIdentifier(declaration.name) &&
      (declaration.name.text === 'urlBase' || declaration.name.text === 'apiBaseURL'),
  );
});

assert.equal(
  declarations.length,
  3,
  'src/api/index.ts must export the pathname API base declarations',
);

const implementation = declarations
  .map(statement => statement.getText(sourceFile).replace(/^export\s+/, ''))
  .join('\n')
  .replaceAll('import.meta.env.DEV', 'isDevelopment');
const emitted = ts.transpileModule(implementation, {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
}).outputText;
const resolveBaseURLs = (pathname, isDevelopment) =>
  new Function(
    'window',
    'isDevelopment',
    `${emitted}\nreturn { getApiBaseURL, urlBase, apiBaseURL };`,
  )({ location: { pathname } }, isDevelopment);

for (const testCase of [
  { pathname: '/', apiBaseURL: '/sd-api', urlBase: '' },
  { pathname: '/index.html', apiBaseURL: '/sd-api', urlBase: '' },
  { pathname: '/subdir/', apiBaseURL: '/subdir/sd-api', urlBase: '/subdir' },
  { pathname: '/subdir/index.html', apiBaseURL: '/subdir/sd-api', urlBase: '/subdir' },
]) {
  const resolved = resolveBaseURLs(testCase.pathname, false);
  assert.equal(resolved.getApiBaseURL(), testCase.apiBaseURL);
  assert.equal(resolved.apiBaseURL, testCase.apiBaseURL);
  assert.equal(resolved.urlBase, testCase.urlBase);
}

const hashRoutePathname = new URL('https://example.test/subdir/index.html#/unknown').pathname;
assert.equal(resolveBaseURLs(hashRoutePathname, false).apiBaseURL, '/subdir/sd-api');
assert.equal(resolveBaseURLs('malformed', false).apiBaseURL, '/sd-api');

const development = resolveBaseURLs('/subdir/index.html', true);
assert.equal(development.urlBase, '');
assert.equal(development.apiBaseURL, '/sd-api');
