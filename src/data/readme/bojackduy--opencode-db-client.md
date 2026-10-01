# opencode-db-client

One package (not published yet) provides an OpenCode v1/v2 plugin and a standalone `dbcanvas` terminal app. The plugin TUI registers a fullscreen page (`/db`) combining a live ER canvas (draggable tables, multi-select, FK arrows, schema sidebar) with a live schema browser: configure `connections` in the plugin options and the sidebar shows live databases → tables, with a read-only paginated browse strip. Connection profiles carry only an **env var name** — secrets resolve from `process.env` at connect time and never appear in config, logs, toasts, or snapshots. Query mode (`q`) adds a read-only SQL editor with a results grid, FK Jump into the browse strip, cancel/timeout/row caps, and narrow-terminal single-pane tabs (all values below are fake examples). Agent-side DB tools (`db_connect`, `db_list_tables`, `db_describe_table`, `db_records`, `db_query` with a server-side read-only guard) share the same `src/server/db/` core (profiles without secrets, redacted URL helpers, per-location pool registry over `bun:sqlite`/`Bun.SQL`).

## What is set up

- Separate prebuilt `./server` and `./tui` exports. Each module has one default object containing the v1 (`server` or `tui`) and v2 (`setup`) loader contracts.
- OpenCode v1 TUI route/keymap and v2 plugin-page/slot-keymap adapters; one host-neutral draggable-box canvas probe with keyboard fallback.
- A small diagnostic server tool registered via v1 `Hooks.tool` or v2 `tool.transform`.
- Bun build and tests, CI, npm packaging and tag-triggered OIDC publish workflow.

## Development

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
npm pack --dry-run
```

The bundle must be rebuilt after source changes. Restart a running OpenCode host to load the new bundle. OpenCode v1 **and** v2 were targeted using the respective public plugin types; see [the compatibility plan](docs/setup-and-compatibility.md) for the tested versions and remaining runtime verification.

For the timestamped analysis of the reference video and the proposed database-client milestones, see [DB client canvas/TUI plan](docs/db-client-plan.md).

### Test this local playground

The checked-in `opencode.jsonc` and `tui.jsonc` load this checkout as a `file:` plugin **when OpenCode is launched from this repo**. Run `bun install && bun run build`, restart OpenCode, and launch `opencode2 .` (v2) or `opencode .` (v1) here. Open `/db` from slash completion or find **DB Client: Open Canvas** in the command palette; `<leader>d` is also registered. Without any connection the page shows an empty state (`no database connected · press a to add a connection`); there is no built-in demo schema.

### Adding a connection (in the TUI, no config edit needed)

Press `a` (or click **+ add connection**) anywhere on the `/db` page. Fill name, provider (`sqlite`/`postgres`/`mysql`, cycle with ←/→ or space), and:
- **sqlite:** file path (or `:memory:`) — no secret needed.
- **postgres/mysql:** host, port, database, user, plus the **name** of an env var holding the password **or full URI**. A URI such as `postgres://app:…@db.example/app?sslmode=disable` retains its query parameters when supplied through that env var.

Alternatively, enter a name and paste a **full URI** in the last form field for a **one-time connection**. The field masks the URI, never persists it, and passes it directly to the DB client in memory; disconnecting forgets the profile. For connections you want to reuse, put the URI in an environment variable and enter only that variable's name.

`Enter` moves between fields and submits from the last one; `Esc` cancels. Saving writes only the profile (env var **names**, never values) to `$XDG_STATE_HOME/opencode-db-client/connections.json` and connects immediately. `c` toggles connect/disconnect, `✎` beside a saved connection opens its **prefilled edit form**, and `✕` deletes it. Profiles from plugin config (`connections` array) merge in automatically; edit those in config. One-time URI connections cannot be edited or reconnected after disconnect — paste again instead.

Example config entries (fake values only):

```jsonc
{ "plugin": [["file:/Users/duytrinh/Code/opencode-db-client", {
  "connections": [
    { "name": "shop", "provider": "sqlite", "database": "/tmp/shop.db" },
    { "name": "warehouse", "provider": "postgres", "host": "127.0.0.1",
      "port": 5432, "database": "app", "user": "app", "envVar": "SHOP_DB_PASSWORD" },
  ],
}]] }
```

