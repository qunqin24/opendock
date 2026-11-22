# opencode-loop-guard

[![npm](https://img.shields.io/npm/v/opencode-loop-guard)](https://www.npmjs.com/package/opencode-loop-guard)

An [OpenCode](https://opencode.ai) 2.x plugin that stops a model from running
the same tool call over and over.

Local models in long sessions sometimes get stuck re-running one command and
re-reading the same result. OpenCode's built-in `doom_loop` check only catches
repeated *failures*, so a call that keeps succeeding with the same output can
loop a hundred times.

## What it blocks

A tool call is refused when the same tool with the same input already returned
the same result:

- in each of the last two calls (a straight repeat), or
- twice more among the last 10 calls (an A, B, A, B, A loop).

The model gets an error telling it to use the result it already has, take a
different step, or ask the user. If it sends a blocked call 3 times in a row
anyway, the guard ends the turn (OpenCode's `session.interrupt`), so a stuck
model stops and waits for you instead of retrying for half an hour. Any call
that runs resets that count. It's never blocked when:

- the result changes between runs (polling until something finishes works), or
- a file was edited since (`edit`, `write`, `patch` and similar tools start the
  count over, so "edit, re-run the tests, same failure, edit again" keeps
  working), or
- the shell command waits or polls (`sleep`, `wait`, `watch`, `*_status`,
  `unity … status`).

Fields that don't change what a call does (`description`, `timeout`, `title`,
`reason`) and key order are ignored when comparing inputs.

## Install

Add it to `opencode.json`:

```json
{ "plugins": ["opencode-loop-guard"] }
```

or copy `index.js` to `~/.config/opencode/plugins/loop-guard.js`. Restart
OpenCode.

## Limits

- It remembers the last 10 calls of up to 200 sessions, in memory only.
- It relies on OpenCode 2.x's `tool.hook("execute.before" | "execute.after")`
  plugin API. Tested with OpenCode 2.1.4 and 2.3.2.

## Development

```bash
npm test
```
