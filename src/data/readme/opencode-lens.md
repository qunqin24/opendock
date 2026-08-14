# opencode-lens

opencode-lens is a local automation bridge for live [opencode](https://opencode.ai/) TUI sessions. It combines an opencode TUI plugin, a Unix-socket HTTP API, an MCP server, a Hermes skill, and optional watchdog scripts so local agents can inspect and safely control running opencode instances without screen scraping.

Recommended GitHub description:

```text
opencode TUI bridge and MCP toolkit for inspecting, controlling, and safely automating live opencode sessions
```

## What It Does

- Discover active opencode TUI instances.
- Read the visible TUI session and status.
- Send prompts to a specific session in the background or switch the visible TUI session.
- Run a single prompt on a specific model with per-message `providerID` + `modelID`.
- Read recent messages, diffs, and todo state.
- Bridge opencode interactive questions to Hermes users.
- Approve or deny opencode permission prompts with explicit user intent.
- Close accidentally opened TUI overlays such as the model selector.
- Monitor instances for pending permissions, questions, and completion events.

## Repository Layout

```text
opencode-lens/
├── packages/
│   ├── plugin/          # opencode TUI plugin; exposes the lens Unix socket API
│   ├── mcp/             # stdio MCP server for Hermes and other MCP clients
│   └── shared/          # shared registry/types/discovery helpers
├── scripts/             # optional watchdog scripts
├── skill/               # Hermes/OpenClaw skill instructions
├── docs/                # HTTP API notes
├── package.json         # Bun workspace
├── tsconfig.json
├── bun.lock
└── LICENSE
```

## Architecture

```text
Hermes / MCP client
  └─ opencode-lens-mcp (stdio MCP server)
       ├─ discovers active lens registry files
       ├─ talks HTTP over per-user Unix sockets
       └─ exposes tools such as instances_list, tui_status, prompt_send

opencode TUI process
  └─ opencode-lens plugin
       ├─ writes an instance registry file
       ├─ serves HTTP over a Unix Domain Socket
       ├─ reads live TUI/session state through the opencode plugin API
       ├─ forwards selected operations through the opencode SDK
       └─ publishes status events for automation clients
```

The plugin does not open a TCP port. Registry files are written under:

```text
~/.local/share/opencode-lens/instances/
```

Sockets prefer:

```text
$XDG_RUNTIME_DIR/opencode-lens/
```

and fall back to:

```text
~/.local/share/opencode-lens/sockets/
```

## Requirements

- Bun 1.3+
- opencode with TUI plugin support
- Hermes or another MCP client if you want MCP automation

## Install From npm

There are two separate install surfaces:

- `opencode-lens` is an opencode TUI plugin. opencode can install/cache it automatically from npm when it sees the package name in the TUI config.
- `opencode-lens-mcp` is a stdio MCP server. Install or run it from the environment where Hermes starts MCP servers.

### opencode TUI plugin

Install the plugin with opencode's plugin installer:

```bash
opencode plugin opencode-lens --global --force
```

The installer should report `Detected server + tui targets` and add the package to both opencode's server plugin config and TUI plugin config. The resulting `~/.config/opencode/tui.json` should include:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-lens"]
}
```

Restart opencode. opencode resolves and caches npm plugin packages under `~/.cache/opencode/packages/`.

You can also install the plugin manually, but this is usually unnecessary for normal opencode plugin usage and does not replace the `tui.json` registration:

```bash
npm install -g opencode-lens
```

### Hermes MCP server

For Hermes, either run the MCP server through `npx`:

```yaml
mcp_servers:
  opencode-lens:
    command: npx
    args:
      - -y
      - --registry=https://registry.npmjs.org/
      - opencode-lens-mcp
    enabled: true
    timeout: 30
    connect_timeout: 10
```

or install it globally:

```bash
npm install -g opencode-lens-mcp
```

and configure Hermes with the installed binary:

```yaml
mcp_servers:
  opencode-lens:
    command: opencode-lens-mcp
    enabled: true
    timeout: 30
    connect_timeout: 10
```

Restart Hermes after installing or updating the MCP package so the tool list is reloaded. The `npx` example pins the official npm registry because regional mirrors can lag behind new `opencode-lens-mcp` releases.

If you want both npm packages installed globally for local development, use:

```bash
npm install -g opencode-lens opencode-lens-mcp
```

The opencode TUI plugin still needs to be registered in `tui.json` even when globally installed:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-lens"]
}
```

## Verify npm Packages

Check the published package metadata:

```bash
npm view opencode-lens version dist.tarball --registry=https://registry.npmjs.org/
npm view opencode-lens-mcp version bin dist.tarball --registry=https://registry.npmjs.org/
```

Smoke-test in a clean temporary directory:

```bash
mkdir /tmp/opencode-lens-npm-verify
cd /tmp/opencode-lens-npm-verify
npm init -y
npm install opencode-lens opencode-lens-mcp --registry=https://registry.npmjs.org/
```

The plugin bundle depends on Bun runtime features used by opencode, so validate import with Bun rather than Node:

```bash
bun --eval 'const plugin = await import("opencode-lens"); console.log(Object.keys(plugin).join(","));'
```

Validate the MCP server by asking it for its tool list:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"verify","version":"0.0.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | npx -y --registry=https://registry.npmjs.org/ opencode-lens-mcp
```

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
```

Build standalone MCP binaries when needed:

```bash
bun run build:mcp:binaries
```

## Install The TUI Plugin From Source

Build the plugin:

```bash
bun run --cwd packages/plugin build
```

Install the built plugin into opencode's TUI plugin directory:

