# opencode-commit

OpenCode 插件 - 根据 Git 变更自动生成中文约定式提交信息。

提供 `/commit` 命令，自动收集 git diff、status 和提交历史，结合 AI 生成符合约定式提交规范的中文提交信息，确认后一键提交。

## 功能

- 本地一次性收集上下文（status / diff / log），全程无模型参与
- 单次 AI 调用生成提交信息，校验与失败重试在本地完成，速度远快于逐工具编排
- 支持中文约定式提交格式（feat/fix/docs/style/refactor/perf/test/chore/revert）
- 自动附加对应的 emoji
- 交互式确认后再提交，`-y` 快速模式可跳过确认
- `--push` 提交成功后自动推送（无上游分支时自动 set-upstream）
- 存在待提交变更（含未跟踪新文件）时自动 `git add -A`

## 安装

> 仅支持 OpenCode v2。V1 的 `plugin` 配置键已改为 `plugins`。

使用 CLI 命令安装：

```bash
opencode plugin add @gopowerteam/opencode-commit
```

或者在 `opencode.json`（全局或项目级）中手动添加：

```json
{
  "plugins": ["@gopowerteam/opencode-commit@latest"]
}
```

OpenCode 会在下次启动时自动安装。

## 使用

在 OpenCode 中输入：

```
/commit
```

插件会自动：
1. 本地收集当前仓库的 git status、diff 和最近提交记录（无模型参与）
2. 单次 AI 调用生成中文约定式提交信息，本地校验失败时自动带错误重试一次
3. 展示供你确认
4. 确认后执行 `git commit`

### 快速模式

日常小变更可用 `-y` 跳过确认，生成校验通过后直接提交：

```
/commit -y
/commit -y subject 里带上模块名
```

再加 `--push` 在提交成功后自动推送（无上游分支时自动 `--set-upstream`）：

```
/commit -y --push
```

`-y`/`--yes` 与 `--push` 可任意组合，其余文本作为生成的额外要求。快速模式下提交（与推送）结果以合成消息直接展示（不经确认交互），可用 `git reset --soft HEAD~1` 撤销。

> 注：V1 的 `subtask`（子代理中执行命令）在 V2 插件命令上无对应字段，`/commit` 在当前会话内执行。如需子代理行为，可在 `.opencode/commands/` 自行定义命令文件（V2 配置层支持 `subagent: true`）。

### 提交信息格式

```
<type>: <emoji> <subject>
```

| 类型 | 说明 | Emoji |
|------|------|-------|
| feat | 新功能 | ✨ |
| fix | 修复 bug | 🐛 |
| docs | 文档更新 | 📝 |
| style | 代码格式化 | 💄 |
| refactor | 重构代码 | ♻️ |
| perf | 性能优化 | ⚡ |
| test | 测试相关 | ✅ |
| chore | 构建/依赖更新 | 🔧 |
| revert | 回滚提交 | ⏪ |

示例：`feat: ✨ 添加用户登录功能`

## 开发

```bash
bun install
bun dev          # 加载插件启动 OpenCode
bun typecheck    # 类型检查
bun test         # 运行单元测试
```

## License

MIT
