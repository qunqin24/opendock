# ahood

**The command-line client for [ahood](https://www.ahood.dev) — a registry for installing and publishing [Claude Code](https://claude.com/claude-code) Skills.**

[![npm version](https://img.shields.io/npm/v/@ahood/cli.svg?color=blue)](https://www.npmjs.com/package/@ahood/cli)
[![npm downloads](https://img.shields.io/npm/dm/@ahood/cli.svg)](https://www.npmjs.com/package/@ahood/cli)
[![CI](https://github.com/AlexKay28/ahood-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexKay28/ahood-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@ahood/cli.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/@ahood/cli.svg)](package.json)

`ahood` is `npm` for Claude Code Skills: publish a skill folder to the registry with one command, install anyone else's with another, and pin exact versions in a lockfile so a team (or a fleet of agents) all run the same thing. It's built to be driven by humans and AI agents equally — every command has a `--json` mode, exit codes are stable and documented, and the whole thing works headlessly with a single environment variable.

```
$ ahood skill search pdf
alice/pdf-tools        Merge, split, and compress PDFs from the command line
bob/pdf-form-filler     Fill PDF form fields from a JSON or CSV data source

$ ahood skill add alice/pdf-tools
Installed alice/pdf-tools@1.4.0 to .claude/skills/alice@pdf-tools
```

---

## Contents

- [Quick start](#quick-start)
- [Install](#install)
- [Use ahood in Claude Code](#use-ahood-in-claude-code)
- [Why ahood](#why-ahood)
- [Configuration](#configuration)
  - [Token](#token)
- [Usage examples](#usage-examples)
- [Kinds: skills, agents, and MCP servers](#kinds-skills-agents-and-mcp-servers)
- [Commands](#commands)
- [Exit codes](#exit-codes)
- [Compatibility](#compatibility)
- [Shell completion](#shell-completion)
- [Using ahood from an AI agent](#using-ahood-from-an-ai-agent)
- [Development](#development)
- [License](#license)

## Quick start

One command, then one slash command:

```
npx @ahood/cli@latest setup
```

then type `/ahood` in your agent. `setup` logs you in if you are not already (a device-code flow in your browser), detects Claude Code, Codex and opencode, and wires each one you pick: the plugin or MCP server, plus the `/ahood` commands. With your consent it also stores your ahood token in that harness's own config, so you need no environment variable at all (see [Token](#token)). Re-run it any time; `ahood doctor` checks the result.

The CLI is also the engine underneath, for direct use:

```
npx @ahood/cli@latest skill search <something>
npx @ahood/cli@latest skill add <owner>/<skill>
```

## Install

Run it on demand with `npx`, no install step required:

```
npx @ahood/cli@latest <command>
```

Or install it globally so the plain `ahood` command works everywhere:

```
npm i -g @ahood/cli
ahood <command>
```

**The `-g` flag matters.** `npm i @ahood/cli` (no `-g`) installs into the current directory's `node_modules/` instead, and `ahood` won't be on your `PATH` -- you'll get `ahood: command not found`. If that happens, either re-run with `-g`, or use `npx @ahood/cli@latest <command>` from that directory instead.

Requires Node.js 18 or later.

## Use ahood in Claude Code

This repo also publishes a [Claude Code plugin](https://code.claude.com/docs/en/plugins) marketplace
(`.claude-plugin/marketplace.json`, `plugins/ahood/`). Add the marketplace and install the plugin
from inside a Claude Code session (or run `ahood setup claude`, which does the same through the
`claude plugin` CLI):

```
/plugin marketplace add AlexKay28/ahood-cli#release
/plugin install ahood@ahood
```

`#release` is the stable channel: the release workflow fast-forwards the `release` branch to each
release tag after both npm packages are published, so a commit on `main` reaches no one until it is
released. `ahood setup claude` moves an install made from `main` or a tag over to it (editing the
marketplace's `ref` in `~/.claude/settings.json`, with a backup), and `ahood doctor` shows the
channel. The branch exists from the first release after it was introduced.

Claude Code updates a third-party marketplace's plugins in the background only when that is turned
on, so `ahood setup claude` asks once, "Keep ahood up to date automatically? [Y/n]" (default yes;
`--yes` means yes, `--no-auto-update` skips it), and sets `"autoUpdate": true` on
`extraKnownMarketplaces.ahood` in `~/.claude/settings.json`, after `claude plugin marketplace add`
(which rewrites that entry without it), with the file backed up first. `ahood setup --remove claude`
takes it out with the marketplace. Codex upgrades a configured git marketplace when it starts, and
opencode re-checks a plugin listed without a version, so neither needs a switch. `ahood doctor`
shows `auto-update: on|off` for each host.

The plugin brings two things:

- **ahood's hosted MCP server** (`https://www.ahood.dev/api/mcp`): `search_skills`, `get_skill`,
  `create_skill`, `create_snap` and the rest, mid-session. **A token is required** for every tool,
  including read-only ones -- there is no anonymous access. `ahood setup claude` offers to store
  it as `env.AHOOD_TOKEN` in `~/.claude/settings.json`; otherwise export `AHOOD_TOKEN` in the
  environment you start Claude Code from. **Renamed:** the plugin used to read `AHOOD_API_TOKEN`;
  from plugin 2.0.1 it reads only `AHOOD_TOKEN` (see [Token](#token)).
- **`/ahood` commands**, which call this CLI (`npm i -g @ahood/cli`; they fall back to
  `npx -y @ahood/cli`), so they also need `ahood login` (or `AHOOD_TOKEN`) once:

| Type | Does |
| --- | --- |
| `/ahood` | Hub: `ahood status --json` as a table (installed vs latest, pins, pending proposals, evolution on/off), a menu of every command below, and one suggested next action |
| `/ahood-find <need> [--kind <kind>]` | `ahood find --json`: the top 5 matches with kind, purpose, stars and downloads, and why each fits; offers try or install |
| `/ahood-trending [--kind <kind>]` | `ahood find --sort downloads`: the most installed artifacts |
| `/ahood-try <owner/slug>` | `ahood try`: reads the artifact's root document into the session for this task, installs nothing |
| `/ahood-install <owner/slug>` | Previews it (`ahood skill view`, `ahood try`: version, contents, risks, where it writes), then runs `ahood <kind> add` only after your yes |
| `/ahood-prompt <owner/slug>` | Asks for each declared input, fills the prompt with `ahood prompt get`, shows it, and uses it once |
| `/ahood-loop <owner/slug>` | Loads a loop's rules (`ahood try`) and, after your yes, follows them for this session |
| `/ahood-project` | `ahood project --json`: this repository's project guide from ahood, or an offer to write and publish one |
| `/ahood-star <owner/slug>` | Stars it with `ahood skill star` after your yes |
| `/ahood-publish` | Finds the artifact in this directory by its root file, shows the diff against the published version, and runs `ahood skill publish` only after your yes |
| `/ahood-stats` | `ahood stats --json`: your artifacts' downloads and stars, totals, recent activity and evolution counts |
| `/ahood-sync` | `ahood sync --dry-run`, a diff per update, then `ahood sync <owner>/<slug> --yes` only for the updates you approve in chat |
| `/ahood-review` | `ahood review --json`, each proposal with its unified diff and evidence, then `ahood review approve\|reject <id>` only on your decision |
| `/ahood-snap` | Drafts a structured, private snap of the session, shows it, and runs `ahood snap create ...` only if you say yes |

Every command is namespaced too (`/ahood:ahood`, `/ahood:ahood-sync`, ...) for when another plugin
takes the bare name. In Claude Code `/ahood <verb>` (e.g. `/ahood find pdf`) runs the same
steps. Each one pre-approves only its read-only calls (`ahood status --json`, `ahood find`, `ahood try`,
`ahood stats --json`, `ahood sync --dry-run --json`, `ahood skill diff`, `ahood review --json`, ...); anything that changes
state still goes through Claude Code's permission prompt after you have agreed in chat. See
[`plugins/ahood/README.md`](plugins/ahood/README.md) for the full setup. The command files are
generated from `src/setup/templates/ahood-commands.ts` (shared with the Codex and opencode setup);
regenerate them with `npm run sync-plugin`.

### Codex plugin

The same repo is a Codex plugin marketplace too: `.agents/plugins/marketplace.json` lists
`ahood@ahood` from [`plugins/codex/`](plugins/codex), which bundles the hosted MCP server (it
reads `$AHOOD_TOKEN` through `bearer_token_env_var`) and two skills, `ahood:ahood` (the `/ahood`
command set above) and `ahood:using-ahood`. `ahood setup codex` installs it: it writes
`[marketplaces.ahood]` (with `ref = "release"`, the stable channel above, so Codex gets released
plugins only, never `main`) and `[plugins."ahood@ahood"] enabled = true` in its marked block in
`$CODEX_HOME/config.toml`, then runs `codex plugin marketplace upgrade ahood` and
`codex plugin add ahood@ahood`. Codex re-checks a configured git marketplace's ref when it starts,
so each release arrives on its own. Re-running setup moves a block pinned to a tag (`v<version>`,
what setup wrote before) or unpinned over to `release`; `ahood doctor` shows the ref. It also takes out what earlier versions of setup wrote: the
`[mcp_servers.ahood]` block, `$CODEX_HOME/skills/ahood/SKILL.md` and the AGENTS.md snippet, with
the usual backups. `ahood setup --remove codex` deletes the block and runs `codex plugin remove` /
`codex plugin marketplace remove`. By hand:

```
codex plugin marketplace add AlexKay28/ahood-cli --ref release
codex plugin add ahood@ahood
```

Its files are generated too (`npm run sync-plugin` for the manifest, `.mcp.json` and the `ahood`
skill; `npm run sync-skill` for `using-ahood`), and the plugin's version is the CLI's: `npm version`
regenerates `plugin.json` on a release bump.

Releasing: first add a `## <version>` section to [`plugins/ahood/CHANGELOG.md`](plugins/ahood/CHANGELOG.md)
and commit it. `npm version`'s `preversion` hook refuses a version without one (before it changes
any file), and so does the release workflow, which also runs `claude plugin validate --strict` on the
marketplace and the plugin before publishing.

### opencode plugin

[`packages/opencode-plugin/`](packages/opencode-plugin) is `@ahood/opencode-plugin`, an opencode v2
server plugin (not yet published to npm). Listed in the `plugins` array of
`~/.config/opencode/opencode.json`, it registers the `/ahood` commands, the hosted `ahood` MCP
server (sending `$AHOOD_TOKEN` from opencode's environment; a `mcp.servers.ahood` entry already in
your config, such as the one `--store-token` writes, stays in charge) and the opt-in snap prompt
(`AHOOD_SNAP_HOOK=1`, once per top-level session, asks before saving). Its `package.json` and
`src/generated.ts` are generated by `npm run sync-plugin` from the same templates as the other
harnesses, its version is the CLI's, and `npm run build` builds it. See
[`packages/opencode-plugin/README.md`](packages/opencode-plugin/README.md).

`ahood setup opencode` lists it in `plugins` and still writes `mcp.servers.ahood` (the token policy
in [Token](#token) is unchanged; the plugin defers to that entry). It also takes out the four
`commands/ahood*.md` files earlier versions of setup wrote, backing up any you edited.
`ahood setup --remove opencode` takes both entries out again. opencode installs the package from
npm on its next start and skips it without an error when npm does not have it, so `ahood doctor`
checks `@ahood/opencode-plugin@<CLI version>` is published and warns if it is not.

## Why ahood

- **One command to publish, one to install.** `ahood skill publish owner/skill@1.0.0 --path ./my-skill` uploads a folder containing a `SKILL.md`; `ahood skill add owner/skill` installs it into `.claude/skills/`. No registry account setup beyond `ahood login`.
- **Real versioning, not just a snapshot.** Every publish is a semver version with its own changelog (`ahood skill versions`), and installs are pinned by checksum in a lockfile (`.claude/skills.lock.json`) so `ahood skill update` only ever moves forward on purpose.
- **Mistakes are recoverable.** Published the wrong version? `ahood skill unpublish owner/skill@1.2.3` yanks just that one — existing installs keep working, new ones are warned off it — without deleting the skill's whole history.
- **Public or private, your call.** `ahood skill edit owner/skill --visibility private` scopes a skill to just you; `ahood skill list` shows both.
- **Scriptable by design.** Every read command and most write commands support `--json`; `ahood skill publish --json` emits a single structured result object instead of progress text, and exit codes (below) are stable enough to branch on in a script.
- **Headless-first.** Set `AHOOD_TOKEN` and skip `login` entirely — every command checks it first, which is what CI pipelines and AI agents both actually want.

## Configuration

| Variable | Purpose |
| --- | --- |
| `AHOOD_TOKEN` | A personal API token (create one with `ahood token create <name>` after logging in once). When set, every command uses it instead of the stored browser-login credentials — the standard way to authenticate in CI or any non-interactive environment. The same name is what every harness's ahood MCP config reads. |
| `AHOOD_API_TOKEN` | **Deprecated** old name of `AHOOD_TOKEN`. The CLI still reads it, after `AHOOD_TOKEN`, for one release cycle and prints a one-line note to stderr when it is the only one set. Harness configs no longer read it. |
| `AHOOD_API_URL` | Overrides the registry endpoint (default: `https://www.ahood.dev`). Must be `https://`, except for `localhost`/`127.0.0.1` or a `.test`/`.invalid`/`.example`/`.localhost` host, which may use plain `http://` for local development. |
| `AHOOD_INSTALLED_FILE` | Overrides where the user-level install record lives (default: `~/.ahood/installed.json`). |
| `XDG_CONFIG_HOME` | If set, browser-login credentials are stored under `$XDG_CONFIG_HOME/ahood/credentials.json` instead of the default `~/.config/ahood/credentials.json`. |

### Token

The CLI looks for a token in this order: `$AHOOD_TOKEN`, then the deprecated `$AHOOD_API_TOKEN`, then the credentials `ahood login` stored (`~/.config/ahood/credentials.json`, mode 0600). `ahood doctor` says which one is in use, by name only.

The agent harnesses read it through their MCP config, and `ahood setup` asks, per harness, whether to store the token there for you:

| Harness | Where setup stores it (with your yes) | Otherwise the config reads |
| --- | --- | --- |
| Claude Code | `env.AHOOD_TOKEN` in `~/.claude/settings.json` (the plugin's `.mcp.json` can only name a variable) | `$AHOOD_TOKEN` |
| Codex | a full `[mcp_servers.ahood]` with `http_headers`, in ahood's marked block in `$CODEX_HOME/config.toml`; it takes the place of the plugin's own server | `$AHOOD_TOKEN` (the plugin's `bearer_token_env_var`) |
| opencode | the `Authorization` header of `mcp.servers.ahood` in `opencode.json` | `{env:AHOOD_TOKEN}` |

`--store-token` answers yes up front and `--no-store-token` no; `--yes` alone never stores a secret. A file setup creates for the token is mode 0600. An existing file other users can read is tightened to 0600 only on a separate yes; without it the token is not stored there. The token is never printed, backups setup makes have it redacted, and `ahood setup --remove <harness>` takes it out together with the rest of ahood's entries.

**Migrating from `AHOOD_API_TOKEN`:** rename the variable to `AHOOD_TOKEN` where you export it, or run `ahood setup` and let it store the token. The Claude Code plugin cannot fall back between the two names: Claude Code's `${VAR:-default}` does not nest, so `${AHOOD_TOKEN:-${AHOOD_API_TOKEN}}` would send a broken header.

Paths `ahood` reads and writes in your project. The lockfile is meant to be committed, same as `package-lock.json`:

| Path | What's in it |
| --- | --- |
| `.claude/skills/<owner>@<skill>/` | Installed skill files. |
| `.claude/agents/<owner>@<skill>.md` | An installed agent, as a single file (`@` owner/skill separator, since Claude Code's own subagent loader scans `.claude/agents/*.md` flat, non-recursively). |
| `.claude/skills.lock.json` | Exact installed version + checksum per skill or agent, written by `add`/`update`, read by every install to verify integrity. |
| `~/.ahood/installed.json` | Not in your project: one user-level record of every install on this machine (`{owner, slug, version, kind, installedPath, projectDir, installedAt}`, plus `pinned`), written by every `add`/`update`/`remove` and read by `ahood status`, `sync` and `pin`. The project lockfile stays the source of truth; this only indexes it. |
| `.mcp.json` | MCP server entries, for `mcp`-kind artifacts only. Merged into rather than owned — other MCP clients share this file. **May contain secrets in plaintext**, since a server manifest can declare credentials that `add` prompts for; `add` warns when it writes one. |
| `*.json.tmp-<pid>-<hrtime>` | Never, in normal operation. Writes to the two `.json` files above go through a temp file that is renamed into place, and only a hard kill (SIGKILL, OOM, power loss) mid-write can strand one. A stranded copy of `.mcp.json` carries the same plaintext secrets, so **gitignore this pattern**. The next successful write removes any left by a process that is no longer running. |

## Usage examples

<details>
<summary><strong>Search, inspect, then install</strong></summary>

```
$ ahood skill search pdf --json | jq '.[0]'
{"slug": "pdf-tools", "owner": "alice", "tagline": "Merge, split, and compress PDFs", ...}

$ ahood skill view alice/pdf-tools
alice/pdf-tools
  name:        PDF Tools
  tagline:     Merge, split, and compress PDFs from the command line
  license:     MIT
  version:     1.4.0
  ...

$ ahood skill read alice/pdf-tools
---
name: pdf-tools
description: Merge, split, and compress PDFs from the command line
---

# PDF Tools
...

$ ahood skill add alice/pdf-tools@1.4.0
Installed alice/pdf-tools@1.4.0 to .claude/skills/alice@pdf-tools
```
</details>

<details>
<summary><strong>Scaffold and publish a new skill</strong></summary>

```
$ ahood skill init my-skill
Created ./my-skill/SKILL.md

$ ahood skill publish alice/my-skill@1.0.0 --path my-skill --name "My Skill" --tagline "Does a thing"
Created alice/my-skill -- publishing its first version now.
Uploaded alice/my-skill@1.0.0 -- processing...
Published alice/my-skill@1.0.0 (published)
```
</details>

<details>
<summary><strong>Preview and apply updates safely</strong></summary>

```
$ ahood skill update --dry-run
SKILL                 CURRENT  LATEST  STATUS
alice/pdf-tools        1.4.0    1.5.0   update available
bob/pdf-form-filler     2.0.0    2.0.0   up to date

$ ahood skill update
Updated alice/pdf-tools to 1.5.0.
```
</details>

<details>
<summary><strong>Yank a bad publish without deleting everything</strong></summary>

```
$ ahood skill unpublish alice/pdf-tools@1.5.0 --yes
Yanked alice/pdf-tools@1.5.0. Existing lockfile pins still resolve; new installs will be warned off it.
```
</details>

<details>
<summary><strong>CI / non-interactive use</strong></summary>

```
export AHOOD_TOKEN=ahd_your_token_here
ahood skill publish alice/pdf-tools@1.5.1 --path ./pdf-tools --json
```
</details>

<details>
<summary><strong>Create a private group and share a skill with it</strong></summary>

```
$ ahood group create "Design Team" --description "Shared skills for the design team"
Created group Design Team (design-team).

$ ahood group invite-link design-team
https://www.ahood.dev/groups/join?token=abc123...
Expires: 2026-09-14T00:00:00.000Z
This link (and its token) is shown only this once -- save it now, it cannot be retrieved again.

$ ahood skill share alice/pdf-tools --group design-team
Shared alice/pdf-tools with design-team.
```

Sharing is additive -- it doesn't change `alice/pdf-tools`'s own public/private visibility, it just makes it visible to everyone in `design-team` too. On the other side, whoever received the link runs `ahood group join <the link>` to join.
</details>

## Kinds: skills, agents, MCP servers, docs, project guides, loops, and prompts

The registry holds seven kinds of artifact, each with its own command group. All seven take the same verbs (`search`, `list`, `view`/`show`, `read`, `versions`, `diff`, `add`, `update`, `outdated`, `remove`, `edit`, `unpublish`, `star`, `unstar`, `share`, `unshare`, `init`, `publish`), run by the same code -- except that a prompt is never installed, so `ahood prompt` has `get` in place of `add`/`update`/`outdated`/`remove`:

| Kind | Root file | `add` installs to | Group |
| --- | --- | --- | --- |
| skill | `SKILL.md` | `.claude/skills/<owner>@<skill>/` | `ahood skill <verb>` |
| agent | `AGENT.md` | `.claude/agents/<owner>@<agent>.md` | `ahood agent <verb>` |
| mcp | `server.json` | an entry merged into `.mcp.json` | `ahood mcp <verb>` |
| doc | `DOC.md` | `.claude/docs/<owner>@<doc>.md` | `ahood doc <verb>` |
| project | `PROJECT.md` | `.claude/project.md` (one per repository) | `ahood project <verb>` |
| loop | `LOOP.md` | `.claude/loops/<owner>@<loop>.md` | `ahood loop <verb>` |
| prompt | `PROMPT.md` | not installed; `ahood prompt get` | `ahood prompt <verb>` |

```
$ ahood agent search review
$ ahood agent init code-reviewer        # ./code-reviewer/AGENT.md
$ ahood agent publish alice/code-reviewer@1.0.0 --path code-reviewer --name "Code Reviewer"
$ ahood mcp init github-server          # ./github-server/server.json, a safe placeholder starter
$ ahood mcp add alice/github-server
$ ahood doc read alice/setup-guide      # print a doc without installing it
$ ahood doc add alice/setup-guide       # ./.claude/docs/alice@setup-guide.md, pinned
$ ahood project                         # project guides for this repo's git remote
$ ahood project add alice/acme-api      # ./.claude/project.md, pinned
$ ahood project init acme-api           # ./acme-api/PROJECT.md, `project:` filled from git origin
$ ahood loop read alice/code-review-pass    # print a loop without installing it
$ ahood loop add alice/code-review-pass     # ./.claude/loops/alice@code-review-pass.md, pinned
$ ahood prompt get alice/brutalist-landing-page --product "a CLI"   # fill a prompt's inputs, print it
$ ahood agent add alice/pdf-tools
alice/pdf-tools is a skill, not an agent -- refusing to install it. Use `ahood skill add alice/pdf-tools` instead.
```

- **`ahood agent`, `ahood mcp`, `ahood doc`, `ahood project`, `ahood loop` and `ahood prompt` are strict.** A target of another kind is refused -- exit code `2`, naming the kind it found -- before anything is downloaded, prompted for, written, or sent. That covers `add`, `update`, `remove`, `edit`, `unpublish`, `share`/`unshare`, `star`/`unstar`, and `publish` (an existing entry of another kind is refused before anything is packed or uploaded); the read-only verbs refuse too, rather than show the wrong kind. `search` asks the registry for that kind only, `list` keeps only that kind of your own entries, and `update`/`outdated` with no argument consider only installed pins of that kind. `agent publish`/`mcp publish`/`doc publish`/`project publish`/`loop publish`/`prompt publish` imply their kind and reject a contradictory `--kind`.
- **Missing or unexpected kind metadata is refused, never guessed.** If the registry's answer carries no kind (or one this CLI doesn't handle), a kind-scoped command stops with exit `1` and points at the legacy form. `remove` reads the kind from the project's own files (the skill directory, the agent file, the mcp fingerprint in the lockfile, or a doc, project, or loop pin's recorded `kind`) and asks the registry only when those can't tell; if neither can, nothing is removed.
- **`ahood skill` is legacy and cross-kind in this release.** `ahood skill search` and `ahood skill list` include every kind, and `ahood skill add`/`update`/`remove`/... act on whatever kind the target is, exactly as before -- including `--json` output and exit codes -- so existing scripts keep working. The exceptions are a doc, a project guide, a loop, and a prompt: `ahood skill add` refuses them and points at `ahood doc add` / `ahood project add` / `ahood loop add` / `ahood prompt get`. Add `--kind skill|agent|mcp|doc|project|loop|prompt` to any `ahood skill` verb (except `publish`, whose `--kind` keeps its original meaning) to scope it, or `--kind all` to spell out the cross-kind behavior.
- **Docs and loops install as one pinned file per owner/slug.** `ahood doc add` saves a doc's `DOC.md` to `.claude/docs/<owner>@<doc>.md` and pins it in `.claude/skills.lock.json` with `"kind": "doc"`; `ahood loop add` does the same for a loop's `LOOP.md`, to `.claude/loops/<owner>@<loop>.md` with `"kind": "loop"`. Both refuse to overwrite a file at that path that isn't pinned as that entry. `update`/`outdated`/`remove` manage those pins like any other kind. Kind dispatch is table-driven (`src/kind-info.ts`).
- **A project guide is one pinned file per repository.** `ahood project add` saves the guide's `PROJECT.md` to `.claude/project.md` and pins it with `"kind": "project"`. It never touches `CLAUDE.md` or `AGENTS.md` (point those at `.claude/project.md` yourself), refuses to overwrite an unpinned `.claude/project.md`, and refuses a second guide while another is pinned (`ahood project remove` it first). `ahood project init` fills the optional `project` frontmatter field from `git remote get-url origin`, normalized to `host/owner/repo` exactly as the registry does (credentials stripped; `--project <remote>` or `--no-project` to override). Bare `ahood project` lists the guides you can see for this repository's remote, through the hosted `get_project_guide` MCP tool.
- **A loop is a reusable procedure, not scoped to one repository.** It is pseudocode and rules for running a recurring kind of agentic session (a code review pass, a migration sweep, ...), meant to be installed the same way in many different projects -- unlike a project guide, `LOOP.md` has no `project` remote field, just `DOC.md`'s plain `name`/`description` frontmatter. `ahood loop init` has no `--project`/`--no-project` flags for that reason.
- **A prompt is filled in and pasted once, never installed.** `PROMPT.md` declares a required `name` and `intent` (its description), an optional list of `inputs` (each a `key`, an optional `label`, and an optional `default` -- an input with no `default` is required), and a body of at most 32 KB with `{{key}}` placeholders. `ahood prompt get <owner>/<prompt>[@version] --<key> <value> ...` fills it in one pass (a value containing `{{x}}` is inserted verbatim) and prints only the text, so it pipes; `--copy` puts it on the clipboard instead, `--json` prints the hosted `get_prompt` MCP tool's payload. A missing required input or an undeclared `--<key>` exits `2`, naming the key. `ahood prompt add`/`update`/`outdated`/`remove` (and `--kind prompt` on them) are refused with a pointer to `get`. Publishing checks the placeholders locally first: an undeclared `{{key}}`, or a declared input the body never uses, is refused before upload with an error naming the key.

**Migration plan for a strict `ahood skill`.** A future major version will make `ahood skill <verb>` skills-only by default, matching `agent` and `mcp`. Until then: (1) this release adds the strict groups and `--kind`, and labels `ahood skill` as legacy in `--help`; (2) a following minor release prints a stderr deprecation note when an `ahood skill` command actually touches a non-skill entry (stdout and `--json` unchanged); (3) the major release flips the default, keeping `ahood skill <verb> --kind all` as the explicit cross-kind escape hatch. Scripts that want today's behavior forever can pass `--kind all` now.

**`ahood skill update`/`ahood skill outdated` are deprecated (ahood#990)** in favor of the top-level `ahood sync`/`ahood status`, which cover every project on the machine instead of just the current one's lockfile -- both keep working exactly as before, with a one-line stderr note.

**`ahood mcp <verb>` manages MCP server manifests** (`server.json`) in the registry. The local stdio MCP server that bare `ahood mcp` / `ahood mcp serve` used to start was removed in 0.17.0: both now print one line pointing at `npx @ahood/cli setup` and exit `2`. The ahood registry's own MCP server (the hosted `https://www.ahood.dev/api/mcp`) comes with the ahood plugin.

## Keeping installs current: status, sync, pin, review

- **`ahood status`** asks the registry about everything in `~/.ahood/installed.json` (every install on this machine, in any project) and prints installed vs latest, updates available, pins, and -- on artifacts you own -- whether self-evolution is on and how many proposals wait for you. Installs recorded only in a project's `.claude/skills.lock.json` (from CLI versions before this file existed) are imported the first time `status`, `sync` or `pin` runs inside that project.
- **`ahood sync` never updates without consent.** For each install that is behind, it downloads the new version, shows a unified diff against the files on disk, and asks `y/N`. `--yes` accepts all, `--dry-run` only shows the diffs. With no terminal to ask on (piped, CI, an agent) and no `--yes`, it refuses -- exit `2` -- before downloading anything. Each accepted update is the ordinary atomic install run in that install's own project, so its project lockfile moves with it. MCP servers are listed but skipped (they can prompt for secrets); use `ahood mcp update`.
- **`ahood pin <owner>/<slug>[@version]`** holds every install of it at one version (default: the one installed now); `sync` never moves it past that. `ahood unpin` releases it.
- **`ahood review`** lists your pending self-evolution proposals with their evidence and, in a terminal, asks approve/reject/skip for each; `ahood review approve <id> [--version <v>]` and `ahood review reject <id>` decide one from a script. Listing needs the token's `read` scope and deciding its `publish` scope; a token without one gets exit `4` and a hint to `ahood login` again.
- **`ahood snap create`** takes an optional structured header -- `--failed`, `--worked`, `--fix`, `--lesson`, `--artifact <owner/slug>` -- that your artifacts' self-evolution reads. A snap is private to you until you share it.

## Commands

<!-- Generated from src/help.ts's COMMANDS_HELP by scripts/sync-readme.mjs --
     do not hand-edit the table below. Run `npm run sync-readme` after
     changing COMMANDS_HELP to regenerate it. -->

<!-- COMMANDS_TABLE_START -->
### Account and installs

| Command | What it does |
| --- | --- |
| `ahood login` | Device-code browser login, stores a token locally. |
| `ahood logout` | Removes the stored token. |
| `ahood whoami [--json]` | Reports whether your stored token still authenticates. |
| `ahood token create <name>\|list [--json]\|revoke <id> [--yes]` | Manage personal API tokens. |
| `ahood status [--json]` | Show every install on this machine against the registry: updates, pins, and evolution on your own artifacts. |
| `ahood sync [<owner>/<slug> \| <slug> ...] [--yes] [--dry-run] [--json]` | Update installs that are behind, showing each one's diff and asking y/N first. |
| `ahood pin <owner>/<slug>[@version] [--json]` | Hold an install at one version so `ahood sync` never moves it past that. |
| `ahood unpin <owner>/<slug> [--json]` | Remove a pin so `ahood sync` offers the latest version again. |
| `ahood review [show <id> \| approve <id> [--version <semver>] \| reject <id>] [--limit <n>] [--json]` | List the self-evolution proposals waiting for your review with their diffs, and approve or reject them. |
| `ahood find [<query>] [--kind <kind>] [--sort rank\|downloads\|stars\|recent\|updated] [--limit <n>] [--json]` | Find skills, agents, MCP servers, docs, project guides, loops and prompts in the registry. |
| `ahood try <owner>/<slug> [--json]` | Print an artifact's root document (SKILL.md, AGENT.md, LOOP.md, ...) without installing it. |
| `ahood stats [--json]` | Show your own artifacts with their downloads and stars, the totals, recent activity and self-evolution counts. |
| `ahood setup [claude\|codex\|opencode] [--remove <harness>] [--yes] [--dry-run] [--store-token\|--no-store-token] [--no-auto-update]` | Add ahood (MCP server and /ahood commands) to Claude Code, Codex or opencode, or remove it again. |
| `ahood doctor [--offline] [--json]` | Check each harness's ahood setup, the MCP server, your login and the CLI version. |
| `ahood completion <bash\|zsh\|fish>` | Print a shell completion script for the command names. |

### Skill (legacy, cross-kind)

| Command | What it does |
| --- | --- |
| `ahood skill search <query> [--json] [--limit <n>]` | Search published skills. |
| `ahood skill view\|show <owner>/<skill> [--json] [--web]` | Show a single skill's details -- tags, license, homepage, repository, dates, and more -- without installing it (alias: ahood skill show). |
| `ahood skill read <owner>/<skill> [--json]` | Print a skill's full SKILL.md content, without installing it. |
| `ahood skill versions <owner>/<skill> [--json]` | List a skill's published-version history -- version, changelog, size, and publish date. |
| `ahood skill diff <owner>/<skill> <versionA> <versionB> [--json]` | Show what changed between two published versions -- a SKILL.md diff plus an added/removed/changed file summary. |
| `ahood skill list [--json]` | List your own skills, public and private. |
| `ahood skill add <owner>/<skill>[@version]` | Install a skill into .claude/skills/, pinned in the lockfile. |
| `ahood skill update [<owner>/<skill> ...] [--dry-run] [--json]` | Deprecated; prefer `ahood sync`, which moves the same lockfile pin(s) forward across every project on this machine. |
| `ahood skill outdated [<owner>/<skill> ...] [--json]` | Deprecated; prefer `ahood status`, which does the same read-only staleness check across every project on this machine. |
| `ahood skill remove <owner>/<skill> [--yes]` | Uninstall and unpin a skill (local only, prompts for confirmation unless --yes is passed). |
| `ahood skill edit <owner>/<skill> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update a skill you own, changing only the flags you pass. |
| `ahood skill unpublish <owner>/<skill>[@version] [--yes]` | Delete a skill from the registry for every consumer, or yank a single version, not just your local install (prompts for confirmation unless --yes is passed). |
| `ahood skill star <owner>/<skill>` | Star a skill. |
| `ahood skill unstar <owner>/<skill>` | Remove your star from a skill. |
| `ahood skill share <owner>/<skill> --group <group>` | Share a skill you own with a group, without changing its public/private visibility. |
| `ahood skill unshare <owner>/<skill> --group <group>` | Stop sharing a skill you own with a group. |
| `ahood skill init [name]` | Scaffold a new skill folder with a minimal, valid SKILL.md. |
| `ahood skill publish <owner>/<skill>@<version> [--path <dir>] [--kind skill\|agent\|mcp\|doc\|project\|loop\|prompt] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of a skill, agent, mcp server manifest, doc, project guide, loop, or prompt from a folder containing SKILL.md, AGENT.md, server.json, DOC.md, PROJECT.md, LOOP.md, or PROMPT.md, creating the skill first if it doesn't already exist. |

### Agent

| Command | What it does |
| --- | --- |
| `ahood agent search <query> [--json] [--limit <n>]` | Search published agents. |
| `ahood agent view\|show <owner>/<agent> [--json] [--web]` | Show a single agent's details without installing it (alias: ahood agent show). |
| `ahood agent read <owner>/<agent> [--json]` | Print a published agent's AGENT.md, without installing it. |
| `ahood agent versions <owner>/<agent> [--json]` | List a agent's published-version history. |
| `ahood agent diff <owner>/<agent> <versionA> <versionB> [--json]` | Show what changed between two published versions of an agent. |
| `ahood agent list [--json]` | List your own agents, public and private. |
| `ahood agent add <owner>/<agent>[@version]` | Install an agent into .claude/agents/<owner>@<agent>.md, pinned in the lockfile. |
| `ahood agent update [<owner>/<agent> ...] [--dry-run] [--json]` | Move agent pins forward to the latest version. |
| `ahood agent outdated [<owner>/<agent> ...] [--json]` | Read-only staleness check for installed agents. |
| `ahood agent remove <owner>/<agent> [--yes]` | Uninstall and unpin an agent (local only, prompts unless --yes is passed). |
| `ahood agent edit <owner>/<agent> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update an agent you own, changing only the flags you pass. |
| `ahood agent unpublish <owner>/<agent>[@version] [--yes]` | Delete an agent from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood agent star <owner>/<agent>` | Star an agent. |
| `ahood agent unstar <owner>/<agent>` | Remove your star from an agent. |
| `ahood agent share <owner>/<agent> --group <group>` | Share an agent you own with a group, without changing its visibility. |
| `ahood agent unshare <owner>/<agent> --group <group>` | Stop sharing an agent you own with a group. |
| `ahood agent init [name]` | Scaffold a new agent folder with a minimal, valid AGENT.md. |
| `ahood agent publish <owner>/<agent>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of an agent from a folder containing AGENT.md, creating it first if it doesn't exist yet. |

### MCP (server manifests)

| Command | What it does |
| --- | --- |
| `ahood mcp search <query> [--json] [--limit <n>]` | Search published MCP server manifests. |
| `ahood mcp view\|show <owner>/<server> [--json] [--web]` | Show a single MCP server manifest's details without installing it (alias: ahood mcp show). |
| `ahood mcp read <owner>/<server> [--json]` | Print a published MCP server manifest's server.json, without installing it. |
| `ahood mcp versions <owner>/<server> [--json]` | List a MCP server manifest's published-version history. |
| `ahood mcp diff <owner>/<server> <versionA> <versionB> [--json]` | Show what changed between two published versions of an MCP server manifest. |
| `ahood mcp list [--json]` | List your own MCP server manifests, public and private. |
| `ahood mcp add <owner>/<server>[@version]` | Install an MCP server manifest into an entry in .mcp.json, pinned in the lockfile. |
| `ahood mcp update [<owner>/<server> ...] [--dry-run] [--json]` | Move MCP server manifest pins forward to the latest version. |
| `ahood mcp outdated [<owner>/<server> ...] [--json]` | Read-only staleness check for installed MCP server manifests. |
| `ahood mcp remove <owner>/<server> [--yes]` | Uninstall and unpin an MCP server manifest (local only, prompts unless --yes is passed). |
| `ahood mcp edit <owner>/<server> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update an MCP server manifest you own, changing only the flags you pass. |
| `ahood mcp unpublish <owner>/<server>[@version] [--yes]` | Delete an MCP server manifest from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood mcp star <owner>/<server>` | Star an MCP server manifest. |
| `ahood mcp unstar <owner>/<server>` | Remove your star from an MCP server manifest. |
| `ahood mcp share <owner>/<server> --group <group>` | Share an MCP server manifest you own with a group, without changing its visibility. |
| `ahood mcp unshare <owner>/<server> --group <group>` | Stop sharing an MCP server manifest you own with a group. |
| `ahood mcp init [name]` | Scaffold a new MCP server manifest folder with a minimal, valid server.json. |
| `ahood mcp publish <owner>/<server>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of an MCP server manifest from a folder containing server.json, creating it first if it doesn't exist yet. |

### Doc

| Command | What it does |
| --- | --- |
| `ahood doc search <query> [--json] [--limit <n>]` | Search published docs. |
| `ahood doc view\|show <owner>/<doc> [--json] [--web]` | Show a single doc's details without installing it (alias: ahood doc show). |
| `ahood doc read <owner>/<doc> [--json]` | Print a published doc's DOC.md, without installing it. |
| `ahood doc versions <owner>/<doc> [--json]` | List a doc's published-version history. |
| `ahood doc diff <owner>/<doc> <versionA> <versionB> [--json]` | Show what changed between two published versions of a doc. |
| `ahood doc list [--json]` | List your own docs, public and private. |
| `ahood doc add <owner>/<doc>[@version]` | Install a doc into .claude/docs/<owner>@<doc>.md, pinned in the lockfile. |
| `ahood doc update [<owner>/<doc> ...] [--dry-run] [--json]` | Move doc pins forward to the latest version. |
| `ahood doc outdated [<owner>/<doc> ...] [--json]` | Read-only staleness check for installed docs. |
| `ahood doc remove <owner>/<doc> [--yes]` | Uninstall and unpin a doc (local only, prompts unless --yes is passed). |
| `ahood doc edit <owner>/<doc> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update a doc you own, changing only the flags you pass. |
| `ahood doc unpublish <owner>/<doc>[@version] [--yes]` | Delete a doc from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood doc star <owner>/<doc>` | Star a doc. |
| `ahood doc unstar <owner>/<doc>` | Remove your star from a doc. |
| `ahood doc share <owner>/<doc> --group <group>` | Share a doc you own with a group, without changing its visibility. |
| `ahood doc unshare <owner>/<doc> --group <group>` | Stop sharing a doc you own with a group. |
| `ahood doc init [name]` | Scaffold a new doc folder with a minimal, valid DOC.md. |
| `ahood doc publish <owner>/<doc>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of a doc from a folder containing DOC.md, creating it first if it doesn't exist yet. |

### Project

| Command | What it does |
| --- | --- |
| `ahood project [--remote <git-remote>] [--json]` | List the project guides you can see for this repository's git remote. |
| `ahood project search <query> [--json] [--limit <n>]` | Search published project guides. |
| `ahood project view\|show <owner>/<slug> [--json] [--web]` | Show a single project guide's details without installing it (alias: ahood project show). |
| `ahood project read <owner>/<slug> [--json]` | Print a published project guide's PROJECT.md, without installing it. |
| `ahood project versions <owner>/<slug> [--json]` | List a project guide's published-version history. |
| `ahood project diff <owner>/<slug> <versionA> <versionB> [--json]` | Show what changed between two published versions of a project guide. |
| `ahood project list [--json]` | List your own project guides, public and private. |
| `ahood project add <owner>/<slug>[@version]` | Install a project guide into .claude/project.md, pinned in the lockfile. |
| `ahood project update [<owner>/<slug> ...] [--dry-run] [--json]` | Move project guide pins forward to the latest version. |
| `ahood project outdated [<owner>/<slug> ...] [--json]` | Read-only staleness check for installed project guides. |
| `ahood project remove <owner>/<slug> [--yes]` | Uninstall and unpin a project guide (local only, prompts unless --yes is passed). |
| `ahood project edit <owner>/<slug> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update a project guide you own, changing only the flags you pass. |
| `ahood project unpublish <owner>/<slug>[@version] [--yes]` | Delete a project guide from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood project star <owner>/<slug>` | Star a project guide. |
| `ahood project unstar <owner>/<slug>` | Remove your star from a project guide. |
| `ahood project share <owner>/<slug> --group <group>` | Share a project guide you own with a group, without changing its visibility. |
| `ahood project unshare <owner>/<slug> --group <group>` | Stop sharing a project guide you own with a group. |
| `ahood project init [name] [--project <git-remote> \| --no-project]` | Scaffold a new project guide folder with a minimal, valid PROJECT.md. |
| `ahood project publish <owner>/<slug>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of a project guide from a folder containing PROJECT.md, creating it first if it doesn't exist yet. |

### Loop

| Command | What it does |
| --- | --- |
| `ahood loop search <query> [--json] [--limit <n>]` | Search published loops. |
| `ahood loop view\|show <owner>/<loop> [--json] [--web]` | Show a single loop's details without installing it (alias: ahood loop show). |
| `ahood loop read <owner>/<loop> [--json]` | Print a published loop's LOOP.md, without installing it. |
| `ahood loop versions <owner>/<loop> [--json]` | List a loop's published-version history. |
| `ahood loop diff <owner>/<loop> <versionA> <versionB> [--json]` | Show what changed between two published versions of a loop. |
| `ahood loop list [--json]` | List your own loops, public and private. |
| `ahood loop add <owner>/<loop>[@version]` | Install a loop into .claude/loops/<owner>@<loop>.md, pinned in the lockfile. |
| `ahood loop update [<owner>/<loop> ...] [--dry-run] [--json]` | Move loop pins forward to the latest version. |
| `ahood loop outdated [<owner>/<loop> ...] [--json]` | Read-only staleness check for installed loops. |
| `ahood loop remove <owner>/<loop> [--yes]` | Uninstall and unpin a loop (local only, prompts unless --yes is passed). |
| `ahood loop edit <owner>/<loop> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update a loop you own, changing only the flags you pass. |
| `ahood loop unpublish <owner>/<loop>[@version] [--yes]` | Delete a loop from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood loop star <owner>/<loop>` | Star a loop. |
| `ahood loop unstar <owner>/<loop>` | Remove your star from a loop. |
| `ahood loop share <owner>/<loop> --group <group>` | Share a loop you own with a group, without changing its visibility. |
| `ahood loop unshare <owner>/<loop> --group <group>` | Stop sharing a loop you own with a group. |
| `ahood loop init [name]` | Scaffold a new loop folder with a minimal, valid LOOP.md. |
| `ahood loop publish <owner>/<loop>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of a loop from a folder containing LOOP.md, creating it first if it doesn't exist yet. |

### Prompt

| Command | What it does |
| --- | --- |
| `ahood prompt get <owner>/<prompt>[@version] [--<key> <value> ...] [--copy] [--json]` | Fill a prompt's inputs and print the text, ready to paste into an agent once. |
| `ahood prompt search <query> [--json] [--limit <n>]` | Search published prompts. |
| `ahood prompt view\|show <owner>/<prompt> [--json] [--web]` | Show a single prompt's details without installing it (alias: ahood prompt show). |
| `ahood prompt read <owner>/<prompt> [--json]` | Print a published prompt's PROMPT.md, without installing it. |
| `ahood prompt versions <owner>/<prompt> [--json]` | List a prompt's published-version history. |
| `ahood prompt diff <owner>/<prompt> <versionA> <versionB> [--json]` | Show what changed between two published versions of a prompt. |
| `ahood prompt list [--json]` | List your own prompts, public and private. |
| `ahood prompt edit <owner>/<prompt> [--tagline] [--tags] [--license] [--visibility] [--homepage] [--repository]` | Update a prompt you own, changing only the flags you pass. |
| `ahood prompt unpublish <owner>/<prompt>[@version] [--yes]` | Delete a prompt from the registry for every consumer, or yank one version (prompts unless --yes is passed). |
| `ahood prompt star <owner>/<prompt>` | Star a prompt. |
| `ahood prompt unstar <owner>/<prompt>` | Remove your star from a prompt. |
| `ahood prompt share <owner>/<prompt> --group <group>` | Share a prompt you own with a group, without changing its visibility. |
| `ahood prompt unshare <owner>/<prompt> --group <group>` | Stop sharing a prompt you own with a group. |
| `ahood prompt init [name]` | Scaffold a new prompt folder with a minimal, valid PROMPT.md. |
| `ahood prompt publish <owner>/<prompt>@<version> [--path <dir>] [--name <text>] [--tagline <text>] [--tags <comma,separated>] [--license <id>] [--homepage <url>] [--repository <url>] [--changelog <text>] [--json]` | Publish a new version of a prompt from a folder containing PROMPT.md, creating it first if it doesn't exist yet. |

### Group

| Command | What it does |
| --- | --- |
| `ahood group create <name> [--description <text>]` | Create a private group, becoming its owner. |
| `ahood group list [--json]` | List groups you own or belong to. |
| `ahood group members <group> [--json]` | List a group's members and their role (owner-only visible to members). |
| `ahood group invite-link <group> [--json]` | Create (or regenerate) a shareable invite link for a group you own. |
| `ahood group join <invite-url-or-token>` | Join a group using an invite link or its raw token. |
| `ahood group remove-member <group> <username> [--yes]` | Remove a member from a group you own (prompts for confirmation unless --yes is passed). |
| `ahood group leave <group> [--yes]` | Leave a group you belong to (prompts for confirmation unless --yes is passed). |
| `ahood group delete <group> [--yes]` | Permanently delete a group you own (prompts for confirmation unless --yes is passed). |

### Snap

| Command | What it does |
| --- | --- |
| `ahood snap create <content> [--tags tag1,tag2] [--failed <t>] [--worked <t>] [--fix <t>] [--lesson <t>] [--artifact <owner/slug>] [--json]` | Capture a new private snap, from an argument or piped stdin. |
| `ahood snap list [--json] [--limit <n>] [--tags tag1,tag2]` | List your own snaps, most recent first. |
| `ahood snap search <query> [--json] [--limit <n>] [--tags tag1,tag2]` | Search your own snaps by content. |
| `ahood snap show <id> [--json]` | Print a single snap's full content. |
| `ahood snap remove <id> [--yes]` | Permanently delete a snap (prompts for confirmation unless --yes is passed). |
| `ahood snap share <id> [--json]` | Mint (or return the existing) shareable link for a snap. |
| `ahood snap unshare <id> [--yes]` | Revoke a snap's share link (the snap itself is untouched; prompts for confirmation unless --yes is passed). |
| `ahood snap tags <id> [tag ...] [--clear] [--json]` | Print a snap's tags, or replace them with the tags given. |
<!-- COMMANDS_TABLE_END -->

Run `ahood --help`, `ahood skill --help`, `ahood agent --help`, `ahood mcp --help`, `ahood group --help`, `ahood snap --help`, or `ahood <command> --help` (also `ahood help <command>` / `ahood help <skill|agent|mcp|group|snap> <verb>`) for the same reference — including per-command flags and examples — directly in your terminal. `ahood --version` prints the installed CLI version.

## Exit codes

Stable across releases, safe to branch on in a script:

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | General error |
| `2` | Usage or validation error (bad arguments, or the server rejected the request as invalid) |
| `4` | Authentication required or rejected (not logged in, or the token was refused) |
| `5` | Not found |
| `6` | Network/transport error, or an upstream server (5xx) error |

## Compatibility

Surfaces that are stable across releases on purpose, because something outside this codebase depends on their exact shape:

- **`User-Agent` header.** Every request sends `User-Agent: @ahood/cli/<version>` (e.g. `@ahood/cli/0.9.0`), built in `src/http.ts` from this package's own `name` and `version` in `package.json`. This is deliberately a plain, stable, parseable string rather than an opaque one, because it is exactly what a WAF/firewall allowlist rule needs to scope a rate limit or block rule to browser page traffic without also catching the CLI. **Changing this header's shape (its format, delimiter, or what it's derived from) is a breaking change** for anyone who has written a rule against it, even though nothing in this CLI's own test suite would fail — treat it with the same care as the [exit codes](#exit-codes) below. If it ever needs to carry more than name/version (for example OS or Node version, to make a spoofed string easier to tell apart from a real one), that's a deliberate compatibility change too and belongs in this same section, documented to match exactly what the code sends.

## Shell completion

```
# bash
ahood completion bash >> ~/.bashrc

# zsh
ahood completion zsh >> ~/.zshrc

# fish
ahood completion fish > ~/.config/fish/completions/ahood.fish
```

## Using ahood from an AI agent

`ahood` is built to be driven by an AI agent (Claude Code or otherwise) as comfortably as by a human at a terminal:

- **No interactive login required.** Set `AHOOD_TOKEN` once (a personal API token from `ahood token create <name>`) and every command works non-interactively.
- **Structured output everywhere.** `--json` is available on every read command and on `publish`/`update`, so an agent never has to scrape human-formatted text.
- **Predictable failure.** A stable, documented [exit code](#exit-codes) per failure class, and error messages that never leak raw upstream infrastructure details — safe to surface directly to an agent's reasoning loop.
- **A plugin for the agent itself.** `npx @ahood/cli setup` installs the ahood plugin for Claude Code, Codex or opencode: the hosted ahood MCP server, the `using-ahood` skill that teaches an agent when and how to use ahood, and the `/ahood` commands. (`ahood help useme` and the local `ahood mcp serve` server were removed in 0.17.0.)
- **A real "start here."** `ahood skill init <name>`, `ahood agent init <name>`, and `ahood mcp init <name>` scaffold a `SKILL.md`, `AGENT.md`, or `server.json` that passes the registry's publish validation, rather than requiring an agent to know each format up front.

## Development

```
git clone https://github.com/AlexKay28/ahood-cli.git
cd ahood-cli
npm install
npm run build   # compile TypeScript -> dist/
npm test        # run the vitest suite
```

If you add or change a command, update `src/help.ts`'s `COMMANDS_HELP` and then run `npm run sync-readme` to regenerate the table above — CI fails (`node scripts/sync-readme.mjs --check`) if it's out of sync.

Full reference, including personal API tokens, the public REST API, and the MCP server: **https://www.ahood.dev/docs**

## License

[MIT](LICENSE)
