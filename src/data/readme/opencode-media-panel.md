# opencode-media-panel

Play GIFs and video inside the OpenCode terminal UI, in a session panel.

OpenCode renders one still frame for an image in a tool result: its transcript
has no animation loop. This plugin adds one. It extracts frames with ffmpeg,
then swaps them in a `<image>` renderable on a timer, so a clip plays next to
your conversation instead of opening a second window.

Verified against OpenCode 2.3.2 on macOS with ffmpeg 9.

## Requirements

- OpenCode 2.3 or newer (TUI plugins and `session.panel` slots).
- `ffmpeg` on `PATH`, or an absolute path in the `ffmpeg` option. Frames are
  extracted locally; nothing is uploaded.
- A terminal that draws inline images. OpenCode renders through kitty or sixel
  when the terminal reports support, and falls back to text cells otherwise.
  Verified on iTerm2.

Tool-result images and this panel are gated separately.

- Images in tool results need `session.image_preview` (Transcript images) on.
  With it off the TUI drops file data from tool results and skips its transcript
  image component, so nothing is drawn. `session.verbosity: low` hides them too.
- The panel ignores both settings. It hands its own image data to the renderer
  and never reads tool results. Tested with verbosity at `low` and with previews
  off.
- Terminal support is the one thing that decides whether frames appear at all.
  See above.

If the frame area stays blank on a terminal that claims support, force a
protocol: `OPENTUI_IMAGE_PROTOCOL=sixel` or `OPENTUI_IMAGE_PROTOCOL=blocks`.

## Install

```bash
opencode plugin add opencode-media-panel
```

That is enough. `plugin add` writes `cli.json`, which loads the panel: `/media`
and the `media-panel:` marker both work with nothing else.

The package also has a server part. It is optional, and only scripts or
external clients need it — it registers `POST /api/rpc/media/open`. To enable
it, add the package to `opencode.json` as well:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-media-panel"]
}
```

Add options by editing the `cli.json` entry:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-media-panel",
      "options": {
        "fps": 12,
        "width": 44
      }
    }
  ]
}
```

## Example

Make a clip to try it with, so no media of your own is needed:

```bash
ffmpeg -f lavfi -i "testsrc=size=320x240:rate=24:duration=4" -pix_fmt yuv420p /tmp/demo.mp4
```

Then run `/media /tmp/demo.mp4` in a session:

```text
demo.mp4 · 12 fps · 7/48 · space pause · f fullscreen · esc close
```

48 frames, because frames are extracted at `fps` (12) over 4 seconds; the source
clip's own frame rate does not change that. The line above the frames is the whole
interface: file name, frame rate in use, current frame, keys. `space` pauses, `f`
takes the full window, `esc` closes.

The panel belongs to a session, so asking for a file from the home screen reports
"Open a session first" and opens nothing.

## Use

| Action                     | How                                                   |
| -------------------------- | ----------------------------------------------------- |
| Play a file                | `/media /home/user/clips/demo.mp4`                    |
| Play the configured source | `/media`                                              |
| Close                      | `esc`, or the palette command "Close the media panel" |
| Pause and resume           | `space`                                               |
| Full screen                | `f`                                                   |

Paths with spaces are fine: the whole argument is the path. Remote URLs work
too, as long as ffmpeg can read the protocol.

### Opening it from a message

A finished message containing this line opens the clip:

```text
media-panel: /home/user/clips/demo.mp4
```

That is useful for an agent: it writes the marker in its reply, the plugin reads
the session text event it already receives, and the panel opens through the same
RPC path `/media` uses. Nothing runs a command.

### Opening it from outside the TUI

A script, an agent, or another plugin can open the panel without typing. The
package ships a server part that exposes an RPC, and the TUI part subscribes to
its events:

```bash
opencode api POST /api/rpc/media/open -d '{"input":{"source":"/home/user/clips/demo.mp4"}}'
opencode api POST /api/rpc/media/close -d '{"input":{}}'

The body is an envelope: the method's own arguments go under `input`. A body of
`{"source": …}` is rejected with `rpc.invalid_input: Expected object`. The
service authenticates with HTTP Basic: username `opencode` and the password in
`service.json`, over the channel's port (`49374` for `latest`, `0xc0de`).

Every open, including `/media` and the message marker, travels through this
RPC: the TUI
part calls it, the server part emits, and the TUI renders the event. The plugin
never shells out.
```

Any client with the server address works the same way, including
`client.rpc(Media).open({ source })` from `@opencode/client`.

The panel opens in the session you are viewing, and there is no way to target
another one: `panel.open` is session-scoped, and a request is not queued for
later. Events are live only, so a call made while no TUI is running is missed,
exactly like typing the command before the panel exists.

## Options

