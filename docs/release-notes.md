## Install with npm / 使用 npm 安装

GitHub Packages (one-time registry configuration and authentication required):

```sh
npm config set @ling0727-ai:registry https://npm.pkg.github.com
npm login --scope=@ling0727-ai --auth-type=legacy --registry=https://npm.pkg.github.com
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts install
```

Use your GitHub username and a classic PAT with `read:packages`. Private packages require account access.
GitHub Packages requires authentication even for public npm packages; no npmjs.org account is needed.

GitHub Packages 安装使用自己的 GitHub 账号与具有 `read:packages` 的 classic PAT。
私有包还要求账号具有读取权限；公开 npm 包同样需要认证，无需 npmjs.org 账号。

Requires Node.js 20+ and npm. Download the attached `typora-obsidian-callouts.tgz`, then run:

需要 Node.js 20+ 和 npm。下载下方的 `typora-obsidian-callouts.tgz`，随后执行：

```sh
npm install -g ./typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

Stable: `npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest/download/typora-obsidian-callouts.tgz`

Development: `npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/download/dev/typora-obsidian-callouts.tgz`

The npm package bundles its dependencies and needs no Python. Release tarballs are the alternative that needs no GitHub token.

npm 包包含运行依赖，无需 Python。直接安装 Release tarball 不需要 GitHub Token。

## Optional manual packages / 可选手动安装包

- **windows.zip**：解压，双击 `install.cmd`。
- **linux.zip**：安装 Python 3.9+，解压后运行 `sh install.sh`。
- **macos-experimental.zip**：实验性适配，仅用于已经安装兼容 WKWebView 桥接的 macOS Typora；默认仅启用 Callouts，图片适配需显式传入 `--enable-images`。

每个 ZIP 附带独立 `.sha256` 校验文件。安装后保存笔记并重启 Typora。

Windows、Linux、macOS CI 检查 npm 工具的隔离安装、离线 tarball 安装，以及 Callout 的后台 DOM 渲染。
这些检查没有安装或启动真实 Typora，不能证明所有平台、版本或主题的实际兼容性。

完整的平台前提、自定义路径和卸载说明见包内 `docs/platforms.md`。
