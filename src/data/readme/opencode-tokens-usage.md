# Opencode Token Usage Info Plugin

Adds a <code>/tokens_usage</code> command to OpenCode that shows what a session costs and where its tokens went:
cost, a per-category token breakdown, and how full the context window is. Script-based only, no LLM in the loop.
No message content leaves your machine.

<div align="center">
  <img src="docs/info.png" alt="Token usage dialog: cost, token categories and context window" width="600" />
</div>

## Install

Requires **OpenCode v2.1.4+** (Node 22.6+ only for source installs).

### From npm

Add the package to the `plugins` array in `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-tokens-usage"]
}
```

Save the file — OpenCode installs and loads the plugin. To pin a version, use `"opencode-tokens-usage@1.0.2"`.

### Manual (local checkout)

```bash
git clone https://github.com/sechlol/opencode-context-info.git
cd opencode-context-info
npm install
./install.sh
```

`install.sh` registers the checkout's absolute path in the global config, so re-run it if you move the repo. It is a
thin wrapper around `scripts/install.ts`, which you can also run directly: `./scripts/install.ts [--uninstall]`.

Register the plugin **once** — either by package name or by path, not both, and not in `cli.json`.

### Uninstall

Remove the `opencode-tokens-usage` entry from `plugins` in `~/.config/opencode/opencode.json`. From a checkout you can
also run:

```bash
./install.sh --uninstall
```

## Usage

Run `/tokens_usage` (alias `/usage`), or pick **Show token usage** from the command palette:

- **Inside a session** — a dialog with that session's stats:
  - cost and a breakdown of input, output, reasoning, cache read and cache write tokens
  - context-window occupancy (last completed step's prompt size vs the model's limit, an estimate)
  - per-model totals and recent steps (time, model, tokens, cost, tools)
  - subagent usage, listed per child session
  - project totals, with the time range
- **On the home screen** — a searchable session picker; choose any session to inspect it.

Keys: `esc` closes the dialog, `r` refreshes it.

Cost is the comparable headline. Token categories can overlap by provider, so the dialog shows the components and a
"Σ reported" sum instead of a grand total. Subagent tokens are listed separately and are not added to the session total.

## Verify

Start OpenCode and run `/tokens_usage` in a session and from the home screen. If the command is missing, run `/reload`
and check `~/.local/share/opencode/log/opencode.log`. Note that `opencode plugin list` only covers server plugins, so it
says nothing about this one.

## Known limits

- The session picker lists up to 100 root sessions of the current project and searches them locally.
- Context-window occupancy is an estimate based on the last completed step.
- Project totals come from an experimental endpoint and need a reachable project ID.
- Cost is provider-reported: free models show `$0`, unknown values show `—`.
