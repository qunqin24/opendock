# pi-local-server

Pi extension that auto-discovers local LLM servers on your LAN first, then Tailscale, and registers each as its own Pi provider with dynamic models + context windows.

Solves the new-laptop problem: instead of hand-coding a temporary provider that points at your main PC, install this extension and your local servers show up in `/model` automatically.

> **Using OpenCode?** The same discovery is available as an OpenCode plugin: see [opencode/README.md](opencode/README.md).

## How it works

1. **Startup (fast, blocking):** restores last session from cache (`~/.pi/agent/pi-local-server-cache.json`), then probes `127.0.0.1` + `PI_LOCAL_SERVER_HOSTS` on all known ports.
2. **Background (`session_start`):** full sweep — configured hosts, ARP LAN hosts (all ports), `/24` sweep fallback (common ports), Tailscale peers (always, even if LAN already hit; one address per online peer, CLI found in its default macOS/Windows/Linux install paths). Each live origin becomes one provider: `local-<type>-<host>-<port>`.
3. **Always current:** the context window is never trusted from an earlier run. Right before the agent uses a local model (`before_agent_start` / `turn_start`, at most every 5 s) and when you select it (`model_select`), the server is re-read; if the context size or the model list changed (server restarted with another `--ctx-size`, model reloaded in LM Studio, ...) the provider is re-registered and Pi's active model is updated, with a notice like `m context window 8192 → 4096`. An unreachable server keeps the last known values. `/model` also triggers `refreshModels()` on every provider.

Probing per origin (`discovery.ts`):

- `GET /v1/models` (OpenAI-compatible, with `Authorization: Bearer <key>`; dummy `local` key sent so Jan-style auth doesn't hide a live server)
- Every probe checks the *shape* of the answer, not just "HTTP 200 + JSON": LM Studio answers unknown paths with `200 {"error": ...}`, which used to make it look like Ollama.
- On live origins only: `GET /props` (llama.cpp) and `GET /api/v0/models` (LM Studio) to identify the engine.
- `GET /api/tags` (Ollama, on every port — catches Ollama on custom ports)
- `GET /props` fallback (llama.cpp single-model with empty `/v1/models`)

Fingerprint (`detectors.ts`): LM Studio native list → LM Studio, `/props` → llama.cpp, Ollama `/api/tags` (with a `models` array) → Ollama, else `owned_by` (`sglang`, `llama-swap`, `tgi`, `tabby`, `aphrodite`), `max_model_len` → vLLM/SGLang, else port map.

Context windows (never hardcoded):

| Server | Source |
|---|---|
| llama.cpp / llamafile, single model | `GET /props` → `default_generation_settings.n_ctx` (the real per-slot context) |
| llama.cpp **router mode** (new `llama-server`, Llama-macOS app) | loaded model: `GET /props?model=<id>`; otherwise the `--ctx-size` / preset in the model's `status.args` (split by slots when `-np` > 1 without `--kv-unified`). The `context_length` in `/v1/models` is the *training* context and is only used as a last resort, marked `model-max` |
| Strata | Same as single-model llama.cpp: `/props` → `n_ctx` (= the context the engine runs with), image input from `/props` modalities, thinking from the chat template. Recognised by `build_info: "Strata …"` |
| llama-swap |  `/v1/models` entry if advertised, else default |
| Ollama | `POST /api/show` → `details.context_length` / `model_info.*.context_length` |
| vLLM / SGLang | `/v1/models` entry `max_model_len` |
| LM Studio | `GET /api/v0/models`: loaded model → `loaded_context_length` (exact, follows reloads); not loaded → `PI_LOCAL_SERVER_DEFAULT_CTX` capped at the model's max, marked `estimated` (LM Studio decides at load time and doesn't say). Embedding models are skipped, `vlm` models get image input |
| Jan / MLX / KoboldCpp / textgen / Xinference / LiteLLM / GPT4All / TGI / TabbyAPI / Aphrodite / generic | `/v1/models` entry if advertised, else `PI_LOCAL_SERVER_DEFAULT_CTX` (marked `estimated`, overridable) |

Every model records where its context came from. `server`, `native-api` and `launch-args` are exact; `model-max` (training maximum, the server may run with less) and `estimated` (nothing advertised) are shown as *not verified* in `/local-server status`.

`maxTokens` = `min(PI_LOCAL_SERVER_DEFAULT_MAX_TOKENS, ctx / 2)`, so it is always below the context window.

Image input is enabled for models the server advertises as vision-capable (llama.cpp `architecture.input_modalities` / `/props` modalities).

## Supported servers

llama.cpp (`8080`), Strata (`8080`, `8095`), LM Studio (`1234`), Ollama (`11434`), vLLM (`8000`), SGLang (`30000`, `30010`), Jan (`1337`), MLX-LM (`8080`), Unsloth Desktop (`1234`, `8000`), Atomic Chat (`1234`, `8000`), llama-swap (`8080`), LocalAI (`8080`), llamafile (`8080`), KoboldCpp (`5001`), text-generation-webui (`5000`), Xinference (`9997`), LiteLLM proxy (`4000`), GPT4All (`48950`), HuggingFace TGI (`8080`), TabbyAPI (`5000`), Aphrodite (`2242`), generic OpenAI-compatible.

