# Typora Obsidian Callouts

[English](README.md) | **简体中文**

[![Build and check installers](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml/badge.svg)](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/%40ling0727-ai%2Ftypora-obsidian-callouts)](https://www.npmjs.com/package/@ling0727-ai/typora-obsidian-callouts)
[![GitHub Release](https://img.shields.io/github/v/release/Ling0727-ai/typora-obsidian-callouts)](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest)

让 Typora 识别 Obsidian 风格的 Callout 和图片嵌入，方便迁移已有笔记。
Callout 在所有主题下使用统一的学术笔记样式。

```markdown
> [!note] 适用条件与单位
> 这里是提示正文。[!note] 后面的文字会显示为标题。

> [!theorem] 定理
> 这里是定理正文。
```

本项目整合固定版本的 `obgnail/typora_plugin 1.19.14`、自定义 CSS 和 npm 命令行安装工具。
插件模块运行于 Typora 内部。

## 功能

- 透明背景、细彩色左边线、彩色标题与内嵌 SVG 图标。
- 使用 `base.user.css` 接入全局样式，切换主主题后继续生效。
- 为 Night 主题提供独立的深色配色；其他深色主题可以指定文件名接入。
- 设置保存在用户目录，避免普通权限下向 `Program Files` 写配置失败。
- 兼容 `![[图片.png|C|500]]` / `![[图片.svg|500|C]]`，支持 `C/R/L` 对齐和像素宽度。
- 新图片拖入、粘贴沿用 Typora 的标准 Markdown 图片流程。
- 全新安装启用 Callouts 与 Obsidian Images；复用已有框架时保留其他模块的启用状态。
- 内含固定版本的上游 ZIP，安装时无需联网；展开前检查 SHA-256。
- 安装前备份、重复安装去重、卸载样式、Typora 更新后修复加载入口。
- GitHub Release 提供通用 npm 安装包、各平台 ZIP 和 SHA-256 校验文件。

## 环境

推荐安装方式需要 Node.js 20+ 和 npm，Windows/Linux 使用同一套命令，无需 Python。
macOS 提供实验性入口，要求已有兼容的 WKWebView 桥接环境，默认只启用 Callouts。
三平台 CI 检查安装脚本和模拟结构，不代表真实 Typora 的兼容性验证。
详细前提见 [平台说明](docs/platforms.md)。开发时使用 Windows Typora 1.14.15；
安装器自动接受 `appsrc/window/frame.js` 和旧式 `app/window/frame.js` 加载入口，
遇到其他 HTML 结构会停止。其他 Typora 版本的界面效果需要实际确认。

## 安装

### 1. 准备环境

安装 Node.js 20 或更新版本（自带 npm），保存笔记并正常退出 Typora。
使用当前普通用户的终端执行下面的命令。
Windows、Linux 使用相同命令；macOS 为实验性支持，需已有兼容的 WKWebView 桥接，
详见下方的[平台与自定义路径](#平台与自定义路径)。

### 2. 使用 npm 安装工具与插件

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts install
```

第一条命令下载并安装管理工具，第二条命令将插件与样式写入 Typora。
包内包含上游框架和解压依赖，写入插件时不需要额外下载。
公开包默认从 **npmjs.org** 安装，使用者不需要 npm 账号、GitHub Token 或 registry 登录。
GitHub Packages 保留为可选的认证镜像，详见 [镜像说明](docs/github-packages.md)。

### 3. 重启并查看效果

重新打开 Typora，使用本文的 Callout 或图片示例。
仓库及平台 ZIP 内另有 [Callout 示例](examples/callouts.md)和[图片示例](examples/images.md)。
继续使用 GitHub、Newsprint、Night 等原有主题即可。
样式通过全局用户 CSS 加载，主题列表中不会新增 Obsidian 主题。
Typora 内置提示块需要在偏好设置中启用 GitHub 风格提示块；本项目不修改该偏好。

## 从旧版本迁移

如果先前配置过作用域指向 GitHub Packages，先移除该映射，再使用 npmjs：

```sh
npm config delete @ling0727-ai:registry
```

如果之前安装了无作用域的 0.2.2 工具，请先移除旧 npm 包，再安装新作用域包，避免命令名冲突：

```sh
npm uninstall -g typora-obsidian-callouts
```

这条 npm 卸载命令不会删除已经写入 Typora 的插件文件。

随后安装带作用域的包，并将更新应用到已有 Typora 安装：

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts update
```

以前通过 PowerShell 或 shell 脚本安装的用户，也可以改用这套命令。
更新前保存笔记并退出 Typora，完成后重新打开。

## 其他安装方式

### 从 GitHub Release 安装

直接从公开 GitHub Release 安装同一份 npm 包，不需要 registry 登录：

```sh
npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest/download/typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

### 开发版与本地包

每次 main 成功构建会更新 [dev 预发布](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/tag/dev)。
需要在下一个稳定版本发布前尝试开发版时：

```sh
npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/download/dev/typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

也可以从 [Releases](https://github.com/Ling0727-ai/typora-obsidian-callouts/releases) 下载
`typora-obsidian-callouts.tgz` 和对应 `.sha256`，再安装本地文件：

```sh
npm install -g ./typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

## 平台与自定义路径

| 平台 | 安装说明 |
| --- | --- |
| Windows | 使用相同 npm 命令；受保护目录请求管理员授权，仅程序文件步骤提权 |
| Linux | 使用相同 npm 命令；需要时通过 `sudo` 仅写程序文件，不要对整个命令使用 `sudo` |
| macOS | 实验性，必须已有兼容 WKWebView 桥接；默认仅启用 Callouts |

自定义 Typora 安装目录或包含 `window.html` 的资源目录：

```sh
typora-obsidian-callouts install --typora-path "D:/Apps/Typora"
typora-obsidian-callouts install --typora-path /opt/typora
```

macOS 需先准备兼容桥接，参考 [平台说明](docs/platforms.md)，随后执行：

```sh
typora-obsidian-callouts install --typora-path /Applications/Typora.app
```

若要尝试 macOS 图片适配，再添加 `--enable-images`。CI 成功不代表真实 macOS Typora 已验证。
AppImage、Flatpak、Snap 等安装不会自动解包或修改。

其他深色主题传入 CSS 文件名，不含 `.css`：

```sh
typora-obsidian-callouts install --dark-theme my-dark-theme
```

同一安装记录的 `ThemeDir` 和 `DarkTheme` 需保持固定，更换前先执行 `uninstall`。
使用 `typora-obsidian-callouts --help` 查看全部选项。

## 图片迁移

```markdown
![[图片.png|C|500]]
![[图片.svg|500|R]]
![[附件/图片.jpg|L|320]]
```

`C/R/L` 分别为居中、右对齐、左对齐，数字是图片宽度（px），两者顺序不限。
模块保留原始图片写法，并查找当前笔记目录或 Obsidian 库内附件。新插入图片继续使用
Typora 原生 `![说明](路径)`，不修改图像偏好。完整规则见 [图片迁移说明](docs/images.md)，
可打开 `examples/images.md` 查看同仓库 SVG 示例。

从 0.1.x 更新后需执行 `typora-obsidian-callouts update` 并重启 Typora，才能加载图片模块。

## 类型

| 类型 | 用途 |
| --- | --- |
| `definition` | 定义 |
| `theorem` | 定理 |
| `corollary` | 推论 |
| `proof` | 证明 |
| `example` | 例题 |
| `method` | 方法 |
| `note` | 注意 |
| `info` | 信息 |
| `tip` | 提示 |
| `warning` | 警告 |
| `important` | 重点 |
| `summary` | 总结 |
| `flowchart` | 流程说明 |

兼容旧笔记中的 `notes`、`importent`、`definitiion`。`flowchart` 是语义提示块，
不负责渲染流程图。

Typora 内置的五种 GitHub 提示块继续使用原生解析。请在 Typora 偏好设置中启用
GitHub 风格提示块；本项目不修改这个偏好。

## 兼容范围

- 自定义类型由上游 Callouts 模块识别，CSS 负责外观。
- `[!type]-` 可默认隐藏内容，鼠标悬停时预览；当前上游模块不提供完整的
  Obsidian 折叠箭头点击交互。`[!type]+` 保持展开。
- 支持 `[!type] 自定义标题`：显示标记后的纯文本标题；没有标题时显示类型名。
  正文保持普通字重与正文颜色。编辑首行时显示原始 Markdown。
  已处理标题中的行内公式颜色；更复杂的格式仍可能需要适配。
- HTML/PDF 导出依赖上游导出钩子。本项目尚未完成真实文档的导出验证；
  `html-plain` 导出不在上游 Callouts 模块的支持范围内。
- 全局样式覆盖已识别的 Callout。第三方主题的高优先级规则可能需要额外适配。
- 自动深色配色默认仅接入 Night，其他主题按 CSS 文件名显式接入。
- CI 检查隔离目录安装、打包和 Callout DOM 渲染，不启动真实 Typora。

## 更新与修复

保存笔记并退出 Typora，从 npmjs.org 更新工具，再应用更新：

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts update
```

如果之前从 Release 的 `.tgz` 安装，重新执行对应的 npm 安装命令获取新工具，
再执行 `typora-obsidian-callouts update`。

已有上游框架会复用，本项目模块和样式会更新。Typora 更新导致加载入口丢失时：

```sh
typora-obsidian-callouts repair
```

如果 `plugin` 目录也被删除，请重新运行 `typora-obsidian-callouts install`。
更新或修复完成后重启 Typora。

## 卸载样式

```sh
typora-obsidian-callouts uninstall
npm uninstall -g @ling0727-ai/typora-obsidian-callouts
```

卸载移除本项目添加的 CSS 导入，保留用户其他样式。若插件设置在安装后未发生
变化，会恢复安装前的 `global.ENABLE`、`callouts.ENABLE` 与 `obsidian_images.ENABLE` 状态；若已发生变化，
会保留现状并提示手动关闭 Callouts 与 Obsidian Images。备份保存在用户配置目录下。

卸载会保留共享插件框架和失效的样式资源文件，避免影响后来启用的其他插件。
若要完全卸载框架，可按上游的卸载方法处理；程序目录变更前请自行备份。

## 常见问题

| 现象 | 处理方法 |
| --- | --- |
| npm 要求 GitHub 认证，或找不到包 | 若先前配置过 GitHub Packages 作用域映射，执行 `npm config delete @ling0727-ai:registry`，再重新安装 |
| 找不到 `typora-obsidian-callouts` 命令 | 重新打开终端，确认 npm 全局可执行文件目录已加入 `PATH` |
| npm 更新成功，但 Typora 仍使用旧插件 | 退出 Typora，执行 `typora-obsidian-callouts update`，再重新打开 Typora |
| 安装器找不到 Typora | 使用 `--typora-path` 指定安装目录，示例见上文 |
| 主题列表里没有 Obsidian | 继续使用原主题；本项目通过用户 CSS 和插件模块加载 |

使用 `typora-obsidian-callouts --version` 查看已安装工具版本，
使用 `typora-obsidian-callouts --help` 查看可用选项。

## 目录与配置

```text
scripts/       安装、卸载、修复、打包脚本
bin/           npm 命令入口
lib/           Node.js 跨平台安装器
styles/        全局样式与深色配色
config/        全新安装预设
examples/      Callout 示例
vendor/        固定版本的上游归档、哈希与许可证
tests/         隔离环境安装生命周期检查
docs/          设计和开发说明
```

各平台默认主题目录：

| 平台 | 默认主题目录 |
| --- | --- |
| Windows | `%APPDATA%\Typora\themes` |
| Linux | `${XDG_CONFIG_HOME:-$HOME/.config}/Typora/themes` |
| macOS | `~/Library/Application Support/abnerworks.Typora/themes` |

样式位于主题目录内的 `obsidian-callouts/`，`base.user.css` 加载全局样式，
`night.user.css` 加载 Night 配色。
所有平台的插件设置均位于 `~/.config/typora_plugin/settings.user.toml`，
安装记录与备份位于 `~/.config/typora_plugin/obsidian-callouts/`；Windows 下 `~` 对应 `%USERPROFILE%`。

## 检查和打包

[GitHub Actions](https://github.com/Ling0727-ai/typora-obsidian-callouts/actions/workflows/build.yml)
在 Windows、Linux、macOS 上检查安装、打包与 Callout DOM 渲染。
检查使用隔离文件和无界面 Chromium，不启动真实 Typora。

| 构建来源 | 发布产物 |
| --- | --- |
| Pull request | CI 检查与可下载的 Actions Artifacts |
| 成功的 `main` 构建 | 更新 `dev` 预发布，包含 npm 安装包、平台 ZIP 和 SHA-256 文件 |
| 匹配版本号的 `v*` 标签 | 稳定 GitHub Release、标记为 `latest` 的公开 npmjs 包，以及 GitHub Packages 镜像 |

npm 发布使用 Trusted Publishing（OIDC），无需长期 npm Token。
npm 包需预先授权此仓库的 `build.yml` 工作流，并允许直接发布；工作流使用 `id-token: write`。
维护者配置见 [npm 自动发布说明](docs/npm-publishing.md)。
独立镜像步骤使用 `GITHUB_TOKEN` 和 `packages: write` 发布到 GitHub Packages。
发布后等待 registry 同步，并核对公开版本、`latest` 标签和安装包完整性。
开发构建只更新 dev Release；Artifacts 作为流水线中转和备用下载。
详见 [CI 和发布说明](docs/platforms.md#ci-和发布)。本地跨平台检查与打包：

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/build.py --platform linux
```

Windows 原有检查和打包入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Lifecycle.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Build.ps1
```

检查使用项目 `.work/` 下的模拟 Typora 目录，不改动真实安装和用户配置。
生成的离线 ZIP 位于 `dist/`；该目录不提交到 Git。

标题渲染回归检查另外需要 Node.js、Playwright 和可用的 Chromium 浏览器：

```powershell
node .\tests\Titles.cjs
```

可用 `CHROMIUM_PATH` 指定 Chrome 的完整路径。检查覆盖自定义标题、默认标题、
正文颜色与字重、折叠标记、编辑首行时的可见性，以及 NOTE 原生容器、
首次打开文件的异步加载和对应 HTML 导出。

npm 工具打包入口：

```sh
npm ci
npm run pack:release
```

本项目采用 MIT 许可证。上游版权和许可证见 `THIRD_PARTY_NOTICES.md`。
