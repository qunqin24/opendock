# reindr

A generative interface runtime that gives an agent session an editable HTML file and displays it in a companion browser panel. The file is the interface: the agent uses normal filesystem tools to write HTML, CSS, and JavaScript, while Reindr handles discovery, live reload, sandboxing, session routing, and browser-to-agent interactions.

The monorepo currently contains:

```text
packages/core/       @nicodes/reindr-core
packages/opencode/   @nicodes/reindr-opencode
packages/claude/     self-contained Claude Code marketplace plugin
```

## Prototype Status

Version `0.0.1` is available as [`@nicodes/reindr-core`](https://www.npmjs.com/package/@nicodes/reindr-core), [`@nicodes/reindr-opencode`](https://www.npmjs.com/package/@nicodes/reindr-opencode), and the `nicodes/reindr` Claude Code marketplace plugin.

The prototype targets OpenCode `1.18.22`, Claude Code marketplace plugins, and Chromium desktop.

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

When the user requests an interface, the agent calls the lifecycle-only `reindr_open` tool first. Reindr immediately opens the panel and creates the full OpenCode controller only when the session has no UI file. The agent can then replace or edit that file with normal filesystem tools for a custom interface. Calling `reindr_open` again preserves all existing content.

The plugin adds the current session's exact UI file path and panel URL to the agent's system instructions. It also exports them to shell commands as:

```text
REINDR_UI_FILE
REINDR_UI_URL
```

The default file location is:

```text
$XDG_DATA_HOME/reindr/sessions/<session-id>.html
```

When `XDG_DATA_HOME` is unset, Reindr uses `~/.local/share/reindr/sessions/<session-id>.html`. Normal OpenCode session IDs are used directly; filesystem-unsafe characters in an opaque future ID are percent-encoded.

Each OpenCode session gets a different file. Because the path depends only on the stable session ID, resuming the same session from another directory reuses its existing UI. The agent creates or edits that one file with the standard filesystem tools; `reindr_open` handles lifecycle only, with no custom UI authoring tools or component schemas. A write triggers a live panel update, and the first non-empty UI opens its session panel automatically by default.

The drawer lists every live Reindr UI. When sessions belong to different OpenCode processes, their panel servers may use different ports; a small process registry links them so selecting a session navigates the current browser tab to its owning process. Once one Reindr panel is active, additional processes do not automatically open duplicate tabs.

The file may be a complete document or an HTML fragment. Keep CSS and JavaScript inline unless static asset hosts have been explicitly allowed.

## Browser Bridge

Generated JavaScript receives a frozen `window.opencode` capability object:

- `opencode.submit({ prompt, data? })` sends an interaction to the owning OpenCode session. It must run directly during a user click or form submission. `data` is optional and must be JSON-serializable.
- `opencode.setHeight(px)` overrides automatic iframe sizing when needed.
- `opencode.fillViewport()` keeps an app-height interface fitted to the panel viewport instead of expanding the iframe with its content.
- `opencode.controller.snapshot()` reads a redacted snapshot of the owning session: status, messages, reasoning parts, tool states/results, child sessions, agents, connected models, and registered commands.
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

Interactions wait until the owning session reports an idle status and are submitted exactly once. A brief shell toast reports queued, sent, or failed status.

## Files And Reloading

The HTML files are normal user-local data files outside individual worktrees. Reindr adds a narrow external-directory permission for its `sessions/*.html` files unless external access was explicitly denied. It does not grant agents access to panel registry credentials or unrelated files.

The plugin watches the directory for external changes and also checks the current session's file after ordinary tool calls. Whole-file updates preserve basic input values, checkbox state, selections, focus, and page scroll when corresponding controls still exist.

Existing files are rediscovered when their session becomes active after an OpenCode restart. Restored JavaScript does not execute until the user clicks **Activate saved content**. Deleting an OpenCode session deletes its associated HTML file.

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

`opencode-controller.html` is the default for new session UIs. It provides next-turn agent/model selection, reasoning visibility, prompt and command controls, abort, live status, message history, tool visualization, and child-session/subagent visualization. Use the minimal loading view explicitly with `reindr_open({ template: "reindr-loading.html" })`.

OpenCode 1.18.22 does not expose a public v1 API for persistent session agent/model switching or a provider-independent thinking-effort level. The controller therefore applies agent/model choices to the next prompt or command, and its **Show reasoning** control changes reasoning visibility rather than model effort.

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
- WebSocket upgrades for session pages are accepted only for a currently registered local canvas.
- Session and template document routes use separate read-only capabilities, so generated code never receives the WebSocket capability. Template-frame capabilities expire after five minutes and are bounded in memory.
- The trusted shell uses a nonce-based CSP and cannot be framed.
- Generated content uses `sandbox="allow-scripts allow-forms"` without `allow-same-origin`.
- The generated-content CSP blocks network connections, form actions, nested frames, objects, and base URL changes.
- Configured HTTPS hosts can serve scripts, styles, images, and fonts, but `fetch`, WebSocket, and form submission remain blocked.
- The trusted bridge communicates over a private `MessageChannel`; arbitrary generated scripts cannot forge privileged shell messages with `parent.postMessage`.
- `opencode.submit()` is accepted only synchronously inside a trusted click or form-submission event.
- Controller RPC is available only while the canvas bytes exactly match the shipped controller. Prompts, commands, and aborts are accepted by the bridge only synchronously inside a trusted click or form-submission event and are restricted to the owning session.
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
- `/frame/<session-key>?token=...` serves the sandboxed session HTML with a limited read token.
- `/template-frame/<name>?token=...` serves a sandboxed template with a short-lived, template-specific read capability.
- `/ws?token=...` carries live updates and interactions.

Capability URLs expire when the OpenCode process exits. The current URL is reinjected into agent instructions and `REINDR_UI_URL` after restart.

## Develop

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
