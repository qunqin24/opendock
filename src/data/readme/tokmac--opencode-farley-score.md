# Farley Score Plugin for OpenCode

> **Port of the [Farley Score Plugin](https://github.com/mse-online/farley_score_plugin)** for Claude Code, now adapted for OpenCode.

An OpenCode plugin that assesses test quality using **Dave Farley's 8 Properties of Good Tests**. Drop a folder or file path, and it returns a 0–10 Farley Index with per-property breakdowns.

---

## What It Is

The Farley Score evaluates test suites against **8 properties** that define test quality:

| Property | What It Checks | Why It Matters |
|----------|--------------|----------------|
| **U** Understandable | Tests read like specifications | Anyone can read and reason about them |
| **M** Maintainable | Tests verify behavior, not implementation | Changes to internals don't break tests |
| **R** Repeatable | Same result every time, anywhere | No flaky tests, no environmental dependencies |
| **A** Atomic | Isolated, no shared state | Failures point to exactly one cause |
| **N** Necessary | Every test adds unique value | No wasted execution time, no redundancy |
| **G** Granular | Single outcome per test | Clear failure signals, easy debugging |
| **F** Fast | Pure computation, no I/O | Fast feedback loop, TDD-friendly |
| **T** First (TDD) | Written before implementation | Drives design, specifies intent first |

It works by analyzing test files, detecting quality signals (and anti-patterns), and calculating a weighted score based on the 8 properties.

### Supported Languages
- **Python** (`.py`) — pytest, unittest
- **Java** (`.java`) — JUnit, TestNG
- **JavaScript/TypeScript** (`.js`, `.ts`) — Jest, Mocha, Vitest, Jasmine
- **C#** (`.cs`) — MSTest, NUnit, xUnit
- **Go** (`.go`) — Go testing

### Auto-Discovery
The plugin automatically finds test files in common directories:
- `tests/` (at project root)
- `src/test/*` (Java-style)
- Individual `.py`, `.java`, `.js`, `.ts`, `.cs`, `.go` files

---

## How It Works

### 1. Analyze
Detects signals in your tests:

**Positive signals (good):**
- Asserts that match the test method name
- Simple, direct assertions
- No external dependencies
- No reflection/instrospection
- No Thread.sleep
- No file I/O
- No network I/O
- No time-based checks
- No tautologies

**Negative signals (bad):**
- Trivial tautologies (assertTrue(true))
- Mock-only tests (assert mock was called, nothing else)
- Thread.sleep / time-based tests
- File I/O operations
- Network I/O
- Reflection / instrospection
- Shared mutable state
- Implementation-coupling
- Over-specified interactions
- Framework tests (testing framework, not code)
- Cryptic test names

### 2. Score
- Each property gets a 0–10 score based on signal ratios
- **Sigmoid** scoring: diminishing returns on positive signals, dramatic penalties for negative signals
- Properties are **weighted** (Understandability/Maintainability are 1.5x, etc.)
- Final Farley Index is the **average** of all 8 property scores

### 3. Rate

| Farley Index | Rating | Meaning |
|-------------|--------|---------|
| 9.0 – 10.0 | Exemplary | Role-model test suite |
| 7.5 – 8.9 | Excellent | Very good, minor gaps |
| 6.0 – 7.4 | Good | Solid, with some anti-patterns |
| 4.5 – 5.9 | Fair | Acceptable, but mixed quality |
| 3.0 – 4.4 | Poor | Serious problems |
| 0.0 – 2.9 | Critical | Fundamental issues |

---

## Installation

### One-Command Install

```bash
npx @tokmac/opencode-farley-score install
```

The installer runs interactively and asks:

**Option 1: Project-Local (Recommended)**
- Installs to `.opencode/` in your current project
- Includes slash commands (`/farley-score`, `/farley-score-coach`)
- Auto-registers in `opencode.json` (or `.opencode/opencode.json`)
- Only available in this project
- Perfect for team sharing

**Option 2: Global**
- Installs to `~/.config/opencode/`
- Available in all projects
- Plugin tools only (no slash commands)

### What the Installer Does
1. Detects your project structure
2. Copies files to chosen location
3. Updates `opencode.json` config
4. Done — no git clone, no manual copying

### After Install
Restart OpenCode or run `/reload-plugins` to load the plugin.

### Verify
```bash
npx @tokmac/opencode-farley-score verify
```
Checks that files are in the right place and commands are registered.

### Uninstall
```bash
npx @tokmac/opencode-farley-score uninstall
```
Shows exactly what will be removed, asks for confirmation, cleans up safely. Won't touch other plugins or commands.

---

## Usage

### Slash Commands

#### `/farley-score [target]`
Analyze test quality:
```
> /farley-score tests/
> /farley-score src/test/java/
> /farley-score test_calculator.py
```

#### `/farley-score-coach [topic]`
Interactive coaching:
```
> /farley-score-coach
> /farley-score-coach trivial-tautology
> /farley-score-coach mock-tautology
```

### Auto-Invoked Tools

OpenCode automatically invokes the tools based on context:
```
> Analyze my tests in tests/
> I want to learn about test quality
> What's wrong with this test?
```

### Example Session

**Analysis:**
```
> /farley-score tests/

🔍 Analyzing tests...
  Files: 2
  Methods: 21
  Signals: 45

📊 Farley Index: 7.2 (Good)

  U Understandable    5.0 │█████      │
  M Maintainable      4.3 │████▎      │
  R Repeatable        8.7 │████████▋  │
  A Atomic            9.5 │█████████▌ │
  N Necessary         9.1 │█████████▏ │
  G Granular          8.8 │████████▊  │
  F Fast              9.3 │█████████▎ │
  T First (TDD)       1.0 │█          │

💡 Top Issues:
  • T (First/TDD): 0/10 tests written before implementation
  • U (Understandable): 4 cryptic names
  • M (Maintainable): 3 implementation-coupled tests

  Exercise: /farley-score-coach trivial-tautology
```

**Coaching:**
```
> /farley-score-coach trivial-tautology

🎓 Exercise: Trivial Tautology (beginner)

Affected properties: Necessary, First (TDD)

These tests are meaningless — they pass no matter what.

Code:
  def test_true_is_true(self):
      self.assertTrue(True)

Question: What is wrong with these tests?

Hint: Would they still pass if you deleted ALL production code?

Your answer:
  It's a tautology that provides no value

✅ Feedback: Good! You identified the key issues.
  Score: 2/3
  Explanation: A test that passes even when all production code is deleted
  provides zero information. It doesn't verify behavior.
  Matched: tautology, necessary, always pass
```

---

## Coaching Exercises

| Exercise | Difficulty | Properties | Anti-Pattern |
|----------|-----------|------------|-------------|
| trivial-tautology | beginner | N, T | Trivial Tautology |
| mock-tautology | intermediate | N, M | Mock Tautology |
| mock-only | intermediate | N, T | Mock-Only Test |
| mega-test | beginner | G, U | Mega-Test |
| shared-state | intermediate | R, A | Shared Mutable State |
| sleep | beginner | F, R | Time Sleep |
| implementation-coupling | advanced | M | Implementation Coupling |
| over-specified | advanced | M | Over-Specified Interactions |
| framework-test | beginner | N | Framework Test |
| cryptic-name | beginner | U | Cryptic Test Name |

---

## Plugin Structure

```
.opencode/
├── commands/
│   ├── farley-score.md          # Slash command: /farley-score
│   └── farley-score-coach.md    # Slash command: /farley-score-coach
└── plugins/
    └── farley-score/
        ├── index.js             # Plugin entry point (exports tools)
        ├── package.json         # Plugin metadata (type: module)
        └── lib/
            ├── core.js          # Math primitives (sigmoid)
            ├── scoring.js       # Farley Index calculation
            ├── analyze.js       # Test file analyzer
            └── coach.js         # Coaching exercises
```

---

## Testing

Run the smoke tests:
```bash
node test/smoke.test.js
```

Tests cover:
- Scoring formulas (sigmoid, full pipeline, rating boundaries)
- Analyzer (file discovery, signal detection, error handling)
- Coach (exercise listing, answer validation)

---

## Examples

The `examples/` directory contains a sample project with deliberately mixed-quality tests:
- `examples/sample-project/tests/test_calculator.py` — 13 tests (3 good + 10 bad)
- `examples/sample-project/tests/test_user_service.py` — 8 tests (4 good + 4 bad)

These are used by the coaching exercises and serve as reference material.

---

## Attribution

- **Dave Farley** — 8 Properties of Good Tests
- **Andrea Laforgia** — Farley Score methodology and signal detection
- **Bernard McCarty** — Plugin implementation
- **Lyubomir Mitkov** — Plugin port to Opencode

---

## Port History

This is a **port** of the original **[Farley Score Plugin](https://github.com/mse-online/farley_score_plugin/tree/main)** built for Claude Code.

**Key differences:**
- **Pure JavaScript** — Eliminated Python dependency entirely (OpenCode plugins are JS-native)
- **Clack UI** — Modern interactive installer with `@clack/prompts`
- **OpenCode format** — Uses `tool` API with proper OpenCode plugin structure
- **Auto-discovery** — OpenCode loads plugins from `.opencode/plugins/` automatically
- **Single config** — Uses `plugin` (singular) key in `opencode.json`

**Original:** [github.com/mse-online/farley_score_plugin](https://github.com/mse-online/farley_score_plugin)

---

## License

MIT
