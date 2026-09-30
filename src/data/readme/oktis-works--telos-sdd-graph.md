# OPENCODE TELOS

A **Spec-Driven Development (SDD)** plugin for [OpenCode](https://github.com/anomalyco/opencode). It turns the development environment into a conversational system based on a Knowledge Graph, where the specification always comes before the code.

## What it does

- **Conversational discovery**: analyzes your briefing, detects what is missing and asks questions with selection menus (via the OpenCode `question` tool)
- **Knowledge Graph**: keeps a semantic graph as the source of truth for the project
- **Configurable tech stack**: detects mentioned technologies, uses the AI's knowledge for stacks not supported by templates
- **@ references**: reads `.md` files to extract stack specifications
- **Code generation**: generates code for supported stacks (Express+React+SQLite) or uses AI for arbitrary stacks
- **SDD-first enforcement**: blocks code modifications that did not go through the specification
- **Change management**: every change becomes a trackable Change node in the graph
- **Impact analysis**: traverses the graph to show what will be affected
- **Drift detection**: detects when the code deviated from the specification
- **Web dashboard**: real-time 3D graph visualization with 3d-force-graph
- **Constitution**: defines mandatory, optional and preferred principles for the project
- **Promise tracking**: tracks specification promises and detects violations
- **Quality scoring**: calculates a quality score (0-100%) with trend
- **Anti-pattern detection**: identifies god nodes, circular dependencies, speculation
- **AST clone detection**: detects duplicated code in the project
- **Contradiction detection**: identifies conflicting requirements and rules
- **Test coverage tracking**: measures test coverage by requirement
- **Config drift detection**: detects inconsistencies in configs
- **Session handoff**: generates a state package to continue work
- **Workflow export**: exports the SDD state as a structured report
- **Shell hooks**: installs Git hooks for SDD integration
- **Brownfield scanning**: analyzes existing projects for integration
- **Brownfield SDD findings**: documentation mode preserves AS-IS defects as persistent findings and remediation tasks; reverse-engineering mode converts them into target requirements with source evidence and readiness gates
- **Reverse engineering**: `sdd.reverse_engineer` turns an existing codebase into a graph — `purpose=documentation` documents the system as-is (spec nodes auto-approved), `purpose=reverse_engineering` produces a technology-agnostic spec to rebuild with another stack; `depth=structure|full` and `focus_dirs` scope the scan
- **Release milestones**: `sdd.milestone` manages release scope (`create/list/add/remove/assign/close/report`) and reports traceability gaps per release
- **Acceptance lifecycle**: criteria are versioned nodes with SHA-256 hash, audit events (CLI, tool, dashboard and MCP share one service) and **final delivery acceptance** (`final_accept`/`final_reject`) on the Change
- **Node guidance**: any node can receive a human instruction; impact is analyzed, a structured proposal is stored, and applying it is version-checked and audited
- **Execution ledger**: every workflow run/step is recorded in `.sdd/executions/events.jsonl` with run/step ids, timeouts and cancellation (readable at `GET /api/executions`)
- **CI/CD Integration**: generates GitHub Actions, GitLab CI, Jenkins, Docker, CircleCI, Azure DevOps, AWS CodePipeline, Travis CI, NPM Publish, Docker Compose, Maven (Java), Python (pip), Go (GoReleaser) with SDD validation
- **Multi-developer Sync**: Git-based synchronization with conflict detection and resolution
- **Rollback**: 3 rollback layers (git → snapshot → backup)
- **Permissions**: role-based access control (admin, architect, developer, viewer) with GitHub/GitLab authentication
- **Enterprise Workflows**: automated workflows for enterprise scenarios:
  - **Bug Fixing**: workflow with automatic approval
  - **Hotfix/Emergency**: enforcement bypass + retrospective documentation
  - **Refactoring**: dependency verification + mandatory tests
  - **Deprecation**: migration plan + notifications
  - **Data Migration**: migration scripts + rollback
  - **A/B Testing**: experiments with variants
  - **Feature Flags**: rollout control
  - **Multi-tenancy**: data isolation
  - **Onboarding**: guide for new developers
  - **Security Audit**: automated security audit
  - **Scalability Analysis**: scalability analysis
  - **Compliance**: regulatory validation (GDPR, HIPAA, SOC2)
  - **Monitoring**: metrics and alert configuration
  - **Incident Management**: incident management
  - **SLA Tracking**: service level agreement tracking
  - **Cost Management**: cost estimation
  - **Documentation**: documentation generation
  - **Knowledge Transfer**: knowledge transfer
  - **Disaster Recovery**: disaster recovery plan

## Prerequisites

- [OpenCode](https://github.com/anomalyco/opencode) 2.x or newer
- [Bun](https://bun.sh) (plugin runtime)

Telos is built exclusively on the **OpenCode SDK v2** (`@opencode/plugin` 2.x)
and exports `{ id, setup }`. Every tool is registered under the `sdd` namespace
as `sdd_<name>` (for example `sdd_acceptance`).

## Installation

### Option 1: Via OpenCode CLI (recommended)

```bash
opencode plugin add @oktis-works/telos-sdd-graph
```

This installs the plugin automatically in your OpenCode.

### Option 2: Via npm

```bash
npm install -g @oktis-works/telos-sdd-graph
```

Then add it to your `opencode.json`:

```json
{
  "plugins": ["@oktis-works/telos-sdd-graph"]
}
```

### Option 3: Local plugin

Clone the plugin folder into an accessible directory and build it (the
repository ships source only — `dist/` is generated by `bun run build` and
published to npm, it is not committed):

```bash
git clone https://github.com/JudahAragao/opencode-telos.git ~/.config/opencode/plugins/telos-sdd-graph
cd ~/.config/opencode/plugins/telos-sdd-graph
bun install && bun run build
```

Then add it to your `opencode.json`:

```json
{
  "plugins": ["~/.config/opencode/plugins/telos-sdd-graph"]
}
```

### Option 4: Project-local plugin

Copy the plugin folder into your project and build it (the same
source-only rule as Option 3 applies):

```bash
cp -r /path/to/telos-sdd-graph ./telos-sdd-graph
cd ./telos-sdd-graph && bun install && bun run build
```

Then add it to your `opencode.json`:

```json
{
  "plugins": ["./telos-sdd-graph"]
}
```

> **Note:** Companion plugins (optional) are available as separate packages:
> - `@oktis-works/opencode-ssh` — SSH support
> - `@oktis-works/telos-sdd-tui` — TUI dashboard

## How the interaction works

### SDD toggle (on/off)

The plugin can be enabled or disabled at any time. The plugin registers a
**command hub** through `ctx.command.transform`: a single `sdd` command
that routes to deterministic subcommands (executed by the plugin, without
depending on the LLM to perform the action):

| Command | Subcommand | Effect |
|---|---|---|
| `/sdd` | `panel` / `help` | Shows the panel with the available subcommands |
| `/sdd on` | `on` / `enable` | Enables SDD enforcement (every change requires a spec) |
| `/sdd off` | `off` / `disable` | Disables enforcement (you can code freely) |
| `/sdd status` | `status` | Shows the current toggle state |
| `/sdd renew` | `renew` | Renews the validity window of the active workflow, keeping the same Change |
| `/sdd viz` | `viz` / `viz start` | Starts the Knowledge Graph dashboard (3D, real time) in the background |
| `/sdd viz stop` | `viz stop` | Stops the dashboard |
| `/sdd viz status` | `viz status` | Shows the dashboard URL |
| `/sdd tasks` | `tasks` | Lists the Kanban task board |
| `/sdd tasks integrate` | `tasks integrate` | Shows the AI integration plan for tasks pending integration |
| `/sdd tasks board` | `tasks board` | Opens the dashboard on the Kanban board |
| `/sdd tasks change <TASK-ID>` | `tasks change <id>` | Opens the SDD Change that authorizes the code of a task (`--approve` approves it) |
| `/sdd acceptance <REQ-ID>` | `acceptance <id>` | Lists the Requirement's canonical human acceptance criteria |
| `/sdd acceptance accept <AC-ID>` | `acceptance accept <id>` | Accepts one criterion through the central service |
| `/sdd acceptance accept-all <REQ-ID>` | `acceptance accept-all <id>` | Accepts all pending criteria as one audited operation |
| `/sdd acceptance create <REQ-ID> <text>` | `acceptance create <id> <text>` | Creates an official criterion for the Requirement |
| `/sdd acceptance update <AC-ID> <text>` | `acceptance update <id> <text>` | Versions the criterion text and returns it to `PENDING` |
| `/sdd acceptance migrate` | `acceptance migrate` | Materializes legacy inline criteria as nodes |
| `/sdd acceptance final-accept <CHG-ID>` | `acceptance final-accept <id>` | Records final delivery acceptance for a Change (`final-reject` rejects it) |
| `/sdd guide <NODE-ID> <instruction>` | `guide <id> <instruction>` | Records human guidance for any Knowledge Graph node |
| `/sdd cache_reset` | `cache_reset` | Clears caches without killing the session |

`/sdd-viz` and `/sdd:viz` are accepted as the same command as `/sdd viz`.
The dashboard listens on `127.0.0.1:7331` (override with `SDD_DASHBOARD_PORT`),
falls back to a free port when 7331 is taken, and is stopped when the OpenCode
process exits — it is an in-process server, not a detached daemon.

> **Note:** because slash `/` commands in OpenCode are *prompt commands* by
> definition, invoking them may make OpenCode **also trigger an LLM turn**.
> The deterministic action itself is performed by the plugin command handler
> without depending on the model; on hosts that support synthetic messages the
> result is delivered without any model turn.

**Recommended way (no LLM turn):** the same operations are available as
**tools/MCP**, called by the agent deterministically:

| Tool | Effect |
|---|---|
| `sdd.toggle` | Enables/disables enforcement |
| `sdd.toggle_status` | Shows the current toggle state |

When disabled:
- The SDD system prompt is not injected
- There is no enforcement on writes/edits
- The agent can modify code directly

When enabled:
- Mandatory SDD-first workflow
- Spec before code
- Change nodes for every modification

The toggle state is persisted in `.sdd/enabled` inside the project.

### Provider-safe tool names (automatic)

Some strict OpenAI-compatible providers, including NVIDIA NIM deployments, reject
tool names containing dots. Telos keeps canonical names such as `sdd.acceptance`
internally, and the **OpenCode v2 host normalizes the `sdd` namespace itself**:
"Dots in namespaces and unsupported characters in tool names become `_`")
(https://opencode.ai/v2/docs/build/plugins/), so every tool is exposed to every
provider as `sdd_<name>`, and the system prompt advertises exactly those names.
There is no configuration: no environment variable, no `.opencode/tool-names.json`
and no plugin-side renaming — the host does the normalization.

The plugin hooks always use canonical names for permissions, enforcement,
workflows and dispatch, so the wire spelling never leaks into the rules.

### Step 1: Describe the project

Open OpenCode in your project folder and describe what you want to create:

```
I want to create a task management system.
Each user will have their own tasks with title, description and status.
```

The plugin automatically:

1. Detects that SDD is not initialized
2. Runs `sdd.discover` analyzing your briefing
3. Detects: entities (user, task), domain (task_management)
4. Detects mentioned technologies (none yet)
5. Returns structured questions for the `question` tool

### Step 2: Answer with selection menus

OpenCode displays a menu for each missing question:

```
? Which framework will be used on the frontend?
  > React
    Vue.js
    Angular
    Svelte
    Next.js
    [Type your own answer]
```

```
? Which framework will be used on the backend?
  > Express
    Fastify
    NestJS
    Django
    FastAPI
    [Type your own answer]
```

```
? Which database will be used?
  > SQLite
    PostgreSQL
    MySQL
    MongoDB
    [Type your own answer]
```

```
? How will users log in to the system?
  > Email + Password
    Google OAuth
    JWT
    No authentication
    [Type your own answer]
```

```
? How should deletions work in the system?
  > Hard delete (permanent)
    Soft delete (reversible)
```

You select an option or type your own answer. The plugin sends the answers together with the original briefing, rebuilds the Knowledge Graph, and creates an idempotent implementation-task backlog. Generated tasks start as pending integration; use `/sdd tasks integrate` when you are ready to authorize implementation.

### Step 3: Specify the stack via .md files (optional)

If you prefer to define the stack in a file, create a `.md` and reference it with `@`:

```
I want a task system. @tech.md
```

Where `tech.md` contains:

```markdown
## Stack
- Frontend: Next.js + Tailwind
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Auth: Clerk
```

The plugin reads the file, detects the technologies and **does not ask** about them.

### Step 4: Generate the code

Once the specification is sufficient:

```
Generate the project code
```

The plugin:

- If the stack has built-in templates (Express+React+SQLite): generates the files automatically
- If the stack is different: returns a detailed specification and the AI generates the code using its knowledge of your chosen technologies

### Step 5: Modify features

```
Add a priority field to tasks with LOW, MEDIUM and HIGH values
```

The plugin **forces** the SDD workflow:

1. `sdd.enforce` → classifies as "add_functionality"
2. Creates a Change node (e.g. CHG-001)
3. Analyzes impact: Task entity, API, tests
4. Updates the specification
5. Validates the SDD
6. Regenerates the affected code
7. Completes the Change

### Step 6: Architectural changes

```
Change the database from SQLite to PostgreSQL
```

The plugin **blocks** and asks for explicit approval before proceeding.

### Step 7: Check drift

```
Check if there is any drift in the project
```

The plugin compares the graph with the code and reports divergences.

### Complete the specification manually

If you think the AI did not ask all the questions, you can:

**Validate what is missing:**
```
Validate the SDD and tell me what is missing in the spec
```
The agent runs `sdd.validate` and lists errors/warnings (e.g. entity without fields, requirement without task).

**Run discovery again:**
```
Analyze the current SDD and ask all the missing questions
```
The agent inspects the graph with `sdd.inspect`, identifies gaps, and asks questions via `question`.

**Check completeness before generating:**
```
Check if the spec is complete before generating code
```

**Add entities/rules manually:**
```
Add a Tenant entity with fields id (uuid), name (string), created_at (timestamp)
```
The agent runs `sdd.graph_mutation(action="add_node")` directly.

**Add a relationship:**
```
Create a relationship: Tenant contains User
```

**Query the current state:**
```
Show the current SDD state
```
The agent runs `sdd.inspect` showing stats, nodes by type and status distribution.

## Kanban task board

The dashboard exposes a **Kanban view** over the existing `task` nodes — no
schema change. Columns are derived from the task status:

| Column | Status |
|---|---|
| Backlog | `DRAFT`, `PROPOSED`, `todo` |
| Ready | `ready`, `APPROVED` |
| In Progress | `in_progress`, `IMPLEMENTING`, `VERIFYING` |
| Blocked | `blocked`, `BLOCKED`, `CONFLICT`, `FAILED`, `DRIFTED` |
| Done | `completed`, `COMPLETED`, `IMPLEMENTED`, `VERIFIED`, `DEPRECATED`, `ROLLED_BACK` |

Open it with `/sdd viz` (or `/sdd tasks board`) and switch to the **Kanban** tab:

- **Create manually**: the “+ New task” button writes a `task` node to the graph
  immediately (status `todo`, linked to the project root so it is never an
  orphan). The task keeps `metadata.integration_status: "pending"`.
- **Edit / drag**: moving a card updates the node status; editing content marks
  the task as pending integration again.
- **AI integration**: when the SDD agent session is active, saving a card asks
  the agent to run `sdd.integrate_tasks`, linking the task to its
  `feature`/`requirement` (`implements`), tests (`tested_by`) and dependencies.
  Without an active session the task simply stays pending and the agent picks
  it up on the next turn (the system prompt surfaces the pending count) —
  `/sdd tasks integrate` prints the plan at any time.

Persistence goes through the same repository as the SDD tools, so the board
works for both YAML and SQLite backends. Mutating routes reject cross-origin
requests and non-loopback `Host` headers.

### Filtering, search and sorting

The toolbar at the top of the Kanban lets you:

- **Search** by free text (matches task id, name, description, goal, files and linked node names).
- **Filter by link status**: all / linked / unlinked / specific node type (feature, requirement, entity, test).
- **Filter by integration**: all / pending / manual / integrated.
- **Filter by priority**: all / critical / high / medium / low.
- **Filter by column**: all / Backlog / Ready / In Progress / Blocked / Done.
- **Sort** by: column (default), priority, name, updated, created, links, integration.
- **Toggle ascending/descending** order.

All filter state is persisted in `localStorage` and survives page reloads. The
**Clear** button resets everything. The server-side API also accepts query
params (`GET /api/tasks?q=...&priority=high&sort=name&order=desc`) for external
consumers.

Each card shows a colored priority badge and, when a Change has been opened,
a `CHG-xxx · STATUS` badge.

### From task to code: the SDD Change

A task is only a work item — the write hook refuses any `Write`/`Edit` that is
not covered by an **APPROVED `change`** node. So an integrated task opens its
own Change, and that Change is what unlocks code generation:

1. `mark_integrated` (or the card's **Open SDD Change** button,
   `POST /api/tasks/:id/change`, or `/sdd tasks change <TASK-ID>`) creates a
   `change` node through the standard `createChange` path — impact analysis,
   approval level, `affected_files`/`affected_tests` taken from
   `task.metadata.files`, `implementation_tasks: [task.id]`, and
   `change → affects → <spec nodes linked to the task>`.
2. The link is recorded both ways (`change.affects → task` and
   `task.metadata.change_id` / `change_status`), so the card shows a
   `CHG-xxx · STATUS` badge and the topbar counts the Changes awaiting approval.
3. **AUTO**-level Changes with a complete file scope are approved immediately;
   `REVIEW`/`APPROVAL` ones stay in draft and the modal offers
   **Approve + generate code** (`{ "approve": true }`) or
   `/sdd tasks change <TASK-ID> --approve`. A Change without `affected_files`
   cannot be approved — the write hook would reject every file — so the blocker
   is reported instead.
4. Once approved, the agent is handed
   `buildChangeImplementationPrompt(...)`: implement the code **covered by that
   Change**, run the tests and finish with `sdd.complete_change`. Without an
   active session nothing is lost: the next turn surfaces the tasks whose Change
   still needs approval, and the same steps are available as tools.

The bridge is idempotent — calling it twice returns the same Change — and never
writes source code itself.

| Tool | Description |
|---|---|
| `sdd.integrate_tasks` | Kanban bridge: `list` tasks pending integration, `create`/`update`/`remove` tasks, `mark_integrated` (which opens the Change) and `open_change`/`approve_change` to drive the code authorisation |

## Dashboard HTTP API

The dashboard server (started by `/sdd viz` or `sdd.start_dashboard`) exposes a
read/write JSON API on `127.0.0.1:7331`. Mutating routes reject cross-origin
requests and non-loopback `Host` headers.

| Method + path | Purpose |
|---|---|
| `GET /api/health`, `/api/status`, `/api/project`, `/api/progress` | Server, project and progress summaries |
| `GET /api/graph`, `/api/graph/summary`, `/api/graph/counts`, `/api/graph/types`, `/api/graph/relationships` | Graph payload and aggregates |
| `GET /api/nodes`, `GET /api/nodes/:id` | Node listing and detail |
| `GET /api/changes`, `/api/drift`, `/api/validation` | Change list, drift report, validation report |
| `GET /api/executions?run_id=&call_id=&limit=` | Execution ledger records |
| `GET /api/tasks?q=&priority=&sort=&order=` | Kanban tasks (search/filter/sort) |
| `POST /api/tasks`, `POST/PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` | Create / update / delete a task |
| `POST /api/tasks/:id/integrate`, `/integrated`, `/change` | AI integration and task → Change bridge |
| `GET /api/acceptance?requirement_id=` | Acceptance criteria for a Requirement |
| `POST /api/acceptance/:id/:action` | `accept`, `reject`, `waive`, `reopen`, `update_text` |
| `POST /api/acceptance/accept-all?requirement_id=` | Accept all pending criteria transactionally |
| `POST /api/acceptance/migrate` | Materialize legacy inline criteria |
| `POST /api/acceptance/final/:changeId/:action` | Final delivery acceptance (`accept` / `reject`) |
| `GET/POST /api/guidance`, `POST /api/guidance/:id/:action` | Guidance create/list + `analyze`, `propose`, `apply`, `reject` |
| `GET /api/impact/:nodeId?depth=` | Node impact analysis |
| `GET /api/events` | Server-sent event stream (live dashboard updates) |

## Available tools

The tables below use the **canonical** name of each tool (for example
`sdd.acceptance`), which is the identifier used everywhere inside the
specification, the hooks and the audit log. The name the model actually calls
is the host's effective name: namespace `sdd` + tool `acceptance` →
`sdd_acceptance`.

The system prompt is rewritten to advertise the effective spelling, so the model
never sees a name that is not registered.

### Graph initialization and management

| Tool | Description |
|---|---|
| `sdd.initialize` | Initializes SDD for the project |
| `sdd.toggle` | Enables/disables SDD enforcement (write) |
| `sdd.toggle_status` | Shows the current toggle state (read-only) |

### Navigation and search

| Tool | Description |
|---|---|
| `sdd.inspect` | Shows the current state of the graph |
| `sdd.query_graph` | Searches nodes by text, type or ID |
| `sdd.get_context` | Context pack for a node |
| `sdd.analyze_impact` | Impact analysis via traversal |

> Node listing/counting/status filtering, traversal and path finding live in the composite tools below (`sdd.graph_query`, `sdd.traverse`).

### Graph building

| Tool | Description |
|---|---|
| `sdd.build_graph` | Builds a complete Knowledge Graph from a briefing (entities, features, requirements, relationships). The primary tool for bootstrapping a specification: prefers an `analysis_json` with the agent's structured analysis. |
| `sdd.auto_link_tests` | Links orphan tests to requirements by name/import analysis (`tested_by`), optionally as a dry run |
| `sdd.infer_relationships` | Rebuilds graph traceability: infers the missing semantic edges (`requirement --specifies--> feature`, `endpoint/file --implements--> feature`, `endpoint --operates_on--> entity`, `task/change --belongs_to--> milestone`), normalizes redundant inverse pairs and creates milestone nodes. Idempotent; `dry_run` previews the edges |
| `sdd.milestone` | Manages release milestones and reports traceability per release: `create`, `list`, `add`, `remove`, `assign`, `close`, `report`. The report shows the release scope, task progress and gaps (requirements without tests, features without implementation, endpoints/files without a feature) |
| `sdd.findings` | Brownfield findings lifecycle: `scan`, `list`, `report`, `readiness`, `transition`, `resolve`, `create_task`. Documentation findings remain open until a Change verifies the fix; reverse-engineering findings become target requirements/decisions instead of old-code remediation tasks |

### Acceptance and human guidance

Acceptance criteria are first-class `acceptance_criterion` nodes linked to their
Requirement with `has_acceptance_criterion`. Their text, version, SHA-256 hash,
status, actor, timestamp, observation and evidence are stored in the graph.
Tasks do not copy criteria; their dashboard status is derived from linked
Requirements. CLI, dashboard, OpenCode tools and MCP use the same service.

`sdd.acceptance` is the central service and accepts
`list`, `summary`, `create`, `accept`, `reject`, `waive`, `reopen`, `accept_all`,
`update_text`, `migrate`, `final_accept` and `final_reject`. Change approval and
completion can optionally require all affected criteria to be accepted; configure
this through the SDD acceptance settings. Changing criterion text increments its
version, returns it to `PENDING` and invalidates the previous hash. Mutations are
permission-gated (`create_requirement`, `accept_requirement`,
`reject_requirement`, `waive_requirement`, `reopen_requirement`, `accept_final`,
`reject_final`) and every event goes to the acceptance audit sink
(`.sdd/audit-log.json`). `final_accept`/`final_reject` operate on the **Change**
(`change_id`), recording `metadata.final_acceptance` with actor, timestamp,
observation, evidence and an optional `expected_version` optimistic check.

The gradual rollout flags are `acceptance.enabled`,
`acceptance.require_before_change_approval`,
`acceptance.require_before_change_completion`,
`acceptance.allow_waived` and `acceptance.legacy_fallback` in the SDD config.

Human instructions for any node are recorded as `guidance` nodes. The service
calculates bidirectional impact, stores a structured proposal, checks the target
version, and applies the update with audit history. Acceptance criteria receive
special handling so text changes always refresh their hash/version invariants.
The same capability is exposed as tools (and through `/sdd guide`):

| Tool | Description |
|---|---|
| `sdd.acceptance` | `list`, `summary`, `create`, `accept`, `reject`, `waive`, `reopen`, `accept_all`, `update_text`, `migrate`, `final_accept`, `final_reject` |
| `sdd.impact` | Bidirectional and semantic impact of changing a node (`node_id`, `depth`) |
| `sdd.node_guidance` | Guidance lifecycle: `create`, `analyze`, `propose`, `apply`, `reject` — impact + structured proposal + version check + audit |

### Composite tools

The router groups related tools into **composite tools** that accept an `action` parameter. They are the single canonical path for these capabilities: the original standalone tools (`sdd.add_node`, `sdd.analyze_complexity`, `sdd.create_snapshot`, ...) were **removed** from the catalog and are no longer registered or announced. A residual call to an old name is rejected with a redirect to the canonical form.

| Tool | Actions |
|---|---|
| `sdd.graph_mutation` | `add_node`, `update_node`, `remove_node`, `add_relationship`, `remove_relationship` |
| `sdd.graph_query` | `count_nodes`, `get_nodes_by_status`, `list_nodes` |
| `sdd.traverse` | `outgoing`, `incoming`, `both`, `subgraph`, `find_path` |
| `sdd.permissions` | `set_role`, `check`, `audit`, `config`, `save_config`, `role`, `approval` |
| `sdd.snapshot` | `create`, `rollback`, `history`, `list` |
| `sdd.sync` | `status`, `pull`, `push`, `conflicts`, `merge` |
| `sdd.graph_admin` | `health`, `health_detail`, `prune`, `cache`, `conventions`, `learn` |
| `sdd.code_quality` | `complexity`, `metrics`, `smells`, `dependencies`, `usage`, `dead_code`, `remove_dead_code`, `parse_symbols`, `plan_implementation`, `analyze_codebase` |
| `sdd.enterprise` | `migration`, `experiment`, `flag`, `tenant`, `security_audit`, `scalability`, `compliance`, `monitoring`, `dashboard`, `incident`, `sla`, `cost`, `docs`, `onboarding`, `knowledge_transfer`, `disaster_recovery`, `config_drift`, `workflow_export` |
| `sdd.drift_whitelist` | `add`, `remove`, `list` |

### Workflow chains

Encapsulated multi-step workflows executed as a single tool call (each step uses the SDD tools under the hood):

| Tool | What it does |
|---|---|
| `sdd.workflow_new_feature` | enforce → build_graph → validate → approve → generate → verify → complete |
| `sdd.workflow_bug_fix` | enforce → validate → approve → generate → verify → complete |
| `sdd.workflow_hotfix` | emergency hotfix (no enforcement) + retrospective documentation |
| `sdd.workflow_refactor` | enforce → validate → analyze impact → complete |
| `sdd.workflow_full_cycle` | full cycle via `sdd.full_cycle` |
| `sdd.workflow_reverse_engineer` | reverse_engineer → validate → inspect |

### Discovery and briefing

| Tool | Description |
|---|---|
| `sdd.discover` | Analyzes briefing, returns questions for the `question` tool |
| `sdd.update_from_answers` | Updates the graph with answers |

### Change management

| Tool | Description |
|---|---|
| `sdd.create_change` | Creates a Change with approval gates (refuses to create one without `affected_files`) |
| `sdd.approve_change` | Approves a change (refuses a Change with no declared scope) |
| `sdd.verify_implementation` | Runs the declared scripts + the requirement→test evidence, and binds the report to the Change's files |
| `sdd.complete_change` | Marks a change as complete, only when every gate passes |
| `sdd.renew_workflow` | Renews the active workflow window, keeping the same Change and its verification report |
| `sdd.pending_changes` | Lists pending changes |
| `sdd.fail_change` | Marks a change as FAILED with a reason |
| `sdd.change_history` | Shows the changes history ordered by creation |
| `sdd.impact_report` | Generates a detailed impact report for a change (affected nodes, files, new/modified/removed) |

### Completion gate (trava B)

`sdd.complete_change` only completes a Change when **all** of these hold:

1. the executable verification passed — or was explicitly waived with `acknowledge_no_scripts=true` in a project that declares no script;
2. the requirement→test evidence holds, or the Change declares `no_requirement_impact=true`;
3. no verification check failed;
4. the project fingerprint still matches (any code/config change invalidates the report);
5. the declared `affected_files` still exist with the same content hashes (`verifyScopedFiles`);
6. the Change references at least one node that exists in the graph (spec evidence).

`force=true` remains an explicit, audited override — it is not a shortcut. The blocked message lists exactly which condition failed.

### Workflow window

An active workflow is valid for 30 minutes (`SDD_WORKFLOW_TTL_MS` overrides it).
When it expires mid-task, `sdd.renew_workflow` (or `/sdd renew`) extends the window
for the **same** Change, preserving the verification report. Calling `sdd.enforce`
again would create a new Change and orphan the previous one.

### Validation and quality

| Tool | Description |
|---|---|
| `sdd.validate` | Validates SDD integrity |
| `sdd.constitution` | Manages the project constitution (principles) |
| `sdd.quality` | Calculates the quality score with trend |
| `sdd.contradictions` | Detects contradictions in the graph |

### Migrations

| Tool | Description |
|---|---|
| `sdd.check_migrations` | Checks if SDD data needs migration (graph.yaml vs graph.db, missing fields) |
| `sdd.run_migrations` | Executes all pending SDD migrations |
| `sdd.migrate_storage` | Migrates storage between YAML and SQLite backends |

### Drift detection

| Tool | Description |
|---|---|
| `sdd.detect_drift` | Detects specification ↔ code drift |
| `sdd.drift_signals` | Detects advanced drift signals (mutant duplicates, architecture violations, pattern fragmentation) |

### Patterns and anti-patterns

| Tool | Description |
|---|---|
| `sdd.anti_patterns` | Detects anti-patterns in the graph |
| `sdd.clone_detection` | Detects duplicated code in the project |

### Code and generation

| Tool | Description |
|---|---|
| `sdd.generate_code` | Generates code (templates or via AI for arbitrary stacks) |
| `sdd.enforce` | Enforces the SDD-first workflow |
| `sdd.enforce_rules` | Shows the enforcement rules |
| `sdd.full_cycle` | Full cycle: enforce → validate → generate → sync |

### Verification

| Tool | Description |
|---|---|
| `sdd.verify_implementation` | Runs the project-declared verification scripts (lint, typecheck, test, build, etc.) **plus** the requirement→test evidence for the Change. A report is required before completing the Change. |

### Analysis

| Tool | Description |
|---|---|
| `sdd.drift_signals` | Detects advanced drift signals (mutant duplicates, architecture violations, pattern fragmentation) |
| `sdd.brownfield_scan` | Analyzes an existing project for integration |
| `sdd.reverse_engineer` | Reverse-engineers an existing codebase into the graph (`purpose=documentation\|reverse_engineering`, `depth=structure\|full`, `focus_dirs`) |

> Code quality analysis, codebase intelligence, sync, rollback and permissions are composite tools (`sdd.code_quality`, `sdd.sync`, `sdd.snapshot`, `sdd.permissions`).

### Enterprise workflows

| Tool | Description | Approval level |
|---|---|---|
| `sdd.bug_fix` | Full bug fix workflow | AUTO |
| `sdd.hotfix` | Retrospective hotfix documentation | POST_HOC |
| `sdd.refactoring` | Refactoring with dependency verification | REVIEW |
| `sdd.deprecate` | Deprecation with migration plan | APPROVAL |

> Migrations, experiments, feature flags, multi-tenancy, monitoring, dashboards, incidents, SLAs, docs, onboarding, knowledge transfer, disaster recovery, config drift and workflow export are actions of `sdd.enterprise`.

### Documentation and knowledge

| Tool | Description |
|---|---|
| `sdd.session_handoff` | Generates a session handoff package |

### Cost and CI/CD

| Tool | Description |
|---|---|
| `sdd.generate_cicd` | Generates CI/CD config (platform: github, gitlab, jenkins, docker, or all) |

### Infrastructure

| Tool | Description |
|---|---|
| `sdd.install_hooks` | Installs Git hooks for SDD |
| `sdd.brownfield_scan` | Analyzes an existing project |
| `sdd.start_dashboard` | Starts the web server with 3D graph visualization |
| `sdd.mcp_server_info` | MCP server information |
| `sdd.handle_mcp_tool` | Processes a tool via the MCP protocol |
| `sdd.telemetry` | Shows local performance, estimated token, and cache telemetry (nothing leaves the machine) |
| `sdd.record_feedback` | Records a local human correction for an extracted fact/classification |

### MCP server

The plugin can also be consumed over MCP (`sdd.mcp_server_info`,
`sdd.handle_mcp_tool`). The server announces 19 `sdd_*` tools:
`sdd_get_quality`, `sdd_get_drift`, `sdd_get_validation`, `sdd_get_handoff`,
`sdd_get_release`, `sdd_get_acceptance`, the acceptance mutations
(`sdd_accept_criterion`, `sdd_reject_criterion`, `sdd_waive_criterion`,
`sdd_reopen_criterion`, `sdd_accept_all`, `sdd_create_criterion`,
`sdd_update_criterion`, `sdd_migrate_acceptance`, `sdd_accept_final`,
`sdd_reject_final`) and guidance (`sdd_node_impact`, `sdd_create_guidance`,
`sdd_apply_guidance`). CLI, dashboard, OpenCode tools and MCP all go through the
same services, so permissions, versions and audit history are shared.

### Promises

| Tool | Description |
|---|---|
| `sdd.promises` | Tracks specification promises |
| `sdd.coverage` | Measures test coverage by requirement |

## Tech stack and code generation

### Stacks with built-in templates

The plugin generates code automatically for:

| Layer | Technologies |
|---|---|
| Frontend | React + React Router + custom hooks |
| Backend | Express or Fastify + REST routes + controllers + services + repositories |
| Database | SQLite, PostgreSQL or MySQL (via native drivers) + SQL schema |
| Tests | Bun test |
| Types | Shared TypeScript |

### Arbitrary stacks (via AI)

For any other combination (Django, FastAPI, Rails, Go, etc.):

1. The plugin detects the stack from the graph
2. If it is not in the built-in template set, it returns a **spec prompt**
3. The spec prompt lists entities, endpoints and business rules extracted from the graph
4. The AI generates the complete code using its knowledge of your chosen technologies
5. You can specify the stack via the briefing (`FastAPI with PostgreSQL`) or via a `@tech.md` file

### Automatic detection

The plugin automatically detects in the briefing:

- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, Tailwind, shadcn/ui, etc.
- **Backend**: Express, Fastify, NestJS, Django, FastAPI, Flask, Rails, Laravel, Spring Boot, Go, Rust, etc.
- **Database**: PostgreSQL, MySQL, SQLite, MongoDB, Redis, Supabase, Firebase, Turso, etc.
- **Auth**: JWT, Google/GitHub OAuth, Clerk, Auth0, NextAuth, session/cookie, etc.
- **Language**: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby
- **Tests**: Jest, Vitest, Bun test, Cypress, Playwright, pytest, RSpec

Technologies that have already been mentioned **are not asked again**.

## Supported node types

| Type | Description |
|---|---|
| `project` | The project |
| `domain` | Functional domain |
| `feature` | Feature |
| `requirement` | Requirement |
| `business_rule` | Business rule |
| `actor` | External user/system |
| `entity` | Domain entity |
| `value_object` | Value object |
| `flow` | Flow |
| `use_case` | Use case |
| `architecture_component` | Architectural component |
| `module` | Module |
| `api` | API interface |
| `endpoint` | HTTP endpoint |
| `database` | Database |
| `table` | Table |
| `field` | Field |
| `task` | Implementation task |
| `test` | Test |
| `file` | Code file |
| `symbol` | Function, class, interface |
| `change` | System change |
| `decision` | Architectural decision (ADR) |
| `constraint` | Constraint |
| `assumption` | Recorded assumption |
| `constitution` | Project principles (must/should/may) |
| `bug_fix` | Bug fix workflow record |
| `hotfix` | Emergency/hotfix record |
| `refactoring` | Refactoring record |
| `deprecation` | Deprecation record |
| `migration` | Data migration record |
| `experiment` | A/B experiment |
| `feature_flag` | Feature flag |
| `tenant` | Tenant (multi-tenancy) |
| `metric` | Monitored metric |
| `alert` | Alert rule |
| `incident` | Incident record |
| `finding` | Brownfield finding (AS-IS defect or target gap) |
| `sla` | Service level agreement |
| `milestone` | Release milestone |
| `acceptance_criterion` | Canonical human acceptance criterion (versioned, hashed) |
| `guidance` | Human instruction for a node (proposal + audit) |

## Relationship types

```
contains, depends_on, requires, implements, implemented_by,
satisfied_by, affects, modifies, creates, deletes, uses,
calls, persists_to, exposes, tested_by, tests, derived_from,
contradicts, supersedes, replaces, blocked_by, belongs_to,
owned_by, triggered_by, flows_to, deprecates, migrates_to,
experimented_by, flagged_by, validates, influences, constrains,
applies_to, owned_by_tenant, monitored_by, alerted_by,
incident_in, detected_in, tracked_by, resolves, evidenced_by,
sla_for, defines, specifies, operates_on, traces_to,
has_acceptance_criterion, guides
```

## Enforcement flow

Every modification must follow it. **The hook blocks programmatically** any Write/Edit to source files that does not have an approved Change node:

```
USER: "Add X"
    ↓
Write/Edit intercepted by the hook
    ↓
Hook checks: source file? SDD initialized? Approved Change covering this file?
    ↓
If there is NO approved Change → ERROR: operation blocked
    ↓
The agent is forced to follow the SDD workflow:
    ↓
sdd.enforce → classifies the change
    ↓
sdd.discover → collects missing information
    ↓
question → selection menus for the user
    ↓
sdd.update_from_answers → updates the graph
    ↓
sdd.create_change → creates a Change node (needs affected_files)
    ↓
sdd.approve_change → approves the Change
    ↓
Write/Edit → operation released by the hook for files covered by the Change
    ↓
sdd.generate_code → generates/updates code
    ↓
sdd.verify_implementation → scripts + requirement→test evidence + file hashes
    ↓
sdd.complete_change → completes only when every gate passes
    (if the 30-min window expires: sdd.renew_workflow keeps the same Change)
```

**What is blocked:** any write operation on `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.rb`, `.vue`, `.svelte` files (outside `node_modules`, `.sdd/`, `dist/`, `build/`, `.git/`, `.opencode/`, and unfollowed files like `package.json`, `tsconfig.json`, `.env`).

**What is NOT blocked:** config files (`package.json`, `tsconfig.json`), `.env`, `.sdd/` files, files outside the project.

**What happens when blocked:** the agent receives an error message describing exactly what it needs to do (enforce → approve → retry).

**Shell bypasses are covered too:** terminal commands that would create or edit a
source file (`> file.ts`, `tee`, `sed -i`, `touch`, `cp`, `mv`, `dd of=`,
`truncate`, heredocs/`open(...)`, `node -e fs.writeFileSync`) are intercepted in
`tool.execute.before` with a broader extension set — `.mjs`, `.mts`, `.c`, `.cpp`,
`.h`, `.hpp`, `.cs`, `.swift`, `.kt` in addition to the ones above — so
`run_terminal_command` cannot slip past the same gate.

## Completing a Change (verification gate)

`sdd.complete_change` only completes a Change when **all** of these hold (unless you explicitly `force=true`, which is an audited override, not a shortcut):

1. **the executable verification passed** — `sdd.verify_implementation` ran the project-declared scripts AND the requirement→test evidence for the Change, and all passed;
2. **the requirement→test evidence holds** — at least one `tested_by` link exists for each affected requirement, or the Change declares `no_requirement_impact=true`;
3. **no verification check failed** — every `format:check`, `lint`, `typecheck`, `test`, `build`, `ci`, `diff`, etc. that the project declares must pass (skipped optional tests do not count as a failure);
4. **the fingerprint still matches** — no code or configuration file changed after verification;
5. **the declared `affected_files` still match** — each file declared by the Change exists and has the same content hash captured at verification (`verifyScopedFiles`);
6. **spec evidence exists** — the Change references at least one node that actually exists in the graph, or declares `no_requirement_impact=true`.

The blocked message lists exactly which condition failed, so the agent knows what to fix.

### What is a "verification script" and when does a project not have one?

`sdd.verify_implementation` does NOT invent a command. It derives the check from the project:

- reads `package.json` scripts and runs the ones it understands: `format:check`, `format`, `lint`, `typecheck`, `check`, `verify`, `build`, `compile`, `test`, `ci`;
- also looks for common manifests: `Cargo.toml` (cargo check/test), `go.mod` (go test), `pyproject.toml`/`pytest.ini`/`tox.ini` (python compile/test), `pom.xml`/gradle/Makefile;
- runs `git diff --check` when there is a `.git` repo.

A project "does not have a verification script" when **none of those is declared** — for example, a straight Node/TS repo that only has `start`/`dev` scripts and no test or lint target, or a minimal project that was not configured with any verification script at all.

In that case `sdd.verify_implementation` returns:

```
## Executable Verification: BLOCKED
- SKIPPED: project verification — No supported project verification manifest or script was declared
No executable verification script was available; configure project scripts before completing the Change.
```

So a project without a verification script is **blocked by default** — that is the intended behavior, because the gate is supposed to require evidence, not guess.

### How can a project still complete when it has no script?

That is the G4 case. Instead of silently forcing the Change, the workflow now uses an **auditable waiver**:

- run `sdd.verify_implementation` with `acknowledge_no_scripts=true` and optionally `waiver_reason` (e.g. "docs-only change, no test runner declared");
- the report is saved with `verification_waived: true` and the recorded reason;
- `sdd.complete_change` then accepts that report as a valid completion.

Use this only when you understand what is missing — it is the explicit path from "I must provide a script" to "I am recording why there is no script and I still want to complete". It does not remove the other gates: the requirement→test evidence, fingerprint and file hashes still apply.

### What about changes that do not write code?

For changes that do not affect a file (documentation only, graph-only updates, metadata changes), declaring an artificial file to satisfy the gate is not the right move. Instead:

- declare `affected_files: []` with `acknowledge_no_files=true` when creating the Change (private, audited — the write hook stays blocked for that Change because there is nothing to cover);
- declare `no_requirement_impact=true` when the change truly alters no specified behaviour;
- complete only if the remaining gates still make sense.

That combination is the intended path for graph-only/documentation-only changes: it records the decision that no script and no spec-trace were required, instead of forcing a Change into a verification model that does not fit it.

## Authentication and roles

### How roles work

The permissions system works on 3 levels:

**1. Remote Detection (automatic)**
- The plugin automatically detects the remote repository (GitHub/GitLab)
- If detected, it uses the API to check the user's permissions
- If not detected or no token → **everyone has admin access**

**2. Available roles**
| Role | Permissions |
|---|---|
| `admin` | Everything: create, approve, modify constitution, rollback, manage permissions |
| `architect` | Create/approve features/requirements, approve architecture, decisions |
| `developer` | Create/approve features/requirements |
| `viewer` | View only |

**3. Automatic fallback**
- No remote repository → everyone is admin
- No auth token → everyone is admin
- Invalid token → fallback to admin
- User not found on remote → checks local role

### Token configuration

**GitHub:**
```bash
export GITHUB_TOKEN=ghp_yourtokenhere
```

**GitLab:**
```bash
export GITLAB_TOKEN=glpat-yourtokenhere
```

The token needs collaborator-read permissions:
- GitHub: `repo` scope
- GitLab: `read_api` scope

### Check status

```
sdd.remote_status
```

Shows whether the remote is configured and whether the token is present.

### Usage example

```
# Check a user's permission
sdd.permissions(action: "check", user: "joao", permission: "approve_architecture")

# Set a role manually (local)
sdd.permissions(action: "set_role", user: "maria", role: "architect")

# Check remote status
sdd.remote_status
```

## Enterprise workflows

The plugin automatically detects enterprise scenarios and suggests specific workflows:

### Automatic detection

When you type something like:
- "Fix the login bug" → Detects **bug fix** and suggests `sdd.bug_fix`
- "Emergency: system is down" → Detects **hotfix** and disables enforcement
- "Refactor the auth module" → Detects **refactoring** and suggests `sdd.refactoring`
- "Deprecate the /api/v1 route" → Detects **deprecation** and suggests `sdd.deprecate`
- "Migrate the users table data" → Detects **migration** and suggests `sdd.enterprise(action="migration")`
- "Create an A/B experiment" → Detects **A/B testing** and suggests `sdd.enterprise(action="experiment")`
- "Add a feature flag" → Detects **feature flag** and suggests `sdd.enterprise(action="flag")`
- "Add multi-tenancy to the system" → Detects **multi-tenancy** and suggests `sdd.enterprise(action="tenant")`
- "Onboarding for a new dev" → Detects **onboarding** and suggests `sdd.enterprise(action="onboarding")`
- "Run a security audit" → Detects **security** and suggests `sdd.enterprise(action="security_audit")`
- "Analyze scalability" → Detects **scalability** and suggests `sdd.enterprise(action="scalability")`
- "Check GDPR compliance" → Detects **compliance** and suggests `sdd.enterprise(action="compliance")`
- "Set up monitoring" → Detects **monitoring** and suggests `sdd.enterprise(action="monitoring")`
- "Report an incident" → Detects **incident** and suggests `sdd.enterprise(action="incident")`
- "Create a 99.9% SLA" → Detects **SLA** and suggests `sdd.enterprise(action="sla")`
- "Estimate costs" → Detects **cost** and suggests `sdd.enterprise(action="cost")`
- "Generate documentation" → Detects **documentation** and suggests `sdd.enterprise(action="docs")`
- "Knowledge transfer" → Detects **knowledge** and suggests `sdd.enterprise(action="knowledge_transfer")`
- "Disaster recovery plan" → Detects **disaster** and suggests `sdd.enterprise(action="disaster_recovery")`

### Available tools

| Tool | Description | Approval level |
|---|---|---|
| `sdd.bug_fix` | Full bug fix workflow | AUTO |
| `sdd.hotfix` | Retrospective hotfix documentation | POST_HOC |
| `sdd.refactoring` | Refactoring with dependency verification | REVIEW |
| `sdd.deprecate` | Deprecation with migration plan | APPROVAL |
| `sdd.enterprise` | migration, experiment, flag, tenant, security_audit, scalability, compliance, monitoring, dashboard, incident, sla, cost, docs, onboarding, knowledge_transfer, disaster_recovery, config_drift, workflow_export | per action |

### Usage examples

```bash
# Bug fix (automatic approval)
sdd.bug_fix(description: "Login returns 500", files: ["src/auth.ts"], severity: "high")

# Hotfix (emergency)
# 1. Enforcement is disabled automatically
# 2. Apply the fix
# 3. Document retroactively:
sdd.hotfix(description: "System is down", files: ["src/server.ts"], urgency: "critical")

# Refactoring
sdd.refactoring(target: "auth", description: "Extract validation", type: "extract", files: ["src/auth.ts"])

# Deprecation
sdd.deprecate(target: "/api/v1/users", removal_date: "2025-12-31", endpoints: ["/api/v1/users"])

# Migration
sdd.enterprise(action: "migration", source: "users_v1", target: "users_v2", description: "Add email field")

# A/B Testing
sdd.enterprise(action: "experiment",
  hypothesis: "New button increases conversion",
  variants: [
    { name: "control", description: "Blue button", traffic_percentage: 50 },
    { name: "variant", description: "Green button", traffic_percentage: 50 }
  ],
  metric: "conversion_rate",
  duration: 14
)

# Feature Flag
sdd.enterprise(action: "flag", name: "new_dashboard", description: "New dashboard", rollout: 10)

# Multi-tenancy
sdd.enterprise(action: "tenant", name: "acme_corp", type: "shared_database", isolation: "row")

# Onboarding
sdd.enterprise(action: "onboarding", developer_name: "John")

# Security Audit
sdd.enterprise(action: "security_audit")

# Scalability Analysis
sdd.enterprise(action: "scalability")

# Compliance
sdd.enterprise(action: "compliance", standard: "GDPR")
sdd.enterprise(action: "compliance", standard: "LGPD")

# Monitoring
sdd.enterprise(action: "monitoring")

# Incident Management
sdd.enterprise(action: "incident", title: "System is down", severity: "SEV1", impact: "All users affected")

# SLA
sdd.enterprise(action: "sla", name: "Uptime", metric: "availability", target: 99.9, period: "monthly")

# Cost Estimation
sdd.enterprise(action: "cost")

# Documentation
sdd.enterprise(action: "docs", type: "api")

# Knowledge Transfer
sdd.enterprise(action: "knowledge_transfer")

# Disaster Recovery
sdd.enterprise(action: "disaster_recovery")

# Dashboard Generation
sdd.enterprise(action: "dashboard", type: "overview")
```

## Configuration and environment

SDD settings live in **`.sdd/config.json`** (missing keys fall back to defaults):

```json
{
  "acceptance": {
    "enabled": true,
    "require_before_change_approval": false,
    "require_before_change_completion": false,
    "allow_waived": true,
    "legacy_fallback": true
  },
  "dashboard": { "port": 7331 },
  "workflow": { "ttl_ms": 1800000 }
}
```

Environment variables:

| Variable | Effect |
|---|---|
| `SDD_DASHBOARD_PORT` | Dashboard port (default `7331`, falls back to a free port) |
| `SDD_WORKFLOW_TTL_MS` | Workflow window in ms (default 30 min) |
| `SDD_DEBUG` | `1`/`true` enables the plugin debug log |
| `GITHUB_TOKEN` / `GITLAB_TOKEN` | Remote permission detection for roles |

## Project structure

```
src/
├ index.ts                              # Plugin entry point (synchronous init — no HTTP await)
├ version.ts                            # PLUGIN_VERSION + GRAPH_SCHEMA_VERSION (generated by scripts/sync-version.cjs)
├ sdd/
│  ├── domain/types.ts                  # Node types + relationships + graphs
│  ├── graph/                           # Knowledge Graph CRUD and navigation
│  │   ├── index.ts                       # In-memory graph indices (byId, byType, byStatus, inverted)
│  │   ├── engine.ts                      # Engines / integrity
│  │   ├── traverse.ts                    # BFS, impact analysis, pathfinding
│  │   ├── integrity.ts / integrity-guard.ts / pruner.ts
│  ├── persistence/                     # Storage backends
│  │   ├── yaml.ts                        # YAML repositories + snapshots
│  │   ├── sqlite.ts                      # SQLite backend (1000+ nodes)
│  │   └── repository.ts                  # Repository abstraction
│  ├── discovery/                       # Briefing analysis + questions
│  │   ├── briefing.ts                     # Briefing analysis
│  │   ├── briefing-analyzer.ts            # Tech stack detection
│  │   ├── adaptive.ts                     # Adaptive discovery
│  │   ├── graph-builder.ts                # Graph construction
│  │   └── relationship-inferencer.ts      # Missing edge inference + inverse normalization
│  ├── changes/manager.ts               # Change management + approval gates
│  ├── validation/                      # Structural/semantic validation
│  │   ├── validator.ts                    # Main validator
│  │   ├── smart-validator.ts              # Smart per-subsystem validation
│  │   ├── executable.ts / coverage-index.ts
│  ├── drift/                           # Drift detection
│  │   ├── detector.ts                     # Spec ↔ code drift
│  │   ├── signals.ts                      # Advanced drift signals
│  │   └── exclusion.ts                    # Drift whitelist
│  ├── enforcement/interceptor.ts       # Enforces the SDD-first workflow
│  │   └── workflow-tracker.ts             # Per-session workflow tracking
│  ├── codegen/generator.ts             # Built-in templates + spec prompt for AI
│  ├── toggle/state.ts                  # SDD enforcement on/off
│  ├── cache/                           # Cache (memory + persistent + lock)
│  │   ├── manager.ts / atomic.ts / fingerprint.ts / snapshot-store.ts
│  ├── constitution/validator.ts        # Principle validation
│  ├── promises/                        # Promise tracking
│  │   ├── tracker.ts / classifier.ts
│  ├── quality/scorer.ts                # Quality score with trend
│  ├── session/handoff.ts               # Session handoff
│  ├── patterns/                        # Anti-pattern detection
│  │   ├── anti-patterns.ts / ast-clones.ts / contradictions.ts / config-drift.ts / learner.ts
│  ├── coverage/tracker.ts              # Test coverage
│  ├── workflow/exporter.ts             # Workflow export
│  ├── brownfield/                      # Existing project analysis
│  │   ├── scanner.ts                      # Brownfield scan
│  │   ├── reverse-engineer.ts             # documentation / reverse_engineering modes
│  │   └── findings.ts                     # Findings lifecycle (scan → resolve)
│  ├── cicd/generators.ts               # CI/CD generation (GitHub, GitLab, Jenkins, Docker)
│  ├── sync/git-sync.ts                 # Git sync + conflicts
│  ├── rollback/manager.ts              # 3-layer rollback (git → snapshot → backup)
│  ├── permissions/access.ts            # Access control + audit
│  ├── migrations/                      # SDD migrations
│  │   ├── fixes.ts / index.ts / migration-runner.ts / relationship-backfill.ts
│  ├── code-quality/                    # Code quality
│  │   ├── complexity.ts / metrics.ts / smells.ts / dependencies.ts
│  │   ├── symbol-parser.ts / usage-tracker.ts / import-analyzer.ts / conventions.ts / utils.ts
│  ├── security/paths.ts                # Project path assertion (rejects traversal, symlink escapes)
│  ├── workflows/                       # Enterprise workflows
│  │   ├── bug-fix.ts / hotfix.ts / refactoring.ts / deprecation.ts / data-migration.ts
│  │   ├── ab-testing.ts / feature-flags.ts / multi-tenancy.ts / onboarding.ts
│  ├── analysis/                        # Audits
│  │   ├── security.ts / scalability.ts / compliance.ts
│  ├── monitoring/                      # Monitoring
│  │   ├── setup.ts / telemetry.ts
│  ├── incidents/manager.ts             # Incident management
│  ├── sla/tracker.ts                   # SLA tracking
│  ├── cost/estimator.ts                # Cost estimation
│  ├── documentation/generator.ts       # Documentation generation
│  ├── knowledge/transfer.ts            # Knowledge transfer
│  ├── disaster/recovery.ts             # Disaster recovery plan
│  ├── tasks/board.ts                   # Kanban board domain over `task` nodes
│  ├── tasks/change-bridge.ts           # Task → SDD Change bridge (code authorisation)
│  ├── acceptance/                      # Central acceptance service
│  │   ├── service.ts                     #   list/summary/create/accept/…/final acceptance
│  │   ├── audit.ts                       #   audit sink → .sdd/audit-log.json
│  │   └── final.ts                       #   final delivery acceptance on a Change
│  ├── guidance/service.ts              # Guidance: impact, proposal, versioned apply
│  ├── impact/service.ts                # Bidirectional / semantic impact analysis
│  ├── execution/                       # Execution ledger (traceability)
│  │   ├── ledger.ts                      #   .sdd/executions/events.jsonl records
│  │   ├── lock.ts                        #   project-wide execution lock
│  │   └── types.ts                       #   context / record / status
│  ├── release/milestone.ts             # Release milestones + traceability report
│  ├── transactions/manager.ts          # Logical transactions
│  ├── project-dir.ts                   # Project directory resolution (rejects "/")
│  └── log.ts                           # Plugin debug log
├ opencode/
│  ├── tools.ts                         # Tools for the agent
│  ├── sdd-runtime.ts                   # Shared runtime policy (enforcement, ledger, telemetry)
│  ├── v2/                              # OpenCode SDK v2 adapters (tools + host registration)
│  ├── command.ts                       # "sdd" command hub (deterministic router)
│  ├── system-prompt.ts                 # SDD instructions + question tool integration
│  ├── tool-handlers.ts                 # Business logic shared by the composite tools
│  ├── runtime/dispatcher.ts             # Single dispatch path (execution lock + ledger ids)
│  ├── shell-hooks.ts                   # Git hooks for SDD
│  ├── router/                          # Semantic tool routing
│  │   ├── index.ts / categories.ts / intent-classifier.ts / state-gate.ts
│  │   ├── tool-registry.ts / tool-taxonomy.ts / tools-composite.ts
│  │   ├── graph-state-snapshot.ts / embeddings.ts
│  └── workflows/                       # Opencode workflow executor
│      ├── index.ts / chains.ts / executor.ts / tools-workflow.ts / types.ts
├ mcp/
│  └── server.ts                        # MCP server
├ code-intelligence/
│  ├── analyzer.ts                      # Code analysis
│  └── ast/                             # AST (tree-sitter + fallback)
│      ├── index.ts / cache.ts / common.ts / component.ts / fallback.ts / ir.ts / metrics.ts
│      └── registry.ts / tree-sitter.ts / typescript.ts
└ server/
   ├── server.ts                        # Web dashboard (API + UI)
   ├── acceptance-api.ts                # Acceptance/migration/final-acceptance HTTP handlers
   ├── tasks-api.ts                     # Kanban task API (create/update/move/delete/change)
   ├── dashboard-context.ts             # Dashboard ↔ agent bridge (integration + code prompts)
   ├── ui/
   │   └── kanban-view.ts               # Kanban style, modal and script
   └── events.ts                        # Dashboard events
```

## `.sdd/` structure

When initialized, the plugin creates:

```
.sdd/
├ graph.yaml              # Knowledge Graph (YAML backend)
├ graph.db                # Knowledge Graph (SQLite backend, + -wal/-shm)
├ storage-backend         # Active backend: "yaml" | "sqlite"
├ enabled                 # Toggle state (JSON: {enabled, changed_at})
├ config.json             # SDD config (acceptance gates, dashboard, workflow TTL)
├ executions/events.jsonl # Execution ledger (run/step ids, status, durations)
├ verification/           # Verification reports bound to each Change
├ audit-log.json          # Permission + acceptance audit entries
├ permissions.json        # Local roles and permission config
├ drift-whitelist.json    # Drift whitelist
├ migration-history.json  # Applied SDD migrations
├ telemetry.jsonl         # Local telemetry events
├ sessions/latest.json    # Session handoff package
├ snapshots/              # State snapshots
├ backups/                # Backup layer (3rd rollback layer)
├ changes/                # Change history
├ transactions/           # Logical transactions
└ rollback-history.json / sync-state.json / cache files / quality-history.json
```

## Development

```bash
# Install dependencies
bun install

# Verify types
bun run typecheck

# Compile (generates dist/)
bun run build

# Lint (noUnusedLocals/noUnusedParameters)
bun run lint

# Run tests
bun test
```

## License

MIT
