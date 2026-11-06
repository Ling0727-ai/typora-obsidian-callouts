const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const AdmZip = require('adm-zip');

const ROOT = path.resolve(__dirname, '..');
const VERSION = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
const LOADER = '<script src="./plugin/index.js" defer="defer"></script>';
const BLOCK = /\/\* BEGIN TYPORA OBSIDIAN CALLOUTS \*\/.*?\/\* END TYPORA OBSIDIAN CALLOUTS \*\/\r?\n?/gs;
const LEGACY = /\/\* BEGIN OBSIDIAN CALLOUTS \*\/.*?\/\* END OBSIDIAN CALLOUTS \*\/\r?\n?/gs;
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '') : '';
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const stamp = () => new Date().toISOString().replace(/[^0-9]/g, '') + '-' + crypto.randomBytes(3).toString('hex');

function defaults(platform = process.platform, home = os.homedir(), env = process.env) {
  const config = path.join(home, '.config', 'typora_plugin');
  if (platform === 'darwin') return { apps: ['/Applications/Typora.app', path.join(home, 'Applications/Typora.app')], themes: path.join(home, 'Library/Application Support/abnerworks.Typora/themes'), config };
  if (platform === 'win32') return { apps: ['ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA'].filter(k => env[k]).map(k => path.join(env[k], 'Typora')), themes: path.join(env.APPDATA || path.join(home, 'AppData/Roaming'), 'Typora/themes'), config };
  return { apps: ['/usr/share/typora', '/opt/typora', '/usr/lib/typora', '/opt/Typora'], themes: path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Typora/themes'), config };
}

function locate(candidates) {
  for (const base of candidates) for (const suffix of ['', 'resources', 'resources/app', 'Contents/Resources/TypeMark']) {
    const resources = path.resolve(base, suffix);
    for (const name of ['window.html', 'index.html']) {
      const html = path.join(resources, name);
      if (fs.existsSync(html) && fs.statSync(html).isFile() && (name === 'window.html' || path.basename(resources) === 'TypeMark')) return { resources, html };
    }
  }
  throw new Error('Typora not found. Use --typora-path with its installation or resources directory.');
}

function table(text, section) {
  return new RegExp('^\\[' + section + '\\][ \\t]*\\r?\\n(?<body>.*?)(?=^\\[|$(?![\\s\\S]))', 'ms').exec(text);
}

function boolean(text, section) {
  return /^ENABLE[ \t]*=[ \t]*(true|false)\b/m.exec(table(text, section)?.groups.body || '')?.[1] ?? null;
}

function setBoolean(text, section, value) {
  const found = table(text, section);
  const line = value ? 'ENABLE = ' + value + '\n' : '';
  if (!found) return value ? text.trimEnd() + '\n\n[' + section + ']\n' + line : text;
  const body = found.groups.body.replace(/^ENABLE[ \t]*=[^\r\n]*(?:\r?\n|$)/gm, '');
  return text.slice(0, found.index) + '[' + section + ']\n' + line + body + text.slice(found.index + found[0].length);
}

function validateLayout({ resources, html }) {
  const text = read(html);
  if (path.basename(html) === 'index.html') {
    if (!fs.existsSync(path.join(resources, 'plugin/loader.js')) || !/<script\b[^>]*\bsrc=['"]\.\/plugin\/loader\.js['"]/.test(text) || !fs.existsSync(path.join(resources, 'plugin/global/core/index.js'))) {
      throw new Error('macOS requires an existing compatible WKWebView bridge. See docs/platforms.md. No files changed.');
    }
    return { text, frame: null };
  }
  for (const source of ['appsrc/window/frame.js', 'app/window/frame.js']) {
    const frame = '<script src="./' + source + '" defer="defer"></script>';
    if (text.includes(frame)) return { text, frame };
  }
  throw new Error('Unsupported Typora HTML layout. No files changed.');
}

function framework(target) {
  const { resources, html } = target;
  const { text, frame } = validateLayout(target);
  const manifest = JSON.parse(read(path.join(ROOT, 'vendor/manifest.json')));
  const archive = path.join(ROOT, 'vendor', manifest.asset);
  if (digest(archive) !== manifest.sha256) throw new Error('Bundled framework SHA-256 mismatch.');
  const plugin = path.join(resources, 'plugin');
  if (fs.existsSync(plugin) && !fs.existsSync(path.join(plugin, 'index.js'))) throw new Error('Unrecognized plugin directory; inspect it before installing.');
  const patches = ['callouts', 'obsidian_images'].map(name => ({ source: path.join(ROOT, 'patches', name, 'index.js'), target: path.join(plugin, name, 'index.js') }));
  const needsLoader = frame && !text.includes(LOADER);
  if (!needsLoader && patches.every(p => fs.existsSync(p.target) && digest(p.source) === digest(p.target))) return;
  const probe = path.join(resources, '.callout-probe-' + stamp());
  fs.writeFileSync(probe, '', { flag: 'wx' });
  fs.unlinkSync(probe);
  if (!fs.existsSync(plugin)) {
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'typora-callouts-'));
    try {
      const zip = new AdmZip(archive);
      for (const entry of zip.getEntries()) {
        const relative = path.relative(stage, path.resolve(stage, entry.entryName.replace(/\\/g, '/')));
        if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || ((entry.header.attr >>> 16) & 0o170000) === 0o120000) throw new Error('Unsafe path in bundled archive.');
      }
      zip.extractAllTo(stage, false);
      const staged = path.join(stage, 'plugin');
      if (!fs.existsSync(path.join(staged, 'index.js'))) throw new Error('Invalid framework archive.');
      fs.copyFileSync(path.join(ROOT, 'config/settings.user.toml'), path.join(staged, 'global/settings/settings.user.toml'));
      fs.cpSync(staged, plugin, { recursive: true, errorOnExist: true, force: false });
    } finally {
      // stage is a unique directory created above, always under the OS temp directory.
      const relative = path.relative(os.tmpdir(), stage);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unexpected temporary path; cleanup stopped.');
      fs.rmSync(stage, { recursive: true, force: true });
    }
  }
  for (const p of patches) {
    if (fs.existsSync(p.target) && digest(p.target) === digest(p.source)) continue;
    if (fs.existsSync(p.target)) fs.copyFileSync(p.target, p.target + '.before-update-' + stamp() + '.bak');
    fs.mkdirSync(path.dirname(p.target), { recursive: true });
    fs.copyFileSync(p.source, p.target);
  }
  if (needsLoader) {
    fs.copyFileSync(html, html + '.callouts-' + stamp() + '.bak');
    write(html, text.replace(frame, frame + LOADER));
  }
}

