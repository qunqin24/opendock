<!-- SPDX-FileCopyrightText: Nova-Violet Role ORG -->
<!-- SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later -->
# 🔍 RTR-RE:Symbiose — Role-Type-Retrieval-RE:Symbiotized
**Short name: RE:Symbiose. RRF-heuristic, DTD-semantic-capable retriever + symbiotized context engine.
CPU-first. Local-first. Zero API cost.**

[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/saimonokuma) [![Open Source](https://img.shields.io/badge/Open-Source-9cf?style=for-the-badge)](https://github.com/Nova-Violet-Role) [![Copyleft](https://img.shields.io/badge/Licence-AGPL--3.0--or--later_OR_EUPL--1.2-634bA2?style=for-the-badge)](#-licence--philosophy)

> *Retrieval is not search. It is routing by role, parsing by type — and where the
> models disagree is where the ranking lives.*

---

### Two products, one family — the engine and the car

**RTR** (the separate `rtr-role-type-retrieval` repo) is the **engine**: the
retriever alone — dual-ONNX RRF ballot, DTD typing, Lexikon. It runs on its
own for its own crowd.

**RTR-RE** is the **car**: the RTR retriever **plus** the full context engine —
the Keeper (window), the Compressor (drain), the Manager (memory MCP), the
SymbioseWorker (background tickets), the engine-beneath (formal Lean battery),
the installer, and the live-tuning palette. The preset registry
(`execution/rtr_presets.json`) is shared by both products; the keeper presets
(trigger/target/max) are RTR-RE's section of it.

Three offices, zero overlap: the **Keeper** (native OpenCode plugin,
`opencode-plugin/rtr-re-keeper.js`) selects what stays in the window; the
**Compressor** keeps everything verbatim until the trigger preset, then cuts to
the target preset without pausing the live turn; and **RTR manages** what left
the window as typed, retrievable substance. Classic RAG is not extended here —
it is replaced by role-routed, DTD-typed retrieval, and the claim ships with
the instruments that can falsify it (binary Versus + graded gold bench in
`eval/`, every number re-runnable on your machine).

---

## 🚀 Try it now — the installer

RTR-RE is not installed; it is *entered*. Every platform ships the same
cinematic terminal installer — no browser, no network, just your platform:

| Platform | Launch | Personality |
|---|---|---|
| pip / uvx | `uvx rtr-re-install` | **The Instrument** — cool cyan, oscilloscope progress |
| npm | `npx rtr-re-installer` | **The Network** — magenta/violet, node-graph progress |
| GitHub | `git clone https://github.com/Nova-Violet-Role/RTR-RE.git && python installer/launchers/python_launcher.py --theme forge` | **The Forge** — charcoal/emerald, raw build-log stream |

Three presets (Quick MUGEN one-click, Custom component selection, Hardcore
full cockpit with **Recommended from Saimonokuma** badges), arcade remixes
of *Obsession* (See-Saw / Yuki Kajiura) that adapt tempo to your preset, and
the **MiDi-MoE-Symbiogen-000** easter egg at the end. The scene itself is a
DTD family member — declared in `installer/shell/dtd/rtrre-scene.mod`,
rendered by our own engine.

Then ask your agent: *"what did we decide about the installer last week?"* —
RTR-RE answers from its own memory, not from a fresh search. That's the
whole point: the engine keeps what left the window, typed and retrievable.

Manual setup, knobs, and the CLI path: [Quick start](#-quick-start-opencode)
and the [technical manual](README-PYPI.md).

---

## 📜 About

**RTR** is the persistent memory and retrieval layer for coding agents — first
opencode, then every CLI that speaks MCP. Two ONNX embedding models
(Snowflake Arctic-m 768 + BAAI bge-base 768) run on plain CPU, fused with
reciprocal rank fusion over a BM25 + recency + importance hybrid. Document
spans are pre-classified the DTD way — PCDATA, CDATA, NDATA — so the models
receive typed evidence instead of generic soup, and a lookup-first
Lexikon keeps expansion chilly.

**🎯 Mission** — Give every agent a memory that is local, measurable, and
honest: every recall number in `eval/` re-runs from real data on your machine.

**🌟 Vision** — Retrieval that converges: roles decide *what* is fetched,
types decide *how* it is read — the RoT × DtD meeting point.

**⚖️ Method** — *Reality is the judge.* The `eval/` bench pits RTR against
classic RAG on real documentation and prints the scoreboard as data, diagram,
and SVG. If one of our numbers is wrong, telling us is the most welcome
contribution we accept.

---

## 🏆 Origin — the hackathon that looked away (Creator note)

This project was originally intended to be released at the
**CerebralValley.ai hackathon**, for the **$1M prize**. Unfortunately, they
did not recognize the value of the project. So now **RTR-RE:Symbiose gets
released in the wild** instead — as part of the **Nova-Violet Role** GitHub
organization and on **PyPI**, with the complete evaluations included, even
more enhanced than the precedent RTR-Role-Type-Retrieval release. No jury,
no gatekeeper: the bench is the announcement, and every AI developer can
run it, break it, and tell us where.

## 🌍 Any CLI. Any Agent. Ask in Issues.

RTR today speaks MCP (opencode first). If you want RE:Symbiose adapted to
**any other CLI or agent in the world**, ask in the **Issue formulary** —
name the CLI/agent and how it loads tools, and the adaptation will be
delivered. Retrieval by role, parsing by type: the ballot box ports.

---

## ⚡ The three pillars

| # | Pillar | What it does |
|---|---|---|
| 1 | **Multi-query expansion over RRF** | Original + lexikon/alias + workspace-delta sub-queries (+ optional PRF), fused across models with reciprocal rank fusion. Rankings vote; raw scores never mix. |
| 2 | **DTD-typed retrieval** | Spans classified structurally — `PCDATA` prose (hybrid lane), `CDATA` code/ids/hashes/paths/URLs (exact-match lane), `NDATA` base64/non-text (masked, never embedded, always carrying its NOTATION). Grounded in the DocBook Definitive Guide and the DITA 2.0 architecture. |
| 3 | **Lexikon + zero regression** | Per-project and hand-curated `_global` user glossary; expansion is a lookup, not inference. Every release passes the `rtr_eval` golden gate — no ship on regression. |

Plus the plumbing that makes it disappear: `uvx` delivery (no clone, no sync),
multi-root projects with absolute paths anywhere, per-model ChromaDB
collections, 4+4 / 8+8 thread profiles, polyglot indexing (`.md`, `.nt`, `.yaml`).

### 🪶 Low-CPU friendly (measured)

RTR-RE is compatible with **any CPU**. The thread/parking axes trade speed
and memory, never retrieval quality — measured on a 32-thread host, scores
are flat from T4 to T16 (R@1 0.7208 on the DTD+keeper-memory subset) and
parking is quality-neutral. On low-end machines, **T2 or P20** make the
SSD act as the RAM-consumption mitigation (swap-friendly), so a small-RAM
system degrades gracefully instead of bloating. The dual-ONNX ensemble
(the only architecture whose thread budget actually scales) still leads
classic RAG at every operating point.

### 🏁 Bi-turbo philosophy & overseeding

Two powerplants — Arctic precision, bge recall — fused by RRF. Rally engineers
didn't twin-charge because one turbo was broken; they did it from love of the
paradigm, and the discoveries followed. Same here: the architecture takes any
fastembed model through one variable, and per-model collections make
overseeding **zero-migration**. Falsification is a contribution.

### 🔧 Recommendation — pick your turbos

| Your hardware | Suggestion | Why |
|---|---|---|
| 8 cores | default dual (arctic-m + bge-base), `balanced` 4+4 | the efficiency crown |
| 12–16 cores | same dual, `performance` 8+8 | headroom well spent |
| Strong CPU + RAM | `BAAI/bge-large-en-v1.5` and/or `Snowflake/snowflake-arctic-embed-l` (1024d) | precision ceiling rises with dim |
| Keyword-heavy corpus | try single `BAAI/bge-base-en-v1.5` | our bench: BM25-adjacent turf favors focus |

```bash
OPENCODE_MEMORY_EMBED_MODELS="BAAI/bge-large-en-v1.5,Snowflake/snowflake-arctic-embed-l"
rtr-cli index          # new collections fill; old ones: rtr-cli janitor
```

Bigger is not always better — measure on your corpus with
`eval/bench_versus.py` before you believe us. If your turbo wins, tell us;
an overseeding report with numbers is a first-class contribution.

---

## 🚀 Quick start (opencode, manual)

```jsonc
// opencode.jsonc
"mcp": {
  "memory": {
    "type": "local",
    "command": ["uvx", "--from", "rtr-role-type-retrieval", "rtr-mcp"],
    "enabled": true,
    "timeout": 180000,
    "environment": {
      "OPENCODE_MEMORY_RTR_PROFILE": "performance", // balanced 4+4 | performance 8+8
      "FASTEMBED_CACHE_PATH": "C:/Users/you/.config/opencode/memory/.fastembed_cache"
    }
  }
}
```

Then: `rtr-cli init <project path-or-name>` → `rtr-cli index` → memory tools
appear in every session. Full instruction density lives in
[`README-PYPI.md`](README-PYPI.md) — every env knob, every CLI, every other
agent CLI and local-LLM setup.

---

## 🧪 Evaluation

`eval/` holds the versus bench: **RTR vs classic RAG**, measured on real
documentation with a published taxonomy (self-retrieval, rare-term lookup,
conceptual recall, scoped vs global), rendered as Mermaid and SVG.

**The short version:** RTR-RE leads classic RAG on every corpus in the
frozen 1.1.0 baseline (combined R@1 0.6857 vs 0.5825), the keeper-memory
corpus retrieves evicted spans at R@1 1.0, and the infinite-memory claim
is measured, not asserted. Every number re-runs on your machine.

![RTR vs RAG — recall@3 by taxon](eval/versus.svg)

```
uvx --from <wheel> python -m execution.rtr_eval   # release gate (no regressal)
uv run python eval/bench_versus.py                 # full versus bench -> eval/results/
uv run python eval/bench_graded.py --queries eval/graded/queries-v2.json --qrels eval/graded/qrels-v2.json
```

Full tables, taxons, and the axis studies (thread-scaling, parking,
MUGEN taring) live in `eval/results/` and the technical manual.

### 🧬 Architecture expansion — Keeper × Compressor × Manager

The Keeper (native plugin) selects/protects/prunes the host window
between exchanges and sinks evicted spans before pruning — fail-open, async
where it matters, never a `/compact` pause. Live-tunable with no restart:
`/rtr status|hold|trigger|target|max|preset|enable|disable` writes the
watched project config the next exchange already honors, and every exchange
writes the status file the MCP viewport reads. The Compressor (Rolling-derived
planner + worker) plans the same bounds in Python, tickets background work,
retains at most 512 completed tickets. The Manager (memory MCP) is the
viewport: status, health, work-in-progress, plus retrieval (`memory_rtr_status`
reports all three offices; absent evidence reads absent). Self-install:
wheel ships the Keeper asset, `rtr-re-install-opencode` writes the plugin
and prints the config snippet; clean-venv smoke proves 26 MCP tools.

The engine-beneath is the formal Lean battery (`formal/Symbiose.lean`, built
against full Mathlib pinned v4.33.0) and its eval probe
(`eval/engine_beneath.py`): the typed lanes and the bounded loop are proven in
Lean, not just asserted in Python.

| Component | Path | What it is |
|---|---|---|
| Keeper (1.1.0) | `opencode-plugin/rtr-re-keeper.js` | window edge: selects, protects (`todowrite`), prunes, sinks first; fails open |
| Compressor | `execution/context_budget.py` + `execution/symbiose_worker.py` | verbatim until trigger, drain to target, background tickets, never pauses the turn |
| Manager | `execution/memory_engine.py` | memory MCP viewport: status/health/work-in-progress/retrieval, ≤512 tickets |
| Engine-beneath | `formal/Symbiose.lean`, `eval/engine_beneath.py` | Lean-proven typed lanes and bounded loop |
| Installer | `execution/install_opencode.py` | `rtr-re-install-opencode` writes the keeper plugin + config snippet |
| Live tuning | `opencode-plugin/rtr-re-tui.tsx` | ctrl+p palette commands (status/enable/disable/preset/cpu/modality/threads/parking/trigger/target/max) |
| Presets (shared) | `execution/rtr_presets.json` | keeper presets: re-symbiose-mugen 400k/200k/200 (default) · symbiose-ah 250k/100k/40 · fusion-ah 200k/100k/30 · re-symbiose 320k/128k/50 · legacy standard/calibrated/wide |
| .mjs edition | `mjs/` | no-MCP memory plugin for OpenCode + Claude Code / Codex hooks |

---

## 🥚 The Easter Egg — why this retriever thinks in roles, and where it is going

> *"Welcome to Ikebukuro — a city where countless stories intersect. And the
> solution **I found when inspecting how Models and Rankings vote together**.
> I continued to search. For a memory that never loses its head. Joy. The joy
> of recall **or the Artificial Memory**. Every document the protagonist of
> its own story. However, **what if** the faceless votes of the crowd
> **(the RRF consensus that derives from them)** converge on the one page
> that was lost?"*
> — Saimonokuma, **The Convergence Equation**

The original is the premise of *Durarara!!*: no single protagonist, only a
city where stories collide and something coherent walks out. The insertions
are RTR, and each one names a component that is now code:

| # | inserted | what it turned on |
|---|---|---|
| 1 | *"Models and Rankings **vote** together"* | the ensemble ballot. RRF fuses rankings, never raw scores — the Dollars vote faceless, and consensus needs no identity |
| 2 | *"memory that never loses its **head**"* | Celty's search is the product spec. Agents lose context the way she lost her head; retrieval is the city helping her find it |
| 3 | *"or the **Artificial Memory**"* | names the target: a memory that is constructed, persistent, local — what RTR ships |
| 4 | *"the **RRF consensus** that derives from them"* | points at `_fused_multi`. The intersection is a *mechanism*, not a mood |
| 5 | *"**what if** … **?**"* | turns an assertion into an open question — and the `eval/` bench is the instrument that answers it, per release |

### The same thing applies to RoT, our oT variants

Roles are turbos. Lenses, models, sub-queries — anything that can vote gets
a ballot and a weight, and the fusion never asks what stage anyone performed
on. That is the whole approach, and it ports: **whatever RoT routes by role,
RTR retrieves by role**, same ballot box.

### 🔮 Symbiose (the model) — announced, not shipped; RE:Symbiose (this engine) — shipped

Two different promises now share a root on purpose: **RE:Symbiose**, the
context engine in this release (Keeper × Compressor × Manager symbiotized),
and **Symbiose the model**, still announced below. The engine is the road
the model will drive on.

The coming model uses the same RoT approach to be **Dense and MoE at the
same time** — dense parameters that route like experts, experts that share
one dense heart — with the RTR approach fused in from the first layer rather
than bolted on after. When it lands, the bench will be the announcement:
same corpora, same taxons, no adjectives. Until then this paragraph is a
promise, and promises are not results.

> *— Note of (Saimonokuma) the Creator: rally engineers twin-charged out of
> love for the paradigm and rewrote the car world by accident. We run twin
> models for the same reason. If Symbiose does to AI what bi-turbo did to
> rally, it will be because somebody loved the convergence more than the
> crown.*

## 🥚➡️🐣 The Second Easter Egg — RE:HACK × Re:Digitize (the RE Saga)

> *"Welcome back to **The World** — a window that forgets nothing because
> everything in it was **digitized, not deleted**. I kept searching. For a
> **Data Drain** that takes only the bloat and leaves the **core** standing.
> Joy. The joy of logging in again and finding your partner **exactly where
> you raised them**. Every span a character with a story. However, **what
> if** the bracelet that was called a **cheat** was the only honest tool in
> the game — the one that **rewrites loss into data**?"*
> — Saimonokuma, **The Re:Digitize Equation** (original homage; motifs from
> the *.hack* saga, *Digimon World Re:Digitize*, and the wider RE saga —
> RE:Cheat, RE:Hack — re-told for this codebase, no line lifted)

Where the first Easter Egg dreamed in *Durarara!!* (a city of faceless
votes), this one dreams in the RE saga: worlds you **re-enter**, partners
you **raise**, data you **drain without destroying**. Each insertion is now
code:

| # | inserted / motif | what it turned on |
|---|---|---|
| 1 | *"Welcome back to **The World**"* (.hack) | the context window as a persistent world, not a buffer. You do not restart it — you **re-login**: restore-on-start (`SessionMemory`) puts goals, blockers and discoveries back on screen, bounded at 4000 chars so the login never floods the world |
| 2 | *"**digitized, not deleted**"* (Re:Digitize) | the whole RE:Symbiose thesis. Evicted read + written spans are **re-digitized** as DTD-shaped records into `.opencode/memory/` and the dual-ONNX index — they change world, they do not die. Compression loses position, never substance |
| 3 | *"**Data Drain** that takes only the bloat"* (.hack) | the Compressor: verbatim until the trigger preset, then a drain to the target preset, sink-first so nothing evicts unwritten. Like the Bracelet's Drain, it extracts what weighs the target down and leaves the **core** — protected tools, last user message, tool pairs — untouchable |
| 4 | *"finding your partner **exactly where you raised them**"* (Re:Digitize raising) | the concept lifecycle: candidate → emerging → **validated** → deprecated, raised session by session in the concept registry, materialized only when grown. A partner is not summoned; it is raised |
| 5 | *"the bracelet that was called a **cheat**"* (RE:Cheat) | the Keeper's bracelet: `permission: deny` looks like less power and is the strongest guard in the game — no second compressor can ever fire inside the window. The honest cheat: keeping substance after the cut, byte-exact, typed PCDATA/CDATA, NDATA masked like a virus core sealed, never executed |
| 6 | *"**what if** … **?**"* (the RE prefix itself) | RE = again. Every RE here is a re-entry with proof: **RE:Symbiose** (symbiotized again, denser), re-login (restore), re-digitize (evict→index), re-trieve (RRF ballot). And the question stays open on purpose — the official Versus tool in `eval/` is how The World answers, per release, in numbers |

The Epitaph of this codebase is written in its tests: three offices, zero
overlap, and a window that can grow forever because its past lives next
door — digitized, typed, and one search away.

### ♾️ Infinite Context / Memory / Loop — one unison

The RE saga citation is not decoration; it is the runtime diagram:

```
Context (live window) → Compressor (evict to the target preset, background, no pause)
  → Re:Digitize (verbatim typed spans) → Memory (dual-ONNX index)
  → Retrieval (RRF ballot) → Restore (bounded ≤4000 chars)
  → new Context → Session Commit → Memory …
```

Each iteration is bounded (trigger, target, caps); the **sequence is
unbounded**. That is the infinite loop as unison: context, memory and loop
are not three features — they are one circulation. A session can outlive
its window because nothing is summarized away into soup: substance changes
world (window → index) and returns by retrieval, exactly as a partner
re-digitized is the same partner, not a summary of one.

Characters merged by role (motif references, not verbatim citations):

| Fused figure | Saga sources | In this codebase |
|---|---|---|
| **The Bearer-Partner** | Kite + Taiga | `SymbioseWorker`: carries the drain, works beside you in the background, never seizes the turn |
| **The World-Memory** | Aura + Mirei (guide) | RTR Manager + Lexikon: what the world remembers, lookup-first, chilly, curated |
| **The Boundary Observer** | Helba + village elder | the Keeper: native plugin at the window edge — selects, protects, prunes, never summarises and never plays the game for you |
| **The Phases** | the Epitaph's Phases | staged thresholds — prune, trigger, target, emergency — each phase met in order, none skipped |
| **The Honest Cheat** | RE:Cheat motif + Twilight Bracelet | verbatim-after-cut: called a cheat because substance survives compression byte-exact; honest because types, hashes and tests prove it |

Citation discipline (applied to content, checked): every motif above names
a real mechanism with a file and a test — worker (`execution/symbiose_worker.py`),
keeper (`opencode-plugin/rtr-re-keeper.js`), manager (`execution/memory_engine.py`), loop
(`SessionMemory` commit/restore in the host), phases (calibration table in
`eval/results/`). A citation that maps to nothing measurable was cut.

### 🥚➡️🐣🐉 The RE:Hack expansion — Signs, Lumina, and the standalone World

The second egg dreamed in Re:Digitize; this expansion dreams in *.hack* —
Signs, Infection, Mutation, Outbreak, Quarantine, the Twilight Bracelet, Aura,
Morganna, Helba, the Epitaph tablets — each mapped to a file, a test, a bench:

| # | RE:Hack motif | what it turned on (all original pastiche, no line lifted) |
|---|---|---|
| 7 | *"the **Signs** before the wave"* | the doctor invariants in `eval/plates_graded.py`: forged combined refused by name before any plate renders — early warnings, not post-mortems |
| 8 | *"**Lumina**Fragment: memory as playable episodes"* | the Tessersect collages above: 104 captioned frames, four POVs, every number playable back to its artifact — media as evidence, not trailer |
| 9 | *"**Morganna's** infinite loop vs **Aura's** awakening"* | unbounded-context dream vs bounded-cycle engine: trigger/target/caps make infinity a circulation, not a crash — the infinite Context/Memory/Loop unison |
| 10 | *"the **Epitaph tablets** as append-only record"* | the standalone git history + geometry artifacts: the release tree is a tablet set — drift is a diff, never a rumor |
| 11 | *"**Helba's** backdoor that obeys the rules"* | the native Keeper: a first-party plugin that prunes only after sinking, fails open, and proves itself with 9/9 node tests — the honest backdoor |
| 12 | *"the **Twilight Bracelet** rewrite: cheat into contract"* | the STRUCT lane (`Lane.lean` + `structural_hits`): what looked like a cheat (grep as rank) became a typed lane with total/disjoint routing, a shared 0.15 cap, and fallback identity — then measured no-harm and shipped default-off |

Merged roles, one unison: Kite+Taiga carry (Worker), Aura+Mirei remember
(Manager+Lexikon), Helba+Elder watch (Keeper), the Bracelet drains (Compressor),
Morganna's loop is bounded by contract, and Aura wakes when retrieval finds the
evicted span exactly where it was raised (dummy3 0.9700, dummy4 0.9618).

## 🤝 Contributing

| Area | How you can help |
|---|---|
| 🎯 **Falsify a claim** | Prove one of our eval numbers wrong. Credited in the changelog. |
| 💻 **Code** | Pillars, profiles, new model slugs, new lanes |
| 📖 **Documentation** | An unanswerable question is our defect, not yours |
| 🧪 **Testing** | Break it on a platform we do not own, and tell us where |

## 💬 Connect

- **Org** — [Nova-Violet Role](https://github.com/Nova-Violet-Role), non-profit
- **Ko-fi** — [ko-fi.com/saimonokuma](https://ko-fi.com/saimonokuma) — buys time, never priority

## 📄 Licence & Philosophy

Our work is licensed **AGPL-3.0-or-later OR EUPL-1.2**. These are **copyleft**
licences, chosen deliberately over permissive ones: what is shared here cannot
be enclosed later, by anyone, including us.

🔓 **Open Source** — freely available, and freely *stays* available ·
🔬 **Falsifiable** — every claim re-runnable, reportable false ·
🎯 **Mission focused** — convergent frameworks, open to all

---

### ✨ Nova-Violet Role

*Decompiling Reality — One Framework at a Time*

[![Support Our Journey](https://img.shields.io/badge/❤️_Support_Our_Journey-Ko--fi-FF5E5B?style=for-the-badge)](https://ko-fi.com/saimonokuma)

© 2026 Nova-Violet Role · Non-Profit Organization — AGPL-3.0-or-later OR EUPL-1.2
