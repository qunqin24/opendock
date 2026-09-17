# DataLens Platform Harness — OpenCode

This harness simplifies how analysts, engineers, and administrators interact with the
DataLens Platform (DLP) through the OpenCode CLI agent. It ships:

- **main_orchestration** — the mandatory first skill for any DataLens task (token → memory → side-cars → routing).
- **get_iam_token** — a native tool that returns a Yandex Cloud IAM token via the `yc` CLI.
- **get_harness_session_id** — a native tool that resolves the session id and the side-cars base path (OpenCode does not expose the session id to the model otherwise).
- **sparkconnect** — a skill that builds a PySpark `SparkSession` over Spark Connect.
- **dlp-api** — a single MCP server for the whole DLP RPC API (prod/preprod, `environment` arg): SQL queries (`run_sql_query`), REST/lakehouse catalogs (`list_catalogs`), the OpenAPI spec (`get_api_spec`), Spark clusters (`list_spark_clusters`, `create_spark_cluster`, `get_lakehouse_operation`) and Spark Connect job lifecycle (`create_spark_connection`, `list_spark_jobs`, `cancel_spark_connection` — the former `spark-connect` server, merged in 0.2.0). The IAM token comes from the `iam_token` arg / `DLP_IAM_TOKEN` env or is minted by the server via `yc` (preprod: `--profile sandbox-preprod`); org id from `org_id` / `DLP_ORG_ID`.
- **engineer / scheduler** — hidden subagents for data-processing code and Airflow scheduling.

## What's inside

```
opencode-datalens-harness/
│
├── skills/                       # force-copied to ~/.config/opencode/skills on every load
│   ├── main_orchestration/       # entry point of ANY DLP task: token → memory → side-cars → subagent routing
│   ├── sparkconnect/             # PySpark SparkSession over DLP Spark Connect (createSparkJob → sc://…)
│   ├── dlp-sql-query/            # saved SQL queries in workbooks (createSqlQuery/runSqlQuery) + Trino connection recipe
│   ├── dlp-preprod/              # preprod override: sandbox-preprod yc profile + api.preprod.datalens.tech
│   ├── dlp-delete/               # guard for destructive ops: confirmation gate before any delete RPC
│   └── iam-whoami/               # whom an IAM token belongs to (ycp/yc iam whoami → DLP user id)
│
├── mcp/                          # wired into the global opencode.json `mcp` block
│   └── dlp-api/                  # ONE server for the whole DLP RPC API (prod/preprod), 9 tools:
│       └── server.mjs            #   run_sql_query · list_catalogs · get_api_spec ·
│                                 #   list_spark_clusters · create_spark_cluster · get_lakehouse_operation ·
│                                 #   create_spark_connection · list_spark_jobs · cancel_spark_connection
│                                 # (the former spark-connect server, merged in 0.2.0)
│
├── agents/                       # copied to ~/.config/opencode/agents; hidden, launched only via the task tool
│   ├── engineer.md               # data-processing code (SQL/Python/Scala); communicates via side-cars only
│   └── scheduler.md              # Airflow scheduling of ready scripts; IAM token minted on the worker, never in the DAG
│
├── tools/                        # native plugin tools (not MCP)
│   ├── get_iam_token.ts          # IAM token via the yc CLI
│   └── get_harness_session_id.ts # sessionID + sidecarsBase for the inter-agent channel
│
└── src/index.ts                  # bootstrap: copies skills/agents/tools → ~/.config/opencode, idempotent
                                  # merge into opencode.json (mcp.dlp-api, permission.skill, instructions)
```

**Prerequisites:** the [`yc` CLI](https://yandex.cloud/en/docs/cli/quickstart) installed and
authenticated — `yc iam create-token` must work — and [`node`](https://nodejs.org) on PATH for the
Spark Connect MCP server.

## Install

The harness is published to npm as **`opencode-datalens-harness`**. Add it to your `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-datalens-harness"]
}
```

That single line is enough. Everything else the plugin configures itself — **no runtime hooks, no
manual `mcp`/`permission` blocks.**

## How it loads (zero hooks, all file-based)

On startup the plugin:

1. copies `skills/`, `agents/`, and `tools/` into `~/.config/opencode/{skills,agents,tools}`
   (there is no plugin API to register skills/agents otherwise);
2. copies its `AGENTS.md` (the `main_orchestration`-first mandate) to
   `~/.config/opencode/datalens-harness/AGENTS.md`;
3. **writes the global `opencode.json`** (idempotent, comment-safe, via direct fs +
   `jsonc-parser` — the same lib OpenCode uses) to merge in:
     - `mcp.dlp-api` → `command: ["node", <package>/mcp/dlp-api/server.mjs]`,
     - removal of the stale `mcp.spark-connect` entry written by versions < 0.2.0
       (only when it points at the harness-shipped server),
    - `permission.skill.main_orchestration: "allow"` (skips the skill-load confirmation prompt),
   - `instructions += <config-dir>/datalens-harness/AGENTS.md`;
4. registers the native tools (`get_iam_token`, `get_harness_session_id`) — available immediately.

Why a file write instead of an in-memory hook: `instructions`/`permission`/`mcp` must survive a
restart reliably. An in-memory `config`-hook mutation of `cfg.mcp` races with OpenCode's MCP layer
(which reads `cfg.mcp` once at its own startup), so the plugin writes the real file instead. The SDK
can't write the global config (and `PATCH /config` disposes the running instance), hence the direct
fs write. The write is idempotent: it only ever **adds** missing keys — your existing entries win
(the single exception: removing the plugin's own stale `mcp.spark-connect` entry from < 0.2.0).

**Restart OpenCode once after the first install.** The running session has already loaded its
config before the plugin writes, so the merged keys take effect from the next restart onward.

## Overriding / disabling

The plugin never clobbers your config — it only fills in absent keys:

- **MCP**: to use your own `dlp-api` (custom path, env, or to disable it),
  add any entry of that name to your `mcp` block — its mere presence makes the plugin skip its
  default. To turn the server off: `"mcp": { "dlp-api": { "enabled": false } }`.
- **Permission**: an explicit `permission.skill.main_orchestration` rule (any value) makes the
  plugin leave it alone.
- **Instructions**: the plugin refreshes its own `datalens-harness/AGENTS.md` entry each load
  (cleans stale paths from older versions); remove the plugin to drop the mandate entirely.

The `cluster_id` is **not** required to start the server — it is a per-tool argument the agent
passes at call time. (`YC_SPARK_CLUSTER_ID` in the server's `environment` is just an optional
default so the agent doesn't have to pass it on every call.)

## Why "mandatory" is probabilistic

OpenCode cannot hard-force a skill — the model always decides whether to call the `skill` tool.
The harness stacks two file-based reinforcements: the `AGENTS.md` mandate (read every turn via
`config.instructions`) and a keyword-rich skill `description`. In practice this makes
non-compliance unlikely, but it is not a 100% guarantee.

## Runtime state

`memory/` and `side-cars/` are created at runtime in the working project directory by the
main_orchestration skill — not committed (see `.gitignore`).
