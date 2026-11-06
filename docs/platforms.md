# 平台安装与 GitHub Actions

## 推荐：npm 安装

需要 Node.js 20+ 和 npm，不需要 Python。默认从公开 npmjs.org 安装，无需用户登录：

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts install
```

如果曾将作用域指向 GitHub Packages，请先运行 `npm config delete @ling0727-ai:registry`。
GitHub Packages 仅作为可选镜像，认证要求见 `docs/github-packages.md`。
也可直接安装公开 Release URL：
`npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest/download/typora-obsidian-callouts.tgz`。

开发版或尚无稳定版本时，URL 改为 `https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/download/dev/typora-obsidian-callouts.tgz`。
也可以下载 `.tgz` 后执行 `npm install -g ./typora-obsidian-callouts.tgz`。
Release 附带 `.sha256` 校验文件。npm 包包括框架和解压依赖，插件安装阶段不需额外下载。
公开 npmjs 包不需要额外配置作用域 registry。

```sh
typora-obsidian-callouts update
typora-obsidian-callouts repair
typora-obsidian-callouts uninstall
npm uninstall -g @ling0727-ai/typora-obsidian-callouts
```

安装前保存并退出 Typora。`--typora-path`、`--theme-dir`、`--user-config-dir`、`--dark-theme`
参数可覆盖默认目标。macOS 仍需要已有 WKWebView 桥接，默认关闭图片适配，需 `--enable-images` 显式尝试。
安装器由 Node.js 实现；Windows 只在程序目录写入需要权限时通过系统 UAC 提权，Linux/macOS 则通过 `sudo`。
用户配置始终由普通用户进程处理。

以下脚本安装入口保留给手动部署或旧版本使用。

## 下载

稳定版本从仓库的 [Releases](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases) 下载对应平台 ZIP。
开发版本从 [dev 预发布](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/tag/dev) 下载。
[Actions](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml) 中的 Artifacts 作为备用下载和中转。
`.sha256` 文件记录安装 ZIP 的 SHA-256。

| 系统 | 入口 | 当前边界 |
| --- | --- | --- |
| Windows | 双击 `install.cmd` | 沿用 Windows PowerShell 5.1 安装器 |
| Linux | `sh install.sh` | 原生安装入口，需 Python 3.9+；实际 Typora 仍需确认 |
| macOS | `Install.command` 或 `sh install.sh` | 实验性，要求已安装兼容 WKWebView 桥接；默认仅 Callouts |

先正常退出 Typora，执行安装，再重新打开。安装器不会操作编辑窗口。

## Windows

双击包内 `install.cmd`。也可以继续使用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1
```

受保护的程序目录会请求 Windows 管理员授权；用户配置仍写入原用户目录。

## Linux

准备 Python 3.9 或更新版本，解压后在普通用户终端运行：

```sh
sh install.sh
```

自动查找 `/usr/share/typora`、`/opt/typora`、`/usr/lib/typora`、`/opt/Typora` 下的资源文件。
自定义路径：

```sh
sh install.sh --typora-path /path/to/Typora
sh install.sh --typora-path /path/to/resources --dark-theme my-dark-theme
```

主题目录默认 `${XDG_CONFIG_HOME:-$HOME/.config}/Typora/themes`，框架设置固定使用上游的
`~/.config/typora_plugin/settings.user.toml`。可以通过 `--theme-dir` 和 `--user-config-dir` 指定目录。

需要写入系统应用目录时，脚本通过 `sudo` 仅执行框架安装步骤。不要对整个脚本使用 `sudo`，
否则会把用户设置写入 root 目录；脚本会拒绝这种调用。`--no-elevate` 可禁止自动请求 sudo。
AppImage、Flatpak、Snap 等只读或沙箱安装不自动解包或修改，需提供可写且结构兼容的资源目录。

## macOS 实验性入口

macOS Typora 使用 WKWebView，没有 Windows/Linux 版本的 Node/Electron 运行时。
[上游框架](https://github.com/obgnail/typora_plugin)没有原生 macOS 支持。
社区 [Typora-plugin-on-Mac](https://github.com/bfyes/Typora-plugin-on-Mac) 提供了单独桥接方案。
本项目不打包该桥接、不创建后台服务、不改应用签名或系统安全属性。

只有已经装好兼容桥接的用户才运行本实验入口：

```sh
sh install.sh --typora-path /Applications/Typora.app
```

安装器检查 `Contents/Resources/TypeMark/index.html` 是否引用已有 `plugin/loader.js`，
并检查现有框架核心。缺少桥接时直接说明原因，且不会先写用户配置。
通过检查后复用现有加载入口与框架，只部署本项目模块与全局 CSS。
不覆盖桥接文件，也不安装 Windows/Linux 的加载器到 WKWebView 页面。

由于 macOS 的图片解析器和文件桥接可能不同，默认关闭 `obsidian_images`。
需要尝试图片功能时显式启用：

```sh
sh install.sh --enable-images
```

即使 CI 在 macOS runner 上成功，也只说明安装脚本和模拟结构通过检查，
不代表桥接、本项目 Callout 或图片已在真实 macOS Typora 验证。该包始终标为 `macos-experimental`。

## 卸载和修复（Linux / macOS）

```sh
sh install.sh --uninstall
sh install.sh --repair
```

卸载移除受管理的 CSS 导入；设置未被用户继续修改时恢复模块原来的启用状态。
共享插件框架、模块文件及备份保留，避免影响其他插件。
修复只处理程序目录加载入口和模块，不启用已被卸载的用户样式或配置。

## CI 和发布

`.github/workflows/build.yml` 在推送 main、Pull Request、版本标签及手动运行时启动：

1. Windows、Ubuntu、macOS 三个平台分别运行 Python 隔离安装、卸载、升级、打包检查。
   同时检查 Node.js npm 安装器及打包后的 tarball 离线安装，不接触真实 Typora。
2. Windows 额外运行现有 PowerShell 5.1 生命周期检查。
3. 三个平台运行 JavaScript 语法检查及 headless Chromium 的 Callout DOM 渲染检查。
4. 构建 npm `.tgz`、平台 ZIP 和校验文件，通过 Artifacts 中转，保留 30 天。
5. main 成功构建后自动更新 `dev` 预发布；匹配版本标签时创建稳定 Release。两者都附带可直接下载的安装包。
6. 稳定标签在三平台和 Release 发布完成后，将已经检查的 `.tgz` 发布到 GitHub Packages，并验证认证安装。
   此步骤使用 `GITHUB_TOKEN` 和 `packages: write`，无需维护者 PAT；重复执行时校验已发布版本一致。
7. 同一稳定标签通过 OIDC Trusted Publishing 发布公共 npmjs 包，并读取公开 metadata 核对版本。
   该步骤要求 npmjs 已建立匹配 `Ling0727-ai/typora-obsidian-callouts` 和 `build.yml` 的受信任发布配置。

`VERSION` 与 `package.json` 的版本号必须一致。发布标签也必须匹配，例如版本为 `0.2.4`：

```sh
git tag v0.2.4
git push origin v0.2.4
```

CI 不运行真实 Typora，不消耗 Typora 许可证。安装与后台 DOM 检查不能代替真实应用兼容性确认。
