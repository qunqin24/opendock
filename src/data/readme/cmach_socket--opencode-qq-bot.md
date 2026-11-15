# opencode-qq-bot

把 QQ 群聊和私聊接进 OpenCode V2 的插件。通过 [NapLink](https://www.npmjs.com/package/@naplink/naplink) 连 NapCat（OneBot 11），
每个群聊或私聊对应一个 OpenCode 会话，模型用 `qq_*` 工具把回复发回聊天。

## 特点

- 群聊 / 私聊消息 → OpenCode 会话 → 模型回复 → 对应聊天
- 每个聊天固定对应一个会话：会话忙时新消息先缓存，空闲后合并成一轮再投进去；绑定写进插件存储，重启后自动沿用
- 语音自动转写、图片落盘后以文件引用进入会话、引用与合并转发展开成文本块
- 群消息进会话前先净化并标上绝对时间，群里伪造不出系统段落
- 新建会话或重启恢复时，把最近的历史消息拼进首轮提示，模型不至于对之前聊过什么一无所知
- 收藏表情（表情包）可以生成中文标签，模型按编号把表情发回聊天
- 模型失败或中断时往聊天里补一条固定提示，不会只剩一行错误日志
- 工具按角色与聊天分配：owner / 管理员全开，普通成员默认只有联网搜索、网页抓取与发消息工具；管理命令只在 owner 与管理员自己的私聊生效
- 角色设定放在机器人工作目录的 `souls/` 里，可放多份，按文件名切换，改动后下一轮立即生效

## 环境要求

- OpenCode V2（服务端插件 API）
- NapCat 已启动并开放正向 WebSocket
- bun（依赖与脚本）

## 安装

```sh
bun install
```

在 `opencode.json(c)` 里加载插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // 长时间没有会话活动时 OpenCode 会卸载插件，设为 false 就不再自动卸载
  "experimental": {
    "location_idle_timeout": false,
  },
  "plugins": [
    {
      "package": "./",
      "options": {
        // 插件选项只剩这一项：用哪个 agent 会话；留空跟随 OpenCode 默认
        "agent": "qq",
      },
    },
  ],
}
```

`package` 可以是本地路径，也可以是发布到 npm 的包名。

## 配置

配置只有一个来源：机器人工作目录下的 `config.json`。工作目录固定为
`$XDG_DATA_HOME/opencode-qq-bot/workspace`（未设置 `XDG_DATA_HOME` 时是
`~/.local/share/opencode-qq-bot/workspace`），启动时自动创建。

```json
{
  "napcat": { "url": "ws://127.0.0.1:3001", "token": "napcat-token" },
  "ownerQQ": 123456789,
  "access": { "allow": { "groups": [123456789], "users": [987654321] } }
}
```

最小模板见 [`config.example.json`](config.example.json)：复制到工作目录改名为 `config.json`，
把地址、令牌和群号换成自己的。

- 环境变量与插件选项不再是配置来源，OpenCode 插件选项里只剩 `agent`；`config.json` 不存在时插件直接报错退出。
- 字段写错会告警并回退到默认值，JSON 语法错误直接报错。
- 标「立即」的字段保存即生效，标「重启」的字段要重载插件。
- 会话的 cwd、文件工具、`AGENTS.md` 与 git 都取这个工作目录，不跟随加载插件的项目目录。
- 面板（默认开启，只监听 `127.0.0.1:7391`）可以可视化编辑这份配置，见 [docs/panel.md](docs/panel.md)。
  首次启动会在 `config.json` 里写入 `panel.token`；不想要面板就设 `panel.enabled: false`，
  令牌可以随时改值轮换，也可以用 `panel.tokenRevoked` 吊销。别把 `panel.host` 改成 `0.0.0.0`。
- 面板里还有两个独立页面：「会话覆盖」编辑 `chat-overrides.json`，「工具档案」编辑 `tool-profiles.json`，都不用手改文件。
- 日志写在 `$XDG_STATE_HOME/opencode-qq-bot/logs`，写盘前统一脱敏；`trace.*` 打开时会在同目录记录一条入站消息的完整处理链。

常用配置项：

| 字段                                        | 说明                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `ownerQQ`                                   | 所有者 QQ。管理命令只在它的私聊生效，该私聊始终放行                 |
| `admins`                                    | 管理员 QQ 列表，拥有全部工具权限；私聊还需在放行名单里              |
| `model`                                     | 使用的模型，格式 `provider/model[/variant]`；留空跟随 OpenCode 默认 |
| `napcat.url`、`napcat.token`                | NapCat 的正向 WebSocket 地址与访问令牌                              |
| `access.allow.groups`、`access.allow.users` | 放行名单。某一类为空时不响应该类的任何消息                          |
| `access.deny.groups`、`access.deny.users`   | 拒绝名单，优先于放行                                                |
| `access.allowAllWhenEmpty`                  | 打开后任何群聊与私聊都能触发机器人                                  |
| `keepAlive.enabled`                         | 周期性写回会话元数据，避免被 OpenCode 空闲卸载                      |
| `panel.enabled`、`panel.host`、`panel.port` | 配置面板，默认只监听 `127.0.0.1:7391`                               |
| `soulName`                                  | 生效的角色设定文件名，默认 `default.txt`                            |
| `reply.requirePermission`                   | 群里发消息前模型是否要先说明为什么要回复，默认开启                  |
| `events.subscribe`                          | 订阅的事件类别，默认只收消息；加上 `notice` 后通知会注入会话上下文  |

完整字段表（全部字段、默认值、生效时机与取值限制）在 [docs/configuration.md](docs/configuration.md)：
布尔值写 `true`/`false`、`1`/`0`、`yes`/`no`、`on`/`off`，数值直接写数字，未知字段会告警。

### 准入判定

放行与拒绝各有两份名单：群号与私聊 QQ 号。判定顺序：

1. owner 的私聊永远放行——管理命令只能从那里触发。
2. 命中拒绝名单就不响应，拒绝优先于放行。
3. 放行名单里写了的，只有名单里的目标会响应。
4. 某一类放行名单为空时看 `access.allowAllWhenEmpty`：`true` 放行全部，`false`（默认）全都不响应。

拒绝名单里写了 owner 时会被豁免并给出告警：owner 的私聊必须可用。

### 保活

OpenCode 按 location 统计会话活动，默认空闲 60 分钟后卸载该 location 的服务，插件随之被卸载，
NapCat 连接断开后机器人就不再响应。根治办法是在 `opencode.json(c)` 里把
`experimental.location_idle_timeout` 设为 `false`（见上面的安装片段）；插件自身还有一层
`keepAlive` 心跳兜底，心跳跑在一个不绑定 QQ 目标的专用会话上，不影响群聊会话，也不消耗模型调用。

## 工具

模型只能操作当前会话绑定的群聊或私聊，工具都带 `qq_` 前缀：

| 工具                       | 说明                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `qq_request_reply`         | 申请本轮的回复权限，必须说明为什么要回复；权限只在本轮有效                                  |
| `qq_send_message`          | 发消息。`content` 文本，`reply=false` 表示已读不回，`unlimit_length=true` 解除长度告警      |
| `qq_send_image`            | 发图片，`file` 传路径或 URL，`base64` 传 `base64://` 数据                                   |
| `qq_send_record`           | 发语音                                                                                      |
| `qq_send_sticker`          | 发收藏表情（表情包），`id` 填收藏表情编号，编号见 `qq_favorite_list` 或 `/emoji-label list` |
| `qq_favorite_list`         | 列收藏表情（表情包）的编号与标签                                                            |
| `qq_collect_sticker`       | 收藏聊天里最近收到的动画表情，`description` 填中文名字（最多 12 个字，只用文字和数字）      |
| `qq_send_forward`          | 发合并转发，`nodes` 为节点列表                                                              |
| `qq_send_poke`             | 戳一戳                                                                                      |
| `qq_delete_message`        | 撤回机器人自己发送过的消息                                                                  |
| `qq_get_group_member_info` | 查用户资料：群聊返回群名片与昵称，私聊返回昵称                                              |
| `qq_fetch_ptt_text`        | 转写当前聊天最近收到的语音                                                                  |
| `qq_get_login_info`        | 机器人自己的 QQ 号与昵称（要求当前会话已绑定 QQ 聊天）                                      |
| `qq_send_file`             | 发文件，`file` 传路径，只能发白名单目录里的普通文件；member / proactive 只能取媒体目录      |
| `qq_diary_write`           | 写日记，`content` 正文，`date` 省略即今天，`title` 标题；仅 owner 私聊                      |
| `qq_diary_read`            | 读日记，`date` 省略即最近一篇；仅 owner 私聊                                                |
| `qq_diary_list`            | 列日记，`days` 默认最近 7 篇，只列日期与标题；仅 owner 私聊                                 |

