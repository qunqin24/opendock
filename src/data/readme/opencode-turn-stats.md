# OpenCode Turn Stats

![OpenCode sidebar showing current-turn processed tokens](https://raw.githubusercontent.com/sm18lr88/opencode-turn-stats/main/assets/opencode-turn-stats.png)

OpenCode Turn Stats adds one line to the OpenCode sidebar:

```text
This turn 13k processed
```

It counts uncached work reported for the current user turn. The count includes
input, cache writes, visible output, and reasoning across tool-call
continuations. It excludes cache reads.

The plugin uses only synchronised OpenCode host state. It makes no provider
requests, reads no transcript files, starts no subprocesses, and stores no
usage history. If the host records cannot support the number, the row is
omitted instead of estimated.

OpenCode exposes synchronised, bounded snapshots without a completeness
marker. The plugin omits the row when a missing or inconsistent record is
detectable. A pathological snapshot that loses an earlier step while retaining
a matching latest step is indistinguishable from complete host state.

OpenCode 1.18.30 or later is required.

## Install

Install the published package:

```sh
opencode plugin opencode-turn-stats --global
```

Restart OpenCode. Show the sidebar. The row appears below built-in Context and
above MCP. OpenCode does not currently expose an insertion point inside the
built-in Context component.

For an unpublished checkout:

```sh
bun install --frozen-lockfile
bun run build
```

Add the built entry to the `plugin` array in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///absolute/path/to/opencode-turn-stats/dist/tui.js"]
}
```

On Windows, use a URL such as
`file:///C:/projects/opencode-turn-stats/dist/tui.js`.

## Development

Run all checks:

```sh
bun run verify
```

Create and check the release archive without publishing it:

```sh
bun pm pack
bun run package:check --packed
```

## Licence

MIT - see [LICENSE](LICENSE).
