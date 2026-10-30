# OpenCode E2B Plugin

E2B sandboxes for OpenCode. One package supports both OpenCode releases:

- **OpenCode 1** (`opencode-ai`): the plugin registers an `e2b` type for OpenCode's experimental workspace API. A workspace runs OpenCode itself in an E2B sandbox. The sections from [Install](#install) on describe this mode.
- **OpenCode 2** (`@opencode/cli`): OpenCode 2 has no workspace API for plugins. The plugin runs every shell command of your local OpenCode in an E2B sandbox instead, and keeps your files on your machine. For long tasks, a box runs OpenCode itself in a sandbox. See [OpenCode 2](#opencode-2).

The package's default export carries both entry points: OpenCode 1 calls `server`, OpenCode 2 calls `setup`, and each loads only its own code.

## Install

The package is [`@e2b/opencode`](https://www.npmjs.com/package/@e2b/opencode). Register it in your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@e2b/opencode",
      {
        "nodeVariant": "22-slim",
        "sandboxTimeoutMs": 3600000
      }
    ]
  ]
}
```

Start OpenCode with workspace support enabled:

```bash
E2B_API_KEY=... OPENCODE_EXPERIMENTAL_WORKSPACES=true opencode
```

## OpenCode 2

Two ways to use E2B with OpenCode 2:

- **Shell mode** (the plugin): OpenCode stays on your machine, and its shell commands run in a sandbox.
- **Boxes** (`opencode-e2b box`): OpenCode itself runs in a sandbox, for a task that runs on without your machine. You attach to it with your TUI and pull the work home as a branch.

### Shell mode

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/shell-dark.png">
  <img alt="Shell mode: OpenCode on your machine sends each shell command to the project sandbox, with your changes first, and gets the output and changed files back" src="assets/shell.png">
</picture>

OpenCode runs on your machine. Every shell command that it runs (the agent's and your `!` commands) runs in an E2B sandbox, at the same path as on your machine. Reading and editing files stays local, so diffs, undo and the file picker work as usual.

```bash
opencode plugin add @e2b/opencode
```

Or per project, with options:

```jsonc
// opencode.jsonc
{
  "plugins": [{ "package": "@e2b/opencode", "options": { "domain": "e2b-juliett.dev" } }],
}
```

Set `E2B_API_KEY`.

How it works:

1. The plugin hooks `shell.create.before` and swaps the shell for a small shim (`bin/bash`). OpenCode keeps its own permission rules, timeouts, background jobs and output handling.
2. Before each command, files you changed go to the sandbox. Git decides what to send, so ignored files (`node_modules`, `.env`) never leave your machine.
3. After the command, files it changed come back. If you edited the same file meanwhile, your version stays and the sandbox version goes to `.git/opencode-e2b/conflicts/`.
4. One sandbox per project. It starts when you send a prompt, pauses when idle and resumes on the next command.

With nothing to sync, a command costs one round trip to E2B: about 0.13 s from Europe to the EU region, 0.27 s to the US region. The first upload of a large project is split into chunks (a 150 MB tree takes about 30 s, once).

Git: a plain git command (`git add .`, `git commit -m "..."`, `git checkout -b x`) runs on your machine, where the real repository is, with git hooks off. History changes inside a longer command (`npm test && git commit`) are blocked with a message. The sandbox gets `.git` one way, so git can read history there too.

| Option        | Default                   | Meaning                                                                                                                                                                                                                                                                                              |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`      | `E2B_DOMAIN` or `e2b.app` | E2B region: `e2b.app` (US), `e2b-juliett.dev` (EU), `e2b-tango.dev` (APAC). The API key must belong to that region.                                                                                                                                                                                  |
| `template`    | `opencode`                | Template for new sandboxes                                                                                                                                                                                                                                                                           |
| `idleMinutes` | `15`                      | Idle time before the sandbox pauses                                                                                                                                                                                                                                                                  |
| `boxHours`    | `1`                       | How long a box from `/e2b-box up` runs before it pauses. The E2B plan caps this.                                                                                                                                                                                                                     |
| `env`         | `[]`                      | Names of environment variables to pass to commands. Nothing else from your environment goes to the sandbox.                                                                                                                                                                                          |
| `git`         | `"auto"`                  | Send `.git` to the sandbox: `"auto"` up to 200 MB, `true` always, `false` never                                                                                                                                                                                                                      |
| `network`     | none                      | `{ "allowOut": [...], "denyOut": [...] }`                                                                                                                                                                                                                                                            |
| `secrets`     | none                      | Host to E2B secret name, for example `{ "api.github.com": "github-token" }`. E2B's egress proxy adds `Authorization: Bearer <value>` to HTTPS requests to that host; the sandbox never sees the value. Map a secret only to the real API host: a host that echoes headers lets sandbox code read it. |

Tools for the agent: `e2b_preview_url` (public link to a port), `e2b_read` (files that exist only in the sandbox), `e2b_status`.

