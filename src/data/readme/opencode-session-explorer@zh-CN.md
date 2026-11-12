# opencode-session-explorer

[English](README.md) | [简体中文](README.zh-CN.md)

本地只读的 OpenCode 会话检索与阅读工具：一个网页界面 + 三个 agent 工具。

对 `opencode.db` 永远只读打开，搜索走独立的侧车索引库，绝不改写会话数据。

![会话转录](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/transcript.zh.png)

*转录视图：按时间正序阅读，思考过程与工具调用已展开，顶部是按天时间轴。*

![全库搜索](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/search.png)

*全库搜索：覆盖正文、思考过程与工具输出，点击直接跳到命中位置。*

![会话信息](https://raw.githubusercontent.com/williamwang2013/opencode-session-explorer/main/docs/screenshots/session-info.png)

*会话信息：花费、Token 分项、内容构成与该会话的待办清单。*

## 为什么

OpenCode 把每次会话都留在磁盘上，但会话一多就基本没法用了：

- 三周前解决过某个问题，现在只想找回那一次（且要能搜到工具输出和思考过程，不只是标题）；
- 想知道自己到底发过哪些指令，而不是在几千条助手回复里翻；
- 想给领导交一份"这周做了什么"；
- 想把一段对话导出来提 issue、贴 wiki、或者留档。

这个插件补的就是这一层。

## 功能

**会话列表**：按标题 / 目录 / 会话 ID 搜索，起止日期、正倒序、仅主会话、按工作目录过滤。

**转录**：默认从**最新一条**开始加载，向下滚动自动加载更早内容；顶部按天时间轴可直接跳到某天；「只看提问」隐藏助手回复；思考过程与工具调用默认折叠；页内关键词高亮 + 上一个/下一个。

**会话信息**：消息数与片段数、本会话花费（含子会话）、模型/Agent/版本、Token 分项（输入/输出/推理/缓存读/缓存写）、按天分布、子代理派生的子会话、以及该会话最后一次的待办清单。

**全库搜索**：覆盖正文、思考过程、工具输出、附件名。点结果直接跳到对应位置并闪烁标记。

**统计**：按日期 / 工作目录 / 模型统计会话数、消息数、Token 与花费。

**导出**：Markdown、纯文本、JSON，以及**工作任务报告**——只取你发出的指令，按日期归集成 `日期：… / 任务N：…`，自动过滤自动续跑提示与重复内容，写周报直接用。

**Agent 工具**

| 工具 | 作用 |
| --- | --- |
| `session_search` | 全库搜索，返回会话、时间戳与上下文片段 |
| `session_report` | 生成指定日期范围的工作报告并保存为 Markdown |
| `session_explorer` | 打开网页界面，可直接定位到某个会话、某个时间点 |

## 环境要求

- **OpenCode** 1.18.29+ 或 2.x（入口用 V2 的 `{ id, setup }` 定义形式，同时能被 V1 的对象入口加载）。
- **Python 3.9+**，SQLite 3.34+（需要 FTS5 `trigram`）。**只用标准库**，不装任何第三方包。
- **Node 18.17+**（只用于跑插件外壳与可选 CLI，用 OpenCode 自带的运行时也可以）。
- Windows / macOS / Linux 均可。Windows 优先用 `pythonw`，不会弹黑窗口。

Python 是硬依赖，也是它比纯 JS 插件难装的原因：CJK 搜索要靠 SQLite FTS5 的 `trigram` 分词，而 Python 标准库直接就能用。

## 安装

```sh
opencode plugin add opencode-session-explorer
```

或手工写进 `opencode.json(c)`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-explorer"]
}
```

带参数：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-session-explorer",
      "options": { "lang": "zh", "port": 8717 }
    }
  ]
}
```

重启 OpenCode（或重新加载插件）后让 agent 打开浏览器，也可以直接跑 CLI：

```sh
npx opencode-session-explorer
```

它会打印地址并打开浏览器。页面用完关掉即可——服务是后台常驻进程，重启电脑或手动结束进程才会退出。

## 参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `lang` | 系统区域 | `"en"` 或 `"zh"`，影响工具输出、导出报告与界面初始语言 |
| `port` | `8717` | HTTP 端口，只监听本机回环地址 |
| `host` | `127.0.0.1` | 绑定地址 |
| `home` | 见下 | 数据目录（索引、报告、`config.json`） |
| `token` | 读 `config.json` | 访问令牌，见「安全」 |
| `python` | 自动探测 | 解释器（`python3` / `python` / `py -3`） |
| `open` | `true` | 调用 `session_explorer` 时是否自动开浏览器 |

