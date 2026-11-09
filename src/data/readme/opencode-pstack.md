# opencode-pstack

An unofficial [OpenCode](https://opencode.ai) port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), the agent workflows Lauren Tan (poteto) wrote for Cursor. It isn't affiliated with Lauren Tan, Cursor, or OpenCode.

pstack is about writing less code of higher quality, and being able to trust an agent's work enough to run several at once. You give `/poteto-mode` a goal, and it matches one of 23 playbooks, tracks the playbook's steps, spawns subagents on the models you chose, and proves the result on the real artifact. The ideas are upstream's. This port makes them work with OpenCode's own agents, skills, commands, and permissions.

## Install

```sh
opencode plugin add opencode-pstack
```

Then, in a session:

```text
/setup-pstack
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

It needs OpenCode 2.2.6 or newer. The PR playbooks use `gh`, the PR watcher needs `bun`, and `/statechart` installs TLC and Java with `mise` on first run. Scripts run on macOS and Linux.

## What you get

| Command | Use it when |
| --- | --- |
| `/poteto-mode` | You're doing anything that needs rigor. It switches the session to the `poteto` agent until you Tab away. |
| `/setup-pstack` | You want to pick models and a reasoning budget. |
| `/poteto-help` | You're new, or unsure which skill fits. |
| `/how`, `/why`, `/teach` | You want to understand code, its history, or both. |
| `/architect`, `/arena`, `/swarm` | You want design exploration, competing attempts, or parallel workers. |
| `/interrogate`, `/blast-radius` | You want a change attacked, keeping only findings that a run proves. |
| `/no-comments`, `/deslop`, `/unslop` | You're cleaning up code, comments, or prose. |
| `/recall`, `/ketchup` | You want your context back. |
| `/figure-it-out`, `/show-me-your-work` | You're starting a long run you'll review later. |
| `/reflect`, `/correct`, `/automate-me` | You want to capture lessons, or draft your own `-mode` skill. |

There are 36 commands in all. `/` in OpenCode lists them, and the [guide](generated/docs/guide/README.md) walks through a first real task. The 24 one-rule principles load on demand as `pstack-principle-*` skills.

## Choosing models

Until you run `/setup-pstack`, every role uses your session's model. The plugin won't bill you for a model or send your code to a provider you didn't choose. The cost of waiting is that review panels run the same model twice, which loses most of their value.

`/setup-pstack` proposes upstream's split: a fast code model for delegates, your strongest model for judgment, and one of each on the panels. It shows the exact config change and writes only what you approve:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-pstack",
      "options": {
        "budget": "large",
        "roles": {
          "swarm workers": "opencode-go/grok-4.7#xhigh",
          "arena runners": ["opencode/claude-opus-5-5#xhigh", "opencode-go/grok-4.7#xhigh"]
        }
      }
    }
  ]
}
```

A role you leave out uses the session model. Each entry in a panel list runs one subagent, so longer lists cost more.

It also proposes two experimental OpenCode settings, which you can decline:

- `experimental.subagent_depth: 3` lets delegates start their own subagents. At the default of 1, a delegate does that work itself.
- `experimental.todo: true` gives agents a todo tool. Without it, playbook steps stay as a checklist in the replies.

Both apply to every agent, not only pstack's, and OpenCode may change them without notice.

## Guardrails, and where they stop

The `poteto` and `poteto-agent` agents ask before commands that upstream says must always pause and that a pattern can recognize: force-pushes, `gh repo delete`, `gh release delete`, and `dropdb`. Set `"guardrails": false` in `options` to turn this off.

These rules are a seatbelt, not a security boundary:

- **They only ask.** If your client auto-approves permission prompts, or you run with `--auto`, the prompt gets approved and the command runs. To block these commands outright, add `deny` rules to your own config, because OpenCode always enforces a configured `deny`.
- **They only match patterns.** A script that force-pushes won't match. Deploys and customer messages vary too much by project, so those stay as instructions the model can ignore.
- **The rest of upstream's autonomy stays.** `poteto` takes reversible actions and external ones, such as chat posts and ticket updates, without asking, and it will use any MCP tool you've connected. Keep that in mind when you decide what to connect.

## What differs from upstream

The text is generated from upstream, so it stays close. These parts changed because OpenCode works differently:

| Upstream on Cursor | This port on OpenCode |
| --- | --- |
| `Task` subagents | The `subagent` tool, with `general` and `explore` as the built-in agents |
| `AskQuestion` | The `question` tool |
| A skill or Custom Mode for poteto-mode | A primary agent that carries the mode in its system prompt, so compaction can't drop it |
| `poteto-agent` reads the skill first | `poteto-agent` has the text from the start, so it can't skip it |
| `/loop until X` | OpenCode's built-in `/goal`, whose reviewer checks the objective at the end of each turn |
| `/loop 1h` | A background `sleep` that wakes the session |
| An always-applied model rule | Plugin options, written straight into skill text at load |
| Model slugs such as `grok-4.7-xhigh-fast` | `provider/model#variant`, and no separate fast mode |
| Cloud agents on their own VMs | Background subagents in git worktrees |
| Transcript files | `opencode session list` and `opencode session export` |
| `/how`, `how` | `/how` to type, and `pstack-how` as the skill ID, so your own `how` skill can't hijack routing |
| The cross-judge must be from another model family | The first entry in `arena cross-judge pool` that isn't the session's own model, so the order is your preference. Put a model from another vendor first for the most independent check |

Some of that costs you something:

- **Worktrees aren't VMs.** Workers share your computer, its ports, and its limits, and the work stops if your laptop sleeps. A background wait is unlikely to survive a service restart.
- **There's no one-message form of the mode.** `/poteto-mode` stays on until you Tab away.
- **The mode text is about 22 KB,** sent with every `poteto` request.

Not ported:

- `make-bot-ui` and the Benny automation pack need Cursor's webhook routines and Automations.
- Starting a Bugbot run needs Cursor. Bugbot comments on a GitHub PR still work, because they're ordinary review threads.

Added from `cursor-team-kit` so that this package stands alone: `deslop`, `control-cli`, and `control-ui`.

## Keeping up with upstream

Upstream changes often, so `generated/` is built from it rather than edited by hand. `UPSTREAM.json` pins the commit, and each run of `sync/sync.mjs` applies three layers:

1. Global rules for tool, path, and skill names (`sync/rules.mjs`).
2. Sentence-level patches (`sync/patches.txt`). Each must match upstream's text, and `sync/patches.lock.json` records a hash of what it replaced, so upstream rewording a patched sentence stops the build until someone reviews it.
3. Whole-file overrides, where a file needed a redesign (`sync/overrides/`).

The build also fails on any leftover Cursor term, dead link, or reference to a skill that doesn't exist. Upstream files are only ever read as data, and nothing from the checkout runs.

A weekly GitHub Action reruns this against upstream's latest commit and opens a PR for a human to review. It opens an issue instead when the build stops.

## Development

```sh
npm install
npm run sync        # Regenerate generated/ from the pinned commit
npm test            # No credentials and no spend
npm run typecheck
```

`npm test` includes a scripted fake model, which drives OpenCode's real tool path on an isolated server. It also serves as a canary for OpenCode behavior this package relies on that the docs don't promise: `editor.update` creating agents, and the skill tool loading hidden skills by ID.

`node test/scenarios/run.mjs --profile wiring` runs end-to-end scenarios on real models in throwaway repos, and it spends real tokens.

## Credit

The workflows, playbooks, and principles are by [Lauren Tan](https://github.com/poteto), from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack), under the MIT License. Please take praise for the ideas upstream, and bugs in this port here. See [LICENSE](LICENSE).
