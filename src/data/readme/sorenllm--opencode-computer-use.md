# opencode-computer-use

Desktop computer use for [opencode](https://opencode.ai), backed by the
user-installed [cua-driver](https://github.com/trycua/cua/tree/main/libs/cua-driver) (trycua/cua, MIT).
One consolidated `computer` tool drives real applications through the OS
accessibility layer — capture with numbered elements, act by element index,
verify with a fresh capture — the loop Hermes popularized, in opencode plugin
form.

## What it adds over a raw MCP config

`cua-driver mcp-config --client opencode` already prints a raw MCP snippet,
and the cua docs note you need a real MCP server "so screenshots are
preserved in image blocks". This plugin is that layer and more:

- **Screenshot contract** — captures return as model-visible image
  attachments (inline data URLs) with scale metadata; a raw CLI/skill path
  loses the pixels.
- **Semantic verdicts** — every input action returns
  `done / verify_fresh_state / escalate` ("a correct answer alone does not
  prove the agent operated the app" — this automates that check), with an
  explicit ban on re-issuing input on an escalation recommendation alone.
- **Safety gates** — destructive key combos (lock/log-out class) and
  dangerous typed shell patterns are hard-blocked *before* approval; a
  sticky-target guard refuses input that would land on a different app than
  the last capture; per-action approval via the permission system.
- **Lifecycle guidance** — local probe, honest degradation, exact user-run
  remediation. **The plugin never installs, upgrades, or network-polls the
  driver.**

## Install

Requires opencode ≥ 1.18 and, for actual desktop control, the cua-driver
binary (a user operation — like installing opencode itself):

```bash
# 1. plugin (npm spec)
opencode plugin @sorenllm/opencode-computer-use --global

# 2. driver — run this yourself in a terminal; the plugin never will
# Windows (PowerShell):
irm https://cua.ai/driver/install.ps1 | iex
# macOS / Linux:
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

After installing the driver, restart opencode (the probe runs at startup).
macOS additionally needs the Accessibility + Screen Recording grants when
the driver asks for them (they attach to the driver's own app identity).
Verify any time: `cua-driver --version` — this plugin requires ≥ 0.28.0
(tested against 0.28.2).

If the driver is missing or too old, the only registered tool is
`computer_status`, which prints the exact problem and the command above.
Installation and upgrades are **user operations**: the plugin never executes
the installer, never fetches lifecycle data over the network, and its tool
descriptions tell the agent not to run installers on your behalf.

## Usage (the agent loop)

```
computer(action=capture, mode=som, app="Code")   # screenshot + numbered elements
computer(action=click, element_index=3)          # element-addressed input (snapshot-token armored)
computer(action=type, text="hello")
computer(action=set_value, element_index=7, value="opt2")  # selects without opening menus
computer(action=key, keys="ctrl+s")
computer(action=scroll, direction="down", amount=3)
computer(action=zoom, x=120, y=40, w=300, h=220) # native-resolution crop for dense UI
computer(action=click, x=30, y=50, from_zoom=true)  # zoom-image coords remapped automatically
computer(action=verify, predicates=[{element_index: 7, value: "opt2"}])  # deterministic check
computer(action=invoke_menu, path="View > Zoom > In")  # native menus by name, no pixels
computer(action=launch_app, app="Notepad")       # hidden start, auto-selects its window
computer(action=capture, mode="ax")              # element list only — cheapest
```

- `capture`/`zoom`/`verify`/`list_*` are free (no approval); every input
  action asks.
- Actions: `capture zoom verify click double_click right_click drag scroll
  type key set_value invoke_menu launch_app wait list_apps list_windows
  focus_app`. There is no separate `middle_click` action — `click` takes
  `button: "middle"`.
- `focus_app` SELECTS the sticky target without touching the foreground;
  `raise: true` (or `delivery_mode: "foreground"` on input) is a SEPARATE
  approval domain (`computer:foreground`) — a granted background approval
  never covers raising a window.
- A `raise` result carries `raised: true/false` from the driver's own
  foreground evidence (`now_fg_hwnd`); `raised: false` means the activation
  did not land (suspended/cloaked UWP window, or Windows' foreground-lock
  pending recent user input) — verify before retrying, never assume it worked.
- `launch_app` starts hidden by default; the result discloses the bound
  window's minimized/off-screen state because a UWP window launched hidden
  may be suspended and click-through until raised.
- Prefer element `[index]` addressing over pixel coordinates; never derive
  coordinates from the attached screenshot (it may have been resized
  upstream). For small targets use the `zoom` action's native-resolution
  crop and pass `from_zoom: true` with coordinates read off it.
- Element addressing is staleness-armored: each capture records the driver's
  snapshot id + element tokens, inputs carry them, and a stale reference
  fails closed (`stale_snapshot`) instead of landing on whatever now sits at
  that index. After a driver restart the first result says so.

### On screenshot resolution

Captures ask the driver to cap the screenshot's long edge at ~1568 logical
pixels (`max_dimension`), so what the model sees is already bounded; the text
output carries the image-to-native scale mapping and an element-first
contract (pixel math on a resized image is the top accuracy killer — element
`[index]` addressing avoids it entirely). Detail work goes through the
`zoom` action's ≤500px native-resolution crops with `from_zoom` remapping on
the follow-up input. Token economy comes from the `ax` mode (text-only),
bounded element lists (100 rendered; the driver-side walk is bounded at 200,
configurable 50–1000), if-changed screenshot dedup (identical images are
omitted for at most two consecutive captures), and `capture_after` being
opt-in per call or via policy.

## Skill (operating manual) & activation entry

The plugin ships a Hermes-style **skill as the agent-facing manual**:
`skills/computer-use/SKILL.md`. Its description is the scope constraint —
the agent is told to load the manual and use computer use ONLY for real
desktop-GUI work (never as a substitute for file tools, bash, or browser
tools), which keeps it from firing casually.

The config hook appends the bundled `skills/` dir to `skills.paths`
(null-checked; your own definitions always win) so the skill appears in the
`skill` tool with no copy step. The activation entry is the host's native
surface: opencode auto-promotes every discovered skill to a slash command
whose template is the full SKILL.md — so **`/computer-use <task>`** injects
the entire manual plus your task as one user message (manual present at
turn 0, no model-mediated load), and the **`/skills`** menu browses
available skills. The plugin registers no command of its own.

If your host resolves skills before plugin config hooks, add the path
manually (one line) or copy the folder:

```jsonc
// opencode.json — manual fallback
{
  "skills": {
    "paths": [
      "~/.cache/opencode/packages/@sorenllm/opencode-computer-use/node_modules/@sorenllm/opencode-computer-use/skills"
    ]
  }
}
// or: copy skills/computer-use/ into ~/.config/opencode/skills/
```

Per-skill gating is available through the host's permission system
(`permission.skill: { "computer-use": "deny" }` hides it from an agent).

## Configuration

```jsonc
// opencode.json
{
  "plugin": [
    ["@sorenllm/opencode-computer-use", {
      // "computerUse": {
      //   "captureAfter": "off",   // "som" | "ax": auto-capture after input actions
      //   "agentCursor": false,    // driver-side agent-cursor visualization (default off)
      //   "maxElements": 200      // driver-side element walk bound (50–1000)
      // }
    }]
  ],
  "permission": {
    "computer": "ask",                // background input (default)
    "computer:foreground": "ask"      // raising windows / foreground delivery (separate domain)
  } // "deny" wins; "always" via the approval dialog
}
```

- `OPENCODE_CUA_DRIVER_CMD` — point at a specific driver binary. Authoritative:
  if it is wrong, readiness fails naming it; the plugin never silently picks
  another binary.
- Telemetry: the plugin spawns the driver with
  `CUA_DRIVER_RS_TELEMETRY_ENABLED=0` (the driver phones home by default —
  this turns it off for plugin-spawned sessions).
- Non-vision models cannot read the screenshot attachments; the tool text
  still carries the element tree, which is often enough (ax-first workflows
  work fully text-only).
- For tighter scoping, the driver itself supports bounded permission mode
  with a capability manifest (`cua-driver serve --permission-mode bounded`) —
  an advanced, user-side option; this plugin runs the standard mode.
- Browser work: pair with `@playwright/mcp` (accessibility-snapshot-first)
  rather than driving a browser through desktop pixels.

## Uninstall

1. Remove the plugin entry from `~/.config/opencode/opencode.json`.
2. Delete the package store dir
   `~/.cache/opencode/packages/@sorenllm/opencode-computer-use/`.
3. The driver is yours (Hermes and other agents may share it): remove with
   its own uninstaller if you want it gone.
4. Done — the plugin writes nothing outside its process (no temp files, no
   ledgers; a `OPENCODE_CU_PROBE=1` env opt-in appends probe diagnostics to
   the OS temp dir for debugging).

## File ledger

| Location | What | Cleanup |
|---|---|---|
| `~/.config/opencode/opencode.json` | `plugin` array entry | installer-written |
| `~/.cache/opencode/packages/...` | installed package copy | installer-written |
| cua-driver install (`%LOCALAPPDATA%/Programs/Cua/`, `~/.local/bin/`, …) | the driver binary | user-owned, shared |
| merged config object (RAM only) | `permission.computer` default | vanishes with the plugin |
| one child process per opencode run | `cua-driver mcp --direct` | killed on plugin dispose |

## Status

0.4.0 — removed the plugin-registered `/computer` command: hosts promote
discovered skills to slash commands natively, making `/computer-use <task>`
(full-manual template + appended args) the stronger activation entry. The
plugin's only activation wiring is the `skills.paths` append.
0.3.0 — added the skill activation layer (bundled operating-manual skill +
skills.paths wiring; activation entry is the host's native `/computer-use`
skill command). Contract floor 0.28.0, tested against 0.28.2.
The one-way version policy: when a newer driver is verified, the floor and
tested-against range rise together; a drifted driver degrades to
`computer_status` diagnostics rather than partial operation.
