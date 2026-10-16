# comment-guard

Two Claude Code hooks for prose written to whoever happened to be reading the
conversation. One lists every comment line as it lands in your working tree.
The other reports what an edit did to the shape of a markdown file. Both hand
back a rule for deciding what survives.

That reader is gone by the time the code is read. A comment justifying a diff,
or a `## Recent changes` section appended to a README, is addressed to someone
who will never see it — and the moment it lands is the only point where cutting
it is still cheap. These hooks make that moment visible.

Documents go stale the same way, one screen at a time: the section that should
have been replaced is still there above the new one, and two parts of the file
now claim to be true.

## Install

```
/plugin marketplace add https://github.com/Pjort/comment-guard
/plugin install comment-guard@comment-guard
```

Claude Code clones with your own git credentials, so if you can clone the repo
by hand you can add it. The SSH remote works just as well:
`git@github.com:Pjort/comment-guard.git`.

Both hooks run as `python3` scripts, so that has to be on the PATH. macOS and
Linux ship it; on Windows, a python.org install with the `python3` app
execution alias enabled provides it.

Restart the session so `SessionStart` fires. Nothing else to configure.

## opencode

The same hooks run under [opencode](https://opencode.ai) through a small
TypeScript plugin at `opencode/comment-guard/index.ts`. It shells out to the
Python scripts, so `python3` has to be on the PATH, exactly as above.

Install it from npm:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-comment-guard"]
}
```

Or point the config at the plugin directory in a checkout, which is what to use
before the package is published:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///absolute/path/to/comment-guard/opencode/comment-guard"
  ]
}
```

The entrypoint is a directory, not a single file: opencode's `plugins` array
resolves directories to their `index.ts`. (A bare `.ts` file is only loaded
automatically from a discovered `.opencode/plugins/` directory.)

One package serves both opencode APIs. opencode 2 reads the default export's
`setup()`; opencode 1.18.29 and newer reads its `server()`. On opencode 1 the
config key is still the singular `plugin`.

opencode reads its tool events, translates them into the payload the hooks
already understand — `session.created` for the snapshot, `write` before it
overwrites a file, and the edit/write/shell tools after a change lands — and
appends whatever the hooks report to the tool result. The plugin finds the
Python scripts inside its own package by default; set `COMMENT_GUARD_HOOKS` to
the `hooks/` directory if you keep them somewhere else.

### Publishing the npm package

The tarball ships the TypeScript plugin source together with the Python hooks it
calls; opencode runs the `.ts` entrypoint directly, so there is no build step.
The `opencode-plugin` keyword is what gets the package picked up by third-party
directories; the official ecosystem list is a docs PR.

```
npm login
npm publish
```

## Update

```
claude plugin marketplace update comment-guard
claude plugin update comment-guard@comment-guard
```

The first fetches the repo. The second compares version numbers rather than
file contents, so it only acts once `version` in
`plugins/comment-guard/.claude-plugin/plugin.json` has been raised and pushed;
short of that it reports `already at the latest version` and leaves the old
copy running.

Restart afterwards. The install path carries the version in it, so a session
that is already open goes on running the copy it started with.

### Working on the hooks

Installing copies the source into `~/.claude/plugins/cache/`; it does not link
to it, so editing a checkout changes nothing on its own. To try a change before
pushing it, add the checkout as a marketplace of its own:

```
claude plugin marketplace remove comment-guard
claude plugin marketplace add ~/src/comment-guard
```

A path source copies the working tree, so a change does not have to be
committed first — it still needs the version bump for `plugin update` to have
anything to do. Both sources carry the same marketplace name, hence the
`remove` first.

## Uninstall

```
claude plugin uninstall comment-guard@comment-guard
claude plugin marketplace remove comment-guard
```

The first takes the hooks out, the second forgets the marketplace. To stop them
without giving up the install, `claude plugin disable
comment-guard@comment-guard`.

Session state under `~/.claude/comment-guard/state/` is not the plugin's data
directory and survives all three. Delete it by hand, or leave it to the 7-day
prune.

## What it reports

```
A shell command added 2 comment line(s):

  # retry three times because the API is flaky
  # TODO: extract this

Put each through all four before moving on:
  ...
```

```
This edit to README.md: 44 line(s) added, 6 replaced. The file is now 612
lines under 31 heading(s).

It grew without replacing anything, which is how a document goes stale.

3 added line(s) describe the change rather than the thing:

  ## Recent changes
  The parser now handles nested fences.
  Previously this required a flag.

A document describes what is true now, to a reader who never saw the
version before it. Put the edit through all four:
  ...
```