### Query editor

Once connected, press `q` (or click the **[Query]** tab) to open the SQL editor. Type multi-line SQL (`Enter` for newline), run with `Ctrl+Enter` or the **[ run ]** button; `Esc` cancels a running query. Only single-statement read-only `SELECT`/`WITH`/`EXPLAIN` queries execute — writes and stacked statements are rejected before touching the database. `Tab` cycles sidebar → editor → results, arrows move the result cell, `Enter` on an FK cell jumps to the referenced table. Every FK relationship is always shown as a thin one-cell glyph connector (`●`, `─`, `│`, `┌┐└┘`, `<`/`>`) anchored to the actual FK/PK rows, grid-routed around table boxes and never through them. Selection only highlights table borders and drives the footer — it never hides relationships. Drag any table with the left mouse button; drag a rectangle on empty canvas for marquee multi-select, click selects, shift-click multi-selects, arrows move the selection, `enter` selects from the sidebar, `r` resets the layout, `esc` clears the selection then exits. Pan the viewport with `Ctrl+arrows` or the mouse wheel when tables overflow the visible area. The `mouse down`/`drag` counters show whether mouse events reached the page. When disconnected, the canvas shows an empty state; once connected, it shows the live schema (with a `loading tables ⠋ n/N` progress line while tables are introspected). If `/db` does not appear, inspect the resolved plugin config and host logs first.

The local config uses this machine's absolute path. If you relocate the checkout, update both files. No database credentials are needed to open the page; the canvas stays empty until you connect. The reference video is excluded from Git.

### Connect a database (env var only, values stay out of config)

Pass `connections` on the plugin entry as a tuple (all values below are fake examples). Each profile carries an env var **name**; the password or DSN is read from `process.env` at connect time. The TUI always connects read-only.

```jsonc
{
  // In tui.jsonc (and the same shape works in opencode.jsonc for agent tools):
  "plugin": [["file:/Users/duytrinh/Code/opencode-db-client", {
    "connections": [
      { "name": "local-sqlite", "provider": "sqlite", "database": ":memory:" },
      { "name": "local-pg", "provider": "postgres", "host": "localhost", "database": "FAKE_DB", "user": "FAKE_USER", "envVar": "FAKE_PG_DSN" }
    ]
  }]]
}
```

```sh
# Fake example only — point this at your real DSN or password outside the repo:
export FAKE_PG_DSN="postgres://FAKE_USER:FAKE_PASS@localhost:5432/FAKE_DB"
```

With connections configured, `/db` shows a `conn · …` bar (`c` connects/disconnects), a connections list with status dots, and — once connected — live databases → tables with `/` search, loading/error/empty/retry states, a column inspector, and a read-only paginated browse strip (`n`/`p` pages). The canvas shows **live ER nodes** derived from the real schema (tables with actual columns/PK/FK, edges from live foreign keys; capped at 30 tables with a header notice — a sidebar-driven "add table to canvas" for larger schemas is a follow-up). All drag/select/marquee/edge interactions work identically on live nodes, node positions persist per connection+database (positions only, never credentials) under `$XDG_STATE_HOME/opencode-db-client/layouts.json`, and disconnect returns the canvas to its empty state. Press `q` for Query mode: a multi-line SQL editor (`Enter` newline, `Ctrl+Enter` run, editor keystrokes never trigger canvas hotkeys) with a read-only results grid (sticky header, row numbers, `NULL`/bool/timestamp display, truncated cells with `…`, returned-vs-truncated counts, elapsed time, cancel via `Esc`, error with retry). `Tab` cycles sidebar → editor → results; `Esc` closes the `?` help overlay first, then cancels a running query, then clears selection. From a focused result cell on an FK column, `Enter` jumps to the referenced table in the browse strip filtered by that value (`x` clears the filter). Terminals narrower than 80 columns fall back to single-pane tabs. Without connections the page shows the empty state with an add-connection hint. Writes are blocked (guard rejects DML/DDL/multi-statement before any DB hit).

### Local installation elsewhere (unpublished package)

Build first, then point your config at this directory using a `file:` spec, **not a bare absolute path**. For OpenCode v1, add the server entry to `~/.config/opencode/opencode.jsonc`:

