# opencode-browser-annotation-plugin

Select an element in your browser, type an instruction, and send it — with the
element's metadata — to your [OpenCode](https://opencode.ai) agent's active
session. Built for a headless-server + remote-desktop setup: the agent runs on a
server you reach over SSH, and the browser runs on your desktop.

Text and element metadata only. **No screenshots, no vision.** The agent locates
the code from the selector/DOM context you send.

## How it works

```
Desktop Chrome (extension)
  └─ Alt+A → overlay + sidebar → pick element, type instruction, Act/Queue → [Submit]
       └─ POST http://127.0.0.1:39517/annotations   (via ssh -L when remote)
OpenCode host (plugin)
  └─ HTTP server on 127.0.0.1 → injects a turn into the active session
       └─ agent receives the instruction + element metadata and acts
```

The plugin binds to `127.0.0.1` only. When OpenCode is on a remote host, an
`ssh -L` local forward carries the extension's POST from your desktop to it — no
public port, and SSH provides the auth and encryption.

## Install

### 1. Plugin (on the OpenCode host)

Add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["opencode-browser-annotation-plugin"]
}
```

Restart OpenCode. The plugin starts an HTTP server on `127.0.0.1:39517`.
Configure with environment variables if needed:

- `OPENCODE_ANNOTATION_PORT` (default `39517`)
- `OPENCODE_ANNOTATION_HOST` (default `127.0.0.1`)

### 2. Skill (on the OpenCode host)

The agent learns how to interpret annotations from a bundled skill, so the
annotation payload stays lean (no repeated instructions). Copy it into your
OpenCode skills directory:

```bash
mkdir -p ~/.config/opencode/skills/browser-annotation
cp node_modules/opencode-browser-annotation-plugin/skills/browser-annotation/SKILL.md \
   ~/.config/opencode/skills/browser-annotation/SKILL.md
```

Restart OpenCode. The agent auto-loads this skill when an annotation arrives
(the payload identifies itself and references the skill). Verify with
`opencode debug skill`.

### 3. Extension (in your desktop Chrome)

Until it is on the Chrome Web Store, load it unpacked:

1. Get the `extension/` directory from this package (`node_modules/opencode-browser-annotation-plugin/extension`, or clone this repo).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `extension/`.
3. Use a dedicated Chrome profile — the same debug profile you drive with the agent is a good choice.

### 4. Tunnel (when OpenCode is remote)

The extension (on your desktop) needs to reach the plugin server (on the host),
so use a **local forward**. Run on your desktop, in a separate window:

```bash
ssh -N -L 39517:127.0.0.1:39517 you@host
```

If you also drive the browser from the agent (desktop-drive on 9333), that is the
opposite direction (host → desktop), so it uses a reverse forward. You can run
both at once:

```bash
ssh -N -L 39517:127.0.0.1:39517 -R 9333:127.0.0.1:9333 you@host
```

If OpenCode runs on the same machine as your browser, no tunnel is needed — the
default `http://127.0.0.1:39517` already works. Set a custom endpoint in the
extension's **Settings** page.

## Use

1. Send at least one message in OpenCode so the plugin knows the active session
   (or pick a target session in the sidebar).
2. Press **Alt+A** on any page, then click an element (highlight follows the
   cursor; works inside shadow DOM). A popup opens next to it.
3. In the popup, type an instruction, then either:
   - **Send** (or Cmd/Ctrl+Enter) — submit this one right away, no sidebar needed.
   - **Add to list** — stash it in the sidebar to batch with others.
4. Press **Alt+Shift+A** (or click the toolbar icon) to open the **list sidebar**,
   review pending annotations (each with a thumbnail), pick the **target session**,
   and **Submit** them together. The footer shows a steady connection status.

Shortcuts: `Alt+A` picks an element, `Alt+Shift+A` toggles the list. If they do
nothing after loading an unpacked build, set them at `chrome://extensions/shortcuts`.

## How the agent handles it

When you submit, the plugin injects a short user turn into the chosen session
that identifies itself as a browser annotation and references the
`browser-annotation` skill. The agent loads that skill (installed in step 2) to
interpret the element metadata and locate the code — so the interpretation rules
live once in the skill, not in every message.

If your agents use a project `AGENTS.md`, you can make routing explicit by adding
a line such as:

```
When a turn is a browser annotation (it says so and references the
`browser-annotation` skill), load that skill and use the element metadata
(component path, data-testid/id/role, ancestors, nearest region, text) to locate
and change the corresponding code. Confirm the element exists before editing.
```

## Payload

The extension POSTs to `/annotations`:

```json
{
  "extensionVersion": "0.6.0",
  "sessionID": "ses_...",
  "annotations": [
    {
      "instruction": "Make this button larger and blue",
      "page": { "url": "https://example.com/app", "title": "My App" },
      "element": {
        "selector": "button.cta",
        "tag": "BUTTON",
        "id": "signup",
        "testId": "signup-cta",
        "role": "button",
        "ariaLabel": "Sign up",
        "classes": ["cta", "primary"],
        "text": "Sign up",
        "componentPath": "App > Header > SignupButton",
        "framework": "react",
        "landmark": "header[role=banner]",
        "ancestors": ["div.actions", "header[role=banner]"],
        "bounds": { "x": 100, "y": 200, "width": 120, "height": 40 },
        "inShadow": false,
        "html": "<button class=\"cta\" id=\"signup\">"
      }
    }
  ]
}
```

The plugin surfaces the most code-locatable identifiers first (component path,
testId, id, name, role, ancestors, region) and treats the CSS path and bounds as
weak hints. Build-generated/hashed class names are filtered out, text is
whitespace-collapsed, and `html` is the element's opening tag with secret-looking
attribute values redacted. `sessionID` is optional; without it the plugin targets
the last-active session.

`GET /status` returns `{ ok, activeSession, sessionID, sessionTitle, sessions, host, port }`
for a quick health check and to list/target sessions.

## Develop

```bash
npm install
npm run typecheck
npm run build      # emits dist/plugin.js
```

The plugin source is `src/plugin.ts`; the extension is plain MV3 in `extension/`.

## Limits

- Text + element metadata only; no screenshot is sent or seen by the model.
- The picker lists every recent session across all projects and all running
  OpenCode processes, with sessions you've touched this run floating to the top.
  Pick any by id; without a `sessionID` the plugin targets the most recently
  active one.
- Cross-process aggregation: each OpenCode process only serves its own sessions
  through its in-process API, so every plugin instance also runs a small peer
  server on an ephemeral port and registers `{pid, port, directory}` under
  `$XDG_DATA_HOME/opencode/annotation-peers/`. The instance that wins the shared
  endpoint (default `39517`) fans `/status` and `/annotations` out to all live
  peers, merges the session lists, and routes each annotation to the process that
  owns the target session. Dead instances' registry files are reaped
  automatically (pid liveness + staleness), and the extension's contract
  (`/status`, `POST /annotations`) is unchanged.
- Send a message first so a session is active if you rely on the no-`sessionID`
  fallback.

## License

MIT
