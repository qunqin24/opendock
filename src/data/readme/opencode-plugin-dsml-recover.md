# opencode-plugin-dsml-recover

Recovers DeepSeek DSML tool calls that leak into assistant text. An OpenCode V2
plugin — tested with **DeepSeek V4.1 via the DeepInfra provider**.

## Scope & tested configuration

**OpenCode V2 only**, and **tested with DeepSeek V4.1 via the DeepInfra provider** —
that is the setup this was built and verified against. It may help on other
providers or models, but they have not been tested: this is a personal fix shared
in the hope it saves someone else the same frustration, not a supported matrix.

> The `providers` option defaults to `["opencode-go","opencode"]` (inherited from
> the upstream project). **If you are on DeepInfra, set `"providers": ["deepinfra"]`** —
> see [Install](#install).

## The problem

DeepSeek sometimes sends a tool call as visible markup instead of executing it.
The agent stalls mid-task, and you end up looking at raw tags in the chat.

Three things make it worse than a single failed turn:

- It hits late in long sessions, when the provider's parser degrades: the outer
  block opener goes missing, invoke openers get mangled, and only inner
  parameter tags survive.
- The broken parser stays silent. It passes the wreckage through as ordinary
  text instead of raising, so nothing errors. It looks like the model just
  declined to call the function.
- The leak lands in the transcript, and from there the model copies its own
  broken format. Every turn after fails the same way until you intervene.

This plugin repairs those leaks inside OpenCode. Good responses pass through
untouched.

## Trust & behavior

Because this plugin sits in the request/response path, here is exactly what it
does and does not do:

- **No network calls of its own.** It never contacts a server, telemetry
  endpoint, or update check.
- **Reads no credentials.** It never touches API keys, tokens, or provider auth.
- **Pass-through-safe.** Plain responses are byte-identical; normal text is never
  held. It only rewrites a span that already looks like leaked tool-call markup.
  History is only sanitized when a leak is actually present.
- **No persisted writes.** History repair happens at request time (in memory);
  the plugin does not mutate your stored messages.
- **Local diagnostics are opt-in and off by default.** The `debug` and `capture`
  options write to local files (`stderr` and `/tmp/opencode/dsml-capture.log`).
  The capture log can contain your session text — delete it when done.

## What it does

1. **Parse leaked tool calls.** A tolerant parser for complete blocks plus every
   degraded shape in the [catalogue](./docs/PATTERNS.md): orphan invokes,
   mis-closed parameters, bare-JSON bodies, wrapped tools, bare-value orphans
   (the argument key derived from the session's live tool schema), marker noise,
   and chunk-split tags. [Settings](#parse)
2. **Sanitize history.** Strips old leaks from replayed assistant text, leaving a
   short inline note where each one was. History never becomes calls, so nothing
   executes twice. [Settings](#history)
3. **Fix live tool calls.** Leaked markup in a live response becomes a real call,
   so the agent loop dispatches it instead of stalling. [Settings](#responsefix)
4. **Retry stalled turns.** Sometimes a reply is too broken to repair — the
   markup cannot become a call no matter how tolerant the parser is. Instead of
   leaving the session stuck, the plugin tells the model its last reply had
   broken tool markup and asks it to re-issue the call. If the session then sits
   idle, it sends one minimal wake-up. Each broken reply gets one correction and
   at most one wake; a reply that stays silent after its poke is left alone. A
   new reply always starts fresh, so retrying never stops a live chat.
   [Settings](#retry)

## What we learned

Read this before touching any setting. Two sources: the upstream author's long
sessions on `opencode-go/deepseek-*`, and the upstream vLLM reports. (This
project's own testing was DeepSeek V4.1 on DeepInfra — see Scope above.)

1. **History is the real battlefield.** Fresh leaks are rare — the vLLM team
   served billions of production tokens, sampled 9,500 responses, and found
   76 leaks ([0.80%](https://github.com/vllm-project/vllm/pull/54686)). But one
   leak in the transcript poisons every turn after it, because the model imitates
   its own degraded output. vLLM
   [#40801](https://github.com/vllm-project/vllm/issues/40801) reports the same
   contamination. So live recovery fires rarely by design, and **history
   sanitization matters more than everything else combined**. If you change one
   flag, make it `history.sanitize`. Leave it on.
2. **It only strikes at long context.** Every leak seen came thousands of
   messages into a session, never early. Short sessions need nothing. The plugin
   sits idle and costs nothing.
3. **The backend is inconsistent.** A working theory: `opencode-go` fans out
   across multiple backend providers and only some mangle DSML. Identical prompts
   fail or succeed at random. Waiting for a provider fix is not a plan — there
   may be no single provider to fix.

## Install

```sh
# from npm (this fork's name)
opencode plugin add opencode-plugin-dsml-recover

# or point OpenCode at a local checkout
#   "package": "file:///path/to/opencode-plugin-dsml-recover"
```

- **Requires OpenCode V2** (`2.0.x` API). **Not compatible with OpenCode V1** —
  this plugin uses the V2 plugin API (`@opencode/plugin`, captured against
  `2.0.22`). It will not load on the V1 track.
- **Tested:** DeepSeek V4.1 via DeepInfra. Set `providers` to match your setup —
  e.g. `"providers": ["deepinfra"]`.
- Defaults have everything enabled: `parse`, `history`, `responseFix`, `retry`.
  The only off-by-default flag is `debug`.

## Configuration

Object form in `opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "file:///path/to/opencode-plugin-dsml-recover",
      "options": {
        // match your provider — DeepInfra is the tested one
        "providers": ["deepinfra"],
        "parse": { "wrappedTool": false },
        "retry": { "channel": "user" },
      },
    },
  ],
}
```

### `parse`

Default: all on. Controls parser tolerance, for live recovery and for deciding
what counts as a stain in history (same engine, both directions).

| Option | Default | Meaning |
|---|---|---|
| `orphanInvoke` | `true` | Invokes with no outer block opener. |
| `looseParameters` | `true` | Re-scan past broken closers. |
| `rawJsonBody` | `true` | Bare-JSON invoke bodies. |
| `wrappedTool` | `true` | Orphan named parameter with complete inner params. |
| `bareValueTool` | `true` | Bare-value orphan parameter (no inner params). The argument key is not in the bytes, so it is derived from the session's live tool schema — a tool qualifies only when its input has exactly one required string arg (`shell`→`command`, `read`→`filePath`, `websearch`→`query`). Absent a derivable key the tool is redacted, never guessed. |
| `bareValueKeys` | `{shell:"command", websearch:"query"}` | Static tool→key fallback, merged *under* the live schema. Only fills gaps (custom agents, unreadable schemas). A wrong key is worse than a redaction. |

When to disable one: that shape misfires (recovers something that was never a
call). Example: `"parse": { "wrappedTool": false }`. There is no master switch on
purpose — flip individual flags.

### `history`

Default: on (`sanitize: true`). Highest-impact layer (see above).

When to disable: don't. Switching it off re-poisons the transcript and the
imitation loop comes back. If the redaction notes bother you, file an issue
instead.

### `responseFix`

Default: on (`enabled: true`). One switch for the whole layer.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Turn leaked markup into real tool calls. |
| `bufferLimit` | `65536` | Cap on held text while deciding. A safety bound, not a target. |

When to disable: recovery ever corrupts a good turn
(`"responseFix": { "enabled": false }`).

On buffering, since people ask: normal text is never held. The fix holds only a
span that already opened as a real candidate (released if no call structure
develops), or a trailing fragment that already looks like a broken tag (capped,
released if it never becomes one). Everything else streams through untouched.

### `retry`

Default: on. Wakes stalled turns, carries the conditional correction.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Idle wake for turns ending in unrecovered markup. One per message. |
| `channel` | `"system"` | `"system"` = minimal ping, correction rides in system. `"user"` = full correction as a synthetic user turn. |
| `nudge` | `true` | Correction when history ends unrecovered. One per message. |

Send-once per message: a reply that stays silent after its poke is left alone.
New replies always start fresh, so the cap never stops a live chat — it only
stops re-poking a message that never changes, where each poke would burn a model
call for nothing.

When to disable: wakes interrupt you (`"retry": { "enabled": false }`), or keep
the wake but drop the correction text (`"retry": { "nudge": false }`).

### General

| Option | Default | Meaning |
|---|---|---|
| `providers` | `["opencode-go","opencode"]` | Provider IDs in scope. Empty disables the plugin. **Default is inherited from upstream; the tested setup uses `["deepinfra"]`.** |
| `debug` | `false` | Per-turn logging (see Verify). Only off-by-default flag. |

Full shape catalogue: [`docs/PATTERNS.md`](./docs/PATTERNS.md).

## Verify

Set `"debug": true`. Each turn logs a request line, a wire line, and one line per
response attempt (`sessionID/user-messageID`, `#n` counts retries):

```
[dsml] request ses_abc/msg_xyz tools=12 sanitized=2msgs/3parts nudge=no
[dsml] wire ses_abc/wire tools=12 names=[shell,edit,...] messages=27
[dsml] response ses_abc/msg_xyz#1 recovered=1
[dsml] response ses_abc/msg_xyz#2 passthrough
```

- `tools=N` (on `request`): number of tools OpenCode intends to send, logged
  before request assembly. `tools=(none)`/absent on very old logs.
- `wire … tools=N names=[...] messages=M`: the actual `tools` array read from the
  outbound `http.request` body (cloned, never consumed). Use it to confirm tools
  survive to the wire — e.g. to rule out an upstream drop when DSML leaks.
- `sanitized=Nmsgs/Mparts`: replayed history stripped, notes left behind.
- `recovered=N`: the fix fired.
- `passthrough`: no markup seen, bytes untouched.
- `held-candidate-no-call`: markup-shaped but unparseable, emitted verbatim.
  Seeing this often means a new variant. File an issue with the excerpt.

> `wire` only fires on in-scope `providers` with `debug: true`, on primary
> (not sub-agent) requests.

## Verify a `tools=0` correlation

Malformed output is sometimes blamed on the request carrying no tools. The probe
settles this locally: compare the `request tools=N` and `wire tools=N` values on
the turns that leak. If both are `>0` while DSML still leaks, the tools array
survived assembly and dispatch — the failure is downstream of OpenCode.

```sh
# tools count on every wire request, and whether tools=0 ever occurs
grep 'wire ' /tmp/opencode/dsml-plugin.log | grep -oE 'tools=[0-9]+' | sort | uniq -c
grep -c 'tools=0\b' /tmp/opencode/dsml-plugin.log   # want 0
```

## Development

```bash
bun install
bun test        # 136 tests: grammar, parser, stream, wrapper, config, sse, golden
bun run check   # typecheck + tests
bun run build   # compiled dist/ for npm (prepublish runs check + build)
```

- [`docs/PATTERNS.md`](./docs/PATTERNS.md): failure-shape catalogue, source of
  truth for recovery
- [`docs/TEST-MATRIX.md`](./docs/TEST-MATRIX.md): behaviour-to-test map
- [`docs/FIX-eager-flush.md`](./docs/FIX-eager-flush.md): the long-context
  eager-flush fix
- [`docs/RUNBOOK-FORK.md`](./docs/RUNBOOK-FORK.md): operating the fork and
  capturing a real leak
- `test/golden/`: synthetic fixtures and generator (`build-fixtures.ts`). No live
  markup bytes anywhere in the repo.

## How this was built

The leak diagnosis and this project's code were developed with **DeepSeek V4.1**
— the same model the fix targets. Using it to analyze the problem it was causing
is what unlocked the fix.

## Credits & lineage

This is a fork of
[`bendtherules/opencode-plugin-dsml-fix`](https://github.com/bendtherules/opencode-plugin-dsml-fix)
(v0.2.0, MIT). The buffering / parse / recover architecture is **bendtherules'**
work and is used unchanged — all credit for the design is theirs.

What this fork adds:

1. **Fix — eager-flush leak of mangled envelopes at long context.** Hold past the
   1 KB eager window while a block opener is pending, and redact an unresolved
   runt at the cap instead of emitting raw markup. Fixes the ~300k-token leak.
   → [`docs/FIX-eager-flush.md`](./docs/FIX-eager-flush.md)
2. **Schema-aware bare-value rescue (V27).** Recovers the markerless bare-value
   leak shape (an orphan `parameter` whose argument key was stripped) by deriving
   the key from the session's live tool schema. → [`docs/PATTERNS.md`](./docs/PATTERNS.md)
3. **Wake on `session.step.ended`.** The retry safety net was dead: the V2
   runtime never emits the `session.idle` events the upstream code awaited.
4. **Diagnostics capture** (off by default): NDJSON of every stream decision, to
   catch a leak in the act. → [`docs/RUNBOOK-FORK.md`](./docs/RUNBOOK-FORK.md)

If you only want the fix, see
[`docs/FIX-eager-flush.md`](./docs/FIX-eager-flush.md) §7 for exactly which hunks
are the fix versus fork-only tooling.

## Research

Same bug class, convergent fixes. This is the OpenCode-native one:

- [vLLM #54686](https://github.com/vllm-project/vllm/pull/54686): leak taxonomy
  with production shares (mis-closed param 49%, runaway invoke name 32%,
  unrecognized opener 21%). The catalogue here mirrors it.
- [vLLM #48931](https://github.com/vllm-project/vllm/issues/48931): START token
  omitted at long context (~95k+ tokens); same orphan-invoke fallback this plugin
  ships. Fixed upstream by
  [#55954](https://github.com/vllm-project/vllm/pull/55954).
- [vLLM #40801](https://github.com/vllm-project/vllm/issues/40801): streaming
  leaks plus the history-contamination effect behind the sanitize-first stance.
- [CherryStudio #14747](https://github.com/CherryHQ/cherry-studio/pull/14747):
  streaming DSML state machine and generate wrapper. The algorithm is ported into
  the middleware.
- [openclaw](https://github.com/openclaw/openclaw) DSML transport and grammar:
  doubled-bar markers, buffer cap, chunk boundaries. Same conclusions.
- [pi-mono `pi-dsml`](https://github.com/badlogic/pi-mono) grammar: mangled
  closers, ranges model, code-fence guard, `string=false` JSON rule. Shapes
  ported into this parser.

## License

MIT. See [LICENSE](./LICENSE) — dual copyright (bendtherules, original project;
frank321, fork enhancements).
