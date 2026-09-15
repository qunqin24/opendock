# op-session-id

Copy your current OpenCode session ID and see a native confirmation toast.

## Install

Requires OpenCode `2.0.3`.

Add the package to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"plugins": ["op-session-id@0.2.0"]
}
```

Restart the TUI, open a session, and run `/session-id` or `/id`. You can also
choose **Copy session ID** from the command palette.

The plugin uses OpenTUI's native clipboard service on the computer running the
TUI. A successful host write shows **Session ID copied** and the full ID for four
seconds. Terminal-only clipboard delivery shows an informational toast because
OSC 52 does not acknowledge a completed copy. A failed copy shows an error toast.

Version `0.2.0` uses the OpenCode V2 plugin API. The `0.1.x` releases target V1.
The V2 plugin replaces the old exit-time session printout with the copy command
and its confirmation toast.

## Develop

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run dev
```

`bun run verify:live` drives `/session-id` and `/id` in a real OpenCode TUI,
checks the clipboard, and restores its previous text. Run it on macOS with the
OpenCode service available.
