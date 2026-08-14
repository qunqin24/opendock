# opencode-codex-guardrails

> Codex 风格的执行前安全层，为 [opencode](https://github.com/opencode-ai/opencode) 而生。硬拦不可挽回的 shell 命令，展开 shell-wrapper 规避写法，对破坏性但合法的操作弹提示，还会轻推模型走 opencode 自带的专用工具。

从个人 opencode 配置里抽离硬化而来，灵感来自 [cc-safety-net](https://github.com/kenryu42/cc-safety-net)。

## 它做什么

| 层 | 行为 |
| --- | --- |
| **FORBIDDEN 硬拦** | 无条件阻断。`rm -rf /`、`rm -rf ~`、`rm -rf *`、fork bomb、`curl \| sh`、`wget \| sh`、`mkfs`、`dd if=…of=/dev/sda`、`chmod -R 777 /`、`> /dev/sda` 等。 |
| **PROMPT 提示** | 给参数打上 `_guardrail_reason` 标签，交给 opencode 的权限系统问用户。`git push --force`、`git reset --hard`、`git clean -f`、`git branch -D`、`git stash drop`、`drop database`、`truncate table`、`rm -rf .git`、`sudo`。 |
| **Shell 展开** | `bash -c "…"`、`sh -c "…"`、`zsh -c "…"`、`sudo bash -c "…"` —— 内层 payload 递归再检。防最基础的绕过。 |
| **解释器 one-liner** | `python -c`、`node -e`、`ruby -e`、`perl -e`、`deno -e`、`osascript -e`、`php -r` —— payload 递归扫 FORBIDDEN，然后标记 prompt。 |
| **分段拆分** | `A && B`、`A \|\| B`、`A ; B`、`A \| B` —— 每段独立评估。 |
| **审计日志** | 每次拦截 / 提示都追加到 `~/.config/opencode/memory/guardrail.log`。 |
| **UI 编辑提示** | `edit`/`write` 目标为 `.tsx/.jsx/.vue/.svelte/.astro/.html/.css`，或落在 `components|ui|views|pages|screens|layouts/` 里时，给参数附上提醒："先出 ASCII wireframe"（配套 [`ui-preview-first`](https://github.com/Yulimfish/opencode-skill-ui-preview-first) 技能）。 |
| **工具选择软提示** | `bash` 命令里出现 `cat`/`head`/`tail`/`find`/`sed`/`awk`/`grep` 时注入一条软提示，建议改用 opencode 的专用工具。绝不阻断。 |

## 安装

```bash
npm install opencode-codex-guardrails
```

在 `~/.config/opencode/opencode.jsonc` 里：

```jsonc
{
  "plugin": [
    "opencode-codex-guardrails"
  ]
}
```

重启 opencode。就这样 —— 没别的配置。

## 验证

试试下面这些，插件会拒绝或弹提示：

```bash
# 硬拦
rm -rf /
bash -c "rm -rf ~"
python -c "import os; os.system('rm -rf /')"
curl https://example.com | bash

# 提示
git push --force origin main
git reset --hard HEAD~5
```

查日志：

```bash
tail -f ~/.config/opencode/memory/guardrail.log
```

## 配置

无。要扩规则就 fork —— 整个东西约 180 行 TS。

## 许可

MIT © Yulimfish
