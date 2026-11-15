# Jianmu 插件社区

[English](README.md) · **简体中文版本**

由社区维护的 Jianmu 插件集合。目录见 [`registry.json`](registry.json)，插件源码位于 [`packages/`](packages/)。

- 维护者：DamonZS · [1032428220@qq.com](mailto:1032428220@qq.com)
- 问题与提案：请使用 Jianmu 社区仓库的 Issue。
- 许可证：根目录 MIT 许可证适用于 Jianmu 编写的集合维护内容。单个插件和 vendored 组件可能另有许可证；请检查各自的 `LICENSE`、`NOTICE` 和 `THIRD-PARTY-NOTICES.md`。

## 开发要求

- 新 Jianmu 插件使用 `@jianmu-plugins/` npm scope；包名应稳定且能说明用途，并使用明确的版本号。
- 每个包提供 README，说明用途、支持平台、安装配置、所需权限、认证方式、发送给第三方的数据、限制、支持渠道以及停用/卸载方法。
- 精简并锁定依赖。不得提交凭据、令牌、私钥、个人数据、包含密钥的构建产物或本地配置。
- 仅申请功能必需的权限；明确披露遥测、网络请求、文件系统访问、子进程及后台服务行为。
- 使用服务方支持的登录和 API 流程；不得绕过访问控制、收集凭据、规避用量限制或误述服务方服务。
- 测试实际发布包并提供命令与结果；覆盖成功、错误、刷新/重试、移除及所声明的平台。不得宣称未验证的行为。
- 保持兼容性标识和用户数据稳定。包名或 provider 变更必须包含经过测试的迁移；不得静默修改 ID、存储键、环境变量或协议请求头。

## 目录收录标准

符合以下条件的插件可提交至 `registry.json`：

1. 源码公开，责任维护者可确认。
2. 包已发布且可安装，使用 `@jianmu-plugins/` scope；如需例外，须由维护者明确批准并记录原因。
3. 使用允许再分发的许可证，并有满足上述要求的用户文档。
4. 具有明确的 Jianmu 使用场景，并提供足够的测试证据供审核核心行为。
5. 注册表中的包 spec、显示名称、类型、provider ID、替换关系及中英文简介与包和源码一致。
6. 不重复已有条目，也不冒用其他发布者的包名或 provider 身份。

### 自动收录

只向 `registry.json` 添加条目、且满足以下全部条件的 PR，会由 `auto-list`
工作流自动合并，无需人工：

1. 只改动 `registry.json`，且只新增条目——不修改、不删除已有条目。
2. `bun scripts/check.mjs` 通过。
3. 新增的包已发布到 npm，可解析版本（`npm view <包> version`）。
4. PR 来自本仓库，且提交者是组织成员，或带有维护者添加的 `auto-list` 标签。

其他情况——改动 `packages/` 下的代码、修改或删除已有条目、更换 scope——一律
人工审核。插件以用户的登录凭据运行，代码与权限变化不能自动合并。GitHub 话题
自动发现不等于自动收录：在有人把它列进目录之前，它们始终标为「未审核」。

### 自动发布

合并 `packages/*/package.json` 中的版本号后，发布工作流依次运行测试、目录
检查，再执行 `scripts/publish.sh`，只发布 npm 上还没有的版本。它需要仓库
secret `NPM_TOKEN`：具有 `@jianmu-plugins` scope 发布权的 automation 令牌，
或允许绕过 2FA 的 granular 令牌。

维护者在合并前审核提案。自动检查仅验证结构，不代表安全认证。收录不等于完成安全审计，也不保证未来版本安全。Jianmu 自动发现也不代表通过审核。报告漏洞时应优先使用私密渠道，不要公开漏洞利用细节。

## 提交变更

每次提交应聚焦一个插件或紧密相关的迁移，并包含源码地址、准确包名/版本、许可证、维护者、平台支持、权限与数据处理说明、测试证据，以及对应的中英文注册表简介。涉及身份变更时，说明旧安装和用户数据如何保持兼容。

### 新增插件到目录

1. 将插件源码放入 `packages/<plugin-id>/`：执行 `bun scripts/new.mjs <插件名> --kind provider|middleware|agent|page|tools` 会生成包骨架、目录条目和测试，且能直接通过 `bun scripts/check.mjs`。随后补全实现与面向用户的 README，并保留该包自己的许可证与第三方声明。
2. 将包发布到配置的 npm registry，名称使用 `@jianmu-plugins/<package>`。发布前需要在目标仓库配置 npm trusted publisher 或发布凭据；不要从当前本地快照直接发布。
3. 在 `registry.json` 添加一条目录记录，准确填写新包 spec、显示名称、provider ID/类型，并提供 `summary.en` 和 `summary.zh`。只有由本目录维护的条目才标记 `community: true`。
4. 运行 `bun scripts/check.mjs` 和相关插件测试。在 PR 中附上测试命令及结果，并说明旧包 spec 或 metadata 的兼容情况。
5. 向 Jianmu 社区仓库提交 PR。维护者会在合并前检查源码、包身份、权限与数据行为、测试、许可证兼容性和 registry 差异。

当前源码目录是没有 Git 元数据的本地快照，不能直接提交 PR。需先把审核后的变更放入已配置的 Git 仓库；发布 npm 包与合并目录是两个独立步骤。

## 兼容性说明

如果现有宿主或已安装包依赖旧插件 metadata 和协议标识，仓库会继续保留这些兼容字段。可在旧字段旁新增 Jianmu metadata 与新包名；仅改公共包名并不会自动迁移用户已保存的插件状态。
