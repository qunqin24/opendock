<!--
  chisel — A tool for carving away excess.
  v2 — Minimalist. Precise. Complete.
-->

<p align="center">
  <img src="assets/logo.png" alt="chisel logo" height="64">
</p>

<p align="center">
  <strong>A tool for carving away excess.</strong><br>
  <a href="https://github.com/AdamMostofi/chisel"><img src="https://img.shields.io/badge/version-2.0.0-000?style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-555?style=flat-square" alt="License"></a>
  <a href="https://github.com/AdamMostofi/chisel"><img src="https://img.shields.io/github/stars/AdamMostofi/chisel?style=flat-square" alt="Stars"></a>
  <a href="."><img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square" alt="Language"></a>
  <br>
  <code>#yagni</code> <code>#minimal-code</code> <code>#ai-discipline</code> <code>#over-engineering-guard</code>
</p>

Chisel is a decision ladder for AI agents: YAGNI, Boy Scout, DRY, Rule of Three, Stdlib First. It catches over-engineering before it happens.

---

## What is Chisel?

Carve away everything that isn't the solution. Language-agnostic. Structural, not syntactic.

---

## Principles

<div align="center">

| Principle | Meaning |
|-----------|---------|
| **YAGNI** | Only build what's needed now. Speculation is waste. |
| **Boy Scout** | Leave every file cleaner than you found it. |
| **DRY** | Same knowledge lives once. Shape duplication is not knowledge duplication. |
| **Rule of Three** | 1 instance = fact. 2 = coincidence. 3 = pattern. Extract at 3. |
| **Stdlib First** | Stdlib > new dep. Native > library. `<input type="date">` over a date-picker library. |
| **Bug Fix = Root Cause** | Grep every caller. Fix where all callers route through, not where the ticket says. |
| **Comment Convention** | `chisel:` prefix. Name the ceiling + upgrade path. |

</div>

---

## How It Works -- Two-Pass Model

### Pass 1 -- The Ladder

An 8-rung decision ladder. Climb sequentially. Stop at the first rung that holds. Each rung filters out a class of over-engineering before you reach for your editor.

1. **YAGNI** -- Does this need to exist at all? Speculative need = skip it.
2. **Boy Scout** -- If touching existing files, leave them cleaner than found.
3. **DRY** -- Already in this codebase? Reuse before rewrite.
4. **Stdlib** -- Standard library covers it? Use it.
5. **Native** -- Platform feature covers it? `<input type="date">` over a picker library.
6. **Installed dep** -- Already-installed package solves it? Use it. Never add a new one for what a few lines can do.
7. **One line** -- Can it be one line? Write one line.
8. **Minimum code** -- Write the minimum that works.

The ladder is a reflex, not a research project. But it runs after you understand the problem. Read the task and the code it touches first. Trace the real flow end to end. Then climb.

### Pass 2 -- The Discipline Gate

A diff-driven audit that scans the actual change after every write (in full mode). It checks:

- **Touched files** -- were they left cleaner than found? Delete dead code, tighten loose patterns.
- **New abstractions** -- Rule of Three check. Fewer than 3 instances? Warn. No interface with one implementation. No factory for one product.
- **New dependencies** -- stdlib or native platform could replace them? Flag.
- **`chisel:` comments** -- does each name a ceiling and an upgrade path? Verify.

Outputs a structured verdict: ship if clean, revise if any check fails.

---

## Auto vs Manual

This is the critical clarification. The system has two operating modes and a set of always-active safety guardrails.

<div align="center">

| Aspect | Behavior |
|--------|----------|
| Pass 1 (Ladder) | Runs automatically on every coding turn. The agent always climbs the ladder before writing code. No toggle. |
| Pass 2 (Gate) | In `full` mode: auto-runs after every write. In `lite` mode: manual via `/chisel-gate`. |
| Safety Guardrails | Baked into the skill definition. Never simplified away. Always active regardless of mode. |
| User Override | User says "build the full version" -- chisel steps aside. Delivers what was asked. No re-arguing. |

</div>

---

## Safety -- Baked In

These boundaries are part of the skill definition itself. They do not depend on mode. They are never touched by chisel.

- **Input validation at trust boundaries** -- type checks, schema validation, sanitization at HTTP/file/env boundaries.
- **Error handling that prevents data loss** -- transaction rollback, partial-write safeguards, distinct catch blocks.
- **Security measures** -- authentication, authorization, rate limits, CSRF tokens, CSP headers, encryption, secrets management.
- **Accessibility basics** -- ARIA labels, keyboard navigation, focus management, color contrast, screen-reader semantics.
- **Anything the user explicitly requests** -- if the user says "I need the full version," build it. No re-arguing.
- **Hardware calibration knobs** -- real clocks drift, real sensors read off. Leave the knob.

Never chisel on understanding. The ladder shortens the solution, never the reading. Trace the whole thing first -- every file the change touches, the actual flow, the data that moves through it -- before picking a rung. Disciplined laziness that skips comprehension ships a confident wrong fix. Read fully, then carve.

---

## Before / After

Reference implementations of common tasks. Each pair implements the same spec. The difference is structural, not functional.

### Date picker

A date-of-birth input with age validation (must be 13+).

```
  Before: flatpickr library, wrapper component, CSS import, JS event handlers,
          age validation function, error display logic -- 52 lines, 1 dependency
  After:  <input type="date"> with min/max attributes -- 5 lines, zero dependencies,
          native browser date picker UX
  -------------------------------------------------------------------------------------
  -90% LOC  -100% deps  -1 library  +native date picker
```

### Rate limiter

A decorator that limits function calls to N per time window.