Commands: `/e2b-status`, `/e2b-pull <path>` (copy sandbox-only files such as `dist`), `/e2b-snapshot` and `/e2b-snapshot clear` (start new sandboxes from the current one, with its installed dependencies), `/e2b-reset`, `/e2b-off`, `/e2b-on`.

Limits: the project must be a git repository; submodule contents and a linked worktree's history are not synced; gitignored build output stays in the sandbox (use `e2b_read` or `/e2b-pull`).

### Boxes

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/box-dark.png">
  <img alt="Box mode: box up sends the project with its git history to a box running the OpenCode server; your TUI attaches to it; the box reaches the model API with a key that E2B adds; box pull brings the work home as branch e2b/name" src="assets/box.png">
</picture>

A box is a sandbox with your project and an OpenCode 2 server in it. The agent keeps working when your laptop sleeps. Each box is one task.

```bash
npm install -g @e2b/opencode         # the opencode-e2b command
opencode-e2b secrets set anthropic   # once: stores ANTHROPIC_API_KEY (or stdin) as an E2B secret
opencode-e2b box up --attach         # start a box named after the branch, open the TUI on it
opencode-e2b box pull                # the box's work, uncommitted files too, as branch e2b/<name>
opencode-e2b box kill
```

| Command | What it does |
| --- | --- |
| `box up [name]` | Uploads the project (tracked and uncommitted files, and `.git`) to the same path in a new sandbox, and starts `opencode2 serve` there. Options: `--template`, `--hours` (default 1), `--attach`. |
| `box attach [name]` | Wakes the box if it is paused, then runs your local `opencode2 --server <box>`. |
| `box pull [name]` | Commits the box's work in progress on a scratch ref (the agent's branch and index stay as they are) and fetches it as a git bundle into `e2b/<name>`. No credentials go to the box. |
| `box list`, `box stop`, `box kill` | List the boxes this machine started, pause one, delete one. |
| `secrets set\|list\|remove <provider>` | Model keys for boxes: `anthropic`, `openai`, `openrouter`. |

The name defaults to the current branch, or to the project's only box. In OpenCode, `/e2b-box up|pull|list|stop|kill` and `/e2b-secrets` do the same. `/e2b-secrets set` takes the key from OpenCode's environment, never from the prompt.

Model keys: a box gets a placeholder, and E2B's egress proxy puts the stored secret into requests to the provider's API. No process in the box holds the key. The box offers only the providers with a stored key, and commits with your git `user.name` and `user.email`.

Each box has a random server password. It is stored with the box record in `~/.local/state/opencode-e2b/boxes/` (readable only by you), and never sent to E2B as metadata.

A box pauses after `--hours`; attach wakes it. E2B plans cap the run time (1 hour on the lower plans).

## Development

```bash
bun run typecheck
bun run lint          # oxlint with the anti-slop rules
bun run format:check  # oxfmt
bun run test
```

`bun run check` runs all four. To try a checkout in OpenCode, run `bun install && bun run build` and use the folder's absolute path in place of `@e2b/opencode` in the config.

The diagrams are built from `assets/diagrams/*.html` with `assets/diagrams/build.sh`. Lint rules are errors in `src/v2` and `src/index.ts`, and warnings in older code until each rule is cleaned up there. The anti-slop rules are vendored in `tools/oxlint/anti-slop` (see its `VENDOR.md`).

Releases: add a changeset with `bunx changeset`, merge it, then run `gh workflow run release.yml --ref main`. The workflow versions, publishes to npm over trusted publishing and tags. Do not run `changeset version` locally.

The plugin is loaded by OpenCode's Bun runtime and uses Bun as its development runtime. `bun run test` builds `dist/` first, then runs the Bun test runner against `test/*.test.ts`.

Layout:

| Folder         | What it holds                                                                             | Imports                         |
| -------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| `src/core/`    | Shared E2B code: SDK setup and attribution, sandboxes, templates, cleanup, upload, config | No OpenCode packages            |
| `src/v1/`      | OpenCode 1: workspace adapter, bootstrap, compatibility checks                            | `@opencode-ai/plugin`           |
| `src/v2/`      | OpenCode 2: shell hook, sync, sandbox per project, tools and commands; boxes and the CLI  | `@opencode/plugin` (types only) |
| `src/index.ts` | The default export with both entry points, each loaded on first use                       | type imports only               |

## Runtime Behavior

The plugin builds sandboxes from a local workspace wrapper template. That wrapper first tries to layer on top of the published E2B template `e2b/opencode:v<runtimeVersion>`. E2B cannot call `get_tags` across teams, so the plugin does not preflight published template tags; it tries the published base directly and falls back if that wrapper build fails. If the published runtime template is unavailable, the plugin builds a managed base template from the configured Node image and installs the pinned OpenCode runtime there, then builds the same workspace wrapper on top of that base.

Managed base and workspace templates use the `opencode-e2b-` alias prefix. Base templates are keyed by Node image, OpenCode runtime version, and plugin package version. Workspace wrapper templates are keyed by the selected base template, project path, server port, and plugin package version.

