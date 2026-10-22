# commentie

[![npm version](https://img.shields.io/npm/v/commentie.svg)](https://www.npmjs.com/package/commentie)
[![npm downloads](https://img.shields.io/npm/dm/commentie.svg)](https://www.npmjs.com/package/commentie)
[![license](https://img.shields.io/npm/l/commentie.svg)](https://github.com/mfozmen/commentie/blob/main/LICENSE)

A Claude Code and OpenCode plugin that keeps code comments few, short and
plain.

AI-written code fills with narrative comments, and reviews then loop on fixing
prose. commentie teaches the rule while code is written, cleans up on demand,
and guards cheaply: a stdlib script first, a cheap read-only critic second, and
the critic warns once per branch and never blocks.

## The rule

Clear code needs no comment. Comment only what the code cannot say: a
non-obvious **why**, a **trap**, or a **hidden coupling**. One or two short
sentences. Banned: narration, history, bare issue refs, commented-out code,
docblocks that restate the signature.

## What you get

| Piece | What it does |
|---|---|
| Rule | The writing rule, with examples in Python, TypeScript, C#, Go and SQL. |
| Cleanup | Deletes narration and history, shortens the rest, keeps every why, trap and coupling. Never touches code. Lists what it was unsure about instead of deleting it. |
| Critic | Read-only review of the comments a diff range added. One WARNING finding, raised once per branch. |
| Script | Stdlib, no dependencies. Flags history words, bare issue refs, commented-out code and long blocks in the added lines of a diff. |
| Hook | Off by default. Runs the script after an edit and shows findings as a warning. Never blocks. |
| Install | Adds the rule to CLAUDE.md or AGENTS.md and offers pre-commit or CI wiring. Asks before every change. |

## Claude Code

```
/plugin marketplace add mfozmen/devkit
/plugin install commentie@devkit
```

- Rule: the `commentie:comments` skill, loaded when Claude edits code.
- Cleanup: `/commentie:cleanup [range | path]`.
- Install: `/commentie:install`.
- Critic: the read-only `commentie:comment-critic` agent, on Haiku.

The after-edit hook is off by default. Enable it with
`/plugin configure commentie@devkit` and turn on "Check comments after each
edit", or at install time:

```
claude plugin install commentie@devkit --config hook_enabled=true
```

## OpenCode

For a local checkout, point the config at the repo directory:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/commentie"]
}
```

Once published to npm, `"plugin": ["commentie"]` works too. The plugin
registers itself; no files are copied into the project.

- Rule: the same rule, injected into the system prompt.
- Cleanup: `/commentie-cleanup [range | path]`.
- Install: `/commentie-install`.
- Critic: the read-only `comment-critic` subagent, using your default model
  unless pinned.

The after-edit hook is off by default. Add options as the second element of the
plugin entry:

```json
{
  "plugin": [["file:///absolute/path/to/commentie", { "hook": true }]]
}
```

- `hook` (default `false`): append findings to the tool result after an edit.
- `criticModel`: pin the critic to a model, for example
  `"anthropic/claude-haiku-4-5"`.

`COMMENTIE_HOOK=true` enables the hook too. The hook finds `python3` or `python`
on `PATH`.

## The script

```
python scripts/check_comments.py                 # staged changes
python scripts/check_comments.py main..HEAD      # a range
python scripts/check_comments.py --file src/a.py # one file against HEAD
python scripts/check_comments.py --strict ...    # exit 1 on findings
python scripts/check_comments.py --self-test
```

Output is `file:line: reason`. Exit code is 0 unless `--strict`.
Skip patterns with a `.commentie-allow` file at the repo root, one regex per
line. Change the long-block threshold with `--max-block N` (default 5).

## Evals

```
python scripts/check_comments.py --self-test
python evals/run_evals.py
```

`evals/fixtures` holds diffs labelled narrative or useful, with the expected
script findings and critic verdict in `evals/expected.json`. The useful set is
real why, trap and coupling comments the script must not flag. Critic verdicts
are checked by running `@agent-commentie:comment-critic` on a fixture applied
to a scratch repo.

## Releasing

Releases are cut by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/). PRs are
squash-merged, so the PR title is the commit: `feat: ...` bumps the minor
version, `fix: ...` the patch, `feat!: ...` or a `BREAKING CHANGE:` footer the
minor while below 1.0. `docs`, `ci`, `chore`, `test` and `refactor` release
nothing on their own. After each merge to `main`, release-please updates a
release PR that bumps `.claude-plugin/plugin.json`, `package.json` and
`CHANGELOG.md`; merging it tags `vX.Y.Z` and publishes the GitHub release.
Publishing the same version to npm with `npm publish` makes
`"plugin": ["commentie"]` work for OpenCode; a local path works without it.

## Licence

MIT
