# opencode-slim-output

An OpenCode plugin that shrinks noisy tool output before it reaches the
model: external stack frames collapse to a counted line, absolute paths
become relative to the working directory, repeated lines get folded. No
LLM, no binaries, near-zero latency.

It sits next to [snip](https://github.com/edouard-claude/snip), which
summarizes per tool for `bash`, and
[openslimedit](https://github.com/ASidorenkoCode/openslimedit), which
compresses tool definitions. Neither prunes stack traces across languages
on `bash`, `grep`, `glob` and `read`, which is the gap this one fills.

A Python traceback before (11 lines, 3 from your code):

```
Traceback (most recent call last):
  File "/home/you/proj/app/service.py", line 42, in run
    handle()
  File "/home/you/proj/.venv/lib/python3.12/site-packages/requests/api.py", line 123, in handle
    return go()
  File "/home/you/proj/.venv/lib/python3.12/site-packages/urllib3/connection.py", line 99, in go
    sock.connect()
  File "/usr/lib/python3.12/socket.py", line 456, in connect
    self._real_connect()
ConnectionError: boom
```

After:

```
Traceback (most recent call last):
  File "./app/service.py", line 42, in run
    handle()
... +3 frames omitted (site-packages/stdlib)
ConnectionError: boom
```

Your frames and the error survive. The stdlib plumbing does not.

Collapsing is conservative by design: a line folds only when three signals
agree. The command gate runs each detector where its noise is expected
(`pytest` and `python` for Python frames, `dotnet` for .NET, `jest` and
`tsc` for JS, and so on). The anchor requires a wrapper proving a real
stack is present (`Traceback (most recent call last):`,
`NullReferenceException`, `FAIL`, `panicked`, …), so prose that merely
mentions a file is left alone. And the frame shape must match fully (`File
"…", line N`, `at Ns.Type.Method(…)`, `path/to/file.go:123`, …) in a run
of at least `minFrames`. Anything else passes through untouched; unknown
frames are kept, and only known-external paths (`site-packages`,
`node_modules`, `System.*`, `*.dll`, `jdk.internal`, …) collapse, each
leaving a counted marker behind.

The hook reads the V2 result shape — a string `content` or an array of
text parts — and rewrites it in place, which keeps the rest of the result
(metadata, non-text parts) exactly as the tool returned it. Outputs under
40 characters skip processing entirely. Two deliberate limits remain:
results truncate at `maxLines` and `maxLineLen` with an overflow marker,
and the raw output is not kept anywhere, so rerun the command when you
need it all. Path shortening of the `compact_path` kind is avoided on
purpose — a path the model cannot open costs more than the characters it
saves.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-slim-output",
      "options": { "maxLines": 120, "maxLineLen": 160, "maxFrames": 40 } },
  ],
}
```

Options beyond the three above are `minFrames` (default 3), `enabled`, and
`tools` (default `["shell", "bash", "grep", "glob", "read"]`). Restart
opencode after changing them.

## Develop

```sh
npm install
bun test        # 14 tests, incl. adversarial prose fixtures and hook wiring
bun run typecheck
```

## License

MIT — © 2026 [Mateo Cerri](https://github.com/mateocerri)
