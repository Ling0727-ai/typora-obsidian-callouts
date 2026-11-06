# 修改记录

## 0.2.3

- 包名改为 `@ling0727-ai/typora-obsidian-callouts`，配置 GitHub Packages registry，命令名保持不变。
- 稳定标签通过 Actions 的 `GITHUB_TOKEN` 自动发布到 GitHub Packages，并重新从 registry 安装核对版本。
- 保留 Release tarball 的免 Token 安装方式和 dev 预发布。
- 双语 README 补充 scope 源配置、classic PAT 登录、旧无作用域工具迁移与包访问要求。
- 明确公开 npm 包在 GitHub Packages 也需要认证，Git 源码安装不等同于自动执行 `npm run build`。

## 0.2.2

- README 默认使用英文，新增 `README_CN_simplised.md`，两份文档顶部互相跳转。
- 重写安装、更新、修复与卸载说明，以 npm 工具为推荐入口。
- 新增 Node.js 跨平台 CLI，不需要 Python；npm 安装工具后由 `install` 显式部署插件。
- npm tarball 打包上游框架与解压依赖，可从 GitHub Release URL 或本地文件安装。
- main 成功构建自动更新 dev 预发布；版本标签构建发布稳定 Release，不再仅提供 Artifacts。
- 三平台 CI 检查 npm 工具及 tarball 的离线安装、卸载；macOS 仍为需要已有桥接的实验性适配。

## 0.2.1

- 新增 GitHub Actions：Windows、Ubuntu、macOS 的隔离安装/卸载/升级检查、Callout 后台渲染检查及离线打包。
- 版本统一读取 `VERSION`；推送匹配的版本标签时自动发布三平台 ZIP 和 SHA-256，普通运行保留 Artifacts。
- Windows 提供 `install.cmd`；Linux 提供普通用户调用的 Python 3.9+ 安装器和 shell 入口，程序目录写入单独提权。
- macOS 提供实验性入口，要求已有 WKWebView 桥接；缺少桥接时停止，默认关闭图片适配。
- 安装器保留用户设置、备份补丁、去重导入，卸载时恢复未被继续修改的模块开关。
- CI 不启动真实 Typora；macOS 构建成功不代表原生应用运行兼容。

## 0.2.0

- 新增独立 Obsidian Images 模块，兼容 `![[图片|位置|宽度]]` 和 `![[图片|宽度|位置]]`。
- 位置为 C/R/L，数字为像素宽度；图片保持比例并限制在正文宽度内。
- 沿用原生图片组件，保留原始 wikilink 文本；支持本地文件路径与库内附件名查找。
- 拖放和粘贴新图片沿用 Typora 标准图片流程。
- 安装器部署、备份、启用图片模块，卸载时恢复原来的模块开关。
- 新增图片示例及迁移说明。此版本未运行测试或操作真实 Typora 窗口。

## 0.1.5

- 标题在行内公式、加粗或其他格式处拆为多个节点时，整行统一使用类型颜色。
- 标题公式的 SVG 继承标题颜色，覆盖主题的固定公式色；正文公式保持原色。
- 以第一个 `br` 或 `.md-softbreak` 为标题边界，避免染色后续正文。
- 覆盖上游过宽的 `span:first-child` 着色规则，正文加粗文字继承正文色。
- 此版本仅调整 CSS，从 0.1.4 升级无需替换程序目录中的解析模块。

## 0.1.4

- 兼容首次打开文件时 `[!note] 标题` 被 Typora 包装为 `.md-alert` 的情况。
  这类容器的首行没有原生 `alert_text`，现在由插件接管标题。
- 跳过已经由原生 `alert_text` 正常渲染的提示块，避免双重处理。
- 监听 `fileOpened` 和 `fileContentLoaded`，不再依赖首次编辑补充扫描。
- HTML 导出映射纳入 `.md-alert` 容器，只处理已标记的插件提示块。

## 0.1.3

- 修复标题伪元素的 `.98em` 继承隐藏原文 span 的 `0px` 字号，导致标题不可见。
  改用 `.98rem`，不再依赖被隐藏父元素的字号。
- 渲染检查新增标题实际字号必须大于零的断言，并在查看态保存截图。
- 从 0.1.2 升级只需更新 CSS，不需要替换解析模块。

## 0.1.2

- 标题复用上游的 `data-type` 显示属性，移除额外的标题属性依赖。
- 从段落的第一行提取标题，覆盖嵌套 span、软换行和纯文本换行。
- 标记和标题位于不同节点时，保留节点外的标题，避免重复显示。
- 元数据暂未生成时保留原始标题文字，避免标题整行变空。
- 首段正文恢复正常字重与正文颜色。
- 后台浏览器检查与隔离安装生命周期检查通过。真实 Typora 窗口未自动验证。

## 0.1.0

- 全局 Callout 样式、Night 配色、离线依赖、安装、卸载和修复脚本。
