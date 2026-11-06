## 安装包

- **windows.zip**：解压，双击 `install.cmd`。
- **linux.zip**：安装 Python 3.9+，解压后运行 `sh install.sh`。
- **macos-experimental.zip**：实验性适配，仅用于已经安装兼容 WKWebView 桥接的 macOS Typora；默认仅启用 Callouts，图片适配需显式传入 `--enable-images`。

每个 ZIP 附带独立 `.sha256` 校验文件。安装后保存笔记并重启 Typora。

安装脚本在 Windows、Linux、macOS CI 环境中进行了隔离文件安装检查，以及 Callout 的后台 DOM 检查。
这些检查没有安装或启动真实 Typora，不能证明所有平台、版本或主题的实际兼容性。

完整的平台前提、自定义路径和卸载说明见包内 `docs/platforms.md`。
