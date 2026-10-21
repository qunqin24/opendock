# opencode-multi-repo-vcs

把工作区根仓库与嵌套的独立 Git 仓库（monorepo、`.codespace/*`、`services/*` 等）的未提交改动，聚合到 OpenCode 的变更栏（Review 面板）。

- 插件 id：`multi-repo-vcs`
- VCS provider id：`multi-repo`
- 目标：OpenCode V2（2.1.x 实测）
- 仅支持 Git

## 功能

- 根仓库 + 任意数量的嵌套仓库统一展示，路径保持为工作区内的真实相对路径；
- 支持 `working` / `branch` / `committed` 三种 diff 模式，以及 2.1.0+ 的审阅基线（`vcs.base`）；
- 空仓库（还没有任何提交）里的 staged / untracked 文件也能展示；
- 自动过滤根仓库中的 gitlink（submodule）与未跟踪目录条目，避免重复噪音；
- 扫描支持深度、额外起点、忽略目录；junction / symlink 目录可用。

## 安装

在 `opencode.json(c)` 的 `plugins` 中用对象形式加载：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-multi-repo-vcs",
      "options": {
        "depth": 2
      }
    }
  ]
}
```

本地开发时 `package` 可以填绝对路径：

```jsonc
{
  "plugins": [
    {
      "package": "D:/path/to/opencode-multi-repo-vcs",
      "options": {}
    }
  ]
}
```

`options` 可省略，全部使用默认值。

## 配置

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `depth` | number | `2` | 默认起点（工作区根）的扫描深度。`0` = 只看根自身，`1` = 直接子目录，`2` = 再下一层 |
| `scanRoots` | `(string \| { path, depth })[]` | `[]` | 额外的扫描起点（相对工作区根，可多个）。字符串项继承 `depth`，对象项可单独指定 `depth` |
| `ignoreDirs` | string[] | `[".git",".worktrees","node_modules","dist","build","vendor","target","coverage"]` | 扫描时按目录名跳过 |
| `takeover` | `"auto" \| "always" \| "never"` | `auto` | 何时接管默认 VCS provider。`auto` = 发现至少一个嵌套仓库时才接管 |
| `gitBinary` | string | `"git"` | Git 可执行文件；PATH 里没有 git 时填绝对路径 |
| `maxUntrackedFiles` | number | `50` | 每个仓库最多为多少个未跟踪文件生成 diff |
| `maxUntrackedBytes` | number | `2097152` | 单个未跟踪文件生成 diff 的字节上限（2 MiB） |
| `concurrency` | number | `4` | 同时执行的 Git 命令数（1–16） |
| `logLevel` | `"off" \| "debug"` | `off` | `off` 只记录错误；`debug` 额外输出请求级日志（写入 server 日志，不落文件） |

### 常用示例

```jsonc
// 根 + 一级子目录（更保守的扫描范围）
{ "depth": 1 }

// 根 + 一级子目录 + services 下两层
{ "depth": 1, "scanRoots": [".codespace", { "path": "services", "depth": 2 }] }

// 精确只聚合指定仓库
{
  "depth": 0,
  "scanRoots": [".codespace/repo-a", ".codespace/repo-b"]
}
```

## 发现规则

1. 工作区根是 Git 仓库时纳入（路径前缀为空），并继续向下扫描（根同时是容器）；
2. 其余目录命中 Git 仓库即纳入，且不再深入（避免嵌套仓库套娃）；
3. `scanRoots` 的每个起点：本身是仓库则直接纳入，否则按该项 `depth` 扫描其子目录；
4. 所有路径必须落在工作区内，越界路径会被跳过；
5. 结果按绝对路径去重，展示路径为相对工作区根的 POSIX 路径。

默认 `depth: 2` 是为了兼容 `<工作区>/.codespace/<repo>` 这类两层布局；如果你的仓库都在一级子目录，配 `depth: 1` 即可。

## 工作原理

- 通过插件 API `ctx.vcs.transform` 注册自定义 VCS provider，并按 `takeover` 决定是否设为默认；
- `status`：对根仓库与每个嵌套仓库执行 `git status --porcelain=v1 -z --untracked-files=all`，嵌套仓库路径加前缀；
- `diff`：按请求的 `worktree` 与 mode 分别执行 `git diff`；未跟踪文件用 `git diff --no-index` 构造新增 patch；空仓库回退为 `--cached` + 工作区 diff；
- `base`：优先按分支 reflog 的创建来源推断审阅基线，其次回落默认分支（`origin/main` → `main` → `origin/master` → `master`）；
- `info` / `branches`：以根仓库为准，失败时容错返回。

## 已知限制

- 「最后一轮变更」（`turn` 模式）使用 OpenCode 自带 `session.diff` 快照，不经过本 provider，因此看不到嵌套仓库改动；查看聚合结果请用「Git changes」模式；
- `/undo` 快照回滚不会覆盖嵌套仓库文件（OpenCode 快照机制跳过 Git ignored 路径，与本插件无关）；
- 只支持 Git；
- diff 输出上限按**文件边界**截断，超限的文件会整体不显示（避免输出半截 patch）；
- 工作区刚打开、插件 `setup` 尚未完成时，宿主可能短暂回退到内置 Git provider，随后会自动纠正；
- 工作区运行中新增嵌套仓库时，`takeover: "auto"` 的默认 provider 选择需要重载工作区或刷新后生效。

## 开发

```sh
npm install
npm run typecheck
npm test
```

`npm test` 使用 Node 内置测试运行器（Node 24），会在系统临时目录创建真实的 Git 仓库作为夹具，不依赖网络。

修改 `src/` 后，如果 OpenCode server 已订阅插件源文件，会自动重载；也可以用 `opencode service restart` 重启服务。

## License

MIT
