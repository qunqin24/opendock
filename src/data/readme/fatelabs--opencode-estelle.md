# Fate Labs Estelle plugins

Estelle for Claude Code, Codex, Kimi Code, Grok Build, Cursor, OpenCode, Pi, Qwen Code, Gemini CLI, Google Antigravity, Hermes Agent,
mini-swe-agent, OpenClaw and fx. Each host has its own package
under `plugins/`. They connect to `https://api.fatelabs.ca/mcp`.

Install your coding host first, with external Node.js 22+. Run `/estelle:login` once (`$estelle:login` on Codex,
`/estelle-login` on Hermes and Antigravity) to sign in through your browser: that one sign-in
covers hook recall, checkpoints, mail and session capture on every hook host, and on Claude Code it also connects the tools.
`ESTELLE_API_KEY` is the override: set, it wins. Credential order for hooks: `ESTELLE_API_KEY`, then the plugin sign-in,
then the key the Estelle CLI stored. MCP still differs by host: Codex, Cursor, Grok and Kimi ship the key header (URL-only
OAuth is opt-in on Codex, Cursor and Grok); the others use the host's own MCP sign-in. The Gemini CLI, Antigravity, Codex,
Cursor and Grok sign-ins have not been run signed in against a live host. GUI apps on macOS and Windows
may not inherit your terminal environment, so quit and reopen them after setting a key. The plugin does
not install the host or Node, or create an account. No backend clone or Estelle CLI is needed.

Version: `0.0.30`.

[Release notes](docs/releases/v0.0.19.md)