对应环境变量：`SESSION_EXPLORER_LANG`、`SESSION_EXPLORER_PORT`、`SESSION_EXPLORER_HOST`、`SESSION_EXPLORER_HOME`、`SESSION_EXPLORER_URL`、`SESSION_EXPLORER_PYTHON`、`OPENCODE_DATA_DIR`、`XDG_DATA_HOME`。

## 文件位置

| 内容 | 位置 |
| --- | --- |
| 侧车索引 | `<home>/index/session-index.db`（可随时删除，会自动重建） |
| 工作报告 | `<home>/reports/` |
| 访问令牌 | `<home>/config.json` |
| opencode 数据库（只读） | `~/.local/share/opencode/opencode.db` |

`<home>` 默认 `~/.local/share/opencode-session-explorer`（或 `$XDG_DATA_HOME/opencode-session-explorer`）。如果检测到旧版目录 `~/.config/opencode/session-explorer`，会继续用它，老索引和令牌都不用迁移。

## 多语言

`src/i18n/en.json` 与 `src/i18n/zh.json` 是所有用户可见文案的唯一来源：网页界面、工具描述与工具返回值、服务端渲染的报告标题都从这里取。

- 服务端选语言顺序：`lang` 参数 → `SESSION_EXPLORER_LANG` → 系统区域。
- 网页会同时注入两份字典，点 `中文` / `EN` 可即时切换，并保留当前会话与 `?lang=` 参数。
- 加一门语言 = 加一个 JSON 文件 + 在 Python 与 JS 的 `SUPPORTED_LANGS` 里登记。两份字典键不一致时，检查脚本会直接报错。

工具描述故意跟随模型输入语言：它们会被 agent 分词，混用语言既费 token 又影响工具选择。报告和界面文案则完全本地化。

注意：工作报告按**本机时区的自然日**分组，没有做「一周从周几开始」的可配置项——如果你的周报以周日为一周起点，目前得手工调整。

## 安全

- 只监听 `127.0.0.1`。
- 带 `Origin` 头的请求必须同源，其他网站即使猜到端口也读不到你的会话。
- `opencode.db` 以 `?mode=ro` 打开。

令牌默认关闭。要开启：

```sh
python src/py/server.py --token          # 生成并启用
python src/py/server.py --show-token     # 查看当前令牌
python src/py/server.py --set-token XXX  # 指定令牌
python src/py/server.py --no-token       # 关闭
```

改完重启服务。插件会自动从 `config.json` 读取令牌。登录失败会按来源 IP 锁定 10–300 秒。

## HTTP 接口

界面做的事都是普通 GET，可以直接拿来写脚本：

| 路径 | 用途 |
| --- | --- |
| `/api/health` | 版本、计数、索引状态、语言、数据目录 |
| `/api/sessions` | 会话列表：`q` `dir` `from` `to` `sort` `main` `limit` `offset` |
| `/api/session?id=` | 元信息、计数、按天分布、待办、子会话 |
| `/api/parts?session_id=` | 分页消息与片段：`limit` `before_time` `before_id` `around_time` `roles` `kinds` |
| `/api/search?q=` | 全库搜索：`session_id` `dir` `from` `to` `roles` `kinds` `limit` `offset` |
| `/api/stats` | 聚合统计：`from` `to` |
| `/api/export` | `format=md\|txt\|json\|report`，`session_id` `from` `to` `include` `roles` `save` |
| `/api/tool-output?part_id=` | 读取 `tool-output` 目录里的完整工具输出 |
| `/api/file?part_id=` | 读取内联附件字节 |
| `/api/index?rebuild=1` | 重建搜索索引 |

## 开发

```sh
node scripts/check.mjs          # 包结构、i18n、插件契约、HTTP 冒烟
node scripts/check.mjs --deep   # 额外打开一个会话（需要已有索引）
npm pack --dry-run              # 看打包内容
```

没有构建步骤：插件入口是 `src/index.ts`（只有类型标注，由 OpenCode 运行时直接执行），共享运行时是纯 ESM 的 `src/runtime.js`。

## 已知限制

- 一个数据目录一份索引，没有多机同步。
- 侧车索引存的是抽取后的文本，几千个会话大概 100–200MB，可随时重建。
- 报告是启发式的：会过滤自动续跑提示、重复指令、URL 和 HTML 标签，但发出去之前还是要自己读一遍。
- 只读 OpenCode 自己的数据库；其他 agent 的会话存储暂不支持。

## 许可

MIT

README 里的截图来自合成数据库（`scripts/demo-data.py`），不含任何真实会话内容：

```
python scripts/demo-data.py ./demo-env
OPENCODE_DATA_DIR=./demo-env python src/py/server.py
```
