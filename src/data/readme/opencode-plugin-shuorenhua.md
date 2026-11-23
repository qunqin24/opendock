# 说人话（`shuorenhua`）

给 `AI` 编程助手用的中文写作 `skill`：根据读者和用途取舍内容，消除防御性免责套话与生硬翻译腔，再检查用词和句式，让读者找到、理解并使用所需信息。

仅用于对话中的解释、建议和交付说明，说明性文档的叙述正文，以及代码注释。不用于界面文案、日志或其他程序输出，也不改写引用原文、协议字段、接口数据、配置值和测试预期值。

## 解决什么问题

模型写中文时容易出现这些问题：

- 不区分读者已有知识，重复解释熟悉的组件和术语
- 堆叠防御性免责话术（「`这并不意味着`……」「`不能据此认定`……」「`未修改其他文件`」），把背景写入正文，擅自扩大待讨论范围
- 滥用正反序否定对比（「`不是 A，而是 B`」「`是 A，而不是 B`」），替读者假想一个没人主张的说法再去反驳
- 改换项目已经确定的术语，混淆已确定事项与作者建议
- 生造词、比喻过头的说法（例如「`收束`」「`封账`」「`掐死`」「`收据`」「`落盘`」）
- 表演式句型与自我辩护（「`先给个判断`」「`我前面说得太绝对`」）
- 把代码拟人化（「参数被吃掉」「预算把任务`掐死`」）
- 弱动词名词化（「`进行参数的校验`」）、主语暗换、超长句、中英混杂、指代不清

本 `skill` 提供：

1. `SKILL.md`：内容取舍、反防御写作、句法组织规则、内联完整禁用词表与检查流程
2. `data/`：禁用词对照表、禁用与受限句式正则、英文术语白名单
3. `scripts/check_text.py`：对 Markdown 文档与源码注释做机械检查（可接 `hook` / `CI`）

## 目录结构

```text
shuorenhua/
├── SKILL.md                 # skill 主说明（含完整 block 词表，对话自查无需额外读 data/）
├── README.md                # 本文件
├── data/
│   ├── banned_terms.tsv     # 生造词对照（含 block/warn 级别与建议替换）
│   ├── banned_patterns.txt  # 禁用与受限句式正则（支持 block/warn 级别）
│   └── en_whitelist.txt     # 允许直接写在中文里的通行英文词
└── scripts/
    └── check_text.py        # 机械检查脚本（依赖 Python 3 标准库）
```

## 安装

需要本机已安装 `Git`。检查脚本需要 `Python` 3，无第三方依赖。

把整个仓库克隆到 `~/.agents/skills/shuorenhua/`，并保证该目录内直接有 `SKILL.md`（不要多套一层文件夹）。

### 个人全局（推荐）

```bash
mkdir -p ~/.agents/skills
git clone https://github.com/sanjusss/shuorenhua.git ~/.agents/skills/shuorenhua
```

兼容从 `~/.agents/skills/` 加载 `skill` 的各类 `agent`（不限于某一家产品）。

### 仅当前项目

```bash
# 在仓库根目录执行
mkdir -p .agents/skills
git clone https://github.com/sanjusss/shuorenhua.git .agents/skills/shuorenhua
```

把项目里的 `.agents/skills/shuorenhua` 提交进 `Git` 后，同事克隆仓库即可共用，无需各自再装。

### OpenCode 插件（自动注入）

OpenCode V2 用户可以安装本仓库自带的插件。装好后每次模型调用的 `system` 末尾自动带上技能正文，发出的请求里每条用户消息末尾附加一句提醒。提醒只影响发给模型的内容，不写入消息历史，界面上不显示。本地没有该技能时，插件会用仓库内的文件自动注册。

方式一（推荐，npm 安装）：

```bash
opencode plugin add opencode-plugin-shuorenhua
```

安装和更新走 npm 渠道：更新执行 `opencode plugin update`，卸载执行 `opencode plugin remove opencode-plugin-shuorenhua`。仓库配置了 `GitHub Actions`：技能相关文件（`SKILL.md`、`data/`、`plugin/` 等）推送到 `master` 后自动发布新版到 npm，发布前会先跑机械检查，检查不通过就不发布。

注意：OpenCode 启动时不会自动拉取新版（只读本地缓存），需要手动执行 `opencode plugin update`。想要全自动更新，可以再装一个社区的 `opencode-plugin-auto-update` 插件（它会在启动时后台检查并安装 npm 插件的更新），或者用系统定时任务周期执行 `opencode plugin update`。

方式二（`GitHub` 直装）：

