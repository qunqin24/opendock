# OpenCode Board

A Kanban board inside OpenCode Desktop. Keep your backlog beside your conversations, write tasks in Markdown, and start a session from a card when you're ready to work on it.

[npm](https://www.npmjs.com/package/opencode-board) · [Usage guide](https://github.com/dbpolito/opencode-board/blob/master/docs/usage.md) · [MIT license](LICENSE)

## Install

```sh
opencode plugin add opencode-board
```

This installs the plugin globally. Open a session in OpenCode Desktop, then click the Kanban icon and card count on the right of the session header.

You can also use **Kanban: Open task board** in the command palette, `/kanban` in the composer, or **Task board** in the side-panel **+** menu.

The plugin uses OpenCode's experimental GUI API and targets `@opencode/plugin` 2.2.0. It does not add a CLI/TUI interface.

## Use the board

- Create tasks with **New task** or the **+** in a column header.
- Drag cards to reorder them or move them between columns. Clear filters before dragging; Escape cancels a drag. Programmatic moves animate across the board, including moves between columns, unless reduced motion is enabled.
- Add, rename, recolor, collapse, or reorder columns to fit your workflow.
- Write descriptions in Markdown. Click checklist boxes directly in the description to save their state.
- Filter by project, label, or search text. One board holds tasks from all your projects.
- Open task details in Overlay, Split, or Full layout. Overlay and Split panes are resizable.

The project picker shows open projects and excludes worktree tabs. Closing a project doesn't delete its tasks. Drag the board tab below the chat if you want more room.

## Start work from a task

Open a card and click **Start session** to create a linked session. Its prompt identifies the task, includes its description, and asks the agent to mark checklist items as it completes them.

> **Start session begins work immediately.** There is no draft or review step before sending.

You can also link the current session. Each task supports multiple sessions; click a linked title to return to that conversation. The card's border animates while any linked session is running.

Task status stays manual. Starting or finishing a session won't move the card, and deleting a task won't delete its sessions.

New sessions use the task's assigned project and server. Tasks without a project use the currently open session's directory and server.

## Manage tasks from a conversation

Ask your agent to create a task, update its description, move it to a numbered position in a column, or start work from it. The plugin provides `board_list`, `board_get`, `board_create`, `board_update`, `board_move`, `board_link_session`, `board_start_session`, `board_wait`, and `board_remove`. Unlinking a session or removing a task leaves the session itself intact.

`board_wait` waits for linked sessions and returns their outcomes and replies without moving the task. You can background that tool call through OpenCode's UI while you work elsewhere.

OpenCode Desktop must be open with the plugin enabled and connected to the conversation's server. Tools use the same global board as the UI; the board panel doesn't need to be open. Write operations go through OpenCode permissions.

Under **Settings → OpenCode Board**, **Enable agent tools** turns all board tools on or off. It is enabled by default. Disabling tools leaves the board UI and existing tasks intact.

See [agent tools](https://github.com/dbpolito/opencode-board/blob/master/docs/tools.md) for inputs and examples.

## Your data

Tasks and layout settings are saved locally through OpenCode's plugin storage. The board is shared across projects, sessions, and windows in the same app installation. It survives reloads but does not sync between machines.

See the [usage guide](https://github.com/dbpolito/opencode-board/blob/master/docs/usage.md) for project selection, layout controls, and storage details.

## Contributing

- [Development setup and testing](https://github.com/dbpolito/opencode-board/blob/master/docs/development.md)
- [Release and publishing steps](https://github.com/dbpolito/opencode-board/blob/master/docs/releasing.md)
- [Report a bug](https://github.com/dbpolito/opencode-board/issues)

## License

[MIT](LICENSE)