发送类工具（消息、图片、语音、收藏表情、转发、戳一戳）成功后都算本轮已回复，不会再触发补发提醒。
连续调用发送类工具会被拒绝，中间调用任意其它工具后即可再次发送。
工具只在当前聊天配置仍启用、且会话正处理 QQ 消息轮次时可用。

## 工具权限与配置档

工具按「发送者角色 + 聊天」分配，配置写在机器人工作目录的 `tool-profiles.json`
（`toolProfilesPath` 可改路径）。文件不存在时启动会把随包的示例复制过去，
里面的 `group:100` / `private:200` 是占位目标，改成自己的群和私聊才生效：

| 角色               | 使用的配置档                                   |
| ------------------ | ---------------------------------------------- |
| owner（`ownerQQ`） | `admin`                                        |
| 管理员（`admins`） | `admin`                                        |
| 其他人             | 该群 / 私聊指定的档，未指定用 `defaultProfile` |

- `allow` 就是白名单：没列出的工具一律不可用；支持 `*` 与 `qq_*` 这类通配，`deny` 优先于 `allow`。
- 普通成员的默认档只放行 `websearch`、`webfetch` 与 `qq_*`（发消息），`shell` / `write` / `read` / 子代理全部拒绝；子代理会开不受聊天约束的新会话，QQ 会话里一律拒绝。
- owner 与管理员固定用 `admin` 档，`chats` 里的群级档位只对普通成员生效；管理员私聊要收到消息，还需在 `access.allow.users` 里。
- 日记工具（`qq_diary_write` / `qq_diary_read` / `qq_diary_list`）只有 owner 能用，`qq_send_file` 对 owner / 管理员放开。
- 模型视图里 owner / 管理员的发言分别带 `(owner)` / `(admin)` 标记，模型能分清是谁在说话。

