# oc-todo

**Track your session's next steps without losing them between turns.**

## Install

```jsonc
{ "plugins": ["oc-todo@git+https://github.com/nathwn12/oc-todo.git#main"] }
```

Save that in your `opencode.jsonc`, restart OpenCode, and the `todo` tool appears in your next session. You need OpenCode V2 with Node 22 or newer, or Bun 1.4 or newer.

The GitHub ref above is the fast track and default; it follows `main`.
The tagged npm release is the stability track; it follows reviewed versions only.

### Or let your AI install it

```text
Add oc-todo from nathwn12/oc-todo to my opencode.jsonc plugins with oc-todo@git+https://github.com/nathwn12/oc-todo.git#main, restart OpenCode, then run the todo tool list action and show me the stored todos.
```

### Wire it yourself

Add this to `opencode.jsonc`:

```jsonc
{
  "plugins": ["oc-todo@git+https://github.com/nathwn12/oc-todo.git#main"]
}
```

### Offline or pinned

Pin the reviewed release instead of tracking `main`:

```jsonc
{
  "plugins": ["oc-todo@0.5.0"]
}
```

Replace `#main` with a full commit sha to pin the GitHub ref to one commit.

## Use it

Track a multi-step task:

> Use the todo tool to track these steps: write the failing case, fix it, rerun the check.

You get back the stored list with one line per item, plus a counts line such as `2 open · 0 in progress · 0 done`.

Check status mid-task:

> What is left on the todo list?

You get back the same stored list; pending items show `[ ]` and completed items show `[x]`.

Open the visual inspector with `/show-todos`, move with `up`/`down` or `k`/`j`, and close with `escape` or `q`.

## What you get

- Keep your plan across turns: each session stores its own list and it survives restarts.
- Drive the list through one tool: your agent lists, adds, updates, completes, moves, and clears with `todo`.
- See progress beside your session: the sidebar checklist refreshes on every stored write.
- Read full detail on demand: `/show-todos` shows content, notes, and timestamps for the selected item.
- Reuse your V1 habit: `write` replaces the whole list like `todowrite`.

## Requirements

- OpenCode V2.
- Node 22 or newer, or Bun 1.4 or newer.
- To uninstall, remove the entry from `plugins` and restart OpenCode.

## Links

- Repository: https://github.com/nathwn12/oc-todo
- Package: https://www.npmjs.com/package/oc-todo
- Issues: https://github.com/nathwn12/oc-todo/issues
