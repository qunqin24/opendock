# 仪表 · opencode-go-gauge

OpenCode 侧边栏的 **Go 套餐用量面板**：5 小时 / 每周 / 每月三个窗口实时显示，外加当前会话里每个模型在这个窗口内消耗了多少配额。

> 只对 `opencode-go` provider 生效。切到其他模型时面板自动隐藏。

---

## 效果

```
Go 用量                正常
5h    ███░░░░░░░░░░░   1.9%   3h 18m
week  █░░░░░░░░░░░░░   0.7%   6h 59m
month █░░░░░░░░░░░░░   0.4%   29d 21h
────────────────────────────────
▼ 模型 · 5h 消耗 (2)
  deepseek-v4.1-flash      $0.0716
  glm-5.3-flash            $0.0006
· 所有模型共享账户额度
```

## 功能

| 功能 | 说明 |
|---|---|
| **三个窗口** | 5 小时滚动、每周、每月，百分比 + 进度条 + 重置倒计时 |
| **状态徽章** | 正常 / 接近上限（75%）/ 即将限流（90%）/ 已限流 |
| **模型消耗** | 按模型列出当前 5 小时窗口内的配额消耗，金额降序 |
| **窗口自动重置** | 窗口起点跟着接口返回的 `resetsAt` 走，重置后旧记录自动排除 |
| **跟随主题** | 颜色从当前主题派生，饱和度压到 0.28 以下 |
| **折叠记忆** | 模型区展开 / 收起状态存进宿主 KV，重启保留 |
| **失败降级** | 接口不可用时显示具体原因（key 过期 / 无订阅 / 网络），保留上次数据 |

## 安装

**npm**

```bash
opencode plugin add opencode-go-gauge
```

**本地目录**

`opencode.json`：

```jsonc
{
  "plugins": ["D:/path/to/opencode-go-gauge"]
}
```

路径必须是**目录**，OpenCode 会读目录里的 `package.json` 和 `exports["./tui"]`。

## 配置

无需配置。插件自动从 OpenCode 的凭据存储里读 `opencode-go` 的 key。

如果只想看三个窗口、不要模型列表，点一下「模型 · 5h 消耗」那一行收起即可，状态会记住。

## 数据从哪来

面板有两个数据源，按优先级降级：

| 优先级 | 来源 | 内容 |
|---|---|---|
| 1 | 宿主 `client.experimental.usage.limits()` | 三个窗口的百分比和重置时间（需要 Console 登录态） |
| 2 | `GET https://opencode.ai/console/api/go/status` | 同上，但精确到 micro-cents，用 API key 认证 |
| 3 | `GET https://opencode.ai/zen/go/v1/usage` | 同上，只有取整的百分比 |

第 2 条会读 `~/.local/share/opencode/opencode.db` 里 `credential` 表的 `opencode-go` 条目，不落任何新文件，也不打印 key。

## 模型消耗怎么算的

官方接口只给**账户级**的三个百分比，没有按模型拆分的数据。所以模型那一行来自另一个地方：

服务端 hook `session.hook("http.response")` 拦截每次 Go 请求的响应，从 SSE 最后一条 `data:` 里取 `usage.opencode.allowance`——它表示「这一笔计入了多少美元配额」。每笔记成一行 JSONL，存在：

```
~/.local/share/opencode/go-usage/ledger.jsonl
```

面板读这个账本，按当前窗口起点过滤求和。

**局限**：账本从插件第一次成功请求开始记，装插件之前的历史补不回来。

## 关于「单模型额度」

官方文档说每个模型有独立额度（月额度的 20% / 50% / 100%），但实际实现是**所有付费模型共享账户级的单一池**：

- [issue #60311](https://github.com/anomalyco/opencode/issues/60311)（open）
- [issue #54875](https://github.com/anomalyco/opencode/issues/54875)（closed）

耗尽任何一个模型的 5 小时窗口会锁住全部模型。所以面板只显示每个模型的**消耗**，不给单模型分母——那个数字目前没有意义。

## 配色

跟随主题，饱和度压到 0.28 以下（莫兰迪化）。三个语义色（success / warning / error）保持固定，因为红就是红、绿就是绿，不该随主题漂移。

## 已知限制

- **需要 OpenCode 2.2.x**（依赖 `client.experimental.usage.limits` 和 `session.hook("http.response")`）
- **只有服务端 hook 记账**：TUI 单独运行（`--standalone`）时可能收不到
- **窗口边界有短暂延迟**：`resetsAt` 过期但接口还没返回新值时，会短暂显示上一窗口的数字
- **`kind=title` 的标题生成也计入**：它确实消耗配额，所以和 Console 口径一致，但会让数字比「你主动调用模型」略高

## 开发

```bash
npm install
npm run build     # babel src -> dist
npm run typecheck # tsc --noEmit，babel 不做类型检查
npm test          # node:test，61 个用例
npm run verify    # typecheck + build + test，发版前跑这个
```

改完 `dist` 后，OpenCode 会热重载本地插件目录（不行就重启）。

## License

MIT，见 [LICENSE](./LICENSE)。