详见 [docs/configuration.md](docs/configuration.md#工具权限与配置档)。也可以在面板的「工具档案」页直接改。

## 会话覆盖

每个群 / 私聊可以单独改唤醒方式、要不要主动说话、消息收集窗口、用哪个 agent / 模型 / 角色设定，
配置写在机器人工作目录的 `chat-overrides.json`（`chatOverridesPath` 可改路径，文件不存在时启动会把随包示例复制过去）：

```json
{
  "chats": {
    "group:100": { "wake": "mention" },
    "group:200": {
      "wake": "prefix",
      "wake.prefixes": ["bot,"],
      "proactive.enabled": false,
      "collect.groupMs": 30000
    },
    "private:300": {
      "agent": "helper",
      "model": "openai/gpt-4o",
      "soulPath": "souls/helper.txt"
    }
  }
}
```

| 字段                         | 取值                                  | 说明                                         |
| ---------------------------- | ------------------------------------- | -------------------------------------------- |
| `wake`                       | `all` / `mention` / `prefix` / `none` | 群里什么时候必须回复，默认 `mention`         |
| `wake.prefixes`              | 字符串数组                            | `wake` 为 `prefix` 时的唤醒前缀，命中即必回  |
| `proactive.enabled`          | 布尔                                  | `false` 表示这个聊天不主动开口               |
| `proactive.startProbability` | 0 到 1                                | 这个聊天单次心跳的触发概率，不写时用全局公式 |
| `collect.privateMs`          | 毫秒（≥ 0）                           | 这个私聊的消息收集窗口，`0` 表示立即回复     |
| `collect.groupMs`            | 毫秒（≥ 0）                           | 这个群聊的消息收集窗口，`0` 表示立即回复     |
| `agent`                      | 字符串                                | 覆盖这个聊天使用的 OpenCode agent            |
| `model`                      | `provider/model[/variant]`            | 覆盖这个聊天使用的模型                       |
| `soulPath`                   | 文件或目录路径                        | 覆盖这个聊天使用的角色设定文件               |
| `soulName`                   | 文件名                                | 覆盖这个聊天使用的角色设定文件名             |

- 会话字段与全局配置项同名：`wake.prefixes`、`proactive.enabled`、`soulPath` / `soulName`
  在两边含义一致，没写的继续用全局值。
- `wake` 只作用于群聊，私聊永远回复：`all` 每条都必回，`mention` 被 @ 才必回，
  `prefix` 命中前缀才必回（被 @ 同样必回），`none` 这个群完全不理。
- 必回与不必回都会写进提示词，模型知道这轮该不该说话；`/status` 会列出每个聊天当前的唤醒方式与主动说话开关。
- 改完下一轮生效；单个字段写错只忽略这一项并告警，整个文件解析失败会沿用上一份。

详见 [docs/configuration.md](docs/configuration.md#会话覆盖)。也可以在面板的「会话覆盖」页直接改。

## 角色设定

角色设定文件放在机器人工作目录的 `souls/` 里（默认 `~/.local/share/opencode-qq-bot/workspace/souls/`），
一个目录里可以放多份，用 `soulName` 选生效的那份：

```
<工作目录>/souls/
  default.txt     默认角色
  白羽桃.txt      另一份角色
```

- 首次启动时插件把随包分发的默认档复制到这里；之后只读工作目录里的副本，升级插件不会覆盖你改过的设定。
- `soulPath` 可以给文件路径，也可以给目录，目录时同样用 `soulName` 选文件。
- 生效文件的内容改动会被监听，下一轮就用新设定，不需要重启插件；改 `soulName` 换角色要重载插件。

## 管理命令

同一组命令注册在 QQ 与 TUI 两边，共用一份实现；TUI 侧加 `qq-` 前缀
（`/qq-help`、`/qq-status`、`/qq-reset`、`/qq-stop`、`/qq-compact`、`/qq-tools`、`/qq-emoji-label`、`/qq-diary`）避免与内置命令冲突。
`/help` 直接由命令表生成，表情标注也在其中。
QQ 侧只在 owner 与管理员自己的私聊里生效，群里和其他人的私聊不会触发；
TUI 侧执行时结果发到该会话绑定的 QQ 聊天：

| 命令                               | 作用                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `/help`                            | 命令说明                                                                                      |
| `/status`                          | 各聊天的会话、队列与重试状态                                                                  |
| `/reset`                           | 列出放行名单里的聊天及各自的重置命令                                                          |
| `/reset group:123`                 | 打断执行中的回合并删除该聊天的会话，下一条消息重新开始；名单外目标拒绝                        |
| `/stop`                            | 打断所有正在执行的回合并丢掉排队消息，会话与历史保留                                          |
| `/stop group:123`                  | 只打断指定聊天的回合；名单外目标拒绝                                                          |
| `/compact`                         | 列出可以压缩上下文的聊天                                                                      |
| `/compact group:123`               | 让上游压缩该聊天的上下文；聊天正在执行时先 `/stop` 再压缩                                     |
| `/tools [group:123]`               | 查看各聊天使用的配置档与可用工具                                                              |
| `/emoji-label [all\|inc\|list]`    | 给收藏表情生成中文标签（TUI 侧是 `/qq-emoji-label`）                                          |
| `/diary [write\|list\|show\|auto]` | 日记：写一篇、列出最近几篇、看某天的日记、生成当天总结；仅 owner 私聊（TUI 侧是 `/qq-diary`） |

## 收藏表情（表情包）

给 QQ 收藏表情起中文标签，之后模型按**编号**把表情发回聊天。

```
/emoji-label all     重新标注全部收藏表情
/emoji-label inc     只标注还没有标签的收藏表情
/emoji-label list    列出收藏表情的编号与标签
```

- 编号只是发图片的句柄，由插件自己维护（从 1 开始，保存在插件存储里）；模型用 `qq_send_sticker` 的 `id` 按编号发送，不做标签模糊匹配。
- 标签由模型看图生成：清洗后是 12 个字以内、不带标点的中文短语，例如「猫猫摊手」；标签写在 NapCat 侧的 `desc` 字段里，插件不保存副本。
- 命令没有 TUI 回显，结果全部通过 QQ 消息发出。
- 模型还能用 `qq_collect_sticker` 收藏群里别人发的动画表情。

详见 [docs/emoji.md](docs/emoji.md)。

## 日记

把聊天的流水记成一篇篇 Markdown 日记，主人可以直接读到、发给模型读，也能在每天结束时自动总结一篇。

```
/diary write 今天群里在聊新版本发布      写一篇日记
/diary write 2026-11-09 补一篇昨天的      按指定日期写
/diary list                              列出最近 7 篇
/diary list 30                           列出最近 30 篇
/diary show 2026-11-10                   看某天的日记
/diary auto                              立刻把今天的素材总结成一篇
```

- 日记是文件，不是数据库里的条目：默认放在机器人工作目录的 `diary/` 下，文件名是日期（`private-200/2026-11-10.md`）。
- 日记范围固定为 **owner 自己的私聊**：群聊与 admin 的私聊都不采集、不生成、不推送。
- 成品不设条数上限，也不会自动清理；只有中间产物（原始素材）按 `diary.retentionDays` 过期清理。
- `show` 会把日记文件本身作为附件发出来，自动总结也用同样的方式推送。
- 日记功能默认开启，关掉用 `diary.enabled=false`。

详见 [docs/diary.md](docs/diary.md)。

## 行为

- **回复是强制的**：系统提示要求模型每轮至少调用一个发送类工具，直接输出的文字会被丢弃。
- **发消息前先说明理由**：群里默认不给模型发送权限，要回复必须先调用 `qq_request_reply`
  说明为什么要回复，拿到权限后才能发送；权限只在本轮有效。私聊默认开放，不用申请。
  关闭 `reply.requirePermission` 后模型可以直接发消息。
- **被 @ 才必须回**：群里没被 @ 时模型可以调用 `qq_send_message` 并设 `reply=false` 选择已读不回；私聊消息必须回复。
  每个群可以用会话覆盖改这条规则（每条必回 / 前缀必回 / 完全不理）。
- **消息合并**：会话正在跑模型时新到的消息进缓存，会话空闲后合并成一轮再投进去；同一聊天的消息按到达顺序处理。
- **消息收集窗口**：收到消息不立刻回复，先开一个窗口攒着，私聊默认 10 秒、群聊默认 60 秒，
  到点后合并成一轮发出去；`collect.privateMs` / `collect.groupMs` 可改，会话覆盖里也能单独调。
- **单实例消费**：同一台机器上只允许一个插件实例连接 NapCat 接收消息，其余实例不连接并等待接管，
  避免同一条 QQ 消息被重复投递给模型。
- **异常恢复**：模型失败、中断或长时间无响应时会释放忙碌状态并放行缓存消息。
- **保活**：默认每 20 分钟写回一次会话元数据，OpenCode 不会因为长时间没有会话活动而卸载插件。
- **提醒**：模型一轮完全没调用任何发送工具时，插件会补一条合成消息提醒它，最多 `reminder.max` 次。
- **主动说话**：聊天沉默超过阈值后按每小时概率发起话题；放行名单为空时一个都不主动开口，
  主动轮次按 `proactive` 角色执行，不会拿到管理档的全工具权限。
- **图片**：远端图片下载到受控临时目录后以 `file:` 引用进入提示，单张不超过 5MB、
  单轮最多 8 张、总量不超过 16MB，超出的图片只保留 `[图片]` 占位文本。
- **出站文本**：模型写的 markdown 会先剥成纯文本再发出去，超长消息按字素簇切分，不会把 emoji 序列切坏。
- **出站限流**：出站消息按目标（群 / 私聊）分别计数限速，超限会拒绝这次发送。
- **敏感拦截**：发给 QQ 的消息发送前会扫一遍凭证，命中就整条拦下，不发送。
- **入站净化**：群友可控的文本进模型前先净化（换行压成空格、零宽字符清掉、结构标签换成全角），
  每条消息标上绝对时间与角色标记，群里伪造不出系统段落。

## 扩展能力（可选）：SnowLuma MCP

`qq_*` 只覆盖对话必需的几个动作。群资料、成员管理、消息记录等其余 OneBot 动作可以交给
[@snowluma/mcp](https://www.npmjs.com/package/@snowluma/mcp)，插件不依赖它，也不自动加载，
需要你在 `opencode.json(c)` 里自行配置：

```jsonc
{
  "mcp": {
    "snowluma": {
      "type": "local",
      "command": ["npx", "-y", "@snowluma/mcp"],
      "enabled": true,
      "environment": {
        // OneBot HTTP 接口，不是插件使用的 WebSocket 地址
        "SNOWLUMA_MCP_ENDPOINT": "http://127.0.0.1:3000/",
        "SNOWLUMA_MCP_TOKEN": "",
        // 尽量保持 read 模式，避免模型绕过聊天绑定直接发消息
        "SNOWLUMA_MCP_MODE": "read",
      },
    },
  },
}
```

- `read` 模式只暴露只读动作，改成 `write` 后模型可以调用任意动作，届时它可能绕过聊天绑定和 `qq_*` 的发送记账直接发消息。
- `SNOWLUMA_MCP_ENDPOINT` 指向 NapCat 的 HTTP 接口，需要在 NapCat 里一并开启 HTTP 服务。
- [@snowluma/mcp](https://www.npmjs.com/package/@snowluma/mcp) 采用源码可见的非商业许可，
  本项目不分发、也不打包它，安装与许可合规由使用者自行负责。

## 文档

- [docs/configuration.md](docs/configuration.md)：全部配置字段、取值规则与限制
- [docs/panel.md](docs/panel.md)：配置中心与状态面板
- [docs/emoji.md](docs/emoji.md)：收藏表情（表情包）
- [docs/diary.md](docs/diary.md)：日记功能
- [docs/known-issues.md](docs/known-issues.md)：已知问题
- [docs/security-baseline.md](docs/security-baseline.md)：信任边界、数据流与不变量清单

## 开发

```sh
bun run typecheck     # tsc --noEmit
bun run lint          # eslint .
bun run test          # vitest run
bun run format        # prettier --write .
bun run format:check  # prettier --check .
bun run ci            # 上面四道门禁一次跑完
```

CI 在 `.github/workflows/ci.yml`，推 `main` 与 PR 都会跑同一套门禁，另加依赖漏洞扫描与
许可证 / NOTICE 一致性检查。发布走 tag：推 `v<version>` 后由 `.github/workflows/release.yml`
发布到 npm 并创建 GitHub Release，流程见 [docs/release.md](docs/release.md)。

漏洞请走私密上报（[SECURITY.md](SECURITY.md)），不要开公开 issue。

## License

[CC BY-NC-SA 4.0](./LICENSE)

第三方依赖的版权声明与许可文本见 [NOTICE](./NOTICE)。
