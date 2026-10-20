# opencode-tiny-goal

Give opencode a goal, and it keeps working until the goal is done.

For **opencode 2.x**.

## Install

```bash
opencode plugin add opencode-tiny-goal
```

Restart opencode.

## Use

```
/goal make all tests pass
```

That's it. When opencode stops before the goal is done, it gets nudged to keep going. When the goal is done, it stops.

| Command | What it does |
| --- | --- |
| `/goal <text>` | Set a goal and start |
| `/goal` | Show the goal |
| `/goal pause` | Stop nudging, keep the goal |
| `/goal resume` | Start nudging again |
| `/goal clear` | Drop the goal |

Good to know:

- It doesn't nudge while subagents are running.
- While a command runs, it nudges at most once every `maxShellMinutes`, because opencode wakes itself up when the command ends. The plugin can't tell a command opencode waits on from one left running on purpose (like a dev server), so it doesn't stay quiet forever.
- Press Esc to stop it. It picks up again when you write a message.
- If opencode ignores 5 nudges in a row, the goal pauses. Use `/goal resume`.
- Goals survive a restart of opencode.

## Settings (optional)

```json
{
    "plugins": [
        {
            "package": "opencode-tiny-goal",
            "options": { "maxUnansweredReminders": 5, "maxWaitMinutes": 30, "maxShellMinutes": 5 }
        }
    ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `maxUnansweredReminders` | 5 | Ignored nudges before the goal pauses |
| `maxWaitMinutes` | 30 | Longest opencode can ask to be left alone |
| `maxShellMinutes` | 5 | Time between nudges while a command runs |

## Issues

opencode 2.x plugins are new, so an opencode update may break this. If it does, [open an issue](https://github.com/Ciyoxe/opencode-tiny-goal/issues).

## License

[WTFPL](LICENSE)
