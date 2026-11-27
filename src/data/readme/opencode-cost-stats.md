# OpenCode Cost Stats

The total cost of your whole OpenCode session, subagents included, in the sidebar. Run `/session-stats` for token and cost shares by model and by agent, plus session timing.

**Sidebar** (replaces the built-in "Context" block):

```text
Context                    [+]
84,210 tokens
42% used
$6.12 spent
incl. 14 subagents
```

**Click the sidebar block** (the `[+]` marks it as clickable, and the whole block brightens on hover; the footer total, if enabled, works the same way) to open the detailed breakdown. `/session-stats` opens the same dialog:

```text
CVE worker deployment pipeline                                                  esc close
15 sessions · 1 root + 14 subagents

╭─────────────────╮ ╭─────────────────╮ ╭─────────────────╮ ╭─────────────────╮
│ Total cost      │ │ Wall-clock      │ │ Tokens          │ │ Cache hit rate  │
 │ $6.12           │ │ 1h 9m           │ │ 40M             │ │ 96%             │
 │ 323 steps       │ │ 53m 55s model…  │ │ 1.2M in · 133k… │ │ 38.4M cached    │
╰─────────────────╯ ╰─────────────────╯ ╰─────────────────╯ ╰─────────────────╯

Tokens by model                                                         40M tokens
████████████████████████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░
■ google-vertex/gemini-4-neon 30M 75%  ■ anthropic/claude-sonnet-5-5 10M 25%

Tokens by agent                                                         40M tokens
████████████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
■ architect 24M 60%  ■ explore 16M 40%

Cost by model                                                               $6.12
████████████████████████████████████████████████████████████████░░░░░░░░░░░░░░░░
■ google-vertex/gemini-4-neon $4.90 80%  ■ anthropic/claude-sonnet-5-5 $1.22 20%

Cost by agent                                                               $6.12
████████████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
■ architect $3.67 60%  ■ explore $2.45 40%
```

Models and agents with no recorded per-token price (for example GPT models used through a ChatGPT subscription) show `(sub)` in the cost legend and don't take up space in the cost bar. Their tokens are still counted. A cost followed by `+` means some of its steps had no price.

The real dialog uses your theme's colours for the bar segments and their legends. Models and agents keep their colours across token and cost bars. Scroll with the mouse wheel; press Esc or click **esc close** to close it.

## Requirements

- [OpenCode](https://opencode.ai/) **2.4.1 or later in the 2.x series**. This plugin uses the v2 TUI API. It doesn't support OpenCode v1 or the desktop app.

## Install

```sh
opencode plugin add github:championswimmer/opencode-cost-stats
```

Once it's on npm: `opencode plugin add opencode-cost-stats`.

If `plugin add` doesn't put it in your TUI config, add it to `cli.json` yourself (`~/.config/opencode/cli.json`).

### Replace the built-in cost display

OpenCode's own sidebar "Context" block shows a `$ spent` line. To swap it for this plugin's block, turn the built-in one off in `cli.json`:

```json
{
  "plugins": ["opencode-cost-stats", "-opencode.sidebar.context"]
}
```

This plugin's block shows the same tokens and `% used` lines, so nothing is lost. Without that line you get both blocks.

## What's counted

- **The whole tree.** Cost is summed over the root session and every subagent session below it, at any depth. Viewing a subagent shows the root's total, not just the subagent's own cost. (OpenCode's built-in line already sums subagents when you view the root session, but only for sessions the TUI has loaded.)
- **Tokens** are input, output, reasoning, cache read and cache write, summed over every assistant step.
- **Cost** is what OpenCode recorded for each step. Steps that used tokens but have no recorded cost are labelled `(sub)`: typically a model billed through a subscription rather than per token. They aren't in the cost total, and the Total cost card says how many steps were left out. The sidebar total also leaves them out.
- **Time** has two numbers. _Wall-clock_ runs from the root session's creation to the last update anywhere in the tree. _Model time_ adds up each step's duration, so parallel subagents overlap and it can exceed wall-clock time.
- **By agent** uses the agent each step ran as (`build`, `explore`, a custom subagent, …).
- Model variants such as `high` are merged into their model.

`/session-stats` reads the data from the server when you run it, so it's complete even for sessions you haven't opened in this TUI. It's separate from OpenCode's built-in `/stats`, which covers all your sessions over time.

## Placement

Open the command palette (`Ctrl+P`) and pick **Session cost placement** to choose where the total appears:

| Placement | Meaning                                                |
| --------- | ------------------------------------------------------ |
| Sidebar   | Default. The "Context" block above.                    |
| Footer    | Adds `total $6.12` to the prompt footer's status area. |
| Both      | Sidebar and footer.                                    |
| Off       | Hide the total. `/session-stats` still works.          |

**The footer can only be added to, not replaced.** OpenCode's prompt footer draws its usage text (tokens, `%` and cost) as part of the whole footer, which also holds subagent counts and shortcut hints. A plugin can only replace the whole footer, so this plugin adds its total next to the built-in usage instead.

## Development

```sh
npm ci
npm run check
```

Checks cover lint, formatting, strict types, tests and the npm package contents. `npm run build:entry` compiles `src/tui.tsx` to `dist/tui.js` without bundling the host's OpenTUI or Solid. Commit the rebuilt `dist/` when source changes so GitHub installs don't need build tools. Don't add a `build` or `prepare` script: OpenCode's Git installer treats those as a signal to prepare the checkout instead of using the shipped entry. To test a checkout, use its absolute directory as the plugin in `cli.json`.

## License

MIT
