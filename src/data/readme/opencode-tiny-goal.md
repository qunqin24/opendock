# opencode-tiny-goal

Give opencode a goal, and it keeps working until the goal is done.

Works with **opencode 2.x** (tested on 2.0.31).

## Install

```bash
opencode plugin add opencode-tiny-goal
```

Then restart opencode.

## Use

Type `/goal` followed by what you want done:

```
/goal make all tests pass
```

opencode starts working. If it stops before the goal is done, the plugin sends it a short reminder to continue. It stays quiet while opencode is busy with a subagent or a running command.

| Command | What it does |
| --- | --- |
| `/goal <text>` | Set a goal and start working |
| `/goal` | Show the current goal |
| `/goal pause` | Stop reminders, keep the goal |
| `/goal resume` | Start reminders again |
| `/goal clear` | Drop the goal |

opencode can also finish, reword or pause the goal on its own when it needs to.

If reminders get ignored 5 times in a row, the goal is paused automatically. Use `/goal resume` to continue.

Goals are saved, so they survive a restart of opencode. After a restart the plugin does not wake anything up by itself. The goal carries on the next time you write in that session.

## Settings (optional)

```json
{
    "plugins": [
        {
            "package": "opencode-tiny-goal",
            "options": { "maxUnansweredReminders": 5, "maxWaitMinutes": 30 }
        }
    ]
}
```

- `maxUnansweredReminders`: how many ignored reminders before the goal is paused (default 5)
- `maxWaitMinutes`: the longest opencode can ask to be left alone while it waits (default 30)

## Good to know

opencode 2.x plugins are new, and a future opencode update may break this plugin. If it does, please open an issue.

## Development

```bash
npm install
npm test
```

## License

[WTFPL](LICENSE)
