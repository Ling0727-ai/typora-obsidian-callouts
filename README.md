# Typora Obsidian Callouts

**English** | [简体中文](README_CN_simplised.md)

[![Build and check installers](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml/badge.svg)](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml)

Use Obsidian callouts and image embeds in Typora to migrate existing notes.
Callouts share an academic note style across themes.

```markdown
> [!definition] Definition
> Write the definition here.

> [!theorem] Theorem
> Write the theorem here.
```

This project bundles `obgnail/typora_plugin 1.19.14`, local module patches, custom CSS,
and a cross-platform npm command-line installer. The plugin modules run inside Typora.

## Features

- Transparent callouts with a thin colored border, colored headings, and SVG icons.
- Global CSS through `base.user.css`, plus a dedicated palette for Night.
- Custom titles, academic callout types, and legacy aliases.
- Image embeds such as `![[image.png|C|500]]` and `![[image.svg|500|C]]`.
- Native Typora Markdown links for newly dropped or pasted images.
- User configuration stored outside the application directory.
- Bundled framework and ZIP dependency, with SHA-256 verification of the framework archive.
- Backups, repeatable installation, uninstall, and repair after Typora updates.
- GitHub Releases containing an npm tarball, platform ZIPs, and checksums.

## Install

### 1. Requirements

Install **Node.js 20+ and npm**, save your notes, and quit Typora.
Run the following commands in a terminal as your normal user.
The npm installer does not require Python.

### 2. Install the tool and plugin

Install the npm package directly from the latest stable GitHub Release:

```sh
npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest/download/typora-obsidian-callouts.tgz
```

Then install the plugin into Typora:

```sh
typora-obsidian-callouts install
```

The npm command installs the management tool. The second command explicitly installs the
plugin and styles. The tarball bundles the framework and extraction dependency, so this
step does not need additional downloads.

The package is distributed through GitHub Releases and is **not published to the npm registry**.
Use the tarball URL above rather than `npm install -g typora-obsidian-callouts`.

### Development builds and local packages

Every successful `main` build updates the [dev prerelease](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/tag/dev).
For the newest development build, or before the first stable Release is available:

```sh
npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/download/dev/typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

You can also download `typora-obsidian-callouts.tgz` and its `.sha256` file from
[Releases](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases), then install the local file:

```sh
npm install -g ./typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

### Platform notes and custom paths

| Platform | Installation behavior |
| --- | --- |
| Windows | Same npm commands; administrator authorization is requested for protected application files only |
| Linux | Same npm commands; only application-file writes use `sudo` when needed. Run the CLI as your normal user |
| macOS | Experimental; requires an existing compatible WKWebView bridge. Only Callouts are enabled by default |

For a custom installation, specify the Typora directory or the resources directory containing `window.html`:

```sh
typora-obsidian-callouts install --typora-path "D:/Apps/Typora"
typora-obsidian-callouts install --typora-path /opt/typora
```

