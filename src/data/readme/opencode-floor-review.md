# opencode-floor-review

[![npm version](https://img.shields.io/npm/v/opencode-floor-review)](https://www.npmjs.com/package/opencode-floor-review)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Raise the floor on code you did not write with your session model.

You write code with DeepSeek, Qwen, or a local model. This reviews it with a
model you choose - Opus, Codex, anything - independent of the model you are
coding with. It is tuned for weak authors: code that looks right but cannot
work, tests that cannot fail, requirements silently dropped. The reviewer is
read-only: it cannot edit your files, run shell commands, or reach the network.

```
/floor-review                          review the current change
/floor-review src/auth                 review a path
/floor-review-design docs/my-spec.md   review a spec, plan or RFC
```

## Install

Add the package to the `plugin` array in `~/.config/opencode/opencode.jsonc`
(global) or a project's `opencode.json`. The tuple form carries the one option:

```jsonc
{
  "plugin": [
    ["opencode-floor-review", { "model": "anthropic/claude-opus-5" }]
  ]
}
```

opencode installs the npm package at startup. If you already have plugins,
add this as another entry - do not put it inside an existing one:

```jsonc
{
  "plugin": [
    "some-other-plugin",
    "another@git+https://github.com/someone/another.git",
    ["opencode-floor-review", { "model": "anthropic/claude-opus-5" }]
  ]
}
```

The `plugin` array holds **entries**, and an entry is one of exactly two
shapes: a plain string, or a two-element `[spec, options]` tuple. The tuple is
only how you attach options to one plugin. It is not a container: a third
element does not add a second plugin, it is handed to the first one as an extra
argument and the plugin you meant to add never loads. Order does not matter.

### From a checkout

```jsonc
{
  "plugin": [
    ["/absolute/path/to/opencode-floor-review", { "model": "anthropic/claude-opus-5" }]
  ]
}
```

The path may be the repository root (resolved through `main`) or
`src/index.js` directly.

### Check it landed

```bash
opencode debug config | jq -r '.agent, .command | keys[] | select(startswith("floor-review"))'
```

Four lines means a healthy install - both agents, then both commands:

```
floor-review
floor-review-design
floor-review
floor-review-design
```

Two lines means only the diagnostics installed and the reviewers did not. No
lines means opencode never loaded the plugin. Both are covered under
[Troubleshooting](#troubleshooting).

## What actually runs on your machine

A plugin runs code on your computer, so here is the whole of it, plainly.

**Three moments, and nothing in between.**

1. **When opencode starts.** The plugin adds two agent definitions and two
   command definitions to the config object opencode hands it, in memory. It
   does not touch your config file on disk and makes no network call. The only
   files it reads are its own two prompt texts, from beside its own source.
2. **When you run one of the two commands.** opencode starts the reviewer as a
   subagent on the model you configured. **The code being reviewed is sent to
   that model's provider** - that is the entire point of the tool, and it is
   your provider, under your API key, chosen by you.
3. **While the review runs.** The reviewer may call one tool, `review_context`,
   which runs read-only git in the repository you invoked it from.

**What it cannot do.** Both reviewer agents are registered with `edit`, `bash`,
`webfetch`, `write` and `patch` disabled, and with `external_directory` denied
so they cannot read outside the project. They keep `read`, `grep`, `glob` and
`list`, because a reviewer that cannot read your code cannot review it. The
plugin itself contains no filesystem write of any kind.

**The only subprocess is git**, through `execFile` - never a shell, so there is
no redirection, substitution or command chaining available to anybody. The model
picks one of five modes (`diff`, `log`, `show`, `status`, `files`) and supplies
values; it cannot pass git flags of its own. git is given a minimal environment
(`PATH`, `HOME`, `GIT_TERMINAL_PROMPT=0`), which blocks the `GIT_EXTERNAL_DIFF`
and `GIT_CONFIG_*` escape hatches.

**No telemetry.** Nothing is reported anywhere. There is no analytics, no
crash reporting, and no phone-home of any kind.

**Zero runtime dependencies.** `package.json` has no `dependencies` at all. The
one devDependency is `@opencode-ai/plugin`, for types. Everything else is Node
built-ins: `child_process`, `fs`, `path`, `url`, `crypto`.

**It is small enough to read.** 1,390 lines across 9 source files, and the
published package is `src/` plus metadata - 13 files. You can audit the whole
thing in an afternoon, and I would rather you did than take my word for any of
the above. You can audit the whole thing in an afternoon,
and I would rather you did than take my word for any of the above.

## What is in this repository

Everything here either ships or explains what ships.

| path | what it is |
|---|---|
| `src/index.js` | the entry point: registers the hooks and the tool |
| `src/inject.js` | builds the two agent and two command definitions |
| `src/prompts.js`, `src/prompts/*.md` | the two reviewer prompts. The code reviewer is tuned for raising the floor: it assumes the author is likely a weaker model, checks the original request requirement by requirement when it is provided, and marks anything that can only be settled by executing the code with a `RUN-CHECK:` line for a separate verification pass to collect and run |
| `src/options.js` | validates the one option, `model` |
| `src/verify.js` | checks what actually landed in the resolved config |
| `src/tool.js` | the `review_context` tool the reviewer calls |
| `src/git-args.js` | turns a mode and values into a git argv - never flags |
| `src/git-run.js` | runs git through `execFile` with a pruned environment |
| `test/` | 201 tests. `npm test` |
| `contracts/` | opencode behaviour this plugin depends on, pinned by probe, with the exact commands and verbatim output |

Only `src/` is published; `test/` and `contracts/` stay in the repository.

## Choosing a reviewer model

The reviewer should be a model you did **not** write the code with. Asking a
model to review its own output asks it to see its own blind spot.

The default is `anthropic/claude-opus-5`, which needs an **Anthropic API key**.
A Claude Pro or Max subscription does not cover third-party tools.

**No Anthropic API key?** Change one line. Any model your opencode config can
reach works:

```jsonc
["/path/to/opencode-floor-review", { "model": "deepseek/deepseek-v4-pro" }]
["/path/to/opencode-floor-review", { "model": "openai/gpt-5.4" }]
```

Those are the entry, not the whole array. Keep your other entries alongside it.

Your provider must be listed in `enabled_providers`, and the model must be
selectable under `provider.<name>.whitelist` if you use one.

Reviews are priced per run by your provider. Switching to a cheaper reviewer is
a one-line change.

## What it looks for

Three axes: correctness of construction (code that looks right and cannot
work), architecture and fit, and operational risk. It classifies the changed
surface first, so security leads whenever the change touches untrusted input,
auth, secrets, network or the filesystem.

Before reporting anything it tries to kill the finding, against six ways a
review is confidently wrong - unreachable hazards, right diagnosis with a wrong
fix, consistency arguments where both options are worse, and so on. A finding it
cannot write a concrete failure scenario for is not reported.

`/floor-review-design` reviews a spec, plan or RFC instead of code. It
can read files, but it is the one agent denied `review_context`, so it has no
access to git at all - there is no repository history to reason about in a
document review, and the narrower surface is the point.

## If a review looks cut short

Every review ends with a completion marker. If your reviewer model runs out of
credit or hits a rate limit mid-review, you get an **incomplete** review with
partial findings labelled as partial, rather than a half-finished review
presented as a clean one.

## Troubleshooting

**opencode hides plugin failures.** This is the single thing worth knowing
before anything else. When a plugin fails to load, or its `config` hook throws,
opencode exits 0, prints nothing to stderr, and simply leaves the plugin out.
A plugin cannot write to your terminal at that point either - both
`console.error` and a direct stderr write are swallowed. So the symptom of every
install problem is the same: nothing happens.

The reason is always recoverable, in one place:

```bash
opencode debug config --print-logs --log-level ERROR 2>&1 | grep -i plugin
```

which prints, for example:

```
level=ERROR message="failed to load plugin" path=file:///.../src/index.js
  error="opencode-floor-review: `model` must be provider/model, got \"opus\"."
```

| Symptom | Cause | Fix |
|---|---|---|
| `/floor-review` says **MISCONFIGURED** and relays an error instead of reviewing | Your `model` option is not a valid `provider/model` reference | Correct it in the plugin options and restart opencode |
| The commands do not exist, and the log says `already exists and is not ours` | You already have an agent or command of that name; the plugin refuses to overwrite it | Rename yours, or remove the plugin |
| The commands do not exist and there is no log line | opencode never loaded the plugin, usually a wrong path | Check the path resolves; try `src/index.js` explicitly |
| opencode exits 1 with `Config file ... is not valid JSON(C)` | A syntax error, often a missing `]` closing the `[path, options]` tuple or a missing `,` after the `plugin` array | Unlike plugin failures this one is loud: it names the file and prints the input. See the two-shapes rule under [Install](#install) |
| A review runs but on the wrong model | Should be impossible - the reviewer refuses at invocation if the serving model is not the configured one, naming both | If you see this, the check has a bug; please report it |

A failed install is never a partial one. opencode discards the whole hook's
mutations when it throws, so you get both reviewers or neither.

## How it verifies itself

A reviewer that silently runs on your session model instead of the one you
configured is worse than no reviewer, because the output looks identical. Three
checks stand in the way:

1. **Collision, before anything is written.** If an agent or command of either
   name already exists and is not ours, it aborts without mutating. Your own
   agent is never overwritten.
2. **Fingerprint, after injection.** Model, mode, prompt hash, command template
   hash, every permission and every tool flag are compared against what we
   wrote - not merely checked for presence, which would pass on a same-named
   agent pointing somewhere else.
3. **At invocation.** Every request the reviewer makes is checked against the
   configured model before it leaves. This one runs outside the `config` hook on
   purpose, so a hook that stops firing cannot take the guard with it, and it is
   the only one of the three that is loud: it aborts the review and the error
   reaches you through the calling session.

## Compatibility

Written against **opencode 1.18.23**. Several behaviours it relies on are
undocumented, and the published plugin docs are wrong for this version on three
counts, so they were established by probe rather than by reading. Each is
recorded with its exact command and verbatim output in
[`contracts/README.md`](contracts/README.md), alongside the throwaway probes
that produced them. Re-run those after any opencode upgrade.

## Contributing

Issues and PRs are welcome at [hayate/opencode-floor-review](https://github.com/hayate/opencode-floor-review).
The test suite is `npm test`; the plugin pins undocumented opencode behaviour in
[`contracts/README.md`](contracts/README.md) - re-run the probes after any
opencode upgrade before trusting new behaviour.

Security reports are ordinary issues. The plugin is read-only by design and
contains no network code; anything that weakens that is a bug.

## Licence

MIT
