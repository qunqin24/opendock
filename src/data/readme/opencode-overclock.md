# opencode-overclock

The modular workflow suite and power-ups for [opencode](https://opencode.ai): background
tasks, cron-style scheduling, quality-gate hooks, cost telemetry — and an ASCII companion.

Everything is a separate module you can turn off individually, so you can take one feature and
ignore the rest. When opencode ships a native equivalent, the matching module goes away.

```sh
opencode plugin opencode-overclock       # this project
opencode plugin -g opencode-overclock    # every project
```

## What you get

| Module      | What it does                                                                                                                                                                                               | Tools it adds                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `workflow`  | 5 lifecycle commands (`/define`, `/plan`, `/build`, `/diagnose`, `/ship`), 11 agents (interactive & sandboxed subagents), and 10 bundled engineering skills (`tdd`, `grilling`, `doubt`, etc.).            | —                                                   |
| `safety`    | Blocks destructive git operations (`git reset --hard`, force-push, `clean -f`, `branch -D`, `stash drop`) in `bash` tool calls before they run.                                                            | —                                                   |
| `tasks`     | Run shell commands in the background. The agent gets the result posted back into the session when they finish, and a nudge if one blocks on a prompt.                                                      | `task_run` `task_status` `task_output` `task_kill`  |
| `sched`     | Recurring prompts on a cron expression or an interval (`"5m"`). Survives restarts; an interval on the current session makes a loop.                                                                        | `schedule_create` `schedule_list` `schedule_delete` |
| `guard`     | Your own quality gates: run a command after the agent edits files, feed failures back on idle, edit recovery hints, and `floorGuard` anti-bypass protection.                                               | —                                                   |
| `recovery`  | Automatically heal provider errors (missing tool results, thinking block sequencing, context limit) and auto-resume sessions.                                                                              | —                                                   |
| `truncator` | Context-protecting smart output truncation for high-volume tools (`task_output`, `bash`, `grep`, `glob`, `webfetch`, `browser`, `crawl`) preserving header & tail diagnostics.                             | —                                                   |
| `browser`   | Native browser automation & research: drop-in SPA webfetch replacement with Readability distillation, live Chrome CDP attach, interactive form testing, screenshot capture, and console error diagnostics. | `webfetch` `browser` `crawl`                        |
| `usage`     | Per-day and per-session cost and token totals, collected from the event bus (accessible via TUI `/oc-usage`).                                                                                              | —                                                   |
| `buddy`     | An ASCII pet next to the prompt that reacts to what the session is doing. Purely cosmetic.                                                                                                                 | —                                                   |

On top of the tools, the TUI side adds desktop notifications when a turn finishes or the agent
needs you, plus `/oc-tasks`, `/oc-usage`, `/oc-schedules`, `/oc-buddy` (pet), `/oc-buddy-switch` (choose species), and `/oc-buddy-cycle` (next species).

**Please read this before installing:** overclock gives the agent the ability to run shell
commands in the background (`task_run`) and to schedule recurring prompts (`schedule_create`).
That is the point of the plugin, but it is worth an explicit yes rather than a surprise. It
tells you what it enabled on a project's first run. The tool definitions cost roughly 800
tokens of context.

## Install

The command at the top of this page is the reliable way to install, because one package ships
**two** surfaces that register in two different config files:

```jsonc
// opencode.json  -> server surface: the tools and hooks
{ "plugin": ["opencode-overclock"] }
// tui.json       -> TUI surface: notifications, slash commands, the buddy
{ "plugin": ["opencode-overclock"] }
```

Adding only the `opencode.json` entry by hand is the most common mistake: the tools work and
the notifications silently never load.

Requires **opencode >= 1.18.4**. That floor comes from the buddy sprite, which renders against
the `@opentui/solid` version opencode bundles from 1.18.4 onward. If you don't care about the
buddy, the server surface alone works back to 1.15.11 — the first release where opencode calls
a plugin's `dispose` hook, without which this plugin's timers and watchers are never cleaned up.

## Configuration

Everything is optional. With no options configured, overclock runs with sensible defaults: background
tasks, cron-style scheduling, quality gates, usage telemetry, and the buddy are active immediately.

Configure options directly in your project or global `opencode.json`:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "tasks": { "killOnExit": true },
        "guard": { "auto": true },
      },
    ],
  ],
}
```

To turn an individual feature off:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "buddy": false,
      },
    ],
  ],
}
```

