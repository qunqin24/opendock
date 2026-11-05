# opencode-doom-loop-detector

Doom-loop detection for opencode v2, as an external plugin.

opencode v2 currently has no doom-loop detection: the `doom_loop` action is still accepted by the permission schema, but no code produces it. This plugin restores detection for anyone who installs it, with no changes to the opencode runner.

## What it catches

Four complementary detectors:

1. **Same-message guard** (the v1 behavior, unchanged): the same call emitted 3 times inside one assistant message asks once.
2. **Signal A** — per-signature identical-output streak (warn 3, block 6). Counting is per signature, so periodic rotations and interleaved calls never reset it. A repeat only counts when the output is byte-identical, so a read-edit-test cycle with real progress never builds a streak.
3. **Signal B** — line-level information novelty (warn 3/5, surgical ask at 8 only when that signature's A streak is ≥3, circuit breaker at 12). Outputs shorter than 3 lines are exempt.
4. **Signal C** — per-signature failure-equivalence streak (warn 4, block 6). Volatile error tokens are normalized, and successes of other signatures do not reset it.

Every stop goes through the existing `doom_loop` permission ask, so intentional polling always has an escape hatch. A user message resets A/C as well as B and the breaker (per-turn scope), so a periodic legitimate re-check cannot accumulate into a block over days.

## Install

Either use the CLI:

```bash
opencode plugin add opencode-doom-loop-detector
```

Or add the package to your `opencode.jsonc` directly (opencode installs missing npm plugins automatically at startup):

```jsonc
{
  "plugins": ["opencode-doom-loop-detector"]
}
```

No configuration is required. The default thresholds are the ones above.

## How it works

- The detector is a zero-dependency pure module plus a thin plugin on the public `@opencode/plugin` API.
- State is kept in memory with bounded maps (LRU caps) and a bounded line store, and is rebuilt from durable session history after a restart.
- Cost is about 0.1 ms per tool call on a real 199-call incident corpus, with no I/O and no runtime dependencies beyond the opencode plugin/schema packages and Effect.
- A denial of the circuit-breaker prompt makes the stop sticky (until the user speaks); a rejection with feedback (`Permission.CorrectedError`) returns the feedback to the model instead of stopping.

## Verification

- This package: 45 tests pass (37 detector + 8 integration), `tsc --noEmit` clean.
- Upstream PR: 67 tests pass, typecheck clean; the review bot confirmed all four threads it raised are fixed.
- Upstream PR: https://github.com/anomalyco/opencode/pull/61328
- Incident analysis and call-by-call replays: https://metal-huang.github.io/opencode/doom-loop-report/
- Prior-art review of 14 harnesses: https://metal-huang.github.io/opencode/doom-loop-report/prior-art.html

## License

MIT
