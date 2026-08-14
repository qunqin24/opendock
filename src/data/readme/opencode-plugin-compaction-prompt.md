# opencode-plugin-compaction-prompt

**Compact fearlessly with priority-aware compaction.**

When you work across multiple features, OpenCode's default compaction doesn't know how to distinguish active work from older discussions, so it gives them equal priority. This can make important current details easy to lose.

Customize OpenCode's compaction prompt for priority-aware compaction, deciding which messages are prioritized or discarded in the next session. Specify which discussions to discard and which decisions, files, and snippets to prioritize in the summary.

[GitHub](https://github.com/bendtherules/opencode-plugin-compaction-prompt) · [npm](https://www.npmjs.com/package/opencode-plugin-compaction-prompt)

## Install

```bash
opencode plugin -g opencode-plugin-compaction-prompt
```

This installs the plugin in your global OpenCode configuration. To install it for one project only, omit `-g`.

You can also add it manually to your global `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-plugin-compaction-prompt",
      {
        "memoryFile": ".opencode/compaction.md",
        "mode": "append",
        "completionMarker": "opencode-plugin-compaction-prompt: Custom compaction done."
      }
    ]
  ]
}
```

Create `.opencode/compaction.md` in the project when you have project-specific context to preserve. The file is optional.

### /plugin-compaction-init <instructions>

- Writes the memory file at the configured `memoryFile` path with a top instruction line and `## Keep` and `## Discard` sections containing classification rules for which messages to preserve or drop.
- **Recommended**: pass user instructions to extend the default rules with concrete topics — specific areas of discussion you want kept or dropped.

## Options

| Option             | Default                                                      | Description                                                                                                |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `memoryFile`       | `.opencode/compaction.md`                                    | File resolved relative to the active worktree.                                                             |
| `mode`             | `append`                                                     | Append instructions to OpenCode's default prompt, or use `replace` to provide a complete prompt.           |
| `prompt`           | "" (empty)                                                   | Additional instructions used together with `memoryFile`; both are included in the compaction instructions. |
| `completionMarker` | `opencode-plugin-compaction-prompt: Custom compaction done.` | Exact text the model is asked to append at the end of the summary.                                         |

Append mode is the recommended default because it preserves OpenCode's built-in compaction behavior. Replace mode is available when the complete prompt needs to be controlled by this plugin.

When neither a prompt nor a memory file is available, the plugin asks the model to echo `opencode-plugin-compaction-prompt: No custom compaction applied.` instead.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
bun run pack:check
```

The npm package exposes the compiled entrypoint at `dist/index.js` and TypeScript declarations at `dist/index.d.ts`.

## Publishing

### Update the changelog

Add the changes for the new version to `CHANGELOG.md`.

### Verify the release

```bash
bun run format:check
bun test
bun run typecheck
bun run build
bun run pack:check
```

### Publish the release

```bash
npm version minor -m "chore: release v%s"
git push origin main --follow-tags
VERSION="$(node -p "require('./package.json').version")"
gh release create "v$VERSION" --generate-notes
npm publish
```

Use `npm version patch` or `npm version major` when appropriate. `npm publish` rebuilds `dist/` automatically.

## Compatibility

The plugin uses OpenCode's `experimental.session.compacting` hook. OpenCode may change experimental plugin APIs between releases; test the package against the OpenCode version you support.
