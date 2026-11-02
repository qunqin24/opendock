# opencode-todo-enforcer

Resumes an idle OpenCode v2 session while its todos are still open.

When the agent stops with work left in its todo list, the plugin sends it back
with the list of what remains. The agent either finishes each item or marks it
cancelled.

```text
todo-enforcer: 2 todo(s) are still open.
- [pending] write the migration
- [in_progress] update the tests

Finish each one, or mark it cancelled with todowrite. Do not stop until every todo is completed or cancelled.
```

## Install

```sh
opencode plugin add @vasilvestre/opencode-todo-enforcer
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "plugins": ["@vasilvestre/opencode-todo-enforcer"]
}
```

Requires OpenCode 2. The plugin has no dependency.

## What it does

On every idle event, the plugin:

1. Reads the todos from the last completed `todowrite` tool call in the
   active context, through `session.context`.
2. Does nothing when there are no todos, or when every todo is `completed` or
   `cancelled`.
3. Otherwise resumes the session once with the remaining todos and an
   instruction to finish them or cancel them.
4. Stops resuming that session after 5 resumes.
5. Stops when the remaining todos are identical to the previous resume, because
   the agent made no progress.
6. Does nothing while a subagent or an image is still running for this session.
7. Does nothing while `/goal` is active on this session.

The handler never throws. A failed lookup means "no todos", not a broken
session.

## Options

```jsonc
{
  "plugins": [
    ["@vasilvestre/opencode-todo-enforcer", { "maxResumes": 3 }]
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `maxResumes` | `5` | How many times the plugin may resume one session |

The counter and the last remaining set live in the plugin's own storage, so a
server restart keeps both. A session that already used its resumes does not get
more after a restart.

## Known limits

- **It trusts the agent's own `todowrite` state.** A todo the agent never
  writes is invisible. A todo the agent marks `completed` without doing the
  work is accepted.
- **It reads the internal `/goal` storage key.** The key is `session:<id>` in
  OpenCode 2.2.5. If a future OpenCode renames it, the plugin no longer sees an
  active goal and resumes alongside it.
- **`/goal` and this plugin are the two resume mechanisms, and both are
  capped.** `/goal` stops at its round limit, this plugin stops at
  `maxResumes` or at the first stall. Running both gives two independent caps,
  not one.

## Test

```sh
npm test
```

18 tests cover the resume, the cap, the stall check, the `/goal` skip, the
background skip, malformed context lists, and the state kept across a restart.

## License

MIT.
