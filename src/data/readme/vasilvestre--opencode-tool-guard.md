# opencode-tool-guard

Asks for your approval before a dangerous shell command runs in OpenCode v2.

The plugin watches the permission decision. When the agent runs `rm -rf`, it changes an automatic `allow` into `ask`, and names the pattern in the prompt:

```text
tool-guard: "rm -rf" needs your approval
```

## Install

```sh
opencode plugin add @vasilvestre/opencode-tool-guard
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "plugins": ["@vasilvestre/opencode-tool-guard"]
}
```

Requires OpenCode 2. The plugin has no dependency.

## What it catches

Four patterns, matched case-insensitively against every command string of a `shell` action:

| Pattern | Matches | Does not match |
| --- | --- | --- |
| `rm -rf` | `rm -rf /`, `rm -fr x`, `rm -r -f x`, `rm --recursive --force x`, `sudo rm -rf /`, `sh -c "rm -rf /"` | `rm file.txt`, `rm -f file.txt`, `rm -r dir` |
| `git push --force` | `git push --force`, `git push -f origin main` | `git push --force-with-lease`, `git push origin main` |
| `DROP TABLE` | `DROP TABLE users`, `drop table if exists users` | `DROP INDEX` |
| `chmod 777` | `chmod 777 run.sh`, `chmod -R 777 /var/www` | `chmod 755 run.sh` |

The `rm` rule needs both a recursive flag and a force flag. One alone is not enough.

## Modes

| Mode | Behaviour |
| --- | --- |
| `warn` (default) | Logs the match with `console.warn`. Changes nothing. |
| `enforce` | Changes `allow` to `ask` and sets the message. |

Set the mode in `opencode.jsonc`:

```jsonc
{
  "plugins": [["@vasilvestre/opencode-tool-guard", { "mode": "enforce" }]]
}
```

Start in `warn` mode for a day. Read the log, and check the matches are the ones you care about.

## Known limits

- **The hook can only escalate.** It runs after the effect is resolved. It can turn `allow` into `ask`. It cannot turn `ask` into `allow`.
- **A configured `deny` wins.** A `deny` from your config or from an agent ruleset never reaches the hook. The plugin does not change it.
- **The pattern list is short, not a sandbox.** It catches four common destructive commands. It does not parse shell syntax. A command built from variables, a script file, or a wrapper program passes. Use OpenCode's own `permission` config for a real policy.

## Test

```sh
npm test
```

The suite covers each pattern, both modes, the `deny` and `ask` cases, a non-shell action, and a broken event.

## License

MIT.
