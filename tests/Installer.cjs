const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const installer = require('../lib/installer.cjs');

function fixture(t, mac = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'typora npm spaces-'));
  t.after(() => {
    const relative = path.relative(os.tmpdir(), root);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const resources = path.join(root, mac ? 'Typora.app/Contents/Resources/TypeMark' : 'Typora/resources');
  const html = path.join(resources, mac ? 'index.html' : 'window.html');
  installer.write(html, mac ? '<body><script src="./plugin/loader.js" defer></script></body>' : '<body><script src="./appsrc/window/frame.js" defer="defer"></script></body>');
  const options = { typoraPath: resources, themeDir: path.join(root, 'themes'), userConfigDir: path.join(root, 'config'), noElevate: true };
  return { root, resources, html, options, settings: path.join(options.userConfigDir, 'settings.user.toml') };
}

test('TOML switches preserve unrelated content', () => {
  const input = '[global]\nENABLE = false\n# keep\n[window_tab]\nENABLE = true\nCUSTOM = "keep"\n';
  const changed = installer.setBoolean(input, 'global', 'true');
  assert.equal(installer.boolean(changed, 'global'), 'true');
  assert.equal(installer.boolean(changed, 'window_tab'), 'true');
  assert(changed.includes('CUSTOM = "keep"'));
  const appended = installer.setBoolean(changed, 'obsidian_images', 'true');
  assert.equal(installer.boolean(appended, 'obsidian_images'), 'true');
  assert.equal(installer.boolean(installer.setBoolean(appended, 'obsidian_images', null), 'obsidian_images'), null);
});

test('fresh install, repeat install, repair, and uninstall', t => {
  const f = fixture(t);
  installer.write(path.join(f.options.themeDir, 'base.user.css'), 'body { --keep: 1; }');
  installer.install(f.options);
  assert(fs.existsSync(path.join(f.resources, 'plugin/global/core/index.js')));
  for (const section of ['global', 'callouts', 'obsidian_images']) assert.equal(installer.boolean(installer.read(f.settings), section), 'true');
  for (const name of ['callouts', 'obsidian_images']) assert.equal(installer.digest(path.join(f.resources, 'plugin', name, 'index.js')), installer.digest(path.join(installer.ROOT, 'patches', name, 'index.js')));
  installer.install(f.options);
  const base = path.join(f.options.themeDir, 'base.user.css');
  assert.equal(installer.read(base).split('BEGIN TYPORA OBSIDIAN CALLOUTS').length, 2);
  assert.equal(installer.read(f.html).split(installer.LOADER).length, 2);
  installer.write(f.html, installer.read(f.html).replace(installer.LOADER, ''));
  installer.framework({ resources: f.resources, html: f.html });
  assert(installer.read(f.html).includes(installer.LOADER));
  installer.uninstall(f.options);
  assert(!fs.existsSync(f.settings));
  assert(installer.read(base).includes('--keep'));
  assert(!installer.read(base).includes('BEGIN TYPORA'));
});

test('existing settings restore switches and preserve later edits', t => {
  const f = fixture(t);
  installer.write(path.join(f.resources, 'plugin/index.js'), '// existing');
  installer.write(f.settings, '[global]\nENABLE = false\n[callouts]\nENABLE = false\n[window_tab]\nENABLE = true\n');
  installer.install(f.options);
  installer.uninstall(f.options);
  assert.equal(installer.boolean(installer.read(f.settings), 'global'), 'false');
  assert.equal(installer.boolean(installer.read(f.settings), 'window_tab'), 'true');
  assert.equal(installer.boolean(installer.read(f.settings), 'obsidian_images'), null);
  installer.install(f.options);
  const edited = installer.read(f.settings) + '\n# user edit';
  installer.write(f.settings, edited);
  installer.uninstall(f.options);
  assert.equal(installer.read(f.settings), edited);
});

test('macOS requires bridge and keeps images opt-in', t => {
  const f = fixture(t, true);
  assert.throws(() => installer.install(f.options), /WKWebView bridge/);
  assert(!fs.existsSync(f.options.userConfigDir));
  installer.write(path.join(f.resources, 'plugin/index.js'), '// framework');
  installer.write(path.join(f.resources, 'plugin/loader.js'), '// bridge');
  installer.write(path.join(f.resources, 'plugin/global/core/index.js'), '// core');
  const before = installer.read(f.html);
  installer.install(f.options);
  assert.equal(installer.read(f.html), before);
  assert.equal(installer.boolean(installer.read(f.settings), 'obsidian_images'), 'false');
  installer.install({ ...f.options, enableImages: true });
  assert.equal(installer.boolean(installer.read(f.settings), 'obsidian_images'), 'true');
});

test('unknown layouts fail without creating user files', t => {
  const f = fixture(t);
  installer.write(f.html, '<html>unsupported</html>');
  assert.throws(() => installer.install(f.options), /Unsupported/);
  assert(!fs.existsSync(f.options.userConfigDir));
  assert(!fs.existsSync(path.join(f.resources, 'plugin')));
});

test('CLI options and package version', () => {
  assert.equal(installer.parse(['--version']).command, 'version');
  assert.deepEqual(installer.parse(['install', '--typora-path', 'path with spaces', '--no-elevate']).options, { typoraPath: 'path with spaces', noElevate: true });
  assert.throws(() => installer.parse(['install', '--typora-path']), /Missing/);
  assert.throws(() => installer.parse(['install', '--unknown']), /Unknown/);
  assert.equal(installer.VERSION, require('../package.json').version);
});
