const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'typora-packed-cli-'));
try {
  const run = (file, args) => {
    const result = spawnSync(file, args, { encoding: 'utf8', cwd: root });
    assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
    return result.stdout;
  };
  run(process.execPath, [process.env.npm_execpath, 'install', '--global', '--prefix', prefix, path.join(root, 'dist/typora-obsidian-callouts.tgz'), '--offline', '--ignore-scripts', '--no-audit', '--no-fund']);
  const installed = path.join(prefix, process.platform === 'win32' ? 'node_modules' : 'lib/node_modules', 'typora-obsidian-callouts');
  assert(fs.existsSync(path.join(installed, 'README_CN_simplised.md')));
  assert(fs.existsSync(path.join(installed, 'node_modules/adm-zip/adm-zip.js')));
  const cli = path.join(installed, 'bin/typora-obsidian-callouts.cjs');
  assert.equal(run(process.execPath, [cli, '--version']).trim(), require('../package.json').version);
  const resources = path.join(prefix, 'mock Typora/resources');
  fs.mkdirSync(resources, { recursive: true });
  fs.writeFileSync(path.join(resources, 'window.html'), '<script src="./appsrc/window/frame.js" defer="defer"></script>');
  const config = path.join(prefix, 'config');
  run(process.execPath, [cli, 'install', '--typora-path', resources, '--theme-dir', path.join(prefix, 'themes'), '--user-config-dir', config, '--no-elevate']);
  assert(fs.existsSync(path.join(resources, 'plugin/obsidian_images/index.js')));
  run(process.execPath, [cli, 'uninstall', '--user-config-dir', config]);
  assert(!fs.existsSync(path.join(config, 'settings.user.toml')));
  console.log('PASS: tarball installs offline, bundles dependencies and bilingual docs, and runs install/uninstall in an isolated directory.');
} finally {
  const relative = path.relative(os.tmpdir(), prefix);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  fs.rmSync(prefix, { recursive: true, force: true });
}
