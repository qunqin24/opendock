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

A package with only a TUI part is configured in `cli.json`, not
`opencode.json`. `plugin add` writes a bare package name; add options by
editing the entry:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-media-panel",
      "options": {
        "source": "/home/user/clips/demo.gif",
        "fps": 12
      }
    }
  ]
}
```

With `source` set and `autoplay` left on, the panel opens by itself once a
session is on screen.

## Example

Make a clip to try it with, so no media of your own is needed:

```bash
ffmpeg -f lavfi -i "testsrc=size=320x240:rate=24:duration=4" -pix_fmt yuv420p /tmp/demo.mp4
```

Point `cli.json` at it, as in the install example, with `"source": "/tmp/demo.mp4"`,
then start OpenCode and open a session. The panel opens on its own:

```text
demo.mp4 · 12 fps · 7/48 · space pause · f fullscreen · esc close
```

48 frames, because the request is 12 frames per second over 4 seconds; the source
clip's own frame rate does not change that. The line above the frames is the whole
interface: the file name, the frame rate in use, the current frame, and the keys.
`space` pauses, `f` takes the full window, and `esc` closes the panel.

Without a `source`, ask for the file instead:

```text
/media /tmp/demo.mp4
```

The panel belongs to a session, so opening a file from the home screen reports
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

## Options

| Option           | Default     | Meaning                                         |
| ---------------- | ----------- | ----------------------------------------------- |
| `source`         | none        | File path or URL opened on start.               |
| `autoplay`       | `true`      | Open the panel on start when a source is known. |
| `remember`       | `false`     | Reopen the last clip played on start.           |
| `fps`            | `12`        | Frames played per second, 1 to 30.              |
| `width`          | `44`        | Panel width in cells, 4 pixels each.            |
| `loop`           | `true`      | Restart after the last frame.                   |
| `maxFrames`      | `300`       | Cap on extracted frames, 1 to 2000.             |
| `ffmpeg`         | `ffmpeg`    | Binary name or absolute path.                   |
| `cacheDirectory` | system temp | Root directory for extracted frames.            |
| `presentation`   | `panel`     | `panel` or `fullscreen`.                        |

Frame height follows the source aspect ratio.

## How it works

1. `ffmpeg -i <source> -an -vf fps=<fps>,scale=<pixels>:-2` writes numbered
   PNGs.
2. The PNGs are read into memory as data URIs.
3. A timer advances the frame index, and the panel sets its `<image>` source to
   the next entry.

Extraction is cached per source path, size, modification time, and the settings
that change the pixels. A restart reuses the previous frames; editing the clip
re-extracts. Each source gets its own directory under the system temp
directory, created owner-only. A failed extraction leaves nothing behind, and a
staging directory left by a killed run is swept an hour later.

A remote source is cached by its URL alone and is never refreshed. Delete its
directory under `cacheDirectory` to fetch it again.

## Limits

- **OpenCode 2.3.2 renders a panel contribution once.** The plugin loads, caches
  the frames, and its timer runs, but the host does not repaint the panel, so
  only the first frame is ever visible. A twenty-line plugin that increments a
  number in a `session.panel` slot shows the same behaviour, and neither a
  signal update nor re-opening the panel changes it. The panel starts animating
  only once the host re-renders the slot; the frame extraction, cache and timer
  here are ready for that.
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
| No autoplay                    | No `source` set and `remember` off, or no session is open yet.  |
| Panel opens, frame blank       | The terminal has no image support.                              |
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
      "options": { "source": "/home/user/clip.gif" }
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
