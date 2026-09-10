# reindr

A generative interface runtime that gives an agent session editable HTML canvases and displays them in a companion browser panel. The files are the interfaces: the agent uses normal filesystem tools to write HTML, CSS, and JavaScript, while Reindr handles discovery, live reload, sandboxing, session routing, and browser-to-agent interactions.

The monorepo currently contains:

```text
packages/core/       @nicodes/reindr-core
packages/opencode/   @nicodes/reindr-opencode
packages/claude/     self-contained Claude Code marketplace plugin
```

## Prototype Status

The OpenCode adapter is version [`0.0.2`](https://www.npmjs.com/package/@nicodes/reindr-opencode). [`@nicodes/reindr-core`](https://www.npmjs.com/package/@nicodes/reindr-core) and the `nicodes/reindr` Claude Code marketplace plugin remain at `0.0.1`.

The prototype targets OpenCode `1.18.22`, Claude Code marketplace plugins, and Chromium desktop.

OpenCode `0.0.2` adds multiple named canvas tabs in the main header and independent host-owned agent controls. Saved canvases render automatically. Claude's single-canvas workflow is unchanged.

## Install For OpenCode

Add the published [`@nicodes/reindr-opencode`](https://www.npmjs.com/package/@nicodes/reindr-opencode) adapter to `~/.config/opencode/opencode.json` for every project, or to a project-root `opencode.json` for one project:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@nicodes/reindr-opencode"]
}
```

OpenCode installs the package and its `@nicodes/reindr-core` dependency automatically with Bun at startup. Quit and restart OpenCode after changing the plugin list. Do not also install a local source copy, because OpenCode loads local and npm plugins separately.

For repository development, the tracked `.opencode/plugins/reindr.ts` shim loads `packages/opencode/src/index.ts` directly after `bun install` and `bun run build:core`.

### Persistent Access To Reindr Files

To avoid approving external-directory access to Reindr's default data directory in every session, merge this snippet into your project-root `opencode.json`, or into `~/.config/opencode/opencode.json` for all projects:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "external_directory": {
      "~/.local/share/reindr/**": "allow"
    }
  }
}
```

Preserve your existing plugin list, settings, and permission rules; merge the entry into the existing `permission.external_directory` object rather than replacing your configuration. If `external_directory` is a single `"ask"` or `"deny"` value, preserve it as the object's first `"*"` rule, then add the Reindr exception. The **last matching rule wins**, so put this exception after any broad `"*": "ask"` or `"*": "deny"` rule. OpenCode expands `~` to your home directory. Project and agent overrides can still take precedence over global permissions.

If you already have `"external_directory": "allow"`, it grants broader external access and needs no Reindr exception. Do not replace it with this scoped object unless you intentionally want to narrow that existing access.

Quit and restart OpenCode after saving. The approval UI's **always** option applies only for the rest of the current OpenCode session; it does not save this persistent configuration.

This allows the external-directory boundary check for reads and writes under `~/.local/share/reindr`, not unrestricted tool use. Normal `read`, `edit`, and other tool permissions still apply; `edit` covers `edit`, `write`, and `patch`. If those permissions ask or deny, this snippet does not override them. Do not use a global `"*": "allow"` to solve this prompt.

Only enable this for a trusted directory: unlike Reindr's automatic session-HTML permission, this opt-in rule covers the entire data tree, including saved templates and process registry credentials. If you use `XDG_DATA_HOME`, `REINDR_DIRECTORY`, or `REINDR_TEMPLATE_DIRECTORY` to store files elsewhere, use explicit patterns for the actual trusted paths instead; the default pattern does not cover those locations.

See the [OpenCode permissions documentation](https://opencode.ai/docs/permissions/) for external directories, rule ordering, and tool permissions.

## Install For Claude Code

Add the repository marketplace and install its Reindr plugin:

```text
/plugin marketplace add nicodes/reindr
/plugin install reindr@nicodes
```

Restart Claude Code, then ask it to build an interface or invoke `/reindr:interface`. The plugin includes a self-contained MCP runtime, session hook, interaction monitor, and research-preview channel declaration. See [`packages/claude/README.md`](packages/claude/README.md) for channel testing details.

## Use

Ask the agent to build an interface:

> Run the tests and make an interactive pass/fail dashboard.

> Make a form for the refactor options: naming style, target directory, and dry-run toggle.

OpenCode sessions start with host-owned agent controls and **zero canvas files**. The workspace columns are session navigation, agent controls, then the canvas. Canvas tabs live in the main header alongside the Nav and Agent icons, which independently hide/show their panels without discarding drafts, selections, or the active canvas. Desktop canvas width expands as panels hide; mobile panels stack above the canvas. Host controls read real OpenCode history/status/catalogs and send prompts, commands, and abort requests without depending on canvas HTML.

When the user requests an interface, the agent calls the lifecycle-only `reindr_open` tool first, then edits the returned file with normal filesystem tools:

```js
reindr_open({ canvasID: "dashboard", title: "Test dashboard" })
reindr_open({ canvasID: "options", title: "Refactor options", template: "reindr-loading.html" })
reindr_open({ canvasID: "dashboard" }) // reopen the same file, never replace it
```

`canvasID` is a stable 1–64 character identifier starting with a letter or number and containing only letters, numbers, `_`, or `-`. It is scoped to the owning session. `title` supplies the initial display name (trimmed to 100 characters); reopening preserves the original name and HTML, even if another title/template is supplied. A new tab is blank unless `template` names a saved HTML template. `reindr_open({})` uses the `default` tab, preserving the legacy session-file path. Opening a tab selects it in connected panels for that session. The tool returns `metadata.file`, `metadata.canvasID`, `metadata.created`, and the panel URL.

Tabs switch views, not sessions. This version offers no close/delete-tab button or UI blank-tab creator: ask the agent to create a tab. Hiding either side panel never deletes a file. Input state is best-effort across tab switches and file updates; panel visibility/selection and host drafts are in-memory page state, not durable across full browser navigation/reload. Canvas HTML and tab titles persist across runtime restarts.

The plugin adds the legacy/default path (which may not exist yet), the named-tab API, and panel URL to system instructions. Always edit the path returned by `reindr_open` for a named tab. Shell commands retain these backward-compatible defaults:

```text
REINDR_UI_FILE
REINDR_UI_URL
```

The default file location is:

```text
$XDG_DATA_HOME/reindr/sessions/<session-id>.html
```

When `XDG_DATA_HOME` is unset, Reindr uses `~/.local/share/reindr/sessions/<session-id>.html`. Normal OpenCode session IDs are used directly; filesystem-unsafe characters in an opaque future ID are percent-encoded.

Named tabs use flat `.canvas!<sha256-session-id>!<canvasID>.html` files in the same directory, with small `.html.json` sidecars for their initial titles. Raw `!` cannot occur in encoded legacy filenames, keeping the namespaces separate. Paths depend only on session/tab identity, so resuming the same session from another worktree reuses its files. Do not construct these paths yourself: use the tool result. Writes trigger live updates, and opening a canvas opens its session panel automatically by default.

Navigation lists registered sessions, including sessions with no canvases. When sessions belong to different OpenCode processes, their panel servers may use different ports; a small process registry links them so selecting a session navigates the current browser tab to its owning process. Once one Reindr panel is active, additional processes do not automatically open duplicate tabs.

The file may be a complete document or an HTML fragment. Keep CSS and JavaScript inline unless static asset hosts have been explicitly allowed.

## Browser Bridge

Generated JavaScript receives a frozen `window.opencode` capability object:

- `opencode.submit({ prompt, data? })` sends an interaction to the owning OpenCode session. It must run directly during a user click or form submission. `data` is optional and must be JSON-serializable.
- `opencode.setHeight(px)` overrides automatic iframe sizing when needed.
- `opencode.fillViewport()` keeps an app-height interface fitted to the panel viewport instead of expanding the iframe with its content.
Only recognized, byte-identical built-in controller canvases retain the following legacy compatibility API. **Generated canvases do not receive `opencode.controller`**; use the host sidecar instead.

- `opencode.controller.snapshot()` reads a bounded snapshot of the owning session: status, messages, reasoning parts, tool states/results, child sessions, agents, connected models, and registered commands. **Correction:** snapshots are normalized/truncated, not a secret-redaction guarantee; history and tool output may contain sensitive text.
- `opencode.controller.prompt({ prompt, agent?, providerID?, modelID? })` submits the next turn with optional per-turn agent and model selection.
- `opencode.controller.command({ command, arguments?, agent?, providerID?, modelID? })` runs a registered OpenCode command.
- `opencode.controller.abort()` aborts the active turn.

Controller mutations require the same trusted click or form-submission activation as `opencode.submit()`. Controller requests are always scoped to the session owning the iframe; generated code receives neither a raw SDK client nor an arbitrary session ID parameter.

Example:

```html
<!doctype html>
<html>
  <head>
    <style>
      body { font: 16px system-ui; padding: 24px; }
    </style>
  </head>
  <body>
    <form id="options">
      <label>Name <input name="name"></label>
      <button>Apply</button>
    </form>
    <script>
      document.getElementById("options").addEventListener("submit", (event) => {
        event.preventDefault()
        opencode.submit({
          prompt: "Apply these options",
          data: { name: event.currentTarget.elements.name.value },
        })
      })
    </script>
  </body>
</html>
```

Interactions wait until the owning session reports an idle status. A brief shell toast reports queued, sent, or failed status. **Correction:** dispatch is serialized, but this is not an exactly-once delivery guarantee across process crashes or ambiguous transport failures; queues are in memory.

## Files And Reloading

The HTML files are normal user-local data files outside individual worktrees. Reindr adds a narrow external-directory permission for its `sessions/*.html` files unless external access was explicitly denied. It does not grant agents access to panel registry credentials or unrelated files.

The plugin watches the directory for external changes and also checks the current session's file after ordinary tool calls. Whole-file updates preserve basic input values, checkbox state, selections, focus, and page scroll when corresponding controls still exist.

Existing files and title metadata are rediscovered when their owning session becomes active after an OpenCode restart. Saved canvases render automatically when opened or selected, including their JavaScript, inside the existing sandbox. There is no separate activation step. Canvas submissions and legacy controller mutations still require a trusted user interaction. Existing canvas HTML, including recognized legacy controller files, is never migrated or overwritten. Deleting an OpenCode session deletes its loaded associated HTML files and title metadata and closes its connected session sockets.

Panel registry records heartbeat while their OpenCode process is running. Records that stop updating expire automatically, removing crashed or closed processes from navigation.

Each UI file is limited to 1 MB of UTF-8 HTML. Loading templates and the optional shared stylesheet are each limited to 200 KB.

## Saved Templates

On first startup, Reindr creates:

```text
$XDG_DATA_HOME/reindr/templates/reindr-loading.html
$XDG_DATA_HOME/reindr/templates/opencode-controller.html
```

The tracked source assets are [`packages/opencode/assets/reindr-loading.html`](packages/opencode/assets/reindr-loading.html) and [`packages/opencode/assets/opencode-controller.html`](packages/opencode/assets/opencode-controller.html). They ship in the npm package. On startup, Reindr copies them into the user data directory when no saved template exists. When `XDG_DATA_HOME` is unset, these resolve under `~/.local/share/reindr/templates`. Reindr never overwrites customized templates and reads the selected saved copy each time `reindr_open` creates a session UI.

Use `{{sessionTitle}}` where the escaped OpenCode session title should appear. Additional `.html` files saved in the templates directory appear as clickable items under the authenticated landing page's **Templates** tab. Clicking one opens a sandboxed, read-only preview; controller mutations are disabled until the unmodified built-in controller is used by a real session.

`opencode-controller.html` is retained for explicit templates and legacy compatibility, **not used as a default canvas**. Its controls now also live independently in the trusted host sidecar. Use the minimal loading view explicitly with `reindr_open({ canvasID: "preview", template: "reindr-loading.html" })`.

OpenCode 1.18.22 does not expose a public v1 API for persistent session agent/model switching or a provider-independent thinking-effort level. The controller therefore applies agent/model choices to the next prompt or command, and its **Show reasoning** control changes reasoning visibility rather than model effort.

The model catalog shows connected providers only. Model lists are bounded by a 250 KB UTF-8 snapshot budget rather than an arbitrary first-50 cutoff: the current session model and provider defaults are reserved before remaining models. Selection validation uses the complete connected catalog, not its display subset. Hidden internal agents are excluded before the agent limit and cannot be explicitly selected through controller requests. The overall controller response limit remains 1 MB.

## Tailwind And Shared Styling

The shipped templates use Tailwind CSS 4 utilities without a browser runtime or CDN dependency. `npm run build:opencode` scans the adapter source and `packages/opencode/assets/*.html`, then writes the minified, content-scoped stylesheet to `packages/opencode/assets/reindr-tailwind.css`. Reindr embeds that generated stylesheet in each sandboxed frame.

The generated document also receives a small neutral base stylesheet before Tailwind. It supplies dark defaults and reusable tokens such as `--ui-bg`, `--ui-surface`, `--ui-text`, and `--ui-accent` for session HTML that does not use utilities.

An optional local shared stylesheet can be configured by the user. Styles are applied in this order:

1. Built-in neutral defaults and design tokens.
2. Built-in compiled Tailwind utilities.
3. The configured shared stylesheet.
4. Styles from the session HTML file.

## Configuration

Secure defaults require no configuration.

| Environment variable | Default | Meaning |
|---|---:|---|
| `REINDR_PORT` | `4917` | Preferred panel port. Use `0` for a dynamic port. An occupied preferred port falls back automatically. |
| `REINDR_AUTORAISE` | `1` | Set to `0` to disable automatic browser opening. |
| `REINDR_BROWSER` | platform default | Browser command. Use `{url}` where the panel URL should be inserted. |
| `REINDR_DIRECTORY` | `$XDG_DATA_HOME/reindr/sessions` | Directory containing per-session HTML files. Relative overrides resolve from the project worktree. |
| `REINDR_TEMPLATE_DIRECTORY` | `$XDG_DATA_HOME/reindr/templates` | Directory containing saved HTML templates. By default it is the `templates` sibling of the session directory. |
| `REINDR_ALLOWED_ASSET_HOSTS` | empty | Comma-separated HTTPS hosts allowed to serve static assets. |
| `REINDR_STYLESHEET` | empty | Local CSS file inserted before each session file's styles. Relative paths resolve from the project worktree. |

The npm package also accepts plugin options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@nicodes/reindr-opencode",
      {
        "port": 4917,
        "autoOpen": true,
        "browser": "chromium --app={url}",
        "canvasDirectory": "~/.local/share/reindr/sessions",
        "templateDirectory": "~/.local/share/reindr/templates",
        "stylesheetPath": ".opencode/reindr.css",
        "allowedAssetHosts": ["cdn.jsdelivr.net"]
      }
    ]
  ]
}
```

Environment variables override plugin options.

## Security Model

- The panel binds only to `127.0.0.1`.
- Each panel process has a random bearer capability covering its active sessions. Unauthenticated landing pages do not expose session metadata, template names, or capability URLs. Cross-process navigation uses loopback URLs advertised through the Reindr process registry.
- WebSocket upgrades also require the exact panel `Origin`.
- WebSocket upgrades for session pages are accepted only for a currently registered local session, including zero-canvas sessions.
- Each canvas tab and template document route uses a separate read-only capability, so generated code never receives the WebSocket capability. A tab token cannot read another tab or session. Template-frame capabilities expire after five minutes and are bounded in memory.
- The trusted shell uses a nonce-based CSP and cannot be framed.
- Generated content uses `sandbox="allow-scripts allow-forms"` without `allow-same-origin`.
- The generated-content CSP blocks network connections, form actions, nested frames, objects, and base URL changes.
- Configured HTTPS hosts can serve scripts, styles, images, and fonts, but `fetch`, WebSocket, and form submission remain blocked.
- The trusted bridge communicates over a private `MessageChannel`; arbitrary generated scripts cannot forge privileged shell messages with `parent.postMessage`.
- `opencode.submit()` is accepted only synchronously inside a trusted click or form-submission event.
- The host sidecar calls the authenticated session-bound backend directly. Legacy iframe controller RPC is available only while the canvas bytes exactly match the shipped controller or a recognized historical built-in hash. Its mutations require synchronous trusted activation. The host does not relay a canvas message as a host-controller call or deliver host snapshots to canvas ports. Host and legacy snapshot polling share bounded SDK reads (at most four starts per second per session, one in flight); host UI refreshes every two seconds.
- Interaction payloads, pending interactions, controller snapshots, open preview capabilities, and file reads are bounded. Session dispatch is serialized so commands cannot race queued prompts.

Allowlisted hosts are trusted code suppliers. A script loaded from an allowed host runs inside the generated-content sandbox and can influence what the interface displays or submits after a user action.

Generated JavaScript can still consume CPU or create a misleading interface inside its iframe. User activation, sandboxing, CSP, and the private bridge reduce its authority but do not make arbitrary code harmless.

The panel URL is a bearer credential and is exposed to the owning OpenCode session through tool output and `REINDR_UI_URL`. Browser activation protects against generated iframe code invoking mutations on its own; it is not cryptographic attestation against another local process that has stolen the full panel bearer. Treat panel URLs as secrets.

The CSP blocks `fetch`, WebSocket, form submission, and similar connection APIs. Browser sandboxing does not reliably prevent generated code from navigating its own iframe to an external URL; such navigation can make an outbound request, destroys access to the private bridge, and replaces the generated interface. Do not render untrusted secrets into the canvas.

## Routes

- `/`, unauthenticated stale session URLs, and unknown page routes show a static Reindr landing page without session or template metadata.
- `/?view=sessions&token=...` and `/?view=templates&token=...` show the authenticated session and template catalogs.
- `/?token=...` redirects to the most recently updated session UI, or waits for initial content.
- `/s/<session-id>?token=...` displays one active session and lets the drawer navigate to other registered sessions.
- `/frame/<canvas-key>?token=...` serves one sandboxed canvas with its own limited read token.
- `/template-frame/<name>?token=...` serves a sandboxed template with a short-lived, template-specific read capability.
- `/ws?token=...` carries live updates and interactions.

Capability URLs expire when the OpenCode process exits. The current URL is reinjected into agent instructions and `REINDR_UI_URL` after restart.

## Develop

### Local OpenCode Integration

Do not install this feature globally or launch both the published adapter and the local shim. From the source checkout, install dependencies and build core first (`bun install --frozen-lockfile && npm run build:core`). If Bun is unavailable, `npm install --package-lock=false` is an npm fallback; it resolves current compatible dependencies rather than reproducing `bun.lock` exactly. `npm run check` runs typechecking, builds, all tests, and dry-run package checks without publishing.

From your Reindr source checkout, run the following when ready for live integration:

```sh
mkdir -p /tmp/opencode/reindr-tabs-local/config
env -u OPENCODE_CONFIG -u OPENCODE_CONFIG_CONTENT -u OPENCODE_CONFIG_DIR \
  XDG_CONFIG_HOME=/tmp/opencode/reindr-tabs-local/config \
  REINDR_DIRECTORY=/tmp/opencode/reindr-tabs-local/sessions \
  REINDR_TEMPLATE_DIRECTORY=/tmp/opencode/reindr-tabs-local/templates \
  REINDR_AUTORAISE=0 REINDR_PORT=0 \
  opencode
