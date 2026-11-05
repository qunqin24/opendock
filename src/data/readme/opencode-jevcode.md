# opencode-jevcode

An [OpenCode](https://opencode.ai) v2 plugin that adds a **`jevCode`** primary agent. For every prompt you send to
`jevCode`, **Jev** (TypeSafe's System One decision model) decides:

- which **coding model** runs the turn,
- which **skills** are attached,
- which **tool groups** are sent in the request,
- which parts of the **conversation history** are still relevant.

Jev only decides. It does not write code or call tools. OpenCode's own coding LLM does the work, on the model Jev
picked, with the skills, tools and messages Jev selected. All other agents (`build`, `plan`, your custom agents)
are **not changed**.

If Jev is slow, down or not configured, `jevCode` behaves like a plain agent (see [Fail-open](#fail-open-guarantees)).

Tested against OpenCode **2.2.5** (`@opencode/plugin` >= 2.2.0).

## Contents

- [Install](#install)
- [What the jevCode agent is](#what-the-jevcode-agent-is)
- [`/jev` debug command](#jev-debug-command)
- [Jev providers and keys](#jev-providers-and-keys)
- [Options](#options)
- [Recommended: a `models` allowlist](#recommended-a-models-allowlist)
- [Tool groups](#tool-groups)
- [How routing works](#how-routing-works)
- [Context pruning](#context-pruning)
- [Fail-open guarantees](#fail-open-guarantees)
- [Limits](#limits)
- [Privacy: what is sent to Jev](#privacy-what-is-sent-to-jev)
- [Troubleshooting](#troubleshooting)
- [Development and tests](#development-and-tests)
- [License](#license)

## Install

### From npm

```sh
opencode plugin add opencode-jevcode
```

`opencode plugin add` installs the package and adds it to your **global** OpenCode configuration. To enable it for
one project only, or to give it options, add it by hand to the project's `opencode.jsonc` (or to your global config).
A plugin entry that has options **must be an object** with `package` and `options`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-jevcode",
      "options": {
        "models": ["anthropic/claude-haiku-4-5", "anthropic/claude-sonnet-4-5", "openai/gpt-5"]
      }
    }
  ]
}
```

A plain string (`"plugins": ["opencode-jevcode"]`) also works when you want all defaults.

### As a local plugin

A local plugin must live in a **folder with an `index.ts`**:

```
<project>/.opencode/plugins/jevcode/index.ts
```

```ts
// .opencode/plugins/jevcode/index.ts
export { default } from "opencode-jevcode";
```

(the package must be resolvable from the project, e.g. installed with `npm install opencode-jevcode`; or copy the
package `src/` there). A bare `.ts` file listed in the `plugins` array is **not** loaded. The
`.opencode/plugins/<name>/index.ts` layout is.

Then start OpenCode, press `Tab` to switch to `jevCode`, and send a prompt.

### Verify

```sh
opencode --standalone api get /api/agent
```

The list must contain an agent with id `jevCode` and `mode: primary`.

## What the jevCode agent is

- The agent is **registered by the plugin itself**. You do not need an agent file.
- `mode: primary`, with a short system prompt that tells the model to follow the per-request routing and not to
  assume that tools or skills missing from the request exist.
- Its permissions are a **copy of `build`'s permissions**, taken when the agent is registered. The plugin never
  widens permissions and never edits permission rules. Removing a tool from a request is not a permission change.
- Nothing in the plugin runs for a prompt, model request or compaction whose active agent is not `jevCode`.
  `build`/`plan`/custom agents get byte-identical requests with and without the plugin.
- When you leave `jevCode` for another agent, the model that was active **before** Jev switched it is restored on
  the next prompt, unless you picked a different model by hand in between.
- `makeDefault: true` makes `jevCode` the default agent (off by default).

## `/jev` debug command

`/jev <yes/no question>` asks Jev one question and delivers the answer into the visible session transcript. It works in any agent.

- The answer is `true (0.873)` or `false (0.127)`. Jev returns a probability; `0.5` or more is `true`.
- With no `TYPESAFE_API_KEY` and no `OPENROUTER_API_KEY` (not in the process, `service.json`, or `~/.config/opencode/.env`) the answer is exactly `Provide TYPESAFE_API_KEY or OPENROUTER_API_KEY`. Jev is not called.
- `/jev` with no question posts `Usage: /jev <yes/no question>`.
- The result is delivered as synthetic session input so it appears in the TUI. OpenCode may run the normal session turn after delivery. The result is also logged as `[jevcode] /jev: true (0.873)` (info level; the question text is not logged).

## Jev providers and keys

`provider` selects the transport that talks to Jev:

| `provider` | What it does | Key |
| --- | --- | --- |
| `auto` (default) | Tries, in order: an OpenCode-native decision model (a model with `type: "decision"` in the OpenCode model list), then a TypeSafe key, then an OpenRouter key. If none exists, Jev is off and `jevCode` runs in fallback mode (one info line is logged). | see below |
| `opencode` | Only the OpenCode-native decision model. | none |
| `typesafe` | TypeSafe System One HTTP API: `POST https://api.typesafe.ai/v1/systemone`, Bearer key. Default Jev model `jev-latest`. | `TYPESAFE_API_KEY` |
| `openrouter` | OpenRouter decisions API: `POST https://openrouter.ai/api/alpha/decisions`, Bearer key. Default Jev model `typesafe/jev-1.13`. | `OPENROUTER_API_KEY` |
| `none` | Jev disabled. `jevCode` is a plain agent. | none |

Key lookup (when the `apiKey` option is not set):

- `provider: "typesafe"` uses `TYPESAFE_API_KEY`; `provider: "openrouter"` uses `OPENROUTER_API_KEY`.
- With `auto`, `TYPESAFE_API_KEY` wins when both variables are set. A key given as the `apiKey` option is treated as
  TypeSafe unless it starts with `sk-or-` or `endpoint` contains `openrouter`.

**Put keys in environment variables, not in config files you commit.** The plugin never logs keys (they are masked
in every log line).

The plugin runs inside the OpenCode **background service**, not inside the shell where you typed `opencode`. A
PowerShell `$env:` assignment or a bash `export` only reaches a process you start yourself (for example
`opencode --standalone`). It does **not** reach the shared service, so Jev still sees no key.

Set the variable on the service:

```sh
opencode service set env TYPESAFE_API_KEY <your-api-key>
```

Same form for OpenRouter: `opencode service set env OPENROUTER_API_KEY <your-api-key>`. Do not put the key in
`opencode.jsonc`.

OpenCode 2.2.5 writes that value to `~/.config/opencode/service.json` but does **not** put it on the server
process. The plugin therefore also reads `TYPESAFE_API_KEY` / `OPENROUTER_API_KEY` from that file, and then
from `~/.config/opencode/.env`, when they are missing from `process.env`. A variable already set on the process
wins, so `opencode --standalone` still uses the shell. The key is never logged.

## Options

All options are optional. Invalid values never throw: a wrong type falls back to the default and numbers are
clamped to their range.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `provider` | `"auto" \| "opencode" \| "typesafe" \| "openrouter" \| "none"` | `"auto"` | Jev transport (see above). |
| `apiKey` | string | env | Jev key. Prefer `TYPESAFE_API_KEY` / `OPENROUTER_API_KEY`. |
| `endpoint` | string | provider default | Override the HTTP endpoint of the `typesafe` / `openrouter` transport (self-hosted or mock). |
| `jevModel` | string | `jev-latest` (typesafe), `typesafe/jev-1.13` (openrouter) | Jev model name sent to the HTTP API. |
| `timeoutMs` | integer > 0 | `4000` | One deadline for a whole Jev call (including the one retry on a 5xx/network error). On timeout the turn runs on the fallback plan. |
| `models` | `Array<"provider/id[#variant]" \| { model: "provider/id[#variant]", variant?, profile? }>` | `[]` | Allowlist of coding models Jev may choose from. `profile` is one of `fast`, `balanced`, `reasoning`, `large-context`. Can include `#variant` for thinking effort levels (e.g. `#high`, `#medium`). Empty = automatic candidates (max 12). See [below](#recommended-a-models-allowlist). |
| `fallbackModel` | `"provider/id"` | none | **Accepted but not used** in v0.1 (Jev failure keeps the current model). Reserved; you can omit it. |
| `modelMinConfidence` | 0..1 | `0.5` | Below this confidence the model choice is ignored and the current model is kept. |
| `maxSkills` | integer 0..50 | `3` | Max skills added per prompt. `0` disables skill routing. |
| `skillThreshold` | 0..1 | `0.6` | A skill is added only when Jev's probability reaches this value. |
| `toolThreshold` | 0..1 | `0.4` | A tool group is kept when Jev's probability reaches this value; lower groups are removed from the request. |
| `alwaysKeepTools` | string[] | `[]` | Tool ids (`*` and `?` wildcards allowed) that are never removed from a request. |
| `toolGroups` | `Record<string, string[]>` | `{}` | Extra tool-id patterns per group; see [Tool groups](#tool-groups). |
| `keepRecentMessages` | integer 0..10000 | `6` | Last N messages are always kept when pruning. |
| `pruneMinTokens` | integer >= 0 | `12000` | No pruning (and no Jev context call) when the conversation is estimated below this many tokens. |
| `contextMinConfidence` | 0..1 | `0.5` | Below this confidence Jev's context selection is ignored and the messages are sent unchanged. |
| `keepFirstUser` | boolean | `true` | Always keep the first user message when pruning. |
| `makeDefault` | boolean | `false` | Make `jevCode` the default agent. |
| `agentFileFallback` | boolean | `false` | If the agent is missing after load, write `.opencode/agents/jevCode.md` (see [Troubleshooting](#troubleshooting)). |
| `agentModel` | `"provider/id"` | none | Fixed starting model for the `jevCode` agent definition. Jev can still switch the model per prompt. |
| `debug` | boolean | `false` | Verbose `[jevcode]` debug lines on stderr (decisions, pruning stats). Secrets stay masked. |

Full example:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-jevcode",
      "options": {
        "provider": "typesafe",              // key from TYPESAFE_API_KEY
        "timeoutMs": 4000,
        "models": [
          { "model": "opencode/gpt-5.4-nano", "profile": "fast" },
          { "model": "opencode/gemini-3.5-flash-lite", "profile": "balanced" },
          { "model": "opencode/gemini-3.8-flash#medium", "profile": "reasoning" },
          { "model": "opencode/claude-sonnet-5-5#high", "profile": "large-context" }
        ],
        "modelMinConfidence": 0.35,
        "maxSkills": 3,
        "skillThreshold": 0.6,
        "toolThreshold": 0.4,
        "alwaysKeepTools": ["read", "grep"],
        "toolGroups": { "Database": ["*postgres*"], "Tickets": ["jira_*"] },
        "keepRecentMessages": 6,
        "pruneMinTokens": 12000,
        "agentFileFallback": true,
        "debug": false
      }
    }
  ]
}
```

## Recommended: a `models` allowlist

Always set `models`.

- Without it, the plugin builds candidates from OpenCode's model list (enabled, active, tool-capable chat models)
  and offers Jev **at most 12** of them, spread over the profiles (`fast`, `balanced`, `reasoning`,
  `large-context`) with the newest first. A typical install has ~45 models, so the cap can hide the model you
  actually want.
- With it, Jev chooses only among **your** models (in your order, still max 12). Entries that are not valid in your
  OpenCode catalog (unknown, disabled, no tool support) are ignored.
- Jev can answer only with a model from this closed set (or "keep"). The plugin never switches to an arbitrary
  provider/model string.
- Add `profile` to tell Jev what a model is for. Without it the plugin derives a profile from price and context
  window (context >= 400k = `large-context`; output price <= $2/M = `fast`; >= $15/M = `reasoning`; else
  `balanced`).
- Models can be written as `"provider/id"` strings or as `{ "model": "provider/id", "profile": "fast" }`.
- **Thinking effort / variants:** You can specify variants with `#variant` or `"variant"` (e.g. `"opencode/claude-sonnet-5-5#high"` or `{ "model": "opencode/gemini-3.8-flash", "variant": "medium" }`). The plugin passes `{ providerID, id, variant }` to `switchModel` so models run with the requested reasoning/thinking effort level.

## Tool groups

Jev decides per **tool group**, not per tool. Code maps groups to tool ids with case-insensitive patterns that
match the whole tool id (`*` = any run of characters, `?` = one character).

Built-in groups:

| Group | Matches |
| --- | --- |
| Exploration | `read`, `grep`, `glob`, `list`, `ls` |
| Development | `edit`, `multiedit`, `write`, `patch`, `apply_patch` |
| Execution | `shell`, `bash`, `powershell`, `terminal` |
| Verification | `test`, `lsp`, `diagnostics` |
| Research | `websearch`, `webfetch`, `codesearch` |
| Delegation | `subagent`, `task` |
| Database | `*postgres*`, `*mysql*`, `*mariadb*`, `*sqlite*`, `*mongo*`, `*database*`, `*redis*` (MCP database tools) |
| Other | no built-in patterns |

`toolGroups` **adds** patterns to a built-in group or **creates** a new group (the name is free text and
becomes a question for Jev):

```jsonc
"toolGroups": {
  "Database": ["*clickhouse*"],     // extends the built-in group
  "Tickets": ["jira_*", "linear_*"] // new group
}
```

A tool that matches no group is **never removed**. Tools in `alwaysKeepTools`, and tools already used by kept
tool calls in the conversation, are never removed either. If filtering would remove every tool, nothing is removed.
The first matching group wins (built-in groups are checked first).

## How routing works

Two stages. Each user prompt gets one plan, and tool-driven continuations of the same turn reuse it (no extra Jev
call).

**Stage A, on the prompt (one batched Jev request):**

1. **Model.** One `choice` question over the candidate models plus `keep`. If the answer is a valid candidate with
   confidence >= `modelMinConfidence` and differs from the session model, the plugin switches the session model
   before the request is sent.
2. **Skills.** One yes/no question per shortlisted skill. Skills at or above `skillThreshold` (best first, at most
   `maxSkills`) are added to the prompt as `{ id }` entries. OpenCode resolves them. The plugin does not copy skill
   text anywhere, never adds unknown ids and never duplicates skills you selected yourself.
3. **Tool groups.** One yes/no question per tool group. Groups below `toolThreshold` are marked as excluded.

**Stage B, on the model request (context hook), only for `jevCode`:**

4. Tools of excluded groups are removed from the request (see [Tool groups](#tool-groups)).
5. Messages are pruned (see below) on the first model call of a turn.
6. A short routing note (max 600 characters) is appended to the system prompt: the selected skills, the available
   tool groups and the groups left out.

Persisted history and permissions are never modified: only the outgoing request changes.

## Context pruning

- Messages are grouped into **units**: a user message plus the assistant/tool messages that answer it. Every
  tool call and its tool result are one indivisible pair. Jev scores which units are still relevant to the new
  prompt; **code** applies the selection. Jev never writes summaries.
- **Always kept:** system messages; the latest user message and everything after it; the last
  `keepRecentMessages` messages; compaction summaries; the first user message (`keepFirstUser`).
- Pruning is **skipped** when the conversation is below `pruneMinTokens`, when Jev is unavailable, or when Jev's
  confidence is below `contextMinConfidence`.
- A post-check runs every time: if the result contains an orphan tool call or tool result, the whole prune is
  discarded and the original messages are sent.
- The selection is cached for the turn, so tool-driven continuations do not call Jev again.
- Only the outgoing request is changed. The stored conversation is untouched.

## Fail-open guarantees

The plugin must never make the coding agent unusable.

- Jev errors, timeouts (`timeoutMs`), invalid answers, partial answers, a missing key or `provider: "none"` never
  throw out of a hook. The turn runs on the **fallback plan**: keep the current model, add no skills, send all
  tools, send all messages. Where Jev answered only some questions, only the missing decisions fall back.
- A Jev call is retried once on a 5xx/network error, inside the single `timeoutMs` deadline.
- Every hook body is wrapped; an unexpected exception is logged and the request is left as it is.
- Every Jev answer is checked against a closed set built by code (model keys, skill ids, group names, unit ids).
  Unknown answers are discarded.
- If the in-plugin agent registration does not take effect, an error is logged (see canary below) and you can use
  the packaged agent file. Jev routing is independent of how the agent was created.
- Without any key and without a native decision model, the plugin logs one notice
  (`Jev is not available ... running in fallback mode`) and `jevCode` works like a normal agent.

## Limits

- **Model candidates: max 12.** Use a [`models` allowlist](#recommended-a-models-allowlist).
- **Skills: lexical prefilter above 30.** With up to 30 skills, Jev is asked about all of them. With more than 30,
  only skills whose id/name/description share a word stem with your prompt are asked about (best overlap first, max
  30). A relevant skill whose description shares no word with the prompt can be missed in large catalogs.
- **English-only routing.** The question texts, the prefilter's stop words and suffix trimming, and the prompt
  analysis assume English. Prompts in other languages work for the coding turn but Jev's routing quality and
  the skill prefilter will be worse.
- **Context pruning window.** The state sent to Jev is kept under about 9,000 characters (hard cap 12,000); at most
  60 units are scored per request (older units are merged).
- The routing note is limited to 600 characters.
- `fallbackModel` is accepted but unused in v0.1.
- Not in v0.1: Jev-assisted compaction and routing analytics (specified in the story, planned for later).

## Privacy: what is sent to Jev

With the HTTP providers (`typesafe`, `openrouter`) data leaves your machine. Sent per request:

- your prompt text (cut to about 3,000 characters),
- the list of candidate models with profile, context window and price,
- for skills: id, name, description (<= 300 characters) and a short capability line (<= 200 characters, taken from
  the start of the skill text) of each shortlisted skill, never the full skill file,
- for tool groups: group names and short descriptions (not tool inputs/outputs),
- for context pruning (only when the conversation is above `pruneMinTokens`) a compact conversation state, never the
  full transcript:
  - the first user message (<= 400 characters) and the latest one (<= 600 characters),
  - up to 12 file paths the conversation touched (tool-call inputs, paths mentioned by you),
  - up to 10 short lines (<= 100 characters) for successful file edits and shell commands (`ran: <command>`),
  - up to 5 short lines (<= 130 characters) for tool calls that failed: the tool name and the first ~100 characters
    of the error output,
  - per history unit: an id, a size estimate and a one-line summary (<= 160 characters: user text start, tool
    names, touched file paths).

  The whole state is capped at about 9,000 characters (hard limit 12,000).

Never sent: file contents, the output of successful tool calls, the full conversation, your model-provider API keys,
environment variables. Shell commands, file paths and the start of error output **are** sent as described above, so
keep secrets out of commands and prompts if you use an HTTP provider.

If that is not acceptable, use `provider: "opencode"` (a native decision model, handled inside OpenCode) or
`provider: "none"`. With `provider: "none"` or no key, nothing is sent anywhere.

Secrets: the plugin never writes keys to logs (key patterns and the configured key are masked), and the package
contains no secrets.

## Troubleshooting

**`jevCode` is not in the agent list.**
The plugin registers the agent with `AgentEditor.update("jevCode", ...)`. This upsert behaviour is not documented
by OpenCode, so the plugin runs a **canary** after loading. If the agent is missing you will see on stderr:

```
[jevcode] error: canary: the jevCode agent is NOT in the agent list, so the in-plugin registration did not take effect ...
```

Fix: set `"agentFileFallback": true` (the plugin writes `.opencode/agents/jevCode.md` if it does not exist yet, and
logs a warning; restart OpenCode), or copy `node_modules/opencode-jevcode/agents/jevCode.md` to
`.opencode/agents/jevCode.md` yourself. An existing file is never overwritten.

**The plugin does not load.**
- Plugin entries with options must be `{ "package": "...", "options": { ... } }` objects in the `plugins` array.
- A local plugin must be `.opencode/plugins/<name>/index.ts`. A bare `.ts` path in `plugins` is ignored.
- `package.json` and the config files must be UTF-8 **without BOM**. A BOM makes the JSON parse fail
  (PowerShell 5 `Set-Content -Encoding UTF8` and `Out-File` add one; use `[IO.File]::WriteAllText(path, text,
  (New-Object Text.UTF8Encoding $false))` or an editor setting).
- `@opencode/plugin` is a peer dependency; OpenCode supplies it at runtime.

**The first start after installing from npm is slow, or `opencode api get` answers `503 Location plugins did not finish activating`.**
When the plugin is configured by package name, OpenCode downloads it into its own cache on first use. A short-lived
client such as `opencode api get` can give up before that finishes. Start OpenCode (or `opencode serve`) once and let
it run for a few seconds, then retry; later starts use the cache.

**No `[jevcode]` messages are visible.**
Plugin logs go to the **stderr of the OpenCode process**. `opencode api get ...` is a separate client and does
not show them. Look at the terminal where OpenCode (or `opencode serve` / `opencode run`) runs. Set `"debug": true` to see decisions and pruning statistics.

**Nothing changes (model stays the same).**
- Is the active agent `jevCode`? Other agents are intentionally untouched.
- Is Jev reachable? Look for `Jev is not available` / `timed out after ...ms` / `request failed` lines. Check the
  key variable, `provider`, `endpoint` and raise `timeoutMs` if your network is slow.
- Is the chosen model in your `models` allowlist and enabled in OpenCode? Jev's confidence must reach
  `modelMinConfidence`.
- A model you picked manually after Jev's switch is respected and is not overwritten on non-jevCode agents.

**Tools or skills seem missing.**
Lower `toolThreshold`, add the tool to `alwaysKeepTools`, add a pattern with `toolGroups` (a tool in no group is
never removed), or set `maxSkills`/`skillThreshold` as needed. Set `debug: true` to see which groups were removed.

## Development and tests

Requires [Bun](https://bun.sh) and (for integration tests) the `opencode` 2.2.5 binary on `PATH`.

```sh
bun install
bun run typecheck          # tsc --noEmit
bun test                   # unit + property tests (fast, no network, no credentials)
```

Integration and end-to-end tests (`tests/integration`, `tests/e2e`) drive the **real `opencode` binary** against a mock OpenAI-compatible provider and a mock Jev
HTTP server, so they need no API keys. They are skipped unless `OPENCODE_INTEGRATION=1`:

```sh
# PowerShell
$env:OPENCODE_INTEGRATION = "1"; bun test
# bash
OPENCODE_INTEGRATION=1 bun test
```

They run in a temporary project with an **isolated `HOME`/`XDG_*` directories**, so your own global OpenCode
config, skills and plugins do not leak into the run. If you write your own integration test, do the same.

Check what will be published:

```sh
npm pack --dry-run
```

The tarball must contain only `src/`, `agents/`, `README.md`, `LICENSE` and `package.json`: no tests, specs or
secrets. Publishing (`npm publish`) needs the owner's npm credentials.

## License

MIT
