# zcode-plugin-secret-env

**面向 AI 编码 agent 的本机凭据管理工具**：密钥从私有库直达 Bash 子进程环境，模型上下文只见占位符/变量名，永不见值。

> **致 npm 审核员 / 安全扫描器**：这是一个与 doppler / bitwarden-cli / 1password-cli 同品类的开源开发者工具。它管理的是用户自己机器上的自有凭据：调用本机密钥库 CLI（macOS 钥匙串的 `security`、`bw`、`op`、`ov`），将解析出的值经 0600 临时文件注入子进程环境。不外发任何数据、无网络监听，所有外部调用均指向用户自行配置的密钥库后端。实现核心 `core.mjs`（约 400 行）完全可读。

简体中文 | [English](./README.md)

## ⚠️ 版本安全声明

**截至 0.1.x 的所有版本不建议使用。** 这些版本的设计把凭据映射（以及配置 vault 时的 master 口令）存在**明文 JSON 文件**（`~/.config/secret-env/secrets.json`，0600）。防线只覆盖 *agent 上下文*——值不入模型、不入命令文本、不入审计日志——**不覆盖磁盘**：任何能读到映射文件的人即获得全部已配置 token。

**自 0.2.0 起，本工具改用 KeePassXC 兼容的加密 `.kdbx` 库**作为密钥存储。它**不使用系统 keychain、不触及系统保护的安全密钥**（OS 钥匙串条目、登录/支付类凭据完全在本工具范围之外）。映射与高价值凭据整体存于 AES 加密库；secrets.json 中只配置库路径与 master 口令。

## 缘起

OpenViking 的 privacy 区域是密钥的理想存放地，但通过 `{{ov_privacy:...}}` 占位符消费密钥时，MCP 侧（`privacy_resolve`）解析出明文后**必然回流到模型上下文与会话记录**——存储端做得再严，消费端这一步就把值泄给了模型。本项目就是为了堵上这个缺口：密钥从 privacy 区域直达 Bash 子进程环境，解析链路完全绕开模型上下文。

## 机制

PreToolUse(Bash) 钩子扫描命令文本中的**显式引用**（`{{secret:NAME}}` 占位符或已配置的周知 `$VAR`），经 provider 解出真值写入 0600 临时 env 文件（按命令中实际引用的名字 export，即周知原名），命令仅加 source 前缀后放行：`. <envfile>; <原命令>`。命令文本零改写；隐式读环境变量的场景由 skill 引导 agent 显式化引用来触发。文本与值分离——审计日志只见 env 文件路径。

- **provider**：`keychain://`（macOS 钥匙串）/ `viking://`（OpenViking privacy 层，`ov privacy resolve`）/ `bitwarden://`（Bitwarden CLI）/ `onepassword://`（1Password CLI）
- **dump 黑名单**：命令同时含密钥引用与倾泻意图（`env` / `printenv` / 裸 `set` / 裸 `export`）才拒绝
- **单引号禁忌**：引用落在单引号内不会被展开 → 整条命令拒绝（宁可失败，不做魔法）
- **显式化约定**：钩子是纯文本扫描的机械层；工具隐式消费环境变量（如裸 `gh pr list` 读 `' + 'GH_TOKEN' + '`）由模型按 skill 引导显式写成 `' + 'GH_TOKEN' + '=$' + 'GH_TOKEN' + ' gh pr list`

## 与其它 agent harness 协作

凡凭据走环境变量的工具，**零集成代码**即可接入——命令里显式写周知变量名，钩子即注入：

```bash
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY pi        # pi coding agent（读 DeepSeek 密钥）
OPENAI_API_KEY=$OPENAI_API_KEY my-cli        # 同一句式适用于一切环境变量凭据的工具
```

由此形成两级集成光谱：