Shared ports (e.g. `8080`) are distinguished best-effort via `owned_by` / native endpoints; functionality is identical either way since all speak OpenAI-compatible `/v1`.

## Commands

- `/local-server` or `/local-server status` — list registered providers, models, which contexts are `estimated`.
- `/local-server rescan` — full LAN + Tailscale sweep now (reports `found N provider(s), M new, K hosts scanned`).
- `/local-server hosts` — show configured hosts; hint to set `PI_LOCAL_SERVER_HOSTS`.

## Configuration (env vars)

| Var | Default | Meaning |
|---|---|---|
| `PI_LOCAL_SERVER_HOSTS` | — | Comma list of extra hosts always probed, e.g. `main-pc,main-pc.tailnet.ts.net,192.168.1.10`. Use for Tailscale names. |
| `PI_LOCAL_SERVER_API_KEY` | `local` | Global key. Only sent to loopback and to hosts listed in `PI_LOCAL_SERVER_HOSTS`; every other discovered host gets the dummy `local`. |
| `PI_LOCAL_SERVER_API_KEYS` | — | Per-server map `host:port=key,...`, e.g. `100.64.0.2:8080=sk-...`. The host must be written as discovery finds it (Tailscale IP, or the name you put in `PI_LOCAL_SERVER_HOSTS`). Only needed if the server enforces a key. |
| `PI_LOCAL_SERVER_CTX_OVERRIDES` | — | Per-model map `model=ctx` or `host:port/model=ctx`, e.g. `llama-3.1-8b=131072,192.168.1.10:8080/model=32768`. |
| `PI_LOCAL_SERVER_DEFAULT_CTX` | `32768` | Fallback when server doesn't advertise (flagged `estimated` in status). |
| `PI_LOCAL_SERVER_DEFAULT_MAX_TOKENS` | `32768` | Upper cap for `maxTokens` (effective value is `min(cap, ctx/2)`). |
| `PI_LOCAL_SERVER_TIMEOUT_MS` | `700` | Per-probe timeout for sweep. |
| `PI_LOCAL_SERVER_DETAIL_TIMEOUT_MS` | `4000` | Timeout for detail calls (`/api/show`, `/props`, native ctx). |
| `PI_LOCAL_SERVER_DISABLE` | — | Comma list of types to skip, e.g. `ollama,jan`. |
| `PI_LOCAL_SERVER_NO_LAN` | — | Set `1` to skip LAN/ARP/sweep. |
| `PI_LOCAL_SERVER_NO_TAILSCALE` | — | Set `1` to skip Tailscale. |

Cache: `~/.pi/agent/pi-local-server-cache.json` (override dir with `PI_CODING_AGENT_DIR`). It is versioned: a cache written by an older release is ignored. Each entry remembers when the server was last really seen: one not seen for 7 days is forgotten, and a machine remembered at two addresses (LAN and Tailscale) is kept once. Delete the file for a clean slate.

## Install

```bash
pi install npm:pi-local-server
```

Verify with `pi list`, update with `pi update npm:pi-local-server`. Alternative from source: `pi install git:github.com/Leo00703/pi-local-server`.

## Strata

Strata listens on `127.0.0.1` only unless told otherwise, so other devices (Mac, phone) cannot reach it. Its run scripts (`run-<model>.bat`) start `serve\server.py`; add `"--host" "0.0.0.0"` to that command (or `"host": "0.0.0.0"` in the model's `strata-<model>.json`), and allow the port in the Windows Firewall for the Tailscale range. An API key is optional (Strata only warns); if you set one, give it to this extension with `PI_LOCAL_SERVER_API_KEYS="<tailscale-ip>:8080=<key>"`.

## Security

- Auto-discovery only probes private addresses (loopback, RFC1918, link-local, Tailscale `100.64.0.0/10`, MagicDNS / `.local` / bare LAN names). A public host is only contacted if you list it in `PI_LOCAL_SERVER_HOSTS`.
- A real API key is only sent where you pointed it (see the two key variables above). Auto-discovered neighbours — ARP hosts, other Tailscale peers — only ever see the placeholder `local`.
- Redirects are never followed, and multicast addresses are dropped from the ARP sweep.
- The cache stores server addresses and model metadata, never keys.

## Notes / limits

- Origins are always `http://`. Local LAN / Tailscale servers are plain HTTP; HTTPS remotes aren't supported.
- `/24` blind sweep only runs when ARP + configured hosts found nothing, and only on common ports (`8080, 1234, 11434, 8000, 1337, 30000, 4000, 5000, 2242`) to keep rescans ~15–30s. ARP-discovered hosts are always probed on all ports.
- Reasoning flag is heuristic (`r1-distill`, `deepseek-r1`, `reasoning`, `thinking`, `qwq`, `gpt-oss`, `magistral`); `supportsReasoningEffort` stays off since no local server implements OpenAI's `reasoning_effort` param.
- `supportsDeveloperRole` stays off (safe mapping to system/user on local backends).