| Module      | Options                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow`  | `enabled` bool · `commands` bool · `subagents` bool · `skillsPath` string                                                                                                                                |
| `safety`    | `blockDestructiveGit` bool · `allowForcePush` bool · `allowStashDrop` bool · `customPatterns` array (`{ name, pattern, reason }`)                                                                        |
| `guard`     | `hooks` array · `recipes` array (`["tsc", "eslint", "cargo", "ruff", "go"]`) · `auto` bool · `editRecovery` bool · `floorGuard` bool / obj (`allowSkips`, `allowSuppressions`, `allowAssertionRemoval`)  |
| `tasks`     | `killOnExit` bool · `stallDetection` bool · `stallThresholdMs` num · `stallCheckIntervalMs` num · `tmux` bool · `sanitizeEnv` bool · `envAllowlist` string[] · `maxTasks` num                            |
| `sched`     | `skipIfBusy` bool                                                                                                                                                                                        |
| `recovery`  | `maxAttempts` num · `cooldownMs` num · `autoResume` bool                                                                                                                                                 |
| `truncator` | `maxChars` num · `tools` array · `headLines` num · `tailLines` num                                                                                                                                       |
| `browser`   | `enabled` bool · `headless` bool · `cdpEndpoint` string · `channel` string · `executablePath` string · `navigationTimeoutMs` num · `idleTimeoutMs` num · `overrideWebfetch` bool · `artifactsDir` string |
| `usage`     | `debounceMs` num                                                                                                                                                                                         |
| `buddy`     | bool                                                                                                                                                                                                     |

Configure TUI-specific preferences in your project or global `tui.json`:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "notifyIdle": true,
        "notifyPermission": true,
        "notifyQuestion": true,
        "notifyError": true,
        "buddy": true,
      },
    ],
  ],
}
```

### Engineering harness & workflows (`workflow`)

Overclock bundles a structured software engineering harness that elevates opencode from a code generator into an elite engineering partner.

#### 1. Lifecycle Commands (The "When")

| Command     | Purpose                                                                                                                            |
| :---------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `/define`   | Structured inquiry via `grilling` and `domain-modeling`, or direct specification synthesis (`to-spec`) into `SPEC.md`.             |
| `/plan`     | Decomposes `SPEC.md` into vertical tracer bullets (`to-tickets`) with dependency DAGs and expand/contract migration branches.      |
| `/build`    | Autonomous TDD implementation (`tdd`) with stop-the-line tripwires (halts on 3 consecutive test failures or schema changes).       |
| `/diagnose` | Disciplined 6-phase defect isolation loop with automated reproductions, tagged logging (`[DEBUG-xxxx]`), and regression tests.     |
| `/ship`     | Pre-launch gatekeeper running a parallel 4-way subagent audit across uncommitted, staged, and branch diffs with GO/NO-GO verdicts. |

#### 2. Bundled Engineering Skills (The "How")

Auto-discovered by opencode's `skill` tool when relevant:

- `tdd`: Test-driven development loop enforcing public seam tests before implementation and the Prove-It bug pattern.
- `grilling`: Requirements interrogation on the decision dependency frontier with opinionated defaults (`➡️ **Recommended:**`).
- `domain-modeling`: Ubiquitous language management (`CONTEXT.md`) and Architecture Decision Records (`ADR-FORMAT.md`).
- `to-spec`: Fast requirements synthesis into `SPEC.md` without reopening interview loops.
- `to-tickets`: Context-sized DAG task planning with expand-and-contract branches for wide refactors.
- `codebase-design`: Deep module architecture (Ousterhout), 4 dependency categories, and "Design It Twice" exploration.
- `diagnosing-bugs`: Systematic defect reproduction, ranked hypotheses, secret redaction, and tagged probes.
- `doubt`: Adversarial verification where artifacts are audited against contracts without author confirmation bias.
- `source-discipline`: Grounding framework code in official, version-matched documentation.
- `ui-verify`: Verifies UI behavior, diagnoses visual regressions, tests browser interactions, and conducts web documentation research.

#### 3. Workflow Agents (The "Who")

