# opencode-comment-checker

Flags comments that add nothing, after an `edit`, `write`, or `patch` in OpenCode v2.

The model sees the warning on its next turn and can fix it. The plugin never blocks a write: a false positive must not cost you a working edit.

```text
comment-checker: 1 comment(s) in src/cart.ts add nothing.
  line 42: restates the line below it — "increment counter"
Delete them, or replace each with why the code exists. Keep one only if it earns its place: add `@allow` on that line.
```

## Install

```sh
opencode plugin add @vasilvestre/opencode-comment-checker
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "plugins": ["@vasilvestre/opencode-comment-checker"]
}
```

Requires OpenCode 2. The plugin uses the v2 `Plugin.define` API and has no dependency.

## What it flags

Five patterns, each with a reason the model can act on:

| Rule | Example |
| --- | --- |
| `restates-next-line` | `// increment counter` above `increment(counter)` |
| `restates-name` | `// helper` above `function helper()` |
| `bare-todo` | `// TODO fix this later` |
| `commented-code` | `// const total = price * qty;` |
| `decorative-banner` | `// ==========` |

A comment that explains why the code exists passes. So does a well-formed `TODO(name): action, reason`.

## Escape hatches

```js
// @allow
let counter = 0
// increment counter @allow
increment(counter)
```

Add `comment-checker-disable-file` anywhere in a file to skip it entirely.

## Scope

- Only lines the tool added are checked. Comments that were already there are not the agent's work.
- Deletes are ignored: removing a file cannot add a comment.
- Failed tool calls are ignored.
- Files with an unknown extension are skipped rather than guessed.
- The warning is capped at 2000 characters, so a large patch cannot push a long session into compaction.

## Difference from oh-my-openagent

oh-my-openagent ships a Rust binary that flags **every** added comment and asks the model to justify it. This plugin flags only the comments it can prove are useless.

The trade-off:

| | oh-my-openagent | this plugin |
| --- | --- | --- |
| Detection | any added comment | five patterns |
| Decision | the model judges | the rule judges |
| False positives | many, by design | few |
| False negatives | none | some |

A comment that restates the code without sharing words with it passes here. That is the price of not nagging the model on every legitimate comment.

## Test

```sh
npm test
```

17 tests cover each rule, both escape hatches, the `patch` path, and the truncation.

## License

MIT.