```jsonc
{ "plugin": ["file:/Users/duytrinh/Code/opencode-db-client"] }
```

Add the TUI entry to `~/.config/opencode/tui.jsonc`:

```jsonc
{ "plugin": ["file:/Users/duytrinh/Code/opencode-db-client"] }
```

Merge into existing arrays rather than replacing your other plugins. v2 can load the same `file:` package spec from its `plugins` configuration (and migrates v1-style `plugin` entries). It resolves the `./server` and `./tui` package exports. In the TUI, invoke `/db`, choose **DB Client: Open Canvas** from the palette, or press `<leader>d` (configurable through `{ "openKey": "..." }` on the plugin entry; use a lowercase key name — an uppercase one may be rejected by the host keymap parser).

After publication, substitute `@bojackduy/opencode-db-client` for the `file:` spec in the same configuration. The name is **not published yet**.

### Publishing

The single artifact (`@bojackduy/opencode-db-client@0.1.0`) is prepared for a scoped public npm release but is **not published**. The first publish must be done once by the package owner with npm authentication; the package needs to exist before npm can attach a trusted publisher:

```sh
npm login
bun install --frozen-lockfile
bun run prepack
npm pack --dry-run --ignore-scripts
npm publish --access public --provenance=false
```

Then on npmjs.com, configure the package's **Trusted Publisher → GitHub Actions** with owner `bojackduy`, repository `opencode-db-client`, workflow filename `npm-publish.yml` (no environment unless the workflow gains one). For subsequent releases, bump the version (starting with `0.1.1`), add its `## 0.1.1 (...)` CHANGELOG heading **before** tagging, then push `v0.1.1` (and repeat for later versions). `.github/workflows/npm-publish.yml` also supports manual dispatch **on a tag only**: it rejects a branch, verifies the tag matches `package.json`, the changelog heading exists and the version is absent on npm, then builds/tests, verifies all three packed entrypoints, publishes with OIDC/provenance and creates a GitHub release using that version's notes. No `NPM_TOKEN` is needed. Do **not** push the initial tag until after that one-time manual publish and trusted-publisher setup; an already-published version is deliberately rejected by CI.

The repository has no GitHub remote; workflows only run after it is pushed to the intended repository. See [setup and compatibility](docs/setup-and-compatibility.md) for the design decisions and next milestone.

## Two ways to run it — one package

`@bojackduy/opencode-db-client` ships both products from the same tarball: the OpenCode plugin (`dist/server.js` + `dist/tui.js`) and a standalone terminal app (`dist/dbcanvas.js`, exposed as the `dbcanvas` bin). Both mount the same canvas, SQL editor, and read-only DB core; the UI only talks to a small `DbHost` interface (`src/tui/host.ts`) with three adapters — OpenCode v1, OpenCode v2, and standalone.

**Inside OpenCode** — after publication, add the package to your config (v2 reads one `plugins` entry for server + TUI; v1 needs the same package in both `opencode.json` for the server and `tui.json` for the TUI):

```jsonc
// opencode.json (v1 server) and tui.json (v1 TUI)
{ "plugin": ["@bojackduy/opencode-db-client"] }
// v2 uses { "plugins": ["@bojackduy/opencode-db-client"] }
```

**As a normal app**, after publication (needs Bun; npm 7+ installs the OpenTUI/Solid peers):

```sh
npm i -g @bojackduy/opencode-db-client   # or: bun add -g @bojackduy/opencode-db-client
dbcanvas            # --help, --version
```

From a checkout: `bun run standalone` (source) or `bun run build && ./dist/dbcanvas.js`.

The app starts with the empty state; `a` adds a connection (fields + env-var secret, or a one-time pasted URI). Saved connections are the same secrets-free file the plugin uses (`$XDG_STATE_HOME/opencode-db-client/connections.json`), so they show up in both. `Esc` (nothing selected) or `Ctrl+C` quits.

Why this works as one package: OpenTUI/Solid stay **peer** dependencies and every bundle keeps them external. Inside OpenCode the host provides its runtime; for the app, the package manager installs the peers alongside the package. Peers are `*` so OpenCode plugin installs do not fail on a host-version conflict; standalone compatibility with future OpenTUI versions will need ongoing testing.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
