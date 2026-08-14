<p align="center">
  <img src="assets/logo.png" width="260" alt="frugal — the guy who just found a $0.30 charge he does not recognize" />
</p>

<h1 align="center">frugal</h1>

<p align="center"><b>Cloud cost awareness for coding agents.</b></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@yuanbopang/frugal"><img src="https://img.shields.io/npm/v/%40yuanbopang%2Ffrugal?color=cb3837&label=npm" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
  <a href="https://github.com/yuanboP/frugal/actions/workflows/test.yml"><img src="https://github.com/yuanboP/frugal/actions/workflows/test.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/services-22%20groups-blue" alt="22 service groups" />
  <img src="https://img.shields.io/badge/hosts-11%2B-8A2BE2" alt="11+ hosts" />
</p>

<p align="center">English | <a href="README.zh.md">简体中文</a></p>

---

Agents deploy to Vercel, spin up Neon databases, run E2B sandboxes, push
commits that trigger GitHub Actions — all metered — and non-technical users
only find out on the monthly bill. frugal makes the agent spend consciously:
surface free-tier numbers and fail-open vs hard-pause on first touch, optional
usage digs, one-line notice before lasting paid resources, and tear down of
what it left running. It never blocks the command.

Works across Claude Code, Codex, GitHub Copilot, Qoder, Gemini CLI, OpenCode,
pi, Cursor, Windsurf, Cline, and Kiro — one ruleset, one source of truth.

### Why a plugin, not “just tell the model to be careful”?

LLMs ship with **frozen training-cut knowledge** of free tiers, defaults, and
“how this cloud bills.” Cloud pricing and fail-open traps move every quarter
(Workflows per-step billing, Spend Management notify-only, free-tier cliffs).
The model still “remembers” last year’s story.

frugal keeps the numbers and tripwires **in the repo** — versioned, researched,
testable — and injects them into the agent loop on each session / pre-CLI hit.
Update the package (or pull the repo) and the loop gets **current billing**,
not whatever the weights last memorized.

## How it saves you money

Two layers, both context-cheap (~1.7 KB of rules per session + at most 5
full reminders per day — after that, new services still get a numbers-only
line — never blocking), with intensity levels like a volume knob:

| Level | Session + inject | When to use |
|---|---|---|
| **quiet** | Free-tier / key quota numbers only | Hate noise but still want numbers |
| **normal** (default) | Numbers + one trap; dig optional | Most people |
| **strict** | + real-bill context; confirm scary actions | Non-technical / vibe-coding |

- **Session rules** (SessionStart): one short line on first touch, announce
  lasting paid resources, kill ephemeral things, escalate only for scary spend.
- **Just-in-time data** (PreToolUse): `vercel` → short Vercel line,
  `wrangler r2` → R2, `git push` with workflows → Actions — once per provider
  per session. Horror-dollar amounts stay in **strict** (and the skill), not
  every deploy.

This is scoped to **normal usage that quietly runs up a bill** — wrong
tier, a forgotten resource, a loop that hits a paid meter, a config default
nobody checked. Not credential leaks or fraud; that's a security problem,
not a billing-awareness one. Real incidents from the 272-story X corpus
this plugin internalizes — and the tripwire that now fires first:

| Real bill | What happened | frugal tripwire |
|---|---|---|
| **$36,000/mo** | Cloudflare queue re-enqueue loop (3.13B KV writes) | `wrangler` → "NO hard cap anywhere on CF — guard recursion" |
| **$104,000** | Netlify viral-traffic bill (pre-reform) | `netlify` → credits system + hard-pause explained |
| **$46,000** | viral traffic hit Vercel; Spend Management only emailed | `vercel` → Spend Management notifies at $200 — enable auto-pause |
| **$25,672** | GCP spend blew past a $10 budget (alerts lag 24-48h) | rule: **alerts are not brakes** — pair with quota caps |
| **~$700/mo** | agent push loop running full CI on macOS runners | `git push` with workflows → timeout-minutes + concurrency + macOS≈10x |
| **$5,000/mo** | Firestore useEffect read loop at 100 users | `firebase` → per-READ billing + maxInstances + recursion check |
| **$1,200** | Claude CLI silently billing API instead of subscription | `claude` with `ANTHROPIC_API_KEY` set → dual-rail warning |

## What it does

**1. Session rules** — injected at session start (mode-scaled).

**2. In-the-moment reminders** — PreToolUse watches shell commands. Mode
picks how loud each hit is — once per provider per session, never blocking:

```
# normal (default) — free-tier numbers + one trap; dig optional
frugal: Vercel — Hobby (non-commercial): 1M inv + 1M edge reqs, 360 GB-hr mem,
100 GB transfer, 100 deploys/day — hard-pauses ~30d at quota. Pro fails open.
Spend Management defaults to notify-only at $200 — enable its auto-pause for
a real stop. Optional: `vercel usage`.
```

`brief` always carries the decisive free-tier numbers (what agent needs to
reason). Horror dollars stay in **strict**. Dig is optional (skip if no creds).
Detection is sub-service aware: `wrangler r2`, `gh workflow run`, `git push`
with workflows, dual-rail agent CLI when an API key is in the env.

