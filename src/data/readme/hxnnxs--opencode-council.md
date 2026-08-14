<p align="center">
  <a href="https://github.com/ihxnnxs/opencode-council">
    <picture>
      <source srcset="assets/opencode-council-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/opencode-council-light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/opencode-council-light.svg" alt="opencode council logo">
    </picture>
  </a>
</p>
<p align="center">OpenCode-native decision council for architecture, review, debugging, and high-stakes coding choices.</p>
<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-mvp-orange?style=flat-square" />
  <a href="https://www.npmjs.com/package/@hxnnxs/opencode-council"><img alt="npm version" src="https://img.shields.io/npm/v/@hxnnxs/opencode-council?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@hxnnxs/opencode-council"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@hxnnxs/opencode-council?style=flat-square" /></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
  <img alt="opencode" src="https://img.shields.io/badge/opencode-%3E%3D1.17.4-black?style=flat-square" />
  <img alt="council" src="https://img.shields.io/badge/council-read--only-goldenrod?style=flat-square" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="docs/README.ru.md">Русский</a> |
  <a href="docs/README.zh.md">简体中文</a> |
  <a href="docs/README.es.md">Español</a>
</p>

---

`opencode-council` asks several read-only OpenCode advisors in parallel, returns their independent opinions, and lets your current OpenCode agent synthesize one grounded recommendation.

## Why This Exists

`opencode-council` is for moments where one model answer is not enough: architecture choices, risky reviews, debugging dead ends, security-sensitive changes, and tradeoffs with real cost.

- uses the current OpenCode model by default instead of separate council credentials
- runs as an OpenCode plugin, tool, and slash-command set
- links advisor work as OpenCode child sessions
- works even with one subscription by rotating roles on one model
- keeps advisors read-only by default instead of shelling out to external CLIs

## Installation

One command through OpenCode:

```bash
opencode plugin @hxnnxs/opencode-council
```

Restart OpenCode after installing. OpenCode loads plugins at startup.

Settings modal note: the server plugin registers `/council*` commands; the settings modal is a TUI plugin entrypoint at `@hxnnxs/opencode-council/tui`. Recent OpenCode builds load this from TUI plugin config. If `/council-settings` does not appear, add the TUI entrypoint to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@hxnnxs/opencode-council/tui"]
}
```

Optional CLI installer:

```bash
npx @hxnnxs/opencode-council install
```

Development install from a checkout:

```bash
git clone https://github.com/ihxnnxs/opencode-council.git opencode-council
cd opencode-council
npm install
opencode plugin "$(pwd)"
```

## Updating

OpenCode does not hot-reload plugins and this package does not self-update in the background. Update the npm package through OpenCode, then restart OpenCode:

```bash
opencode plugin @hxnnxs/opencode-council
```

Equivalent CLI wrapper:

```bash
npx @hxnnxs/opencode-council@latest update
```

If you pinned a version, change the spec explicitly, for example `@hxnnxs/opencode-council@0.1.1`. Project settings in `.opencode-council.json` are preserved.

## Usage

Commands registered by the plugin:

- `/council <question>` - ask the default council and synthesize a recommendation
- `/council-review <question>` - review current git diff or specified change
- `/council-arch <question>` - compare architecture tradeoffs
- `/council-debug <question>` - generate debugging hypotheses and next checks
- `/council-status` - show detected providers, selected council model, and agents
- `/council-settings` - open the TUI settings dialog for council models, roles, and advisor count

The plugin also registers the `council_ask` tool for direct agent use.

Proactive mode is enabled by default. For complex or risky prompts, the active OpenCode agent is instructed to call `council_ask` itself before answering. `/council` still exists when you want to force a council explicitly.

Settings dialog:

```txt
/council-settings
```

The default mode keeps `models` empty: one current OpenCode model acts as 5 role-based advisors. Add models when you want a multi-model council.

## Why OpenCode-Native

Most council tools require separate API keys or multiple coding-agent subscriptions. `opencode-council` uses your existing OpenCode setup:

- one configured model works as a multi-persona council
- additional models become independent council members only when explicitly configured
- no extra API-key flow in the MVP
- child sessions stay linked to the current OpenCode session
- advisors are read-only by default
- proactive consensus can happen without typing `/council` when the active agent judges the request complex enough
- `/council-settings` configures multi-model councils without editing JSON by hand

## Roadmap

Planned next steps:

- debate round - advisors see anonymized first-round answers, critique them, then the current agent synthesizes
- async jobs - `/council-status` and `/council-result` style commands for long-running councils
- markdown/json export - save side-by-side opinions and final recommendations as artifacts
- decision ledger - record decisions, revisit them, and track whether the outcome was good
- follow-up advisors - let the synthesizing agent ask one targeted follow-up to a weak or conflicting advisor
- provider presets - named presets like `balanced`, `security-focused`, `architecture`, and `review`
- optional external CLI advisors - only after real read-only sandboxing and pre/post diff guards exist

## Examples

Architecture:

```txt
/council-arch Should we keep this as one package or split a plugin runtime package from the CLI?
```

Code review:

```txt
/council-review Review the current diff for regressions and missing tests.
```

Debugging:

```txt
/council-debug The provider auth works in the TUI but fails in opencode run. What should we inspect first?
```

Direct tool shape:

```json
{
  "question": "Should this feature be a plugin hook or a custom tool?",
  "mode": "arch",
  "files": ["index.js", "package.json"]
}
```

The tool schema intentionally stays small. Advisor count, timeout, models, roles, diff default, and advisor agent come from `/council-settings`, plugin options, or `.opencode-council.json`.

## Configuration

Default config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@hxnnxs/opencode-council"]
}
```