Specialized agents available interactively in the TUI (`Tab`) and delegable via the `task` tool:

##### Interactive & Subagent Agents (`mode: "all"`)

- `craftsman`: Disciplined implementation agent enforcing TDD (public seam first), minimal vertical slices, and zero compromises on code quality.
- `doc-writer`: Technical writer synthesizing accurate documentation, API references, ADRs, and user guides grounded directly in codebase evidence.
- `engineering-coach`: Elite staff mentor providing Socratic debugging guidance, mental models, and architectural critique (read-only sandboxed).
- `design-explorer`: Architect formulating contrasting minimalist vs extensible interface proposals ("Design It Twice", read-only sandboxed).
- `codebase-researcher`: Scout tracing call graphs, seams, and dependencies without cluttering context (read-only sandboxed).
- `doubt-reviewer`: Adversarial verifier probing race conditions, error bounds, and silent assumptions (read-only sandboxed).

##### Sandboxed Audit Subagents (`mode: "subagent"`)

Leaf subagents invoked via the `task` tool with **enforced read-only tool sandboxing** (`tools: { write: false, edit: false }`, `permission: { edit: "deny" }`):

- `standards-reviewer`: Senior reviewer auditing code diffs against Martin Fowler's code smells and repo idioms.
- `spec-reviewer`: Product reviewer ensuring strict compliance with `SPEC.md` and zero unrequested scope creep.
- `security-auditor`: Adversarial security engineer auditing diffs for OWASP Top 10 flaws and secret hygiene.
- `test-engineer`: QA engineer assessing test coverage gaps, assertion quality, and mocking boundaries.
- `performance-auditor`: Performance engineer identifying N+1 queries, unbounded memory, and latency bottlenecks.

### Quality gates (`guard`)

Quality gates let you define automated feedback loops. Whenever the agent modifies code with `edit`
or `write`, the guard runs your project's verification command in the background. If the command fails,
the error output is automatically fed back into the session once the agent finishes its turn, prompting
it to self-correct.

Because verification commands vary by language and repository, configure hooks in your project's
local `opencode.json`:

#### Stack recipes

##### TypeScript / JavaScript

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "typecheck",
        "tools": ["edit", "write"],
        "pathFilter": "src/**/*.ts",
        "run": "npm run typecheck",
      },
    ],
  },
}
```

##### Python (Ruff / Pytest)

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "lint",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.py",
        "run": "ruff check .",
      },
    ],
  },
}
```

##### Rust (Cargo)

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "cargo-check",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.rs",
        "run": "cargo check",
      },
    ],
  },
}
```

##### Go

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "go-test",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.go",
        "run": "go test ./...",
      },
    ],
  },
}
```

##### Generic / Make

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "check",
        "tools": ["edit", "write"],
        "run": "make check",
      },
    ],
  },
}
```

#### Hook options

| Field        | Default     | Description                                                                   |
| ------------ | ----------- | ----------------------------------------------------------------------------- |
| `name`       | _required_  | Identifier displayed in failure reports                                       |
| `tools`      | _required_  | Tools to trigger on, e.g. `["edit", "write"]`                                 |
| `run`        | _required_  | Shell command to execute (receives `$GUARD_TOOL` and `$GUARD_FILE` in env)    |
| `pathFilter` | `undefined` | Optional glob pattern to limit triggers to relevant files (e.g. `**/*.py`)    |
| `mode`       | `"inject"`  | `"inject"` waits for the session to go idle; `"append"` reports immediately   |
| `debounceMs` | `2000`      | Debounce duration for rapid successive edits                                  |
| `timeoutMs`  | `60000`     | Execution timeout before killing the command                                  |
| `maxDeferMs` | `300000`    | Maximum time `"inject"` will wait for an idle session before reporting anyway |
| `onSuccess`  | `"silent"`  | `"silent"` or `"notify"`                                                      |

#### Built-in recipes & automatic stack detection

Instead of writing manual hook definitions, enable preconfigured recipes via `recipes: ["tsc", "eslint", "cargo", "ruff", "go"]`:

- `tsc`: `bun x tsc --noEmit || npx tsc --noEmit` on `**/*.{ts,tsx}`
- `eslint`: `bun x eslint . || npx eslint .` on `**/*.{js,jsx,ts,tsx}`
- `cargo`: `cargo check` on `**/*.rs`
- `ruff`: `ruff check .` on `**/*.py`
- `go`: `go test ./...` on `**/*.go`

Or set `"auto": true` to inspect the workspace root and automatically mount recipes when `tsconfig.json`, `Cargo.toml`, `pyproject.toml`/`ruff.toml`, or `go.mod` exist. Setting `"auto": true` also turns on `floorGuard`.

#### Anti-bypass quality gate (`floorGuard`)

Autonomous models frequently attempt to make failing tests "pass" by cheating: skipping tests, silencing linter errors, or deleting assertions. `floorGuard` intercepts `edit` and `write` tool calls and issues immediate blocking warnings if anti-patterns are introduced:

- **Test skipping:** `.skip()`, `test.skip`, `it.skip`, `describe.skip`, `xit()`, `xdescribe()` in JS/TS; `@pytest.mark.skip`, `@unittest.skip` in Python; `t.Skip` in Go; `#[ignore]` in Rust.
- **Diagnostic suppression:** `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `# noqa`, `# type: ignore`, or empty `catch {}` blocks swallowing errors silently.
- **Assertion removal:** Deleting `expect(...)`, `assert`, `assertEquals`, etc. from test files without replacing them.

