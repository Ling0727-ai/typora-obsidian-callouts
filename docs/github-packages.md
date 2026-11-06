# GitHub Packages 发布与安装

推荐用户直接安装公开 npmjs 包：`npm install -g @ling0727-ai/typora-obsidian-callouts@latest`。
下面说明的是可选 GitHub Packages 镜像；只有选择该镜像时才需要 GitHub registry 认证。
从镜像切回 npmjs 时，先执行 `npm config delete @ling0727-ai:registry`。

本项目的包名为 `@ling0727-ai/typora-obsidian-callouts`，命令名保持 `typora-obsidian-callouts`。
作用域使用全小写 GitHub 账号名，registry 是 `https://npm.pkg.github.com`。
无需注册 npmjs.org 账号。

## 用户安装

GitHub 的 npm registry 对私有、内部和公开包都要求认证。
准备自己的 classic PAT，安装通常只需 `read:packages`；私有包还要求该账号具有包的读取权限。

```sh
npm config set @ling0727-ai:registry https://npm.pkg.github.com
npm login --scope=@ling0727-ai --auth-type=legacy --registry=https://npm.pkg.github.com
```

用户名填写自己的 GitHub 用户名，密码使用 Token。npm 9+ 使用 `--auth-type=legacy`。
登录完成后：

```sh
npm install -g @ling0727-ai/typora-obsidian-callouts@latest
typora-obsidian-callouts install
```

从原无作用域工具迁移时，先执行 `npm uninstall -g typora-obsidian-callouts`，再安装新作用域工具，
避免两个包争用同一个命令。npm 卸载工具不会自动删除 Typora 内的插件文件。

## Actions 自动发布

1. 修改代码并同步 `package.json`、`package-lock.json` 和 `VERSION` 的版本号。
2. 推送代码到 main，等待三平台检查。
3. 推送匹配的版本标签，例如 `v0.2.3`。
4. Actions 发布 Release 后，将同一个已检查的 `.tgz` 发布到 GitHub Packages，标记为 `latest`。
5. Actions 通过 registry 重新安装指定版本，核对 CLI 版本，不操作真实 Typora。

发布步骤仅授予 `contents: read` 和 `packages: write`，使用仓库自带的 `GITHUB_TOKEN`。
不需要维护者创建 PAT 或在本机执行 npm 登录。项目不再提供 GitHub 作用域 `.npmrc`，
避免覆盖默认 npmjs 源；镜像 job 通过 setup-node 独立配置 registry 和临时 Token。
开发构建继续发布到 dev Release，不重复占用不可覆盖的 npm 稳定版本。

GitHub Packages 首次发布的包默认是私有。若要向其他用户开放，可由包所有者在包的
Settings 中调整访问权限或可见性；即使改为公开，npm registry 安装仍要求认证。

## 手动发布（可选）

具有发布权限的维护者可使用含 `write:packages` 的 classic PAT 登录同一个 registry。
其他权限按实际仓库访问需求选择，不需要每个安装者都授予 `repo`。

```sh
npm ci
npm run pack:release
npm publish ./dist/typora-obsidian-callouts.tgz --registry=https://npm.pkg.github.com --tag latest
```

版本一旦发布不能直接覆盖。自动发布重跑时会核对已有版本的完整性，并仅复用一致的版本。

## 不使用 GitHub Token

直接安装公开 Release 中的 tarball：

```sh
npm install -g https://github.com/Ling0727-ai/typora-obsidian-callouts/releases/latest/download/typora-obsidian-callouts.tgz
typora-obsidian-callouts install
```

也可从公开 Git 仓库安装，需要本机已有 Git：

```sh
npm install -g github:Ling0727-ai/typora-obsidian-callouts
typora-obsidian-callouts install
```

Git 安装使用默认分支，不保证是稳定版本。npm 不会因为存在 `build` 脚本就自动执行它；
是否构建取决于 `prepare` 等生命周期钩子。本项目 CLI 是直接运行的 Node.js 代码，无需额外构建。
无论从哪种来源安装 npm 工具，都需显式执行第二条插件部署命令。

参考：[GitHub npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)、
[Actions 发布 Node.js 包](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-nodejs-packages)、
[npm 生命周期脚本](https://docs.npmjs.com/cli/v11/using-npm/scripts/)。
