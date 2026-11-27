# opencode-wireframer

[![npm version](https://img.shields.io/npm/v/opencode-wireframer.svg)](https://www.npmjs.com/package/opencode-wireframer)

**Review the interface before the code exists.**

An [OpenCode](https://opencode.ai) plugin that gives your coding agent a
wireframing step. The agent captures the current screen or draws a proposal on
an editable canvas, you annotate it, and only an approved revision reaches
implementation.

![The wireframe review workspace: two annotated screens on the canvas and the open notes in the sidebar.](docs/wireframe-review.png)

## Why

Agents are good at producing UI and bad at guessing what you meant. A prompt
like "make the API keys page nicer" produces plausible code that is wrong in
ways that are expensive to fix after the fact.

This plugin inserts a cheap review point: the agent proposes the screen as a
wireframe, you point at the parts that are wrong on the canvas, and it revises
before writing any application code. Notes are structured — a pin or area tied
to a semantic element id — so the agent gets precise feedback instead of a
paragraph to interpret.

## Install

```sh
opencode plugin add opencode-wireframer
```

Or add it to `opencode.json` / `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-wireframer"]
}
```

Then run `/reload` in an existing session.

Restart once with `opencode service restart` if the tools do not appear; the
workspace server is started during plugin setup.

## The loop

1. **Capture** — for a change to an existing screen, `wireframe_capture` stores
   the current UI as a semantic baseline.
2. **Propose** — `wireframe_revise` saves the proposed screen as a new revision
   and diffs it against the baseline by stable element id.
3. **Review** — `wireframe_workspace` returns the URL of the review workspace.
   You annotate the board, reply to notes and submit the review.
4. **Revise** — the agent reads the notes with `wireframe_review` and publishes
   a new revision. The open workspace reloads automatically.
5. **Approve** — you approve the revision in the workspace.
6. **Implement** — `wireframe_implement` returns the approved change set, and
   `wireframe_complete` marks the revision as the current UI once the work has
   landed.

Approval is enforced by the tools, not by convention: `wireframe_implement`
refuses revisions that are not approved or still have open notes, and a new
revision invalidates the previous approval.

### Reviewing

- **Pins** attach a numbered marker to one element; **areas** draw a dashed
  region around a multi-element selection.
- Click a marker to jump to its note, or a note to highlight its target.
- Notes are threaded: the agent can reply, and you can resolve, edit or delete
  your own.
- The mapping tree lists every semantic id, so you can find elements that are
  visually similar.
- The canvas stays grayscale on purpose — colour debates belong in the design
  tool, not in a behaviour review.

## Tools

| Tool | What it does |
| --- | --- |
| `wireframe_workspace` | Start or reuse the review workspace and return its URL. |
| `wireframe_status` | List artifacts, revisions and review state. |
| `wireframe_capture` | Record the current UI as a read-only baseline. |
| `wireframe_generate` | Create a new wireframe artifact. |
| `wireframe_revise` | Save a proposed revision and diff it against the current UI. |
| `wireframe_review` | Read the review notes for a revision. |
| `wireframe_approve` | Approve the current revision. |
| `wireframe_discard` | Discard a revision while keeping it for audit. |
| `wireframe_implement` | Return the approved change set for implementation. |
| `wireframe_complete` | Mark an implemented revision as the current UI. |
| `wireframe_feedback` | Add, list or resolve agent notes on the board. |

The plugin also ships an auto-invoked `wireframe-review` skill and a
`/wireframe <request>` command, so "wireframe it before implementing" is the
default path for visual work.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-wireframer",
      "options": {
        "workspacePort": 4319,
        "openWorkspace": true
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `workspacePort` | `4319` | First port to try. Each project directory gets a stable port in `4319–4418`, and the next nine ports are fallbacks so several projects can run at once. |
| `openWorkspace` | `true` | Open the workspace in the browser when `wireframe_workspace` runs. |

Environment overrides: `WIREFRAMER_WORKSPACE_PORT`, `WIREFRAMER_OPEN_WORKSPACE`
(`0` or `false` disables opening), `WIREFRAMER_WORKSPACE_DIR` (built workspace
assets).

Artifacts are stored per project in `.opencode/wireframes/`. Add that directory
to `.gitignore` unless you want to commit the review history.

## Security

The workspace is a local tool and is meant to stay local:

- The server binds to loopback and checks the `Host` header, so DNS rebinding
  cannot reach it from a web page.
- State-changing requests must come from the same origin, which blocks CSRF
  from other sites.
- Request bodies must be `application/json`.

There is no authentication, no multi-user access control and no TLS. Do not
expose the port through a proxy, tunnel or reverse proxy. See
[SECURITY.md](SECURITY.md) for the reporting policy.

## Development

Bun 1.4 or newer is required.

```sh
bun install            # installs workspaces and builds the plugin (postinstall)
bun run dev            # Vite workspace on http://127.0.0.1:4317 + dev bridge
bun run build          # web app, then the plugin bundle (with packaged workspace)
bun run test           # unit, component and plugin tests
bun run test:browser   # Playwright, both hosts
bun run verify         # typecheck + tests + build
bun run verify:package # pack the plugin and check the tarball in isolation
```

To install from source, point the config at the checkout:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-wireframer/packages/plugin"]
}
```

Run `bun run build` first, then `/reload`. Use `bun run workspace:serve` to
serve the workspace without OpenCode.

### Repository layout

```
packages/
  shared/             Semantic schema, manifests, mapping, semantic diff
  wireframe-engine/   Layout solver from semantic trees to rectangles
  board-adapter/      Excalidraw renderer, annotation overlay, snapshots
  annotation-engine/  Annotation model, lifecycle, revision prompt
  core/               Artifact store, artifact API and HTTP handler
  plugin/             OpenCode plugin, bundled build and workspace server
  web-app/            Vite review workspace
docs/                 Design and verification records
tests/browser/        Playwright browser tests
```

The board engine is [Excalidraw](https://excalidraw.com) (MIT). The adapter
boundary keeps it replaceable: semantic ids never depend on Excalidraw object
ids.

## Limitations

- Loopback-only, single reviewer. Autosave is last-write-wins for the board.
- Review-mode locking is enforced by the workspace layer, not inside Excalidraw.
- Baselines are authored by the agent from code, not parsed from screenshots;
  complex screens may need corrections.
- The primitive set is fixed at 15; unmodelled UI is built from labelled
  containers.
- Live updates are polled every three seconds, not pushed.
- `wireframe_implement` returns a brief; it does not track implementation state.
- Discarded revisions are kept for audit and cannot be restored from the
  workspace.

## License

MIT. The published package bundles third-party code; see
[packages/plugin/THIRD_PARTY_NOTICES.md](packages/plugin/THIRD_PARTY_NOTICES.md).
