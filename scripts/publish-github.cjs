// Run in a tagged Actions job with NODE_AUTH_TOKEN and packages: write.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const registry = 'https://npm.pkg.github.com';
assert.equal(pkg.publishConfig.registry, registry);
assert(pkg.name.startsWith('@ling0727-ai/'));
assert.equal(fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim(), pkg.version);
assert.equal(process.env.GITHUB_REF_NAME, 'v' + pkg.version, 'Only matching version tags publish to GitHub Packages');
assert(process.env.NODE_AUTH_TOKEN, 'NODE_AUTH_TOKEN is required');
assert(process.env.npm_execpath, 'Use npm run publish:github');
const tarball = path.join(root, 'dist/typora-obsidian-callouts.tgz');
const checksum = fs.readFileSync(tarball + '.sha256', 'utf8').split(/\s/)[0];
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex'), checksum, 'Tarball checksum');
const npm = args => spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: root, encoding: 'utf8' });
const spec = pkg.name + '@' + pkg.version;
const existing = npm(['view', spec, 'dist', '--registry', registry, '--json']);
if (existing.status === 0) {
  // A rerun must never replace a different immutable version.
  const dist = JSON.parse(existing.stdout);
  if (dist.integrity) {
    const expected = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64');
    assert.equal(dist.integrity, expected, 'Existing registry version differs from this tarball');
  } else {
    assert.equal(dist.shasum, crypto.createHash('sha1').update(fs.readFileSync(tarball)).digest('hex'), 'Existing registry version differs from this tarball');
  }
  const tagged = npm(['dist-tag', 'add', spec, 'latest', '--registry', registry]);
  assert.equal(tagged.status, 0, tagged.stderr);
  console.log('Matching version already published; latest tag is current.');
} else {
  const message = existing.stderr || '';
  if (!/E404|404 Not Found/.test(message)) throw new Error('Cannot check package version: ' + message);
  const published = npm(['publish', tarball, '--registry', registry, '--tag', 'latest', '--ignore-scripts']);
  assert.equal(published.status, 0, published.stderr || published.stdout);
  console.log('Published ' + spec + ' to GitHub Packages.');
}
// Verify an actual authenticated registry install, without touching real Typora.
const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'typora-registry-check-'));
try {
  const installed = npm(['install', '--global', '--prefix', prefix, spec, '--ignore-scripts', '--no-audit', '--no-fund']);
  assert.equal(installed.status, 0, installed.stderr || installed.stdout);
  const cli = path.join(prefix, process.platform === 'win32' ? 'node_modules' : 'lib/node_modules', ...pkg.name.split('/'), 'bin/typora-obsidian-callouts.cjs');
  const result = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
  console.log('PASS: authenticated GitHub Packages install reports ' + pkg.version);
} finally {
  const relative = path.relative(os.tmpdir(), prefix);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  fs.rmSync(prefix, { recursive: true, force: true });
}
