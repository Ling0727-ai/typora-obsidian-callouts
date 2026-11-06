# npmjs 自动发布

公开包：`@ling0727-ai/typora-obsidian-callouts`。
默认 npmjs registry 为 `https://registry.npmjs.org`，普通用户无需账号或认证即可安装。

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts install
```

## 维护者首次准备

npm 包必须已存在，维护者对包有写权限，并在 npmjs 配置受信任发布者：

- Provider：GitHub Actions。
- Repository：`Ling0727-ai/typora-obsidian-callouts`。
- Workflow filename：`build.yml`。
- 允许直接 `npm publish`。

也可以由已认证且启用 2FA 的维护者使用 npm CLI 配置：

```sh
npm trust github @ling0727-ai/typora-obsidian-callouts --file build.yml --repository Ling0727-ai/typora-obsidian-callouts --allow-publish --registry=https://registry.npmjs.org --yes
```

首次创建包、配置受信任发布可能要求维护者在浏览器完成二次认证。
GitHub 与 npmjs 账号绑定本身不等于已授权某个工作流发布。

## 每次发布

1. 同步 `package.json`、`package-lock.json` 与 `VERSION` 的版本号。
2. 推送 main，确认三平台构建通过。
3. 推送匹配版本标签，例如 `v0.2.4`。
4. Actions 发布 Release，然后独立执行公共 npmjs 发布和 GitHub Packages 镜像发布。

公共发布 job 使用 Node.js 24、npm 11.20.0、`id-token: write` 和 OIDC，
不读取或复制本机 npm 登录凭据，也不要求保存长期 `NPM_TOKEN`。
它发布三平台已验证的通用 `.tgz`，然后从公开 registry 读取版本进行核对。
重复运行只复用完整性一致的既有版本，不覆盖已发布版本。

GitHub Packages 镜像 job 使用 `GITHUB_TOKEN` 与 `packages: write`，认证与 npmjs 分开配置。
开发构建仅更新 dev Release，不占用稳定 npm 版本。

参考：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)、
[npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/)。
