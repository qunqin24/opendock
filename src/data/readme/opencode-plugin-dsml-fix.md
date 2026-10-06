# opencode-plugin-dsml-fix

Recovers DeepSeek DSML tool calls that leak into assistant text. OpenCode V2 plugin.

## The problem

DeepSeek sometimes sends a tool call as visible markup instead of executing
it. The agent stalls mid-task, and you end up looking at raw tags in the chat.

Three things make it worse than a single failed turn:

- It hits late in long sessions, when the provider's parser degrades: the
  outer block opener goes missing, invoke openers get mangled, only inner
  parameter tags survive.
- The broken parser stays silent. It passes the wreckage through as ordinary
  text instead of raising, so nothing errors. Looks like the model just
  declined to call the function.
- The leak lands in the transcript, and from there the model copies its own
  broken format. Every turn after fails the same way until you intervene.

This plugin repairs those leaks inside OpenCode. Good responses pass through
untouched.

## What I learned

Read this before touching any setting. Two sources: my own long sessions on
`opencode-go/deepseek-*`, and the upstream vLLM reports.

1. **History is the real battlefield.** Fresh leaks are rare — the vLLM team
   served billions of production tokens, sampled 9,500 responses, and found
   76 leaks ([0.80%](https://github.com/vllm-project/vllm/pull/54686)). But
   one leak in the transcript poisons every turn after it, because the model
   imitates its own degraded output. vLLM
   [#40801](https://github.com/vllm-project/vllm/issues/40801) reports the
   same contamination. So live recovery fires rarely by design, and **history
   sanitization matters more than everything else combined**. If you change
   one flag, make it `history.sanitize`. Leave it on.
2. **It only strikes at long context.** Every leak I saw came thousands of
   messages into a session, never early. Short sessions need nothing. The
   plugin sits idle and costs nothing.
3. **The backend is inconsistent.** My working theory: `opencode-go` fans out
   across multiple backend providers and only some mangle DSML. Identical
   prompts fail or succeed at random. I stopped waiting for a provider fix —
   there may be no single provider to fix.

## Install

```sh
opencode plugin add opencode-plugin-dsml-fix
```

- Requires OpenCode V2 (`2.0.x`).
- Defaults have everything enabled: `parse`, `history`, `responseFix`,
  `retry`. The only off-by-default flag is `debug`.

## What it does

1. **Parse leaked tool calls.** Tolerant parser for complete blocks plus
   every degraded shape I catalogued: orphan invokes, mis-closed parameters,
   bare-JSON bodies, wrapped tools, marker noise, chunk-split tags.
   [Settings](#parse)
2. **Sanitize history.** Strips old leaks from replayed assistant text, with
   a short inline note where each one was. History never becomes calls, so
   nothing executes twice. [Settings](#history)
3. **Fix live tool calls.** Leaked markup in a live response becomes a real
   call, so the agent loop dispatches it instead of stalling.
   [Settings](#responsefix)
4. **Retry stalled turns.** Sometimes a reply is too broken to repair —
   the markup can't become a call no matter how tolerant the parser is.
   Instead of leaving the session stuck, the plugin tells the model its last
   reply had broken tool markup and asks it to re-issue the call properly.
   If the session then sits idle, it sends one minimal wake-up to get things
   moving again. Each broken reply gets one correction and at most one wake.
   A reply that stays silent after its poke is left alone — if the first poke
   got no reply, the cause is outside anything a second poke can fix. A new
   reply always starts fresh, so retrying never stops a live chat.
   [Settings](#retry)

## Configuration

Object form in `opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugin-dsml-fix",
      "options": {
        "parse": { "wrappedTool": false },
        "retry": { "maxAttempts": 5 },
      },
    },
  ],
}
```

### `parse`

Default: all on. Controls parser tolerance, for live recovery and for
deciding what counts as a stain in history (same engine, both directions).

| Option | Default | Meaning |
|---|---|---|
| `orphanInvoke` | `true` | Invokes with no outer block opener. |
| `looseParameters` | `true` | Re-scan past broken closers. |
| `rawJsonBody` | `true` | Bare-JSON invoke bodies. |
| `wrappedTool` | `true` | Orphan named parameter with complete inner params. |

When to disable one: that shape misfires (recovers something that was never
a call). Example: `"parse": { "wrappedTool": false }`. No master switch on
purpose. Flip individual flags.

### `history`

Default: on (`sanitize: true`). Highest impact layer (see above).

When to disable: don't. Switching it off re-poisons the transcript and the
imitation loop comes back. If the redaction notes bother you, file an issue
instead.

### `responseFix`

Default: on (`enabled: true`). One switch for the whole layer.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Turn leaked markup into real tool calls. |
| `bufferLimit` | `65536` | Cap on held text while deciding. Safety bound, not a target. |

When to disable: recovery ever corrupts a good turn
(`"responseFix": { "enabled": false }`).

On buffering, since people ask: normal text is never held. The fix holds
only a span that already opened as a real candidate (released if no call
structure develops), or a trailing fragment that already looks like a broken
tag (capped, released if it never becomes one). Everything else streams
through untouched.

### `retry`

Default: on. Wakes stalled turns, carries the conditional correction.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Idle wake for turns ending in unrecovered markup. One per message. |
| `channel` | `"system"` | `"system"` = minimal ping, correction rides in system. `"user"` = full correction as a synthetic user turn. |
| `nudge` | `true` | Correction when history ends unrecovered. One per message. |

Send-once per message: a reply that stays silent after its poke is left
alone. New replies always start fresh, so the cap never stops a live chat —
it only stops re-poking a message that never changes, where each poke would
burn a model call for nothing.

When to disable: wakes interrupt you (`"retry": { "enabled": false }`), or
keep the wake but drop the correction text (`"retry": { "nudge": false }`).

### General

| Option | Default | Meaning |
|---|---|---|
| `providers` | `["opencode-go","opencode"]` | Provider IDs in scope. Empty disables the plugin. |
| `debug` | `false` | Per-turn logging (see Verify). Only off-by-default flag. |

Full shape catalogue: `docs/PATTERNS.md`.

## Verify

Set `"debug": true`. Each turn logs one request line plus one line per
response attempt (`sessionID/user-messageID`, `#n` counts retries):

```
[dsml] request ses_abc/msg_xyz sanitized=2msgs/3parts nudge=no
[dsml] response ses_abc/msg_xyz#1 recovered=1
[dsml] response ses_abc/msg_xyz#2 passthrough
```

- `sanitized=Nmsgs/Mparts`: replayed history stripped, notes left behind.
- `recovered=N`: the fix fired.
- `passthrough`: no markup seen, bytes untouched.
- `held-candidate-no-call`: markup-shaped but unparseable, emitted verbatim.
  Seeing this often means a new variant. File an issue with the excerpt.

## Research

Same bug class, convergent fixes. This is the OpenCode-native one:

- [vLLM #54686](https://github.com/vllm-project/vllm/pull/54686): leak
  taxonomy with production shares (mis-closed param 49%, runaway invoke
  name 32%, unrecognized opener 21%). My catalogue mirrors it.
- [vLLM #48931](https://github.com/vllm-project/vllm/issues/48931): START
  token omitted at long context (~95k+ tokens); same orphan-invoke fallback
  I ship. Fixed upstream by
  [#55954](https://github.com/vllm-project/vllm/pull/55954).
- [vLLM #40801](https://github.com/vllm-project/vllm/issues/40801):
  streaming leaks plus the history-contamination effect behind my
  sanitize-first stance.
- [CherryStudio #14747](https://github.com/CherryHQ/cherry-studio/pull/14747):
  streaming DSML state machine and generate wrapper. I ported the algorithm
  into the middleware.
- [openclaw](https://github.com/openclaw/openclaw) DSML transport and
  grammar: doubled-bar markers, buffer cap, chunk boundaries. Same
  conclusions.
- [pi-mono `pi-dsml`](https://github.com/badlogic/pi-mono) grammar: mangled
  closers, ranges model, code-fence guard, `string=false` JSON rule. Shapes
  ported into my parser.

## Development

```bash
bun install
bun test        # 115 tests: grammar, parser, stream, wrapper, config, sse, golden
bun run check   # typecheck + tests
bun run build   # compiled dist/ for npm (prepublish runs check + build)
```

- `docs/PATTERNS.md`: failure-shape catalogue, source of truth for recovery
- `docs/TEST-MATRIX.md`: behaviour to test map
- `test/golden/`: synthetic fixtures and generator (`build-fixtures.ts`).
  No live markup bytes anywhere in the repo.

## License

MIT. See [LICENSE](./LICENSE).
