# opencode-plugins

[English](./README.md) · [Português (BR)](./README.pt-BR.md)

[OpenCode](https://opencode.ai) plugins for smarter AI sessions — **thinking-guard** (anti loop) and **truncation detection**.

## Features

### 🛡️ Thinking Guard

Detects and interrupts reasoning loops using two strategies:

1. **Token count** — aborts when output crosses the hard limit.
2. **Repetition detection** — Jaccard similarity on bigrams catches repetitive reasoning.

When a loop is detected: aborts the step + injects "stop thinking and answer".

[→ Docs](./docs/thinking-guard.md)

### 🔄 Truncation Detection

Detects responses cut off by the model's output limit and auto-injects a continuation prompt telling the model to pick up **exactly where it left off**.

[→ Docs](./docs/truncation.md)

## Install

```bash
npm install @fazaboa/opencode-plugins
```

Then register it in your `opencode.json`:

```jsonc
{
  "plugin": ["@fazaboa/opencode-plugins"]
}
```

Or drop the source file directly into `.opencode/plugins/auto-continue.ts` in your project:

```ts
export { default } from "../../opencode-plugins/src/index.ts"
```

## Usage

### Both features (default)

```ts
export { default } from "../../opencode-plugins/src/index.ts"
```

### Individual features

```ts
import { createThinkingGuardPlugin } from "../../opencode-plugins/src/index.ts"

export default createThinkingGuardPlugin({
  softLimit: 10_000,
  hardLimit: 20_000,
})
```

```ts
import { createTruncationPlugin } from "../../opencode-plugins/src/index.ts"

export default createTruncationPlugin({
  softLimit: 115_000,
  maxAutoContinues: 3,
})
```

## Configuration

All config lives in [`src/config.ts`](./src/config.ts). Defaults:

```ts
thinking: {
  softLimit: 10_000,           // alert
  hardLimit: 20_000,           // abort
  repetitionWindow: 4,         // chunks in buffer
  repetitionSimilarity: 0.6,   // Jaccard threshold
  repetitionConsecutive: 3,    // high comparisons = loop
}
truncation: {
  softLimit: 115_000,          // ~88% of ~131k cap
  maxAutoContinues: 3,
}
global: {
  maxInterventionsPerTurn: 2,
  cooldownMs: 5_000,
}
```

## Project Structure

```
opencode-plugins/
├── src/
│   ├── index.ts                # Entry point — registers all features
│   ├── config.ts               # Centralized configuration
│   ├── features/
│   │   ├── thinking-guard.ts   # Loop detection + abort
│   │   └── truncation.ts       # Truncated response detection
│   └── utils/
│       ├── repetition.ts       # Jaccard similarity on bigrams
│       └── tokens.ts           # Per-session token counter
├── tests/                      # Vitest unit tests
├── docs/                       # Per-feature documentation
├── CHANGELOG.md
├── package.json
├── README.md
└── tsconfig.json
```

## Guardrails

| Guardrail | Default |
|---|---|
| Max auto-continues per user turn (anti infinite-loop) | 3 |
| Counter resets when you send a new message | ✓ |
| Soft limit well below the cap (catches "finished but glued to the cap") | 115k tokens |
| Silent failure (never breaks your session) | ✓ |
| Thinking guard hard limit (abort reasoning loops) | 20k tokens |

## License

[MIT](./LICENSE)
