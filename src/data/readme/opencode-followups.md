# opencode-followups

An [OpenCode](https://opencode.ai) v2 TUI plugin. After every assistant turn it asks the model for 3-5 prompts you might send next. It lists them in a toast and puts the top one in your prompt, ready to edit or send:

```
Follow-ups (1.1s)
1. Add a subtract function to calc.py.
2. Write unit tests for the add function.
3. Add error handling for non-numeric inputs.
...
/followup [n] to use one
```

`/followup` opens a picker, and `/followup 2` puts suggestion 2 straight into the prompt. **Nothing is ever sent for you.** The suggestion only goes in when the prompt is focused and empty, so anything you've started typing stays as it is. If it can't go in, `/followup` opens an editable dialog instead: Enter sends, Esc cancels.

## Requirements

- OpenCode **v2** (tested with 2.0.27), using the terminal TUI.
- The plugin does nothing in the desktop or web app. Those don't load TUI plugins.

## Install

### Local copy

```bash
mkdir -p ~/.config/opencode/plugins/opencode-followups
cp -R tui.ts src package.json ~/.config/opencode/plugins/opencode-followups/
```

The TUI picks up every directory under `~/.config/opencode/plugins/`, or under a project's `.opencode/plugins/`, that has a `tui.ts`. Note that it's `plugins/`, not `plugin/`: v2's TUI only scans `plugins/`.

## Configuration

The defaults work without any config. To set options, register the plugin in the TUI config, `~/.config/opencode/cli.json`, rather than relying on auto-discovery, because a directory found under `plugins/` gets no options. Keep the copy outside `plugins/` so it doesn't load twice:

```json
{
  "plugins": [
    { "package": "./followups", "options": { "model": "local/qwen3#fast", "messages": 4, "timeoutMs": 10000 } }
  ]
}
```

The relative path resolves against the directory that holds `cli.json`. Environment variables override options for a single run.

| Option | Env | Default | Meaning |
|---|---|---|---|
| `enabled` | `OPENCODE_FOLLOWUPS=0/1` | `true` | Master switch |
| `model` | `OPENCODE_FOLLOWUPS_MODEL` | prompt's current model | `provider/model` or `provider/model#variant` |
| `variant` | | `"fast"` | Variant to use when `model` names none. Applied only if the model has a variant with this id. Point it at a variant that turns thinking off. `""` disables it. |
| `messages` | | `6` | How many recent user/assistant messages are sent |
| `maxCharsPerMessage` | | `1500` | Each message is clipped to this many characters |
| `timeoutMs` | `OPENCODE_FOLLOWUPS_TIMEOUT_MS` | `20000` | The call is aborted after this |
| `count` | | `5` | Max suggestions (1-5) |
| `maxSuggestionChars` | | `160` | Each suggestion is clipped to this many characters |
| `toastMs` | | `12000` | How long the toast stays up |
| `insert` | | `true` | Put the top suggestion in the prompt when it is focused and empty |

`OPENCODE_FOLLOWUPS_DEBUG=1` turns on a warning toast when a call fails. Without it, failures are silent.

### Turning thinking off

The extra call goes through OpenCode's own model layer (`client.generate.text`), so it reuses your provider, URL and key. OpenCode doesn't expose a per-call "no thinking" switch, so add a model variant that does it. With llama.cpp / Qwen3:

```jsonc
"qwen3": {
  "body": { "chat_template_kwargs": { "enable_thinking": true } },
  "variants": [{ "id": "fast", "body": { "chat_template_kwargs": { "enable_thinking": false } } }]
}
```

The default `variant: "fast"` then picks it up automatically.

## How it works

1. It listens for `session.execution.succeeded`, which is v2's "turn finished" event. Failed and interrupted turns are skipped.
2. It skips subagent sessions (any session with a `parentID`), and it never runs two calls at once for the same session.
3. It reads the session context and keeps only user text and assistant text; tool calls and reasoning are dropped. It takes the last `messages` turns and sends one stateless `generate.text` request. That request creates no session, so it can't trigger itself.
4. It parses the reply the way Open WebUI does: it takes the text from the first `{` to the last `}`, then reads `.follow_ups`. Any parse problem produces no toast.
5. If you start a new turn while suggestions are still generating, the result is dropped.

## Limits

- **Prompt insertion uses an internal detail.** OpenCode v2 has no prompt-append API: the `tui.prompt.append` event exists, but the server never publishes it. So the plugin calls `insertText` on the focused OpenTUI textarea (`renderer.currentFocusedRenderable`), and only when the keymap is in `base` mode with no dialog open. A future OpenCode release could change this. If it does, insertion fails quietly and the toast plus the `/followup` dialog still work.
- **No hard output cap.** `generate.text` takes only a prompt and a model, with no `max_tokens`. Output length is limited by the instructions in the prompt, by clipping each suggestion, and by the timeout.
- **A timeout doesn't stop the server.** The plugin stops waiting, but OpenCode's server may still finish the request on the GPU.
- **It shares your model.** On a single-slot local server (llama.cpp `-np 1`), the extra request runs between your turns. If your server has no host prompt cache (`--cache-ram`), the next turn may have to re-read the whole context.

## Development

```bash
bun install
bun test          # parsing, loop guard, config, prompt building
bunx tsc --noEmit # typecheck against @opencode/plugin 2.0.27
```

## Similar plugins

- [opencode-ghost](https://github.com/ozandogrultan/opencode-ghost) and [opencode-next-prompt](https://github.com/lenitain/opencode-next-prompt) show one predicted next prompt as inline ghost text, accepted with Tab or the right arrow.
- [opencode-quick-reply](https://github.com/tufantunc/opencode-quick-reply) (v1 only) suggests a reply when the agent is waiting on you.

This plugin instead offers a numbered set of 3-5 options after every turn, uses your own configured model with thinking off, and has a picker.

## Credits

The feature, and the `{"follow_ups": [...]}` reply format with its first-`{`-to-last-`}` parsing, come from [Open WebUI](https://github.com/open-webui/open-webui)'s follow-up generation task. The prompt text here is original; no Open WebUI code or template text is included.

## License

MIT
