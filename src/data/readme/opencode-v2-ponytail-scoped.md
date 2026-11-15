# opencode-v2-ponytail-scoped

> **Ponytail, delivered by address: every agent gets "write the minimum" at its own level — or nothing at all unless you name it.**

The full [ponytail](https://github.com/DietrichGebert/ponytail) ruleset, skills and commands on the OpenCode V2 plugin API. Zero runtime dependencies; vendored upstream content is copied verbatim (MIT), pinned in `vendor/upstream/UPSTREAM_VERSION`.

📖 Русская версия: [README.ru.md](README.ru.md) — что сделано, зачем и как применять.

## The problem

Ponytail teaches your coding agent to ship the lazy, minimal solution. But a real OpenCode setup is multi-agent: a coder, a planner, reviewers, one-off helpers — all running in parallel sessions.

- The upstream ponytail plugin targets the **V1 plugin API**; OpenCode 2.x refuses to load it.
- The community port [`@filecrop/opencode-ponytail-v2`](https://www.npmjs.com/package/@filecrop/opencode-ponytail-v2) fixes the API, but keeps upstream's model: **one global level flag for every session**. Turn ponytail on "for the coder" and you have also turned it on for the planner, the reviewer and every subagent — until someone flips it off.

The ruleset says "deletion over addition, no abstractions that were not requested". That is exactly wrong for agents whose job is to explore, question or audit. Scope leaks are silent: the model never tells you it stopped being lazy on purpose.

## What this package does

One feature, deliberately: **the level lives on the agent, not on the session-global flag.**

```jsonc
// ~/.config/opencode/ponytail-scoped.json
{ "default": "off", "agents": { "coder": "full", "build": "lite", "team/*": "ultra" } }
```

The plugin registers a V2 `session.hook("context")` handler. On every prompt build it reads `event.agent`, resolves the level, and — only if the agent is named — appends the byte-identical upstream ruleset to the end of the last system block. Everyone else gets a clean system prompt.

Resolution order (first hit wins):

1. runtime override for this agent — written by `/ponytail` in a session (`agent:<name>`);
2. exact agent name in the config table;
3. prefix mask (`team/*` matches `team/reviewer`);
4. `"*"` in the table;
5. `"default"` (falls back to `"off"`).

A missing or malformed config file resolves to `off` — a broken file can never crash a session or leak rules into it.

## How it differs

| | upstream ponytail | `@filecrop/opencode-ponytail-v2` | this package |
|---|---|---|---|
| OpenCode API | V1 (won't load on 2.x) | V2 | V2 |
| Who gets the ruleset | every session | every session | only agents you name |
| Level storage | one global flag | one global flag | per agent (+ per-agent runtime overrides) |
| Rule texts / skills / commands | source of truth | vendored verbatim | vendored verbatim, same files, parity-checked |
| Runtime deps | — | — | none |

The injected text is **byte-identical with upstream** — `node probe/probe.mjs parity` compares it against the adapter's builder output. This package adds no philosophy of its own; it adds addressing.

## Install

Published on npm (coming soon — the repo is the source of truth for now):

```jsonc
// ~/.config/opencode/opencode.jsonc
"plugins": [
  "-@filecrop/opencode-ponytail-v2",   // disable the always-on adapter if you had it
  "opencode-v2-ponytail-scoped"        // keep it last among plugins that write to system
]
```

From a checkout — any absolute path works:

```jsonc
"plugins": ["/home/you/projects/opencode-v2-ponytail-scoped"]
```

Ordering matters: whoever registers later appends to the system prompt later. Put this plugin **after** any other plugin that writes to `event.system`, so ponytail stays the last instruction.

Then create `~/.config/opencode/ponytail-scoped.json` (see example above) and restart OpenCode (`opencode service restart`, or just edit the config — the file watcher reloads plugins).

## Commands

All six upstream commands are registered: `/ponytail`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`.

`/ponytail` semantics are the one adapted thing, and they follow from the scope model:

- `/ponytail [level]` — sets the level **for the agent of the current session**, writing to `~/.config/opencode/ponytail-scoped-state.json`. Not for all sessions everywhere.
- `/ponytail off coder` — turn a specific agent off (writes `agent:coder`).
- If the session's agent cannot be determined, the override goes to `"*"` — an explicit request is never silently dropped.

Levels: `lite`, `full`, `ultra`, `off` (`review` exists internally for the `/ponytail-review` flow).

## Vendored upstream and updates

`vendor/upstream/` holds skills, commands, the instruction builder and the config module from the pinned ponytail release, unmodified. To update: copy the new release's files over `vendor/upstream/`, bump `UPSTREAM_VERSION`, run `node probe/probe.mjs parity`. Nothing else in this package reads or rewrites rule texts.

## Development

```sh
node --test              # unit tests: level resolution, config safety, hook contract, parsers
node probe/probe.mjs all # parity with the adapter, resolve table, skill/command lists
```

Live debugging: set `PONYTAIL_SCOPED_DEBUG=/path/dump.jsonl`, or touch the marker file `~/.config/opencode/ponytail-scoped-debug` (the service usually starts without your shell env) — the plugin then dumps event shapes and injection decisions to `/tmp/opencode/ponytail-scoped-debug.jsonl`.

Verified against OpenCode 2.x: `hook("context")` receives `{ sessionID, model, system, messages, options, agent, tools }`. Plugin options passed inline in the `plugins` config entry do **not** arrive in `ctx` (checked live) — that is why the settings file is the primary configuration path.

## Authors

Made in co-authorship: [idMolotov](https://github.com/idMolotov) and **Qwen3.8 Flash** (OpenCode AI agent) — the design decisions, code and docs were produced together; the human owns the project.

## License

MIT — see [LICENSE](LICENSE). Vendored upstream content: MIT, © 2026 DietrichGebert ([ponytail](https://github.com/DietrichGebert/ponytail)).
