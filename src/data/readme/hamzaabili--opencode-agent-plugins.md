# opencode-agent-plugins

[![CI](https://github.com/Hamza-Abili/opencode-agent-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamza-Abili/opencode-agent-plugins/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40hamzaabili/opencode-agent-plugins)](https://www.npmjs.com/package/@hamzaabili/opencode-agent-plugins)
[![npm downloads](https://img.shields.io/npm/dt/%40hamzaabili/opencode-agent-plugins)](https://www.npmjs.com/package/@hamzaabili/opencode-agent-plugins)
[![GitHub stars](https://img.shields.io/github/stars/Hamza-Abili/opencode-agent-plugins?style=social)](https://github.com/Hamza-Abili/opencode-agent-plugins/stargazers)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Hamza-Abili/opencode-agent-plugins/blob/main/LICENSE)

**The community Agent Plugins client for OpenCode — v1 and v2.**

Contract-checked against the OpenCode v2 plugin API (tested on 2.2.6;
the `./legacy` entry follows the v1 factory contract).

[Agent Plugins 1.0](https://agent-plugins.org) is the vendor-neutral packaging format for Agent Skills and MCP servers (TSC: Amazon, Cursor, Microsoft, OpenAI, Vercel, Google). Codex, VS Code, Kiro and ChatGPT load it natively; OpenCode does not. This plugin closes the gap:

- **Discover** portable packages from standard directories and npm packages — no config entry per plugin.
- **Load** skills into OpenCode's real skill registry and MCP servers into the real MCP registry.
- **Stay safe**: MCP servers are registered **disabled** until you explicitly enable them; nothing is executed at startup; no silent config edits.
- **Manage** everything in-editor on v2: `/ap status`, `enable`, `disable`, `marketplace`, `install`, `update`, `uninstall`, `packages`, `reload`.

Zero runtime dependencies. MIT. Works on OpenCode v1 (`./legacy` export) and v2.

## Install

### OpenCode v2

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@hamzaabili/opencode-agent-plugins"]
}
```

Restart OpenCode. Any Agent Plugin dropped into `~/.agents/plugins/` or `<project>/.agents/plugins/` is discovered on the next load; `/ap reload` rescans live.

### OpenCode v1

```jsonc
{
  "plugin": ["@hamzaabili/opencode-agent-plugins/legacy"]
}
```

v1 loads **skills** through OpenCode's native skill discovery via a state-tracked symlink farm (only entries this plugin created are ever touched). MCP servers can't be injected on v1 (no config hook there): the plugin logs a ready-to-paste `mcp` block with `enabled: false` for every discovered server — you opt in explicitly.

## Discovery

| Scope | Location |
| --- | --- |
| Project (walked up to the git worktree root) | `.agents/plugins/<plugin>/plugin.json` |
| Global | `~/.agents/plugins/<plugin>/plugin.json` |
| Global (XDG data) | `$XDG_DATA_HOME/agents/plugins/<plugin>/plugin.json` |
| npm packages | `packages` option → `<project>/node_modules/<pkg>/plugin.json` (then the OpenCode cache) |

Marketplace catalogs are read from `<project>/.agents/plugins/marketplace.json` (walked up) and `~/.agents/plugins/marketplace.json`.

## Commands (v2)

```
/ap status                  — plugins, skills, MCP servers (enabled/disabled), warnings
/ap list                    — compact plugin list
/ap enable <mcp-server>     — enable one MCP server (persists across sessions)
/ap disable <mcp-server>    — disable it again
/ap marketplace             — list marketplace catalogs and entries
/ap install <plugin>        — install a marketplace entry (explicit action only)
/ap update <plugin>         — re-install a managed git entry
/ap uninstall <plugin>      — remove a managed install
/ap packages                — show configured npm package sources
/ap reload                  — rescan every source
```

Enable state is keyed by a canonical `<plugin>::<server>` identity, so flipping the `prefix` option or renaming a display name never loses your choices. Ambiguous names are reported with the candidates instead of guessed, and an alias that resolves to more than one server never enables anything. `enabledMcp` is a session seed: it is applied at every startup but never persisted. `/ap enable` and `/ap disable` persist explicit decisions, and an explicit disable wins over the seed.

## Marketplace

`/ap marketplace` reads the same catalog format Codex uses (`.agents/plugins/marketplace.json`), with per-entry failure isolation: a malformed entry is skipped and reported, the rest of the catalog stays usable.

Supported sources:

| Source | Behaviour |
| --- | --- |
| `local` (`./path`) | Registered in place; must stay inside the marketplace root. |
| `url` / `git-subdir` | Cloned into the managed store, pinned to the resolved commit; provenance recorded. |
| `npm` | Resolved from the project's `node_modules` (falling back to the OpenCode cache); install stays a package-manager decision. `version`/`registry` are catalog metadata (validated for shape, not enforced) but resolution always uses the installed package — pin it in your package manager. |

Install rules: only explicit `/ap install`; only `https`/`ssh` git URLs; no credentials, queries or fragments; validated refs/SHAs (no option injection); no `..` traversal; the target must pass the full plugin loader (manifest containment included) before the install completes; the copy is staged and renamed, so a failure never leaves a half-installed directory. `/ap update` fetches and validates the replacement first, then swaps with rollback — a failed update leaves the old install working. `/ap uninstall` removes managed copies; local/npm sources are only unregistered, never deleted. Entries with `policy.installation: NOT_AVAILABLE` are listed but not installable.

## npm-shipped Agent Plugins

OpenCode installs plugins from npm but never scans them for Agent Plugins assets. Add the package name and the bundled plugin is discovered without hand-wiring `skills.paths`:

```jsonc
{
  "plugins": [
    {
      "package": "@hamzaabili/opencode-agent-plugins",
      "options": { "packages": ["@dodopayments/opencode-plugin"] }
    }
  ]
}
```

The package must be installed in the project (`bun add …`) or resolved from the OpenCode cache; the resolver only reads it.

## Options (v2)

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `directories` | `string \| string[]` | standard dirs | Extra scan roots (path-separated string or array). When non-empty, the standard dirs are **not** scanned unless listed. |
| `skills` | `boolean` | `true` | Load skills. |
| `mcp` | `boolean` | `true` | Register MCP servers (always disabled until enabled). |
| `prefix` | `boolean` | `false` | Namespace MCP servers as `<plugin-name>-<server>`. |
| `enabledMcp` | `string[]` | `[]` | Session seed: servers to enable at startup. Seeds are not persisted; `/ap enable`/`/ap disable` decisions are, and a disable wins over the seed. Removing an entry disables a seeded server on the next start. Upgrading from ≤1.1.x migrates option-derived entries once; if the option was removed before upgrading, run `/ap disable` once. |
| `packages` | `string[]` | `[]` | npm packages that bundle an Agent Plugin. |
| `marketplaces` | `boolean` | `true` | Read `.agents/plugins/marketplace.json` catalogs. |
| `installRoot` | `string` | `$XDG_DATA_HOME/opencode-agent-plugins/installed` | Managed install store. |
| `logLevel` | `"debug" \| "info" \| "warn" \| "error"` | `"info"` | Log verbosity. |

On v1 the same behaviour is configured through environment variables: `AGENT_PLUGINS_DIRS`, `AGENT_PLUGINS_PACKAGES`, `AGENT_PLUGINS_SKILLS`, `AGENT_PLUGINS_MCP`, `AGENT_PLUGINS_PREFIX`, `AGENT_PLUGINS_LOG_LEVEL`, `AGENT_PLUGINS_SKILLS_DIR`, `AGENT_PLUGINS_DISABLED`. Marketplace installation and MCP auto-enable are v2-only (v1 has no command API or config injection); `AGENT_PLUGINS_MARKETPLACES`, `AGENT_PLUGINS_INSTALL_ROOT` and `AGENT_PLUGINS_ENABLED_MCP` are accepted but have no effect on v1.

## Trust model

- **Skills are data.** Registering one never executes anything. Skill *content* still enters the agent's context — treat it as untrusted prompt material.
- **MCP servers are code.** They always start disabled (`disabled: true` in the v2 transform contract; `enabled: false` in v1 config). Enabling one is explicit, persistent, per-server, and reversible.
- **Containment** (realpath, after symlink resolution): `plugin.json`, `skills/`, every `SKILL.md` and `mcp.json` must resolve inside the plugin root; `./` MCP commands must exist as regular files inside it and are emitted as absolute paths so the spawn cwd can't redirect execution; `cwd` must exist (or is created under `PLUGIN_DATA`) and is emitted as its realpath; `../` and out-of-root absolute paths are rejected.
- **No variable smuggling.** `${PLUGIN_ROOT}`/`${PLUGIN_DATA}` expand only in args/env/cwd — never in `command` — and the client sets both variables last, so a plugin's `env` cannot override them.
- **Remote MCP URLs** must be `https` (plain `http` only on loopback), with no embedded credentials, query or fragment.
- **No silent config mutation.** v2 registers through plugin transforms only; v1 manages only symlinks it created and never edits `opencode.json`.
- **User configuration always wins.** Colliding skill ids and MCP names are skipped, never overwritten.
- **No runtime dependencies** — no transitive supply chain.

## Conformance

Validation follows the Agent Plugins 1.0.0 loading rules and failure boundaries (canonical schema semantics are implemented in code; nothing is fetched at runtime):

- fatal manifest violations reject the plugin; unknown top-level fields and a non-object `extensions` field are non-fatal warnings;
- a component with the wrong filesystem kind or an escaping location is disabled as a component;
- a malformed skill is skipped individually; a malformed MCP entry skips only that entry;
- legacy `sse` transports are valid but unsupported and are skipped with a warning;
- commands are one token, bare or `./`-relative, with no variables.

The test suite includes fixtures modelled on real-world packages, symlink-escape cases for every path boundary (`plugin.json`, `skills/`, `SKILL.md`, `mcp.json`, `./` commands, `cwd`), marketplace install/update/uninstall lifecycles, npm resolution, the v1 skill farm and both adapters. A live smoke test (`bun run smoke`) verifies skill registration and the MCP `disabled` status against a real OpenCode v2 instance in an isolated HOME.

## V1 / V2 matrix

| Feature | OpenCode v2 | OpenCode v1 |
| --- | --- | --- |
| Auto-discovery | ✅ | ✅ |
| Skills | ✅ native skill registry | ✅ symlink farm |
| MCP registration | ✅ disabled by default | ⚠ opt-in config block (logged, no auto-edit) |
| `/ap` commands | ✅ | ❌ (no command API) |
| Marketplace install | ✅ | ❌ (no command API) |
| npm package sources | ✅ | ✅ (`AGENT_PLUGINS_PACKAGES`) |
| Plugin options | ✅ object options | ✅ environment variables |

## Scope

This client implements the **portable core** of the spec. Two things stay
deliberately out of scope:

- `ai.opencode/` — the client-specific extension namespace (JS entry, agents,
  commands, modes, hooks). A package that ships only those components gets one
  warning naming them, instead of loading nothing in silence. Packages that
  also contribute skills or MCP servers stay silent about the unloaded
  components: they already work. A malformed namespace path is still reported.
- `agent-plugins/` inside OpenCode config directories and plugin-source
  registration. The client scans the shared roots (`.agents/plugins`) and
  accepts any additional root through `directories`; scanning OpenCode's own
  config directories by default is a core decision. Registering a plugin
  source is not possible from a plugin at all: the v2 API can list plugins
  (`ctx.plugin.list()`) but cannot add one.

User configuration and earlier registrations win every collision, so if core
ever provides the same skill or MCP server this client steps aside per entry
instead of double-registering it.

## Related work

- [ameshkov/opencode-agent-plugins](https://github.com/ameshkov/opencode-agent-plugins) — an alternative client with a config-based source list and a git-install CLI. This project differs in filesystem auto-discovery without config entries, in-editor `/ap` management (no external CLI), disabled-by-default MCP, marketplace catalogs, npm package sources, v1 support, and zero runtime dependencies.
- [agent-plugins.org](https://agent-plugins.org) — specification, schemas and conformance checklist.
- [anomalyco/opencode#40993](https://github.com/anomalyco/opencode/issues/40993) — the upstream feature request this plugin addresses.

## Other OpenCode plugins by the same author

Same constraints: MIT, zero runtime dependencies, OpenCode V1 + V2.

- [opencode-sandbox](https://github.com/Hamza-Abili/opencode-sandbox) — native command sandbox: bubblewrap on Linux, Seatbelt on macOS, fail-closed, network denied by default.
- [opencode-telegram-notify](https://github.com/Hamza-Abili/opencode-telegram-notify) — Telegram notifications for permission prompts, questions and idle sessions, with tap-only inline buttons.

## Development

```bash
bun install
bun run ci                    # biome lint + tsc --noEmit + bun test
bun run smoke                 # live check against `opencode` (or OPENCODE_BIN)
bun run compat                # ci + smoke; upstream-watch runs this before moving the tested-on anchor
AGENT_PLUGINS_TRACE=/tmp/ap.log  # optional JSONL diagnostics
```

Architecture and invariants: [docs/architecture.md](https://github.com/Hamza-Abili/opencode-agent-plugins/blob/main/docs/architecture.md).

MIT licensed.
