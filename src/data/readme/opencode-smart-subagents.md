# opencode-smart-subagents

Two-way subagents for [OpenCode 2](https://opencode.ai). A child can send its parent updates and questions while it works, the parent can steer it mid-run, children can message each other, and writers can run in isolated git worktrees that you merge back.

The plugin replaces OpenCode's built-in `subagent` tool with a compatible version: same name, same inputs, and the same result metadata and report messages, so anything that reads subagent results, such as the `opencode-smart-compaction` plugin, keeps working. Everything else is added on top.

## Install

Add the plugin to `plugins` in `~/.config/opencode/opencode.json`, then restart the OpenCode service so it loads:

```jsonc
{
  "plugins": ["opencode-smart-subagents"]
}
```

To run a local checkout instead, list its absolute path, for example `"/home/me/projects/opencode-smart-subagents"`.

## What the agent gets

The main session gets these tools:

| Tool | What it does |
| --- | --- |
| `subagent` | Starts one child, or continues one by `sessionID`; a running child takes the new prompt mid-run, as with OpenCode's built-in tool. Foreground waits for the report; `background: true` returns at once and the report arrives later as a message. Adds `fork_turns`, `isolation`, and `capability` to OpenCode's inputs. |
| `subagent_batch` | Starts several background children. Either all of them start or none do. |
| `subagent_message` | Steers a running child, answers its question, or gives an idle child its next task. |
| `subagent_status` | Lists children, their status and pending questions, and the latest output of the ones you name. Never waits. |
| `subagent_stop` | Stops running children and keeps their sessions. |
| `subagent_apply` | Inspects, patches, cherry-picks, merges, or discards a worktree child's changes. |

Children get these instead, and never see the main session's tools:

| Tool | What it does |
| --- | --- |
| `message_parent` | Sends the parent an update without stopping. It reaches the parent at its next step and does not wake an idle parent. |
| `ask_parent` | Asks the parent a question. The child ends its turn and the answer arrives as its next message. |
| `list_peers` | Lists the other children of the same parent. |
| `message_peer` | Sends a sibling a message, which steers it or starts its next turn. |

The plugin also registers the `smart-subagents` skill, which tells the model when to delegate, how to write a complete assignment, how to wait for reports without polling, and how to review what comes back. By default the model delegates only when you ask for subagents, delegation, or parallel work.

### Inputs on `subagent` and `subagent_batch`

- `agent`: any OpenCode agent that can run as a subagent, including agents you define in configuration. Each brings its own model, permissions, and description.
- `model`: overrides the agent's model as `providerID/modelID` or `providerID/modelID#variant`. Without it, the child uses the agent's model, or the parent's when the agent has none.
- `fork_turns`: copies the parent conversation into a new child, either `"all"` or a number of recent user turns. Only user messages and finished assistant text are copied, never tool calls or reasoning.
- `capability`: narrows the agent's permissions for one child. `read-only` denies edits and shell, `execute` denies edits, `read-write` denies shell, and `all` keeps the agent's permissions. This covers OpenCode's edit, write, patch, and shell tools; tools from MCP servers and other plugins keep the agent's permissions.
- `isolation: "worktree"`: creates a worktree through OpenCode, using your `worktree.directory` setting, and runs the child inside it on its own branch. The source checkout must be clean, because the worktree starts from `HEAD`.

### How reports reach the parent

A background child's report arrives in the parent session as a message tagged `<subagent sessionID=... state=...>`, with `state` set to `completed`, `error`, or `cancelled`. If the parent is busy, the report lands at its next step; if it is idle, the report starts a new turn. Questions arrive the same way as `<subagent_question>`, and updates as `<subagent_update>`.

When a foreground child asks a question, the `subagent` call returns the question at once and the child continues in the background, because the parent cannot answer while it is blocked in the call.

If you type into a child session yourself, the child's next report still goes to the parent.

Children that OpenCode starts itself, such as subagents from a command with `subagent: true`, report through OpenCode and do not get the child tools. Passing one's `sessionID` to `subagent` or `subagent_message` adopts it, and its later reports come from the plugin.

## Options

Pass options with the object form of the plugin entry:

```jsonc
{
  "plugins": [
    { "package": "opencode-smart-subagents", "options": { "resultDelivery": "queue" } }
  ]
}
```

- `resultDelivery` (default `"steer"`): `"steer"` delivers a report at the parent's next step; `"queue"` holds it until the parent's current run ends.

Like OpenCode's built-in tool, the plugin does not cap how many children run at once.

## Limits

- Children cannot start subagents of their own. The nesting depth is one, whatever `experimental.subagent_depth` says.
- Children cannot move or rename sessions, or create or remove worktrees, through OpenCode's `opencode` code-mode tools. The parent and the plugin own those.
- A foreground call cannot be moved to the background from the TUI, as OpenCode's built-in tool allows. Use `background: true` instead.
- OpenCode starts plugins for a project when something uses that project. After a server restart, children that were running when it stopped report back once a client or session touches their project again. A report that had already reached the parent's inbox before the shutdown appears when the parent session next runs.
- Children also see the `smart-subagents` skill in their skill list; the guidance in it is written for the parent.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the plugin tracks children across plugin instances and restarts, and which OpenCode internals it depends on.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): toolchain, local installs, the isolated live test, and the OpenCode upgrade checklist.

## License

MIT