// Uses npm Trusted Publishing (OIDC). No long-lived npm token is read or copied.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
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
const expectedIntegrity = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64');

async function publicMetadata(version) {
  // A fresh anonymous HTTP request avoids npm's cached pre-publish packument.
  const url = registry + '/' + pkg.name.replace('/', '%2f') + '/' + version + '?verify=' + Date.now();
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Public registry metadata HTTP ' + response.status);
  return response.json();
}

async function publish() {
  const existing = await publicMetadata(pkg.version);
  if (existing) {
    assert.equal(existing.dist.integrity, expectedIntegrity, 'Existing npm version differs from this tarball');
    console.log('Matching immutable npm version already published.');
  } else {
    const result = npm(['publish', tarball, '--registry', registry, '--access', 'public', '--tag', 'latest', '--ignore-scripts']);
    if (result.status !== 0 && !/cannot publish over the previously published versions/i.test(result.stderr || '')) throw new Error(result.stderr || result.stdout);
    console.log(result.status === 0 ? 'Published ' + spec + ' via OIDC.' : 'Registry reports an existing version; waiting for public metadata.');
  }
  // npm/CDN propagation can take minutes. Verify without publishing again.
  for (let attempt = 0; attempt < 36; attempt++) {
    try {
      const [version, latest] = await Promise.all([publicMetadata(pkg.version), publicMetadata('latest')]);
      if (version && latest?.version === pkg.version) {
        assert.equal(version.dist.integrity, expectedIntegrity, 'Public tarball differs from the checked artifact');
        console.log('PASS: anonymous public registry exposes ' + spec + ' as latest with matching integrity.');
        return;
      }
    } catch (error) {
      if (error.code === 'ERR_ASSERTION') throw error;
      console.log('Public metadata not ready: ' + error.message);
    }
    console.log('Waiting for registry propagation (' + (attempt + 1) + '/36)...');
    await delay(10000);
  }
  throw new Error('Published version is not visible as latest after the registry propagation window');
}

publish().catch(error => { console.error(error.message); process.exitCode = 1; });
