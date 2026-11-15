# opencode-fixtodo

This plugin does two things to fix the todo tool system for more utility, either of
which can be disabled in settings:

1. Restores the `todoread` tool.
2. Appends the current todo list to the ends of compaction messages.

Hopefully this will be a durable solution. If AnomalyCo ever decides to rip out the
`todowrite` tool as well, I'll return to this project to fix that mistake as well.

## Status

Open issues can be tracked [here](https://github.com/k98kurz/opencode-fixtodo/issues).
Historical changes can be found in the
[changelog](https://github.com/k98kurz/opencode-fixtodo/blob/master/changelog.md).

## Usage

### Installation

Install via the opencode CLI:

```bash
opencode plugin @k98kurz/opencode-fixtodo
```

This installs the plugin and adds it to your `opencode.json`. Alternatively, add
it manually:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@k98kurz/opencode-fixtodo"]
}
```

A local checkout works too: use the file path instead, e.g.
`"./path/to/fixtodo.ts"`. Note that if you install this to both the project's
.opencode/ path and the global and leave the compaction feature enabled, the todo
list will be appended to each compaction message twice.

### Configuration

Options are passed via the tuple form of the plugin entry (the options object
is scoped to the plugin, so keys are flat):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@k98kurz/opencode-fixtodo", { "compaction": false, "tool": true }]
  ]
}
```

| Option                | Default   | Description                                                                                     |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `compaction`           | `true`    | Append the current todo list to compaction summary messages.                                    |
| `tool`                 | `true`    | Register the `todoread` tool so the agent can read the todo list.                               |
| `maxSummaryCacheEntries` | `10000`  | Upper bound on in-memory compaction-summary classification cache. Keeps memory bounded in long-running processes. |

Both options default to `true`; omit either to keep the default. Config is loaded
at startup, so restart opencode after changing it. 

### Testing

First, clone the repo, then install dependencies and run the tests:

```bash
npm install
npm test          # node --test
npm run typecheck # tsc --noEmit
```

Uses built-in `node:test` runner with Node.js >= 22.18; no external dependencies.

## Why This Exists

Earlier in 2026, AnomalyCo removed the `todoread` tool, which was a mistake that
they later justified by describing themselves as lemmings following other harness
devs over a cliff. In my experience, this led to noticeable and detrimental drift
during long tasks involving compactions, which I was using at the time regularly
to reduce hallucinations. Prior to this mistake-turned-policy, I had instructions
directing agents to read the todo list after every compaction, which helped keep
them on task during long runs. Performance substantially degraded after they
accidentally dropped the `todoread` tool and decided to hang everyone out to dry
with a post-hoc rationalization for an obvious mistake. (And of course, they said
that it wasn't a problem for them, so it couldn't possibly be a problem to everyone
complaining about it.)

After I noticed this degradation in agent performance and alignment, I first
looked through their issue tracker to discover a thin fork restoring the missing
tool (fadedcode). I used that for a while, but because it was not maintained to
port fixes, and because AnomalyCo kept changing their API server behaviors, it
eventually became unusable. My workaround for a while was to add instructions to
AGENTS.md to use a todo.md file, but then parallel agents clobbered each other
constantly, so I eventually decided to make this plugin.

## Contributing

Check out the [Pycelium discord server](https://discord.gg/b2QFEJDX69). If you
experience a problem, please discuss it on the Discord server. All suggestions
for improvement are also welcome, and the best place for that is also Discord.
If you experience a bug and do not use Discord, open an issue or discussion on
Github.

## ISC License

Copyright (c) 2026 Jonathan Voss (k98kurz)

Permission to use, copy, modify, and/or distribute this software
for any purpose with or without fee is hereby granted, provided
that the above copyright notice and this permission notice appear in
all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