The comment guard returns `decision: "block"` with the listing as `reason`, so
the report arrives next to the tool result as a failed check rather than as
context. `PostToolUse` cannot undo anything — the edit has already landed, and
both shapes reach Claude at the same point. The bet is that one of them reads
as something to answer and the other as something to scroll past.

An edit also carries a tally, `added 2 comment line(s) -- 1 removed, net +1`.
Rewording a comment shows as `net +0` and cutting one as a negative, so the
cheap response to a report — making the comment shorter instead of deciding
whether it earns its place — is visible rather than indistinguishable from a
cut. A shell command gets no tally: it is measured against a snapshot that only
ever grows, which shows what arrived but not what left.

The doc guard stays advisory, as `additionalContext`: it reports the shape of a
prose edit, which is a judgement call rather than a rule.

## How it decides what is new

Four events, because an edit is not the only way a file changes. Both hooks
watch all four, and each keeps its own state file so they never race.

| Event | Trigger | What it does |
| --- | --- | --- |
| `SessionStart` | session begins | Snapshots the working tree, silently. Everything already uncommitted has been decided on. |
| `PreToolUse` | `Write` | Keeps what the file said, before `Write` overwrites it. |
| `PostToolUse` | `Edit` `Write` `MultiEdit` | Diffs the tool payload. Exact, no guessing. |
| `PostToolUse` | `Bash` | Diffs the working tree against the snapshot. Catches heredocs, `sed -i`, `cp`, `tee`, `git checkout/merge/reset`. |

The snapshot is per repository and per session. An edit folds what it reported
into the snapshot, so the next shell command does not raise the same line twice.

A repository enters scope at `SessionStart`, or the first time an `Edit`/`Write`
lands in it. So a session started in `~/dev` still gets shell coverage of
`~/dev/proj` once a tool edit has touched it, and a session working across two
checkouts watches both.

## What counts as a comment

Line comments, block comments, and docstrings, in 25 comment syntaxes covering
171 extensions and bare filenames:

| Spelling | Languages |
| --- | --- |
| `#` | Python, shell, Ruby, Perl, YAML, TOML, R, Nix, Crystal, Nim, awk, CMake, Makefile, Dockerfile, `.gitignore`, `.env`, … |
| `//` `/* */` | C, C++, Objective-C, C#, Java, Go, JavaScript, TypeScript, Swift, Kotlin, Scala, Dart, Groovy, Zig, Solidity, Proto, Verilog, Bicep, JSONC, SCSS/Less/Sass |
| `--` | SQL, Lua (`--[[ ]]`), Haskell (`{- -}`) |
| `<!-- -->` | HTML, XML, SVG, XSLT, `.csproj`, `.plist`, Vue and Svelte (which also take `//` and `/* */`) |
| `;` | Clojure, Elisp, Scheme, Racket, INI/conf (with `#`) |
| `%` | Erlang, LaTeX |
| others | PowerShell `<# #>`, Ruby `=begin/=end`, OCaml/F# `(* *)`, Julia `#= =#`, VB `'`, Fortran `!`, batch `rem`/`::`, Terraform `#` `//` `/* */`, PHP `//` `#` `/* */` |

**Docstrings** report their prose lines, like a block comment does. A
triple-quoted string counts as one when nothing but whitespace precedes it —
where a statement was expected — or when it hangs off Elixir's `@doc`. So
Python, Elixir, Julia and GraphQL docstrings are reported, and
`SQL = """select ..."""` is data and stays quiet.

## What counts as bloat

Any `.md`, `.markdown`, `.mdown`, `.mkd` or `.mdx` file, anywhere in the tree —
a `CLAUDE.md`, a `docs/architecture.md`, a design note three directories down,
not just the README. Reports name a file by its path from the repository root,
since documents share basenames (`docs/api/auth.md`, `docs/web/auth.md`) in a
way code usually does not.

Markdown is prose throughout, so listing the lines that landed would only echo
the edit back. Four signals are read off its shape instead, and any one of them
reports:

| Signal | Fires when |
| --- | --- |
| **narration** | An added line only parses for someone who saw the diff: a `## Recent changes` heading, "now" in front of anything ("now wired", "now the default"), "renamed as", "changed from `0` to `1001`", "previously", "has been updated", "we renamed", a dated bullet. |
| **repetition** | The edit added a heading the file already has, or a passage sharing 60% of its vocabulary with one already there. This is staleness caught in the act: the section that should have been replaced is still sitting above the new one. |
| **appending** | The edit added 12 or more lines beyond what it removed, and removed less than a fifth of what it added. A document that tracks its subject is rewritten about as often as it grows. |
| **size** | The file is past 400 content lines or 30 headings, and the edit made it longer. |

