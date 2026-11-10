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

## Features

- **A thread per session.** Questions and answers stay on screen in one dialog, and the
  thread is re-sent with every new question, so follow-ups build on the ones before. The
  session's own context is untouched.
- **One answer at a time, in order.** Questions asked while an answer is arriving queue up
  behind it and go out together as the next one, numbered, so several asked together come
  back as a list. The queue drains in full whether the window is open or not.
- **The window is where you left it.** Reopening a thread shows it whole; an answer that
  arrives while the window is closed is written out once when the window comes back, and
  the line between two turns says where the session moved on.
- **Prepared prompts.** The marker in the header (or `Ctrl+Up` inside the window) opens a
  list of six ready questions. Click one, or walk it with `Up` and `Down` and press
  `Enter`; a question typed into the composer stays there while a pick is asked.
- **Click a piece of an answer to copy it.** A click copies one paragraph, list, table or
  fenced block as plain text, with a rail in the gutter marking what a click would take.
  `copy thread` in the footer takes the whole thread instead.
- **The keys the host already teaches.** `PageUp`, `PageDown`, `Enter`, `Esc` and the mouse
  wheel mean here what they mean in the session. `Ctrl+Home` and `Ctrl+End` jump the
  transcript (they are the only jump keys, because `Home` and `End` belong to the
  composer), `Delete` clears the thread behind a second press, and `Up` and `Down` at the
  ends of the composer walk through the questions asked before.
- **A badge while a question is out.** The `btw` badge in the prompt row opens the window
  for the session it belongs to, so a question can be asked and left behind safely.
- **Failures are named.** An answer that comes back empty or an error stops the queue and
  shows in the window with the question that failed, so nothing is lost silently.

![The /btw window with two answered questions, one waiting and the composer](docs/btw-window.png)

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

Run `/btw` on its own to open the window and type the question into the composer, or press
`Ctrl+Up` in a session to open it with nothing asked. Answers are written out as they come
back, and a long answer holds its own question at the top of the window while it is written.

`Ctrl+Down` takes the list of prompts down, and the window down once the list is down. The
composer keeps the keys the host's own prompt keeps: `Home` and `End` for the ends of the
text, the arrows for the cursor, and the word and selection keys of the host's input table.
`Delete` deletes a character in front of the cursor, and clears the thread only while the
composer is empty.

A thread belongs to the session it was asked in, and it lives in memory for as long as the
process runs.

## How it works

`session.generate` writes nothing back into the session, so there is no place on the server
to keep a side conversation. The thread travels inside the prompt instead, and the dialog
keeps its own copy for you. A side question cannot run a tool, so the prompt tells the
model not to call one.

## Development

```sh
bun run check        # typecheck, tests, then the build the package ships
bun run screenshots  # re-render docs/btw-window.png from the real dialog code
bun run deploy       # copy the sources into <config>/plugins/btw-followups
```

The screenshot is a render of the dialog itself: `scripts/screenshot.tsx` mounts the real
`ThreadDialog` through the same Solid runtime the host uses, inside a simulated session
view, captures the frame's styled spans and rasterizes them in a headless browser. The
design notes and the host limits behind every decision live in
[`docs/design.md`](docs/design.md).

## License

[WTFPL v2](LICENSE)