```

The local `.opencode/plugins/reindr.ts` shim loads `packages/opencode/src/index.ts`; it needs built core but does not require building/publishing the adapter. The alternate `XDG_CONFIG_HOME` avoids loading the normally installed global configuration; the command does not modify it. Keep this config directory empty or supply only settings you deliberately want for the test. Provider/agent configuration from your normal global config will not be present. This does **not** isolate OpenCode authentication/session storage: `XDG_DATA_HOME` is intentionally unchanged so existing provider authentication can remain available. To isolate that too, set a separate `XDG_DATA_HOME` and authenticate/configure providers there yourself. Do not copy secrets into source files.

Explicit Reindr directory overrides keep test canvases, templates, and panel registry separate from `~/.local/share/reindr` and existing panels. `REINDR_PORT=0` requests a free runtime port; `REINDR_AUTORAISE=0` prevents unsolicited browser windows. Open the panel URL returned by `reindr_open` or exposed as `REINDR_UI_URL`; it is a bearer credential, so do not publish it. No global config edits are required. Quit/restart OpenCode after adapter/config changes; restart persistence tests should use the same Reindr directories.

Try a zero-canvas session first, then ask for two named tabs, edit each, hide/show Nav and Agent, switch tabs with drafts, send a host prompt with a selected agent/model, run a registered command, and confirm abort. Finally restart/resume to check that saved tabs render and run their scripts automatically without an activation prompt. Local browser tests use a deterministic SDK harness; they do not replace this live integration check.

Install test dependencies with Bun:

```sh
bun install
```

Run static checks and tests:

```sh
bun run typecheck
bun run test
bun run pack:check
```

The core suite runs the real OpenCode plugin through an HTTP/WebSocket Bun adapter and verifies discovery across separate plugin ports. The browser suites launch `/usr/bin/chromium` and verify file-backed live reload, cross-port session navigation, configurable styles, state preservation, CSP enforcement, private bridge delivery, Claude MCP startup, sandboxing, synthetic-interaction rejection, and trusted interaction delivery.

## Publish

The **Release** GitHub Actions workflow is manually triggerable from the `main` branch. Choose `all`, `core`, or `opencode`; dry-run mode is enabled by default. A real publish reruns every release check, refuses an existing version, publishes core before the OpenCode adapter when `all` is selected, and records npm provenance.

Both npm packages use Trusted Publishing with GitHub user `nicodes`, repository `reindr`, workflow `release.yml`, no GitHub environment, and the `npm publish` action allowed. Releases use short-lived OIDC credentials instead of an npm token. The committed package manifests remain the source of truth for versions; the workflow never edits versions or tags.

The Claude plugin is not an npm release target. Its versioned marketplace files become available when they are merged to the repository's default branch.

## Prototype Limitations

- Chromium is the only browser tested in this version.
- Panel servers and interaction queues remain process-local. The Reindr process registry connects their navigation without proxying interactions between processes.
- Full-file updates preserve basic form/focus/scroll state, not JavaScript heap state or event state.
- Full-document normalization preserves head/body contents and escaped `class` attributes for Tailwind; other original `html` and `body` attributes are discarded.
- CDN assets require explicit trusted-host configuration.
