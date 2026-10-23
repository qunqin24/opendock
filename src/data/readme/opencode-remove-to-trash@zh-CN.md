[English](./README.md) | **简体中文**

# opencode-remove-to-trash

一个 OpenCode 插件：把 AI 触发的 `rm` 和补丁式文件删除**改为移入系统废纸篓（Trash）**，而不是永久删除。

删除后仍可从废纸篓恢复，误删不再是一场灾难。

---

## 功能特性

- **拦截 `rm`**：在 shell 命令中识别真正处于“命令位置”的 `rm`，重写为 `trash`，自动丢弃 `-r` / `-f` 等只对 `rm` 有意义的标志。
- **拦截补丁删除**：对 `apply_patch` / `patch` 里的 `*** Delete File:` 行，先把文件移入废纸篓，再把该行从补丁中移除，其余增改操作照常执行。
- **不误伤字符串**：`echo rm foo`、`'rm ...'`、`"rm ..."`、`confirm` 之类不会被改写；引号与转义都被正确解析。
- **跨平台后端**：优先使用 macOS 的 `trash`、Linux 的 `trash-put` / `gio trash`。
- **内置回退，无需安装**：找不到上述后端时，插件会自动生成一个纯 `sh` 的废纸篓脚本作为后端，开箱即用。
- **零运行时依赖**：插件只使用 Node 内置模块，单文件即可运行。

---

## 工作原理

插件通过 OpenCode 的 `tool.execute.before` 钩子，在工具真正执行前改写参数：

| 工具 | 行为 |
| --- | --- |
| `bash` / `shell` | 用小型词法扫描器找到命令位置上的 `rm`，替换为 `trash` 并去掉其标志 |
| `apply_patch` / `patch` | 抽出 `*** Delete File:` 的路径移入废纸篓，并从补丁文本中删掉这些行；若补丁只剩删除操作，则直接结束 |

改写示例：

```text
rm -rf node_modules              ->  trash node_modules
cd build && rm -rf out           ->  cd build && trash out
find . -name '*.tmp' -exec rm {} ->  find . -name '*.tmp' -exec trash {} +
echo rm foo                      ->  echo rm foo        (不变)
sudo rm -rf /tmp/x               ->  sudo rm -rf /tmp/x (不变)
```

> 出于安全考虑，`sudo rm ...` 不会被改写（配置里通常也应直接禁用 `sudo`）。

---

## 环境要求

- OpenCode（插件宿主）
- 废纸篓后端（**可选**，按以下顺序探测）：
  1. macOS：`trash`（`brew install trash`）
  2. Linux：`trash-put`（`trash-cli`）或 `gio trash`（`glib2`）
  3. 都没有时：**内置回退**——插件会在 `~/.cache/opencode/rm-to-trash/trash` 生成一个纯 `sh` 脚本，macOS 移到 `~/.Trash`，Linux 按 XDG 规范移到 `~/.local/share/Trash`（含 `.trashinfo`）

也就是说，用户什么都不用装也能用。只有在无法写入缓存目录时插件才会停用。

> Windows / WSL 建议通过 WSL 的 Linux 环境使用。

---

## 一键安装

```bash
curl -fsSL https://raw.githubusercontent.com/Ryan9438/opencode-remove-to-trash/main/install.sh | bash
```

脚本会把 `rm-to-trash.ts` 下载到全局插件目录 `~/.config/opencode/plugins/`，检测废纸篓后端；若没有，会尽力自动安装（macOS 用 Homebrew，Linux 在可免密 `sudo` 时用 `trash-cli`）。即便自动安装失败也没关系——插件自带内置回退。安装后重启 OpenCode 即可生效。

可用环境变量覆盖来源：

```bash
RM_TO_TRASH_REPO=owner/repo RM_TO_TRASH_BRANCH=main \
  curl -fsSL https://raw.githubusercontent.com/Ryan9438/opencode-remove-to-trash/main/install.sh | bash
```

---

## 其他安装方式

### 1. 从 npm 安装（尚未发布）

在 `opencode.json` 的 `plugin` 数组中加上包名：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-remove-to-trash"]
}
```

### 2. 本地文件安装

把 `rm-to-trash.ts` 放到项目级或全局插件目录：

- 全局：`~/.config/opencode/plugins/`
- 项目级：`.opencode/plugins/`

也可以直接在 `opencode.json` 里写绝对路径：

```json
{
  "plugin": ["/absolute/path/to/rm-to-trash.ts"]
}
```

---

## 卸载

- 一键安装：删除 `~/.config/opencode/plugins/rm-to-trash.ts`
- 配置安装：从 `opencode.json` 的 `plugin` 数组里移除对应条目

---

## 常见问题

**为什么 `sudo rm` 没有被改写？**
命令位置检测只认可白名单里的前缀命令（`xargs`、`command`、`env`、`do`、`then` 等）。`sudo` 不在其中，且建议在权限配置里直接禁用 `sudo`。

**`rm` 后没有参数会被改写吗？**
不会。只有存在待删除路径时才会替换为 `trash`，`rm -f` 这种空操作保持原样。

**补丁只包含删除文件怎么办？**
插件会把文件移入废纸篓，并抛出提示说明补丁已无剩余操作，避免打开一个空补丁。

**找不到 `trash` / `trash-put` / `gio` 会怎样？**
插件会自动生成内置回退脚本作为后端，功能不受影响。只有连缓存目录都写不了时才会写一条 warn 日志并停用改写。

**内置回退把文件移到哪里了？**
macOS：`~/.Trash`；Linux：`~/.local/share/Trash`（遵循 XDG 规范，并写入 `.trashinfo` 以便文件管理器识别和还原）。

---

## 开发

```bash
bun install
bun test        # 单元测试
bun run typecheck
```

核心逻辑是纯函数 `rewriteRmCommand()` 与 `splitPatchDeletes()`，可独立测试。

---

## 许可证

[MIT](./LICENSE) © 2026 Ryan9438
