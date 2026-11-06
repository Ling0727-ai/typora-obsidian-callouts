// Produce a stable asset name so npm can install directly from a Release URL.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('../package.json');
if (fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim() !== manifest.version) throw new Error('package.json version must match VERSION');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
// npm_execpath is supplied by `npm run pack:release` on every platform.
if (!process.env.npm_execpath) throw new Error('Run this script with npm run pack:release');
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', '--json', '--pack-destination', dist], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'npm pack failed');
const source = path.join(dist, JSON.parse(result.stdout)[0].filename);
const target = path.join(dist, 'typora-obsidian-callouts.tgz');
fs.renameSync(source, target);
const hash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
fs.writeFileSync(target + '.sha256', hash + '  ' + path.basename(target) + '\n');
console.log(target + '\nSHA256: ' + hash);