Configure `floorGuard` with granular escape hatches if your repository requires exceptions:

```jsonc
{
  "guard": {
    "floorGuard": {
      "allowSkips": false,
      "allowSuppressions": false,
      "allowAssertionRemoval": false,
    },
  },
}
```

#### Edit recovery hints (`editRecovery`)

When enabled (default: `true` if hooks are active), if the model fails an `edit` tool call because `oldString` was not found or had multiple matches, overclock appends an actionable recovery hint advising the model to read the latest file state around target lines before attempting another edit.

#### Hook command safety check

Guard inspects all configured hook commands before execution. Any command attempting reverse shells (`bash -i >&`), network socket redirection (`/dev/tcp`, `/dev/udp`), named pipe creation (`mkfifo`), netcat execution (`nc -e`), pipe-to-interpreter constructs (`curl | bash`, `base64 -d | sh`), or socket relays (`socat`) is rejected at initialization.

### Destructive Git protection (`safety`)

Overclock intercepts `bash` tool calls before execution to block destructive git commands that can cause irreversible data loss:

| Blocked Action         | Pattern Matched                     | Why It's Blocked                           |
| :--------------------- | :---------------------------------- | :----------------------------------------- |
| `force-push`           | `git push --force`, `-f`, `+<ref>`  | Can overwrite remote shared history.       |
| `hard-reset`           | `git reset --hard`                  | Permanently deletes uncommitted work.      |
| `force-clean`          | `git clean -f`, `--force`           | Deletes untracked files irreversibly.      |
| `branch-force-delete`  | `git branch -D`, `-d -f`            | Bypasses unmerged commit safeguards.       |
| `remote-branch-delete` | `git push --delete`, `-d`, `:<ref>` | Destroys remote branch tracking.           |
| `discard-all-worktree` | `git restore .`, `git checkout .`   | Discards all current working tree changes. |
| `stash-destroy`        | `git stash drop`, `git stash clear` | Permanently discards stashed changes.      |
| `rebase-skip`          | `git rebase --skip`                 | Drops conflicting commits entirely.        |

When a command is blocked, overclock rewrites it into a non-crashing safe exit (`printf ... >&2 && exit 1`), cleanly notifying the agent and prompting it to use non-destructive alternatives (like `git stash push`, `git revert`, or targeted file restore) without failing the execution fiber.

Configure exceptions or add custom patterns:

```jsonc
{
  "safety": {
    "blockDestructiveGit": true,
    "allowForcePush": false,
    "allowStashDrop": false,
    "customPatterns": [
      {
        "name": "no-rm-rf-root",
        "pattern": "rm\\s+-rf\\s+/(?:$|\\s)",
        "reason": "Root filesystem deletion is forbidden.",
      },
    ],
  },
}
```

### Background tasks (`tasks`)

Allows the model to spawn long-running shell processes (compilations, dev servers, test watchers) in the background without blocking the conversation turn.

#### Provided Tools

