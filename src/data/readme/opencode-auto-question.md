# opencode-auto-question

An [opencode](https://opencode.ai) plugin that auto-answers the `question` tool when running with an autonomous agent — an AI decision engine answers on behalf of the human, with tool-assisted context gathering.

## How it works

```
question.asked event
        │
        ▼
Session agent in config "agents" list? ── NO ──▶ human answers (TUI form)
        │ YES
        ▼
Human gate? (HUMAN_GATE: marker, ── YES ──▶ human answers (TUI form)
 or human-gated agent)                  never overridden by guidance
        │ NO                            or confidence
        ▼
╔══ PASS 0: project guidance decision ═════════╗
║ Only when guidance docs exist:               ║
║ temp child session with a tool-using decision║
║ subagent (git, dewey, file reads, ...)       ║
║ investigates per .opencode/.../guidance/*.md ║
║ → can answer "Type your own answer" text     ║
╚══════════════════════════════════════════════╝
        │
  guidance agent ran? ── NO ──▶ pass 1
        │ YES
        ▼
  confidence ≥ confidenceThreshold (0.6)? ── YES ──▶ reply
        │ NO
        ▼
  guidance covered the question? ── YES ──▶ human answers (no generic
        │ NO                                    engine override)
        ▼
╔══ PASS 1: fast decision ══════════════════════╗
║ Jev Choice/Noul (OpenCode Zen or OpenRouter)  ║
║ or LLM JSON contract (chat completions)       ║
║ state = immediate context + question + options ║
╚═══════════════════════════════════════════════╝
        │
  confidence ≥ confidenceThreshold (0.6)? ── YES ──▶ reply
        │ NO
        ▼
╔══ PASS 2: context-enriched decision ══════════╗
║ temp child session with a context-gathering   ║
║ subagent (has dewey, session-search, ...)     ║
║ → re-decide with gathered context as state    ║
╚═══════════════════════════════════════════════╝
        │  (no context gathered, or pass 2 failed: the pass-1
        │   decision already failed confidenceThreshold → human)
  confidence ≥ fallbackThreshold (0.35)? ── YES ──▶ reply
        │ NO
        ▼
   human answers (TUI form)
```

Every failure mode (API errors, timeouts, unparsable responses, config problems) degrades to the human answering via the normal TUI form.

## Install

Requires opencode 1.x (tested with 1.19). opencode v2 is not supported yet: the plugin loads there but stays inactive and says so in the log. opencode 1.19 also runs a v2 plugin runtime that loads the same package; there the 1.x entry does the work and the v2 entry stays quiet.

### From npm

```bash
opencode plugin -g opencode-auto-question
export OPENROUTER_API_KEY=...   # or OPENCODE_API_KEY for Jev via OpenCode Zen
```

Restart opencode. That's all: the plugin registers its agents itself, and without a config file it runs on the defaults.

For a fleet, pin an exact version in the shared `~/.config/opencode/opencode.jsonc` so every machine runs the same code, and bump it deliberately:

```jsonc
"plugin": ["opencode-auto-question@0.1.2"]
```

### From source

```bash
git clone https://github.com/jflowers/opencode-auto-question.git
cd opencode-auto-question
bun install          # also builds dist/, which opencode loads
```

Add the absolute path of the checkout to the `"plugin"` array in `~/.config/opencode/opencode.jsonc` and restart opencode. After every `git pull`, run `bun install` (or `bun run build`) again; opencode loads `dist/`, not `src/`.

### Agents

The plugin registers three agents through opencode's config hook: `autonomy` (primary) and the hidden helpers `auto-question-ctx` and `auto-question-decide`, from [`agents/`](agents/). If you configure an agent of the same name yourself, in `opencode.json` (global or project) or an `agents/*.md` file, your settings win and the bundled definition fills in only what you leave out. A project that only narrows `autonomy`'s permissions, for example `external_directory`, keeps the bundled prompt, mode and `question: allow`. To change a bundled setting, set that key; to replace an agent wholesale, define every key you care about or set `"registerAgents": false` to register none.

Earlier versions asked you to symlink these files into `~/.config/opencode/agents/`. Existing symlinks keep working (their settings win); you can delete them to follow the bundled versions instead. Before 0.1.2, deleting them broke `autonomy` in any project whose config set a partial `autonomy` entry (it lost its prompt and could not ask questions), so upgrade before removing them.

### Config (optional)

```bash
cp config/auto-question.jsonc ~/.config/opencode/auto-question.jsonc   # edit to taste
```

The file has a JSON schema (`$schema` at the top) for completion in editors. Two environment variables add or replace config files; see [Config files](#config-files).

Switch a session to the `autonomy` agent, then trigger any question — the decision engine answers it.

> **Important — custom agents need permission overrides**: opencode's base permission ruleset denies `question` and `plan_enter` for every agent, and sets `external_directory` to `ask`. The built-in `build` agent overrides `question` and `plan_enter` back to allow but leaves `external_directory` as `ask` (humans click "Allow always"). Custom agents don't get any overrides automatically.
>
> Without these permissions:
> - `question: allow` — the model never sees the question tool
> - `plan_enter: allow` — the agent cannot enter plan mode
> - `external_directory: allow` — every cross-repo file access blocks the session waiting for human approval
>
> `agents/autonomy.md` includes the required frontmatter:
>
> ```yaml
> permission:
>   question: allow
>   plan_enter: allow
>   external_directory: allow
>   second_opinion: deny
> ```
>
> If you use a different autonomous agent, add the same overrides to its frontmatter.

### Scoping `external_directory` per project

`external_directory: allow` in the agent definition grants access to **all files on the filesystem**. For tighter control, override the permission per project in `.opencode/opencode.json` (or `opencode.json` at the project root) instead of in the agent definition:

```json
{
  "agent": {
    "autonomy": {
      "permission": {
        "external_directory": {
          "~/Projects/github/my-org/**": "allow",
          "*": "ask"
        }
      }
    }
  }
}
```

This auto-allows access to sibling repos under the same org while prompting for anything else. Project-level config overrides the global agent definition.

**Pattern rules:**
- `~/` and `$HOME` expand to the home directory — these are the only supported variables
- Patterns must be absolute paths or use `~/`; relative paths (`../**`, `./**`) do not work
- Glob syntax: `*` matches a single segment, `**` matches any depth
- Last matching rule wins (put broad rules first, narrow rules last)

**Other permissions that may block unattended sessions:**

| Permission | Base default | Notes |
|---|---|---|
| `doom_loop` | `ask` | Prompts when the agent appears stuck in a retry loop |
| `read` (`.env` files) | `ask` for `*.env`, `*.env.*` | Prompts when reading environment files |

Add these to the agent or project config if they interrupt your autonomous workflows:

```yaml
# in agent frontmatter
permission:
  question: allow
  plan_enter: allow
  external_directory: allow
  doom_loop: allow
```

## Project guidance (pass 0)

Drop markdown files into `.opencode/auto-question/guidance/` in a project (and/or `~/.config/opencode/auto-question/guidance/` globally — global docs load first, project docs after) to steer how questions from autonomous agents are answered. When guidance exists, a tool-using decision agent runs **before** the Jev/LLM engines: it investigates the workspace with real tools (git, file reads, dewey MCP, session search) following your guidance, then answers — including "Type your own answer" custom replies, which Jev alone can never produce.

Example — `.opencode/auto-question/guidance/uncommitted-files.md`:

```markdown
# Uncommitted files before new work

When the agent asks what to do about uncommitted files before starting
something new, investigate with `git status` whether those files are dewey
learnings. If they are dewey learnings, answer with the custom text:
"please create a chore PR for the dewey learnings and then continue"
If they are not dewey learnings, the guidance does not apply — report
covered: false and answer honestly at low confidence.
```

Semantics:

- **Confident + covered** → the agent's answer is sent immediately (summary shows `pass 0`).
- **Covered but low confidence** → the question goes to the human. The generic engines never override project policy.
- **Not covered** (guidance doesn't address the question) → falls through to the normal pass 1/pass 2 flow.
- **Agent failure/timeout** → falls through to the normal flow. Guidance loading itself can never break the plugin.
- Guidance is re-read on every question, so edits go live without restarting opencode. Docs are concatenated in filename order and capped at `guidance.maxChars`.
- Write both branches (what to do when the guidance applies, and what to do when it doesn't) — an unfinished "else" tends to produce low-confidence deferrals.

When no guidance documents exist anywhere, pass 0 is skipped entirely and behavior is unchanged.

## Human gates

Some questions are deliberate human decisions — for example the scope and promotion-review questions of Dewey's `/dewey-distill`. Auto-answering them would silently turn human promotion into automatic promotion, so the plugin never answers them:

- **Marker**: a question (or its header) that begins with `HUMAN_GATE:` always goes to the human, regardless of engine confidence. One marked question defers the whole request, and the request is remembered so a repeated delivery of the same event is ignored. The contract is defined in Dewey's `curator-agent-human-gates` change (design D7): `HUMAN_GATE: <question>` at the start of the first line. Because a model writes the question text, detection is more lenient than the contract: leading whitespace and markdown decoration (`**HUMAN_GATE:**`, `> `, `1. `), any letter case, and `HUMAN GATE` / `HUMAN-GATE` spellings all count. A question that only mentions the marker mid-sentence does not.
- **Cost of a false marker**: over-matching never auto-answers a gate, but it is not free. In an unattended run (gh-hud dispatching an autonomy TUI session) a deferred question blocks the pane until someone answers it, so any question the model writes with the marker, deliberately or by copying text that quotes it, stalls the run.
- **Gated agents**: when `agents` includes an agent in `humanGatedAgents` (always including `curator`), that agent is dropped from `agents` and the plugin logs an error naming it. The rest of the config still loads, so other agents keep being auto-answered. As defense in depth, a question from a gated agent is also never answered at runtime.
- Both checks run before pass 0, so project guidance documents cannot override them.

Dewey's `dewey gate auto-answer` startup check refuses `/dewey-distill` independently when `curator` appears in this plugin's `agents` list.

## Config

`~/.config/opencode/auto-question.jsonc` (JSONC with `{env:VAR}` interpolation). See [config/auto-question.jsonc](config/auto-question.jsonc) for all options:

| Option | Default | Meaning |
|---|---|---|
| `agents` | `["autonomy"]` | Session agents that trigger auto-answering |
| `humanGatedAgents` | `["curator"]` | Agents whose questions are deliberate human gates; any of them listed in `agents` are dropped from it with a logged error. Entries extend the built-in `curator` (case-insensitively), never replace it |
| `engine` | `"auto"` | `"jev"`, `"llm"`, or `"auto"` (jev first, llm fallback) |
| `jev` | auto-discovered | Carrier: explicit `apiKey`+`baseUrl`+`model` in config, else `OPENCODE_API_KEY` → OpenCode Zen (`jev-1.13`, ~$0.000013/call), else `OPENROUTER_API_KEY` → OpenRouter (`typesafe/jev-1.14`) |
| `confidenceThreshold` | `0.6` | Pass 1 answers at or above this immediately |
| `fallbackThreshold` | `0.35` | Applies only to a decision re-made in pass 2; below it goes to the human. When pass 2 doesn't run (no context) or fails, the pass-1 decision stays held to `confidenceThreshold` |
| `immediateContext` | `true` | Fetch the model's reasoning text from the assistant message that called the question tool (tables, recommendations, etc.) and include as context for the decision engine |
| `sessionSummary` | `true` | Inject a summary message into the session history after auto-answering or deferring to human (visible in the TUI, hidden from the model, keeps the session's agent/model) |
| `llm.alternateModels` | `[]` | Models used instead of `llm.model` when it is the asking session's own model. See [Choosing models](#choosing-models) |
| `contextGathering.agent` | `"auto-question-ctx"` | Subagent that gathers context |
| `contextGathering.model` | `""` | `"provider/model"` to run the context subagent with; `""` uses the agent's own model |
| `agentDecision.agent` | `"auto-question-decide"` | Pass-0 decision subagent that answers following project guidance |
| `agentDecision.model` | `""` | `"provider/model"` to run the decision subagent with; `""` uses the agent's own model |
| `agentDecision.timeoutMs` | `60000` | Timeout for the pass-0 decision agent |
| `guidance.enabled` | `true` | Set `false` to disable pass 0 entirely |
| `guidance.projectPath` | `".opencode/auto-question/guidance"` | Project guidance dir (relative to project root or absolute). `""` loads no project guidance |
| `guidance.globalPath` | `"~/.config/opencode/auto-question/guidance"` | Global guidance dir. A relative path is relative to the config file that sets it. `""` loads no global guidance |
| `guidance.maxChars` | `20000` | Total guidance characters passed to the decision agent |
| `handlerTimeoutMs` | `120000` | Hard cap per question request |
| `resultTrailer` | `false` | Append `AUTO_QUESTION_RESULT {json}` to the answer the asking agent receives. See [Results](#results) |
| `onDefer` | `"human"` | A question that isn't auto-answered: `"human"` leaves it pending for the TUI form; `"reject"` answers it with a `NO_SECOND_OPINION:` marker so unattended sessions continue. See [Unattended sessions](#unattended-sessions-ondefer) |
| `secondOpinion.enabled` | `false` | Register the `second_opinion` tool. See [Second opinion tool](#second-opinion-tool) |
| `profiles` | `{}` | Per-agent overrides; see [Profiles](#profiles) |

### Config files

The plugin loads, in order, each file deep-merged over the one before (objects merge, arrays and scalars replace):

1. The built-in defaults.
2. `~/.config/opencode/auto-question.jsonc`, if present.
3. `$OPENCODE_CONFIG_DIR/auto-question.jsonc`, if `OPENCODE_CONFIG_DIR` is set and the file exists. This is the same variable opencode uses for an extra config directory, so a tool can ship its agents, guidance and auto-question settings in one directory and run `OPENCODE_CONFIG_DIR=<dir> opencode run ...` without touching the global config.

`AUTO_QUESTION_CONFIG=<path>` instead names one file that is merged over the defaults alone: neither the global file nor the config-dir file is read. That file must exist, or the plugin stays inert and logs why.

A relative `guidance.globalPath` resolves against the directory of the file that sets it, so a config dir can keep its guidance at `<dir>/auto-question/guidance` with `"globalPath": "auto-question/guidance"`. `guidance.projectPath` stays relative to the project. The log records which files were loaded.

### Unattended sessions (`onDefer`)

By default a question the plugin doesn't answer stays pending for the TUI form. That covers low confidence, project guidance that covered the question without a confident answer, an engine failure and a handler timeout. In an unattended session, such as a TUI nobody is watching or a session driven through `opencode serve` or the SDK, nobody answers, so the run hangs.

`opencode run` is different: unless it runs with `--mini`, it denies the `question` tool for its session (opencode 1.18), so its agents never ask and this setting has no effect there.

With `"onDefer": "reject"`, set at the top level or per profile:
- **Deferred questions:** each question in the request gets one answer, a marker the asking agent can act on, for example `NO_SECOND_OPINION: deferred (confidence 0.31 < 0.35, pass 2)` or `NO_SECOND_OPINION: deferred — LLM API 503 (pass 1 (no gathered context))`. The run continues, at the latest after `handlerTimeoutMs`.
- **`HUMAN_GATE:` questions:** these are rejected, never answered. opencode ends the agent's turn on a rejected question, so the run finishes instead of hanging, and the session summary records `HUMAN_GATE_UNANSWERED`. Questions from agents in `humanGatedAgents` aren't touched; those agents are never auto-answered.

### Results

Every question from an auto-answered agent ends with one JSON line in `~/.local/share/opencode-auto-question/results.jsonl`, keyed by `requestID` and `sessionID`. That includes questions answered, deferred, left for the human, rejected as a human gate, and timed out. Questions from other agents aren't recorded.

```json
{"v":1,"time":"…","requestID":"que_…","sessionID":"ses_…","agent":"hud-supervisor","outcome":"answered","action":"replied","answer":"Agree","answers":[["Agree"]],"confidence":0.82,"confidences":[0.82],"threshold":null,"pass":2,"passDetail":"pass 2","engine":"llm","model":"qwen/qwen3-235b-a22b","rationale":"The failing check and the fix touch the same lockfile.","reason":null}
```

- `outcome`: `answered`, `deferred`, `gated` or `timeout`.
- `action`: what the plugin did: `replied`, `marker` (a `NO_SECOND_OPINION:` reply under `onDefer: "reject"`), `rejected` (a human gate under `"reject"`) or `left_for_human`.
- `answer`: the labels joined with `", "` when there is one question, otherwise `null`. It is `null` whenever the question wasn't answered.
- `confidence`: the lowest per-question confidence of the decision that counted, or of the one that fell short.
- `pass`: 0 (guidance agent), 1 or 2.
- `model`: the engine's model. For the guidance agent, the subagent's model when opencode reports it, else `agent:<name>`.
- `rationale`: one sentence from the LLM or guidance-agent engine. Jev gives none.

With `"resultTrailer": true` (top level or per profile), any reply the asking agent receives also ends with the record in compact form: no ids or time, and `answers` only when there are several questions. It is added as the last element of the last question's answer:

```text
"Does #1031 fix the OSV-Scanner failure?"="Agree, AUTO_QUESTION_RESULT {"outcome":"answered","answer":"Agree","confidence":0.82,"pass":2,"engine":"llm","model":"qwen/qwen3-235b-a22b","rationale":"…"}"
```

A `NO_SECOND_OPINION:` marker reply carries it too. A rejected human gate, or a question left for the human, gets no reply to carry it, so its record is only in `results.jsonl`.

### Second opinion tool

An agent that wants an independent check on a decision (for example a reviewer about to submit a proposal) can call `second_opinion` instead of `question`. Enable it with `"secondOpinion": { "enabled": true }`.

The tool takes three arguments:
- `question`: the decision to make.
- `options`: two or more `{label, description}` entries.
- `facts`: the case facts only, without the caller's reasoning or recommendation.

It runs the same pipeline as a question (guidance agent, pass 1, pass 2 with context gathering) under the **calling agent's profile**, so the profile picks the guidance, thresholds, engine and model. The engines and the context subagent see only the question, the options and the facts; the caller's message is never read. The tool never waits for a human: when no answer is confident enough, it returns `answer: null` with the reason. It returns the compact [result](#results) as JSON:

```json
{"outcome":"answered","answer":"Agree","confidence":0.82,"pass":2,"engine":"llm","model":"qwen/qwen3-235b-a22b","rationale":"…"}
```

`HUMAN_GATE:` questions and calls from agents in `humanGatedAgents` are never answered. Each call is written to `results.jsonl` with `"source": "second_opinion"`.

**Who can call it:** when the tool is enabled, the plugin adds a global `"second_opinion": "deny"` to the opencode config unless you set a global rule for it yourself. It then allows the tool for every agent that has a [profile](#profiles): a profile says how that agent's decisions are made, so its calls have settings to run under. An agent can also be allowed directly:

```yaml
# agents/hud-supervisor.md
permission:
  "*": deny
  second_opinion: allow
```

An explicit `second_opinion` rule on an agent always wins over the profile, so `"second_opinion": "deny"` keeps a profiled agent from calling it. The bundled `autonomy` agent denies it this way: its questions already get an auto-answer with you as the fallback, and `second_opinion` would skip that fallback. Human-gated agents are never allowed it, and a profile for an agent opencode doesn't define creates no agent. The log lists which agents were allowed.

### Profiles

Every agent in `agents` shares the top-level settings unless it has a profile. A profile is keyed by agent name (case-insensitive) and deep-merged over the top-level settings for that agent's questions only:

```jsonc
"agents": ["autonomy", "hud-supervisor"],
"profiles": {
  "hud-supervisor": {
    // Only gh-hud's own guidance, not the shared always-proceed docs.
    "guidance": { "globalPath": "auto-question/hud-guidance", "projectPath": "", "inheritGlobal": false },
    "confidenceThreshold": 0.7,
    "fallbackThreshold": 0.5,
    "llm": { "model": "qwen/qwen3-235b-a22b" }
  }
}
```

A profile can set `engine`, `jev`, `llm`, `confidenceThreshold`, `fallbackThreshold`, `contextGathering`, `agentDecision`, `guidance`, `immediateContext`, `sessionSummary`, `handlerTimeoutMs`, `onDefer` and `resultTrailer`. Any other key is ignored with a logged error. Human gates are checked before a profile applies, and `agents`, `humanGatedAgents` and `enabled` can't be set per profile, so a profile can't weaken a gate.

Guidance in a profile:
- With its own `globalPath`, the profile loads the top-level global guidance first, then its own, then the project's.
- `"inheritGlobal": false` drops the top-level global guidance. Only the profile's own `globalPath` (if any) and the project's guidance are loaded.
- `"projectPath": ""` drops the project's guidance.

Profile values are checked when the config loads. An invalid value names the profile and leaves the plugin inactive, the same as an invalid top-level value. A profile for an agent that isn't in `agents` is logged as unused, unless `secondOpinion.enabled` is on: the `second_opinion` tool uses the calling agent's profile whether or not that agent's questions are auto-answered.

### Choosing models

A second opinion from the asker's own model shares its blind spots, so agreement means little. Three settings, at the top level or per profile, choose who decides:

- `llm.model`: the model the LLM engine (pass 1 and pass 2) asks.
- `contextGathering.model` and `agentDecision.model`: the model the pass-2 context subagent and the pass-0 guidance agent run with, as `"provider/model"` with opencode's provider and model ids (`"openrouter/qwen/qwen3-coder"`). Empty runs each agent on its own model.
- `llm.alternateModels`: the plugin knows the asking session's model from its messages. When `llm.model` names the same model (compared by name, whatever the provider: `z-ai/glm-5.3`, `zai/glm-5.3` and `openrouter/z-ai/glm-5.3:free` match), the first alternate that differs is used instead and logged. With none, `llm.model` is kept and a warning is logged.

```jsonc
"profiles": {
  "hud-supervisor": {
    // The supervisor runs on GLM 5.3; its second opinion comes from elsewhere.
    "llm": { "model": "qwen/qwen3-235b-a22b", "alternateModels": ["deepseek/deepseek-v4"] },
    "contextGathering": { "model": "openrouter/qwen/qwen3-coder" }
  }
}
```

The [result](#results) names the model that decided.

## Notes

- Built for the opencode **1.19.x V1 plugin API**. It listens for `question.asked` (live on 1.19.0) and `question.v2.asked` (same payload shape) and replies over the server's question endpoints, so no tool interception is needed.
- **Jev carriers**: explicit config values always win; otherwise the plugin auto-discovers — `OPENCODE_API_KEY` (from `opencode /connect`) routes to OpenCode Zen with `jev-1.13` (~$0.000013/call; `jev-1.13-free` works only after allowing free endpoints in the workspace Privacy settings); `OPENROUTER_API_KEY` routes to the OpenRouter Decisions API with `typesafe/jev-1.14`. Zen serves bare model IDs; OpenRouter needs the prefixed slug (`jev-latest` is not valid on Zen — pin a version). Guard rail: an OpenRouter key (`sk-or-...`) placed in `OPENCODE_API_KEY` is detected and routed to OpenRouter (with a warning in the log) instead of failing at Zen with 401.
- **Noul semantics**: Jev multi-select (`noul`) answers are probabilities in `[0,1]`, not booleans. An option is selected when `noul > 0.5` (exactly 0.5 is maximal uncertainty and selects nothing); question confidence is the weakest option certainty (`min over options of max(p, 1-p)`), so a borderline option triggers context gathering.
- Session-agent detection uses user-message events plus a session-messages fallback (the v1.19 session type has no agent field).
- Context gathering creates a temporary child session (deleted afterwards) that inherits the project directory, so per-project tools like dewey MCP are available to the context subagent.
- The pass-0 decision agent runs in the same kind of temporary child session; the project directory is resolved from the opencode launch directory (`input.directory`), so guidance is read from the project opencode was started in.
- Decisions and errors are logged to `~/.local/share/opencode-auto-question/log.txt` (set `"verbose": true` for debug detail); one structured record per question goes to `results.jsonl` next to it. Each file is truncated once it passes 2 MB.
- **Session summaries**: when `sessionSummary` is enabled (default), the plugin injects a visible `noReply` message into the session history after auto-answering or deferring to human. This shows the engine used, confidence scores, and which answers were selected (or why the question was deferred). The message carries the latest user message's agent/model/variant/system/format — without those, opencode stamps a new user message with the default agent and switches the session to `build` mid-run — and its text part is marked `ignored`, so it shows in the history but stays out of the model's context. Set `"sessionSummary": false` to disable.
- If the human answers first, the plugin's reply fails harmlessly (the pending request is gone) and it moves on.

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun test            # unit tests (no network)
```
