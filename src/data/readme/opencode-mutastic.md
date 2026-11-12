# tasticlabs plugins

<img src=".github/pip.webp" alt="Pip, mutastic's watermelon mascot, in sunglasses" width="150" align="right">

Coding-agent plugins for the -tastic family of tools: Claude Code, Codex, and opencode.

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
- **A project in git that mutastic reads:** today, Java built with Gradle or Maven, with a JDK.
  mutastic decides which projects it reads, so the plugin stays out of the way anywhere else.
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

## mutastic for Codex

The same plugin, skill and gate run in OpenAI's [Codex](https://developers.openai.com/codex), which
reads this marketplace and runs the plugin's hooks as Claude Code does:

```sh
codex plugin marketplace add tasticlabs/plugins
codex plugin add mutastic@tasticlabs
```

or `/plugins` inside Codex. Then start a new session and, in `/hooks`, trust mutastic's two hooks,
"mutastic gate: noting where the task starts" and "mutastic gate: checking the tests catch the
mutants on the changed lines". Codex runs a plugin's hooks only once you have, and again after each
update (`codex plugin marketplace upgrade tasticlabs`).

Codex runs the agent's commands in a sandbox where a Gradle or Maven build can't reach its caches or
the network. A plugin can't grant permissions, so to let Codex run mutastic, outside the sandbox and
without asking, add this to `~/.codex/rules/default.rules`:

```python
prefix_rule(pattern = ["mutastic"], decision = "allow")
```

The build fails in the sandbox too, so Codex asks before each `./gradlew test`. If you'd rather it
didn't, allow the build tool as well (`["./gradlew"]`, `["./mvnw"]` or `["mvn"]`), knowing that lets
it run any build task outside the sandbox. The gate itself isn't affected: Codex runs hooks outside the sandbox. The
[docs](https://docs.mutastic.io/agents/codex/) say more.

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