macOS requires a separately installed compatible bridge; see [platform details](docs/platforms.md)
(Chinese) and the community [Typora-plugin-on-Mac](https://github.com/bfyes/Typora-plugin-on-Mac) project.
Once it is installed:

```sh
typora-obsidian-callouts install --typora-path /Applications/Typora.app
```

Add `--enable-images` to try experimental macOS image support. A passing CI build does not
establish compatibility with the actual macOS Typora application.
AppImage, Flatpak, and Snap installations are not automatically unpacked or modified.

Night has a dedicated dark palette. To use it with another dark theme, supply the theme CSS
filename without `.css`:

```sh
typora-obsidian-callouts install --dark-theme my-dark-theme
```

Keep `ThemeDir` and `DarkTheme` unchanged for an existing installation. Run `uninstall` before
changing these targets. Use `typora-obsidian-callouts --help` to see all options.

### 3. Restart Typora

Reopen Typora and try the callout or image syntax below. The repository and platform ZIPs
also include [callout examples](examples/callouts.md) and [image examples](examples/images.md).
Continue using your usual GitHub, Newsprint, Night, or other theme;
you do not need a separate Obsidian theme entry.
Enable GitHub-style alerts in Typora preferences to use its native alert types.

## Image migration

```markdown
![[image.png|C|500]]
![[image.svg|500|R]]
![[attachments/image.jpg|L|320]]
```

`C`, `R`, and `L` mean center, right, and left. The number sets the width in pixels;
alignment and width can appear in either order. The adapter preserves the original embed syntax
and looks for images relative to the current note or within the Obsidian vault.

New images dropped or pasted into Typora use its native `![description](path)` workflow.
Configure image copying and relative paths in Typora's image preferences.
See [image migration details](docs/images.md) (Chinese) for lookup rules and limitations.

## Callout types

| Type | Purpose |
| --- | --- |
| `definition` | Definition |
| `theorem` | Theorem |
| `corollary` | Corollary |
| `proof` | Proof |
| `example` | Worked example |
| `method` | Method |
| `note` | Note |
| `info` | Information |
| `tip` | Tip |
| `warning` | Warning |
| `important` | Important point |
| `summary` | Summary |
| `flowchart` | Process explanation |

Legacy aliases `notes`, `importent`, and `definitiion` are supported.
`flowchart` is a semantic callout type; it does not render a diagram.

## Compatibility

- Developed with Windows Typora 1.14.15; other versions require confirmation.
- Known `appsrc/window/frame.js` and older `app/window/frame.js` layouts are supported;
  unknown layouts are rejected. macOS reuses an existing compatible bridge.
- `[!type] Your title` supports custom headings; an omitted heading falls back to the type name.
  Body text keeps its normal weight and color. Editing the first line reveals its Markdown source.
  Inline math heading colors are handled; more complex formatting may need further adaptation.
- `[!type]-` hides content with hover preview; `[!type]+` remains expanded.
  The bundled upstream module does not provide full Obsidian fold-arrow interaction.
- HTML/PDF export uses upstream hooks. Real-document export has not been fully verified;
  `html-plain` is outside the upstream Callouts module's supported export modes.
- Third-party themes may need CSS adjustments. Automatic dark colors are configured for Night.
- CI checks isolated installation, packaging, and Callout DOM rendering. It does not launch actual Typora.

## Update, repair, and uninstall

To update, rerun the npm installation command for your chosen Release, then apply the new files:

```sh
typora-obsidian-callouts update
```

Existing framework files are reused while this project's modules and styles are updated.
If a Typora update removes the injected loader:

```sh
typora-obsidian-callouts repair
```

If the `plugin` directory was also removed, run `typora-obsidian-callouts install` again.
Restart Typora after updating or repairing.

To remove managed styles and restore module switches when settings are unchanged, then remove the CLI:

```sh
typora-obsidian-callouts uninstall
npm uninstall -g typora-obsidian-callouts
```

Edited plugin settings are retained with instructions for disabling the modules manually.
Shared framework files, module files, assets, and backups remain available for other plugins.

## Configuration

| Platform | Default theme directory |
| --- | --- |
| Windows | `%APPDATA%\Typora\themes` |
| Linux | `${XDG_CONFIG_HOME:-$HOME/.config}/Typora/themes` |
| macOS | `~/Library/Application Support/abnerworks.Typora/themes` |

Styles live in the theme directory's `obsidian-callouts/` folder.
`base.user.css` loads global styles; `night.user.css` loads the Night palette.
On all platforms, settings use `~/.config/typora_plugin/settings.user.toml` and installation
records/backups use `~/.config/typora_plugin/obsidian-callouts/`.

## CI and packaging

[GitHub Actions](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml)
checks Windows, Linux, and macOS. Successful `main` builds update the `dev` prerelease;
matching `v*` tags publish stable Releases. Release assets include the npm `.tgz`,
platform ZIPs, and SHA-256 files. Artifacts are retained as intermediate and fallback downloads.

To build the npm package locally:

```sh
npm ci
npm run pack:release
```

Output: `dist/typora-obsidian-callouts.tgz` and its `.sha256` file.
The older platform packaging scripts remain available for manual installations; see
[platform details](docs/platforms.md) (Chinese).

## License

MIT. See [third-party notices](THIRD_PARTY_NOTICES.md) for upstream attribution and licenses.
