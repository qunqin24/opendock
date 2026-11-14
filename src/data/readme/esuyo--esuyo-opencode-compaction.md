# Autocompact

An OpenCode V2 plugin that compacts a session **before** it reaches the model's
context limit, with a config file in `~/.config/opencode` and a per-session
slash command to turn it off.

The default is fixed: **a 256k reference window minus 15%**, so compaction
starts at **217,600 tokens** (85% full) on **every model**, regardless of the
context window the provider reports. Set `contextWindow` to `null` if you want
to follow each model's reported limit instead.

OpenCode already has automatic compaction (`compaction.buffer`, default 15%).
Autocompact makes the trigger explicit and adds a session-local on/off switch.
See [Relationship to built-in compaction](#relationship-to-built-in-compaction).

## Install

### From npm

```sh
opencode plugin add @esuyo/esuyo-opencode-compaction
```

The package exposes both plugin surfaces (`oc-plugin`: `server` and `tui`), so
the installer registers the server part in the OpenCode config and the TUI part
in the terminal config.

### From a local checkout

```sh
git clone https://github.com/8perezm/esuyo-opencode-compaction.git
cd esuyo-opencode-compaction
npm ci
```

Then add the checkout's absolute path to the `plugins` array in
`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["C:/SERVER/REPOS/Esuyo/esuyo-opencode-compaction"]
}
```

OpenCode reloads plugins when the config changes, so no restart is normally
needed.

### Config file

Copy `autocompact.example.json` to:

```text
~/.config/opencode/autocompact.json
```

The plugin uses built-in defaults when the file is missing, so this step is
optional. Any file named by `$XDG_CONFIG_HOME/opencode` is also supported.

## Commands

| Command | Behavior |
| --- | --- |
| `/autocompact` | Show status, current estimate, and the trigger |
| `/autocompact on` | Enable Autocompact for this session |
| `/autocompact off` | Disable Autocompact for this session |
| `/autocompact toggle` | Switch this session |
| `/autocompact reset` | Remove the session override and use the global default |
| `/autocompact reload` | Reread the config file |
| `/autocompact help` | Show command help |

Autocompact is **on by default**. Session overrides are stored in OpenCode's
plugin storage, so they survive a server restart until you reset them.

Feedback is shown as a TUI toast. It does not add a message to the
conversation, so checking status or turning Autocompact off costs no context.

## Configuration

`~/.config/opencode/autocompact.json`:

```json
{
  "enabled": true,
  "reservePercent": 15,
  "reserveTokens": null,
  "triggerTokens": null,
  "contextWindow": 256000,
  "fallbackContextWindow": 256000,
  "debounceMs": 2000,
  "notify": false,
  "debug": false
}
```

| Field | Default | Meaning |
| --- | ---: | --- |
| `enabled` | `true` | Default for sessions without an override |
| `reservePercent` | `15` | Share of the window kept free. 15 = compact at 85% full. A string like `"15%"` also works |
| `reserveTokens` | `null` | Absolute reserve. Overrides `reservePercent` |
| `triggerTokens` | `null` | Exact trigger size, capped to the window. Overrides the window/reserve calculation |
| `contextWindow` | `256000` | Fixed reference window for every model. Set `null` to use the model's reported limit |
| `fallbackContextWindow` | `256000` | Window used when the model reports none |
| `debounceMs` | `2000` | Minimum gap between context checks for one session |
| `notify` | `false` | Show a toast when Autocompact requests a compaction |
| `debug` | `false` | Log measurements to the OpenCode server log |

### How the trigger is calculated

1. Use `triggerTokens` when it is set.
2. Otherwise, use `contextWindow` if set. It defaults to **256000**, so every
   model uses the same trigger. Set it to `null` to use the model's reported
   `min(input, context)` limit, or `fallbackContextWindow` when the model reports
   none.
3. Reserve `reserveTokens` when set, else `window × reservePercent / 100`.
4. Compact when the estimated prompt reaches `window - reserve`.

With the defaults, on every model:

```text
window   256,000
reserve   38,400  (15%)
trigger  217,600  (85% full)
```

Edits to the config file are picked up automatically through its modification
time. A broken file keeps the last good values instead of turning Autocompact
off.

## How it measures context

It uses the same idea as OpenCode's built-in compaction:

- The latest assistant response's provider-reported prompt tokens are exact:
  `input + cache.read + cache.write + output + reasoning`.
- Everything after that response is estimated from text at four characters per
  token. Attachments are sized by kind (image/PDF/text) rather than by their
  base64 payload.
- Before the first measured response the plugin waits instead of guessing the
  whole system prompt and tool schema.

This is deliberately conservative. A 15% reserve leaves room for the estimate
to be a little low and for a large turn to overshoot before the next check.

Autocompact checks on step boundaries, on idle, and after a model switch. Checks
are debounced, and a session never has two plugin-initiated compactions pending.
After a failed compaction it backs off (one minute, then longer) instead of
retrying in a loop.

## Relationship to built-in compaction

OpenCode's built-in automatic compaction is still controlled by `compaction` in
`opencode.json(c)`:

```jsonc
{
  "compaction": {
    "auto": true,
    "buffer": "15%"
  }
}
```

The built-in default is 15%, which starts compaction at 85% full. Autocompact
uses the same 15% reserve, so both fire at the same point. That is safe — either
one compacts the session in time — but it means Autocompact is not *earlier*
than the built-in trigger. To make Autocompact fire first, lower the built-in
buffer (a smaller buffer means a later built-in trigger), for example:

```jsonc
{
  "compaction": {
    "auto": true,
    "buffer": "5%"
  }
}
```

Then Autocompact compacts at 85% full and the built-in one remains a safety net
at 95% full:

- Autocompact on: compaction at 85% of the 256k reference window.
- `/autocompact off`: the built-in compaction still protects the session.
- Built-in compaction also recovers once if a provider rejects an oversized
  request.

If you want Autocompact to be the **only** automatic compaction, turn the
built-in one off:

```jsonc
{
  "compaction": {
    "auto": false
  }
}
```

Manual `/compact` and plugin-requested compaction still work with `auto:
false`, but the provider-overflow recovery is lost. In that setup,
`/autocompact off` means no automatic compaction at all for that session.

> Autocompact cannot change the built-in threshold per session.
> `/autocompact off` only disables this plugin's trigger.

## Notes and limitations

- The session's selected model supplies the window. An agent that overrides the
  model may have a different real limit.
- Subagent sessions are covered too.
- `compaction` is lossy. Increase OpenCode's `compaction.keep.tokens` if exact
  recent details matter.
- Compaction cannot create room when most of a request is fixed instructions and
  tool schemas.
- If the selected model reports no context window, the 256k fallback is used.
  Set `contextWindow` or `triggerTokens` to be explicit.
- Status and toggle feedback is delivered through an RPC event and shown as a
  TUI toast. Clients other than the TUI still get the command behavior, and
  the status is available through the plugin RPC (`esuyo.autocompact`).

## Development

```sh
npm install
npm run typecheck
npm test
npm run check      # typecheck + test
npm run pack:check # verify the published file list
```

Layout:

- `src/index.ts` — plugin registration and config path
- `src/config.ts` — JSONC loading, validation, threshold calculation
- `src/measure.ts` — prompt measurement and text estimation
- `src/autocompact.ts` — event handling, trigger, storage, RPC, and slash command
- `src/rpc.ts` — typed methods and the feedback event
- `src/tui.tsx` — TUI toast renderer

## Publishing

Pushes to `main` publish automatically through
`.github/workflows/publish.yml`:

1. Run the tests.
2. Bump the version from the commit message (`feat:` minor,
   `BREAKING CHANGE:` or `major:` major, otherwise patch).
3. Commit and tag the bump, then run `npm publish --access public`.
4. Create the GitHub release.

The workflow needs a repository secret named `NPM_TOKEN`. Without it the
`Check npm token` step stops the job before any version bump is pushed.

## License

Apache-2.0. See [LICENSE](LICENSE).