```bash
opencode plugin add github:sanjusss/shuorenhua
```

注意：不要在仓库地址后加 `#分支名`（如 `#main`）。加了分支名后，npm 会改用 `git` 的 `SSH` 协议拉取，需要配置 `GitHub` 的 `SSH` 密钥；不加则直接走 `HTTPS` 下载，无需任何凭证。这种方式不会自动更新，更新执行 `opencode plugin update`，卸载执行 `opencode plugin remove github:sanjusss/shuorenhua`。

方式三（手动配置）：把仓库克隆到任意位置，在全局配置 `~/.config/opencode/opencode.json` 的 `plugins` 数组里指向 `plugin/src` 目录：

```bash
git clone https://github.com/sanjusss/shuorenhua.git ~/shuorenhua
```

```jsonc
{
  "plugins": ["/home/你的用户名/shuorenhua/plugin/src"]
}
```

注意：配置里的路径必须是包含 `index.ts` 的目录（即 `plugin/src`）。指向仓库根不会生效，当前版本不解析 `package.json` 的入口字段。

### 安装后自检

确认路径正确：

```bash
ls ~/.agents/skills/shuorenhua/SKILL.md
# 项目安装则检查：
# ls .agents/skills/shuorenhua/SKILL.md
```

运行脚本自检：

```bash
python3 ~/.agents/skills/shuorenhua/scripts/check_text.py --self-test
```

然后重启或重新打开你的 `agent`，使 `skill` 被重新发现。

## 使用方式

### 让 `agent` 遵守规则

在对话里点名加载，例如：

- 「按 `shuorenhua` 写」
- 「说人话」
- 「检查文风」

也可以在项目的 `AGENTS.md` 或同类规则文件里写明：撰写中文对话回复、说明性文档正文或代码注释前，必须加载 `shuorenhua`；界面文案、日志和其他程序输出不适用。

规则全文见 `SKILL.md`。对话回复直接依据 `SKILL.md` 内置词表与清单静默自查，无需额外读取 `data/` 或调用脚本；写完说明文档或代码注释后运行脚本做机械检查。

### 手动检查文档与代码注释

脚本支持直接传入 Markdown 文档和常见源码文件（`.py`、`.ts`、`.js`、`.go`、`.rs`、`.c`、`.cpp`、`.java`、`.sh` 等）：

- 检查 Markdown 时自动跳过顶部 YAML `frontmatter`、代码块、行内代码、链接目标路径、URL 与 `HTML` 注释。
- 检查源码文件时仅提取代码注释与 Python `docstring`，自动跳过业务字符串与界面文案，并保留原文件行号。
- 文档中展示界面文案或日志示例时，可用 `<!-- shuorenhua-ignore-start -->` 与 `<!-- shuorenhua-ignore-end -->` 包裹跳过（单行可用 `<!-- shuorenhua-ignore-line -->` 或代码注释中的 `shuorenhua-ignore-line`）。

```bash
python3 /path/to/shuorenhua/scripts/check_text.py 文档.md src/app.py
```

输出格式示例：`路径:行号: [LEVEL][类别] 命中 -> 建议`。检查类别涵盖生造词、禁用句式、句法信号、超长句和中英混杂。有 `BLOCK` 时退出码为 1，便于接 `CI`。

常用参数：

| 参数 | 含义 |
|------|------|
| `--stdin` | 从标准输入读入 |
| `--mode MODE` | 指定解析模式：`auto`（默认）、`markdown`、`python`、`hash`、`slash` |
| `--max-len N` | 超长句汉字数阈值（默认 60） |
| `--exit-zero` | 即使有 `BLOCK` 也返回 0 |
| `--data-dir DIR` | 自定义数据目录 |

## 维护词表

日常写作与编码任务中，`agent` 不会主动修改 `data/` 下的文件。仅在检查文风或维护本技能时按以下规则更新：

| 文件 | 谁可以改 | 说明 |
|------|----------|------|
| `data/banned_terms.tsv` | 检查文风或维护时可追加 | 四列：词、级别（`block`/`warn`）、建议替换、说明；新增 `block` 词须同步写入 `SKILL.md` |
| `data/banned_patterns.txt` | 需使用者同意 | 支持单列正则（默认 `block`）或「正则 + 级别 + 建议」三列 Tab 分隔，与 `SKILL.md` 同步 |
| `data/en_whitelist.txt` | 需使用者同意 | 只收通行技术词和知名产品名；人名、项目代号用反引号包裹，不进白名单 |

## 许可

若仓库根目录未附带许可证文件，使用前请与作者确认授权方式。
