# opencode-plugins

Bun workspace monorepo，用于存放各自独立发布的 OpenCode 插件。

## 包

- `@misakacloud/opencode-auto-model-config`
- `@misakacloud/opencode-skill-filter`
- `@misakacloud/opencode-auto-retry`

## 发布

每个包单独发布。仓库里各包 `package.json` 的 `version` 只是开发占位,不代表 npm 上的版本,发布时不必为了版本号改它或单独提交。发布版本只由 tag,或手动运行 workflow 时填写的版本决定。`.github/workflows/publish.yml` 用 OIDC 可信发布(不使用 `NPM_TOKEN`)。

### 步骤

1. 确认要发布的提交已经在 `origin/main` 历史上。
2. 打 tag,例如 `auto-retry@0.1.1`。tag 就是发布版本,不必先改包里的占位 `version`。
3. 推送该 tag:`git push origin auto-retry@0.1.1`。

也可以在 GitHub Actions 里手动运行 `publish.yml`:`package` 填 `packages/` 下的目录名,`version` 填 semver(必填,不要加 `v`)。二者会拼成 `<目录名>@<semver>`,与推送 tag 走同一套目录、semver 和目标存在校验。`dry_run` 为 true 时,只在本次 checkout 里把目标包版本写成该版本,再执行 `npm pack --dry-run`,不真正发布。

发布 job 会另一次 checkout 同一提交,用 Node 只改写目标 `package.json` 的 `version`。不运行 `npm version`,不把改动提交回仓库,也不要求 lockfile 与这个版本一致。这个 job 持有 OIDC,因此不安装项目依赖。

### tag 约定

- 格式是 `<目录名>@<semver>`。目录名是 `packages/` 下的文件夹名,不是 npm 包名。
- 示例:`auto-retry@0.1.1`、`auto-model-config@1.1.0`、`skill-filter@0.1.0`。
- 不要加 `v` 前缀。作用域包名(`@misakacloud/...`)不出现在 tag 里。
- 版本以 tag 解析结果为唯一来源,不要求等于仓库里的占位 `version`。
- 正式版本不能重复使用。同一个 semver 一旦发布,npm 会拒绝再次发布;要发新包就换一个还没用过的版本号。
- tag 指向的提交必须已经在 `origin/main` 的历史上,否则 `publish.yml` 的 `verify` 失败。
- 预发布号(版本里 semver 的 `-` 段,例如 `0.2.0-beta.1`)发布时使用 `npm publish --tag next`,不占用 `latest`。正式版使用默认的 `latest`。只出现在 `+` 构建元数据里的 `-` 仍算正式版。

### 审批

`publish` job 使用 GitHub Environment `npm-publish`。可以在仓库 Settings → Environments → `npm-publish` 里添加 Required reviewers,让真正发布前先等人批准。不创建、不配置这个 environment 也不会挡住发布。手动运行且 `dry_run` 为 true 时,若提交还不在 `main` 历史上,只会警告,不会失败。若在 npmjs 的可信发布里填写 Environment,必须是 `npm-publish`;留空则不按 environment 限制。

`verify` job 只有读权限,用 Bun 做 `bun install --frozen-lockfile`、typecheck 和 test,不申请 OIDC。`publish` job 使用 `actions/setup-node@v6` 且 `node-version` 为 24,再执行 `npm install -g npm@latest`;它不安装项目依赖,也不使用 Bun。Actions 仍沿用主版本标签(`actions/checkout@v6`、`actions/setup-node@v6`、`oven-sh/setup-bun@v2`),没有把 action 钉死到 commit SHA。后续可以把这些 action 固定到 SHA,作为加固。

### 需要你手动完成的事

- 在 npmjs.com 上为下面三个包各配置一次可信发布(Trusted Publisher)。仓库都是 `chisaato/opencode-plugins`,workflow 文件名都是 `publish.yml`:
  - `@misakacloud/opencode-auto-model-config`
  - `@misakacloud/opencode-skill-filter`
  - `@misakacloud/opencode-auto-retry`
- 已发布的 `@misakacloud/opencode-auto-model-config` 要把原来的可信发布绑定改指向新仓库(同样是 `chisaato/opencode-plugins` 的 `publish.yml`)。
- 创建 GitHub 仓库 `chisaato/opencode-plugins` 并推送本仓库。
- 迁移完成且新仓库发布确认可用后,归档旧仓库。