```bash
mkdir -p ~/.config/opencode/plugins
cp packages/plugin/dist/index.js ~/.config/opencode/plugins/opencode-lens.js
```

Register it in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./plugins/opencode-lens.js"]
}
```

Restart opencode after changing the plugin bundle. Already-running opencode TUI processes keep the old plugin code loaded.

## Configure Hermes MCP

If you installed from npm, use `command: opencode-lens-mcp` as shown above. For source checkouts, build the MCP server:

```bash
bun run --cwd packages/mcp build
```

Example Hermes MCP configuration:

```yaml
mcp_servers:
  opencode-lens:
    command: /path/to/bun
    args:
      - /path/to/opencode-lens/packages/mcp/dist/opencode-lens-mcp.js
    enabled: true
    timeout: 30
    connect_timeout: 10
```

Restart Hermes after changing MCP tools. MCP tools are registered when Hermes starts.

See `docs/configuration.md` for systemd-safe Node configuration, `doctor` diagnostics, and watchdog tuning.

## Install The Hermes Skill

Copy the skill into Hermes:

```bash
mkdir -p ~/.hermes/skills/opencode-lens
cp skill/SKILL.md ~/.hermes/skills/opencode-lens/SKILL.md
rm -f ~/.hermes/.skills_prompt_snapshot.json
```

The skill tells Hermes agents how to use the MCP tools safely. In particular, it requires concise status tables, explicit permission choices, per-message model selection, and safe handling of interactive questions.

## Optional Watchdog Scripts

Copy the watchdog scripts if you want polling-based notifications:

```bash
mkdir -p ~/.hermes/scripts
cp scripts/opencode-watch.py ~/.hermes/scripts/opencode-watch.py
cp scripts/opencode-watch-loop.sh ~/.hermes/scripts/opencode-watch-loop.sh
chmod +x ~/.hermes/scripts/opencode-watch.py ~/.hermes/scripts/opencode-watch-loop.sh
```

Run one poll:

```bash
~/.hermes/scripts/opencode-watch.py
```

Run a simple polling loop:

```bash
~/.hermes/scripts/opencode-watch-loop.sh
```

Useful environment variables:

```text
OPENCODE_LENS_SOCKET_DIR       defaults to $XDG_RUNTIME_DIR/opencode-lens or /run/user/$UID/opencode-lens
OPENCODE_WATCH_STATE_FILE      defaults to ~/.hermes/opencode-watch-state.json
OPENCODE_WATCH_LIST_FILE       defaults to ~/.hermes/opencode-watch-list.json
OPENCODE_WATCH_LOCK_FILE       defaults to ~/.hermes/opencode-watch.lock
OPENCODE_WATCH_RUNNING_NOTICE_AFTER_SEC      defaults to 600
OPENCODE_WATCH_RUNNING_NOTICE_INTERVAL_SEC   defaults to 900
OPENCODE_WATCH_SCRIPT          used by opencode-watch-loop.sh
```

Permission alerts include a coarse `风险` label, and tracked running sessions emit periodic `仍在执行` reminders after the configured threshold.

## MCP Tool Highlights

- `instances_list`: list active opencode lens instances; compact by design and does not include historical sessions.
- `sessions_list`: list recent session summaries for one instance with an explicit `limit`.
- `tui_status`: read the visible TUI session/status for an instance.
- `prompt_send`: send a prompt to a target session; supports per-message model parameters.
- `messages_read`: read recent messages for a session.
- `tui_session_switch`: switch the visible TUI session.
- `question_respond` / `question_reject`: answer or dismiss opencode interactive questions.
- `permission_respond`: reply to permission prompts with `allow`, `always`, or `deny`.
- `model_selector_close`: close the currently open TUI overlay/dialog when the runtime exposes `api.ui.dialog.clear()`.

## Model Selection

opencode 1.17.x chooses the model per message. The reliable workflow is:

1. Call `models_list`.
2. Match the desired provider/model IDs.
3. Send the prompt with `prompt_send` and `providerID` + `modelID`.

Do not rely on moving the TUI's visible model indicator. The plugin API does not provide a stable way to set that indicator to an arbitrary model by ID.

## Permission And Question Safety

Permission replies are high-risk. Always show the user the requested operation and ask for one of three choices:

- `allow once`
- `allow always`
- `deny`

Interactive questions are separate from permissions. They must be answered with `question_respond`; sending normal prompt text does not select an option.

## Troubleshooting

- No instances: confirm `~/.config/opencode/tui.json` contains `"plugin": ["opencode-lens"]`, then restart opencode.
- Stale opencode plugin cache: if `opencode plugin opencode-lens --global --force` reports only `Detected server target`, opencode may have cached an older npm package under `~/.cache/opencode/packages/opencode-lens@latest`. Remove that single cache directory, reinstall, and restart opencode:

```bash
rm -rf ~/.cache/opencode/packages/opencode-lens@latest
opencode plugin opencode-lens --global --force
```

  The reinstall should report `Detected server + tui targets`. After restart, verify a socket appears under `$XDG_RUNTIME_DIR/opencode-lens/` or `/run/user/$UID/opencode-lens/`.
- MCP tool missing: rebuild `packages/mcp`, then restart Hermes.
- Plugin behavior did not change: restart the target opencode TUI process.
- Prompt returns `409 session_busy`: inspect `tui_status`; the session may be running, waiting for a question, or waiting for permission.
- Permission prompt does not appear: the target opencode permission rules may be configured as auto-allow instead of ask.
- Status reads time out: the plugin caps slow opencode SDK calls and returns structured timeout errors instead of Bun's default 10-second server timeout.

## License

MIT