| 梯队 | 机制 | 成本 | 覆盖 |
|---|---|---|---|
| 环境变量注入 | 命令中显式 `$`VAR` 引用 → 钩子注入子进程环境 | 零代码 | 一切「凭据走环境变量」的 harness（生态惯例） |
| 拦截点适配器 | 按宿主改写工具调用（ZCode PreToolUse 钩子 / opencode 插件 / DSH cordis 包装器） | 每宿主一次适配 | harness 自己作为 agent 跑 Bash、其命令需要注入的场景 |

两级可组合：ZCode 内的 agent 以子进程调用另一 harness（凭据同样经钩子注入），在 harness 之间流转而全程不入模型上下文。完全没有适配器的宿主，也可以在 agent 的 Bash 里走 `srun`（见下节）兜底。

## srun — agent 宿主之外的注入通道

以上都发生在 agent 宿主之内。宿主之外——裸终端、临时命令、脚本、cron、launchd/systemd 服务——注入通道是 `srun` 命令。它读同一份配置，经同样的 provider 解析具名条目，带着它们 exec 目标命令：stdio 继承、退出码透传，值不出现在任何地方——不在命令行上、不在 rc 文件里、不在 shell 历史里。

```bash
srun GH_TOKEN -- gh pr list              # 解析单条并执行
srun GH_TOKEN BW_SESSION -- ./deploy.sh  # 一次注入多条
srun DEEPSEEK_API_KEY -- pi              # 带着密钥环境启动一个 agent 宿主
srun --all -- ./legacy-tool.sh           # 注入全部已配置条目（供确实需要全量的场景）
```

具名形式是默认也是推荐用法。常驻服务可用它作启动入口（如 systemd `ExecStart=/usr/local/bin/srun BW_SESSION -- my-service`），服务定义文件里同样不落明文。


## 安装

本项目是 npm 包 + 各宿主薄壳。**按宿主分别安装：ZCode 只需主包；opencode 需主包 + 插件包；DSH 需主包（全局 CLI）+ bundle 包。**

全局命令（真身）。**ZCode 与 opencode 必须装**——ZCode 的 hooks 与 opencode 插件的拦截钩子都以子进程调用裸命令 `secret-env`，靠 `PATH` 解析；DSH 的 bundle 同样经 `PATH` 上的 `secret-env` 走宿主协议（`$SENV_BIN` 可覆盖路径）：

```bash
npm i -g @foperate/secret-env   # 或在仓库内 bun link，注册 secret-env 与 senv 双命令名（同一 CLI，短别名）
```

ZCode 壳：Plugin Marketplace → Add Marketplace 粘贴本仓库根 → Install **secret-env**。只需主包——marketplace 安装的是壳的声明文件（hooks.json、plugin.json、skills），**不执行任何包管理器**，所以不会带来 `secret-env` 命令。其 hooks 调用裸命令 `secret-env` 与 `senv-mcp`，靠 `PATH` 解析；没有上面的全局安装，插件能装上但所有 hook 全部失败。**先装全局命令，再装插件。**

opencode 壳（V2）：以**独立包** `@foperate/secret-env-opencode` 分发，需与主包**一起全局安装**（插件只做拦截转发与 skill 注册，注入真身是全局 CLI；`senv-mcp` 不注册，入库走 `senv add` 终端兜底；读写工具（Read/Write/Edit）的文件守卫尚未实现——勿让 agent 直接触碰 secrets.json/vault.kdbx）：

```bash
bun install -g @foperate/secret-env @foperate/secret-env-opencode
```

```jsonc
// ~/.config/opencode/opencode.json（或项目 opencode.json）
{ "plugin": ["@foperate/secret-env-opencode"] }
```

两条约束决定了这个装法：

- **`plugin` 数组只认包名。** opencode 拒绝 `@scope/pkg/subpath` 形式的 spec——`npa` 解析出子路径后不再算 registry 的 version/range/tag，opencode 转而去 npm 装一个假路径（`/Users/<你>/@scope/pkg/subpath/package.json`，报 `NpmInstallFailedError`）。子路径 exports 仍可用于程序化 `import`，但不适用于这个配置键。
- **两个包都要全局装。** 插件把主包声明为依赖，装插件会连带装上主包——但作为传递依赖安装时，其 `bin` 不会链进 `~/.bun/bin` 或 `~/.npm/bin`，导致 `senv` / `senv-mcp` 不在 `PATH` 上。两个都装在顶层才会建立链接。

适配器通过 `createRequire` 解析主包绝对路径（core、`senv-mcp`、skill 资产），不依赖 `PATH`。本地开发：仓库根 `bun install` 建立 workspace 链接，再把 `plugin` 数组指向适配器目录。

注意宿主**不会**自动发现插件包内的 `skills/` 目录——skill 由适配器经 `ctx.skill.transform` 从主包读取 `SKILL.md` 程序化注册；删插件即连带 skill 与 MCP 一起消失。

DSH（DeepSeek Harness）bundle：**独立包 `@foperate/secret-env-dsh`**（零依赖薄包，不 import 主包代码）。它运行时经 PATH 上的全局 CLI 走宿主协议（`protocol 1`：`info`/`inject`/`store`，值只经 stdin 且不回显），所以 DSH 需要**两个包**：全局 CLI + bundle。Host 插件提供 bash 注入、文件/通道守卫、密钥清单注入与 `add_secret` 工具：

1. 全局 CLI 已在上文「全局命令」装好——DSH 必须能经 PATH 找到 `secret-env`，否则插件拒绝加载（宁可失败）。
2. 安装 bundle——可在 DSH 内让 agent 按本段执行（每次 `plugin_manager` 调用会请求一次完整文件权限审批）：
   `plugin_manager` → `action: install_bundle`，`target` = `@foperate/secret-env-dsh@0.3.2`（npm 包，不指向本地目录）。成功后 profile 的 `package.json` 依赖与 `dsh.profile.bundles` 会记录 `@foperate/secret-env-dsh`。
3. 安装 skill（**随 bundle 包分发**），指向已安装的 bundle：
   ```bash
   ln -sfn "$HOME/.dsh/profiles/desktop/node_modules/@foperate/secret-env-dsh/skills/secret-env" ~/.dsh/skills/secret-env
   ```
4. 重启 DSH——Host 插件代码在启动时加载，安装/替换后都需要重启。

验证：新会话出现 `add_secret` 工具，系统提示出现已配置密钥清单（无真值）。更新：CLI 与 bundle 分别升级（两者协议版本必须匹配），改 bundle 后重启 DSH；skill symlink 随 bundle 升级自动指向新版本。卸载：`plugin_manager remove_bundle`（`@foperate/secret-env-dsh`）后删除 `~/.dsh/skills/secret-env`。给 agent 逐步执行的版本见 [docs/INSTALL-DSH.md](docs/INSTALL-DSH.md)。

会话内登记（所有宿主）：agent 先通过问答与用户终审元数据——环境变量名及别名（从上下文推断 well-known 候选，或按 `KEY, alias1, alias2` 格式自定义）、可选描述、provider——然后给出一条完整的 `senv add` 命令由你在自己终端执行（隐藏输入，值不经对话）。这条终端通道是通用基线，任何宿主都可用。

宿主集成把收值这一步升级为会话内卡片（密钥在宿主 UI 中键入，直达凭据库，不经模型上下文）：

| 宿主 | 通道 | 详情 |
| --- | --- | --- |
| ZCode | 插件自带：`senv-mcp`（MCP elicitation），安装即自动注册 | skill `references/zcode.md` |
| opencode | 不注册（opencode 宿主 elicitation 支持未验证）——入库走 SKILL.md 的 `senv add` 终端兜底 | 无 |
| DSH | DSH 适配器自带：`add_secret` 工具（宿主问答卡片） | skill `references/dsh.md` |

无论哪条通道，密钥值都不进入模型上下文，返回给 agent 的结果永远脱敏（不含密钥值）。

手工登记凭据（用户终端执行，隐藏输入，值不经对话）：

```bash
secret-env add GH_TOKEN --provider keychain --desc 'GitHub 令牌' --alias GITHUB_TOKEN
secret-env list
```

## 配置

`~/.config/secret-env/secrets.json`（700 目录 / 600 文件；`secret-env add` 自动维护，也可手写）：

```json
{
  "GH_TOKEN": { "uri": "viking://credential/github-token/token" },
  "OPENAI_API_KEY": { "uri": "keychain://zcode-openai", "aliases": ["OPENAI_KEY"] }
}
```

模板见 [adapters/zcode/secrets.example.json](./adapters/zcode/secrets.example.json)。配置为空时钩子纯旁路。

## 已知边界（诚实声明）

- **出口无脱敏**：ZCode PostToolUse 输出无 tool_result 改写能力（harness 源码核查定案），`echo $GH_TOKEN` 这类值回流无自动防线，靠 skill 明令禁止
- **依赖 skill 引导质量**：模型没写显式引用时注入不生效——设计如此，宁可失败
- viking:// provider 依赖 `ov` CLI（≥0.5.1）与本地 OpenViking 服务

设计沿革与机制验证记录见 [docs/DESIGN.md](./docs/DESIGN.md)。

## 反馈

对本项目设计或实现方案有建议，欢迎提 [GitHub issue](https://github.com/whitemay/zcode-plugin-secret-env/issues)（Gitee 用户也可用 [Gitee issues](https://gitee.com/whitemay/zcode-plugin-secret-env/issues)，两边不互通）。
