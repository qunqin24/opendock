# OpenCode HUD

Live local-inference stats pinned to the OpenCode sidebar.

```
MTPLX  Qwen3.8-27B
39.6 tok/s  ttft 0.31s
prefill 234 tok/s
63 tok  3.73s
MTP 2.85x 81/60/43%
```

After each assistant turn, it reads the serving engine's telemetry and shows
a compact block at the bottom of the sidebar, keyed to the model that
produced it. Switch model or provider and it zeroes out cleanly rather than
carrying a stale reading.

## Contents

- [Install](#install)
- [Configuration](#configuration-optional)
- [Supported Engines](#supported-engines)
- [Engine Details](#engine-details)
- [Adding an Engine](#adding-an-engine)
- [Roadmap](#roadmap)

## Install

### Via OpenCode

```bash
opencode plugin @banburist/opencode-hud
```

### Via Download

Requires OpenCode ≥ 1.18.0. This is a **TUI plugin**, so it goes in
`~/.config/opencode/tui.json` (not `opencode.json`):

```jsonc
// ~/.config/opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["@banburist/opencode-hud", { "omlxApiKey": "<your oMLX /v1 API key>" }]
  ]
}
```

Then restart OpenCode with the sidebar open.

## Configuration (optional)

Options are passed in the `tui.json` plugin entry; each also has an env
fallback. All are optional — an engine that isn't running or isn't configured
just falls back to the universal layer.

| Option | Env | Default |
|---|---|---|
| `mtplxMetricsUrl` | `MTPLX_METRICS_URL` | `http://127.0.0.1:8000/metrics` |
| `omlxBaseUrl` | `OMLX_BASE_URL` | `http://127.0.0.1:8099` |
| `omlxApiKey` | `OMLX_API_KEY` | *(none — required to read oMLX; without it the panel says so)* |
| `llamacppBaseUrl` | `LLAMACPP_BASE_URL` | `http://127.0.0.1:8080` |
| `vllmBaseUrl` | `VLLM_BASE_URL` | `http://127.0.0.1:8000` |
| `sglangBaseUrl` | `SGLANG_BASE_URL` | `http://127.0.0.1:30000` |
| `mlxServeBaseUrl` | `MLXSERVE_BASE_URL` | `http://127.0.0.1:8095` |
| `mlxServeApiKey` | `MLX_API_KEY` | *(unset)* |
| `splashBaseUrl` | `SPLASH_BASE_URL` | `http://127.0.0.1:8000` |
| `koboldcppBaseUrl` | `KOBOLDCPP_BASE_URL` | `http://127.0.0.1:5001` |
| `vllmMlxBaseUrl` | `VLLM_MLX_BASE_URL` | `http://127.0.0.1:8000` |
| `aphroditeBaseUrl` | `APHRODITE_BASE_URL` | `http://127.0.0.1:2242` |
| `lmdeployBaseUrl` | `LMDEPLOY_BASE_URL` | `http://127.0.0.1:23333` |
| `llamafileBaseUrl` | `LLAMAFILE_BASE_URL` | `http://127.0.0.1:8003` |

## Supported Engines

Every provider gets the **universal** line for free, built from OpenCode's
own per-turn events — decode rate, TTFT, exact token counts, no engine
endpoint needed. The provider ids below get their own server telemetry merged in.

Get the id exactly right (see [Adding an Engine](#adding-an-engine)) or you get the universal line only. Every figure is one turn, not a running total — a turn that calls tools issues one request per round trip, and multi-request turns are labelled where the engine allows it.

| Provider | tok/s | TTFT | Prefill tok/s | Exact tokens | Cache info | Extras | Validated |
|---|---|---|---|---|---|---|---|
| [`mtplx`](#mtplx) | ✅ | ✅ | ✅ | ✅ | ❌ | MTP accept % | live |
| [`omlx`](#omlx) | ✅ | ❌ | ✅ | ✅ | ✅ | — | live |
| [`llamacpp`](#llamacpp) | ✅ | ❌ | ✅ | ✅ | ❌ | — | live |
| [`llamafile`](#llamafile) | ✅ | ❌ | ✅ | ✅ | ❌ | — | live |
| [`mlxserve`](#mlxserve) | ✅ | ✅ | ❌ | ✅ | ❌ | cold-start flag | live |
| [`splash`](#splash) | ✅ | ❌ | ✅ | ✅ | ✅ | draft accept % | live |
| [`koboldcpp`](#koboldcpp) | ✅ | ❌ | ✅ | ✅ | ❌ | draft accept % | live |
| [`vllm`](#vllm) | ✅ | ✅ | ❌ | ✅ | ✅ | — | live |
| [`sglang`](#sglang) | ✅ | ✅ | ❌ | ✅ | ✅ | — | live |
| [`vllmmlx`](#vllmmlx) | ✅ | ✅ | ❌ | ✅ | ❌ | — | live |
| [`aphrodite`](#aphrodite) | ✅ | ✅ | ❌ | ✅ | ✅ | — | derived |
| [`lmdeploy`](#lmdeploy) | ✅ | ✅ | ✅ | ✅ | ❌ | — | synthetic |
| anything else | ✅ | ✅ | ❌ | ✅ | ❌ | — | live |

`Validated` — **live**: run against a real server, deltas checked against
its own response. **derived**: a real vLLM capture with the metric prefix
swapped (Aphrodite is a vLLM fork, identical shape). **synthetic**: values
fixed by hand from source to make the arithmetic checkable, not measured
(`aphrodite`/`lmdeploy` are both CUDA-only, unavailable here).

## Engine Details

Assumes the provider id and base URL are already wired per
[Adding an Engine](#adding-an-engine).

<a id="mtplx"></a>

### `mtplx` — MTPLX

Default `http://127.0.0.1:8000/metrics`. See MTPLX's own docs for serving.
No think/answer split — `/metrics` never reports `reasoning_tokens`, though
the completion-token total already includes them.

<a id="omlx"></a>

### `omlx` — oMLX

Default `http://127.0.0.1:8099`. Requires `omlxApiKey` (the panel says so if
it's missing). No TTFT — its counters are atomic at completion, nothing to
time a first token against.

<a id="llamacpp"></a>

### `llamacpp` — llama.cpp

Default port 8080. Start with `--metrics` (off by default). Use the classic
single-model `llama-server` binary, not the multi-model router — it exposes
a different `/props` shape this adapter doesn't read.

```bash
llama-server --hf-repo <user>/<repo> --hf-file <file>.gguf \
  --host 127.0.0.1 --port 8080 --metrics
```

No cache-hit counter: prompt-token count reads low on a cache hit rather
than reporting what was reused.

<a id="llamafile"></a>

### `llamafile` — llamafile

Default port 8003. Shares the `llamacpp` adapter unchanged — it publishes
identical `llamacpp:` metric names — so it can run alongside a real
llama.cpp instance without conflict.

```bash
llamafile -m model.gguf --server --host 127.0.0.1 --port 8003 --metrics
```

<a id="mlxserve"></a>

### `mlxserve` — mlx-serve

Default port 8095. This is [raspoli/mlx-serve](https://github.com/raspoli/mlx-serve),
a model-swapping wrapper around `mlx_lm.server` — not that server itself,
which gets the universal layer only. Set `mlxServeApiKey` if it runs with
`MLX_API_KEY`. Matches turns by request id, so multi-request turns are
summed correctly (labelled `N requests this turn`) instead of dropped. A
streamed request reports no prompt-token count at all; a non-streamed one
has no separate decode rate (TTFT equals total duration). Cold starts are
flagged — a model swap runs ~10x longer than a warm turn.

<a id="splash"></a>

### `splash` — Splash

Default port 8000. Nothing to enable — `/metrics` is always on. Apple
Silicon only, one packaged model per repo:

```bash
splash serve --model <owner/repo>
splash opencode
```

Both prefill and decode are separately engine-timed. Prefill stays honest on
a cache hit — it counts only recomputed tokens, never the whole prompt.

<a id="koboldcpp"></a>

### `koboldcpp` — KoboldCpp

Default port 5001. Nothing to enable. Mac arm64 binary is 64MB:

```bash
./koboldcpp --model <model.gguf> --port 5001
```

Prefill/decode arrive already timed by the engine. A partial cache hit
overstates prefill (no cached-token counter to correct it with). A turn
with multiple requests only exposes the last one's numbers directly —
detected via `total_gens` and labelled, not silently dropped. Streaming
emits no usage chunk at all, so this endpoint is the *only* source of token
counts on a streamed turn.

<a id="vllm"></a>

### `vllm` — vLLM

Default port 8000. On CUDA, point `baseURL` at wherever it runs; on Apple
Silicon, [vllm-metal](https://github.com/vllm-project/vllm-metal) runs
upstream vLLM unchanged. Decode rate reuses OpenCode's own turn timing, not
a vLLM histogram — there's no per-request duration histogram to read. TTFT
*is* engine-reported, but it's a window average across however many
requests landed since the last turn, labelled `(avg)`.

<a id="sglang"></a>

### `sglang` — SGLang

Default port 30000. Needs `--enable-metrics` (off by default). On Apple
Silicon its opt-in MLX backend works, though the docs don't confirm it —
swap in the alternate pyproject, `uv pip install -e "python[srt_mps]"`,
then:

```bash
SGLANG_USE_MLX=1 python -m sglang.launch_server \
  --model-path <mlx-model> --disable-cuda-graph --enable-metrics
```

(see `.github/workflows/pr-test-mlx.yml`; the published docs name a
nonexistent `all_mps` extra). `cached_tokens_total` is registered lazily —
absent until the first cache hit. On a non-streaming turn, TTFT is stamped
at completion, so it collapses onto total latency.

<a id="vllmmlx"></a>

### `vllmmlx` — vllm-mlx

Default port 8000 — conflicts with `vllm`, so the two can't run together
as-is. `pip install vllm-mlx`, then start with `--enable-metrics` (not
`--metrics`, despite some docs):

```bash
vllm-mlx serve mlx-community/Qwen2.5-0.5B-Instruct-4bit --port 8000 --enable-metrics
```

The only engine here with a true decode rate excluding prefill (tokens ÷
(duration − TTFT), from its own duration histogram). Drops the per-request
rate rather than report a blended one if several requests land in one
window.

<a id="aphrodite"></a>

### `aphrodite` — Aphrodite

Default port 2242 (a holdover from its KoboldAI origins). CUDA host. A vLLM
fork — its `/metrics` is vLLM's own shape under an `aphrodite:` prefix, so
it behaves exactly like [`vllm`](#vllm). Not independently live-tested.

<a id="lmdeploy"></a>

### `lmdeploy` — LMDeploy

Default port 23333. Needs `--enable-metrics` (off by default). CUDA host.
The richest surface of any engine here — prefill and decode are both
separately timed histograms, so neither rate is derived. Not independently
live-tested.

<a id="anything-else"></a>

### Anything else (Ollama, MLX-LM, LM Studio, …)

Any OpenAI-compatible server with no dedicated adapter gets the universal
layer only. Ollama: `baseURL: "http://127.0.0.1:11434/v1"`; its own
telemetry is per-caller, not server-wide, so there's nothing more to fetch.
MLX-LM (`mlx_lm.server`) has no server-wide `/metrics` at all. LM Studio
enrichment is unbuilt — low value, it only reports one number
(`stats.tokens_per_second`) the universal layer already approximates.

## Adding an Engine

The shape is the same for any OpenAI-compatible server:

```jsonc
// ~/.config/opencode/opencode.json
{
  "provider": {
    "<provider-id>": {
      "name": "Display name",
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "http://127.0.0.1:<port>/v1", "apiKey": "anything" },
      "models": {
        "<model id the server reports at /v1/models>": {
          "name": "Display name for the model",
          "limit": { "context": 32768, "output": 8192 },
          "modalities": { "input": ["text"], "output": ["text"] },
          "tool_call": true
        }
      }
    }
  }
}
```

**The provider id turns on enrichment** — use one of the ids in the
[Supported Engines](#supported-engines) table to get that engine's richer
line; any other id still works fully, with the universal layer only.

## Roadmap

- LM Studio enrichment — low value; see [Anything else](#anything-else).
- **Ruled out** (universal layer only, no server-wide telemetry exists):
  **ExLlamaV3 / TabbyAPI** — no Prometheus endpoint. **lightning-mlx** — no telemetry endpoint.
- **TBD**: Modular MAX serve.
- An optional keybind to toggle the panel independently of the sidebar.

## License

MIT
