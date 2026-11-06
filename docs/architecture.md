# 设计与维护

## npm 安装入口

推荐入口为 `bin/typora-obsidian-callouts.cjs`，调用 `lib/installer.cjs`。
安装器由 Node.js 实现，解压使用固定版本的 `adm-zip`，不依赖 Python 或手动执行 PS1/SH。
`install`、`update`、`repair`、`uninstall` 共享现有安装记录格式，保留原有用户开关和备份行为。
写程序目录时可单独请求 UAC/sudo，用户目录写入仍由普通用户进程完成。

`npm run pack:release` 生成包含框架归档、双语 README 和解压依赖的通用 `.tgz`。
CI 在三平台安装打包后的 tarball，验证依赖可离线安装及插件安装/卸载流程。
main 构建发布到 dev 预发布，版本标签发布稳定 Release；Artifacts 仅作中转和备用下载。
下文 PowerShell/Python 安装器继续作为旧版和手动安装入口。

## 三层组成

1. 上游框架：负责加载 Callouts、监听编辑事件和适配导出。
2. `styles/callouts.css`：负责语义类型、颜色、布局和 SVG 图标。
3. PowerShell 安装器：负责校验归档、安装加载器、用户配置和全局 CSS 入口。

框架仍是依赖。没有把 `callouts/index.js` 单独抽出，因为它使用框架的
`BasePlugin`、事件中心和导出接口。

## 用户设置

上游设置加载顺序：默认配置 → 程序目录配置 → 用户目录配置。
若用户目录存在 `settings.user.toml`，保存时会优先写入该文件。

安装器复用已有设置，仅设置 `[global]`、`[callouts]` 和 `[obsidian_images]` 中的 `ENABLE = true`。
全新安装使用 `config/settings.user.toml`，其他模块关闭。
当前脚本处理普通 `[section]` 与单行布尔键，不是通用 TOML 格式化器。

## 样式接入

`base.user.css` 开头使用有标记的 `@import`，因此所有主题可以共用同一资源。
样式放在主题文件夹的子目录，不会新增一项完整主题。
Night 的提亮变量只在 `@media screen` 中生效，打印保留浅色配色。

其他深色主题：在对应的 `<theme-name>.user.css` 最前面导入：

```css
@import url("./obsidian-callouts/callouts-dark.css");
```

安装器备份后会迁移早期设置产生的 `/* BEGIN OBSIDIAN CALLOUTS */` 旧区块，
避免其覆盖新的标题规则。其他手动粘贴且未标记的 CSS 保留原样。
新安装使用 `BEGIN TYPORA OBSIDIAN CALLOUTS` 标记。

## 程序目录

只有 `Install-Framework.ps1` 需要修改程序目录。它检查已知脚本标签，再备份
`window.html` 并插入上游加载器；已存在的框架目录不会被覆盖。
如果无法写入，通过 Windows 管理员提示重新运行框架安装步骤。
此步骤不改动用户目录，避免管理员账户不同导致用户文件装错位置。

`Repair.ps1` 为既有框架恢复加载入口，不强制替换版本。
卸载脚本只撤销样式和未被用户继续修改的配置，不删除共享框架。

## 更新上游版本

更新 `vendor` 中归档、对应许可证和 `manifest.json`，核对 SHA-256。
不要直接改动打包归档里的源码。保留上游的版权、依赖声明和版本信息。
本项目的标题补丁独立保存在 `patches/callouts/index.js`；升级上游版本时需核对
该模块与新的框架接口。安装器会备份已安装模块，再应用这份补丁。
现有框架的升级需单独进行；样式更新不会升级框架。

## 验证边界

`tests/Lifecycle.ps1` 检查归档哈希、脚本解析、隔离安装、重复安装、设置保留、
卸载与修复。它不会启动真实 Typora。
发布前仍应手动确认浅色/深色显示、自定义标题、嵌套引用和 HTML/PDF 导出。

## 图片适配模块

`patches/obsidian_images/index.js` 是独立模块，通过同一框架加载。
安装器对图片模块单独比对哈希、备份和更新，不改动上游归档。
模块扩展 Typora 公共 InlineLexer 的图片匹配，沿用原生图片节点、编辑源文本与导出，
宽度和位置通过实际 `<img>` 的样式表达。图片参数不会写回笔记。
附件名索引在后台异步建立，缓存 30 秒；不会递归进入符号链接目录。
拖放、粘贴及图片复制路径继续由 Typora 原生配置负责。详情见 `docs/images.md`。
