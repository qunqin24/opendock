# opencode-permission-audit

opencode shows an interactive permission prompt every time a tool call
needs your approval, and asks you to reply `once`, `always`, or `reject`.
That reply is a real signal about what your checked-in permission config
*should* say — this repo captures that signal (via a plugin) and turns it
into actionable audit output (via an Agent Skill), so static permission
config can be tuned from real usage instead of re-approving the same
pattern every session.

It contains two independent deliverables:

- **`opencode-permission-log`** — an npm plugin that logs every permission
  reply to a local JSON sidecar file.
- **`permission-audit`** — an Agent Skill that reads those sidecar files
  and reports loosening candidates, denials, and friction against your
  current permission config.

## Plugin: `opencode-permission-log`

### What it does

Hooks into opencode's generic `event` hook and listens for
`permission.updated` (a permission prompt was shown) followed by
`permission.replied` (the human responded). When a reply is `once`,
`always`, or `reject`, it appends a small JSON record to a per-day sidecar
file under your local opencode storage directory. It never blocks or
crashes the permission flow — all file IO is fail-open: any IO error is
swallowed and reported to `console.error`, never thrown back into
opencode's event loop.

### Install

Add it to opencode's plugin list, either globally (all projects) in
`~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": ["opencode-permission-log"]
}
```

or scoped to a single project in that project's `./opencode.json`. opencode
auto-installs npm plugins via Bun at startup — there's no separate
`npm install` step to run yourself.

### Sidecar files

Entries are written to:

```
~/.local/share/opencode/storage/plugin/opencode-permission-log/<YYYY-MM-DD>.json
```

one file per UTC day, capped at the 500 most recent entries per day (see
`DAY_FILE_CAP` in `src/log-store.ts`). Each file is a `DayFile`:

```ts
interface DayFile {
  version: 1;
  date: string;          // "YYYY-MM-DD" (UTC)
  entries: SidecarEntry[];
}

interface SidecarEntry {
  timestamp: string;     // ISO 8601
  sessionID: string;
  permission: string;    // e.g. "bash"
  patterns: string[];    // normalized from Permission.pattern
  response: "once" | "always" | "reject";
}
```

See `src/types.ts` for the authoritative definitions.

### Privacy

Sidecar files are written only to your own local machine, under your own
home directory. Nothing is transmitted anywhere by this plugin.

## Skill: `permission-audit`

### What it does

Reads the `opencode-permission-log` sidecar files, merges your global and
project `opencode.json` permission config, and reports:

- **Loosening candidates** — patterns you've repeatedly replied `always`
  to that the config doesn't yet `allow`.
- **Denials** — patterns you've `reject`-ed.
- **Friction** — patterns you've replied `once` to repeatedly (3+ times),
  suggesting the prompt itself is just noise.
- **Policy concerns** / **Ambiguous** — non-builtin (custom tool / MCP)
  permission keys, flagged separately and never auto-suggested for
  loosening.

It is **detection-only**: it never writes to any `opencode.json` and never
applies a diff. It only prints a report for a human to act on.

### Install

Copy (or clone) the `permission-audit/` directory into the consuming
project's skill directory. Per the
[agentskills.io](https://agentskills.io/specification) convention, the
directory name must stay `permission-audit` (it must match the `name:` in
its `SKILL.md` frontmatter).

### Usage

```
node permission-audit/scripts/audit.mjs --project "$PWD"
```

This is the exact instruction an agent following the skill will run; see
`permission-audit/SKILL.md` for the full workflow (how to parse and
present the JSON output).

The skill has **no code dependency** on the `opencode-permission-log` npm
package above — `audit.mjs` is a standalone, zero-dependency Node ESM
script that only reads the JSON sidecar files that plugin produces. They
are designed to be used together but can be copied into other repos
independently of each other.

## Credit

The Agent Skill format used by `permission-audit/SKILL.md` was originally
developed by Anthropic and released as an open standard. See the
[agentskills.io specification](https://agentskills.io/specification).

## License

MIT — see [LICENSE](./LICENSE).

## Development

```
npm install && npm test && npm run build
```
