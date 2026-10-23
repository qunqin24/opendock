<p align="center">
  <img src="https://img.shields.io/badge/OpenCode-V2-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PC9zdmc+" alt="OpenCode V2" />
  <img src="https://img.shields.io/badge/Jev-System%20One-06b6d4?style=for-the-badge" alt="Jev" />
  <img src="https://img.shields.io/badge/API%20key-not%20required-22c55e?style=for-the-badge" alt="keyless" />
  <img src="https://img.shields.io/badge/tests-56%2F56%20pass-22c55e?style=for-the-badge" alt="tests" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="license" />
</p>

<h1 align="center">jev-model-picker</h1>

<p align="center">
  <strong>Jev picks the model. You keep the flow.</strong>
</p>

<p align="center">
  An OpenCode V2 plugin that asks a System One decision model — <b>Jev</b> — which
  model should handle each delegated task, injects the choice transparently into
  the delegation call, and shows you the probability bar right there in the
  transcript.
</p>

<p align="center"><em>On any error, timeout, or ambiguity it does nothing: the call keeps the model it already had. It can never block your work.</em></p>

---

## ⚡ What it does

```
orchestrator ── subagent(agent=explorer, prompt=…) ──►  execute.before hook
                                                              │
                                          sanitized digest (≤1200 chars)
                                                              ▼
                              Jev — typed `choice` question over candidates
                                                              │
                                    chosen providerID/modelID + probability
                                                              ▼
            subagent(agent=explorer, model=⚡ pick)  ◄── input rewritten
```

That delegation then lands in your session history with its own verdict:

```
┃ ▸ librarian · 14:32:05
┃ find where the auth middleware is registered and how the session…
┃ JEV picked opencode/deepseek-v4.1-flash-free
┃ ████████████████████░░░░ 77.0%  (margin 0.72)
┃ cost effective · lane librarian · default nvidia/x · 25% of default price · 264ms
```

- 🧠 **Works standalone** in any OpenCode V2 setup.
- 🎭 **First-class [oh-my-opencode-slim](https://www.npmjs.com/package/oh-my-opencode-slim) integration**: reads the active preset's lane pins, biases picks toward each lane's tier, and uses the pin as the fallback.
- 🔑 **Keyless by default**: Jev via the OpenCode Zen gateway (`jev-1.13-free`) — no API key required.
- 🔌 **Pluggable decision backend**: any endpoint that speaks the same shapes can pick — TypeSafe's paid API, or any OpenAI-compatible chat model (NVIDIA NIM, local llama.cpp, openJEV, …) via the `chat` backend.
- 💸 **Live savings**: every pick is priced against the lane's default model, and the TUI turns real token usage into "saved $0.0180" — per session.

## 🖥️ The TUI surface

A second entrypoint (`./tui`) adds a native-feeling terminal UI that follows
OpenCode's own sidebar design language (glyph on the left, bold label, muted
detail — the same row shape as the built-in MCP/Context rows, and the same
spinner/star glyphs OMO-Slim uses):

```
⠋ JEV working · 3 picks · find where the auth middleware is registered…
  saved $0.0180
```

- The row is **live**: braille spinner while a pick is fresh, `✦` star after a
  recent pick, `•` idle, `off` when disabled. Click it for the status panel.
- **Status panel** (right side, `/jev-panel`): is JEV working, did the last pick
  land, and the full prompt it answered — no models, no probabilities.
- **Probability bars live in the transcript**, not in chrome: every delegation
  carries its own bar where the work happened.
- **Commands** (palette + slash): `/jev-toggle`, `/jev-models`, `/jev-link`,
  `/jev-panel`.

### Choosing models

`/jev-models` opens a paged picker grouped by provider with prices:

```
Models JEV may consider — 12/40
▾ nvidia                                        3/9
  [x] z-ai/glm-5.3                 $9.00/MTok
  [ ] nemotron-3-ultra            $15.00/MTok
▾ opencode                                      9/9
  [x] deepseek-v4.1-flash-free              free
page 1/4 ←/→ · space toggle · f free-only: ON · a all/none
```

