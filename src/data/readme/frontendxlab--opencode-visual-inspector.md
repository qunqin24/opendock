# OpenCode Visual Inspector

An OpenCode v1 and v2 plugin for selecting rendered web elements, attaching visual change requests, and sending the complete annotation batch to the active coding session.

Documentation: https://opencode-annotate.frontendx.dev

## Requirements

- OpenCode v1 or v2
- Node.js-compatible plugin runtime
- Chrome, Chromium, Playwright Chromium, or a desktop default browser
- A reachable HTTP or HTTPS application

## Install

### Automatic setup

Run the interactive installer. It detects the available OpenCode CLI and desktop app, updates the matching global configuration, creates a timestamped backup, and can launch a browser smoke test:

```sh
npx @frontendxlab/opencode-visual-inspector
# or
pnpm dlx @frontendxlab/opencode-visual-inspector
```

Non-interactive setup:

```sh
npx @frontendxlab/opencode-visual-inspector --yes --smoke-test
```

Useful controls:

```sh
npx @frontendxlab/opencode-visual-inspector --dry-run
npx @frontendxlab/opencode-visual-inspector --scope project --target v2
npx @frontendxlab/opencode-visual-inspector --scope global --target v1 --no-smoke-test
```

The installer does not install OpenCode or a browser. For global V2 setup it uses the native `opencode2 plugin add` command when available. V1 uses the `/v1` package export through the legacy `plugin` configuration because the V1 adapter is a package subpath, not a standalone npm package. It always verifies an existing Chrome or Chromium executable only.

### OpenCode v2

Install globally with the automatic setup command above. Manual package setup:

```sh
opencode2 plugin add @frontendxlab/opencode-visual-inspector
```

OpenCode adds the plugin to your global V2 configuration, so `/inspect` and the `visual.inspect` tool are available in every project. Reopen an existing TUI if it was running during installation. After an npm release, the equivalent registry install is `opencode2 plugin add @frontendxlab/opencode-visual-inspector`.

Verify the installation:

```sh
opencode2 plugin list
```

### OpenCode v1

V1 and V2 use different plugin APIs and the dependencies are pinned independently (`@opencode/plugin@0.0.0-beta-19296` for V2, `@opencode-ai/plugin@0.0.0-v1-202510310553` for V1). The package root remains the V2 plugin. The V1 adapter is exported separately from `@frontendxlab/opencode-visual-inspector/v1`.

V1 does not register `/inspect`, because V1 plugins have no documented command registration API. It registers the `visual_inspect` tool instead, matching the documented V1 `Plugin` and `tool` APIs from `@opencode-ai/plugin`.

Install the package locally:

```sh
npm install @frontendxlab/opencode-visual-inspector
```

Add the V1 entrypoint to the V1 plugin list in `opencode.json`:

```jsonc
{
  "plugin": ["@frontendxlab/opencode-visual-inspector/v1"]
}
```

Or, for a local plugin file, configure the published entrypoint explicitly according to the V1 plugin loader in use:

```jsonc
{
  "plugin": ["./node_modules/@frontendxlab/opencode-visual-inspector/src/v1.ts"]
}
```

If the V1 loader does not resolve package subpath exports, copy or link `src/v1.ts` into `.opencode/plugins/` and keep the same default export. Do not point a V1 installation at the package root, which is the V2 adapter.

### V1 `/inspect` command template

V1 supports the `visual_inspect` tool but not plugin command registration. The package includes `commands/inspect.md`, a command template for the documented V1 command-file mechanism. Install it as a project command:

```sh
mkdir -p .opencode/commands
cp node_modules/@frontendxlab/opencode-visual-inspector/commands/inspect.md .opencode/commands/inspect.md
```

The template:

```md
---
description: Open the visual inspector for a running web application
---

Use the `visual_inspect` tool. If `$ARGUMENTS` is non-empty, pass it as the `url` argument. Otherwise let the tool
detect a reachable web application. Do not guess an unreachable URL.
```

Command reference: https://opencode.ai/docs/commands/

