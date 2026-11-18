# opencode-bifrost-skills

[![Build Status](https://github.com/bitExpert/opencode-bifrost-skills/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/bitExpert/opencode-bifrost-skills/actions)
[![Mastodon Follow](https://img.shields.io/mastodon/follow/109408681246972700?domain=https://rheinneckar.social)](https://rheinneckar.social/@bitexpert)

Discover and install [Agent Skills](https://opencode.ai/docs/skills/) from a
[Bifrost](https://docs.getbifrost.ai/features/skills-repository) gateway's Skills
Repository into OpenCode 2 — globally or per project.

The plugin adds a `/bifrost-*` command family and an interactive skills
browser. It writes skills into the directories OpenCode already scans, so an
installed skill is immediately available through the `skill` tool and
`@skill-id` mentions. The commands themselves do not ask the model to do
anything; they perform the install and post the result into the session.

## Features

- Interactive catalog browser (`/bifrost-skills`) with search and
  global/project scope picker.
- Non-interactive install, install-all, list, update, remove and config
  commands.
- Global scope (`<config dir>/skills`) and project scope
  (`<project>/.opencode/skills`).
- Catalog fallbacks that keep working when the gateway's marketplace manifest
  is unavailable.
- Refuses to overwrite by default; updates compare versions and content hashes.
- Validates every archive (path traversal, entry count, per-file and total
  size) and installs through an atomic staging directory.
- No build step: the package exports TypeScript sources that OpenCode's Bun
  runtime loads directly.

## Requirements

- OpenCode 2.x (verified against 2.2.5).
- A Bifrost gateway that serves the public skill download routes under
  `/api/skills/serve/…`.
- Bun for development and tests (OpenCode already bundles its own runtime).

## Install the plugin

Add the package to the `plugins` array in your OpenCode config
(`~/.config/opencode/opencode.json` by default, or the project's
`opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@bitexpert/opencode-bifrost-skills"]
}
```

A single entry loads all parts of the package: the server plugin, the TUI
plugin (`/bifrost-skills`) and the typed RPC contract. A published package
name works the same way.

To pass options, use the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@bitexpert/opencode-bifrost-skills",
      "options": {
        "baseUrl": "https://bifrost.example.com",
        "timeoutMs": 20000
      }
    }
  ]
}
```

Supported options: `baseUrl`, `timeoutMs`.

Restart OpenCode (or reload plugins) after changing the config. The commands
then appear in slash completion under `/bifrost-…`.

## Quick start

```text
/bifrost-config baseUrl=https://bifrost.example.com
/bifrost-skills
```

Install a single skill:

```text
/bifrost-install git-release --project
```

Or install all skills:

```text
/bifrost-install
# or explicitly:
/bifrost-install all
/bifrost-install *
```

After an install, use the skill with `@git-release` or let the `skill` tool load
it when the task matches its description.

## Commands

| Command                           | Arguments and flags                   | Description                                                                                                       |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/bifrost-skills`                 | —                                     | Browse the catalog, pick a scope, install. Asks before replacing an existing skill and offers to install another. |
| `/bifrost-install [<skill>\|all]` | `--global` \| `--project`, `--force`  | Install one skill (by name) or all skills from the all-skills bundle. Defaults to `all` if no selector given.     |
| `/bifrost-list`                   | —                                     | List installed Bifrost skills in both global and project scope.                                                   |
| `/bifrost-update [<skill>\|all]`  | `--global` \| `--project`             | Update installed skills. Defaults to `all` and checks the global and session project scopes.                      |
| `/bifrost-remove <skill>`         | `--global` \| `--project`             | Remove an installed skill. Scope is required when the skill exists in both.                                       |
| `/bifrost-config`                 | `baseUrl=…`, `timeoutMs=…`, `--reset` | Show or change gateway settings.                                                                                  |

### Flag notes

- `--project` writes into the session's project; `--global` writes into the
  OpenCode config directory. Install commands default to `--global`.
- `--force` replaces an existing skill without refusing. Without it, install
  reports that the skill is already installed.
- `/bifrost-list` and `/bifrost-update` inspect the global scope and the
  session's project scope. Scope flags narrow update and remove, not list.
- Skill names may be given as the raw Bifrost name (`git-release`), the
  marketplace plugin name (`bifrost-git-release`) or the installed skill id.
- For batch installs, use no argument, `all`, or `*` as the selector.
- Option spellings are flexible: `baseUrl=…` / `--base-url …` /
  `--url …`, `timeoutMs=…` / `--timeout-ms …`.

## Where skills are installed

| Scope   | Directory                                                                           |
| ------- | ----------------------------------------------------------------------------------- |
| Global  | `$OPENCODE_CONFIG_DIR/skills`, else `${XDG_CONFIG_HOME:-~/.config}/opencode/skills` |
| Project | `<session directory>/.opencode/skills`                                              |

The project directory is resolved on the server from the session that ran the
command (`session.location.directory`), not from the TUI process's working
directory. A project install therefore follows the session even when the
OpenCode UI was started elsewhere.

Each skill directory contains the downloaded files plus a
`.bifrost-skill.json` marker with its id, source, scope, version, content hash
and timestamps. The marker is how the plugin recognises its own installations.
The commands only populate these directories — loading is OpenCode's job.

## How the catalog is discovered

The client tries two sources in order and uses the first non-empty result:

1. **Marketplace manifest** —
   `GET /api/skills/serve/claude-code/.claude-plugin/marketplace.json`.
   Provides names, descriptions and versions. The gateway only serves it when
   `client.skills_external_client_url` is configured and `git` is available.
2. **All-skills bundle** — `GET /api/skills/serve/all/download.zip`, public.
   Names, descriptions and versions are read from each `SKILL.md` frontmatter.

Installs do not depend on the catalog: they always use
`GET /api/skills/serve/{skill}/download.zip`, with the all-skills bundle for
batch installs (no selector, `all`, or `*`). Installing by name keeps working when every catalog
source is unavailable.

If the catalog cannot be read at all, the command still supports
`/bifrost-install <name>`; the download route decides whether the name exists.

## Install and update behaviour

**Install** downloads the archive, validates it, writes every file into a
hidden staging directory next to the target, writes the marker, then renames
the staging directory into place. Replacing an existing skill keeps a backup
until the new directory is in place, so a failed install does not leave a
half-written skill behind.

- An existing directory is only replaced with `--force` (or after confirming
  in the marketplace dialog).
- A directory without a Bifrost marker is treated as foreign and is refused
  without `--force`.
- After a successful install the plugin asks OpenCode to reload its skill
  registry.

**Update** (`/bifrost-update`, default `all`):

- Reads the installed markers from both scopes.
- Compares the gateway version with the installed version. If the installed
  copy is newer, it is left alone.
- Downloads the current archive and compares a SHA-256 content hash over file
  names and contents. Identical content is reported as unchanged even when
  versions differ.
- Newer or different content is installed through the same staging path and
  the marker keeps its original `installedAt` while gaining `updatedAt`.

Updates replace the whole skill directory. Local edits inside an installed
skill are not merged and are lost when that skill is updated or replaced.

**Remove** deletes only directories that contain a valid Bifrost marker and
live directly inside a known skills root. If the same skill exists globally
and in the project, `--global` or `--project` is required.

## Configuration

Settings are resolved with this precedence (highest first):

1. **Command override** — passed by the TUI/RPC for a single call.
2. **Plugin storage** — written by `/bifrost-config`.
3. **Plugin options** — the `options` object in the OpenCode config.
4. **Environment** — `BIFROST_URL`, `BIFROST_TIMEOUT_MS`.
5. **Default** — `http://localhost:8080`, 20 000 ms.

`/bifrost-config` shows the effective values and where each one came from.

```text
/bifrost-config
/bifrost-config baseUrl=https://bifrost.example.com timeoutMs=15000
/bifrost-config --reset
```

The gateway URL is normalized: a missing scheme becomes `http://`, trailing
slashes are removed, a trailing `/api` is stripped, and URLs containing
credentials are rejected (use `baseUrl` instead).

## Security

- Archive entries with absolute paths, `..` segments, backslashes or paths that
  resolve outside the skill directory are rejected.
- Limits: 64 MiB archive, 2 000 entries, 8 MiB per file, 64 MiB uncompressed
  total. Empty or corrupt archives fail with a clear message. The response body
  is streamed under the request timeout with a running byte cap, so a stalled
  or oversized download can neither hang the command nor exhaust memory.
- Files are written inside a staging directory under the skills root; nothing
  is written outside it. Files starting with a shebang keep the executable bit
  (`0755`); everything else is written `0644`.
- Remove refuses unmarked directories and paths that are not direct children of
  a skills root.
- Installed skills are data, not trusted code: they can contain instructions
  and helper scripts. Review a skill before installing it from an untrusted
  gateway, and remember that the agent may follow its instructions.

## Development

```bash
bun install
bun test            # 82 tests, Bun's built-in runner
npm run typecheck   # tsc --noEmit
npm run check       # both
```

### Package layout

| Path                | Purpose                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `src/index.ts`      | Server plugin: RPC handlers, `/bifrost-*` command registration, notices.                      |
| `src/tui.tsx`       | TUI plugin: interactive `/bifrost-skills` dialog and toasts.                                  |
| `src/rpc.ts`        | Typed RPC contract and JSON schemas shared by both parts.                                     |
| `src/bifrost.ts`    | HTTP client, catalog fallbacks, error types, URL normalisation.                               |
| `src/operations.ts` | Install/install-all/update/remove/list, staging, markers, hashing.                            |
| `src/settings.ts`   | Settings precedence, skills directories, config summary.                                      |
| `src/zip.ts`        | Zip decoding, path/size validation, package grouping, hashing.                                |
| `src/args.ts`       | Parser for slash-command arguments and option aliases.                                        |
| `src/format.ts`     | Markdown rendering of command results.                                                        |
| `src/types.ts`      | Shared record and result types.                                                               |
| `test/`             | Bun tests with in-memory storage and a mock gateway (one test uses a real local HTTP server). |

### Package exports

```jsonc
{
  "exports": {
    ".": "./src/index.ts", // server plugin
    "./tui": "./src/tui.tsx", // TUI plugin
    "./rpc": "./src/rpc.ts" // typed RPC contract
  }
}
```

## Troubleshooting

| Symptom                                    | What to check                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser shows “Could not reach …”          | Run `/bifrost-config`, confirm the gateway URL and that it is reachable from the OpenCode host.                                                                   |
| Catalog is empty but install by name works | The gateway may not serve a marketplace manifest; `/bifrost-install <name>` still uses the public download route.                                                 |
| “already installed … use --force”          | Use `--force`, `/bifrost-update <skill>`, or remove it first.                                                                                                     |
| `/bifrost-list` is empty                   | Confirm the skill directory contains `.bifrost-skill.json` and that you are in the project that owns a project-scope install.                                     |
| A skill does not appear in `@` completion  | Wait for the reload after install, then check the directory name equals the skill id. Global and project directories are scanned by OpenCode, not by this plugin. |
| Commands are missing from slash completion | The plugin entry/path is wrong, or OpenCode was not restarted after the config change.                                                                            |

## License

MIT. See [LICENSE](LICENSE).
