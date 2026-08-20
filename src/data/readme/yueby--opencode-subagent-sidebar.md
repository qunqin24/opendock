# OpenCode Subagent Sidebar

An OpenCode TUI plugin that shows the active direct child sessions of the
current session in the sidebar.

## Installation

Install the public package with the OpenCode plugin command:

```sh
opencode plugin add @yueby/opencode-subagent-sidebar
```

Alternatively, add the package to the `plugin` array in your `tui.json`:

```json
{
  "plugin": ["@yueby/opencode-subagent-sidebar"]
}
```

The plugin keeps the existing OpenCode plugin ID `opencode-subagent-sidebar`
and registers its TUI sidebar slot automatically.

## Behavior

- Only active direct child sessions of the current session are shown; nested
  descendants and unrelated sessions are not included.
- A green dot means a child is busy, yellow means it is retrying, and a muted
  dot represents an idle status (idle children are not displayed).
- Click a row to navigate directly to that child session. Each visible child
  also gets an `Open subagent …` command in the command palette.
- The plugin reads the current session's child-session API and OpenCode events.
  It does not maintain global session state or claim to show every session.

## Local development

```sh
bun install
bun run typecheck
bun run build
bun test
npm pack --dry-run --json
```

`prepack` runs the build automatically when creating a package tarball.
