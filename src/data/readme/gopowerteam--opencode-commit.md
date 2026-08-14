# opencode-commit

OpenCode 插件 - 根据 Git 变更自动生成中文约定式提交信息。

提供 `/commit` 命令，自动收集 git diff、status 和提交历史，结合 AI 生成符合约定式提交规范的中文提交信息，确认后一键提交。

## 功能

- 自动收集暂存区的 diff 和上下文信息
- 支持中文约定式提交格式（feat/fix/docs/style/refactor/perf/test/chore/revert）
- 自动附加对应的 emoji
- 交互式确认后再提交
- 无暂存变更时自动 `git add -A`

## 安装

使用 CLI 命令安装：

```bash
opencode plugin @gopowerteam/opencode-commit -g
```

或者在 `opencode.json`（全局或项目级）中手动添加：

```json
{
  "plugin": ["@gopowerteam/opencode-commit@latest"]
}
```

OpenCode 会在下次启动时自动安装。

## 使用

在 OpenCode 中输入：

```
/commit
```

插件会自动：
1. 收集当前仓库的 git diff 和最近提交记录
2. 生成中文约定式提交信息
3. 展示供你确认
4. 确认后执行 `git commit`

### 提交信息格式

```
<type>: <subject> <emoji>
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

## 开发

```bash
bun install
bun dev          # 加载插件启动 OpenCode
bun typecheck    # 类型检查
```

## License

MIT
