# opencode-command-window

> The GitHub repository
> <https://github.com/duzhaokun123/opencode-command-window> is a mirror. The
> canonical repository is
> <https://git.o0kam1.dev/HumanlessCode/opencode-command-window>; code changes and
> pull requests belong there. GitHub issues are welcome for questions and
> discussion.

An unofficial OpenCode V2 server plugin that gives the built-in `shell` tool explicit output windows: `tail`, `head`, `lines`, and `max_bytes`.

The default shell tool keeps only the end of large output and saves the rest to a file. Piping a command through `head` or `tail` hides the total line count and the saved path. This plugin lets the model ask for the range it actually needs, after the command has run, without rerunning it, and by default tells the model to use those parameters instead of piping.

## Requirements

- OpenCode v2.3.0 or newer.
- Node.js and pnpm only when you install from source.

## Install

Install the package with the OpenCode CLI:

```sh
opencode plugin add @o0kam1/opencode-command-window
```

Or add it to `plugins` in `opencode.json(c)`:

```jsonc
{
  "plugins": ["@o0kam1/opencode-command-window"]
}
```

Reload OpenCode (`/reload`) or restart it. The plugin id is `command.window`, which differs from the package name: use the id when you disable or configure the plugin.

To run unreleased code, clone the repository into the global plugin directory and install its dependencies:

```sh
git clone https://git.o0kam1.dev/HumanlessCode/opencode-command-window.git \
  ~/.config/opencode/plugins/command-window
cd ~/.config/opencode/plugins/command-window
pnpm install --prod
```

OpenCode loads directories under a config location's `plugins/` folder. If you keep the clone somewhere else, add its absolute path to `plugins` in `opencode.json(c)`:

```jsonc
{
  "plugins": [{ "package": "/absolute/path/to/command-window" }]
}
```

## Configuration

The plugin works without configuration: it adds the `tail`, `head`, `lines`, and `max_bytes` parameters to `shell`, applies them to each result, and injects both system prompt paragraphs for primary requests. To change that behavior, declare the plugin in `opencode.json(c)` with an `options` object. Every key is optional.

```jsonc
{
  "plugins": [
    {
      "package": "@o0kam1/opencode-command-window",
      "options": {
        // Opt-in: rewrite a trailing `| head` / `| tail` into window parameters.
        "pipeWindow": true,
        // Opt-in: warn when a finished command still piped through head or tail.
        "pipeWarning": true,
        "pipeWarningText": "Use the shell window parameters instead of piping through head or tail.",
        // Both prompt paragraphs are on by default.
        "windowHint": true,
        "windowHintText": "Limit output with the shell window parameters instead of piping through head or tail.",
        "readBack": true,
        "readBackText": "Saved shell output is in the reported file; read it instead of rerunning the command."
      }
    }
  ]
}
```

Options are read once when the plugin loads. After editing them, run `/reload` or restart OpenCode.

### Command options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `pipeWindow` | boolean | `false` | Rewrite a trailing `\| head`/`\| tail` pipe in the command into the `head`/`tail` window parameters before the command runs. |
| `pipeWarning` | boolean | `false` | Prepend a `[window warning: ...]` note to a completed shell result when the command still piped through `head` or `tail`. |
| `pipeWarningText` | non-empty string | built-in text | Replace the warning text. Used only when `pipeWarning` is `true`. |

### Prompt options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `windowHint` | boolean | `true` | Inject the output-window paragraph into primary requests that expose the `shell` tool. |
| `windowHintText` | non-empty string | built-in text | Replace the output-window paragraph. Used only when `windowHint` is `true`. |
| `readBack` | boolean | `true` | Inject the read-back paragraph into primary requests that expose the `read` tool. |
| `readBackText` | non-empty string | built-in text | Replace the read-back paragraph. Used only when `readBack` is `true`. |

Notes:

- Options only come from a `plugins` entry. A plugin discovered under a config location's `plugins/` folder receives empty options; declaring the same package or absolute directory in `plugins` supplies options and replaces the discovered entry.
- Both prompt paragraphs are injected only into `context` hook requests (primary agent requests); `compaction` and `generate` only refresh the `shell` tool description. The window paragraph requires the request to expose `shell`; the read-back paragraph requires `read`.
- `pipeWindow` is off by default because it changes the command before it runs. When enabled, a command ending in `\| head`/`\| tail` with an explicit line count (`-n N`, `-NN`, `--lines=N`, `--lines N`) is rewritten to run at full width, with the count moved into the `head`/`tail` parameter, so the marker reports the total line count and the saved-output path. Only one trailing segment is rewritten; head-then-tail chains, a bare `head`/`tail` without a count, byte mode (`-c`), other flags, extra arguments, quoting or substitution, and calls that already carry window parameters are left untouched. So are commands that join another command (`&&`, `||`, `;`, `&`, or a newline), because the pipe only sees the last pipeline while the window would cover the whole output.
- `pipeWarning` is off by default. When enabled, a completed shell call whose command pipes output through `head` or `tail` gets the note prepended to the result, so the model reads the warning first. Detection looks at every `|` at shell quoting depth 0, so it also catches joined commands (`cd /tmp && … | tail`) and forms the rewriter refuses (`| head -c 100`, a bare `| head`, extra arguments); quoted pipes and `||`/`|&` do not count. Running and killed results are left alone. A trailing pipe already rewritten by `pipeWindow` is gone before the command runs, so it triggers no warning.
- The window parameters, the appended `shell` description, and the `execute.after` window application are always active; no option turns them off.
- Invalid values fall back to their defaults and log one `[command.window]` warning per key. Booleans must be actual booleans; text options must contain non-whitespace characters after trimming, so a whitespace-only string is rejected. Unknown keys are ignored, and option errors never prevent the plugin from loading.
- The window paragraph tells the model to pass `tail`, `head`, `lines`, or `max_bytes` instead of appending `| head` or `| tail` to the command, because piping hides the total line count and the saved path and can stop the command early. Content filters such as `grep` still belong in the command.
- The read-back paragraph tells the model to continue reading a saved output file with `read` (`offset`/`limit`, at most 2000 lines per call) instead of rerunning the command. Reading a file outside the workspace can ask for directory approval.
- Each paragraph adds a fixed amount of input tokens to every primary request.

## Usage

Call `shell` as usual and add one window parameter:

```jsonc
{ "command": "pytest -q", "tail": 40 }
{ "command": "npm test", "head": 20, "tail": 20 }
{ "command": "cat huge.log", "lines": { "start": 120000, "end": 120050 } }
{ "command": "tar -tf archive.tar", "lines": { "start": 5000 } }
{ "command": "cargo build", "tail": 200, "max_bytes": 1048576 }
```

| Field | Type | Meaning |
| --- | --- | --- |
| `tail` | integer ≥ 0 | Return the last N lines. |
| `head` | integer ≥ 0 | Return the first N lines. |
| `lines` | `{ start, end? }` | Return the 1-based inclusive range. Omit `end` to read to the end. |
| `max_bytes` | integer 1–5242880 | Hard cap on the UTF-8 bytes of the window body. Defaults to 204800. |

To limit how much output comes back, pass these parameters instead of appending `| head` or `| tail` to the command: piping hides the total line count and the saved path, and can stop the command early. Filtering by content (for example `grep`) still belongs in the command. With `pipeWindow` enabled, a trailing `\| head`/`\| tail` pipe with an explicit line count is rewritten into these parameters before the command runs.

Rules:

- `tail` and `head` may be combined to return both ends. The body then contains a `[... N lines omitted ...]` placeholder.
- `lines` cannot be combined with `tail` or `head`.
- `tail: 0` and `head: 0` mean "not set".
- `max_bytes` alone does not open a window.
- Without any window parameter the result is left exactly as OpenCode produced it.

## What comes back

The body is followed by one marker paragraph:

```text
[showing lines 199998-200000 of 200000 (tail 3); full output saved to /home/me/.local/share/opencode/shell/0123456789abcdef/sh_abc.out]
```

```text
[showing lines 1-5 and 119996-120000 of 120000 (head 5, tail 5); full output saved to /home/me/.local/share/opencode/shell/0123456789abcdef/sh_abc.out]
```

```text
[showing lines 120000-120050 of 120051 (lines 120000-120050); full output saved to /home/me/.local/share/opencode/shell/0123456789abcdef/sh_abc.out]
```

```text
[showing lines 1-2 of 3 (head 2); full output was not saved because the result was not truncated]
```

The total line count is always reported. When OpenCode saved the complete output, the marker contains the file path, so a later read can return another range without rerunning the command: use the `read` tool on that path with `offset` and `limit`, or call `shell` again with `lines` when the command is cheap. When the output was complete inline, no file exists and the marker says so instead of inventing a path.

Marker notes:

- `capped at N bytes`: the byte cap stopped the window before it was complete.
- `scan stopped after 5000 ms`: the five-second scan budget ran out; the total is reported as `at least N`.
- `max_bytes clamped to 5242880`: the requested cap was above the maximum.
- `no lines in the requested range; total N`: the range starts past the end.
- `(no output)`: the command produced no output.

## Behavior details

- OpenCode's saved output file is the preferred source. Complete inline output is scanned directly.
- If only a truncated preview is available because the saved file is gone, the plugin leaves the preview untouched and prepends `[window not applied: ...]`.
- Binary output is replaced with a byte-count description instead of being decoded.
- Background results that are still running, and killed results, are never windowed.
- Exit-code and timeout notices are content parts, not the body; they are preserved.
- Memory use is bounded by `max_bytes`; the scan never buffers the whole output. The scan budget is five seconds.
- The command is never rerun, rewritten, or filtered through another process.
- Windowed results set `metadata.truncated` and add `metadata.window` with `mode`, `shownLines`, `totalLines`, `maxBytes`, and `clamped`.

## Limitations

- No `grep`, regex, or context filters. Filter with the command itself when you need matching lines.
- Ranges are line-based. `max_bytes` only caps the result; it cannot address a byte range.
- The plugin does not clean up OpenCode's saved output files.
- A window cannot recover output that OpenCode already discarded before saving a file.
- The truncation parameters are not shown in the interface. The plugin has no TUI or GUI part because OpenCode v2.3.0 provides no renderer for a tool call row, so no client can label a call with the parameters the model chose. They appear only in the marker at the end of the returned text, and in `metadata.window` on the tool result; when the output is collapsed, the user must expand it to read them.

## Uninstall

```sh
opencode plugin remove @o0kam1/opencode-command-window
```

For a source clone, remove its directory (or its `plugins` entry) instead, then reload OpenCode.

## Development

```sh
pnpm install
pnpm check   # tsc --noEmit && vitest run
```

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Plugin wiring: options, schema and description transforms, system prompt injection, `execute.before` and `execute.after` hooks. |
| `src/options.ts` | Plugin option validation and defaults. |
| `src/prompt.ts` | Window-parameter and read-back paragraphs, plus idempotent system part injection. |
| `src/schema.ts` | Replacement `shell` input schema and the appended description. |
| `src/pipe.ts` | Trailing `\| head`/`\| tail` pipe parsing, in-place rewrite of one shell call, and detection for the warning. |
| `src/warn.ts` | Prepends the advisory note when a completed shell call piped through `head`/`tail`. |
| `src/window.ts` | Parameter parsing and marker rendering. |
| `src/scan.ts` | Streaming file and text scans with byte caps. |
| `src/apply.ts` | Applies a window to one completed tool result. |

### Manual verification

1. Install the plugin and reload OpenCode.
2. Run `seq 1 200000` with `{"tail": 3}`. The marker must report lines 199998–200000 of 200000 and the saved path.
3. Run the same command with `{"head": 3, "tail": 3}`. The body must contain one omitted-lines placeholder.
4. Run it with `{"lines": {"start": 100000, "end": 100003}}`. Exactly four lines must come back.
5. Run `seq 1 5` with `{"tail": 2}`. The marker must say the result was not truncated.
6. Combine `lines` with `tail`. The result must start with `[window error: ...]` and keep the default preview.
7. Start `sleep 5` with `{"background": true, "tail": 1}`. The running result must be untouched.
8. Run `seq 1 200000` with `{"tail": 3}` and then ask the model to show another range. It must read the reported file with the `read` tool instead of rerunning the command.
9. Ask the model to inspect a command that produces large output. It must pass `tail`, `head`, or `lines` instead of piping the command through `head` or `tail`. Then set `windowHint` to `false`, reload, and confirm the paragraph is no longer injected.
10. Set `pipeWindow` to `true`, reload, and run `seq 1 100 | tail -n 3`. The command must execute at full width and the marker must report lines 98–100 of 100 with the saved-output path when the result is truncated. Then disable `pipeWindow` again and confirm the same call keeps the pipe.
11. Set `pipeWarning` to `true`, reload, and run `seq 1 100 | tail -n 3`. The result must begin with `[window warning: ...]` and still contain only the last lines as the default preview. Then disable it and confirm the same call comes back without the note.
12. Check `~/.local/share/opencode/log/opencode.log` for `[command.window]` warnings.