- **Provider rows**: `space` toggles an entire provider off — one keypress to disable all of `nvidia`.
- **`f` — only-free filter**: instantly restrict to free models and lock paid ones out.
- The selection is the allow-list the *server* enforces, so what you pick is what Jev gets offered.

## 📦 Install

Add the plugin to your OpenCode V2 config (`~/.config/opencode/opencode.jsonc`)
**and** `cli.json` (the CLI config is what loads the TUI half):

```jsonc
// opencode.jsonc — the server half (picks + hooks + tools)
{
  "plugins": [
    "oh-my-opencode-slim", // optional
    {
      // Local checkout: absolute directory path or file:// URL.
      // Published: use "jev-model-picker".
      "package": "F:/code/jev-model-picker",
      "options": {
        "systemone": {
          "baseURL": "https://opencode.ai/inference/systemone/v1",
          "model": "jev-1.13-free"
        }
      }
    }
  ]
}
```

```jsonc
// cli.json — the terminal half (sidebar, panel, commands)
{
  "plugins": [
    { "package": "F:/code/jev-model-picker", "options": { "logDecisions": true } }
  ]
}
```

That's it — defaults are keyless and safe. See `examples/jev-picker.jsonc` for a
fully annotated example.

## 🛠 How it works

1. A delegation call (`subagent` / `task`, configurable) passes through the plugin's `execute.before` hook.
2. The task prompt is reduced to a **sanitized digest** (secrets redacted, capped) and the candidate list is built from `ctx.model.list()` — enabled, tool-capable models only.
3. Jev answers a typed `choice` question: one option per candidate, described by name, provider, cost tier and context size; the lane's pinned model is described first.
4. The chosen `providerID/modelID` is written into the delegation's `model` argument — the orchestrator never sees the seam.
5. The pick is recorded to a shared bridge file; the server appends the probability bar to the tool result, and the TUI prices the usage against the lane's default model.

If Jev errors, times out, answers off-list, or confidence/margin misses your
policy thresholds, the hook leaves the call untouched.

## ⚙️ Configuration

All options go under the plugin entry's `options`:

| option | default | meaning |
| --- | --- | --- |
| `enabled` | `true` | master switch |
| `backend` | `"auto"` | `"auto"` \| `"systemone"` \| `"chat"` |
| `systemone.baseURL` | Zen gateway | System One endpoint (must end in `/v1`) |
| `systemone.model` | `jev-1.13-free` | decision model id |
| `systemone.apiKey` / `apiKeyEnv` | — | bearer key for paid endpoints (`TYPESAFE_API_KEY` env fallback) |
| `chat.providerID` / `model` | off | fallback chat backend (OpenCode provider + model id) |
| `chat.baseURL` / `apiKey` / `apiKeyEnv` | — | for direct OpenAI-compatible endpoints |
| `chat.jsonMode` | `false` | send `response_format: json_object` |
| `tools` | `["subagent","task"]` | tool names to intercept |
| `laneFields` | `["subagent_type","agent","type"]` | input fields naming the target lane |
| `lanes` | `{}` | explicit candidate refs per lane (e.g. `{"explorer": ["nvidia/z-ai/glm-5.3"]}`) |
| `descriptions` | `{}` | per-ref criteria overrides for the picker |
| `policy.minProbability` | `0` | reject picks below this probability |
| `policy.minMargin` | `0` | reject picks with a thinner margin over the runner-up |
| `policy.maxCandidates` | `12` | candidates offered per pick |
| `policy.respectExplicitModel` | `true` | an explicit `model` on the call always wins |
| `policy.timeoutMs` | `6000` | backend timeout |
| `policy.cacheTtlMs` | `120000` | reuse a pick for identical (lane, digest) |
| `digest.maxChars` | `1200` | digest cap |
| `logDecisions` | `true` | log decisions to plugin storage |
| `omoslimPath` / `omoslimPreset` | auto | override OMO-Slim config path / active preset |

## 🔌 Backends

The picker tries backends in order and takes the first valid pick:

