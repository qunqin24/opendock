<div align="center">
  <br />
  <br />
  <h3>opencode-session-media</h3>
  <p>Every image your agent saw or captured, in one panel inside OpenCode Desktop.</p>
  <br />
  <br />
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-session-media"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-session-media.svg" /></a>
</p>

<p align="center">
  <img src="./screenshot.jpg" alt="The Media panel beside a session, showing screenshots in a grouped grid" width="900" />
</p>

Adds a **Media** tab to a session's side panel. It gathers the images the agent
read, the screenshots it took, and the files you attached, newest first, so you
can find that one screenshot without scrolling the chat.

- **Grouped grid.** Uniform landscape (4:3) cells, never cropped, with the file name underneath. Items are grouped by turn (the prompt and the work that followed), newest first, each group headed by when it happened, the tools involved, and a count.
- **Density.** Switch between small, medium, and large thumbnails; the choice is remembered.
- **Resizes cleanly.** Resizing the panel only repositions tiles. Nothing reloads.
- **In-app viewer.** Click an image for a full-window view. `←` and `→` step through, `Esc` closes.
- **Live.** New images appear as tools finish.
- **Lazy.** Images load only as they near the viewport, so long sessions stay light.
- **Local only.** Files are read from your disk. No telemetry, no outbound requests.

## Install

Requires OpenCode Desktop 2.2+.

```sh
opencode plugin add opencode-session-media
```

Or add it to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-media"],
}
```

<details>
<summary>Local checkout</summary>

```sh
bun install
bun run build
```

Then add the checkout's absolute path to `plugins`.

</details>

## Use

<p align="center">
  <img src="./screenshot-viewer.jpg" alt="The full-window viewer with a screenshot open, arrows and a 1 / 7 counter" width="900" />
</p>

Open a session, then pick **Media** from the session panel menu, or run
**Open session media** from the command palette.

## What shows up

- Images a tool returned, such as `read` on a PNG.
- Images you attached to a prompt.
- Image files whose absolute path a tool printed, such as screenshots from
  [`opencode-simulator`](https://github.com/rin-yato/opencode-simulator). These are read from disk.

PNG, JPEG, GIF, and WebP are shown. Other files appear as a file tile and open in
your default app.

## Notes

- The panel reads the newest part of the history first and loads older media as you scroll to the end of the grid, so long sessions open quickly.
- A path a tool merely mentioned (no bytes) shows only if the file exists on disk; mentions of files that never existed stay out of the grid. If a shown file is later deleted, its tile turns into a quiet placeholder unless the app still holds its bytes.
- Disk reads are limited to absolute image paths up to 20 MB.
- The viewer's **↗** button opens the image in your default app. That takes focus from OpenCode, so it is opt-in.
- Opening in another app needs the desktop app, not the web UI.

## License

MIT
