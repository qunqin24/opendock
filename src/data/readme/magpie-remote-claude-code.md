# Magpie for OpenCode

[![CI](https://github.com/yee94/opencode-magpie-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/yee94/opencode-magpie-plugin/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-magpie-plugin)](https://www.npmjs.com/package/opencode-magpie-plugin)

**让 Magpie 里的模型在 OpenCode 中更好用。**

[Magpie](https://usemagpie.ai/) 负责连接各家服务、管理账号和转发请求；[OpenCode](https://opencode.ai/) 负责对话、代码和工具执行。
这个项目围绕两者一起使用时遇到的问题，补齐默认／官方接入方式之外的模型呈现、价格信息和特定渠道兼容需求。它不是另一个模型网关，也不接管 Magpie 的账号登录。

## 它解决什么问题？

### 模型接上了，但在 OpenCode 里还不好用

在 Magpie 里添加服务、调整路由组之后，你希望 OpenCode 跟着更新，而不是再手工维护一份模型配置。模型多了以后，也需要看清它来自哪个服务、有什么能力、费用如何估算。

**`opencode-magpie-plugin` 解决 OpenCode 这一侧的接入和呈现：**

- **模型列表自动更新**：从 Magpie 发现模型，启动后每 30 秒刷新，不必逐个填写 `providers.models`。
- **服务和路由组分得清**：Cursor、WorkBuddy、路由组分别展示；远程网关中的嵌套来源也能保留层级。
- **能力和价格带进来**：传递上下文限制、思考档位和 Fast 能力，补充输入、输出及缓存价格，用于 OpenCode 的费用估算。
- **本机、远程都能接**：支持本机网关启动和远程 API 地址，不需要把上游服务的登录凭据搬到 OpenCode。
- **生图单独用工具**：提供 `image_list`、`image_gen`，而不是把图片模型混进聊天模型列表。

### Claude 订阅能连上，但 OpenCode 的请求被拒绝

另一类问题不在模型列表，而在请求本身：OpenCode 经 Magpie 使用 **Claude Code 订阅渠道**时，附加的第三方 Agent 指令可能被拒绝，Magpie 随后会从 TUI 回退到 `claude -p`。

**`magpie-claude-opencode-adapter` 是针对这条链路的实验性适配器：**

- 在 Magpie 将请求交给 Claude Code 前，把 OpenCode 的 system 指令移到首条 user 消息。
- 将固定的 OpenCode 身份句改为中性编码助手描述，不替换成其他产品品牌。
- 保留工具定义、工具调用和结果回传，继续使用 Magpie 已有的 MCP 桥接。
- **只处理 Claude Code 订阅渠道**。Anthropic API Key、Cursor / WorkBuddy 上的 Claude 模型和其他 provider 原样通过。

它用于验证和改善这类兼容问题，**不是“保证绕过拒绝”或“保证节省额度”的工具**。指令位置变化会影响优先级和缓存，是否保持 TUI 必须看完整请求日志。

## 我该装哪个？

| 你的需求 | 使用哪个包 | 装在哪里 |
| --- | --- | --- |
| 在 OpenCode 中使用 Magpie 的模型，自动同步列表、分组、能力和价格 | [`opencode-magpie-plugin`](packages/opencode-magpie-plugin/README.md) | 运行 OpenCode 服务的机器 |
| 排查 OpenCode → Magpie → Claude Code 订阅的 TUI 拒绝／回退问题 | [`magpie-claude-opencode-adapter`](packages/magpie-claude-opencode-adapter/README.md) | 实际运行 Claude Code 订阅桥接的 Magpie 机器 |

**普通接入只装第一个。** 两个包独立安装，第二个不会随第一个自动启用。
如果 Magpie 自带的接入已经满足你的使用需求，也不必额外安装本项目。

## 先把 Magpie 模型用起来

前提：已在 Magpie 中配置好需要的服务，且 OpenCode 服务能访问它的网关。本插件面向 **OpenCode V2**。

在 OpenCode 的 `opencode.jsonc` 中加入：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-magpie-plugin"]
}
```

加载插件后，在 `/plugins` 查看 `magpie.providers`，再到 `/models` 选择对应服务或路由组的模型。

- [远程网关、分组和排序配置](packages/opencode-magpie-plugin/README.md)
- [模型价格与费用估算说明](packages/opencode-magpie-plugin/README.md#价格与费用统计)
- [Claude Code 订阅适配器：安装、匹配范围和 TUI 诊断](packages/magpie-claude-opencode-adapter/README.md)

**发布状态：**`opencode-magpie-plugin` 已发布到 [npm](https://www.npmjs.com/package/opencode-magpie-plugin)。
`magpie-claude-opencode-adapter` 已发布到 npm，请按其文档安装 `0.1.1` 或更新版本；它仍处于实验验证阶段。

## 和 Magpie 自带接入是什么关系？

Magpie 已经提供 OpenCode 接入。本项目不是用来替代它，而是把实际使用中需要的扩展做成可独立安装的插件：

- **Magpie 继续负责**账号、服务、路由、协议转换和 Claude Code 进程。
- **OpenCode 插件负责**动态读取这些能力，并控制它们在 OpenCode 中如何展示和使用。
- **Claude 适配器只负责**特定订阅渠道的请求改写，不给其他 provider 加上同一套处理。

各版本自带接入的能力会变化；是否需要这些扩展，应以你的实际需求为准。这个仓库是独立集成项目，不是 Magpie 或 OpenCode 官方插件。

---

## 参与开发

仓库采用 pnpm monorepo；根目录仅放共享工具，不发布业务包：

```text
packages/opencode-magpie-plugin/   # OpenCode 模型接入插件
packages/magpie-claude-opencode-adapter/  # Claude Code 订阅渠道适配器
```

```sh
pnpm install --frozen-lockfile
pnpm check                 # 两包及共享工具的完整检查
pnpm check:opencode        # 只检查模型接入插件
pnpm check:adapter         # 只检查订阅适配器
```

两包分别拥有源码、测试、版本和打包清单，互不依赖，均无运行时 npm 依赖。CI 分包检查；CD 可一次选择 `all` 发布两个独立产物，也可单独发布，失败互不取消。
发布、凭据要求和恢复步骤见 [维护者发布指南](docs/releasing.md)。