- `task_run`: Spawns a background process. Takes `command` (required), `description` (required), `cwd` (optional), and `timeout` in seconds (optional). When the process exits, its exit code and log tail are injected directly into the session.
- `task_status`: Returns status and exit code for one task (`id`) or all active/retained tasks.
- `task_output`: Reads the output log tail for a given task (`id`, optional `tail` line count, default 50). Caps read window to 512 KB to avoid memory blowup.
- `task_kill`: Terminates a running task by ID (`SIGTERM`, escalating to `SIGKILL` after 3 seconds).

#### Safety & Features

- **Prompt stall detection:** A background watchdog monitors task log files. If output stops growing and the tail matches an interactive prompt pattern (`(y/n)`, `Continue?`, `Overwrite?`, `Press Enter`), overclock injects an alert prompting the agent to kill the stalled task and re-run non-interactively.
- **Interactive command rejection:** Commands that explicitly require terminal input (`vim`, `nano`, `git rebase -i`, bare `python`/`bash` REPLs) are rejected at `task_run` invocation.
- **Environment sanitization:** `sanitizeEnv: true` (default) strips sensitive environment variables from task subprocesses. Use `envAllowlist: ["MY_TOKEN"]` to pass specific secrets.
- **Tmux split-pane:** Set `"tmux": true` to automatically spawn a live side-by-side tmux pane tailing each background task's output.
- **Process cleanup:** When `killOnExit: true` (default), all running background processes are cleaned up when the host session disposes.

### Recurring prompts & scheduling (`sched`)

Automates prompt execution on an interval or cron schedule. Ideal for autonomous continuous loops (`/loop`), periodic CI status checks, or scheduled audits.

#### Provided Tools

- `schedule_create`: Registers a schedule.
  - `spec`: Interval string (`"30s"`, `"5m"`, `"2h"`, `"1d"`) or 5/6-token cron expression (`"0 9 * * *"`).
  - `prompt`: The prompt text to execute.
  - `target`: `"current"` (injects into the active session when idle, forming an autonomous loop) or `"new-session"` (creates a fresh session per run).
- `schedule_list`: Displays all active schedules, their target mode, and next scheduled run time.
- `schedule_delete`: Cancels a schedule by ID (`id`).

#### Guardrails & Invariants

- **Minimum interval:** Enforces a minimum frequency of 5 seconds (throws if `< 5s`).
- **Maximum schedules:** Capped at 50 schedules per workspace.
- **Backpressure:** `skipIfBusy: true` (default) skips a firing if the target session is currently busy processing another turn.
- **Fault tolerance:** Persisted to disk (`.opencode/overclock/schedules.json`) and rearmed across restarts. If a target session is unreachable 5 consecutive times, the schedule is auto-removed.

### Automated error recovery (`recovery`)

Autonomous agents frequently stall on transient API errors or provider protocol sequencing quirks. `recovery` listens to the host event bus, catches known recoverable errors, and automatically prompts the session to resume:

- `tool_result_missing`: Heals Anthropic-style tool result sequencing mismatches.
- `thinking_order` / `thinking_disabled`: Heals thinking block ordering glitches.
- `context_limit`: Instructs the model to summarize recent progress and continue with minimal output.
- `rate_limit`: Implements backoff before retrying throttled endpoints.
- `transient`: Heals connection reset (`ECONNRESET`) and socket timeout errors.

Configured with `maxAttempts` (default: 3 per cooldown window), `cooldownMs` (default: 60,000 ms), and `autoResume` (default: `true`).

### Smart output truncation (`truncator`)

Commands returning tens of thousands of lines (such as huge test suites, noisy builds, or broad webfetches) can easily blow out LLM context windows.

`truncator` intercepts `tool.execute.after` for high-volume tools (`task_output`, `bash`, `grep`, `glob`, `webfetch`, `browser`, `crawl`), preserving the first 10 lines (`headLines`) and last 30 lines (`tailLines`) while trimming middle content exceeding `maxChars` (default: 40,000 characters). The model retains critical error traces and status summaries without saturating its context.

### browser

Native browser automation and documentation research. Overclock bundles a headless browser engine that drops in as an upgraded `webfetch` replacement (capable of rendering client-side SPAs with Mozilla Readability distillation, outline extraction, and anchor targeting) and introduces an interactive `browser` tool for automated UI testing, form interaction, screenshot capture, and console diagnostics.