On workspace create, the plugin:

- finds an existing compatible sandbox for the workspace or creates a new one;
- uploads the local project snapshot into the sandbox;
- ensures the uploaded project has a git repository with the snapshot committed, and writes `.git/opencode`;
- writes per-workspace OpenCode env values to `/tmp/.opencode-e2b.env`;
- releases the managed workspace template's marker-gated systemd `opencode serve` service;
- waits for `/global/health`, then for the sync endpoints (`/global/event` and `/sync/history`) before returning the remote workspace target.

OpenCode persists `configure()` before `create()`, so the plugin does not store E2B sandbox IDs in the OpenCode workspace row. Instead it writes workspace metadata to E2B and later finds sandboxes with `Sandbox.list`.

## Session Warp

_Session warp_ moves a session's sync history into a target workspace — or detaches it back to the local project. It runs through OpenCode's `experimental/workspace/warp` endpoint.

When a session is warped out of a workspace, OpenCode offers to move the workspace's file changes with it. Those changes are the sandbox repository's working-tree diff against the snapshot the plugin committed at bootstrap, applied as a patch to your project: your local history is untouched, and work the agent commits inside the sandbox does not travel back. Your project must be a git repository root for the patch to apply.

> **Heads up:** OpenCode's experimental workspace API is still unstable, so re-check this when bumping the supported runtime.

## Known limitations

**1. Experimental foundation.**
This plugin uses the `experimental_workspace` API of OpenCode. You must set `OPENCODE_EXPERIMENTAL_WORKSPACES=true`. OpenCode can change this API without notice.

**2. macOS and Linux hosts only.**
The sandbox stores the project at the same path as the host. This makes a session directory valid on both machines. Windows paths cannot exist on both machines. On Windows, the plugin uses `/home/user/project` in the sandbox instead. The host cannot open that path. You can create a workspace on Windows. But a prompt inside that workspace does not get a reply. A warped session does not work either.

**3. A sandbox does not survive an idle period.**
E2B pauses a sandbox after `sandboxTimeoutMs`. The default is 1 hour. OpenCode does not reconnect to a paused sandbox. The workspace shows as unavailable. You must create the workspace again. For long sessions, set a higher `sandboxTimeoutMs`.

**4. Warp of a session with history can fail.**
A warp of a new session is reliable. A warp of a session with existing messages can fail with a sync error ("sequence mismatch"). If this happens, try the warp again, or start the session inside the workspace.

## Compatibility

- Minimum supported OpenCode runtime: `1.16.0`.
- The plugin targets `@opencode-ai/plugin` `1.18.23` (with `e2b` `2.46.0`) and registers the current `WorkspaceAdapter` shape directly. The `WorkspaceAdapter` shape is unchanged across `1.16.x`–`1.18.x`, so the runtime floor is independent of the SDK version.
- Minimum supported Bun runtime: `1.3.0`; the exact Bun version is intentionally left to OpenCode.
- The local runtime version is probed from `PluginInput.serverUrl`.
- The remote runtime version is probed from the sandbox `/global/health` endpoint.
- Reuse requires a matching workspace API version and a remote runtime at or above the supported floor.
- Plugin registration does not probe the local server, so config/debug commands can load the plugin before the OpenCode controller is listening.

## Options

Common options:

- `nodeVariant`: Node image variant for E2B managed templates. Default: `22-slim`.
- `sandboxTimeoutMs`: E2B sandbox timeout. Default: 1 hour.
- `projectPath`: project directory inside the sandbox. Default: `/home/user/project`.
- `serverPort`: remote OpenCode server port. Default: `4096`.
- `secure`: enable E2B secure sandbox controller traffic. Default: `true`.
- `network.allowPublicTraffic`: allow unauthenticated access to sandbox service URLs. Default: `false`. When disabled, target requests include E2B's `e2b-traffic-access-token` header.
- `upload.ignore`: path literals or path segments skipped during snapshot upload.
- `upload.includeDotGit`: include the local `.git` directory. Default: `false`.
- `upload.followSymlinks`: follow symlinks during upload. Default: `false`.
- `templateGc`: best-effort cleanup for old managed templates.

`bootstrap.prepareCommands` still runs after upload and before the remote OpenCode server starts. `bootstrap.installCommand` and `bootstrap.startCommand` are accepted for older configs but ignored; the selected base template provides the pinned OpenCode runtime and the local workspace wrapper owns startup through a marker-gated systemd service. Service logs are written to journald and streamed with `journalctl -f` from the template start command.

## Template Cleanup

Managed templates use the `opencode-e2b-` alias prefix. A best-effort cleanup pass runs at plugin load and after workspace removal. Ready templates are deletion candidates when the most recent of `lastSpawnedAt`, `updatedAt`, and `createdAt` is older than the configured TTL.

```json
{
  "templateGc": {
    "enabled": true,
    "ttlMs": 259200000,
    "cooldownMs": 600000
  }
}
```