| Option           | Default     | Meaning                              |
| ---------------- | ----------- | ------------------------------------ |
| `fps`            | `12`        | Frames played per second, 1 to 30.   |
| `width`          | `44`        | Panel width in cells, 4 pixels each. |
| `loop`           | `true`      | Restart after the last frame.        |
| `maxFrames`      | `300`       | Cap on extracted frames, 1 to 2000.  |
| `ffmpeg`         | `ffmpeg`    | Binary name or absolute path.        |
| `cacheDirectory` | system temp | Root directory for extracted frames. |
| `presentation`   | `panel`     | `panel` or `fullscreen`.             |

Frame height follows the source aspect ratio.

## How it works

1. `ffmpeg -i <source> -an -vf fps=<fps>,scale=<pixels>:-2` writes numbered
   PNGs.
2. The PNGs are read into memory as data URIs.
3. A timer advances the frame index, and the panel sets its `<image>` source to
   the next entry.

Opening is one path. `/media`, a message marker and an external RPC call all ask
the plugin, the plugin calls its own RPC (`context.client.rpc(Media).open`), the
server part emits, and the TUI's subscription renders. Nothing shells out, and
if the server part is not loaded the call rejects and the local opener runs
instead.

Extraction is cached per source path, size, modification time, and the settings
that change the pixels. A restart reuses the previous frames; editing the clip
re-extracts. Each source gets its own directory under the system temp
directory, created owner-only. A failed extraction leaves nothing behind, and a
staging directory left by a killed run is swept an hour later.

A remote source is cached by its URL alone and is never refreshed. Delete its
directory under `cacheDirectory` to fetch it again.

## Limits

- No audio. A terminal image renderable cannot play sound.
- Settings are fixed per clip. `fps` decides the frame rate, not the source
  file's own timing; a 60 fps clip at `fps: 12` plays at 12.
- Frames are held in memory as base64. Measured at 44 cells wide, a frame ran
  about 34 KB as a PNG, which is about 45 KB stored: the default 300-frame cap
  is roughly 14 MB resident. A 64 MB budget on the stored base64 stops the load
  past that, and the panel marks the count `capped`.
- Extraction blocks the TUI while ffmpeg runs. A long clip is slow on first
  play and fast afterwards. A remote connection that stalls aborts after 30
  seconds; a slow transfer is not capped.
- One panel per plugin instance. Playing another file replaces the current clip.

## Troubleshooting

| Symptom                        | Cause                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| Toast: `Could not run ffmpeg`  | ffmpeg is not on the TUI's `PATH`; set `ffmpeg` to a full path. |
| Toast: `Open a session first`  | The panel only exists inside a session.                         |
| Toast: `ffmpeg failed on ...`  | The file is not media ffmpeg can decode.                        |
| Panel opens, frame blank       | The terminal has no image support.                              |
| Panel shows one frame, frozen  | The plugin was hot-swapped into a running session by a config   |
| counter, `escape` ignored      | edit; restart the TUI so it mounts fresh.                       |
| Images missing from transcript | Transcript images off, or verbosity `low`.                      |

## Development

```bash
npm install
npm run check   # typecheck, lint, build, tests
```

`npm run check` needs ffmpeg; the extraction tests skip themselves without it.

The published package is `dist/`, built by `npm run build` (also run by
`prepack`). The build is there on purpose: `babel-preset-solid` compiles the
panel JSX to `@opentui/solid` with Solid's getter wrapping, so the package does
not depend on the host's compiler being the right one. Babel is a
devDependency; nothing is added to what a user installs.

To try a local checkout, point `cli.json` at the directory:

```json
{
  "plugins": [
    {
      "package": "/home/user/code/opencode-media-panel",
      "options": { "fps": 12 }
    }
  ]
}
```

## Releases (maintainers)

CI in `.github/workflows/ci.yml` owns publishing.

- Merge to `main` publishes the next patch to npm `latest`, pushes a `vX.Y.Z`
  tag, and creates a GitHub release.
- A `v*-beta*` tag publishes the version in the tag name to the `beta`
  dist-tag; a manual workflow dispatch publishes the next `-beta.X`.
- Every pull request publishes `<version>-beta.<run_number>` to `beta` once it
  is out of draft, so each PR is installable.
- Publishing is skipped when every changed path is non-shipping:
  `package-lock.json`, `.github/**`, `CHANGELOG.md`, `.gitignore`, `test/**`,
  `tsconfig.json`, `biome.json`, `.markdownlint-cli2.jsonc`, and a
  `package.json` whose only diffs are the version or a toolchain devDependency.
  Any other path publishes.
- Auth is npm trusted publishing over OIDC. The trusted publisher names this
  repository and the workflow file `ci.yml`; renaming the file breaks it. The
  first publish of a new package cannot use OIDC and is done interactively.

## License

MIT
