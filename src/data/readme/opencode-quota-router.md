# quota-router: automatic model fallback for OpenCode when you hit a usage limit

[![CI](https://github.com/aicowboi/opencode-quota-router/actions/workflows/ci.yml/badge.svg)](https://github.com/aicowboi/opencode-quota-router/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Hit your Claude 5-hour limit, your ChatGPT weekly limit or your Copilot allowance in the middle of a task? quota-router keeps the session going on another provider, then moves it back when the limit resets.**

It's an [OpenCode](https://opencode.ai) plugin that routes each request to the best provider you have capacity on. It knows how each plan's limits work, so it can see a limit coming instead of only reacting to errors. It also shows a local dashboard of usage, cost and fallbacks.

![The quota-router dashboard: totals, and the route from the Claude subscription through Copilot, xAI and the pay-per-use APIs](docs/images/dashboard.png)

<sub>Dashboard with demo data.</sub>

## Why

Coding agents burn through subscription limits quickly. Without help, a limit means one of three things: a failed turn, OpenCode retrying for up to 15 minutes, or you switching models by hand and remembering to switch back. If you pay for several plans (Claude, ChatGPT, Copilot, SuperGrok) and some API keys, the capacity is there; it just isn't used in a sensible order.

quota-router uses it in this order:

- **Subscriptions first.** Claude, ChatGPT, Copilot and Grok plans are used before pay-per-use API keys. Local models (Ollama, LM Studio, vLLM) come last, at no cost.
- **Same request, new provider.** On a limit, the failed request is re-run on the equivalent model elsewhere, keeping its effort level, with no lost tool calls or extra messages.
- **Back up when the limit resets.** It reads exact reset times from Claude, ChatGPT, Copilot, Anthropic and OpenAI, so it neither retries too early nor waits forever.
- **Sees limits coming (optional).** It reads your Claude 5-hour and weekly windows, your ChatGPT windows and your Copilot credits, and moves off a plan before it runs out.
- **No surprise charges (optional).** It leaves Claude before usage credits are drawn, and Copilot before paid credits beyond your allowance.
- **Works with every provider OpenCode connects.** New connections are found automatically, and the dashboard suggests where each fits.
- **Local only.** No telemetry and no server of its own. Your data stays in a SQLite file on your machine. See [SECURITY.md](SECURITY.md).

> Unofficial. Not affiliated with Anthropic, GitHub, xAI, OpenAI or OpenCode.

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Onboarding guide](#onboarding-guide)
- [How routing works](#how-routing-works)
- [Dashboard and menu bar](#dashboard-and-menu-bar)
- [Commands](#commands)
- [Command line](#command-line)
- [LiteLLM](#litellm)
- [Claude Code Router](#claude-code-router-experimental)
- [Configuration reference](#configuration-reference)
- [Errors it handles](#errors-it-handles)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Requirements

- **OpenCode V2**, 2.2 or later. The menu bar item needs OpenCode Desktop. See the [support matrix](docs/support.md).
- **Node.js 24 or later with npm**, for the one-line installer, `quota-router` command line and source builds. A manual plugin registration does not need Node; OpenCode runs the plugin itself.
- **At least two OpenCode providers connected**, for example a Claude subscription and an API key.

## Quick start

With OpenCode V2 installed, run one command (macOS, Linux or Windows):

```sh
npx --yes --ignore-scripts opencode-quota-router@0.2.0 install
```

Or, on macOS/Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/aicowboi/opencode-quota-router/main/install.sh | sh
```

The installer downloads the pinned prebuilt release, verifies its integrity and adds it to your global OpenCode config. Existing comments, models, credentials, other plugins and quota-router options are kept. A changed config gets a private backup; repeat installs are safe. No `sudo`, shell-profile edits, global npm install, AI analysis or service restart.

Then open OpenCode normally, connect your providers and run **`/router`**. The dashboard offers optional **Intelligent routing** setup; your existing default is preserved.

**Before the first npm publication:** the online commands above become available after the release is published. The local release folder includes `install.sh`, `install.mjs` and `opencode-quota-router-0.2.0.tgz`. From that folder, run **`sh install.sh`** (macOS/Linux) or **`node install.mjs`** (all platforms). The tarball beside the installer is selected automatically, so no npm publication is needed for this path. An explicit tarball also works:

```sh
node install.mjs --package ./opencode-quota-router-0.2.0.tgz
```

Use `--dry-run` to preview without changing OpenCode files, `--config <file>` for a custom config, and `--install-dir <dir>` for a custom installation directory. Run `quota-router install --help` for the options. Both `.json` and `.jsonc`, XDG paths and config symlinks are supported. Ambiguous or invalid configs are refused rather than rewritten; a config changed by another process during installation is not overwritten.

### Manual installation

If you prefer to register the plugin yourself, add it to your global OpenCode config, `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-quota-router", "options": {} }
  ]
}
```

OpenCode installs it from npm and loads it straight away; there's nothing to restart. Run `/router` in any session to open the dashboard. To stay on one version, write `opencode-quota-router@0.2.0`.

For the command line as well (`quota-router usage`, `limits`, `prompt`), install it globally: `npm install -g opencode-quota-router`.

**From source**, to follow the main branch or change the code:

```bash
git clone https://github.com/aicowboi/opencode-quota-router.git
cd opencode-quota-router
npm install --ignore-scripts
npm run build          # the menu bar part and the command line, into dist/
```

then use the folder's absolute path as `"package"`.

## Onboarding guide

### 1. Connect your providers

quota-router only routes between providers that OpenCode can already use. In OpenCode, run `/connect` for each provider you have. Its default chains cover these five:

| Priority | Provider ID | What it is |
|---|---|---|
| 1 | `claude-agent` | Claude Pro, Max, Team or Enterprise, via the Claude Code login |
| 2 | `xai` | SuperGrok or X subscription (signed in), or an xAI API key (pay-per-use) |
| 3 | `github-copilot` | GitHub Copilot |
| 4 | `anthropic` | Anthropic API key (pay-per-use) |
| 5 | `openai` | OpenAI API key (pay-per-use), or a ChatGPT plan when you sign in with ChatGPT |

Providers you haven't connected are skipped, so you don't need all five.

**Every other provider** OpenCode connects (Ollama, LM Studio, OpenRouter, Gemini, Bedrock, Vertex, Azure, Fireworks, Groq and the rest) is found automatically and given a kind from how you connected it:

- **Subscription:** signed in with a plan (for example ChatGPT or Ollama Cloud).
- **Pay-per-use:** an API key.
- **Local:** Ollama, LM Studio, vLLM and similar. These are free, so they cost nothing on the dashboard.

Found providers rank after the ones you configured: subscriptions first, then pay-per-use, then local. They're only routed to once they're in a chain (step 3). Set `"discovery": { "enabled": false }` to rank only the providers you list.

**ChatGPT plans.** If you sign in to OpenAI with ChatGPT (Plus, Pro, Business), it's treated as a subscription and ranked with the others. Its 5-hour and weekly windows appear on the dashboard after its first response, and routing leaves it at 98% so you never hit the wall mid-task. If a limit is hit anyway, the exact reset time from ChatGPT is used. An OpenAI API key is unaffected.

### 2. Choose your order

The simplest option is **Intelligent routing** on the dashboard: choose a connected model to analyze your setup, review its recommendation, and apply it if you want. Fresh setups without a configured default can adopt the validated preset during setup; existing defaults and custom settings only get a suggestion. This is one explicit analysis, not an AI call on every request. See [Intelligent routing](#dashboard-and-menu-bar).

For manual routes, lower numbers are tried first. To put Copilot ahead of xAI, for example:

```jsonc
"options": {
  "providers": { "github-copilot": { "priority": 2 }, "xai": { "priority": 3 } }
}
```

Set `"allow": "never"` on a provider to keep it out of routing completely.

### 3. Pick a model that belongs to a chain

A **chain** lists the equivalent models across providers. Selecting any model in a chain puts the session under routing. The defaults use Claude Opus 5.5 at medium effort as the reference model:

| Chain | Claude subscription | xAI | Copilot | Anthropic API | OpenAI API |
|---|---|---|---|---|---|
| `opus` | `opus#medium` | `grok-4.7#high` | `claude-opus-5.5#medium` | `claude-opus-5-5#medium` | `gpt-6.1-sol#high` |
| `sonnet` | `sonnet#medium` | `grok-4.7#medium` | `claude-sonnet-5.5#medium` | `claude-sonnet-5-5#medium` | `gpt-6.1-sol#medium` |
| `fable` | `fable#medium` | `grok-4.7#xhigh` | — | `claude-fable-5-1#medium` | `gpt-6-astra#medium` |
| `haiku` | `haiku#medium` | `grok-build-0.1` | `claude-haiku-5.5#medium` | `claude-haiku-5-5#medium` | `gpt-6-luna#medium` |

- **New sessions:** to route these by default, set your default model to a chain member, for example `"model": "claude-agent/opus"`.
- **Models outside every chain** are never touched.
- **Other providers:** the dashboard's Route section lists suggested entries for every connected provider that's in no chain yet: the same model family where there is one, otherwise the model nearest the chain's price level. **Add** puts it in the chain; **Ignore** hides it. Your choices are stored by the plugin, not in your config.
- **Newer models:** when a provider you already use starts offering a newer model of the same line as a chain entry (Opus 5.5 → 5.6), the same section suggests replacing the entry. **Replace** swaps it in place, keeping its position and effort level, and **Undo** puts the original back. Only a model whose ID differs in nothing but its version, and that the provider lists as released later, is suggested, so a smaller or different model is never offered as an update. An entry whose model the provider has marked deprecated is flagged there and in `/router doctor`.

**Choosing your own models.** Change one provider's entry and keep the rest of the chain:

```jsonc
"chains": {
  "opus": { "xai": "grok-4.6#high", "openai": null, "ollama": "qwen3-coder" }
}
```

A model name sets that provider's entry, `null` removes it, and a provider not yet in the chain is added. To replace a chain completely, or to make your own, give a list: `"chains": { "gpt": ["openai/gpt-6.1-sol#high", "azure/gpt-6.1-sol#high"] }`. `"opus": null` removes a chain.

To make a model other than Opus your first choice, give its provider the lowest priority: routing always tries providers in priority order within the chain.

Effort carries across providers as an offset: Opus at `high`, one step above its `medium` baseline, becomes Grok at `xhigh`. A model is skipped if the conversation wouldn't fit its context window.

### 4. Optional: turn on the usage checks

Without these, quota-router reacts to limit errors. With them, it sees limits coming. Each is **off by default** because it reads a local login and calls an unofficial endpoint (details in [SECURITY.md](SECURITY.md)):

```jsonc
"options": {
  "claude": { "usageProbe": true },
  "copilot": { "usageProbe": true },
  "openrouter": { "usageProbe": true }
}
```

- **Claude:** reads Claude Code's login from the macOS keychain (or `~/.claude/.credentials.json`) and checks your 5-hour and weekly windows, the same figures Claude Code's `/usage` shows. Routing leaves the subscription when a window reaches 98%, or as soon as usage credits start going up. The login is never stored, logged or refreshed.
- **Copilot:** uses OpenCode's stored GitHub login to read your monthly allowance, and stops routing to Copilot before paid credits beyond it are used. GitHub's count lags real usage by minutes, so while it lags the credits are estimated from the tokens recorded here and the cut-over follows the estimate; it reconciles when the count catches up. Business and Enterprise seats share credits across the organisation, so your seat's share is used (1,900 or 3,900 a month); set `copilot.monthlyCredits` if yours differs.
- **OpenRouter:** asks OpenRouter's documented `GET /api/v1/key` endpoint, with the key OpenCode already holds (or `OPENROUTER_API_KEY`), how much of the key's spending limit is left. The dashboard shows "$4.50 left on the key limit" and when it resets, and routing leaves OpenRouter once the limit, or a workspace or guardrail budget above it, is spent. It also reads how many free-model requests are left today, so `:free` models are passed over when those run out while paid models stay usable. OpenRouter does not report the account's credit balance to an ordinary key, so a key with no limit shows what it has spent and nothing more; running out of account credit is still caught from the error.

**Local models are checked without any setting.** When Ollama or LM Studio is connected, quota-router asks it (on `127.0.0.1`, nothing leaves your machine) whether it is running and what it has in memory. A server that is not running is passed over instead of being tried and failing, and is used again within half a minute of being started. The dashboard shows what is loaded, and `/router doctor` warns about a model larger than this machine's memory, or one that Ollama has loaded partly on the CPU. Set `local.ollamaUrl` or `local.lmstudioUrl` if yours listens elsewhere, or `local.healthCheck: false` to turn it off.

**xAI needs no setting.** xAI publishes no usage figures, so quota-router learns the size of the SuperGrok weekly pool instead: each time it runs out, the usage in the week before, valued at list prices, is a reading of what it holds. From the first time on, the dashboard shows an estimated gauge ("about 60%"), and the forecast can say when it is on pace to run out. It is an estimate and is labelled as one: routing never leaves xAI because of it, and only the pace guard, if you turn it on, takes it into account.

### 5. Check it's working

1. Run `/router`. The dashboard opens at `http://127.0.0.1:47321`.
2. In **Route**, your connected providers appear in your order, and the one serving your session is marked.
3. Send a message, and it appears under **Running now**, then in the totals.
4. Problems are written to `~/.local/share/opencode-quota-router/router.log`.

**Want to watch before it acts?** Run `/router dry-run on`. Routing decisions are recorded in the dashboard's routing log as "Would: …", and no session is moved and no retry is changed. `/router dry-run off` makes routing live again.

## How routing works

- **Within a turn.** A failed request is classified as a throttle, overload, window used up, billing problem or auth failure.
  - Short throttles (a `retry-after` of 20 s or less) retry on the same provider.
  - Anything else switches the session to the next provider inside OpenCode's retry hook. The same request runs again there, with no extra messages and no lost tool calls.
- **At the next turn.** The session moves to the highest-priority provider that's available, so it returns once a limit resets.
- **A move has a cost.** The new provider has no cache of the conversation, so the whole context is sent again at full price. A session that was just moved stays where it is for three minutes before returning up the chain, as long as the provider it is on still works; a session with 100k tokens of context or more waits up to a minute on a throttle before moving; and the routing log says what each move sends again, with a price for pay-per-use providers. Resetting a pool or ending a "save for later" returns sessions at their next turn.
- **Health is per pool and shared.** A pool is something that can run out: the Claude subscription, its per-model weekly limits, or an API key. Every session shares that health, and it survives restarts.
- **Reset times** come from the provider wherever possible: Claude's limit message, Copilot's `Retry-After`, Anthropic's monthly spend cap and rate-limit headers, Gemini's retry delay and midnight-Pacific daily reset, OpenRouter's `resets_at`, and a wait given in words ("retry after 26 seconds"). Otherwise a backing-off cooldown applies, and the provider is retried at a turn boundary.
- **A provider can be unwell without being limited.** quota-router measures how long each provider takes to start answering and how many of its requests fail. When half or more of a provider's last requests (five or more, in a quarter of an hour) failed for reasons that are not a limit, routing passes it over while another entry can run, and returns as the failures age out. With nothing else available it is still used. And where you give two providers the same `priority`, the one that starts answering clearly sooner goes first.
- **When everything is limited,** the request waits for the earliest reset, up to 30 minutes per retry. A failed session is continued once at that reset, if nothing else happened in it.
- **Your choice of model** sets the chain and effort level. Routing still uses the highest-priority provider with capacity; use `/router pin` to keep one session on one provider. The subagents a pinned session starts stay on that provider too, rather than going to the top of the chain; a subagent that starts elsewhere moves to its chain's entry for that provider.

**Want an agent on a cheaper chain?** `"agents": { "plan": "sonnet" }` (or `/router agent plan sonnet`) runs every session of the `plan` agent on the `sonnet` chain: the session moves to that chain's first available entry when it starts, and falls back along that chain. Picking a model yourself in a session outranks the rule for that session, until you select the agent again. This applies to the agent a session runs as. Subagents run on their parent session's model, and compaction and session titles run on the session's model; OpenCode does not let a plugin change those yet.

**Want a project kept away from some providers?** Rules per project say where its sessions may be routed. In your own settings:

```jsonc
"projects": {
  "~/work/client-x": { "deny": ["xai"], "denyKinds": ["local"], "chain": "sonnet" }
}
```

- `deny` lists providers never routed to, `denyKinds` shuts out every `subscription`, `metered` or `local` provider, and `allow`, when present, is the only set routed to.
- `chain` is the chain the project's sessions start on. An agent's own chain (above) outranks it, and so does a model you pick.
- The rule covers the directory and everything under it; the longest matching path wins.

A repository can also carry its own rules in `.opencode/quota-router.json` (`{ "deny": ["xai"] }`), which apply to anyone who opens it with quota-router installed. That file comes with the project, so it is not trusted: it can only shut providers out, never choose a chain or anything else, and it adds to your own rules rather than replacing them. It is read again within 15 seconds of a change.

A provider the rules shut out is never routed to, even when it is the only one left; the session then waits like it does when everything is limited. This is a routing rule, not a security control: quota-router cannot stop you picking a model by hand, and it leaves pinned sessions and models outside every chain where they are. `/router status` and `/router doctor` say when a session is on a provider its project shuts out.

**Want different rules in the evening or at the weekend?** Schedules apply a rule at certain times, in your machine's time zone:

```jsonc
"schedules": [
  { "name": "evenings", "from": "18:00", "to": "08:00", "first": ["local"] },
  { "name": "weekends", "days": ["sat", "sun"], "denyKinds": ["metered"] }
]
```

- `first` lists providers, or kinds of provider (`subscription`, `metered`, `local`), tried before the rest of the chain while the schedule applies. If they are limited or not running, the chain carries on as usual.
- `deny`, `denyKinds` and `allow` shut providers out while it applies, in the same way as project rules.
- `days` takes day names, `"weekdays"` or `"weekends"`; leave it out for every day. `from` and `to` are 24-hour times; leave both out for the whole day. A `from` later than `to` runs past midnight and belongs to the day it starts on.

Sessions move at their next turn after a schedule starts or ends, never in the middle of one. The dashboard's headline, `/router status` and `/router doctor` say which schedules apply now and until when.

**Want subagents to stop draining a plan that is running low?** With a usage check on, the dashboard says when a plan window is on pace to run out before it resets, for example "5-hour session on pace to run out at 15:40 · resets 17:00". The pace is measured over the recent part of the window (the last hour of a 5-hour window, about a day and a half of a weekly one). Turn on the pace guard with `/router pace on` or `"pace": { "enabled": true }`, and subagent sessions, plus any agents you list in `pace.lightAgents`, are routed to the next provider in their chain while that forecast stands, so what is left of the plan goes to your main session. It is a preference, not a rule: if nothing else in the chain can run, the subagent still uses the plan. A pin outranks it: the subagents of a pinned session stay on its provider.

**Is my plan the right size?** `/router advice`, or "Plan advice" on the dashboard, looks at the last 30 days on this machine: how often each subscription was limited and for how long, the busiest week the usage checks recorded, and what pay-per-use providers cost in that time. It says when a larger plan would have cost less than the fallback spend, and when the busiest week would have fitted in the plan below. It needs at least a week of recorded use, and the usage checks (step 4) for the peak figures and for the Claude plan, which is read from Claude Code's login (Pro, Max, Ultra, Team seats, Enterprise). Prices are list prices built into the plugin; they change, so check the provider's page before deciding, and correct them with `advisor.prices`. Nothing is sent anywhere.

**Want to keep a plan for later?** `/router save claude 2h` sets the Claude subscription aside for two hours, so what is left of its allowance is there for the work you want it for. Routing passes a saved provider over as if it were limited: sessions on it move to the next entry in their chain at their next turn, and return when the time is up or when you run `/router save claude off`. The dashboard has the same control on each subscription ("Save for 2 hours" and "Use now"). A saved provider stays saved across restarts. If every other entry in a chain is limited, the session waits; it does not fall back onto the provider you saved.

## Dashboard and menu bar

**Dashboard:** `http://127.0.0.1:47321` while OpenCode runs, or `/router`. Local only. It shows:
- totals (tokens, value at API prices, actual spend, savings, model time, fallbacks);
- efficiency: the share of input read from the cache, tokens per tool call, the share of requests that failed, and the time sessions spent waiting with every provider limited;
- the route, with each provider's live state, allowances, and what a million tokens costs there (what was charged on pay-per-use, otherwise the API price of the same mix, so providers can be compared; a subscription is not billed that amount);
- running sessions;
- a routing log grouped by day;
- notifications from the last 30 days;
- a health check of your setup;
- usage charts, breakdowns by model, project, agent and tool, and searchable sessions;
- CSV export.

**Settings page:** open the **⋯** menu and choose **Settings** (or go to `http://127.0.0.1:47321/#settings`) to change the common settings without editing files: routing, cut-over points, usage checks, spending caps, notifications, the status line, the telemetry export's identity fields, and how long detail is kept. A change applies at once and is checked first: a value out of range is refused with the reason next to the field. Changes are kept by the plugin on top of your `opencode.jsonc`, which is never written to; the page shows what the file says, and **Reset** goes back to it. Where the dashboard listens, where telemetry is sent and its headers, the local server addresses and `explicitProviders` can only be set in `opencode.jsonc`.

**Intelligent routing:** the dashboard's **Routing setup** offers a one-time AI analysis of your connected providers and coding models. Choose an analysis model and a goal (balanced, quality or making included allowances last). **Set up intelligent routing** adopts a validated preset on a fresh setup with no configured default or custom settings. If you already have a default or settings, analysis only proposes an improvement: review the ordered route and explanations, then choose **Use this intelligent route**. An existing default stays first and is never overwritten. If you later configure another default, the older preset steps aside.

The analysis sends only provider/model metadata and your routing goal to the selected model through OpenCode's stateless generation API—no sessions, tools, code, chats, project paths or credentials. It uses that model's allowance; a pay-per-use analyzer requires separate charge confirmation. Additional paid fallbacks are opt-in and kept last (except a paid default you already chose). There is one bounded request, not an AI call on every turn. Unknown models, unsupported effort levels, changes to your setup during analysis and malformed answers are refused without changing routing. Re-analyze when your catalogue changes; no background AI requests are made.

The accepted preset is an additional route with its own order, stored locally under `quota-router/intelligent`; your manual chains, provider priorities, spend caps and agent/project rules are kept. **Switch back to manual routes** removes the preset, without editing `opencode.jsonc` or moving pinned sessions. Models outside the preset still use their manual routes, or are left alone if none matches.

The Intelligent routing section starts collapsed on existing setups. **Expand/Collapse** remembers your choice; **Hide section** removes it entirely, and **⋯ → Show intelligent routing** brings it back. These browser-only display choices do not enable, disable or change routing.

Default protection checks the root `model` in local OpenCode configuration as well as model-registry overrides. If alternate, managed or unreadable sources make the default uncertain, recommendations remain review-only: no preset or default is applied until it can be verified.

**Model routes & suggestions:** a route (a “chain” in settings) lists alternative models for similar work. Expand a route to see the order requests actually try, what is disconnected and skipped, and the exact **after** preview for each suggestion. **Add to route** follows provider rank, so the new model may come before an existing one; **Use newer model** replaces one entry. Price matches are rough comparisons, not quality guarantees, and paid alternatives are labelled. Nothing changes until accepted. Additions can be removed, updates undone, and dismissed suggestions brought back with **Review dismissed suggestions**.

**Menu bar** (OpenCode Desktop only): a ring showing Claude's 5-hour window, with short status text. The text stays short so the item keeps its place in a full menu bar, and shows the Copilot estimate instead when that is the allowance about to run out. Its menu shows allowances, the route, running sessions, today's totals and quick actions. Turn it off with `"dashboard": { "menubar": false }`.

**Accessibility:** the dashboard works from the keyboard (a skip link, the menu with arrow keys and Escape, the usage chart with the left and right arrow keys) and with a screen reader (each chart has a summary and a data table, and actions say whether they worked). Text meets WCAG AA contrast in the dark and light schemes, motion stops when the system asks for less, and numbers, money and dates follow your browser's language.

**Status line:** the terminal shows, under the prompt, the provider the session is on and how full its tightest window is (`claude-agent 62%`). It turns amber from 90% and while the session runs on a fallback, when it also says when the provider it left is expected back (`xai · claude-agent back 21:40`), and red while every provider the session can use is limited. On the home screen it shows the provider a new session would start on. It reads the dashboard's `/api/status` feed every five seconds, so it needs the dashboard on; `"statusLine": false` hides it.

**Notifications:** quota-router tells you when a session falls back, when it returns, when every provider is limited, when a spend cap is reached, and when a usage check has been failing for ten minutes. They appear on the dashboard, in the menu bar's menu, and as toasts in the OpenCode terminal. Set `"notifications": { "system": true }` to also get them from the operating system (`osascript` on macOS, `notify-send` on Linux). The same thing is not repeated within a few minutes, there are never more than 20 an hour, and each kind can be turned off under `notifications.events`. A notification holds model and provider names and the reason for the change; never a prompt, a session title or any code.

On the dashboard, **Hide/Show** beside Notifications collapses or expands the whole section, **×** hides one notification, and **Restore hidden** brings hidden items back. These choices are remembered in that browser only; they do not turn off recording or change menu bar, terminal or system notifications.

**Telemetry export:** to see the same totals in Grafana, Datadog, Honeycomb or your own OpenTelemetry collector, set `"telemetry": { "enabled": true, "endpoint": "https://…" }`. It is off by default, sends counts and costs only, and identifies you or your projects only if you ask it to. See [docs/telemetry.md](docs/telemetry.md).

**Data:** `~/.local/share/opencode-quota-router/router.db` (SQLite) holds daily rollups, cached session totals and retention settings, sized for years of use. On first start, earlier usage is imported read-only from OpenCode's own database.

## Commands

| Command | Effect |
|---|---|
| `/router` | Open the dashboard |
| `/router pin` | Keep this session on its current model, and the subagents it starts on its provider |
| `/router unpin` | Route this session and its subagents again |
| `/router reset <pool or all>` | Clear a provider's limited state |
| `/router pause` | Pause routing for every session |
| `/router resume` | Resume routing for every session |
| `/router dry-run on` / `off` | Record what routing would do without moving any session |
| `/router save <provider> [2h]` | Set a provider aside for later: routing passes it over for `90m`, `2h`, `1d` or until a time such as `17:00` (two hours if left out, a week at most). `/router save <provider> off` ends it, `/router save off` ends all, `/router save` lists them |
| `/router agent <name> <chain>` | Run one agent's sessions on a chain, for example `/router agent plan sonnet`. `/router agent <name> off` ends it, `/router agent` lists them |
| `/router pace on` / `off` | Turn the pace guard on or off: subagents pass over a plan that is on pace to run out before it resets |
| `/router advice` | Plan advice: whether each subscription fits how you used it over the last 30 days |
| `/router doctor` | Run the health check and open it on the dashboard. The note left in the session lists only what needs attention; `/router doctor full` puts the whole list there |
| `/router telemetry on` / `off` | Turn the OpenTelemetry export on or off (the endpoint comes from `opencode.jsonc` or `OTEL_*`) |

Commands that change a setting store it in the plugin's own database, on top of your `opencode.jsonc`, which is never written to.

## Command line

`quota-router` shows your usage and limits from a terminal, including tools other than OpenCode. Install it with `npm install -g opencode-quota-router` (or `npm link` in a clone). If you'd like it shorter, add `alias qr=quota-router` to your shell's profile.

| Command | What it shows |
|---|---|
| `quota-router usage` | Tokens and their value at API prices from the logs Claude Code, Codex and OpenCode keep on this machine, by day. `--by model`, `--by source` or `--by project`; `--range today`, `30d`, `90d` or `all`; `--source codex` (or a comma-separated list); `--json` |
| `quota-router limits` | Plan windows and when they reset: Codex from its own logs, Claude, ChatGPT and Copilot from the plugin while OpenCode runs |
| `quota-router status` | What the plugin is doing now: each provider's state, running sessions, today's totals |
| `quota-router prompt` | One short line for your shell prompt, the same as the terminal's status line (`claude-agent 62%`). Prints nothing when OpenCode isn't running |
| `quota-router doctor` | The plugin's health check; exits with 1 when a check fails |
| `quota-router open` | Opens the dashboard |

`usage` and `limits` work without OpenCode running. They only read the logs, never change them, and keep a cache of what they've read in `~/.cache/quota-router` (readable only by you) so later runs take a fraction of a second. Values use the same list prices as the dashboard: the plugin keeps a copy of the prices OpenCode gives it, and `usage` falls back to OpenCode's model catalogue file (`~/.cache/opencode/models.json`), which can be weeks old, for models the plugin hasn't seen. A model with no list price in either is marked and left out of the value. Cursor keeps no token counts on disk, so it can't be included. OpenCode's Claude subscription runs Claude Code underneath, which logs the same requests again; those are counted once, as OpenCode's.

To show the status line in your shell prompt, call `quota-router prompt` from it. It answers within half a second and prints nothing when there's nothing to show. For example, in zsh:

```sh
setopt prompt_subst
RPROMPT='$(quota-router prompt)'
```

or as a [Starship](https://starship.rs) custom module:

```toml
[custom.quota]
command = "quota-router prompt --no-color"
when = true
```

## LiteLLM

The same limit handling is available for [LiteLLM](https://docs.litellm.ai) as one Python file: [`integrations/litellm`](integrations/litellm). Add it as a callback to a LiteLLM Router or Proxy. After a deployment hits a limit, it sets that deployment aside until the limit resets, so requests go to the model group's other deployments.

## Claude Code Router (experimental)

If you also use [Claude Code Router](https://github.com/musistudio/claude-code-router), a CCR routing rule in [`integrations/claude-code-router`](integrations/claude-code-router) starts its requests on a provider quota-router knows has room, and puts limited ones at the end of the chain CCR falls back through.

## Configuration reference

All options go under the plugin's `options` in `opencode.jsonc`. Defaults are in [`src/engine/config.ts`](src/engine/config.ts).

| Option | Default | Meaning |
|---|---|---|
| `dryRun` | false | Record routing decisions without applying them |
| `providers.<id>.priority` | 1–5 as above | Lower is tried first. Chains are sorted by it. |
| `providers.<id>.allow` | `always` | `never` keeps a provider out of routing |
| `chains.<name>` | see above | A list of `provider/model#variant` replaces the chain; an object of `provider: model` (or `null`) changes single entries; `null` removes the chain |
| `agents.<name>` | none | The chain an agent's sessions use, for example `"agents": { "plan": "sonnet" }`. Without an entry, the session's model decides the chain |
| `providers.<id>.kind` | detected | `subscription`, `metered` or `local`; set it to override what discovery detects |
| `discovery.enabled` | true | Rank and show every connected provider, not only the ones listed here |
| `chatgpt.cutoverAtPct` / `warnAtPct` | 98 / 85 | Leave a ChatGPT plan before its 5-hour or weekly window is spent |
| `throttle.maxWaitMs` / `inPlaceRetries` | 20000 / 2 | Short throttles retried on the same provider |
| `switching.minStayMs` | 3 min | After routing moves a session, how long it stays before returning up the chain, while the provider it is on still works |
| `switching.largeContextTokens` / `largeContextMaxWaitMs` | 100000 / 60000 | A session with this much context waits this long on a throttle before it moves |
| `onExhausted.mode` / `maxWaitMs` | `wait` / 30 min | When everything is limited: wait for the earliest reset, or `fail` |
| `health.enabled` | true | Pass over a provider whose requests keep failing without a limit being the cause, while another entry can run |
| `health.windowMs` / `minRequests` / `maxErrorRate` | 15 min / 5 / 0.5 | What counts as failing: this share of at least this many requests in this period |
| `claude.usageProbe` | false | Check Claude subscription usage (see step 4) |
| `claude.avoidUsageCredits` / `cutoverAtPct` | true / 98 | Leave the subscription before usage credits are drawn |
| `claude.plan` / `copilot.plan` / `chatgpt.plan` | detected | The plan you are on, for plan advice, when it is not detected: `pro`, `max`, `ultra`, `team`, `enterprise`; `pro`, `pro+`, `max`, `business`, `enterprise`; `plus`, `pro` |
| `advisor.days` / `prices` | 30 / list prices | The period plan advice looks at, and corrections to its monthly list prices, for example `{ "claude.max": 100 }` |
| `copilot.usageProbe` | false | Check Copilot's monthly allowance (see step 4) |
| `copilot.avoidAdditionalCredits` / `reserveFraction` | true / 0.01 | Leave Copilot before paid credits beyond the allowance |
| `copilot.economyAtPct` / `economyOutputPrice` | 0 (off) / 15 | Once this much of the allowance is used, models priced at this many dollars per million output tokens or more go to another provider when one can run them |
| `openrouter.usageProbe` | false | Check how much of the OpenRouter key's spending limit is left (see step 4) |
| `openrouter.reserveUsd` | 0 | Dollars of that limit kept back, to absorb requests already under way |
| `local.healthCheck` | true | Ask Ollama and LM Studio whether they are running and what is loaded; pass them over while they are not |
| `local.ollamaUrl` / `lmstudioUrl` | `http://127.0.0.1:11434` / `http://127.0.0.1:1234` | Where those servers listen. Only settable in `opencode.jsonc` |
| `copilot.monthlyCredits` | 0 (plan default) | Your included credits on a pooled Business or Enterprise seat |
| `projects.<directory>` | none | Rules for sessions in that directory: `deny`, `allow`, `denyKinds` and `chain` (see "How routing works"). `~` is your home directory |
| `schedules` | none | A list of rules that apply at certain times: `name`, `days`, `from`, `to`, and `first`, `deny`, `denyKinds` or `allow` (see "How routing works") |
| `pace.enabled` | false | Pace guard: subagents pass over a plan that is on pace to run out before it resets. Needs a usage check (step 4) or a ChatGPT sign-in |
| `pace.lightAgents` | none | Agents whose sessions are treated like subagents by the pace guard, for example `["explore"]` |
| `spend.dailyUsd` / `monthlyUsd` | 0 (no cap) | Most that pay-per-use providers may cost in a local day or month, in US dollars |
| `spend.providers.<id>.dailyUsd` / `monthlyUsd` | 0 (no cap) | The same, for one provider |
| `headers.observe` | anthropic, github-copilot | Providers whose rate-limit headers are read. Adding `openai` or `xai` turns off their WebSocket transport. |
| `statusLine` | true | Show the session's provider and how full its window is in the terminal's prompt footer |
| `notifications.enabled` | true | Record notifications and show them on the dashboard, in the menu bar and as terminal toasts |
| `notifications.system` | false | Also post them through the operating system (macOS and Linux) |
| `notifications.events.<kind>` | true | Turn one kind off: `fallback`, `return`, `allLimited`, `spendCap`, `usageCheck` |
| `telemetry.enabled` | false | Export usage, plan pressure and fallbacks to an OpenTelemetry collector; see [docs/telemetry.md](docs/telemetry.md) |
| `telemetry.endpoint` / `headers` | from `OTEL_*` | Where to send, and request headers such as an API key. HTTPS only, except to this machine |
| `telemetry.level` / `projects` | `totals` / `off` | `events` adds a log record per limit, switch and recovery; `hashed` or `names` splits usage by project |
| `telemetry.identity` | all empty | Opt-in `email`, `userId`, `organizationId`, `hostName` attributes |
| `dashboard.enabled` / `port` / `menubar` | true / 47321 / true | Local dashboard and menu bar item |
| `backfill` | true | Import earlier OpenCode usage on first start |
| `retention.toolsDays` / `executionsDays` / `snapshotsDays` / `poolLogDays` | 400 / 400 / 90 / 730 | Days of raw detail kept; rollups and requests are kept for good |
| `log.level` | `info` | `debug` logs every retry decision |

## Errors it handles

If you searched for one of these, this plugin is for you. Each is recognised, given a reset time where the provider reports one, and routed around.

| Provider | Error or message | What quota-router does |
|---|---|---|
| Claude subscription (Pro, Max, Team) | `Claude AI usage limit reached`, `You've hit your session limit · resets 3:45pm`, `You've hit your weekly limit`, `Opus limit reached` | Moves to the next provider until the stated reset; a per-model weekly limit only blocks that model family |
| Claude subscription | Usage credits being drawn after the window ends | Moves off before credits are used (with `claude.usageProbe`) |
| ChatGPT plan (Plus, Pro, Business) | `usage_limit_reached`, "The usage limit has been reached" | Moves on until `resets_at`; with ChatGPT signed in, leaves at 98% of the 5-hour or weekly window |
| GitHub Copilot | `quota_exceeded`, "You have exceeded your monthly quota", premium requests or AI credits used up | Moves on until the monthly reset; can stop before paid credits beyond the allowance |
| xAI / SuperGrok | "You have used all available credits", spending limit reached | Moves on and retries after a cooldown |
| Anthropic API | `rate_limit_error` (429), `overloaded_error` (529), "Your credit balance is too low", monthly spend cap ("You will regain access on …") | Short throttles retry in place; the rest move on, a spend cap until the 1st of the month |
| OpenAI API | `insufficient_quota`, "You exceeded your current quota", `server_is_overloaded` | Moves on; a monthly limit until the 1st |
| Gemini API | `RESOURCE_EXHAUSTED` (429), "You exceeded your current quota", "The model is overloaded" (503) | A per-minute limit retries in place after the delay Google gives; a daily quota moves on until midnight Pacific time. Limits are per model, so other Gemini models stay usable |
| Vertex AI | "Resource exhausted, please try again later." | Treated as a short throttle on that model |
| OpenRouter | "Insufficient credits" (402), "Key limit exceeded" (403), workspace and guardrail budgets, `in_flight_budget_exhausted`, `free-models-per-day`, "No available providers" | Out of credit, a key limit or a budget blocks OpenRouter, until `resets_at` where it is given; the in-flight budget is a short wait, since nothing has been spent; the free-model allowance only blocks `:free` models, until the reset in `X-RateLimit-Reset`; an upstream rate limit only concerns that model |
| Azure OpenAI | "exceeded token rate limit … Please retry after 26 seconds", `insufficient_quota` | Waits the stated time on that deployment; out of quota blocks the provider |
| Amazon Bedrock | `ThrottlingException`, "Too many tokens per day", `ServiceUnavailableException`, `ModelNotReadyException`, `ExpiredTokenException` | Throttles and outages concern that model; expired AWS credentials block the provider until you sign in again |
| Ollama Cloud, OpenCode Go, OpenCode Zen | "reached your hourly / weekly usage limit", OpenCode's `provider.go-limit`, `provider.free-limit` and `provider.budget-limit` errors | Moves on until the reset in the message, or for an hour, or until the 1st of the month, by the window named. These rules are written from the error types OpenCode defines and the wording the providers document, and have had less use than the rows above |
| Any provider | HTTP 429, 402, 5xx, timeouts, OpenCode's `provider.rate-limit` and `provider.quota` errors | Classified as throttle, overload, window or billing, and handled the same way |

Errors that a different model wouldn't fix (content filters, invalid requests, context too long, permission denials) are never routed.

## FAQ

**How do I keep working in OpenCode when Claude hits its 5-hour limit?**
Install quota-router and connect at least one other provider: Copilot, ChatGPT, an API key or a local model. When Claude reports the limit, the same request runs on the next provider, and the session moves back to Claude after the reset time Claude gave.

**Does it work with Claude Code, Codex or Cursor?**
No. It's an OpenCode plugin and uses OpenCode's retry and routing hooks. It does use your Claude subscription through OpenCode's Claude provider, and your ChatGPT plan through "Sign in with ChatGPT".

**Will it spend money without asking?**
Only on providers you've connected with an API key, and only when every subscription ahead of them is limited. Set `"allow": "never"` on a provider to keep it out, or cap what routing may spend:

```jsonc
"spend": { "dailyUsd": 10, "monthlyUsd": 100, "providers": { "openai": { "dailyUsd": 3 } } }
```

Once a cap is reached, routing passes that provider over until the day or month ends, and a session already on it moves to another provider at its next turn if one is free. Spend is counted from the requests quota-router recorded, so a request in flight can take it slightly past the cap, and a cap doesn't stop you picking a pay-per-use model yourself in a pinned session. The dashboard shows actual spend separately from the value of your subscription use.

**Can I use a local model as the last resort?**
Yes. Connect Ollama, LM Studio or vLLM in OpenCode, then add the suggested entry on the dashboard or set it in `chains`. Local models rank last and count as free.

**Can I prefer GPT, Gemini or Grok instead of Claude?**
Yes. Give that provider the lowest `priority`, and change any chain entry with `"chains": { "opus": { "<provider>": "<model>" } }`.

**How is this different from opencode-rate-limit-fallback?**
[opencode-rate-limit-fallback](https://github.com/azumag/opencode-rate-limit-fallback) is a well-established general fallback list with retry policies and a circuit breaker. quota-router is built around subscription plans. It reads plan usage and exact reset times to move before a limit and back after it, keeps effort levels across providers, avoids paid overage, and adds a usage and cost dashboard. Pick the one that matches how you pay for models.

**Does it send my data anywhere?**
Not unless you tell it to. Everything stays on your machine. The optional [telemetry export](docs/telemetry.md) is off by default and sends token counts, costs and fallback counts to an endpoint you choose; never prompts, code or session titles. The optional usage checks call the same endpoints Claude Code and Copilot use, with logins that are already on your machine; see [SECURITY.md](SECURITY.md).

## Troubleshooting

Start with `/router doctor`. It checks that routing is on, which providers are connected, whether every chain has somewhere to fall back to, whether the usage checks work, and that the dashboard and database are healthy, and it says what to change. The same check is under **Health check** at the bottom of the dashboard.

- **The dashboard doesn't open.** Check `router.log` for `dashboard` lines. If port 47321 is taken, the next free port up to 47325 is used, and `/router` opens the right one.
- **A session isn't routed.** Its model isn't in any chain. Pick a chain model, or add yours to `chains`.
- **A connected provider is never used.** It's in no chain yet. Add one of its suggested entries on the dashboard, or set it in `chains`.
- **"Usage check" messages on the dashboard.** The Claude check needs Claude Code to be logged in (`claude auth login`). An expired login refreshes the next time Claude Code runs.
- **The menu bar item doesn't appear.** It needs OpenCode Desktop and a built `dist/gui-experimental.cjs` (`npm run build`). After first adding it, restart OpenCode once.
- **Routing misbehaves.** Run `/router pause`, or use the dashboard's pause button, and open an issue with the relevant `router.log` lines. Remove anything private from them first.

## Development

```bash
npm install --ignore-scripts
npm test           # unit, harness and storage tests (Node 24, built-in SQLite)
npm run typecheck
npm run build      # menu bar bundle and command line (dist/)
python3 -m unittest discover -s integrations/litellm
```

- **Dashboard:** `src/dashboard/page.html`, read on every request.
- **Server code:** changes rebuild the plugin's core when saved, with no restart.
- **`package.json` exports:** changes need an OpenCode restart.

## How it's built

[docs/support.md](docs/support.md) lists the OpenCode, Node and operating system versions it is tested on. See [docs/how-it-works.md](docs/how-it-works.md) for the design: the error classifier, per-pool health shared across sessions, the router, the usage checks and the storage that keeps years of history small.

## License

[MIT](LICENSE)
