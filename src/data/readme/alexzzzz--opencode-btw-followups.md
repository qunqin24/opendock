# @alexzzzz/opencode-btw-followups

An OpenCode plugin that replaces the built-in `/btw` command with a dialog that keeps a
thread of follow-up questions.

[![npm](https://img.shields.io/npm/v/@alexzzzz/opencode-btw-followups)](https://www.npmjs.com/package/@alexzzzz/opencode-btw-followups)

## Why

The built-in `/btw` asks one question and drops the exchange, so a follow-up question starts
from nothing. Asking inside the session instead puts side talk into the context of the work
and into the transcript.

This plugin keeps every question and answer on screen, answers them one at a time in the
order they were asked, and writes nothing into the session it was asked about.

If you only ask one question and never come back to it, the built-in command is enough.

## Install

```sh
opencode plugin add @alexzzzz/opencode-btw-followups
```

It needs OpenCode 2.0.19 or newer and a terminal at least 15 rows tall.

### Turn the built-in command off

Both plugins answer the same `btw` command, so the built-in one has to go or the two
collide. `cli.json` takes a removal prefixed with `-`:

```jsonc
{
  "plugins": ["*", "-opencode.btw", "@alexzzzz/opencode-btw-followups"]
}
```

`*` enables every plugin, and `-opencode.btw` disables that one. A later entry re-enables a
plugin, so the path has to come after the removal.

## Usage

```text
/btw why does the ci fail on the second test?
```

Run `/btw` on its own to open the window and type the question into the composer. An answer
appears as it is written, and a thread that already holds answers is reopened as it was
left.

![The /btw window with two questions, two answers and the composer](docs/btw-window.png)

`PageUp`, `PageDown`, `Home` and `End` move the transcript, `Delete` clears the thread, and
`Esc` closes the window and keeps the thread. A click on `copy thread` copies the whole
thread through the terminal clipboard.

A thread belongs to the session it was asked in, and it lives in memory as long as the
process runs.

## How it works

`session.generate` writes nothing back into the session, so there is no place on the server
to keep a side conversation. The thread travels inside the prompt instead, and the dialog
keeps its own copy for you. A side question cannot run a tool, so the prompt tells the
model not to call one.

## Development

```sh
bun run check      # typecheck, tests, then the build the package ships
```

The design notes and the host limits behind every decision live in
[`docs/design.md`](docs/design.md) in the
[repository](https://github.com/alexzzzz/opencode-btw-followups).

## License

[WTFPL v2](LICENSE)
