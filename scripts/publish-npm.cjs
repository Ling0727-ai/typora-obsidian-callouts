// Uses npm Trusted Publishing (OIDC). No long-lived npm token is read or copied.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');
const registry = 'https://registry.npmjs.org';
assert.equal(process.env.GITHUB_REF_NAME, 'v' + pkg.version, 'Only matching version tags publish');
assert.equal(fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim(), pkg.version);
assert(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, 'GitHub Actions id-token: write is required');
const tarball = path.join(root, 'dist/typora-obsidian-callouts.tgz');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex'), fs.readFileSync(tarball + '.sha256', 'utf8').split(/\s/)[0]);
const npm = args => spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: root, encoding: 'utf8' });
const spec = pkg.name + '@' + pkg.version;
const existing = npm(['view', spec, 'dist.integrity', '--registry', registry, '--json']);
if (existing.status === 0) {
  assert.equal(JSON.parse(existing.stdout), 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64'), 'Existing npm version differs from this tarball');
  console.log('Matching immutable npm version already published.');
} else {
  if (!/E404|404 Not Found/.test(existing.stderr || '')) throw new Error(existing.stderr || 'Unable to inspect npm version');
  const result = npm(['publish', tarball, '--registry', registry, '--access', 'public', '--tag', 'latest', '--ignore-scripts']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  console.log('Published ' + spec + ' to npmjs.org via OIDC.');
}
const check = npm(['view', spec, 'version', '--registry', registry, '--json']);
assert.equal(check.status, 0, check.stderr);
assert.equal(JSON.parse(check.stdout), pkg.version);
console.log('PASS: public npm registry exposes ' + spec);
