# opencode-file-widget

[GitHub Repository](https://github.com/guzongbo/opencode-file-widget) · [Issues](https://github.com/guzongbo/opencode-file-widget/issues)

A file-transfer widget for **OpenCode V2**. It adds a session-sidebar uploader, `/upload` and `/download` commands, local transfer history, and a settings panel for transfer behavior.

English | [简体中文](#简体中文)

## English

### Features

- **Sidebar widget**: choose a local file from the session sidebar, upload it to the OpenCode server, and copy the returned `@path`.
- **`/upload`**: open a local file picker, or upload a path directly.
- **`/download`**: download a server file to the local client.
  - `/download @`: use OpenCode's `@` file completion to select a server file.
  - `/download`: open a server file picker.
  - `/download /absolute/path`: download a specific path.
- **History**: successful and failed transfers are saved in the TUI-local storage. The sidebar shows the latest entries.
- **Settings**: `⚙ 设置` or `/files-settings` opens a settings page with draft/save/discard behavior.
- **Transfer modes**: `basic` (base64 JSON), `binary` (raw OpenCode file API), and `auto` (prefer binary, fall back to basic).
- **Cross-platform TUI**: macOS, Linux, and Windows, with native file dialogs/clipboard/file-manager helpers where available.

### Requirements

- OpenCode **V2.2.5 or newer**.
- The server part runs on the OpenCode server.
- The TUI part runs on the machine where files are selected and downloads are saved.
- macOS: built-in `osascript`, `pbcopy`, and `open` are used.
- Linux: `zenity` or `kdialog`, plus `wl-copy` or `xclip`, and `xdg-open`.
- Windows: PowerShell, `clip`, and Explorer.

### How it works

The package has two parts:

- `.` (`src/index.ts`): server plugin. Handles upload storage, download validation, cleanup, and RPC.
- `./tui` (`src/tui.tsx`): TUI plugin. Renders the sidebar and settings page, handles file dialogs, clipboard, and download paths.

The server and client can be on the same machine or on different machines.

### Installation

#### 1. Server

Install the package through OpenCode:

```bash
opencode plugin add opencode-file-widget
```

Or add it manually to the global or project `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-file-widget",
      "options": {
        "uploadRoot": "/tmp/opencode/uploads",
        "allowRoots": ["/home/me/projects", "/tmp/opencode/uploads"],
        "maxBytes": 52428800,
        "ttlHours": 24,
        "binaryEnabled": true
      }
    }
  ]
}
```

Server options:

| Option | Default | Description |
| --- | --- | --- |
| `uploadRoot` | `/tmp/opencode/uploads` | Upload destination. Each upload gets a random subdirectory. |
| `allowRoots` | Current project directory + `uploadRoot` | Directories `/download` may read. `uploadRoot` is always allowed. |
| `maxBytes` | `52428800` (50 MB) | Maximum upload/download size. Enforced by the server. |
| `ttlHours` | `24` | Upload subdirectory retention time. Cleanup runs hourly. |
| `binaryEnabled` | `true` | Enables the experimental binary transfer path. Set to `false` to force `basic`. |

Configuration changes reload automatically. If the plugin is not picked up, run `/reload` or restart the TUI.

#### 2. Client

On the machine running the TUI, add the TUI part to `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```jsonc
{
  "plugins": [
    {
      "package": "opencode-file-widget",
      "options": {
        "downloadDir": "~/Downloads"
      }
    }
  ]
}
```

`downloadDir` supports `~`, `~/...`, and absolute paths. The built-in default is `~/Downloads`. The environment variable `OPENCODE_FILE_WIDGET_DOWNLOAD_DIR` is used as a fallback when `downloadDir` is not configured.

If the OpenCode server and TUI run on the same machine, configuring the package in `opencode.json(c)` is usually enough; the CLI loads its TUI part automatically. For a remote server, the local TUI needs the `cli.json` entry above.

The TUI must connect to the server that loaded the plugin. If you use a remote server, use your existing remote connection method, for example:

```bash
opencode --server http://<server>:<port>
```

> If you run the TUI over SSH, downloads and clipboard operations run on the remote machine, not on your local Mac.

#### 3. Local development install

To use a checkout instead of the npm package:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-file-widget",
      "options": {
        "downloadDir": "~/Downloads"
      }
    }
  ]
}
```

### Usage

#### Sidebar

```text
──────────────────────────────
📦 文件传输                    ⚙ 设置

⇡ 点击选择并上传文件

最新服务器路径:              [复制 @]
…/uploads/8a1f/report.xlsx

近期记录                  全部 (12)

● ↑ report.xlsx                 14:32
● ↓ data.csv                    14:20
● ↑ broken.zip                  14:10
```

- `●` green = success, red = failure.
- `↑` green = upload, `↓` blue = download.
- Clicking a successful upload copies its path.
- Clicking a successful download reveals the local file.
- Clicking a failed record shows the error.
- `全部 (N)` opens the full history.

#### Commands

```text
/upload
/upload /Users/me/report.xlsx

/download @docs/report.xlsx
/download
/download /path/on/server/report.xlsx

/files-settings
```

`/upload`, `/download`, and `/files-settings` also appear in the `Ctrl+P` command palette.

#### Settings

`⚙ 设置` opens the settings panel. Changes are kept as a draft until you choose **Save and close**; `Esc` and **Discard changes** do not save.

| Setting | Scope | Notes |
| --- | --- | --- |
| Download directory | Client | Local path on the TUI machine. |
| Upload root | Server | Read-only display. |
| Max file size | Server | Read-only; change `maxBytes` in server config. |
| Transfer mode | Client preference + server capability | `auto`, `basic`, or `binary`. |
| Copy format | Client | `@path` or plain path. |
| Auto copy after upload | Client | Hides the copy button and copies automatically. |
| Reveal file after download | Client | Opens the file manager when download succeeds. |
| Show file size | Client | Adds size to history rows. |
| Recent history | Client | Show/hide the sidebar history block. |
| Recent entry count | Client | 3, 5, 8, or 10. |
| Clear history | Client | Clears local history immediately after confirmation. |
| Restore defaults | Client | Resets the draft; save to apply. |

`maxBytes` is intentionally server-side only. Allowing the client to override it would bypass the server limit.

### Transfer modes

| Mode | Behavior |
| --- | --- |
| `basic` | Existing RPC path. The file is base64-encoded and sent as JSON. Best compatibility. |
| `binary` | Uses OpenCode's binary file API. Uploads use `prepareUpload` → `experimental.file.write` → `finishUpload`; downloads use `prepareDownload` → `file.read`. |
| `auto` | Prefers `binary` when the server supports it and falls back to `basic` on failure. |

`binary` is experimental and depends on OpenCode's experimental file APIs. The server can disable it with `binaryEnabled: false`. The binary download wrapper still reads the file into memory before writing it locally; for very large files, use `scp`.

### Security

- Uploads and downloads use OpenCode's existing client authentication. Do not expose an additional public endpoint.
- Download paths are validated against `allowRoots` with `realpath`.
- Uploaded file names are normalized and sanitized; upload directories are `0700` and files are `0600`.
- `maxBytes` limits both upload and download.
- Binary uploads use a server-created target path; the server verifies the final size and permissions.
- Binary mode is experimental. OpenCode's built-in file API can be called directly by a trusted client, so `allowRoots` is not a complete sandbox for that API.
- Upload subdirectories are removed after `ttlHours`; incomplete binary uploads are removed by `abortUpload` or TTL cleanup.

### Troubleshooting

- **Plugin not loaded / RPC not found**  
  Check that the server `opencode.json(c)` includes the package and that OpenCode reloaded. Run `/reload` if needed.

- **Slash commands are missing**  
  Check that the TUI part is loaded in `cli.json` and that the TUI is connected to the same server. Restart the TUI or run `/reload`.

- **File picker does not open**  
  macOS: check `osascript`; Linux: install `zenity` or `kdialog`; Windows: check PowerShell. On macOS, grant Terminal/OpenCode access to files and folders.

- **Copy fails**  
  macOS: `pbcopy`; Linux: `wl-copy` or `xclip`; Windows: `clip`. Under SSH, the clipboard belongs to the remote machine.

- **“Path is not allowed”**  
  Add the target directory to server `allowRoots`. `uploadRoot` is always allowed.

- **Binary transfers always fall back to basic**  
  Check `binaryEnabled` and the OpenCode version. `auto` falls back silently; forced `binary` reports the failure and then falls back.

- **Settings do not take effect**  
  Settings use a draft. Choose **Save and close**; `Esc` and **Discard changes** do not persist.

### Development

The package exports TypeScript source and needs no build step. OpenCode transpiles it when loading.

```bash
npm install
npm run typecheck
npm run pack:check
```

Optional manual bundle check:

```bash
npx --yes esbuild@0.25.0 src/index.ts src/tui.tsx \
  --bundle --external:'*' --outdir=/tmp/opencode/file-widget-check
```

### Publishing

Releases are published to npm from GitHub Actions when a GitHub Release is published, or manually through the `Publish npm` workflow with `dry_run` enabled first.

The repository workflow expects an `NPM_TOKEN` secret with publish access. It runs `npm ci`, typecheck, `npm pack --dry-run`, checks that the release tag matches the package version, and publishes with provenance:

```bash
npm publish --provenance --access public
```

Alternatively, configure npm Trusted Publishing for this repository/workflow and remove `NPM_TOKEN`; keep `id-token: write` in the workflow.

### License

MIT. See [LICENSE](./LICENSE).

---

## 简体中文

OpenCode V2 的文件传输小组件：在会话侧边栏上传本地文件，用 `/download` 下载服务器文件，并管理传输历史和设置。

### 功能

- **侧边栏小组件**：选择本地文件 → 上传到 OpenCode 服务器 → 显示服务器路径 → 复制 `@路径`。
- **`/upload`**：打开本地文件选择框，或直接上传指定路径。
- **`/download`**：下载服务器文件到客户端本机。
  - `/download @`：使用 OpenCode 内置的 `@` 文件补全；
  - `/download`：弹出服务器文件选择器；
  - `/download /absolute/path`：直接按路径下载。
- **历史**：成功和失败都保存在 TUI 本地；侧边栏显示最近记录。
- **设置**：`⚙ 设置` 或 `/files-settings` 打开设置页，支持保存/放弃。
- **传输模式**：`basic`（base64 JSON）、`binary`（原始二进制）、`auto`（优先二进制，失败回退）。
- **跨平台 TUI**：macOS、Linux、Windows。

### 前置要求

- OpenCode **V2.2.5 或更高版本**。
- 服务端 part 运行在 OpenCode 服务器上。
- TUI part 运行在“选择文件、保存下载、使用剪贴板”的机器上。
- macOS 使用系统自带 `osascript`、`pbcopy`、`open`。
- Linux 需要 `zenity` 或 `kdialog`，以及 `wl-copy` 或 `xclip`、`xdg-open`。
- Windows 使用 PowerShell、`clip` 和 Explorer。

### 工作原理

这个包包含两个部分：

- `.`（`src/index.ts`）：服务端插件，负责上传落盘、下载校验、清理和 RPC。
- `./tui`（`src/tui.tsx`）：TUI 插件，负责侧边栏、设置页、文件选择、剪贴板和下载落盘。

服务端和客户端可以在同一台机器，也可以分开部署。

### 安装

#### 1. 服务端

通过 OpenCode 安装：

```bash
opencode plugin add opencode-file-widget
```

或手动写入全局/项目 `opencode.json(c)`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-file-widget",
      "options": {
        "uploadRoot": "/tmp/opencode/uploads",
        "allowRoots": ["/home/me/projects", "/tmp/opencode/uploads"],
        "maxBytes": 52428800,
        "ttlHours": 24,
        "binaryEnabled": true
      }
    }
  ]
}
```

服务端配置：

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `uploadRoot` | `/tmp/opencode/uploads` | 上传落盘目录；每次上传使用随机子目录。 |
| `allowRoots` | 当前项目目录 + `uploadRoot` | `/download` 允许读取的目录；`uploadRoot` 始终允许。 |
| `maxBytes` | `52428800`（50 MB） | 上传/下载的单文件上限，由服务端强制。 |
| `ttlHours` | `24` | 上传子目录保留时长；每小时清理一次。 |
| `binaryEnabled` | `true` | 是否启用实验性二进制传输；设为 `false` 强制 `basic`。 |

修改配置后 OpenCode 会自动重载；如果没有生效，执行 `/reload` 或重启 TUI。

#### 2. 客户端

在运行 TUI 的机器上，把 TUI part 加入 `~/.config/opencode/cli.json`（或 `$XDG_CONFIG_HOME/opencode/cli.json`）：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-file-widget",
      "options": {
        "downloadDir": "~/Downloads"
      }
    }
  ]
}
```

