# opencode-qq-notify

把 [OpenCode](https://opencode.ai) 的关键节点实时推送到 **QQ 官方机器人 C2C 私聊**, 并支持在 QQ 里**点卡片按钮完成审批**。
节点检测架构复刻自 [opencode-notifier](https://github.com/mohak34/opencode-notifier) (MIT):
事件总线订阅 → 事件 id 去重(LRU 2048) → idle 抖动合流 → 错误墓碑 → 权限延迟回核。

推送渠道: QQ 开放平台 REST `/v2/users/{openid}/messages`; 审批通道: 插件内常驻 QQ WebSocket 网关。

## 功能

| 节点 | 说明 |
|---|---|
| ✅ complete | 会话完成(标题/项目/模型/用时), 同会话短窗去重 |
| 🔁 子任务完成 | 子会话完成 + 父会话名 |
| ⚠️ error | 会话出错提醒(用户主动中断跳过) |
| 🔐 权限审批卡片 | markdown 卡片 + 批准/拒绝/一直批准/忽略按钮, 点击真实执行 `permission.reply` |
| ❓ question | Agent 向用户提问时推送 |

特色:

- **零依赖**: 纯 TypeScript 默认导出, 无需 `@opencode/plugin` 别名, 拷进插件目录即用
- **延迟回核**: 权限请求先等 N 秒回核 `permission.list`, 已被 autoaccept 瞬批的不打扰
- **重试风暴免疫**: agent 重试 ask 会换新 requestID, 同会话/同动作/同资源复用同一编号且只推一张卡(点旧卡按钮批准的是最新请求)
- **动作静音**: `permissionSilence` 里列出的动作完全不推送(如 `external_directory`)
- **卡片审批**: QQ 客户端点按钮 → `INTERACTION_CREATE` 回调 → 自动 `PUT /interactions/{id}` 响应 → 进程内执行审批, 全程无需开 TUI
- **文字指令兜底**: 私聊回复 `#1042 批准` 亦等效
- 单例去重 + 位置归属, 多实例/热重载不会重复推送

## 安装

```sh
# 1. 拷贝插件到全局插件目录
mkdir -p ~/.config/opencode/plugins/qq-notify
cp index.ts ~/.config/opencode/plugins/qq-notify/

# 2. 建选项文件(不会被仓库收录, 内含 secret)
#    参考下方「config 选项一览」三步填写 appId / clientSecret / openid
```

选项文件位于 `~/.config/opencode/qq-notify.jsonc`, 三个凭据占位符填好即启用;
也可用环境变量覆盖: `QQ_BOT_APPID` / `QQ_BOT_CLIENT_SECRET` / `QQ_BOT_C2C_OPENID`。

获取 openid: 在本仓库/插件目录跑 `node probe-openid.mjs` 挂着, 用 QQ 给机器人发一条私聊消息, 打印出的 `user_openid` 即是; 再用 `node send-test.mjs` 验证链路。

## 从包管理器安装(可选)

发布通道: GitHub Release → 双注册表发布 (npmjs.com 走 OIDC 信任发布, 参照 [dsh-composer-keys](https://github.com/zlqd123/dsh-composer-keys) 的发布工作流; GitHub Packages 走 GITHUB_TOKEN)。

```sh
# npmjs.com(推荐, 免任何 token 配置)
opencode plugin add @zlqd123/opencode-qq-notify

# 直接从 GitHub 安装(不走 npm)
opencode plugin add github:zlqd123/opencode-qq-notify

# GitHub Packages: 消费者需先给 @zlqd123 scope 配 token
# echo "//npm.pkg.github.com/:_authToken=<GH PAT packages:read>" >> ~/.npmrc
# npm config set @zlqd123:registry https://npm.pkg.github.com
```

## 适配的运行时事实(v2.0.22-zhcn.1 实测)

- 事件流载体是 `event.data`(**不是** SDK 类型文档写的 `event.properties`)
- 完成节点事件: `session.execution.started` (busy) / `session.execution.succeeded` (complete), `data.sessionID` 为空时事件不可归属
- 无 `session.created`, 会话标题来自自动改名/`ctx.session.get`, 其目录在 `location.directory` 字段
- 运行时 ctx 有 `event/permission/session` 域但 `@opencode/plugin` 别名**不存在**, 插件为纯默认导出零依赖
- defaultProvider 事件名前缀匹配过滤: 只处理 session.execution / session.inbox / permission / question


## 你需要填的(手填部分)

在 `qq-notify.jsonc` 里替换三个 `"在此填入…"` 占位符:

| 字段 | 说明 | 从哪拿 |
|---|---|---|
| `appId` | 机器人 AppID | [q.qq.com](https://q.qq.com) 机器人管理页 |
| `clientSecret` | App 密钥 | 同上(需管理员权限) |
| `openid` | 接收通知的**用户 openid**(C2C) | 见下方「获取 openid」 |

也可用环境变量覆盖: `QQ_BOT_APPID` / `QQ_BOT_CLIENT_SECRET` / `QQ_BOT_C2C_OPENID`。
**建议 secret 走环境变量, 不落盘。** `debug: true` 时节点/发送明细写入 `~/.config/opencode/qq-notify.log`, 排查完可改 `false`。

## 获取 openid

openid 是「机器人 × 用户」一对一的 id, 必须先有交互记录才有:

1. 沙箱环境已建好后 `node probe-openid.mjs` 挂着(在本目录运行)
2. 用 QQ 给机器人发一条**私聊消息**(或在测试群里 @它 → 得到的是 group_openid, 测 c2c 要私聊)
3. probe 打印 `user_openid=xxx`, 填入 `qq-notify.jsonc`
4. 验证: `node send-test.mjs`, QQ 收到消息即打通

## 通知的事件节点

| 节点 | 触发源 | 内容 |
|---|---|---|
| ✅ complete | `session.idle`(抖动合流; busy 立即撤销) | 会话标题/项目/模型/用时 |
| 🔁 子任务完成 | 有 `parentID` 的子会话 idle | 子会话 + 父会话 |
| ⚠️ error | `session.error`(用户主动中断跳过, 且墓碑抑制随后的 idle) | 错误摘要 |
| 🔐 permission 卡片 | `permission.v2.asked`, 延迟 `permissionWaitMs` 后回核 `permission.list` 仍 pending 才推; 回复即撤销 | 卡片: 动作/对象 + 批准/拒绝按钮 |
| ❓ question | `question.v2.asked` | 问题 + 选项标签 |

## QQ 卡片审批(实测可用的工作流)

权限类通知不是纯文本, 而是 **markdown 卡片 + 内嵌回调按钮**(msg_type=2, 实测本 bot 无需 markdown 资质即可发):

```
🔐 OpenCode 权限审批 #1042
> 会话: 合并微博与B站监控…   > 项目: weibo2
> 动作: external_directory   > 对象: E:/Down/pa/weibo2/*
[批准(仅本次)] [拒绝]
[一直批准(带二次确认弹窗)] [忽略]
```

1. 后台 ask → 等 `permissionWaitMs`(默认 5s) → `permission.list` 回核**仍 pending** 才推卡片
   (`autoaccept` 模式下被瞬间批准的请求不会打扰你)
2. 你在 QQ 里点按钮 → QQ 推 `INTERACTION_CREATE` → 插件调 `PUT /interactions/{id} {code:0}` 响应
   (**不调客户端会报「请求第三方失败」**, 响应时限 3s)
3. 插件在进程内调 `ctx.permission.reply({sessionID, requestID, reply})` 真正批准/拒绝
4. 回你一条确认消息: `✅ 已批准(仅本次) #1042 · external_directory`

文字指令兜底(私聊里发): `#1042 批准` / `#1042 拒绝` / `#1042 always` / `#1042 忽略`。
登记簿 10 分钟过期; 同一 requestID 复用同一编号, 不会重复计号。

## 实测的 QQ 平台 API 事实(2026-10)

| 事实 | 值 |
|---|---|
| token | `POST bots.qq.com/app/getAppAccessToken`, 返回 **snake_case** `access_token`/`expires_in` |
| 认证头 | `Authorization: QQBot <token>` |
| C2C 发送 | `POST api.sgroup.qq.com/v2/users/{openid}/messages`; body **不带 `event_id`**(主动消息带它反而 400/40034025) |
| 卡片消息 | `msg_type:2` + `markdown:{content}` + `keyboard:{content:{rows}}` 同体发送 HTTP 200(个人 bot 实测可行) |
| 按钮 | `action.type=1` 回调按钮; `permission.type=2` + `specify_user_ids` 白名单 |
| 事件 intents | `GROUP_AND_C2C_EVENT = 1<<25`, **`INTERACTION = 1<<26`**(不是 1<<10, 那是频道表态) |
| WS identify | `op2 {token:"QQBot "+token, intents, shard:[0,1]}`; op10 下发心跳间隔, op1 心跳, op11 ack |
| 互动响应 | `PUT /interactions/{id}`(id=`d.id`, 无前缀) body `{"code":0}`, 超时 3s, 同 id 只能响应一次 |
| 回调形状 | `d.data.resolved.button_data` / `d.data.resolved.button_id`, `d.user_openid`, `d.scene="c2c"` |

## config 选项一览

```jsonc title="qq-notify.jsonc"
{
  "appId": "…",
  "clientSecret": "…",
  "openid": "…",
  "sandbox": false,          // true → sandbox.api.sgroup.qq.com
  "debug": true,             // 日志细节写入 ~/.config/opencode/qq-notify.log
  "events": { "complete": true, "error": true, "permission": true, "question": true },
  "minDuration": 0,          // 秒; 会话从 busy 到 idle 短于此则不发 complete
  "idleDelayMs": 300,        // complete 抖动合流时长; 短命 run 进程建议 ≤300
  "permissionWaitMs": 5000,  // 权限通知延迟回核毫秒; 仍 pending(autoaccept 没接住)才推卡片
  "permissionSilence": [],   // 这些动作完全不推送, 例: ["external_directory"]
  "cardInbound": true,       // false → 不开 WS 网关(收不到按钮/文字审批)
  "cardFallback": true,      // 卡片被拒(资质/额度)时降级纯文本
  "onlyProjects": [],        // 目录前缀过滤, 空=全部项目
  "proxy": ""                // 如 http://127.0.0.1:7890 (Bun 生效; 留空走环境变量)
}
```

## 限制与注意(重要)

1. **C2C 主动消息有额度**: 机器人主动发起的私聊消息受平台配额(与机器人资质/等级相关)。插件已尽力省额度:
   权限通知延迟回核(瞬批不推)、complete 短窗去重、卡片失败才降级纯文本。
2. **审批按钮依赖 WS 网关在线**: `cardInbound: true`(默认) 时插件常驻一条 QQ WebSocket。
   若网关断连(见日志 `网关关闭, 5s 后重连`), 期间点击按钮 QQ 界面会报「请求第三方失败」。
3. **互动响应时限 3s**: 插件先 ack 后处理审批, 正常无感; 若日志见 `互动响应 失败` 检查代理。
4. **沙箱先行**: `sandbox: true` 走沙箱(不隔离 token 接口)。
5. **token**: `getAppAccessToken` 自动获取/过期刷新/401 重试, 内存缓存, 不落盘。
6. **代理**: `options.proxy` 或环境变量 `HTTPS_PROXY` 设置为 `http://127.0.0.1:7890` 格式。

## 验证与排查

```sh
# 插件日志(节点识别/发送成败全在这里)
tail -f ~/.config/opencode/qq-notify.log

# 手动跑测试发送(填好凭据后)
node ~/.config/opencode/plugins/qq-notify/send-test.mjs

# 拿 openid
node ~/.config/opencode/plugins/qq-notify/probe-openid.mjs
```

改完配置/插件后热重载会自动加载新文件, 想彻底生效可 `opencode service restart`。

## 文件

- `index.ts` 插件本体(节点检测 + QQ REST 客户端 + WebSocket 审批网关)
- `send-test.mjs` 单独验证推送链路
- `probe-openid.mjs` WebSocket 探针拿 openid

## License

MIT — 卡片/状态机思路来自 [opencode-notifier](https://github.com/mohak34/opencode-notifier)。
