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
left. An answer that arrives while the window is closed is written out when the window comes
back, and an answer already written out is there whole.

![The /btw window with two questions, two answers and the composer](docs/btw-window.png)

`PageUp`, `PageDown`, `Ctrl+Home` and `Ctrl+End` move the transcript, `Delete` clears the
thread, and `Esc` closes the window and keeps the thread. A click on `copy thread` copies the
whole thread through the terminal clipboard. Closing the window leaves a question that was
asked and is still waiting to go out in the session, and it goes out the next time the window
opens.

The composer takes the keys the host's own prompt takes: `Home` and `End` for the ends of the
text, the arrows for the cursor, and the word and selection keys of the host's input table.
`Delete` deletes a character in front of the cursor, and clears the thread only while the
composer is empty.

`Up` and `Down` walk through the side questions asked in this session, newest first. The press
does what the field would do first: `Up` moves a line up and `Down` a line down. At the very
start of the text `Up` brings back the previous question, at its very end `Down` brings the next
one, and `Down` past the newest question brings back what was typed. On the first line a press
that is not at its start goes to the start, and on the last line one that is not at its end goes
to the end.

While a side question is being answered, the `btw` badge in the prompt row opens the
window for it.

The header of the window holds a marker that opens a list of prepared prompts, and a click on
one of them asks it. `Down` at the end of the last line opens the same list and leaves whatever
is typed in the field alone. `Up` and `Down` move the pick, `Up` on the first prompt closes the
list and puts the cursor back in the composer, and `Enter` asks the pick.

`Ctrl+Up` in the session opens the window with nothing asked, and `Ctrl+Up` inside the window
opens the same list, which the marker in the header toggles as well. `Ctrl+Down` takes the list
down, and the window down once the list is down. `Up` and `Down` move the pick, `Enter` asks it,
`Up` on the first prompt or `Esc` closes the list, and the field keeps whatever was typed in it.

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
