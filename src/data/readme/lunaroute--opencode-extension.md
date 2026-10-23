# LunaRoute for OpenCode

Use LunaRoute from [OpenCode](https://opencode.ai) in under a minute: log in,
and every LunaRoute model shows up automatically — correctly configured and
ready to use. No hand-editing of `opencode.json`, no copying API keys around.
The hosted LunaRoute MCP server (image generation and more) is wired up for
you too.

## Why

- **Zero-config models.** LunaRoute's model catalog is synced into OpenCode
  automatically — context windows, token limits, reasoning, and vision
  capabilities all come through pre-mapped. Run `/models` and pick a
  `lunaroute/*` model. The catalog is fetched when OpenCode loads your
  config, so new models appear after a restart (or a new login) as soon
  as they ship.
- **Login that doesn't leak keys.** Browser-based login (PKCE) issues a fresh
  `lr_` key and hands it to OpenCode's own credential store (v2 keeps
  credentials in its database, with `/connect` managing accounts). The plugin
  never writes your key to any other file. Prefer a key you already have?
  Paste it with the **Paste an API key** method.
- **LunaRoute MCP built in.** When you're logged in, the hosted LunaRoute MCP
  server is registered in your live session config so tools like
  `generate_image` are callable from OpenCode. Nothing is written to your
  config files.
- **Web search built in.** A first-class `web_search` tool (LunaRoute-hosted)
  is registered when you're logged in — the same backend the MCP server
  offers, with the same attribution, called directly. OpenCode's builtin
  `websearch` needs opencode-native providers or Exa/Parallel keys; this
  one needs nothing but your login.
- **Attribution on every request.** Each LunaRoute request carries a
  per-session agent + session id so traffic is traceable on the LunaRoute
  side.

## Requirements

- OpenCode **>= 2.0.0** (v2 plugin API).
- **OpenCode 1.x users**: stay on `@lunaroute/opencode-extension@0.3.1` — this
  release is v2-only. Pin it explicitly (`"plugins": ["@lunaroute/opencode-extension@0.3.1"]`),
  because unpinned installs follow `@latest` and would stop loading on 1.x.
- A LunaRoute account with access to at least one organization.
- Linux or macOS.

## Quick start

Add the plugin to your OpenCode config — the **global** `~/.config/opencode/opencode.json`
or a **project** `opencode.json` (or `.opencode/opencode.json`) in the project root.
OpenCode reads all of them; the project one wins on conflicts. (Do not use the
`config.json` that OpenCode writes per instance — it is not a plugin source.)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@lunaroute/opencode-extension"]
}
```

One entry loads both halves: the server plugin and the `./tui` CLI plugin
(no `tui.json`, no `cli.json` needed).

Previously installed an older release? Clear OpenCode's plugin cache first —
see [Troubleshooting](#troubleshooting).

Then in OpenCode:

```
/connect
```

Choose **LunaRoute**, then **Log in with browser** (a browser opens to
`https://app.lunaroute.com/device-auth/opencode`; after you approve, an API
key is issued and stored) or **Paste an API key** (paste an existing `lr_...`
key). If you haven't already set a default model, the first LunaRoute model
is picked for you — run `/models` only if you want to choose a different
one. The pick is recorded in the instance log so you can see what happened.

On a headless machine (or when your browser is on another computer), choose
**Log in from a remote browser** instead: open the URL it shows in any
browser and approve there, then paste back what the approval page gives you —
its curl command, the callback URL, its `?code=...&state=...` part, or a
bare code all work. The callback URL is a `127.0.0.1` address; opening it on
the remote machine fails to load — that's expected. Codes are short-lived:
paste promptly. A failed paste ends the flow (OpenCode cannot re-prompt) —
re-run `/connect` for a fresh code; the instance log carries the exact
reason.

Before your first login, `/models` lists a single placeholder model
(`Log in with /connect`) — the real catalog replaces it after `/connect`.
`/connect` lists LunaRoute as an integration (that is what v2 lists), so the
provider stays reachable regardless of the model count.

## LunaRoute MCP tools

When you are logged in, the extension registers the hosted LunaRoute MCP
server (`https://mcp.lunaroute.com/mcp`) through the v2 MCP transform —
tools become callable from OpenCode. The entry exists only in the live
registry: **it is never written to `opencode.json` or any other config
file**, and your `lr_` key is never persisted anywhere outside OpenCode's
own credential store.

