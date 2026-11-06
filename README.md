# Typora Obsidian Callouts

让 Typora 识别 Obsidian 风格的 Callout 和图片嵌入，方便迁移已有笔记。
Callout 在所有主题下使用统一的学术笔记样式。

```markdown
> [!definition] 定义
> 这里是定义正文。

> [!theorem] 定理
> 这里是定理正文。
```

本项目整合固定版本的 `obgnail/typora_plugin 1.19.14`、自定义 CSS 和 Windows
安装脚本。插件运行于 Typora 内部；这是可独立维护和分发的安装项目。

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

## 环境

Windows、Windows PowerShell 5.1 和已安装的 Typora。开发时使用 Typora 1.14.15；
安装器自动接受 `appsrc/window/frame.js` 和旧式 `app/window/frame.js` 加载入口，
遇到其他 HTML 结构会停止。其他 Typora 版本的界面效果需要实际确认。

## 安装

下载仓库或构建后的 ZIP，解压到一个固定目录。在该目录打开 PowerShell：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1
```

安装到受保护的程序目录时，会出现 Windows 管理员确认。管理员权限只用于安装
框架和加载入口。日常编辑和保存插件设置使用普通权限。

安装完成后，保存正在编辑的笔记，完全退出并重新打开 Typora，然后打开
`examples/callouts.md`。可以选择 GitHub、Newsprint、Night 等主主题。

自定义安装路径：

```powershell
.\scripts\Install.ps1 -TyporaPath 'D:\Apps\Typora'
```

给其他深色主题启用提亮配色，传入主题 CSS 文件名（不含 `.css`）：

```powershell
.\scripts\Install.ps1 -DarkTheme 'my-dark-theme'
```

同一安装记录的 `ThemeDir` 与 `DarkTheme` 保持固定；若需更换目标，先卸载样式，
再以新参数安装。添加更多深色主题的方法见 `docs/architecture.md`。

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

从 0.1.x 更新需要重新运行安装脚本并重启 Typora，才能安装图片模块。

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
  带行内公式或复杂格式的标题仍需额外适配。
- HTML/PDF 导出依赖上游导出钩子。本项目尚未完成真实文档的导出验证；
  `html-plain` 导出不在上游 Callouts 模块的支持范围内。
- 全局样式覆盖已识别的 Callout。第三方主题的高优先级规则可能需要额外适配。
- 自动深色配色默认仅接入 Night，其他主题按 CSS 文件名显式接入。

## 更新与修复

更新本项目文件后再次执行 `Install.ps1`，即可更新样式。已有的上游框架不会被
强制替换。Typora 更新可能覆盖 `window.html`，此时执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Repair.ps1
```

若更新还删除了 `plugin` 目录，请重新运行 `Install.ps1`。

## 卸载样式

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Uninstall.ps1
```

卸载移除本项目添加的 CSS 导入，保留用户其他样式。若插件设置在安装后未发生
变化，会恢复安装前的 `global.ENABLE`、`callouts.ENABLE` 与 `obsidian_images.ENABLE` 状态；若已发生变化，
会保留现状并提示手动关闭 Callouts 与 Obsidian Images。备份保存在用户配置目录下。

卸载会保留共享插件框架和失效的样式资源文件，避免影响后来启用的其他插件。
若要完全卸载框架，可按上游的卸载方法处理；程序目录变更前请自行备份。

## 目录与配置

```text
scripts/       安装、卸载、修复、打包脚本
styles/        全局样式与深色配色
config/        全新安装预设
examples/      Callout 示例
vendor/        固定版本的上游归档、哈希与许可证
tests/         隔离环境安装生命周期检查
docs/          设计和开发说明
```

默认安装位置：

- 样式：`%APPDATA%\Typora\themes\obsidian-callouts\`
- 全局入口：`%APPDATA%\Typora\themes\base.user.css`
- Night 入口：`%APPDATA%\Typora\themes\night.user.css`
- 插件设置：`%USERPROFILE%\.config\typora_plugin\settings.user.toml`
- 安装记录与备份：`%USERPROFILE%\.config\typora_plugin\obsidian-callouts\`

## 检查和打包

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

本项目采用 MIT 许可证。上游版权和许可证见 `THIRD_PARTY_NOTICES.md`。
