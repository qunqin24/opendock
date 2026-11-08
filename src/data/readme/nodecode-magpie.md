# nodecode-magpie

Two magpie providers in one package:

| Provider | Key | Context | Tools | Model |
| --- | --- | --- | --- | --- |
| `nodecode` | paid `sk-nc-…` | 1,048,576 | yes | `nodecode-cyber-v1` |
| `nodecode-free` | free `sk-nc-…` | 262,144 | yes (bridged) | `nodecode-cyber-v1` |

Both talk to `https://api.nodecode.ai/v1` over the OpenAI Chat Completions wire. The free lane bridges magpie's tool calls through NodeCode's own `eval` tool and a local persistent Lisp image — see below.

Design notes and magpie 0.1.3240 contract details: [docs/DESIGN.md](./docs/DESIGN.md).

## Why a plugin is required

The free key is gated server-side by five checks: `route`, `user_agent`,
`tools`, `tool_schema`, and `system_prompt`. A plain `magpie provider add`
cannot pass them:

- the provider's User-Agent can only be `agent` or `magpie`;
- the free key only accepts `POST /v1/chat/completions`;
- a non-empty `tools` array must be exactly Nodecode's `eval` tool, and then
  the system prompt must start with the Nodecode Lisp prompt;
- even with no tools, only a single user turn is accepted. Any assistant or
  tool history is rejected as a `tools` violation.

`magpie`'s model capability (`tool_call: false` / `capabilities.toolcall`)
is not propagated to the Go gateway, so it cannot stop the gateway from
sending tools. The plugin must rewrite the outgoing request in
`auth.loader.fetch` — the one layer that sees `init.body` as a string.

For the free provider the plugin sets the CLI-shaped User-Agent and then
chooses one of two bridges:

- **tools present, `tool_choice` not `"none"`** — rewrite the request to
  NodeCode's single native `eval` tool (exact vendor schema + the four-line
  Lisp system prompt), preserve the client's tool catalog in the system prompt,
  and run the model's `eval` calls in a local persistent NodeCode image. Direct
  forms such as `(sh "ls")` and `(write-file …)` execute locally; client tools
  are carried as `(magpie-tool "name" "json")` and turned back into normal
  OpenAI `tool_calls`.
- **no tools, or `tool_choice: "none"`** — collapse the multi-turn transcript
  into one `system` + one `user` message and use a JSON tool-call protocol.

The paid provider never rewrites the body.

## Install

From a local checkout:

```sh
magpie plugins add /abs/path/to/nodecode-magpie
```

From npm (published package):

```sh
magpie plugins add npm:nodecode-magpie@0.2.0
```

From a git tag:

```sh
magpie plugins add github:ChasLui/nodecode-magpie#v0.2.0
```

`magpie plugins add` restarts the plugin host. Local-path plugins are loaded in place,
not copied; after editing, remove and re-add (or `magpie plugins update`) to restart.

## Sign in

The first method is `keyless: true` and reads a local key without prompting:

```sh
magpie plugins login nodecode-free '读取本机 NodeCode 免费 key'
magpie plugins login nodecode '读取本机 NodeCode key'
```

The second method accepts a pasted key. Key lookup order:

- paid: `NODECODE_API_KEY`, then `~/.nodecode/auth.json` → `api_keys.nodecode.key`
- free: `NODECODE_FREE_API_KEY`, then `auth.json` → `api_keys["nodecode-free"].key`,
  then `~/.nodecode/free-key.txt`

The plugin only reads these files; it never logs or prints the key.

## Verify

```sh
magpie plugins list
magpie provider test nodecode-free
magpie provider test nodecode
magpie quota nodecode-free --json
magpie quota nodecode --json
```

> Note: in magpie 0.1.3240 as tested on 2026-11-08, `magpie quota <provider> --json`
> reads the plugin's `auth.usage` correctly (`plan: "Free"`, `balance: "Free"`).
> The human-readable `magpie quota <provider>` form may print `not configured`
> because it expects a built-in balance endpoint; chat and tools are unaffected.
> Use `--json`, `GET /v1/magpie/quotas`, or NodeCode's `GET /v1/usage` for exact readings.

A real test against the vendor with both keys passed on 2026-11-08:

```
✓ chat  ~2.6 s · nodecode-cyber-v1   (free)
✓ chat  ~1.9 s · nodecode-cyber-v1   (paid)
```

Offline tests:

```sh
npm test
```

The tests prove that the free lane removes every tool field and sets the CLI
UA, the bridge collapses multi-turn transcripts and restores native
`tool_calls` (including synthesized SSE), the paid lane preserves tools, and
the free lane rejects non-chat routes.

## Free lane: eval bridge (tools)

The vendor accepts a non-empty `tools` array only when it contains exactly one
tool named `eval` with NodeCode's own schema, and the system message starts with
the four-line NodeCode Lisp prompt. The free lane meets that contract honestly:

1. `lib/free-eval.mjs` builds a request with the exact `eval` tool schema and
   `LISP_PREFIX`, keeps the client's original system prompt, and appends a
   client-tool catalog plus the `(magpie-tool "name" "json")` convention.
2. `lib/eval-runner.mjs` executes direct eval forms. It starts **one**
   `nodecode trial` process and hosts a tiny Unix-socket Lisp REPL in it
   (`lib/eval-server.mjs`), so definitions made by one eval call survive into
   the next within the plugin process.
3. `handleEvalRequest` loops: direct eval results are appended as `tool`
   messages and sent back; a `(magpie-tool …)` call is returned to magpie as a
   native `tool_calls` response; streaming clients get a synthesized SSE stream.

The result is the same tool surface as the NodeCode CLI: `(sh …)` for shell,
`(write-file …)`, `(edit …)`, `(look …)`, plus persistent Lisp definitions.
Examples:

```lisp
(sh "git status --short")
(write-file "/tmp/out.txt" "hello")
(edit "/tmp/out.txt" "hello" "world")
(progn (defun double (x) (* x 2)) (double 21))
```

## Free lane: transcript bridge (no tools)

Without tools the free gate accepts only one final user message (at most one
system message). Magpie normally sends a long transcript with assistant/tool
messages, which the vendor rejects with 403 `free_needs_nodecode` pointing at
the `tools` check. `lib/free-bridge.mjs` therefore:

1. serializes the full conversation (user/assistant/tool messages) into one
   plain-text transcript;
2. sends one `system` (the original system prompt, unchanged) plus one `user`
   message (the transcript plus a continuation instruction);
3. when the client supplied tools, lists their names/descriptions/JSON schemas
   and asks the model to answer with
   `{"type":"tool_call","name":"…","arguments":{…}}` or a
   `{"type":"tool_calls",...}` batch;
4. parses that JSON out of the reply (tolerating prose/code fences), rebuilds
   native `tool_calls`, and for streaming clients synthesizes an OpenAI SSE
   stream from the non-streamed upstream response.

`tool_choice: "none"` is treated as a pure-chat request; tools are removed and
the model is not asked to call them. If the client disables tools for a
multi-turn request, only the transcript collapse is applied.

Known limits of the transcript bridge: the model must follow the JSON protocol;
malformed or unknown tool names fall back to plain text; synthetic tool-call ids
are not stable across turns; and the assistant's internal reasoning is not
preserved.

## Free-key limits (vendor docs / measured)

- model: `nodecode-cyber-v1` only; another model is 403 `model_not_free`.
- route: chat requests must be `POST /v1/chat/completions`; `/v1/responses`
  and `/v1/messages` are 403 `route`.
- client: free key works only from Nodecode CLI; other clients get 403
  `free_needs_nodecode`. This plugin impersonates the CLI's User-Agent and
  bridges the single-turn limit. That is a vendor-term risk; the vendor docs
  tell non-CLI clients to use a paid key. Use the free provider for personal
  experiments and light agent work, not as a production/stable channel.
- context: 256K (paid: 1M); output ceiling 131,072, default 16K.
- concurrency: 2 requests per account (`maxConcurrency: 2` is set).
- rate: 40 req/min; 3M tokens per 24h for 14 days after the first card top-up;
  503 `free_capacity_busy` when no machine has room.
- `auth.usage` shows `plan: "Free"` and does not invent a token window.

## Configuration notes

- `config` fills defaults but preserves a user-changed provider `name`, `npm`,
  `api` (e.g. a local proxy), and per-model overrides.
- The model is pinned to `@ai-sdk/openai-compatible`, so requests use
  `/chat/completions`. Do not switch the model API to `responses` or
  `anthropic` for `nodecode-free`: the plugin rejects it with a clear error
  instead of sending an unsupported route.
- The paid provider keeps the honest `nodecode-magpie/0.2.0` UA; only the free
  provider uses the `nodecode_cli/…` shape, because only the free gate needs it.
- Known magpie 0.1.3240 limitation: plugin-model `tool_call` is not carried into
  the gateway model list, so `nodecode-free` may still appear tool-capable in
  some UIs. The plugin strips tools server-side, so the vendor never sees them.
- The plugin is a plain ESM package run by magpie's Bun host. It uses only
  `node:fs`, `node:os`, `node:path`, and the global `fetch`; the host's global
  fetch wrapper applies the configured proxy and strips `X-Magpie-*` headers.
- No helper functions are exported from `index.mjs`: magpie instantiates every
  exported function as a plugin. Helpers live in `lib/nodecode.mjs`.

## Release

Pushing a `v*` tag runs [`.github/workflows/release.yml`](./.github/workflows/release.yml):
it runs the unit tests, then `npm publish --access public --provenance`.
The repository needs an `NPM_TOKEN` secret: a granular npm token with
`Read and write (publish and stage)` permission for all packages and
`Bypass two-factor authentication (2FA)` enabled (CI has no OTP).

## Development

```sh
npm test                 # node --test
```

The unit tests use mocked fetch responses; they do not call NodeCode or need a key.

For a real sandbox smoke test, isolate `HOME`/`XDG_*` and use a separate
`MAGPIE_ADDR` so the real magpie config is never touched:

```sh
SB=$(mktemp -d)
mkdir -p "$SB/.config" "$SB/.cache" "$SB/.nodecode"
ln -s "$HOME/.nodecode/auth.json" "$SB/.nodecode/auth.json"

m() { env HOME="$SB" XDG_CONFIG_HOME="$SB/.config" XDG_CACHE_HOME="$SB/.cache" \
        MAGPIE_ADDR=127.0.0.1:3501 magpie "$@"; }

m plugins add ./            # from this checkout
m plugins login nodecode-free '读取本机 NodeCode 免费 key'
m provider test nodecode-free
rm -rf "$SB"
```

## Layout

```
package.json
index.mjs                 # two plugin factories only
lib/nodecode.mjs          # key lookup, model metadata, fetch rewrite, usage
lib/free-bridge.mjs       # transcript collapse + JSON tool protocol + SSE
lib/free-eval.mjs         # native eval tool request/loop/response bridge
lib/eval-runner.mjs       # nodecode trial runner (persistent + one-shot)
lib/eval-server.mjs       # persistent Unix-socket Lisp REPL
test/rewrite.test.mjs     # offline body/UA/config/usage tests
test/free-bridge.test.mjs # transcript bridge protocol and streaming tests
test/free-eval.test.mjs   # eval tool request/loop/client-tool tests
```
## License

MIT. See [LICENSE](./LICENSE).
