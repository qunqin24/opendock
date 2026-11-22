# effort-discovery

探测「你的网关到底接受哪些 reasoning effort 档位」，并把结果接到各个 AI CLI —— 让每个工具只展示模型真正支持的档位，而不是猜。

```
packages/core          @tscgoods/effort-discovery-core           共享探测/目录/缓存 + CLI
packages/opencode      @tscgoods/opencode-effort-discovery       OpenCode 插件
packages/claude-code   @tscgoods/claude-code-effort-discovery    Claude Code 插件
packages/codex         @tscgoods/codex-effort-discovery          Codex CLI 插件
packages/dsh           @tscgoods/dsh-effort-discovery            DeepSeek Harness 插件 bundle
packages/antigravity   @tscgoods/antigravity-effort-discovery    Antigravity CLI 插件
```

## 为什么

OpenCode 的档位来自 models.dev，自定义网关没有元数据就退回默认的 `low/medium/high`（缺 `max`，多了没用的 `medium`）。Claude Code / Codex / agy 则各有自己的枚举，但网关认不认是另一回事。

大多数网关会校验 `reasoning_effort`，并把合法值写进错误信息：

```
level "x" not supported, valid levels: none, low, high, max
unknown variant `x`, expected one of `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`
```

本项目就发一个带非法值的 `max_tokens: 1` 请求，把这段回显变成每个宿主的档位配置。探测不到就**不猜、不改**。

## 共享配置

所有宿主共用一个文件（`EFFORT_DISCOVERY_CONFIG` 可覆盖）：

```jsonc
// ~/.config/effort-discovery.json
{
  "providers": {
    "ts-dpsk": {
      "api": "openai",
      "baseURL": "https://ai-api.transcircle.org/v1",
      "apiKey": "!type %USERPROFILE%\\.secrets\\dpsk.key",
      "models": ["deepseek-v4.1-flash", "gpt-6.1-terra"]
    },
    "claude-proxy": {
      "api": "anthropic",
      "baseURL": "http://127.0.0.1:7891",
      "apiKey": "{env:ANTHROPIC_AUTH_TOKEN}",
      "models": ["ccs-claude-newapi--deepseek-v4.1-flash-1017[1m]"]
    }
  }
}
```

`apiKey` 支持明文、`{env:NAME}`、`!command` 三种写法。缓存默认在 `~/.cache/effort-discovery/`。

## 快速开始

```bash
npx @tscgoods/effort-discovery-core providers
npx @tscgoods/effort-discovery-core probe --provider ts-dpsk --json
```

| 宿主 | 安装 | 效果 |
| --- | --- | --- |
| OpenCode | `"plugins": [{ "package": "@tscgoods/opencode-effort-discovery" }]` | 模型 variant 精确等于实测档位 |
| Claude Code | `claude --plugin-dir <pkg>` 或 marketplace | `/effort-discovery:probe-effort`、`apply-effort`，会话注入档位 |
| Codex | `codex plugin marketplace add …` + `codex plugin add` | 探测并生成 `model_catalog_json`，菜单只留实测档位 |
| DeepSeek Harness | `dsh plugin --profile web add @tscgoods/dsh-effort-discovery` | 收窄 `llm-pi-ai` 的 `reasoningEfforts` |
| Antigravity | `agy plugin install ./packages/antigravity` | 注入档位 + `/effort-probe` 技能 + 不支持档位提醒 |

各宿主的能力边界不同（有的能直接改菜单，有的只能报告），以各包 README 为准。

## 开发

```bash
npm install
node --test packages/core/test/*.test.js
node packages/core/src/cli.js probe --provider <id> --json
```

## 发布

见 [RELEASING.md](./RELEASING.md)：推 `vX.Y.Z` tag，CI 发布同版本的所有包并创建 GitHub Release。npm 包都发布在 `@tscgoods` scope。

## 许可

MIT