# omo-slim-decision-layer

An [OpenCode](https://opencode.ai) plugin that adds a **decision layer** to
AI-assisted development: a typed, git-native decision register that records the
*why* of a project — requirements, constraints, assumptions and decisions —
with the same ergonomics that [beads](https://github.com/steveyegge/beads)
gives work items.

Built as a companion plugin for
[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim).

## What it does

- **Typed decision records** — `REQ` (requirement), `CONSTRAINT`
  (non-negotiable), `ASSUMPTION` (unverified, with `needed_to_close`) and `DEC`
  (decision with rejected alternatives and consequences).
- **Single source of truth** — one YAML register at `.decisions/register.yaml`.
  All writes go through the plugin's tools; the generated markdown view is
  disposable and never authoritative.
- **Closed vocabularies** — status is `proposed | accepted | rejected |
  superseded`. Supersede instead of edit: history stays append-only.
- **Owner ratification** — agents draft records; only the owner ratifies.
  This is a convention enforced by discipline, not by a technical gate.
- **Interview integration** — when oh-my-opencode-slim's `/interview` command
  runs, the plugin injects a discipline prompt so a closed interview ends as
  records in the register instead of loose markdown.
- **Traceability** — typed links (`refines`, `depends_on`, `constrains`,
  `relates_to`) between records, with queries for orphans and reverse lookup.

## Compatibility

One package, two registration paths, sharing the same register and tool logic:

- **v1** (`@opencode-ai/plugin` 1.x): the default export provides a v1 `server`
  that registers the nine tools and the `command.execute.before` hook.
- **v2** (`@opencode/plugin` 2.x): the same default export also provides a v2
  `setup` that registers the tools via `ctx.tool.transform` and injects the
  prompt via `ctx.session.hook('prompt')`.

## Agent tools

| Tool | Purpose |
|---|---|
| `decision-init` | Create the register (idempotent, never overwrites) |
| `decision-add` | Create a record (status `proposed`) |
| `decision-ratify` | `proposed` → `accepted` — owner act, never self-invoked |
| `decision-reject` | `proposed` → `rejected` |
| `decision-supersede` | Replace a record, preserving history |
| `decision-list` | List records, filter by status/type |
| `decision-query` | Orphans, or "what links to this record" |
| `decision-validate` | Validate the register against the schema |
| `decision-view` | Regenerate the markdown view |

## Install

Add the plugin to your OpenCode config:

```jsonc
{
  "plugin": ["@digi4care/omo-slim-decision-layer@latest"]
}
```

OpenCode installs the plugin automatically from npm on the next start. To pin
a version, replace `@latest` with a specific version (e.g. `@0.2.1`).

**Local development.** For a local or private build, reference the built file
directly instead of a package name:

```jsonc
{
  "plugin": ["file:///absolute/path/to/node_modules/@digi4care/omo-slim-decision-layer/dist/index.js"]
}
```

`dist/index.js` is a single bundle; only `@opencode-ai/plugin` and `zod` are
external, so the host supplies those.

**If you use `min-release-age` in your npm config:** OpenCode's own installer
enforces it too. A freshly published version cannot be installed by OpenCode
until it is older than that many days. `min-release-age-exclude` helps for
direct `npm install` calls but **not** for OpenCode's bundled installer
(observed on OpenCode 1.18.35). Until the window passes, use the `file://`
form above, or install into the OpenCode package cache yourself
(`bun add <pkg>` in `~/.cache/opencode/packages/<pkg>@latest`).

## Development

```bash
bun install
bun test          # bun test
bun run typecheck # tsc --noEmit
bun run check     # biome
bun run release   # build + pack tgz into release/
```

## Author

**Chris Engelhard** — [chrisengelhard.nl](https://chrisengelhard.nl) —
[chris@chrisengelhard.nl](mailto:chris@chrisengelhard.nl) —
[@digi4care](https://github.com/digi4care)

## License

MIT