`downloadDir` 支持 `~`、`~/...` 和绝对路径，默认 `~/Downloads`。未配置时会读取环境变量 `OPENCODE_FILE_WIDGET_DOWNLOAD_DIR`。

如果 OpenCode 服务和 TUI 在同一台机器上，通常只需要在 `opencode.json(c)` 中配置一次；CLI 会自动加载 TUI part。跨机部署时，本地 TUI 需要单独配置 `cli.json`。

Mac 端 TUI 必须连接到加载了插件的服务端；远程连接方式以你现有配置为准，例如：

```bash
opencode --server http://<server>:<port>
```

> 如果在 SSH 中运行 TUI，下载和剪贴板操作发生在远端机器，不是你本地 Mac。

#### 3. 本地开发安装

不发布 npm 时，可以直接指向本地目录：

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-file-widget",
      "options": {
        "downloadDir": "~/Downloads"
      }
    }
  ]
}
```

### 使用

#### 侧边栏

```text
──────────────────────────────
📦 文件传输                    ⚙ 设置

⇡ 点击选择并上传文件

最新服务器路径:              [复制 @]
…/uploads/8a1f/report.xlsx

近期记录                  全部 (12)

● ↑ report.xlsx                 14:32
● ↓ data.csv                    14:20
● ↑ broken.zip                  14:10
```

- `●` 绿色=成功，红色=失败；
- `↑` 绿色=上传，`↓` 蓝色=下载；
- 点击成功上传记录复制路径；
- 点击成功下载记录定位本地文件；
- 点击失败记录查看错误；
- `全部 (N)` 打开完整历史。

#### 命令

```text
/upload
/upload /Users/me/report.xlsx