- **Logged out**: no registration occurs (silent). Log in with `/connect`.
- **After login or key rotation**: MCP refreshes automatically when the
  instance reloads (the reload that follows the post-login default-model
  update); a new key is picked up on the next instance without a process
  restart. Restarting also works, but is not required.

> **Duplicate surface — endgame note.** The first-class tool set now covers
> every capability the hosted MCP server offers: `web_search` (+ `web_fetch`
> when it ships), `generate_image`, `edit_image`, `upload_image`, and
> `convert_document`. The MCP server stays registered under prefixed names
> (`lunaroute_web_search`, `lunaroute_generate_image`, …) for compatibility
> — user scripts and flows may reference those names — and so that tools
> the server adds later are available immediately, before a first-class
> port lands. OpenCode's MCP config cannot filter individual tools of a
> registered server; to suppress the MCP surface entirely, diverge the
> `mcp.lunaroute` entry (see [MCP entry management](#mcp-entry-management)).

### MCP entry management

The plugin recognizes its own `mcp.lunaroute` entry by its shape (`remote` +
the LunaRoute MCP URL + the expected headers). Two consequences:

- If you hand-write a `mcp.lunaroute` entry that matches that shape, the
  plugin treats it as its own and **refreshes its header values** (credential
  + attribution) whenever you're logged in.
- To keep OpenCode from managing an entry, make it *diverge* — set
  `"enabled": false` (keeps the entry but stops the plugin from touching it)
  or point it at a different URL. Adding extra headers is **not** recommended
  as an opt-out: they would be forwarded to the MCP server.

A `mcp.lunaroute` entry that doesn't match the plugin's shape is always left
untouched.

### Any-name servers at the hosted URL win

The defer rule also covers differently-named entries: if **any** MCP server
in your config points at the hosted LunaRoute MCP URL (regardless of its
name, compared modulo case and trailing slashes), the plugin does not
register its own `mcp.lunaroute` — your server wins, and the plugin logs a
one-time notice. Without this, the model would see two copies of every
hosted tool with divergent credentials (your static key vs the plugin's
rotated one), and only the plugin's would carry the attribution headers.

Note the trade-off: your entry's key is **static** — after a rotation,
edit it (or remove it and let the plugin re-register with the fresh key).
If the plugin had registered earlier in the session, it removes its own
duplicate when your entry appears (only ever touching entries it placed
itself).

## Settings

User preferences live in `$XDG_DATA_HOME/opencode/lunaroute.json` (default
`~/.local/share/opencode/lunaroute.json` — next to the auth store, mirroring
pi's layout). The file is the source of truth and every consumer re-reads it:
provider selection follows the file on the very next tool call.

| Key | Values | Default | Controls |
|---|---|---|---|
| `mcp` | `"on"` / `"off"` | `"on"` | `mcp.lunaroute` registration |
| `webTools` | `"on"` / `"off"` | `"on"` | first-class `web_search` / `web_fetch` |
| `searchProvider` | `"server"` / `"brave"` / `"exa"` / `"kagi"` | `"server"` | default search provider (`server` = omit → server default) |
| `imageTools` | `"on"` / `"off"` | `"on"` | first-class image tools (when they land) |
| `convertTools` | `"on"` / `"off"` | `"on"` | first-class document conversion (when it lands) |

Environment escape hatches only ever **disable** (values `off`, `0`,
`false`): `LUNAROUTE_WEB_TOOLS`, `LUNAROUTE_IMAGE_TOOLS`,
`LUNAROUTE_CONVERT_TOOLS`.

- **Tolerant reader**: an unreadable or malformed file falls back to defaults
  and logs one warn line — it never crashes the session. Invalid single
  values fall back per key, silently.
- **Live apply**: provider selection applies to the very next tool call with
  no reload. Registration-time gates (web tools, MCP) re-evaluate when the
  instance reloads — a restart, a login, or any config change does it (the
  plugin's own post-login config write triggers exactly this).
- **Isolation**: turning `mcp` off never affects models or the web tools —
  each contributor gates independently.

### `/lunaroute` settings command (TUI)

The package ships a v2 CLI plugin (`exports["./tui"]`) that registers a
`/lunaroute` slash command through the TUI keymap. It offers the five
settings with their current values plus **Refresh models**:

- **Settings rows** — write-first: the value is persisted to
  `lunaroute.json`, then the location reloads so the server plugin re-reads
  the file and re-evaluates its registration gates. A failed write shows an
  error toast and never reloads.
- **Refresh models** — reloads the location (re-fetching the LunaRoute
  catalog) and reports how many LunaRoute models are available.

It runs in the TUI process, outside the prompt loop, so it never spends a
model turn. No `tui.json`/`cli.json` entry is needed: the same
`plugins` entry in `opencode.json` that loads the server half also loads
`./tui`.

**Headless / no TUI**: the command is simply absent — settings stay fully
functional as the `lunaroute.json` file plus the env hatches above. Edit the
file and restart (or trigger any config change) to apply registration-time
gates; nothing depends on the TUI plugin.

## Web search (`web_search`)

When you're logged in and the hosted LunaRoute MCP server offers it, the
extension registers a first-class **`web_search`** tool — same backend as
the MCP server, same attribution headers, but called directly (no
`mcp.lunaroute` dependency). A companion **`web_fetch`** tool registers the
same way once the hosted server ships one (it hasn't yet; registration is
driven by the server's `tools/list` on every session start).

- **Provider**: the per-call `provider` argument wins; otherwise the
  `searchProvider` setting from `~/.local/share/opencode/lunaroute.json`
  (`brave` / `exa` / `kagi`; `server` = the server default), re-read on every
  call — a change applies to the very next search. Absent everywhere → the
  server default.
- **Key rotation**: the current key is re-read from OpenCode's auth store on
  every call — once the tool is registered, a rotated key is used by the
  next search without any restart.
- **Login mid-session**: tools register at session start; after a fresh
  login they appear on the next instance reload (a restart always works).
- **Logged out**: not registered. If you log out mid-session, an
  already-registered tool fails with a "run /connect" error instead of
  silently using a stale key.

Settings and escape hatches (the file is the source of truth; the env var
only ever disables):

| Variable | Effect |
|---|---|
| `LUNAROUTE_WEB_TOOLS=off` (also `0` / `false`) | Never register the web tools |

| File (`~/.local/share/opencode/lunaroute.json`) | Effect |
|---|---|
| `{"webTools": "off"}` | Never register the web tools |
| `{"searchProvider": "brave"}` | Default provider for every search (per-call arg still wins) |

Notes and limits:

- **Coexistence with the builtin `websearch`**: OpenCode's builtin stays
  untouched (it only appears for opencode-native providers or with
  Exa/Parallel API keys set); both can be visible under different names.
- **Other plugins**: pi's extension detects other web-search tools and stays
  silent; OpenCode plugins cannot enumerate tools, so this extension
  registers unconditionally. If another plugin also registers `web_search`,
  both will exist (host precedence for that case is unverified).
- **The MCP duplicate**: `web_search` and the MCP server's
  `lunaroute_web_search` are the same backend; the MCP registration stays
  because it serves tools the first-class set does not cover (and OpenCode's
  MCP config cannot filter individual tools). To suppress the MCP surface,
  diverge the `mcp.lunaroute` entry (see
  [MCP entry management](#mcp-entry-management)).

## Image tools

When you're logged in and the hosted LunaRoute MCP server offers them, the
extension registers first-class **`generate_image`**, **`edit_image`**, and
**`upload_image`** tools (same gate as the web tools: settings + valid key +
the server's `tools/list`, checked on every session start).

- **Images you can see**: generated and edited images are saved locally
  (temp-then-rename, so a cancelled call never leaves a partial file) and
  returned as a `file://` attachment — vision models see the actual image,
  not just a URL. The server's own result lines are never rewritten; the
  local path is appended (`saved to: …`, or `not saved locally — fetch the
  url before it expires`).
- **Per-org models**: the `model` parameter's allowed values come from the
  server's `tools/list` (per-org entitlement, with per-model limit hints in
  the description) — re-probed on every session start, so catalog changes
  apply on the next instance.
- **upload_image is local-safe by construction**: the file is sniffed by
  magic bytes (png/jpeg/webp) *before* any bytes leave the machine, read
  through a bounded descriptor read (at most the 11 MiB ceiling + 1 byte
  ever enters memory, however the file changes mid-read), and ids are
  validated (`img_…` only) before anything touches a filesystem path.
- **Save location**: `$XDG_DATA_HOME/opencode/lunaroute-images` (default
  `~/.local/share/opencode/lunaroute-images`), override with
  `LUNAROUTE_IMAGE_DIR`. Saved images are private by default (dir 0700 /
  files 0600); the plugin-owned default directory is hardened on every
  save, while an explicit `LUNAROUTE_IMAGE_DIR` is respected as-is
  (user-managed).
- **Key rotation**: the current key is re-read on every call — no restart
  needed.
- **Disable**: `LUNAROUTE_IMAGE_TOOLS=off` / `{"imageTools": "off"}` —
  same semantics as the web tools.

## Document conversion

When you're logged in and the hosted LunaRoute MCP server offers it, the
extension registers a first-class **`convert_document`** tool: documents
(Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV, PDF) and raster
images (always OCR'd server-side) become Markdown, returned inline.

- **Local safety first**: files are sniffed by content (ZIP-family / PDF /
  RTF magics, strict UTF-8 for text) before any bytes leave the machine.
  Plain text uploads only when it is genuinely CSV — from a `.csv` path, or
  an extensionless path with an explicit `.csv` filename. Dotfiles and
  hidden path components (`.ssh`, `.aws`, …) never leave as text, whatever
  they claim; binaries are content-sniffed, never name-trusted (a PNG named
  `notes.csv` is converted as an image, not read as text).
- **Size**: files over the 10 MiB conversion ceiling are rejected before
  upload (checked on the bytes actually read, so a swapped file can't sneak
  through).
- **Oversized output**: when the server stores the result as an artifact
  (`output_too_large`), the tool retries once with `embed: false`, downloads
  the artifact, and saves it to `$XDG_DATA_HOME/opencode/lunaroute-docs`
  (default `~/.local/share/opencode/lunaroute-docs`, override with
  `LUNAROUTE_DOCS_DIR`) — the model gets the path plus the document's
  opening lines. Private by default (dir 0700 / files 0600); an explicit
  override directory is respected as-is.
- **Scanned PDFs**: with `ocr: false` (default) a scanned PDF answers
  `needs_ocr` — rerun with `ocr: true` (the costly path is the model's
  call).
- **Key rotation**: the current key is re-read on every call.
  **Disable**: `LUNAROUTE_CONVERT_TOOLS=off` / `{"convertTools": "off"}` —
  same semantics as the other toggles.

## Configuration

The gateway, API, and front URLs default to production and are overridable
for dev/staging via environment variables before starting OpenCode:

| Variable | Default | Purpose |
|---|---|---|
| `LUNAROUTE_ROUTING_URL` | `https://gw.lunaroute.com/v1` | Gateway base URL (provider `baseURL` + `/models`) |
| `LUNAROUTE_API` | `responses` | Wire format. Accepts `responses` or `completions` (case-insensitive; absent means `responses`). `responses` routes models through opencode's OpenAI Responses protocol (`@ai-sdk/openai`, `gw/v1/responses`); `completions` is the chat-completions kill switch (`@ai-sdk/openai-compatible`). An unrecognized value warns and falls back to `completions`. |
| `LUNAROUTE_API_URL` | `https://api.lunaroute.com` | API host for `/v1/auth/exchange` |
| `LUNAROUTE_FRONT_URL` | `https://app.lunaroute.com` | Web app host for `/device-auth/opencode` browser login |
| `LUNAROUTE_MCP_URL` | `https://mcp.lunaroute.com/mcp` | Hosted MCP server URL registered in the live config |

Setting `provider.lunaroute.options.baseURL` in your OpenCode config takes
precedence over `LUNAROUTE_ROUTING_URL` everywhere (chat, model catalog,
key validation) — one effective URL for all of them.

Setting `provider.lunaroute.npm` in your OpenCode config pins the wire
format opencode routes every LunaRoute model on (opencode derives each
model's routing npm from the provider-level value, so an explicit pin wins
over `LUNAROUTE_API`); unset, the environment variable decides, and absent
that the Responses default applies.

## Troubleshooting

- **Plugin doesn't load / no LunaRoute models**: check `opencode plugin list`
  (or the server log, `~/.local/share/opencode/log/opencode.log`) for
  `failed to load plugin`. Common causes:
  - **OpenCode 1.x with this release installed**: this release needs OpenCode
    2.x. Pin `@lunaroute/opencode-extension@0.3.1` for 1.x.
  - **Wrong config key/place**: the entry must be `plugins` in a config file
    OpenCode reads (global `~/.config/opencode/opencode.json` or a project
    `opencode.json`). The legacy `plugin` key is auto-normalized, but use
    `plugins` going forward.
  - **Stale cache**: older releases can linger under
    `~/.cache/opencode/npm/@lunaroute/` (`~/Library/Caches/opencode/npm/...`
    on macOS) — remove it and restart.
- **`/connect` doesn't list LunaRoute**: check that the plugin is active
  (`opencode plugin list`); LunaRoute appears as an integration with up to
  three methods (browser, remote browser, API key).
- **No models appear after login**: the gateway may be unreachable or the key
  stale. Re-run `/connect`; v2 keeps accounts, so a new login is a new
  account you can switch back from.
- **A session shows no LunaRoute models** (or only "Couldn't load models — run
  /lunaroute → Refresh models"): the catalog could not be fetched when that
  session's folder first loaded — the gateway was unreachable or the key was
  rejected — or it loaded but listed no chat model your account can use. The
  plugin retries once, then says so instead of listing nothing (a catalog that
  loaded before is kept, never replaced by the placeholder). Run `/lunaroute` →
  **Refresh models** (same as `opencode reload`) once you are online: it
  re-fetches without restarting. Still only the placeholder afterwards? Check
  the account's available models. A revoked key needs `/connect` instead — a
  refresh cannot fix it.
- **Key rotation / multiple accounts**: `/connect` → LunaRoute lists saved
  accounts; new logins become active and can be renamed or deleted there.
  The plugin follows the active credential for models, MCP, and tools.
- **Removing credentials**: use `/connect` (or `opencode auth logout`) — v2
  stores credentials in its own database; editing `auth.json` no longer does
  anything (v1 credentials are imported once at migration).
- **`web_search` missing**: it only registers when logged in **and** the
  hosted MCP server offers it. Log in via `/connect`, then reload or restart;
  if it's still missing, the server didn't offer it to your org.
  `LUNAROUTE_WEB_TOOLS=off` disables it on purpose.
- **Settings file problems**: a malformed `lunaroute.json` behaves as if the
  file were absent (defaults); fix the JSON and reload.
- **Diagnostics**: the plugin prints warnings to its process output
  (`console.*`). OpenCode 2.0.x does not route plugin console output into
  `opencode.log`, so server-side warnings may not be visible in the log file;
  user-facing failures surface in `/connect` and the LunaRoute status.
- **Generated image not visible to the model**: it is saved locally and
  attached as a file — if the model still can't see it, the model in use may
  lack vision; check the model's capabilities in `/models`.
- **Windows**: untested and unsupported.

## Development

```bash
npm install
npm run check   # typecheck + tests
```

Manual smoke test: see [docs/smoke-checklist.md](./docs/smoke-checklist.md)
(run against staging before every release).

Package dry run:

```bash
npm pack --dry-run
```

## Release

Publishing is tag-driven via [
`.github/workflows/publish.yml`](./.github/workflows/publish.yml), using npm
Trusted Publishing (OIDC) — no NPM_TOKEN secret.

One-time setup (human, out of band): add a **Trusted Publisher** entry on
[npmjs.com](https://www.npmjs.com/settings/lunaroute/packages) for
`@lunaroute/opencode-extension` pointing at

- org/user: `lunaroute`
- repo: `lunaroute-opencode-extension`
- workflow: `publish.yml`
- allowed: `npm publish`

Then, for every release:

1. The staging smoke checklist ([docs/smoke-checklist.md](./docs/smoke-checklist.md))
   must be green.
2. Tag and push (e.g. `git tag v0.1.0 && git push origin v0.1.0`) — the tag
   push triggers the workflow, which runs `npm run check` as a gate and
   publishes with provenance. (If Trusted Publishing is not yet usable — the
   package must exist on npm first — the initial publish can be done locally
   with `npm publish --provenance`.)
3. Verify: the workflow is green and
   `npm view @lunaroute/opencode-extension version` shows the new version.

## License

MIT License. See [LICENSE](./LICENSE).
