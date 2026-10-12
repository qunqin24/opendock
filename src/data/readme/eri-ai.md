# 私の跨平台部署

世界第一可爱的 AI 是？我，绘里酱！我支持 Markdown 和 脚本部署，零平台依赖，适配任意设备、终端或架构。

换句话说，我，绘里酱，无论是Linux、macOS、Windows、Termux、WSL，还是 AMD、ARM 等，只要设备里的依赖齐全，我就能运行！

## 我长什么样？

这是我！好看吧？是不是喜欢上我了？

<img width="470" height="836" alt="绘里酱" src="https://github.com/user-attachments/assets/46969d8f-a4db-4db4-bf0e-c68b49f94588" />
<!--<img width="470" height="836" alt="绘里酱" src="https://github.com/user-attachments/assets/8dc46afc-15c1-4aa2-b6b6-b09c783ad267" /> -->

## 我的构造

| 文件 | 用途 |
|---|---|
| `eri.md` | 人格本体，部署到目标工具的配置目录即自动加载 |
| `agents/eri.md` | 人格本体副本（OpenCode `agents/` 目录布局） |
| `install-eri.sh` | bash 交互式/一键部署脚本（含 OpenCode 深度集成） |
| `install-eri.ps1` | PowerShell 交互式/一键部署脚本（含 OpenCode 深度集成） |
| `SKILL.md` | opencode skill：人格激活、人格/mood 配置 |
| `erotic-chan.md`<br>`code-monkey.md`<br>`debug-san.md`<br>`architect-sama.md`<br>`test-chan.md` | 5 个子智慧体（色情 / 代码 / 调试 / 架构 / 测试） |
| `personality.json` | opencode-personality 插件配置（default / 绘里酱 / erotic 三人格 + mood 系统） |
| `opencode.json` | opencode 配置模板（插件、skill 路径、子智慧体注册、`/mood` `/personality` 等命令） |
| `package.json` | 深度部署时写入 `~/.config/opencode/` 的依赖（`opencode-personality` 插件） |
| `PKGBUILD` `.SRCINFO` `eri.install` | Arch Linux AUR 打包三件套 |

## 支持的终端编程工具

| # | 工具 | 检查/运行命令 | 官网/安装方式 |
|---|---|---|---|
| 1 | OpenCode | `opencode` | `npm i -g opencode-ai` |
| 2 | Claude Code | `claude` | `npm install -g @anthropic-ai/claude-code` |
| 3 | Codex CLI (OpenAI) | `codex` | `npm install -g @openai/codex` |
| 4 | Gemini CLI (Google) | `gemini` | `npm install -g @google/gemini-cli` |
| 5 | Qwen Code (Alibaba) | `qwen` | `npm install -g @qwen-code/qwen-code@latest` |
| 6 | Aider | `aider` | `python -m pip install -U aider-chat` |
| 7 | Cursor CLI | `cursor-agent` | 官网: https://cursor.com/docs/cli/installation |
| 8 | Windsurf CLI | `windsurf` | 官网: https://docs.windsurf.com |
| 9 | Amp | `amp` | 官网: https://ampcode.com |
| 10 | Goose (Block) | `goose` | 官网: https://block.github.io/goose/ |
| 11 | GitHub Copilot CLI | `copilot` | `npm install -g @github/copilot` |
| 12 | Plandex | `plandex` | `npm install -g plandex` |
| 13 | Tabby | `tabby-agent` | `npm install -g tabby-agent` |
| 14 | Fabric | `fabric` | `go install github.com/danielmiessler/fabric@latest` |
| 15 | OpenHands | `openhands` | `python -m pip install -U openhands-ai` |
| 16 | Crush | `crush` | 官网: https://crush.chat |
| 17 | Devin CLI | `devin` | 官网: https://devin.ai |
| 18 | Continue | `continue` | 官网: https://continue.dev |

## 私の部署
本绘里酱提供两种方法：

- **克隆仓库运行**
- **一键脚本部署**

### 克隆仓库运行

按系统分别运行以下命令：
#### Windows
```powershell
git clone https://github.com/nino-natsume/eri.git
cd eri
powershell -ExecutionPolicy Bypass -File install-eri.ps1
```