For local development of either version, add the package directory to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./plugins/opencode-visual-inspector"]
}
```

## Use

`/inspect` accepts optional validated controls:

```text
/inspect http://localhost:5173 --model openai/gpt-5.6-luna --mode quick --context=fork
```

- `--model provider/model-id` selects a provider and model identifier. Supported by the V2 adapter through `session.switchModel`. The V1 adapter rejects it, because the V1 session API has no model-switch operation.
- `--mode batch|quick` selects batch annotation or live-change mode. The default is `batch`.
- `--context default|fork` selects the current session or a forked context. The default is `default`. Supported by the V1 adapter through `session.fork`. The V2 adapter rejects it, because the V2 plugin session surface does not expose fork.
- `--context:fork` is accepted as an alias for `--context=fork`.
- `--screenshot` opts in to attaching a viewport screenshot to the submission. The default is off, and when off nothing is captured and the submission payload is unchanged.
- `--no-screenshot` is accepted as an explicit opt-out and resets the flag to off.
- Invalid values, duplicate options, extra URLs, malformed model identifiers, and options an adapter cannot honour are rejected before the inspector opens.
- A model combined with `context=default` displays a yellow warning that the current session model will change.

The options are validated and carried into the inspector. `quick` hides the batch action and presents the live-change flow. `--model` is applied through the active session before the inspector opens, so annotations run against the selected model. `--context=fork` routes annotations to a forked session where the adapter supports it. `--screenshot` captures one viewport PNG through the Chrome DevTools Protocol from the Chrome or Chromium instance the inspector already launches, and attaches it to the same submission as the annotations, so the model receives pixels for spacing, color, and alignment questions.

### Screenshots

Use `--screenshot` on `/inspect` or `screenshot: true` on the `visual.inspect` tool when the requested change depends on how the page actually renders: spacing, color, and alignment issues that computed styles and geometry alone do not convey. The browser client also shows an **Attach screenshot** camera toggle in its toolbar, and the toggle state is sent with each submission.

The feature is off by default. When disabled, no capture happens and the submission payload is unchanged.

The capture is taken from the same Chrome or Chromium instance the inspector already launches, through the Chrome DevTools Protocol. The image is attached to the same submission as the annotations: V2 sends it as a `files[]` entry with a `data:image/png;base64,...` uri, V1 as a file part with a `data:` url. The inspector overlay is hidden during capture, so the toolbar and annotation UI do not appear in the image. When browser discovery falls back to the system default browser because no Chrome or Chromium executable was found, screenshots are unavailable, because that path has no DevTools connection. The submission still proceeds and the screenshot is omitted.

Open a known URL:

```text
/inspect http://localhost:5173
```

Or let the plugin detect a running local app:

```text
/inspect
```

The misspelled `/inpect` command is retained as an alias.

If no live app is detected, the command asks the active OpenCode agent to inspect the project, start or locate its web app, and invoke the `visual.inspect` tool (V2) or `visual_inspect` tool (V1) with the resulting URL.

In the browser:

1. The **Inspect** toolbar button toggles inspect mode. When on, hover outlines the element under the cursor and clicking it opens the annotation dialog (Alt+Shift+I annotates the focused element). When off, normal page interactions work and no elements are captured.
2. Clicking the viewport label opens the viewport dialog: pick a device preset (Desktop 1440x900, Laptop 1280x800, iPhone 16 Pro 393x852, Pixel 9 412x915) or enter a custom width and height (320 to 7680 by 320 to 4320). The browser window is resized to the requested size when the browser allows it; the status text reports the actual viewport that resulted, which can differ where resizing is restricted.
3. Select an element and describe the requested change. Choose an optional `::before` or `::after` target when the element has generated content.
4. Change viewports and add more annotations as needed. Each annotation records its viewport when added, so one batch can mix viewport sizes.
5. Select **Send to OpenCode** once to submit the whole batch.
6. Choose whether the main agent, a subagent with relevant context, or a fresh subagent should implement it.

Each annotation includes its viewport, a unique CSS selector when possible, an XPath fallback, stable attributes, element text, a bounded HTML snippet, relevant computed styles, geometry, optional source hints, and an optional `::before` or `::after` target.

OpenCode V2 subagents start with fresh context. The **Subagent with context** option instructs the main agent to package relevant session and project context into the delegation. The **Fresh subagent** option passes only the annotation batch and context discovered from project files.

### Change live

Open the annotation dialog and select **Change live** to send one annotation through the live-change endpoint instead of the batch flow. The chat panel opens and shows the live state stream:

- **Submitting** then **Working**: the agent accepted the change and is implementing it.
- **Change applied**: the agent reported success and the inspector reloads the page to verify.
- The live change times out after 10 minutes of inactivity.

Change live is available through both adapters. Its state is based on best-effort correlation with session activity events rather than a dedicated run identifier. **Stop tracking** stops inspector tracking only; it does not cancel the OpenCode agent. The change still lands in the session either way.

## Configuration

Set a default target URL:

```sh
export OPENCODE_INSPECT_URL=http://localhost:5173
```

Set a browser executable when automatic detection is not suitable:

```sh
export OPENCODE_INSPECT_BROWSER=/usr/bin/google-chrome
```

Only loopback targets are allowed by default. Private-network and public targets require separate process-wide opt-ins:

```sh
export OPENCODE_INSPECT_ALLOW_PRIVATE=1
export OPENCODE_INSPECT_ALLOW_PUBLIC=1
```

Enable only the target classes you trust. Public access does not implicitly enable private-network access.

Plugin options can also set the browser:

```jsonc
{
  "plugins": [
    {
      "package": "@frontendxlab/opencode-visual-inspector",
      "options": {
        "browser": "/usr/bin/chromium"
      }
    }
  ]
}
```

Login navigation: when the target app requires authentication, sign in through the inspector window. The proxy forwards same-origin cookies between the inspector and the target host, and sign-in attempts that redirect to an external identity provider are blocked, because the proxy only follows redirects to the target origin. Apps that gate API calls behind an `Authorization` header sent by the original page will not work: the inspector proxy strips outgoing `authorization` headers and only forwards cookies that the target itself set.

## Proxy lifecycle

The inspector proxy binds to `127.0.0.1` on a random port. The injected client sends a heartbeat every five seconds; if no heartbeat arrives within 30 seconds, the proxy shuts down automatically, stops any live change tracking, and closes open event streams. The browser window is expected to keep the heartbeats alive for as long as it stays open.

## Limitations

- The proxy handles HTTP resources. Development-server WebSocket features such as hot reload may reconnect directly or remain unavailable in the inspector window.
- Cross-origin child frames cannot be inspected from the parent page.
- Pseudo-elements are selected through their owning DOM element because they are not DOM nodes.
- The inspected page is trusted: the injected client runs inside it with access to the target origin. Only inspect pages you control.
- Remote GUI is not supported. The proxy binds to the server loopback interface and the browser is launched by the server-side plugin process, so the inspector can only be used on the machine running the OpenCode server.

## Development

```sh
bun install
bun run typecheck
bun test
```

The package keeps V1 and V2 entrypoints isolated. The V2 TUI, local desktop client, and local web client share the server-side plugin when connected to the same local OpenCode server.

## Update or remove

```sh
opencode2 plugin update 'git+https://github.com/frontendxlab/opencode-annotate.git#main'
opencode2 plugin remove 'git+https://github.com/frontendxlab/opencode-annotate.git#main'
```