By default, the council inherits the current OpenCode session model and uses all 5 roles from the active mode preset. It does not automatically use every connected provider. Add `models` only when you intentionally want a multi-model council.

You can also configure project-level runtime settings through `/council-settings`. The TUI dialog writes `.opencode-council.json` in the project root so the server-side `council_ask` tool can read the same settings.

With explicit defaults:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@hxnnxs/opencode-council",
      {
        "models": ["openai/gpt-5.5", "opencode/big-pickle"],
        "roles": ["architect", "skeptic", "security"],
        "maxAdvisors": 5,
        "proactive": true,
        "timeoutMs": 300000
      }
    ]
  ]
}
```

Options:

- `models` - opt-in advisor models in `provider/model` format; when omitted, the current OpenCode model is used
- `roles` - override advisor roles; when omitted, each mode uses a 5-role preset and the advisor limit controls how many are active
- `agent` - advisor agent name, defaults to `council-advisor`; invalid or hallucinated agents fall back to `council-advisor`
- `maxAdvisors` - advisor limit, 1 to 5, defaults to 5
- `proactive` - when true, injects a narrow policy that tells the active agent to call `council_ask` for complex/high-impact prompts; defaults to true
- `timeoutMs` - per-advisor timeout, defaults to 300000
- `includeDiff` - include git status and diff by default

Project settings file written by `/council-settings`:

```json
{
  "version": 1,
  "models": ["openai/gpt-5.5", "opencode/big-pickle"],
  "roles": ["architect", "skeptic", "security"],
  "maxAdvisors": 5,
  "includeDiff": false,
  "timeoutMs": 300000
}
```

Set `models` to `[]` to keep the one-model default.

Disable proactive council if you only want explicit slash commands:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@hxnnxs/opencode-council", { "proactive": false }]]
}
```

## Safety

The MVP intentionally avoids external CLI adapters. It uses OpenCode child sessions and a registered `council-advisor` agent with read-only defaults:

- `edit` denied
- `bash` denied
- write-capable tools disabled for advisor prompts
- advisor prompts explicitly forbid project modifications

This keeps the default model safe for review and architecture advice. If external advisors are added later, they should run in real read-only sandboxes with pre/post diff guards.

## Troubleshooting

`Agent not found: "default"` means OpenCode tried to execute a command or child session through an agent named `default`. Current plugin commands explicitly run through `build`, and council members default to `council-advisor`. Update the local checkout and restart OpenCode if you see this after installing from a local path.

`ProviderModelNotFoundError` for a provider you did not choose means an older plugin version auto-selected connected provider defaults. Current behavior uses only the current OpenCode model unless `models` is explicitly set. Update the plugin and restart OpenCode.

`Agent not found` for a custom council agent means the calling model supplied an advisor agent that OpenCode does not have. Current behavior validates advisor agents before child sessions start and falls back to `council-advisor` with a note in the output.

## Architecture

Files:

- `index.js` - OpenCode plugin, `council_ask` tool, command registration, advisor orchestration
- `tui.js` - TUI plugin entrypoint for `/council-settings`
- `bin/opencode-council.js` - install wrapper and diagnostics CLI
- `SECURITY.md` - safety model and vulnerability reporting
- `.opencode-council.json` - optional project settings written by `/council-settings`

Flow:

1. `experimental.chat.system.transform` injects a narrow proactive policy into normal agent prompts, unless disabled.
2. `/council-settings` is registered by the TUI plugin and opens `DialogSelect`/`DialogPrompt` modals for project settings.
3. The user runs `/council...` or the active agent decides a complex request should call `council_ask`.
4. Slash commands are registered as empty autocomplete stubs, then `command.execute.before` keeps only the visible `/council ...` text in chat.
5. `experimental.chat.messages.transform` replaces that visible command with the internal `council_ask` instruction only for the model request.
6. The tool loads `.opencode-council.json`, then applies advisor count, timeout, models, roles, and diff defaults from settings.
7. The tool uses configured models if provided; otherwise it uses the current OpenCode session model, falling back to `config.model`.
8. The tool creates child sessions under the current session.
9. Each advisor receives the same question with a distinct role and read-only permissions.
10. The tool returns side-by-side opinions for the current agent to synthesize.

## Development

Run checks:

```bash
npm run check
npm pack --dry-run
```

This package has no build step.

Release builds are produced by GitHub Actions on `v*` tags. The workflow runs checks, builds the npm tarball with `npm pack`, uploads it as an artifact, and attaches it to the GitHub release. npm publishing is intentionally explicit so tag builds do not fail when npm credentials are missing or scoped incorrectly.

## Project Status

MVP. This is an independent OpenCode plugin. It is not built by the OpenCode team and is not affiliated with OpenCode.

---

**OpenCode** [Website](https://opencode.ai) | [Docs](https://opencode.ai/docs) | [Discord](https://opencode.ai/discord)
