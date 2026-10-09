# opencode-cognition-agent-memory

Git-backed agent memory for [OpenCode](https://opencode.ai). It keeps memory in
git repos that follow the [Agent Memory Repo spec](https://github.com/AgentMemoryRepo/agentmemoryrepo),
so you can read, search, and version it like any other project.

## What it does

- Adds each repo's `MEMORY.md` and the spec's rules to every model call.
- Adds tools: `memory_read`, `memory_search`, `memory_write`, `memory_edit`,
  and `memory_delete`. Each write makes one commit.
- Adds `/dream`, which lints the repos and asks the agent to add missing
  entries, merge duplicates, drop stale ones, and fix links. Dream is on by
  default. See [Dream](#dream) to change it.
- Adds `/memory`, a browser for the memory files, their links, and their git
  history.
- Creates a starter memory repo at `~/agent-memory` if the folder is missing or
  empty.

## Install

Add the package to the `plugins` array in `opencode.json` or `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-cognition-agent-memory"],
}
```

To pass options, use the object form:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-cognition-agent-memory",
      "options": {
        "repos": ["~/agent-memory"],
        "sync": "push",
        "dream": true,
      },
    },
  ],
}
```

## Options

| Option  | Env var              | Default          | Meaning                                                              |
| ------- | -------------------- | ---------------- | -------------------------------------------------------------------- |
| `repos` | `AGENT_MEMORY_REPOS` | `["~/agent-memory"]` | Memory repo paths. The env var takes paths separated by `:`.     |
| `sync`  | `AGENT_MEMORY_SYNC`  | `"push"`         | `"push"`, `"pull"`, or `"off"`. See [Sync](#sync).                   |
| `dream` | none                 | `true`           | Set `false` to remove `/dream` and the dream-only transcript tool.   |

Env vars win over options. Each repo's folder name is its name in tools, so
folder names must differ.

## Start a memory repo

Create an empty folder, or let the plugin create `~/agent-memory` for you. To
use an existing repo, it must be a git repo with a `MEMORY.md` at its root:

```sh
git init ~/agent-memory
```

## Inspect memory

### In OpenCode

Type `/memory`, or press `Ctrl+P` and pick **Browse agent memory**. It reads
the files without calling a model.

- The list shows every memory file with its first entry and the date it last
  changed. Typing searches file names first, then file contents.
- `Enter` opens a file and shows its raw text, including `[[links]]` and
  `[key: value]` metadata.
- In a file: `l` lists its links and backlinks, `h` shows the commits that
  changed it, and `Enter` on a commit shows the diff. `b` goes back.
- In the list: `Ctrl+H` shows the repo's full history.

The server plugin serves this data over the `agent-memory` RPC (`rpc.ts`):
`snapshot` returns every file and the last 200 commits, and `diff` returns
one commit.

### In Obsidian (optional)

Open a memory repo as an Obsidian vault. Obsidian reads `[[path]]` links as the
spec writes them, and adds a graph view, backlinks, and search.

In the browser, `o` (or `Ctrl+O` in the list) opens the selected file in
Obsidian through its `obsidian://` URL. This needs Obsidian installed. Nothing
else depends on it.

Edits made in Obsidian are not committed for you. Commit them with git, or the
plugin refuses memory writes until the repo is clean.

## Dream

`/dream` reviews the memory repos and tidies them. It runs in the current
session. The agent reads every file, adds durable facts from the session, and
merges, removes, or relinks entries as needed. It commits each change
separately.

To turn it off, set `"dream": false` in the plugin options. Then the plugin
registers no `/dream` command and no `memory_session_transcript` tool.

### Nightly runs

The plugin does not schedule anything. A scheduler can run dream unattended:
create a session in a memory repo, set its metadata `agentMemoryDream: true`,
then run `/dream` with a list of recent session IDs as its input.

In a nightly dream session, the plugin removes every tool except the
`memory_*` tools and adds `memory_session_transcript`. That tool reads the user
and assistant text of a session listed in the input. Other sessions don't get
it.

Example scheduler: on macOS, a launchd job that runs a script at 03:00. The
script lists sessions updated since its last successful run, starts a dream
session with the metadata above, waits for it, and records the run time. On
failure it leaves the run time unchanged, so the next run covers the same
sessions. Run it again by hand with `launchctl kickstart`.

## Sync

When the branch has an upstream, the plugin runs `git pull --ff-only` on load,
before each write, and at most every five minutes during sessions. With
`sync: "push"` it pushes after each commit. It never merges, resets, or
force-pushes. Failures show as a sync warning in the agent's context.

Writes are refused while a repo has uncommitted changes.

To share memory across machines, push the memory repo to a private remote and
clone it on each machine before starting OpenCode:

```sh
git clone git@github.com:you/agent-memory.git ~/agent-memory
```

## Development

```sh
bun install
bun run typecheck
```

`typecheck` covers the server plugin only. `tui.tsx` also needs
`@opentui/core`, `@opentui/solid`, `@opencode/theme`, and `solid-js`, which
OpenCode provides at runtime.

## License

[MIT](./LICENSE)
