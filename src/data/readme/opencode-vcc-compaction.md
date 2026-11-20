# opencode-vcc-compaction — deterministic LLM-free compaction for OpenCode V2

**Your long session gets summarized by a model. The summary is invented
text — and the model then reasons from it as if it were fact.**

This plugin removes the model from that step. Port of [`dsh-compaction-vcc`](https://github.com/tingfeng-droid/dsh-compaction-vcc) (MIT, itself a fork of `TsFreddie/dsh-compaction-instant`), written directly against `@opencode/plugin/effect`.

On every `compaction` hook the plugin compiles history with a deterministic region compiler and sets `event.result = { summary, metadata: { keepID } }`. The host takes its `fromHook` short-circuit: the summary persists verbatim, the tail rebuilds from `keepID`, and **no model call is made** on the compaction path — proven live on host v2.3.2 (see `docs/research/vcc-plugin-live-verdict.md`).

Why verbatim: a model asked to summarize fills what it cannot quite recall with plausible wording — invented, fluent, and then treated as factual premise. This engine only moves original text, never rewriting a character: every elision carries a `(seq N)` pointer back to its source event. The model sees original tokens or explicitly marked pointers. Nothing else.

- **LLM-free** — no summarizer prompt, no inference latency, no model token spend.
- **Verbatim** — prior checkpoints carried over word for word, never re-summarized.
- **Deterministic** — same messages + config → byte-identical summary.
- **Measured** — full sweep in [`vcc-plugin/README.md`](vcc-plugin/README.md#performance).
- **Fail-safe** — when no keepID can be picked, the hook abstains and the host falls back to model compaction. Never a broken summary.

Full manual (example output, config behavior, mapping, tokenizer, full
Performance sweep): [`vcc-plugin/README.md`](vcc-plugin/README.md) — this
is also the document npm renders on the package page.

## Layout

- `vcc-plugin/` — the product: `opencode-vcc-compaction@0.2.0` (Effect-direct hook + pure adapter + snapshot store + three server-only `/vcc-*` commands + vendored engine + unit tests). Start here: [`vcc-plugin/README.md`](vcc-plugin/README.md).
- `compiler/` — deterministic reference engine (stages 1–4, verbatim port, dependency-free). Source of truth; vendored byte-identical into `vcc-plugin/engine/` (sync-enforced).
- `.github/workflows/` — CI: typecheck, selftests, engine-sync, markdown lint; tag pushes publish to npm and cut GitHub releases.
- `examples/` — scratch project registering `../vcc-plugin` with a cheap `compaction.buffer` trigger for live runs (never run from a real project).
- `docs/research/` — verdicts: [`compaction-probe-verdict.md`](docs/research/compaction-probe-verdict.md), [`vcc-plugin-live-verdict.md`](docs/research/vcc-plugin-live-verdict.md) (plugin live PASS).
- `archive/` — frozen history, not maintained: the closed probe harness (`probe-plugin/`, `probe-project/`, `probe-results/` evidence), the deciding spec (`PROBE.md`), the reuse inventory (`REUSE.md`), and the port plans (`plans/`). Do not extend.
- `AGENTS.md` — contributor contract for AI agents.

## Install

```bash
opencode plugin add opencode-vcc-compaction
```

Or declare it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-vcc-compaction"]
}
```

With options:

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-vcc-compaction",
      "options": { "maxTokens": 8192, "keepMessages": 6 },
    },
  ],
  // Optional: "compaction": { "buffer": "99%" } fires auto-compaction at
  // ~1% of window (demo-harness trigger; leave the default in production).
}
```

Full option table in [`vcc-plugin/README.md`](vcc-plugin/README.md).

## Verify

```sh
node --check vcc-plugin/index.ts
node compiler/selftest.mjs
node vcc-plugin/selftest.mjs
node scripts/check-engine-sync.mjs
```

Live compaction runs only with explicit approval + explicit `--model`, from a scratch project, never a real one.

## Status and limits

- v0.2.0 ships the hook + three server-only slash commands
  (`/vcc-recall`, `/vcc-search`, `/vcc-status`; no `./tui`).
  `(seq N)` pointers are 1-based ordinals over the compiled
  messages (skipped messages consume no seq); recall/search resolve them
  against the per-session snapshot, detailed in the manual.
- When the adapter cannot pick a `keepID` it abstains (`result` unset → host falls back to model compaction). Never a broken summary.
- `effect` comes from the host instance (peer `effect ^4.0.0`, `@opencode/plugin ^2.0.0`), never bundled.

## License

MIT — see [`LICENSE`](LICENSE).
