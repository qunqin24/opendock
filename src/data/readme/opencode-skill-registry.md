# OpenCode Skill Registry

[![npm version](https://img.shields.io/npm/v/opencode-skill-registry?logo=npm&label=npm)](https://www.npmjs.com/package/opencode-skill-registry)

Generate a lightweight index of skills and convention files available to an OpenCode project. The plugin refreshes the index in the background and writes only when content changes.

## Install

Requires OpenCode `>=1.17.15 <2`.

```bash
opencode plugin opencode-skill-registry --global
```

Restart OpenCode and open a project. The plugin creates:

```text
<project>/.ai/atl/skill-registry.md
<project>/.ai/atl/skill-registry.hash
```

## Use

Consumers match a trigger in `skill-registry.md`, then read the linked `SKILL.md` for the complete instructions. The registry is an index, not a copy of skill bodies.

## Discovery

| Scope | Locations |
| --- | --- |
| Project | `.opencode/skills`, `.agents/skills`, `skills` |
| User | `~/.config/opencode/skills` |
| Conventions | `AGENTS.md`, `agents.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `copilot-instructions.md` |

Each skill entry includes name, trigger text, and full `SKILL.md` path. Project skills override user skills with the same name. Symlinked trees are cycle-safe and deduplicated by real path.

## Behavior

- Store generated state under project-local `.ai/atl/`.
- Migrate legacy `.atl/` only when the new destination is absent.
- Hash skill metadata and convention content to avoid unchanged writes.
- Add `.ai/` to Git's local info exclude without editing tracked `.gitignore`.
- Retry failed startup generation at most three times per session.
- Read local skill metadata only; send no project data over the network.

The package has no runtime npm dependencies. Its root and `./server` entrypoints load the same server plugin.

## Update or remove

A bare `opencode-skill-registry` entry follows npm `latest`. To pin a release:

```bash
opencode plugin opencode-skill-registry@<version> --global --force
```

To remove the plugin, delete only its matching string or tuple from the global `opencode.jsonc` or `opencode.json`, preserve every other entry, and restart OpenCode. There is no global npm installation to uninstall. Generated `.ai/atl/` files remain until removed separately.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run security:check
```

See [Contributing](CONTRIBUTING.md) for local loading and review rules.

## Help

- [Report a problem](https://github.com/andresnator/opencode-skill-registry/issues)
- [Changelog](CHANGELOG.md)
- [MIT License](LICENSE)