**3. Researched quota data** — the reminders and the skill's cheat-sheet
carry real numbers (researched 2026-07, dual-engine: parallel Claude web
research + grok CLI runs per provider, cross-checked against official
pricing pages). Full plan tables, overage prices, cost traps, and sources:
[`skills/frugal/references/providers.md`](skills/frugal/references/providers.md).
The complete raw research — both engines' reports per provider plus the
merged machine-readable factsheets — is archived in
[`research/`](research/).

Covered: Vercel, Cloudflare (Workers/R2/KV/D1), Neon, Railway, Fly.io, E2B,
Browserbase, GitHub (Actions/Codespaces), Supabase, AWS/GCP/Azure,
Terraform/Pulumi.

**4. `/frugal`** — cheat-sheet + spend audit. Levels:
`/frugal quiet|normal|strict|off`, persist with `/frugal default <level>`,
or set `FRUGAL_MODE` / `~/.config/frugal/config.json`.

## Install

npm package: [`@yuanbopang/frugal`](https://www.npmjs.com/package/@yuanbopang/frugal)

### Claude Code

```
/plugin marketplace add yuanboP/frugal
/plugin install frugal
```

Start a new session; you should see `FRUGAL MODE ACTIVE — level: normal`.

### Codex

```
codex plugin marketplace add yuanboP/frugal
codex plugin add frugal@frugal
```

Same hooks, Codex-shaped output (detected via `PLUGIN_DATA`). Covers the
Codex desktop app too — restart it after installing.

### GitHub Copilot CLI

```
copilot plugin marketplace add yuanboP/frugal
copilot plugin install frugal@frugal
```

Or the slash equivalents inside a session (`/plugin marketplace add ...`).
Session-start injection via `hooks/copilot-hooks.json`.

### grok

```
grok plugin install https://github.com/yuanboP/frugal.git --trust
```

The skill (rules + cheat-sheet) activates on billing/deploy topics; grok
does not execute Claude-style lifecycle hooks.

### Gemini CLI

```
gemini extensions install https://github.com/yuanboP/frugal
```

Loads `AGENTS.md` as always-on context via `gemini-extension.json`.

### OpenCode

```json
{ "plugin": ["@yuanbopang/frugal"] }
```

Or from a checkout: `{ "plugin": ["./.opencode/plugins/frugal.mjs"] }`.
Appends the ruleset every turn and registers the skills directory.

### pi

```
pi install git:github.com/yuanboP/frugal
```

Injects the ruleset via `before_agent_start`.

### Cursor / Windsurf / Cline / Kiro

Static rule copies ship in `.cursor/rules/`, `.windsurf/rules/`,
`.clinerules/`, `.kiro/steering/` — picked up automatically from a checkout.
Cursor user-level install: copy `.cursor/rules/frugal.mdc` to
`~/.cursor/rules/`.

### Qoder / CodeWhale / Swival (AGENTS.md hosts)

These auto-load `AGENTS.md` from the repo root — zero setup from a checkout.
Qoder can additionally wire the per-command reminder via
`hooks/qoder-hooks.json`.

## How it works

| Piece | Role |
|---|---|
| `skills/frugal/SKILL.md` | On-demand cheat-sheet + full rules for explicit `/frugal` asks. |
| `skills/frugal/references/providers.md` | Full researched quota/plan/trap tables with sources. |
| `hooks/frugal-config.js` | Mode resolution: env → session flag → config file → `normal`. |
| `hooks/frugal-runtime.js` | Host detection (env vars) + per-host hook output shapes. |
| `hooks/frugal-activate.js` | SessionStart: inject mode-scaled AGENTS.md. |
| `hooks/frugal-mode-tracker.js` | UserPromptSubmit: `/frugal quiet\|normal\|strict\|off`. |
| `hooks/frugal-pretool.js` | PreToolUse(Bash): mode-scaled reminder via `providers.js`. |
| `hooks/providers.js` | Provider table: `brief` / `trap` / `horror` / `dig` layers. |
| `AGENTS.md` | Compact ruleset — canonical body for static rule copies. |
| `scripts/check-rule-copies.js` | Drift guard: static copies must equal AGENTS.md. |
| `scripts/check-versions.js` | All 8 manifests share one version. |

### Static rule copies

Edit `AGENTS.md`, then regenerate:

```bash
BODY=$(cat AGENTS.md)
printf -- '---\ndescription: Cloud cost awareness — spend consciously on metered services\nglobs:\nalwaysApply: true\n---\n\n%s\n' "$BODY" > .cursor/rules/frugal.mdc
printf -- '---\ntitle: Frugal\ninclusion: always\n---\n\n%s\n' "$BODY" > .kiro/steering/frugal.md
for f in .windsurf/rules/frugal.md .clinerules/frugal.md .qoder/rules/frugal.md .github/copilot-instructions.md .agents/rules/frugal.md; do printf -- '%s\n' "$BODY" > "$f"; done
```

`npm test` fails if they drift.

## Development

```bash
npm test   # detection tests + rule-copy drift guard + version consistency
```

Pipe-test the hooks directly:

```bash
node hooks/frugal-activate.js
echo '{"session_id":"t1","tool_input":{"command":"npx vercel deploy"}}' | node hooks/frugal-pretool.js
```

## License

MIT
