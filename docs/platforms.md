# 平台安装与 GitHub Actions

## 下载

稳定版本从仓库的 [Releases](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases) 下载对应平台 ZIP。
开发版本进入 [Actions](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml)，
打开成功的运行记录，在 Artifacts 下载对应包（GitHub 通常要求登录）。解压 Artifact 后再解压其中的安装 ZIP。
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
2. Windows 额外运行现有 PowerShell 5.1 生命周期检查。
3. 三个平台运行 JavaScript 语法检查及 headless Chromium 的 Callout DOM 渲染检查。
4. 构建平台 ZIP，附带校验文件，上传 Artifacts，保存 30 天。
5. 当推送 `v<版本号>` 标签时，三平台全部通过后自动发布 GitHub Release 并附带安装包。

版本号统一读取根目录 `VERSION`。发布标签必须与文件一致，例如 `VERSION` 为 `0.2.1`：

```sh
git tag v0.2.1
git push origin v0.2.1
```

CI 不运行真实 Typora，不消耗 Typora 许可证。安装与后台 DOM 检查不能代替真实应用兼容性确认。