A file being born is exempt from the last two: it replaced nothing because
there was nothing to replace, and its length was chosen whole rather than
accumulated. It can still narrate, and it can still say a thing twice.

Nothing else is exempt. A `CHANGELOG.md` or an ADR is judged like any other
document — narrating changes is what those are for, so an edit appending to one
is either a deliberate release note or a sign that a change went somewhere it
did not belong, and both are worth seeing. Only `node_modules/` and `vendor/`
are skipped, on the grounds that nobody here wrote them.

## What it does not report

- **Tool directives.** `# noqa`, `# type: ignore`, `// go:generate`, `// eslint-disable`, `-- noqa` and friends answer to a tool, not to a reader. A word that merely starts with one (`# pragmatic choice`) still counts as prose.
- **Markers inside string literals.** A regex like `r"^#\d+"` is not a comment, and neither is `url(http://x)` or TeX's `\%`.
- **Block delimiters.** A JSDoc block reports its prose lines, not `/**` and `*/`.
- **Fenced and indented code in markdown.** A `now uses stdin` inside a ``` block is sample output, not a claim about the past. Nested list items are still prose.
- **YAML front matter**, which answers to a tool rather than a reader, and so counts towards neither length nor repetition.
- **A table repeating its header.** A table means its header every time it appears. Setext headings (`Title` over `=====`) do count, and thematic breaks do not.
- **A markdown edit that replaces as much as it adds.** That is a rewrite, which is the thing being asked for.
- **Files it does not know.** Anything outside the tables above. `.rst`, `.adoc` and `.txt` are not read as documents.

Both hooks are silent on anything they cannot parse, and each entry point is
wrapped so a failure can never break an edit.

## Limits

- A worktree and a submodule each count as a tree of their own, entering scope the first time an edit lands in one, since neither shows up in the parent's `git diff`. Where two trees in scope hold the same name, reports give the full path rather than the relative one.
- The `Bash` path needs a git repository, and one in scope. A file that belongs to no repository, or to one nothing has edited yet, is covered only by `Edit`/`Write`/`MultiEdit`.
- Untracked files are scanned up to 500 files and 200 KB each. Measuring how long a document is has its own ceiling of 4 MB, above the one for reading prose — otherwise the largest documents, the ones the size signal exists for, would be the ones exempt from it. Past 4 MB the report makes no claim about the length.
- A comment deleted and re-added in the same session is reported once, not twice.
- `.m` is read as Objective-C, because `%` is modulo in C and reporting every `i % 2` would be worse. MATLAB comments in `.m` are missed.
- Vimscript, Perl POD and Pascal are left out: `"` in Vimscript both opens a string and starts a comment, and there is no reading of it that does not either invent comments or swallow strings.
- A hunk that begins inside a docstring reports only what the diff shows of it. Block comments have the same limit, and recover from a leading `*`.
- Where quoting is misread, the line is dropped rather than guessed at. Measured against CPython's own tokenizer over 400 stdlib files: 0.3% reported that it should not have (all of them real docstring lines whose escapes the comparison could not match), 0.6% missed, nearly all of those directives it drops on purpose.
- Narration is matched on wording, so it is a prompt to check, not a verdict — the deciding is the rule's job, not the hook's. Measured against 80 held-out lines labelled by hand, it catches **80%** of them at **89%** precision, and fires on 0.6% of content lines across 2,079 markdown files. What it misses is narration with no cue word in it: "the deploy is two steps, not three", "deactivation added". "Now" is held out where it points at the clock rather than at a previous version — "for now", "right now", "now run the tests".
- Repetition is matched on vocabulary, so it catches a passage rewritten in other words but not one restated in entirely different ones. Replayed over 400 real markdown commits it fires on 1.8% of them; across 367 documents no two passages reach the 0.6 threshold by accident.
- The thresholds are not delicate, which is the main thing to know about them. Over 2,373 markdown file-edits in this machine's git history, `appending` fires on 32% of them; anything from 6 to 40 lines lands between 36% and 21%, and the rewrite share from 2 to 10 moves it by 4 points. The `added > removed` gate is what decides, not the numbers. 42% of those edits removed nothing at all.
- A shell command that rewrites a document in place is read as one edit against the session baseline, so a rewrite and an append in the same command cancel out.
- The thresholds — 12 lines, a fifth, 400 lines, 30 headings — are constants at the top of `doc_guard.py`. There is no config file.

## State

Two JSON files per session under `~/.claude/comment-guard/state/`, one per
hook, pruned after 7 days. Set `COMMENT_GUARD_STATE_DIR` to move them.

## Tests

```
python3 -m unittest discover -s tests -v
```

No dependencies. Each test drives a hook as a subprocess against a throwaway
git repo, the same way Claude Code does.
