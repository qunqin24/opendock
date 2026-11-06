# jEAP Agent Marketplace

A plugin marketplace maintained by the **jEAP team** that helps developers build and maintain
applications on the **jEAP platform (Java Enterprise Application Platform)** directly from their
AI coding agent.

Despite the historical repository name, this marketplace is **multi-agent**: the same plugins,
MCP server, and skills work across **GitHub Copilot CLI**, **Claude Code**, **OpenAI Codex CLI**,
and **OpenCode**. You register the marketplace once in your agent, install a plugin, and the
agent gains jEAP-aware tools and task automations.

## What you get

- **A version-aware view of the jEAP platform.** The bundled jEAP MCP server lets the agent
  search jEAP source and examples, look up symbols, and read the platform overview — so it
  answers jEAP questions from the real codebase instead of guessing.
- **A jEAP point of view.** A bundled skill makes the agent *use* that view: it requires every
  jEAP claim to be looked up and cited, and it frames your question the way the platform does —
  what jEAP already provides for it, and what it expects.
- **Task automations as skills.** Bundled skills drive concrete jobs end to end — installing the
  jEAP CLI, migrating a jEAP Spring Boot 3 project to Spring Boot 4, and moving Confluence
  architecture documentation into repository Markdown — instead of leaving you
  to orchestrate each step by hand.
- **One versioned, easy-to-update package** that behaves the same in every supported agent.

