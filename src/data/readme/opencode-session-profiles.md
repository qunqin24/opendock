# OpenCode Profiles

**Your models, grouped by task or subscription. One shortcut to switch.**

A plugin for the **OpenCode V2 TUI** that puts configurable model profiles in the sidebar, below MCP. Each profile sets model defaults for Build and Plan, without locking you into them.

```text
Profiles

WORK
  Build: GitHub Copilot / Sol
  Plan:  GitHub Copilot / Sol

PRIVATE (Current)
  Build: OpenAI / Sol
  Plan:  OpenAI / Sol

DUMB TASK
  Build: OpenAI / Luna Max
  Plan:  OpenAI / Sol
```

## Install

Requires **OpenCode V2**; tested on **2.0.26**. V1 is not supported.

### Guided setup with OpenCode

Let OpenCode ask what you want and configure the plugin for you:

```sh
opencode mini --agent build --prompt 'Help me install and configure opencode-session-profiles. Read https://github.com/mastorm/opencode-profiles/blob/main/README.md for the configuration format. Before making changes, ask which profiles I want, the Build and Plan model and optional reasoning variant for each, and which profile should be the default. Inspect my available OpenCode models and offer valid choices; do not invent model IDs or ask for credentials. Summarize the proposed global configuration and wait for my confirmation. Then back up my existing configuration, install with opencode plugin add opencode-session-profiles, and configure exactly one plugin entry with my chosen options. Respect my OpenCode config directory and existing JSON or JSONC files; preserve unrelated settings, comments, and existing profiles unless I approve changing them. Do not change my global agent models or remove other plugins. Run opencode reload, verify the plugin loads, and explain how to use it and whether I need to reopen the TUI.'
```

This opens OpenCode's **interactive Mini interface in Build mode**. Answer its questions and approve the proposed changes and any requested permissions. It uses your connected model and may incur normal model costs; it is an agent-assisted setup, not a deterministic installer.

### Manual setup

Install it using OpenCode's CLI:

```sh
opencode plugin add opencode-session-profiles
```

This installs the package and adds it to your global configuration. Then replace the generated string entry in `~/.config/opencode/opencode.json` with the object below to configure your profiles. The install command does not accept profile options; those still belong in configuration. No separate TUI configuration is needed.

Alternatively, add the configured entry directly to your global or project `opencode.json`; OpenCode installs missing packages automatically.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-session-profiles",
      "options": {
        "defaultMode": "private",
        "modes": {
          "private": {
            "label": "PRIVATE",
            "models": {
              "build": "openai/gpt-6.1-sol",
              "plan": "openai/gpt-6.1-sol"
            }
          },
          "work": {
            "label": "WORK",
            "models": {
              "build": "github-copilot/gpt-6.1-sol",
              "plan": "github-copilot/gpt-6.1-sol"
            }
          },
          "dumb-task": {
            "label": "DUMB TASK",
            "models": {
              "build": "openai/gpt-6-luna#max",
              "plan": "openai/gpt-6.1-sol"
            }
          }
        }
      }
    }
  ]
}
```

Merge this into your existing configuration rather than replacing it. Use models available in **your** OpenCode model picker, and connect their providers first. The models above are examples, not requirements.

Run `opencode reload`, then reopen the TUI if necessary.

## Use

- **Ctrl+Shift+M** cycles profiles in configuration order.
- **Click a profile** in the sidebar to select it.
- **`/mode`** opens a picker; **`/mode work`** selects a profile by its configuration key.
- The sidebar's **(Current)** marker shows the selected profile. Switching is quiet: no success toast or loading message.

Profile switching affects **only the current idle session**. The selection is saved with that session and survives restarts.

### Before starting a session

The launch screen shows your profiles, the selected profile's Build and Plan models, and a **(Current)** marker. It initially selects `defaultMode`.

Click a profile, use **Ctrl+Shift+M**, or run **`/mode`** to change this selection. **Switching profiles keeps the launch screen open** and creates no session.

When ready, click **Start session with …** or run **`/start-profile`**. This opens an empty session with the selected profile already applied, before any prompt can run. Existing sessions stay untouched.

This launch selection is local to this TUI and does not change your configuration. Typing a normal prompt directly on the launch screen still follows OpenCode's ordinary new-session flow and uses the configured `defaultMode`; use **Start session with …** to apply a different launch selection.

### Defaults, not locks

Selecting a profile immediately applies its default model for the current agent. Switching between Build and Plan applies that profile's corresponding default.

**Afterward, pick any other model or reasoning variant freely.** It stays selected when you submit prompts or reopen the session. Selecting a profile again reapplies its defaults. The sidebar shows the profile's defaults, not necessarily your manually selected model.

New empty sessions use `defaultMode`. Existing conversations without a saved profile keep their model until you explicitly select one.

## Configuration

Each entry in `modes` requires a short `label` and `models.build` / `models.plan`. Add as many profiles as you like; they appear automatically in the sidebar and picker.

- Model format: `provider/model`, optionally `provider/model#variant`.
- `defaultMode` names a profile; if omitted, the first configured profile is used.
- Additional agent IDs can be added to `models`. Unmapped agents retain their normal model; selecting a profile while on an unmapped agent reports an error.
- Configuration and RPC inputs are validated with **Zod**.

To change the shortcut, add this to `~/.config/opencode/cli.json`:

```json
{
  "keybinds": {
    "session-modes.cycle": "ctrl+shift+m"
  }
}
```

Ghostty reserves Ctrl+Tab for its own tabs, which is why this plugin defaults to Ctrl+Shift+M. If your terminal intercepts modified shortcuts, use the picker or mouse instead. On narrow terminals, the sidebar may be hidden; `/mode` still works.

## Privacy and scope

**Switching providers in an existing conversation can send its history to the new provider.** Start a new session if private and work histories must remain separate.

This is a model-defaults plugin, not an isolation boundary. It does not swap credentials, separate files or MCP servers, restrict manually selected providers, or switch between two accounts under the same provider. Subagent model choices keep their own configuration, and child sessions do not automatically inherit the profile.

For remote servers, configure the package on the server as well: the TUI uses the server plugin's RPC. All configured profiles use the server's available providers and credentials.

## Development

```sh
npm ci --ignore-scripts
npm run check
npm pack --dry-run
```

Use a local package path in `plugins[].package` to try changes before publishing. Tests cover configuration validation, switching, session isolation, rollback, and preservation of manual model selections.

For a live TUI smoke test, configure the three example profiles in a disposable project and run `python3 tests/smoke.py /path/to/project`. This creates and deletes only its own sessions and sends no prompts. Installing `pyte` in the test environment additionally checks sidebar placement and mouse selection.

With `pyte` installed, `python3 tests/launch-smoke.py /path/to/project` also checks the launch indicator, mouse/keyboard/slash selection without leaving the launch screen, and explicit session start, including an 80×24 terminal.

## License

[MIT](LICENSE)
