# tasticlabs plugins

Coding-agent plugins for the -tastic family of tools: Claude Code, and opencode.

```
/plugin marketplace add tasticlabs/plugins
/plugin install mutastic@tasticlabs
```

In VS Code, the extension has no `/plugin`: run `claude plugin marketplace add tasticlabs/plugins`
and `claude plugin install mutastic@tasticlabs` in a terminal, then reload the window. If your
`~/.claude/settings.json` is read-only (Nix's home-manager, say), add `--scope project` to install it
for the project instead.

## mutastic

[mutastic](https://mutastic.io) is mutation testing for Java: it plants small bugs in your code,
runs your tests, and says which ones got past them. This plugin brings it into Claude Code, so the
tests Claude writes are checked while it's still in the code, not later in CI or a review.

- **The mutastic skill** tells Claude how to read mutastic's cards, write the test each one asks
  for, prove it with `mutastic verify`, and propose an ignore, rather than contrive a test, when a
  case can't happen.
- **The gate** holds "done". When you start a task, it notes where the task starts; when Claude
  says it's finished, it runs mutastic on the lines the task changed. While a mutant there is
  missed, Claude gets the cards back and carries on. An ignore Claude made itself, or a test taken
  away, holds it too. When Claude can't get there, the gate lets it stop and tells you what's left.

### What you need

- **mutastic itself**, with `mutastic gate`: `curl -fsSL https://mutastic.io/install.sh | sh`. The
  plugin tells you, and Claude, if it's missing or too old.
- **A Java project in git**, built with Gradle or Maven, and a JDK. Anywhere else, the plugin stays
  out of the way.
- **Permission for Claude to run mutastic.** A plugin can't grant it, so add it to the project's
  `.claude/settings.json`, or your own:

  ```json
  { "permissions": { "allow": ["Bash(mutastic:*)"] } }
  ```

### What's yours to decide

Claude proposes ignores; it never makes them. Each goes in `.mutastic/proposals.yaml`, with its
reason, and its mutant still counts as missed until you accept it:

```sh
mutastic ignore --accept m90db0c4e     # it's an ignore now, as proposed
mutastic ignore --remove m90db0c4e     # or withdraw it
```

Commit the proposals with the change, and a pull request's reviewer decides them.

### Updating

```
/plugin marketplace update tasticlabs
```

then `/reload-plugins`. The [docs](https://docs.mutastic.io) have everything else about mutastic.

## mutastic for opencode

The same gate and skill for [opencode](https://opencode.ai), as the `opencode-mutastic` package:

```sh
opencode plugin opencode-mutastic        # for this project
opencode plugin opencode-mutastic -g     # for every project
```

then restart opencode. `opencode plugin opencode-mutastic --force` updates it.

opencode can't hold an agent's stop, so the gate works a little differently: when a session goes
idle, the plugin runs `mutastic gate check`, and if the task isn't done, sends the cards back as
the next prompt. When it passes, or the gate hands over to you, you see it in a toast. An idle
after an error or your abort isn't checked, and nor are subagents' sessions. If you've set bash to
`ask`, allow mutastic in `opencode.json`:

```json
{ "permission": { "bash": { "mutastic *": "allow" } } }
```

## License

Apache License 2.0.