#### Provided Tools

- `webfetch`: Drops in for opencode's built-in `webfetch`. Loads pages with a headless browser, rendering client-side SPAs and distilling clean Markdown (`mode: "distill"`), extracting heading outlines (`mode: "outline"`), or querying specific sections (`mode: "section"` with `section: "#anchor"`).
- `browser`: Interactive automation supporting actions: `navigate`, `click`, `fill`, `select`, `screenshot`, `evaluate`, `console`, and `close`.
- `crawl`: Fast, non-blocking concurrent documentation crawler. Traverses documentation via BFS link traversal or `sitemap.xml`, normalizing URLs, restricting to same domain by default, filtering paths (`includePaths`, `excludePaths`), and outputting structured site maps (`format: "map"`) or concatenated Markdown digests (`format: "digest"`).

#### Configuration

Configure browser behavior in `opencode.json`:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "browser": {
          "headless": true,
          "cdpEndpoint": "http://127.0.0.1:9222",
          "navigationTimeoutMs": 15000,
          "idleTimeoutMs": 300000,
          "overrideWebfetch": true,
          "artifactsDir": ".opencode/artifacts/browser",
        },
      },
    ],
  ],
}
```

- `enabled` (bool, default `true`): Toggle the browser module.
- `headless` (bool, default `true`): Run in headless mode. Set `false` to watch browser interactions in real-time.
- `cdpEndpoint` (string): Attach to an existing Chrome instance via Chrome DevTools Protocol (CDP). Can also be set via the `CDP_ENDPOINT` environment variable.
- `channel` (string): Specific browser channel (`"chrome"`, `"msedge"`, or `"chromium"`).
- `executablePath` (string): Explicit path to Chrome/Chromium executable (defaults to `CHROME_BIN` env var or system path).
- `navigationTimeoutMs` (num, default `15000`): Navigation timeout in milliseconds.
- `idleTimeoutMs` (num, default `300000`): Auto-close browser sessions after 5 minutes of inactivity.
- `overrideWebfetch` (bool, default `true`): Enable enhanced SPA and Readability webfetch tool.
- `artifactsDir` (string, default `".opencode/artifacts/browser"`): Directory for captured screenshots and traces.

#### Live Browser Attachment (CDP)

To use your existing authenticated Chrome session (with your active logins, cookies, and state), start Chrome with remote debugging:

```sh
# Linux
google-chrome --remote-debugging-port=9222

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222
```

Configure `cdpEndpoint: "http://127.0.0.1:9222"` (or set `export CDP_ENDPOINT="http://127.0.0.1:9222"`). Overclock automatically attaches to your running browser, letting the agent navigate and test behind authenticated sessions without hardcoded credentials.

#### Usage & ActionTrace Diagnostics

- **UI Verification Loop**:
  ```ts
  // 1. Navigate to target URL
  browser({ action: "navigate", url: "http://localhost:3000" })

  // 2. Capture visual state
  browser({ action: "screenshot" })

  // 3. Interact with form inputs
  browser({ action: "fill", selector: "input[name='email']", text: "dev@example.com" })
  browser({ action: "click", selector: "button[type='submit']" })
  ```
- **ActionTrace Diagnostics**: Every interactive browser command monitors console logs, uncaught exceptions, React hydration mismatches, and 4xx/5xx network failures, automatically appending diagnostic traces to the result so regressions are caught instantly.
- **Context Protection**: Output from `browser`, `webfetch`, and `crawl` is monitored by `truncator` to prevent excessive token consumption when querying large DOM trees or logs.

### Restricting and remapping tool names

If your setup only accepts certain tool names, list them in `toolAllowlist`. Any tool whose
name isn't permitted is withheld from the model rather than offered and refused:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "toolAllowlist": ["task_run", "task_status", "schedule_create"],
      },
    ],
  ],
}
```

`toolNames` maps this plugin's tools onto custom names you want the model to see:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "toolNames": { "task_run": "run_background_task" },
      },
    ],
  ],
}
```

### Running OpenCode V2 plugins on OpenCode V1

OpenCode V1 distributions cannot natively load V2 plugins (which export `{ id, setup }` or `{ id, effect }` instead of a server function). Overclock provides an embedded V2 host engine that runs V2 plugins side-by-side with V1 tools:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "plugins": ["./plugins/custom-agent.ts", ["opencode-plugin-review", { "strict": true }]],
      },
    ],
  ],
}
```