function ensureFramework(target, options = {}) {
  try { framework(target); } catch (error) {
    if (!['EACCES', 'EPERM'].includes(error.code) || options.noElevate) throw error;
    const cli = path.join(ROOT, 'bin/typora-obsidian-callouts.cjs');
    const args = [cli, 'framework', '--typora-path', target.resources, '--no-elevate'];
    let result;
    if (process.platform === 'win32') {
      // EncodedCommand keeps literal paths out of PowerShell syntax. Only the
      // application-file step runs as administrator; home files stay here.
      const quote = value => "'" + value.replace(/'/g, "''") + "'";
      const nodeArgs = args.map(value => '"' + value + '"').join(' ');
      const script = "$ErrorActionPreference='Stop'; $p=Start-Process -FilePath " + quote(process.execPath) + ' -ArgumentList ' + quote(nodeArgs) + ' -Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode';
      result = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { stdio: 'inherit', windowsHide: true });
    } else result = spawnSync('sudo', [process.execPath, ...args], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Application-file installation failed or administrator authorization was cancelled.');
  }
}

function install(options = {}) {
  const settings = defaults();
  const target = locate(options.typoraPath ? [options.typoraPath] : settings.apps);
  validateLayout(target);
  const themes = path.resolve(options.themeDir || settings.themes);
  const config = path.resolve(options.userConfigDir || settings.config);
  const dark = options.darkTheme || 'night';
  if (!/^[a-zA-Z0-9_-]+$/.test(dark)) throw new Error('--dark-theme must be a theme filename without .css.');
  const statePath = path.join(config, 'obsidian-callouts/install-state.json');
  const old = fs.existsSync(statePath) ? JSON.parse(read(statePath)) : null;
  if (old && (path.resolve(old.ThemeDir) !== themes || old.DarkTheme !== dark)) throw new Error('Installation target changed. Uninstall the previous styles first.');
  const settingsPath = path.join(config, 'settings.user.toml');
  let text = fs.existsSync(settingsPath) ? read(settingsPath) : read(path.join(target.resources, 'plugin/global/settings/settings.user.toml')) || read(path.join(ROOT, 'config/settings.user.toml'));
  const state = old || { SettingsExisted: fs.existsSync(settingsPath), OriginalGlobal: boolean(text, 'global'), OriginalCallouts: boolean(text, 'callouts') };
  if (!Object.hasOwn(state, 'OriginalImages')) state.OriginalImages = boolean(text, 'obsidian_images');
  const images = options.enableImages || path.basename(target.html) !== 'index.html';
  for (const [section, enabled] of [['global', true], ['callouts', true], ['obsidian_images', images]]) text = setBoolean(text, section, enabled ? 'true' : 'false');
  if (!/^NAME\s*=/m.test(table(text, 'obsidian_images').groups.body)) text = text.replace('[obsidian_images]', '[obsidian_images]\nNAME = "Obsidian Images"');
  ensureFramework(target, options);
  const backup = path.join(config, 'obsidian-callouts/backups', stamp());
  fs.mkdirSync(backup, { recursive: true });
  for (const [source, name] of [[path.join(themes, 'base.user.css'), 'base.user.css'], [path.join(themes, dark + '.user.css'), 'dark.user.css'], [settingsPath, 'settings.user.toml']]) if (fs.existsSync(source)) fs.copyFileSync(source, path.join(backup, name));
  fs.mkdirSync(path.join(themes, 'obsidian-callouts'), { recursive: true });
  for (const asset of ['callouts.css', 'callouts-dark.css']) fs.copyFileSync(path.join(ROOT, 'styles', asset), path.join(themes, 'obsidian-callouts', asset));
  for (const [name, asset] of [['base.user.css', 'callouts.css'], [dark + '.user.css', 'callouts-dark.css']]) {
    const file = path.join(themes, name);
    write(file, '/* BEGIN TYPORA OBSIDIAN CALLOUTS */\n@import url("./obsidian-callouts/' + asset + '");\n/* END TYPORA OBSIDIAN CALLOUTS */\n' + read(file).replace(BLOCK, '').replace(LEGACY, ''));
  }
  write(settingsPath, text);
  Object.assign(state, { Version: VERSION, ThemeDir: themes, DarkTheme: dark, SettingsHash: digest(settingsPath), BackupDir: old?.BackupDir || backup });
  write(statePath, JSON.stringify(state, null, 2) + '\n');
  console.log('Installed. Restart Typora. Settings: ' + settingsPath);
  if (path.basename(target.html) === 'index.html') console.log('macOS experimental; images ' + (images ? 'enabled (experimental)' : 'disabled'));
}

function uninstall(options = {}) {
  const config = path.resolve(options.userConfigDir || defaults().config);
  const statePath = path.join(config, 'obsidian-callouts/install-state.json');
  if (!fs.existsSync(statePath)) throw new Error('No installation record found; no files changed.');
  const state = JSON.parse(read(statePath));
  for (const name of ['base.user.css', state.DarkTheme + '.user.css']) {
    const file = path.join(state.ThemeDir, name);
    if (fs.existsSync(file)) write(file, read(file).replace(BLOCK, ''));
  }
  const settingsPath = path.join(config, 'settings.user.toml');
  if (fs.existsSync(settingsPath)) {
    if (digest(settingsPath) !== state.SettingsHash) console.log('Settings changed after installation; retained. Disable callouts/obsidian_images manually if desired.');
    else if (!state.SettingsExisted) fs.unlinkSync(settingsPath);
    else {
      let text = read(settingsPath);
      for (const [section, key] of [['global', 'OriginalGlobal'], ['callouts', 'OriginalCallouts'], ['obsidian_images', 'OriginalImages']]) if (Object.hasOwn(state, key)) text = setBoolean(text, section, state[key]);
      write(settingsPath, text);
    }
  }
  fs.unlinkSync(statePath);
  console.log('Managed styles removed. Shared framework and backups retained. Restart Typora.');
}

function parse(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv.shift() : 'help';
  const options = {};
  const values = { '--typora-path': 'typoraPath', '--theme-dir': 'themeDir', '--user-config-dir': 'userConfigDir', '--dark-theme': 'darkTheme' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (values[arg]) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + arg);
      options[values[arg]] = argv[++i];
    } else if (arg === '--enable-images') options.enableImages = true;
    else if (arg === '--no-elevate') options.noElevate = true;
    else if (['--help', '-h', '--version', '-v'].includes(arg)) return { command: arg.includes('version') || arg === '-v' ? 'version' : 'help', options };
    else throw new Error('Unknown option: ' + arg);
  }
  return { command, options };
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parse([...argv]);
  if (command === 'version') return console.log(VERSION);
  if (command === 'help') return console.log(`Typora Obsidian Callouts ${VERSION}\n\nUsage: typora-obsidian-callouts <install|update|repair|uninstall> [options]\n\n--typora-path PATH     Typora installation or resources directory\n--theme-dir PATH       Override the theme directory\n--user-config-dir PATH Override the upstream settings directory\n--dark-theme NAME      Theme filename without .css (default: night)\n--enable-images       Opt in to experimental macOS image support\n--no-elevate          Fail instead of requesting administrator access\n--version             Print package version\n\nSave notes and quit Typora before install/update. macOS requires an existing WKWebView bridge.`);
  if (!['install', 'update', 'repair', 'uninstall', 'framework'].includes(command)) throw new Error('Unknown command: ' + command);
  if (process.getuid?.() === 0 && command !== 'framework') throw new Error('Run as your normal user; only application-file writes are elevated.');
  if (command === 'install' || command === 'update') return install(options);
  if (command === 'uninstall') return uninstall(options);
  const target = locate(options.typoraPath ? [options.typoraPath] : defaults().apps);
  if (command === 'framework') framework(target); else ensureFramework(target, options);
  console.log('Framework loader and patches are current. Restart Typora.');
}

module.exports = { main, parse, install, uninstall, framework, locate, validateLayout, defaults, read, write, digest, boolean, setBoolean, LOADER, ROOT, VERSION };
