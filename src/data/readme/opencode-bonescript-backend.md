# opencode-bonescript-backend

[![npm version](https://img.shields.io/npm/v/opencode-bonescript-backend)](https://www.npmjs.com/package/opencode-bonescript-backend)
[![bonescript-compiler](https://img.shields.io/npm/v/bonescript-compiler?label=bonescript-compiler)](https://www.npmjs.com/package/bonescript-compiler)
[![license](https://img.shields.io/github/license/Doorman11991/opencode-bonescript-backend)](LICENSE)

An [OpenCode](https://opencode.ai) plugin that makes [BoneScript](https://github.com/Doorman11991/BoneScript) the default way to build backends. When you ask the agent to create models, APIs, state machines, workflows, or realtime channels, it uses BoneScript instead of writing raw code by hand.

> **Requires BoneScript** — the declarative DSL that compiles `.bone` system descriptions into complete, runnable Node.js backends.
>
> | Package | Purpose |
> |---------|---------|
> | [`bonescript-compiler`](https://www.npmjs.com/package/bonescript-compiler) | The `bonec` CLI — compiles `.bone` files into a Node.js backend |
> | [`opencode-bonescript-backend`](https://www.npmjs.com/package/opencode-bonescript-backend) | This plugin — wires BoneScript into OpenCode |

---

## What it does

- **Intercepts** `write` and `bash` tool calls that look like backend work (writing to `models/`, `routes/`, running `prisma migrate`, etc.) and redirects the agent to the BoneScript workflow
- **Injects** workflow guidance into `AGENTS.md` so every session knows the spec-first approach
- **Auto-validates** `.bone` files with `bonec check` whenever one is saved
- **Registers 8 custom tools** the agent can call to work with BoneScript specs

---

## Prerequisites

**1. Install the BoneScript compiler**

```bash
npm install -g bonescript-compiler
# or
bun add -g bonescript-compiler
```

This installs the `bonec` CLI. Verify:

```bash
bonec --version
```

→ [npmjs.com/package/bonescript-compiler](https://www.npmjs.com/package/bonescript-compiler)

**2. OpenCode 1.x** — the plugin uses the `@opencode-ai/plugin` SDK and requires OpenCode's Bun-based plugin loader.

---

## Installation

### Option A — npm (recommended)

Add to your project's `opencode.json`:

```json
{
  "plugin": ["opencode-bonescript-backend"]
}
```

OpenCode installs it automatically via Bun at startup. No separate install step needed.

→ [npmjs.com/package/opencode-bonescript-backend](https://www.npmjs.com/package/opencode-bonescript-backend)

### Option B — Project-level source copy

Copy the plugin source into your project's plugin directory. OpenCode loads all `.ts` files from `.opencode/plugins/` automatically — Bun handles transpilation, no build step needed.

```bash
# clone this repo then copy src/ into your project
cp -r src/* your-project/.opencode/plugins/
```

Directory layout:

```
your-project/
└── .opencode/
    └── plugins/
        ├── index.ts
        ├── detect.ts
        └── tools/
            ├── bonescript_init.ts
            ├── bonescript_compile.ts
            ├── bonescript_watch.ts
            ├── bonescript_check.ts
            ├── bonescript_diff.ts
            ├── bonescript_edit.ts
            ├── bonescript_implement_extension.ts
            └── bonescript_analyze.ts
```

### Option C — Global

Applies to all projects on your machine:

```bash
cp -r src/* ~/.config/opencode/plugins/
```

---

## Verifying it loaded

Start OpenCode with log output:

```bash
opencode run "hello" --print-logs --log-level DEBUG 2>&1 | grep -i bonescript
```

You should see:

```
INFO  service=bonescript-backend-plugin  BoneScript plugin loaded — interceptor active
INFO  service=tool.registry  status=completed  bonescript_init
INFO  service=tool.registry  status=completed  bonescript_compile
... (all 8 tools)
```

You'll also see a `BoneScript Backend Workflow` section appear in your `AGENTS.md` — the plugin writes its guidance into the workspace rules so every session picks it up automatically.

---

## The workflow

The plugin enforces a single pattern for all backend work:

```
1. DEFINE   → describe the feature in a .bone spec file
2. COMPILE  → bonec compile  (generates the full backend skeleton)
3. EXTEND   → add custom logic in extensions/ only
4. CHECK    → bonec check    (validate at any time)
```

> **Never edit files inside `generated/`.** They are overwritten on every compile.
> **All custom logic lives in `extensions/`.** Those files are never touched by the compiler.

---

## Tools

The plugin adds 8 tools the agent can call:

### `bonescript_init`

Scaffold a new BoneScript project. Supports domain templates so you get a pre-populated spec instead of starting blank.

```
Templates:
  saas_platform          multi-tenant SaaS with subscriptions, orgs, users
  marketplace            buyers, sellers, listings, orders, payments
  realtime_collaboration documents, presence, cursors, channels
  api_gateway            rate-limiting, auth, routing, upstream proxies
  event_driven           event bus, consumers, producers, dead-letter queues
  ecommerce              products, cart, checkout, inventory, fulfillment
  social_network         profiles, posts, follows, feeds, notifications
  blank                  empty scaffold
```

**Example prompt:** `"Set up a new marketplace backend"`

The agent calls `bonescript_init` with `template: "marketplace"`, which runs `bonec init --template marketplace` and gives you a fully populated `.bone` spec to start from.

---

### `bonescript_edit`

Smart-edit a `.bone` file using structured operations. No need to know the exact BoneScript syntax — just describe what you want.

| Operation | What it does |
|-----------|-------------|
| `add_entity` | Add a new data model |
| `add_field` | Add a field to an existing entity |
| `add_api` | Add REST/GraphQL endpoint definitions |
| `add_state_machine` | Add lifecycle states and transitions to an entity |
| `add_channel` | Add a realtime pub/sub channel |
| `add_workflow` | Add a multi-step async workflow |
| `add_relation` | Add a relation between entities |
| `remove_block` | Remove a named block |
| `replace_block` | Replace a named block with new content |
| `append_raw` | Append raw BoneScript syntax |

**Example prompt:** `"Add a Product entity with name, price, and stock fields"`

---

### `bonescript_compile`

Compile all `.bone` files into a runnable Node.js backend. Runs `bonec compile`.

Generates entity models, database migrations, API route handlers, state machine logic, realtime channel handlers, and workflow orchestration.

**Example prompt:** `"Compile the spec"`

---

### `bonescript_watch`

Start the compiler in watch mode. Recompiles automatically whenever a `.bone` file is saved. Runs as a background process and returns the PID.

**Example prompt:** `"Start watching for changes"`

---

### `bonescript_check`

Validate `.bone` files without generating any output. Catches syntax errors, invalid relations, incomplete state machines, etc. Runs `bonec check`.

The plugin also runs this automatically whenever you save a `.bone` file.

**Example prompt:** `"Check my spec for errors"`

---

### `bonescript_diff`

Preview what the next compile would change — new files, updated files, removed files — without writing anything. Runs `bonec diff`.

**Example prompt:** `"Show me what would change if I compile now"`

---

### `bonescript_implement_extension`

Create or edit a file in the `extensions/` folder. These files are the only place for custom business logic and are **never overwritten** by the compiler.

Generates typed templates with the correct hook signatures:

| Extension type | When it runs |
|---------------|-------------|
| `beforeCreate` / `afterCreate` | Around record creation |
| `beforeUpdate` / `afterUpdate` | Around record updates |
| `beforeDelete` | Before record deletion |
| `customRoute` | Custom API endpoints |
| `stateTransitionGuard` | Control state machine transitions |
| `channelAuth` | Authorize realtime subscriptions |
| `workflowStep` | Implement workflow step logic |

**Example prompt:** `"Add a beforeCreate hook for User that hashes the password"`

---

### `bonescript_analyze`

Read all `.bone` files and produce a structured summary of the system — entities, APIs, state machines, channels, workflows, and relations.

**Example prompts:** `"Explain what's in this BoneScript project"` · `"What entities do we have?"` · `"Show me all the state machines"`

---

## The interceptor

The plugin watches every `write` and `bash` tool call the agent makes. If it looks like backend work, the call is cancelled and the agent is redirected to BoneScript.

**Triggers a redirect:**

| Signal | Examples |
|--------|---------|
| Writing to backend paths | `models/User.ts`, `routes/users.ts`, `controllers/`, `migrations/`, `schemas/` |
| Backend file extensions | `*.model.ts`, `*.entity.ts`, `*.controller.ts`, `*.service.ts` |
| ORM content in files | `@Entity`, `@Column`, `model User {` (Prisma), `mongoose.Schema(` |
| ORM commands | `prisma migrate`, `drizzle-kit push`, `typeorm migration`, `knex migrate` |
| Scaffolding commands | `nest g resource`, `rails generate model` |

**Never intercepted:**

- `.bone` files and `extensions/` — always allowed
- `generated/` — compiler output, let through
- Test files (`*.test.ts`, `*.spec.ts`)
- Frontend code, config files, documentation

---

## Example session

```
User: "Add a User entity with email and password, and a REST API for it"

Agent:
  1. bonescript_edit (add_entity)  → adds User entity to domain.bone
  2. bonescript_edit (add_api)     → adds UserAPI to domain.bone
  3. bonescript_compile            → generates the full backend
  4. bonescript_implement_extension (beforeCreate, User)
     → creates extensions/User.beforeCreate.ts for password hashing

User: "Add order status tracking with pending → confirmed → shipped → delivered"

Agent:
  1. bonescript_edit (add_state_machine) → adds OrderStatus state machine
  2. bonescript_compile                  → regenerates backend
  3. bonescript_implement_extension (stateTransitionGuard, Order)
     → creates extensions/Order.stateTransitionGuard.ts

User: "Show me what's in the spec"

Agent:
  1. bonescript_analyze → full breakdown of entities, APIs, state machines
```

---

## Project structure after setup

```
your-project/
├── domain.bone              ← Your spec (edit this)
├── extensions/              ← Your custom logic (edit this)
│   ├── User.beforeCreate.ts
│   └── Order.stateTransitionGuard.ts
├── generated/               ← Never edit — overwritten on compile
│   ├── models/
│   ├── routes/
│   ├── state-machines/
│   ├── channels/
│   └── workflows/
├── AGENTS.md                ← BoneScript guidance (written by plugin)
└── .opencode/
    └── plugins/             ← Plugin source lives here (if using source install)
```

---

## Troubleshooting

**Plugin not loading**
Check that the files are in `.opencode/plugins/` (project-level) or `~/.config/opencode/plugins/` (global). Run with `--print-logs --log-level DEBUG` and grep for `bonescript`.

**`bonec` not found**
Install the compiler: `npm install -g bonescript-compiler`
→ [npmjs.com/package/bonescript-compiler](https://www.npmjs.com/package/bonescript-compiler)

**Interceptor blocking something it shouldn't**
The safe-path allowlist covers `.bone`, `extensions/`, `generated/`, and test files. If something legitimate is being blocked, edit `detect.ts` and add the path to `SAFE_PATH_PATTERNS`.

**`bonec diff` not available**
Upgrade: `npm install -g bonescript-compiler@latest`

---

## Building from source

```bash
bun install
bun run build       # compiles TypeScript to dist/
bun run typecheck   # type-check without emitting
```

For local plugin use, copy `src/` directly — OpenCode's Bun loader handles TypeScript natively, no build step needed.

---

## Related packages

| Package | Description |
|---------|-------------|
| [`bonescript-compiler`](https://www.npmjs.com/package/bonescript-compiler) | The `bonec` CLI — install this first |
| [`opencode-bonescript-backend`](https://www.npmjs.com/package/opencode-bonescript-backend) | This plugin |

## Links

- [BoneScript on GitHub](https://github.com/Doorman11991/BoneScript)
- [opencode-bonescript-backend on GitHub](https://github.com/Doorman11991/opencode-bonescript-backend)
- [opencode-bonescript-backend on npm](https://www.npmjs.com/package/opencode-bonescript-backend)
- [bonescript-compiler on npm](https://www.npmjs.com/package/bonescript-compiler)
- [OpenCode](https://opencode.ai)

---

## License

MIT — see [LICENSE](LICENSE)