/download @docs/report.xlsx
/download
/download /path/on/server/report.xlsx

/files-settings
```

`/upload`、`/download`、`/files-settings` 也会出现在 `Ctrl+P` 命令面板中。

#### 设置

`⚙ 设置` 打开设置页。修改先进入草稿，点击 **保存并关闭** 才生效；`Esc` 和 **放弃修改** 不保存。

| 设置 | 归属 | 说明 |
| --- | --- | --- |
| 下载目录 | 客户端 | TUI 所在机器的本地路径。 |
| 上传根目录 | 服务端 | 只读展示。 |
| 单文件上限 | 服务端 | 只读；修改服务端 `maxBytes`。 |
| 传输方案 | 客户端偏好 + 服务端能力 | `auto` / `basic` / `binary`。 |
| 复制格式 | 客户端 | `@路径` 或纯路径。 |
| 上传后自动复制 | 客户端 | 隐藏复制按钮并自动复制。 |
| 下载后定位文件 | 客户端 | 下载成功后打开文件管理器。 |
| 显示文件大小 | 客户端 | 在历史记录中显示大小。 |
| 近期记录 | 客户端 | 显示/隐藏侧边栏历史区域。 |
| 显示条数 | 客户端 | 3 / 5 / 8 / 10。 |
| 清空历史 | 客户端 | 确认后立即清空本地历史。 |
| 恢复默认 | 客户端 | 重置草稿，保存后生效。 |

`maxBytes` 故意只放在服务端，避免客户端绕过限制。

### 传输模式

| 模式 | 行为 |
| --- | --- |
| `basic` | 使用 RPC + base64 JSON 传输，兼容性最好。 |
| `binary` | 使用 OpenCode 二进制文件 API：上传走 `prepareUpload` → `experimental.file.write` → `finishUpload`；下载走 `prepareDownload` → `file.read`。 |
| `auto` | 服务端支持 binary 时优先 binary，失败自动回退 basic。 |

`binary` 依赖 OpenCode 实验性文件 API，可能随版本变化；服务端可用 `binaryEnabled: false` 禁用。二进制下载仍会先读入内存再落盘，超大文件建议使用 `scp`。

### 安全

- 上传/下载使用 OpenCode 现有客户端鉴权，不要额外暴露公网接口。
- 下载路径通过 `realpath` 和 `allowRoots` 校验。
- 文件名会规范化并清洗；上传目录为 `0700`，文件为 `0600`。
- `maxBytes` 同时限制上传和下载。
- 二进制上传只使用服务端生成的路径，并在完成时校验大小和权限。
- 二进制模式是实验性能力。OpenCode 内置文件 API 可以被受信任客户端直接调用，因此 `allowRoots` 不是完整沙箱。
- 上传子目录按 `ttlHours` 清理；未完成的二进制上传由 `abortUpload` 或 TTL 清理。

### 故障排查

- **插件未加载 / RPC 找不到**  
  检查服务端 `opencode.json(c)` 是否加载本包，并执行 `/reload`。

- **`/download` 等命令不出现**  
  检查 TUI part 是否在 `cli.json` 中加载，以及 TUI 是否连接到同一个服务端。重启 TUI 或执行 `/reload`。

- **文件选择框打不开**  
  macOS 检查 `osascript`，Linux 安装 `zenity`/`kdialog`，Windows 检查 PowerShell。macOS 需要在“隐私与安全性 → 文件与文件夹”中授权。

- **复制失败**  
  macOS 检查 `pbcopy`，Linux 检查 `wl-copy`/`xclip`，Windows 检查 `clip`。SSH 下剪贴板属于远端机器。

- **提示路径不在允许范围内**  
  把目录加入服务端 `allowRoots`；`uploadRoot` 始终允许。

- **二进制传输总是回退**  
  检查服务端 `binaryEnabled` 和 OpenCode 版本；`auto` 会静默回退，强制 `binary` 会提示错误后回退。

- **设置不生效**  
  设置页使用草稿，必须点击 **保存并关闭**；`Esc` 和 **放弃修改** 不会保存。

### 开发

包直接导出 TypeScript 源码，OpenCode 加载时转译，不需要构建步骤。

```bash
npm install
npm run typecheck
npm run pack:check
```

可选的手动 bundle 检查：

```bash
npx --yes esbuild@0.25.0 src/index.ts src/tui.tsx \
  --bundle --external:'*' --outdir=/tmp/opencode/file-widget-check
```

### 发布

GitHub Release 发布后，GitHub Actions 会执行 npm 发布；也可以手动触发 `Publish npm` workflow，先使用 `dry_run`。

仓库需要配置有发布权限的 `NPM_TOKEN` secret。Workflow 会执行 `npm ci`、类型检查、`npm pack --dry-run`、版本 tag 校验，并带 provenance 发布：

```bash
npm publish --provenance --access public
```

也可以改用 npm Trusted Publishing，绑定本仓库和 workflow 后删除 `NPM_TOKEN`，保留 `id-token: write`。

### 许可证

MIT。见 [LICENSE](./LICENSE)。