```
  Before: RateLimitExceeded exception class, RateLimiter class with lock management,
          acquire/release protocol, __call__ for decorator support -- 46 lines,
          3 imports, 3 abstractions
  After:  closure with threading.Lock(), @wraps(fn) -- 22 lines, same imports,
          1 function factory, reuses built-in Lock
  -------------------------------------------------------------------------------------
  -52% LOC  -67% abstractions  -1 exception class  +closure over class
```

### Order processing pipeline

Business-logic pipeline: order validation, tiered discounts, regional tax, invoice output.

```
  Before: 5 dataclasses, 2 Enum classes, 2 ABCs, 5 strategy subclasses, 2 factories,
          validation pipeline class, InvoiceGenerator class, OrderProcessor
          orchestration class -- 236 lines, 41 abstractions, 7 imports
  After:  dict input, top-level function, simple conditional logic, list comprehension
          for batch processing -- 32 lines, 2 functions, 1 import
  -------------------------------------------------------------------------------------
  -86% LOC  -95% abstractions  -80% deps  -78% complexity
```

---

## Benchmark Results

Analytical comparison of no-skill vs chiseled reference implementations for 7 tasks (6 simple + 1 complex business pipeline). Reference implementations are hand-written to the same spec -- the difference is structural, not functional.

### Combined (All 7 Tasks)

<div align="center">

```text
Metric                No-skill    Chiseled    Reduction
──────────────────────────────────────────────────────────
Lines of code          567          104          -82%
Tokens (est.)        3,588          944          -74%
Dependencies            14            6          -57%
Abstractions            64            8          -88%
Complexity             140           31          -78%
File size          15,954 B      3,397 B         -79%
```

</div>

### Simple Tasks (6)

<div align="center">

```text
Metric                No-skill    Chiseled    Reduction
──────────────────────────────────────────────────────────
Lines of code          331           72          -78%
Tokens (est.)        2,259          550          -76%
Dependencies             9            5          -44%
Abstractions            23            6          -74%
Complexity              71           17          -76%
File size           9,610 B      2,145 B         -78%
```

</div>

### Complex Task (Order Pipeline)

<div align="center">

```text
Metric                No-skill    Chiseled    Reduction
──────────────────────────────────────────────────────────
Lines of code          236           32          -86%
Tokens (est.)        1,329          394          -70%
Dependencies             5            1          -80%
Abstractions            41            2          -95%
Complexity              69           14          -80%
File size           6,344 B      1,252 B         -80%
```

</div>

Results represent the ceiling of what chisel enables. Real LLM output varies but converges toward these numbers. Methodology and reference implementations in [benchmarks/](benchmarks/).

---

## Install

Add to your `opencode.json`:

```json
{ "plugin": ["@adammostofi/chisel"] }
```

Or point at a local checkout:

```json
{ "plugin": ["./path/to/chisel/.opencode/plugins/chisel.mjs"] }
```

---

## Commands

<div align="center">

| Command | What it does |
|---------|-------------|
| `/chisel` | Report current mode (full, lite, or off). |
| `/chisel full` | Set full mode (ladder + auto discipline gate). |
| `/chisel lite` | Set lite mode (ladder only, manual gate). |
| `/chisel off` | Disable chisel. |
| `/chisel-gate` | Trigger discipline gate manually (lite mode). |

</div>

---

## Why "chisel"?

A chisel is a tool for carving away everything that is not the solution. Each strike is deliberate. You do not chisel blindly -- you read the grain first (understand the problem), then carve.

The name reflects the philosophy: the best code is the code never written. The best abstraction is the one you did not create until the pattern proved itself across three real instances. You do not build for speculation. You build for the shape that exists today, and you leave every file you touch cleaner than you found it.

---

## FAQ

<details>
<summary><strong>Does this mean I can't write abstractions?</strong></summary>
<p>No. It means prove the pattern first. The Rule of Three: 3+ concrete instances before extracting shared code. One instance is a fact. Two is a coincidence. Three is a pattern. Extract at three and let the friction between the instances tell you what shape the abstraction should take.</p>
</details>

<details>
<summary><strong>What about performance-critical code?</strong></summary>
<p>The ladder picks edge-case-correct options. When two stdlib options are equally terse, the tiebreaker is correctness on empty inputs, boundary values, and edge states. Performance is not sacrificed -- unnecessary code is removed. The code that remains does less, so it runs faster.</p>
</details>

<details>
<summary><strong>What if I need the full version of something?</strong></summary>
<p>Build it. The Safety section explicitly exempts anything the user asks for. If you say "I need the full configurable version," chisel delivers it without re-arguing.</p>
</details>

<details>
<summary><strong>Does this work with TypeScript / Python / Go / Rust?</strong></summary>
<p>Yes. The ladder is language-agnostic. Stdlib means your language's standard library. Native means your platform (browser, OS, database engine). The principles apply to any code in any language.</p>
</details>

<details>
<summary><strong>How is this different from a linter or formatter?</strong></summary>
<p>Linters enforce syntax and style. Chisel enforces structural discipline -- whether code should exist at all, whether it is shaped correctly, whether the abstractions are premature, whether the dependencies are necessary. Chisel catches things linters cannot: YAGNI violations, missing <code>chisel:</code> comments, and Rule of Three failures.</p>
</details>

<details>
<summary><strong>Do I have to use every rung?</strong></summary>
<p>No. Stop at the first rung that holds. If stdlib covers it (rung 4), you never reach rungs 5-8. The ladder is a filter, not a checklist. Climb only until you find your answer, then stop.</p>
</details>

<details>
<summary><strong>What if I disagree with chisel?</strong></summary>
<p>Use <code>/chisel off</code> to disable it entirely, or ask for the full version of a specific piece of code. Chisel never re-argues once you make the call.</p>
</details>

---

## License

MIT. The shortest license that works.