| Host | Install instructions and copy/paste setup prompt |
|---|---|
| Claude Code | [Claude](docs/install/claude.md) |
| Codex | [Codex](docs/install/codex.md) |
| Kimi Code | [Kimi](docs/install/kimi.md) |
| Grok Build | [Grok](docs/install/grok.md) |
| DeepSeek Harness (developer preview) | [dsh](docs/install/dsh.md) |
| Cursor | [Cursor](docs/install/cursor.md) |
| OpenCode | [OpenCode](docs/install/opencode.md) · [what it supports](docs/hosts/opencode.md) · npm [`@fatelabs/opencode-estelle`](https://www.npmjs.com/package/@fatelabs/opencode-estelle) |
| Pi | [Pi](docs/install/pi.md) · [what it supports](docs/hosts/pi.md) · npm [`@fatelabs/pi-estelle`](https://www.npmjs.com/package/@fatelabs/pi-estelle) · [pi.dev packages](https://pi.dev/packages) |
| Qwen Code | [Qwen Code](docs/install/qwen.md) · [what it supports](docs/hosts/qwen.md) |
| Gemini CLI | [Gemini CLI](docs/install/gemini.md) · [what it supports](docs/hosts/gemini.md) |
| Google Antigravity (IDE and `agy` CLI) | [Antigravity](docs/install/antigravity.md) · [what it supports](docs/hosts/antigravity.md) |
| Hermes Agent | [Hermes](docs/install/hermes.md) · [what it supports](docs/hosts/hermes.md) |
| mini-swe-agent (MCP tools through bash, no capture) | [mini-swe-agent](docs/install/mini-swe-agent.md) · [what it supports](docs/hosts/mini-swe-agent.md) |
| OpenClaw (native plugin: hooks, recall, capture; or a skills bundle) | [OpenClaw native](docs/install/openclaw-native.md) · [bundle](docs/install/openclaw.md) · [what it supports](docs/hosts/openclaw.md) |
| fx (skills and MCP, no capture) | [fx](docs/install/fx.md) · [what it supports](docs/hosts/fx.md) |

OpenCode and Pi install from npm with one command each:

```sh
opencode plugin @fatelabs/opencode-estelle -g
pi install npm:@fatelabs/pi-estelle
```

Pi has no sub-agents, so the four Estelle agents are not part of the Pi package; its commands and skills cover
the same workflows. In both hosts, `ESTELLE_API_KEY` in the host's environment signs in MCP and the hooks, or `/estelle:login` signs in the hooks and the host's own
OAuth signs in MCP; neither browser path has been run live in either.

Estelle for ChatGPT is a separate package in `chatgpt/estelle/`, prepared for OpenAI review and not yet listed. See [ChatGPT](docs/install/chatgpt.md).

## Copy a setup prompt

Paste the matching prompt into your coding agent. On Codex and Claude Code, the installer agent runs
the [shipped setup command](docs/migration/from-cli.md#deterministic-setup) once after native
installation. Native plugin installation and SessionStart hooks do not invoke setup automatically.
Automated legacy cleanup supports Codex on POSIX and Claude Code; other hosts and Windows apply remain
pending. No manual configuration surgery or automatic hook trust is part of this release.

On Codex, every update needs one hook approval from you. [Here is what to do](docs/install/codex.md#approve-the-hooks-after-installing-and-after-every-update).

<details>
<summary>Claude Code</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install or update Estelle for Claude Code from https://github.com/Fate-Labs-CA/estelle-plugins using plugins/claude. Follow docs/install/claude.md. Use native approval; preserve sessions and unrelated settings. After native installation, run the installed package runtime/cli.mjs setup claude once. If it reports path fresh, there is nothing to migrate. If it reports path migrate, show me what it found and, once I agree, run setup claude --apply once. Do not manually edit configuration. Then tell me to restart Claude Code and sign in with /mcp. Never request or display credentials. Report package, MCP sign-in and observed hooks separately, and report any pending step. The setup check does not prove hook execution. No paid installation tests.
```

</details>

<details>
<summary>Codex</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install or update Estelle for Codex from https://github.com/Fate-Labs-CA/estelle-plugins using plugins/codex. Follow docs/install/codex.md and docs/migration/from-cli.md. Use native approval and a fresh session; preserve unrelated settings and active sessions. After native installation, invoke the installed package runtime/cli.mjs setup codex --apply once as documented; do not manually edit configuration. Report unsupported or unavailable migration as pending. Keep hooks and MCP on the same environment key; never request or display credentials. If setup reports hook_review as review_required, tell me its next_step word for word and do not approve hooks for me. Report package, authenticated MCP and observed hooks separately, including trust/reload and any pending step. The setup check does not prove hook execution. No paid installation tests.
```

</details>

<details>
<summary>Kimi Code</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Check that Kimi Code is installed and that its actual process can find external Node.js 22+ and ESTELLE_API_KEY from my Estelle account; report any missing prerequisite without printing the key. Install Estelle with the native interactive command /plugins install https://github.com/Fate-Labs-CA/estelle-plugins. Follow docs/install/kimi.md and docs/migration/from-cli.md. For a fresh Estelle registration, use /plugins remove estelle and /reload first; preserve chats, unrelated settings, other hosts and shared memories. Do not manually edit configuration; automated cleanup of an old install is not available for this host, so report it as pending. Use native approval and /reload after installation. Keep hooks and MCP on the same environment key; never request or display credentials. Report package, authenticated MCP and observed hooks separately, including trust/reload and any pending step. The setup check does not prove hook execution. Do not run kimi -p '/plugins …' or launch a model turn as an installation test. If you cannot operate the interactive TUI, give me the exact GitHub install command and report installation pending.
```

</details>

<details>
<summary>Grok Build</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install or update Estelle for Grok Build from https://github.com/Fate-Labs-CA/estelle-plugins using plugins/grok. Follow docs/install/grok.md and docs/migration/from-cli.md. Use native approval and a fresh session; preserve unrelated settings and active sessions. Do not manually edit configuration; automated cleanup of an old install is not available for this host, so report it as pending. Keep hooks and MCP on the same environment key; never request or display credentials. Report package, authenticated MCP and observed hooks separately, including trust/reload and any pending step. The setup check does not prove hook execution. No paid installation tests.
```

</details>

<details>
<summary>Cursor</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install or update Estelle for Cursor from https://github.com/Fate-Labs-CA/estelle-plugins using plugins/cursor. Follow docs/install/cursor.md and docs/migration/from-cli.md. Use native approval and a fresh session; preserve unrelated settings and active sessions. Do not manually edit configuration; automated cleanup of an old install is not available for this host, so report it as pending. Keep hooks and MCP on the same environment key; never request or display credentials. Report package, authenticated MCP and observed hooks separately, including trust/reload and any pending step. The setup check does not prove hook execution. No paid installation tests.
```

</details>

<details>
<summary>OpenCode</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install Estelle for OpenCode. Follow https://github.com/Fate-Labs-CA/estelle-plugins/blob/main/docs/install/opencode.md and run `opencode plugin @fatelabs/opencode-estelle -g`, which adds the package to my global OpenCode config and preserves everything else in it. Keep hooks and MCP on the same ESTELLE_API_KEY environment key; never request or display credentials. Then tell me to restart OpenCode. Report package loading, `opencode mcp list`, and observed hooks separately. No paid installation tests.
```

</details>

<details>
<summary>Pi</summary>

```text
Use the current source: read https://github.com/Fate-Labs-CA/estelle-plugins at its latest main (or install the published npm package where one exists), never a cached or older local copy of the repository. Install Estelle for Pi. Follow https://github.com/Fate-Labs-CA/estelle-plugins/blob/main/docs/install/pi.md and run `pi install npm:@fatelabs/pi-estelle`. Do not edit Pi settings by hand. Keep hooks and MCP on the same ESTELLE_API_KEY environment key; never request or display credentials. Then tell me to restart Pi or run /reload. Report package loading, /mcp status, and observed hooks separately. No paid installation tests.
```

</details>

Includes MCP connections, coding skills, recall hooks and a warning when an edit writes what looks like a real key. The warning never stops the edit.
Successful empty recall adds no context. Hook execution alone does not establish MCP authentication.
OpenCode and Pi load an npm package that runs inside the host: `@fatelabs/opencode-estelle` and
`@fatelabs/pi-estelle`, both published at 0.0.18. OpenCode's transcript is a mirror the plugin writes after each
turn from OpenCode's own session API; Pi's is Pi's own session file.

All seven hosts support bounded conversation capture. The Grok and Cursor transcript dialects are
inferred from the hook payload contract, not yet verified against a live host session, so their
captures disclose `format_verified: false` and must not be described as a complete handoff.

The hosted service determines which actions your account can use. Installing a command does not
add a missing backend action. Rooms requires server support and this session's verified identity.

[Host support](docs/SUPPORT.md) · [Migrate from CLI hooks](docs/migration/from-cli.md)

For development: `npm test`, `npm run build`, `npm run check`. Generated packages contain their
own runner and keep writable state outside installed files in `~/.estelle-plugins`.

## License

Source available for use with Fate Labs' services only (Eden and Estelle). You may install and run these plugins, unchanged, to connect your coding agent to Fate Labs. No copying, redistribution, resale or use with other services, and no right to the Fate Labs, Eden or Estelle names or logos. See [LICENSE](LICENSE).

Copyright (c) 2026 Honour Systems Inc., doing business as Fate Labs.