Today the marketplace contains a single plugin, [`jeap-dev-toolkit`](#the-jeap-dev-toolkit-plugin).

## Prerequisites

- **No special network access or account needed.** The marketplace is public on GitHub, and the
  bundled jEAP MCP server is publicly reachable too — no token or login required.
- **A supported agent CLI**, recent enough to support marketplaces, plugin-bundled MCP servers,
  and skills:

  | Agent | Minimum version | Notes |
  | ----- | --------------- | ----- |
  | GitHub Copilot CLI | a current GA build (GA Feb 2026, `v1.0.x`+) | run `copilot upgrade` if unsure |
  | Claude Code | `v2.1.143`+ | |
  | OpenAI Codex CLI | `v0.131.0`+ | plugin support is new (added March 2026) and still evolving |
  | OpenCode | `v2.0.27`+ | no marketplace; installed as an OpenCode plugin instead (v1 unsupported) |

- **Per-skill tooling** (Docker, JDK 25, …) is needed only when you *run* a given skill — see the
  [plugin README](plugins/jeap-dev-toolkit/README.md#requirements) for the details.

## Quick start for migrating a project to Spring Boot 4 (using GitHub Copilot CLI)

```bash
copilot plugin marketplace add jeap-admin-ch/jeap-agent-marketplace
copilot plugin install jeap-dev-toolkit@jeap
copilot plugin list       # confirm jeap-dev-toolkit is installed
```

Then start an interactive `copilot` session and run `/mcp` to confirm `jeap-mcp-service` is
connected — plugin-bundled MCP servers appear there, **not** in the `copilot mcp list` shell
command. Now just ask, e.g. *“Migrate this project to Spring Boot 4.”* Other agents are covered
below.

---

## 1. Add the marketplace

Register the marketplace once per agent. It is published on GitHub at
**`jeap-admin-ch/jeap-agent-marketplace`** and is referenced afterwards by its name, **`jeap`**.
For local development, use a filesystem path instead.

**GitHub Copilot CLI**

```bash
copilot plugin marketplace add jeap-admin-ch/jeap-agent-marketplace
# local dev: copilot plugin marketplace add /path/to/jeap-agent-marketplace
```

**Claude Code**

```text
/plugin marketplace add jeap-admin-ch/jeap-agent-marketplace
# local dev: /plugin marketplace add ./path/to/jeap-agent-marketplace
```

**OpenAI Codex CLI**

```bash
codex plugin marketplace add jeap-admin-ch/jeap-agent-marketplace
# local dev: codex plugin marketplace add /path/to/jeap-agent-marketplace
```

**OpenCode** has no marketplace — skip this step and go straight to
[step 3](#3-install-a-plugin), which installs `@jeap/jeap-opencode-plugin` directly from npm. See
[OpenCode](docs/opencode-setup.md) for details.

## 2. Available plugins

| Plugin | What it's for |
| ------ | ------------- |
| [`jeap-dev-toolkit`](#the-jeap-dev-toolkit-plugin) | Everyday jEAP development from your agent: a jEAP-aware MCP server, a jEAP specialist skill, plus skills to install the jEAP CLI and to migrate a jEAP Spring Boot 3 project to Spring Boot 4. |

Browse what a registered marketplace offers at any time:

- Copilot: `copilot plugin marketplace browse jeap`
- Claude Code: `/plugin` → **Discover** tab
- Codex: `codex plugin list` (and the `/plugins` browser in the TUI)

## 3. Install a plugin

Using `jeap-dev-toolkit` as the example (`plugin-name@marketplace-name`):

**GitHub Copilot CLI**

```bash
copilot plugin install jeap-dev-toolkit@jeap
```

**Claude Code**

```text
/plugin install jeap-dev-toolkit@jeap
```

**OpenAI Codex CLI**

```bash
codex plugin add jeap-dev-toolkit@jeap
```

**OpenCode** (no marketplace step — install straight from npm; see
[OpenCode](docs/opencode-setup.md) for details)

```bash
opencode plugin add @jeap/jeap-opencode-plugin
```

Installing the plugin auto-registers its bundled MCP server and skills — there is nothing else
to wire up.

## 4. Verify the installation

Confirm the plugin, its MCP server, and its skills are active:

**GitHub Copilot CLI**

```bash
copilot plugin list                 # jeap-dev-toolkit is listed
# inside an interactive `copilot` session (plugin MCP servers are NOT shown by `copilot mcp list`):
#   /mcp          → jeap-mcp-service is listed (select "Show")
#   /skills list  → the jeap skills are listed
```

**Claude Code**

```text
/plugin        → Installed tab shows jeap-dev-toolkit
/mcp           → jeap-mcp-service is listed and connected
/jeap-dev-toolkit:   → the bundled skills appear (skills are namespaced by plugin)
```

**OpenAI Codex CLI**

```bash
codex plugin list                   # jeap-dev-toolkit is listed
codex mcp list                      # jeap-mcp-service appears
# in the TUI: /skills lists the bundled skills; /mcp shows server status
```

**OpenCode**

```text
/mcp   → jeap-mcp-service is listed and connected
```

Ask a jEAP-specific question or check your skill list for `jeap-expert`, `install-jeap-cli`,
`migrate-spring-boot-4`, and `migrate-confluence-docs`.

> If `jeap-mcp-service` shows as not connected, see [Troubleshooting](#troubleshooting).

## 5. Update plugins

**GitHub Copilot CLI**

```bash
copilot plugin update jeap-dev-toolkit      # one plugin
copilot plugin update --all                 # all installed plugins
```

**Claude Code**

```text
/plugin marketplace update jeap     # refresh this marketplace's catalog
/plugin marketplace update          # refresh all marketplaces
# then apply available updates from the /plugin UI → Installed tab
```

**OpenAI Codex CLI**

```bash
codex plugin marketplace upgrade jeap       # refresh just this marketplace
# (or `codex plugin marketplace upgrade` to refresh all Git marketplaces)
# if an installed plugin does not pick up the new version, re-add it:
codex plugin add jeap-dev-toolkit@jeap
```

**OpenCode**

```bash
opencode plugin update @jeap/jeap-opencode-plugin
opencode plugin check @jeap/jeap-opencode-plugin
```

## 6. Remove a plugin or marketplace

| Action | Copilot CLI | Claude Code | Codex CLI | OpenCode |
| ------ | ----------- | ----------- | --------- | -------- |
| Uninstall a plugin | `copilot plugin uninstall jeap-dev-toolkit` | `/plugin uninstall jeap-dev-toolkit@jeap` | `codex plugin remove jeap-dev-toolkit@jeap` | `opencode plugin remove @jeap/jeap-opencode-plugin` |
| Remove the marketplace | `copilot plugin marketplace remove jeap` | `/plugin marketplace remove jeap` | `codex plugin marketplace remove jeap` | n/a (no marketplace) |

---

## The `jeap-dev-toolkit` plugin

The toolkit bundles everything a jEAP developer needs into one installable, versioned package.
Its benefit is concentration and currency: the agent gets an authoritative, version-aware view of
jEAP plus ready-made automations for the jobs that are otherwise slow and error-prone to do by
hand — without you assembling MCP endpoints and prompts yourself.

**What it installs:**

| Thing | Type | What it does                                                                                                                                                                                                                                   |
| ----- | ---- |------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `jeap-mcp-service` | MCP server | Gives the agent a version-aware view of jEAP: semantic search over jEAP source and examples, symbol lookup (definitions/references), and the platform overview. |
| `jeap-expert` | skill | Answers jEAP questions as a jEAP specialist: every claim looked up in the indexed jEAP documentation and source, and cited, framed by what the platform already provides. Fires on jEAP questions in your normal conversation. |
| `install-jeap-cli` | skill | Installs or updates the jEAP CLI (the `jeap` command), used for jEAP automation such as the Spring Boot migration.                                                                                                                             |
| `migrate-spring-boot-4` | skill | Upgrades a jEAP Spring Boot 3 Maven project to Spring Boot 4 via `jeap migrate spring-boot-4`, then drives the project back to a green build and passing tests.                                                                                |
| `migrate-confluence-docs` | skill | Fits selected Confluence pages into the target repository's Markdown conventions, preserving Draw.io sources/SVGs, PlantUML sources and the chapter 12 glossary. Produces one migration report with links to review; independent of jEAP tooling and usable by any team. |

**See the [plugin README](plugins/jeap-dev-toolkit/README.md)** for the full detail: when and how
to use each skill, what to expect during a (long-running) Spring Boot 4 migration, and the exact
per-skill requirements.

To use a skill, just describe the task and the agent selects it from its description — or invoke
it explicitly, e.g. *“Migrate this project to Spring Boot 4.”* (In Claude Code the explicit form
is namespaced: `/jeap-dev-toolkit:migrate-spring-boot-4`.)

## Troubleshooting

| Symptom | Likely cause & fix                                                                                                                                                                                                                                                                                                                                           |
| ------- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `jeap-mcp-service` is not connected / `jeap_*` tools unavailable | The MCP server may be temporarily unreachable. Reconnect it with the in-session `/mcp` command (Copilot, Claude Code, Codex, or OpenCode). For Copilot the plugin MCP server is shown under `/mcp` inside a session, **not** by the `copilot mcp list` shell command. The skills still work without it, minus the jEAP tools. |
| A skill never triggers | Confirm the plugin is installed (step 4). Invoke it explicitly (e.g. `/jeap-dev-toolkit:migrate-spring-boot-4` in Claude Code) or describe the task more concretely.                                                                                                                                                                                         |
| `migrate-confluence-docs` is missing | The migration skill is bundled from plugin 0.10.0. Check the installed version and source, update the plugin and start a fresh session; an existing checkout alone is not proof that the active plugin uses it. Select `migrate-confluence-docs` explicitly, or read its checked-out `SKILL.md`. |
| jEAP answers look generic, or cite no source | The agent answered from memory instead of the indexed jEAP documentation and source. Ask again naming jEAP explicitly, or invoke the `jeap-expert` skill explicitly (in Claude Code: `/jeap-dev-toolkit:jeap-expert`) — and check with `/mcp` that `jeap-mcp-service` is connected. |
| `jeap: command not found` during a migration | The jEAP CLI isn't installed — run the `install-jeap-cli` skill (or ask the agent to install it).                                                                                                                                                                                                                                                            |
| jEAP CLI / migration fails to start | The jEAP CLI runs in Docker — ensure Docker is running. The Spring Boot 4 build also needs **JDK 25**. See the [plugin requirements](plugins/jeap-dev-toolkit/README.md#requirements).                                                                                                                                                                       |
| Commands above not recognised | Update your agent CLI to a recent version (see [Prerequisites](#prerequisites)).                                                                                                                                                                                                                                                                             |

## Data & privacy

When the agent uses the jEAP MCP server, your queries are sent to the jEAP-hosted service. The
bundled skills run locally in your agent. The `migrate-spring-boot-4` skill
may additionally consult public Spring/Hibernate documentation (and an optional documentation MCP
such as Context7, only if you have configured one yourself).

## Getting help

- **Contact:** the jEAP team at `jeap-community@bit.admin.ch`.

## For maintainers

Documentation for extending and maintaining this marketplace — repository layout, how each agent
is wired up, and how to add or release a plugin — lives in
[`docs/maintaining.md`](docs/maintaining.md).

## License

Apache-2.0