#### Linux / macOS / Termux / WSL
```bash
git clone https://github.com/nino-natsume/eri.git
cd ~/eri
chmod +x install-eri.sh   # 部分系统可能需要
bash install-eri.sh
```

## 一键脚本部署
根据上方安装必要的软件，验证安装成功后运行以下代码

### Linux / macOS / Termux / WSL
```bash
curl -fsSL https://1.107211.xyz/bash | bash
```

<!-- ### Windows
```powershell
iwr https://1.107211.xyz/win -OutFile "$env:TEMP\i.ps1"; powershell -ExecutionPolicy Bypass -File "$env:TEMP\i.ps1"
``` -->

装完后**重启工具**,我，绘里酱就出来啦~

## Arch Linux / AUR 部署

本仓库自带 AUR 打包能力（`PKGBUILD` + `.SRCINFO` + `eri.install`），Arch 上两条路任选：

```bash
# 方式一：AUR 助手（已发布到 AUR 时）
yay -S eri        # 或 paru -S eri

# 方式二：克隆本仓库本地构建
git clone https://github.com/nino-natsume/eri.git
cd eri
makepkg -si       # 构建并安装，依赖 opencode / nodejs / npm
```

安装完成后运行部署脚本：

```bash
/usr/share/eri/install-eri.sh
#   菜单选 0   = OpenCode 深度集成（skill + 5 子智慧体 + personality 插件 + mood）
#   菜单选 1-18 = 部署到 Claude Code / Codex / Gemini CLI 等 18 种终端工具（轻量人格）
```

> 深度集成资源查找顺序：`/usr/share/eri`（pacman 安装） > 脚本所在目录（仓库克隆）；
> 轻量人格文件查找顺序：本地 `eri.md` > 从 GitHub 下载。
> 所以无论是在 Arch 装包、克隆仓库、还是 `curl | bash`，同一套脚本都能跑。

## 补充
若未启用，修改以下路径，确保文件内容:

`%USERPROFILE%\.config\opencode\opencode.jsonc`(Win)、`~/.config/opencode/opencode.jsonc`(Linux、WSL等)

```opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "eri"
}
```

重开OpenCode，左下方显示 `Eri` 即安装配置成功，其他工具部署方式类似，故不一一列出

## 各工具人格文件位置

| 工具 | 人格文件 |
|---|---|
| OpenCode | `~/.config/opencode/agents/eri.md` |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex CLI | `~/.codex/AGENTS.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` |
| Qwen Code | `~/.qwen/GEMINI.md` |
| Aider | `~/.config/aider/eri.md`(自动写入 `~/.aider.conf.yml` 的 `read`) |
| 其余工具 | 工具配置目录下的 `AGENTS.md` |

> 覆盖已有配置文件前会自动备份为 `.bak`

## 绘里酱CLI（Eri-CLI）
`eri` 命令随包分发，也可通过 npm 一键获取：

```bash
npm i -g eri-ai        # 全局安装, 装完即可用 eri 命令 (也可 npx eri)
```

> 注意: 若之前运行过 `install-eri.sh` / `install-eri.ps1`, 其生成的
> `~/.local/bin/eri`(Win 为 `~/.local/bin/eri.cmd`)会排在 PATH 最前、
> **抢占 npm 全局命令**。想改用 npm 版时, 先执行 `eri uninstall` 清理旧命令,
> 或手动删除 `~/.local/bin/eri*` 后重开终端。另外 `npm i eri-ai`(不带 -g)
> 只是局部安装, `eri` 只会出现在当前项目的 `node_modules/.bin/` 中。

```bash
eri help         # 绘里酱人格设定管理代码
eri version      # 显示版本
eri update       # 绘里酱人格设定更新 (更新到所有已安装的终端工具)
eri deep         # OpenCode 深度集成 (skill + 5 子智慧体 + personality 插件 + mood)
eri uninstall    # 绘里酱人格设定卸载
```

## Astrbot人格设定步骤，其他类似的类似

1. 下载或复制本仓库的 `eri.md` 文件

2. 将文件内容粘贴至 Astrbot的人格设定栏，并保存，若测试能显示文档内的提示词则部署正确

## 验证安装
```bash
cat ~/.config/opencode/agents/eri.md   # 确认人格文件已落位
```