Overclock synthesizes a spec-compliant `PluginContext`, adapting V2 domain transforms (`agent`, `command`, `catalog`, `reference`, `skill`, `aisdk`) to live V1 config and chat hooks while keeping all V1 power tools active.

Startup tells you what was renamed, what was withheld, and warns on collisions with opencode
built-in tools. Descriptions mentioning a renamed tool are rewritten automatically.

## Notes on the TUI surface

The TUI plugin sends desktop notifications (with sound effects) when the agent changes state, exposes instant slash commands that inspect state files under `.opencode/overclock/` without LLM roundtrips, and renders an ASCII pet beside the prompt.

### Desktop notifications & audio alerts

Configure notifications in `.opencode/tui.json`:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "notifyIdle": true, // Plays 'done' sound when turn finishes
        "notifyPermission": true, // Plays 'permission' sound when agent requests approval
        "notifyQuestion": true, // Plays 'question' sound when agent asks a question
        "notifyError": true, // Plays 'error' sound on session failure
        "buddy": true, // Enables prompt-right companion sprite
      },
    ],
  ],
}
```

### Slash commands

TUI slash commands read directly from local state stores:

| Command            | Aliases         | Description                                                                       |
| :----------------- | :-------------- | :-------------------------------------------------------------------------------- |
| `/oc-tasks`        | —               | Toast summary of background tasks (`X running, Y exited, Z killed`).              |
| `/oc-usage`        | —               | Toast summary of today's total spend, tokens (input/output), and assistant turns. |
| `/oc-schedules`    | —               | Toast summary of active recurring prompts and cron timers.                        |
| `/oc-buddy`        | `/buddy`        | Pets your companion, triggers pet reaction animation, and toasts stats.           |
| `/oc-buddy-switch` | `/buddy-switch` | Opens an interactive dialog to choose a species or hatch a brand-new roll.        |
| `/oc-buddy-cycle`  | `/buddy-cycle`  | Cycles directly to the next species in rotation without opening a dialog.         |

### The ASCII Buddy

The companion hatches once per install with a random species, rarity (`common`, `uncommon`, `rare`, `legendary`), and name, persisting in the TUI's key-value store (`buddy.companion`).

- **Layout:** Positioned in `home_prompt_right` and `session_prompt_right` slots. Positioned out-of-flow (absolute) so its multi-line sprite grows upward over unused input area rather than stretching the prompt row.
- **Responsiveness:** Automatically hides when terminal width drops below 100 columns (`MIN_COLS`) to prevent cramping prompt inputs.
- **Reactive animations:** Reacts with speech bubbles and face state shifts to session events: turn completion (`done`), errors (`error`), permission requests (`permission`), user questions (`question`), and idle sleep (`sleep` after 2 minutes of inactivity).
- **Graceful degradation:** Requires `@opentui/solid >= 0.4.5` bundled with OpenCode >= 1.18.4. If missing, the buddy quietly sits out while notifications and slash commands continue to operate normally.

## Documentation & Architecture Guides

Comprehensive documentation is hosted in **[`docs/`](docs/README.md)**:

- **[Getting Started & Installation](docs/getting-started/installation.md):** Dual-target install, config options, and quickstart.
- **[Configuration Reference](docs/getting-started/configuration.md):** Complete schema reference for server and TUI options.
- **[Agent Tool Orchestration Guide](docs/guides/agent-orchestration.md):** Solving agent underutilization and prompting strategies for `task_run`, `browser`, `crawl`, and `sched`.
- **[Modules Directory](docs/modules/index.md):** In-depth guides for all 10 modules:
  - [Workflow Harness](docs/modules/workflow.md) · [Destructive Git Safety](docs/modules/safety.md) · [Background Tasks](docs/modules/tasks.md) · [Cron & Scheduling](docs/modules/sched.md)
  - [Quality Gates & Guard](docs/modules/guard.md) · [Browser Automation](docs/modules/browser.md) · [Automated Recovery](docs/modules/recovery.md) · [Smart Truncator](docs/modules/truncator.md)
  - [Usage Telemetry](docs/modules/usage.md) · [ASCII Buddy Companion](docs/modules/buddy.md) · [Embedded V2 Host](docs/modules/v2-host.md)
- **[Recipes & Cookbook](docs/guides/recipes.md):** Monorepos, autonomous loops, hardened anti-bypass gates, and gateway remapping.
- **[Tools API Reference](docs/reference/tools.md):** Parameter schemas, defaults, and return formats for all 10 tools.
- **[Slash Commands Reference](docs/reference/slash-commands.md):** TUI commands (`/oc-*`) and workflow lifecycle commands (`/define`, etc.).
- **[OpenCode Plugin Surface Map](docs/architecture/opencode-plugin-surface.md):** Technical map of OpenCode's v1 server hooks, TUI APIs, v2 domain transforms, and upstream drift tracking.
- **Architecture Decision Records (`docs/adr/`):**
  - [ADR-0001: Hybrid V1/V2 Bridge and Embedded V2 Host Engine](docs/adr/ADR-0001-hybrid-v1-v2-bridge-and-in-process-host.md)
  - [ADR-0002: Dual-Target Packaging for Server and TUI Plugin Surfaces](docs/adr/ADR-0002-dual-target-packaging-for-server-and-tui.md)
- **[Skills Research & Integration](docs/research/skills-research-and-integration.md):** Comparative research and design rationale analyzing Matt Pocock's and Addy Osmani's agent skills frameworks.

## Contributing

```
src/
  index.ts          entry: init enabled modules, merge hooks, hybrid V1/V2 export
  tui.ts            TUI plugin (notifications + slash commands), separate export
  core/             types, lifecycle/hook merging, tool policy, capability summary, bridge
  platform/         host adapters: process (exec/tmux), session (busy/inject/notify), storage (state/store), probe
  buddy/            ASCII companion state, sprites, and TUI slot integration
  v2/               embedded V2 plugin host, synthetic context, and dynamic loader
  features/         feature modules (tasks, sched, guard, recovery, truncator, usage, buddy)
