# opencode-doom-loop-detector

Doom-loop detection for opencode v2, as an external plugin.

opencode v2 currently has no doom-loop detection: the `doom_loop` action is still accepted by the permission schema, but no code produces it. This plugin restores detection for anyone who installs it, with no changes to the opencode runner.

## What it catches

Four complementary detectors:

1. **Same-message guard** (the v1 behavior, unchanged): the same call emitted 3 times inside one assistant message asks once.
2. **Signal A** — per-signature identical-output streak (warn 3, block 6). Counting is per signature, so periodic rotations and interleaved calls never reset it. A repeat only counts when the output is byte-identical, so a read-edit-test cycle with real progress never builds a streak. File results use a fixed-size marker containing a hash of the full uri and mime (the returned name is ignored), so a changed attachment changes the file identity aside from hash collisions while a renamed file keeps the same identity.
3. **Signal B** — line-level information novelty (warn 3/5, surgical ask at 8 only when that signature's A streak is ≥3, circuit breaker at 12). Outputs shorter than 3 lines are exempt. File attachment markers count as output lines: the same attachment adds nothing new, a changed attachment counts as new information.
4. **Signal C** — per-signature failure-equivalence streak (warn 4, block 6). Volatile error tokens are normalized, and successes of other signatures do not reset it.

Every stop goes through the existing `doom_loop` permission ask, so intentional polling always has an escape hatch. New "always allow" answers are saved per signal, so a new approval for A, B, C, or the circuit breaker does not exempt another signal for the same call. Approvals saved before this isolation use A's historical unsuffixed resource and therefore continue to cover only A. A user message resets A/C as well as B and the breaker (per-turn scope), so a periodic legitimate re-check cannot accumulate into a block over days.

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
- Interventions are logged through the host's Effect logger with lowercase messages and structured fields (`sessionID`, `tool`, `signal`, `sigHash`, `resource`): permission checks and allowed results at info level; interruptions at debug level; denials, typed failures, plain defects, and sticky circuit blocks at warn level. Typed failures log only the error tag; plain defects may include the cause. CorrectedError feedback and host reason text are not logged, and tool input, commands, file content, URIs, and tool output are not included as fields. The permission API cannot distinguish once from always, so result logs only state that the request was allowed. State-restore failures keep their existing warning.

## Verification

- This package: 65 tests pass (46 detector + 18 integration + 1 load smoke test), `tsc --noEmit` clean.
- Upstream PR: 67 tests pass, typecheck clean; the review bot confirmed all four threads it raised are fixed.
- Upstream PR: https://github.com/anomalyco/opencode/pull/61328
- Incident analysis and call-by-call replays: https://metal-huang.github.io/opencode/doom-loop-report/
- Prior-art review of 14 harnesses: https://metal-huang.github.io/opencode/doom-loop-report/prior-art.html

## License

MIT