1. **`systemone`** (default) — the TypeSafe System One API shape: `POST {baseURL}/systemone` with `{model, state, questions}`.
   - Keyless on the OpenCode Zen gateway (`https://opencode.ai/inference/systemone/v1`, model `jev-1.13-free`).
   - Direct TypeSafe (`https://api.typesafe.ai/v1`, model `jev-latest`) with `apiKeyEnv: "TYPESAFE_API_KEY"`.
   - Any other System One-compatible endpoint (e.g. a self-hosted openJEV deployment that speaks the same shape).
2. **`chat`** — any OpenAI-compatible `/chat/completions` model asked to return `{"model": "...", "confidence": ..., "reason": "..."}`. Great for NVIDIA NIM, local llama.cpp, or an open Jev-style chat model:

```jsonc
"chat": { "providerID": "nvidia", "model": "z-ai/glm-5.3", "jsonMode": true }
```

Credentials for the `chat` backend are resolved from the OpenCode integration
store first (the same connection your provider already uses), then from
`auth.json`. Nothing else is read and nothing is ever logged.

`/jev-link` in the TUI can also point the picker at a hosted or local backend
(openJEV on your own box) at runtime — URL, optional key, optional model.

## 🧰 Tools

- **`jev_pick`** — explicit picking: `{ task, lane? }` → `{ model, probability, margin, reason }`, rendered with a probability bar. Handy in orchestrator prompts (see `prompts/orchestrator_append.md`).
- **`jev_status`** — diagnostics: backends, lanes and pins, candidate list, recent decisions.

## 🛡 Policy & guarantees

- **Never blocks**: any failure path returns "no opinion" — delegation proceeds with its original model.
- **Explicit wins**: don't want a call touched? Pass `model` yourself (or set `policy.respectExplicitModel` as you prefer).
- **Validated**: a pick that isn't in the offered candidate list is discarded.
- **Bounded**: one decision call per delegation, cached, with a hard timeout.
- **Uninstalled cleanly**: the TUI half only reads what the server half wrote; remove both entries and nothing is left running.

## 🔒 Privacy

The digest is the only task content that leaves your machine, and it's scrubbed
of key/token/secret-looking strings and long opaque blobs before sending. No
source code is included unless it's part of the delegation prompt text. Decision
logs live in local plugin storage.

## 🧪 Development

```bash
bun install
bun test          # unit tests (no network)
bun run probe     # live smoke test: gateway models + one real Jev pick
bunx tsc --noEmit # typecheck
```

The plugin is loaded by OpenCode directly from TypeScript source, so there's no
build step. Three loading conventions exist:

- **Local checkout, server half**: the config entry must be a **directory** (absolute path or `file://` URL). OpenCode probes `<dir>/server`, then `<dir>/index` — the root `server.ts` re-exports `src/index.ts` to satisfy the first probe. Absolute *file* paths are rejected with `configured plugin path must be a directory`.
- **Local checkout, TUI half**: the TUI host probes `<dir>/tui` — the root `tui.ts` re-exports `src/tui/index.tsx`.
- **npm package** (`"package": "jev-model-picker"`): the host resolves the `./server` and `./tui` subpaths from `exports`.

Config edits, and edits to the plugin's own files, hot-reload it in a running
OpenCode server — no restart needed. The exact loading mechanics (and how to run
an isolated test server) are documented in
[`docs/opencode-v2-plugin-loading.md`](docs/opencode-v2-plugin-loading.md).

## 🗺 Roadmap

- [x] Probability bars in the transcript
- [x] Status sidebar + panel (OMO-Slim design language)
- [x] Model allow-list picker with free-only and per-provider toggles
- [x] Per-session cost savings
- [ ] Effort/variant picking (`#variant` suffixes) as a second decision question
- [ ] Per-lane cost ceilings and budget-aware policies
- [ ] Multi-question Jev flows (noul gates for premium models)

## 📄 License

MIT — Jev and System One are by [TypeSafe](https://typesafe.ai); this project is
independent and unaffiliated.

---

<p align="center">
  <strong>Made with love by a clanker &lt;3</strong>
</p>