test/               bun test
```

Adding a feature:

1. Write `src/features/<name>.ts` exporting a `FeatureModule`.
2. Register it in `src/features/index.ts`.

Background reading:
[docs/architecture/opencode-plugin-surface.md](docs/architecture/opencode-plugin-surface.md) maps opencode's
plugin/hook/event surface and tracks upstream drift.

```sh
bun install
bun test          # unit
bun run check     # typecheck + format check
bun run format
bun run verify    # packaging: tarball contents, server+tui targets, manifest metadata
```

### Release

```sh
bun run check && bun test && bun run verify
npm publish
bun run verify:published    # runtime load, by name, from the registry
```

`verify` can't exercise the runtime load path: opencode resolves `plugin` entries by npm name
from the registry, and a miss is silent. `verify:published` is the only check that proves an
installed-from-npm session actually gets the tools, so run it after every publish.

### Working on it locally

`.opencode/plugins/dev.ts` re-exports `src/index.ts` and `dev-tui.ts` re-exports `src/tui.ts`,
so an opencode session in this repo runs both surfaces from source. Note that only this
auto-loaded directory accepts a path — `plugin` array entries resolve by npm name from the
registry, and an unpublished name fails silently.

1. Run `opencode` here. The plugin is live.
2. Edit `src/`. There's no hot reload, so restart opencode.
3. Inspect state under `.opencode/overclock/` (gitignored).

Gotcha: if `~/.config/opencode/tui.json` also loads `opencode-overclock` from npm, that copy
wins the `overclock-tui` id and your local dev TUI plugin (along with any unpublished feature)
silently never loads. Remove the global entry while developing, or point `XDG_CONFIG_HOME`
somewhere else.

### Headless end-to-end

```sh
timeout 90 opencode run -m <provider>/<model> "Use task_run to run 'echo hi' ..." < /dev/null
```

- `< /dev/null` is required; an open stdin hangs.
- A dev build can hang on exit after the work is done, so wrap it in `timeout` and judge by
  artifacts (`.opencode/overclock/`, log tails) rather than the exit code.
- Plugin stderr goes to `opencode run --print-logs` or `~/.local/share/opencode/log/`. Grep for
  `[overclock]`.

## License

MIT
