# opencode-retitle

Keep OpenCode session titles meaningful. `opencode-retitle` regenerates a
session title at three moments:

1. **After every N completed user turns** (default 5). The title is generated
   once both the prompt and its response are in the transcript.
2. **After a compaction finishes.**
3. **After the first completed response in a forked session.**

It also protects titles you set by hand: once a title it did not write appears,
retitling pauses for that session until you re-enable it.

## Screenshot

`/retitle-status` reports the state of the current session as a toast, without
making a model call:

![The /retitle-status toast in the OpenCode TUI](docs/retitle-status.png)

## Install

Add it to `opencode.json(c)` and pass settings under `options`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-retitle",
      "options": {
        "turns": 5,                    // retitle every N user prompts; 0 disables
        "onCompaction": true,          // retitle after a compaction
        "onFork": true,                // retitle after the first response in a fork
        "respectManualRename": true,   // pause retitling once a foreign title appears
        "lockExistingTitles": true,    // pause a session that already had a title when first seen
        "builtinGraceMs": 120000,      // ms after the title response that the rename stays attributable
        "model": null,                 // "providerID/modelID"; null = the session's model
        "titleMaxLength": 60,
        "minPromptLength": 10,         // skip when there is too little transcript text
        "debug": false                 // log decisions to the OpenCode log
      }
    }
  ]
}
```

## Configuration

Every setting lives in `opencode.json(c)`, under the plugin's `options` object;
there is no separate config file. Settings you leave out fall back to the
built-in defaults. OpenCode merges the global
(`~/.config/opencode/opencode.json(c)`) and project `opencode.json(c)` files
before the plugin runs, with the project overriding the global.

## Commands

- `/retitle-status` — report whether this session's title was set manually or by
  opencode-retitle, how far the turn counter is, and which settings differ from the
  defaults. Makes no model call. See the [screenshot](#screenshot).
- `/retitle-enable` — clear the manual-rename pause for this session and retitle
  now. Use this when you renamed a session by hand and want automatic retitling
  back. If no title can be generated, the toast reports the reason (for example,
  not enough transcript text or a subagent session).

Both are TUI slash commands that show their result as a toast.

## How manual renames are detected

We cannot tell a manual rename apart from another plugin, or from you asking the
agent to rename the session. All three mean "a meaningful title is now in place",
which is exactly when retitling should stop. So the plugin attributes every
rename by elimination, using title shapes that OpenCode itself produces:

| New title | Attributed to | Effect |
| --- | --- | --- |
| equals the last title we wrote | opencode-retitle | keep going |
| `New session - <ISO>` / `Child session - <ISO>` | OpenCode default | record baseline |
| `<base> (fork #N)` | OpenCode fork | record baseline |
| arrives while the built-in generator is running | OpenCode auto-title | record baseline |
| anything else | manual / external | **pause** (when `respectManualRename`) |

**Sessions the plugin meets mid-flight.** The first time the plugin sees a
session it inspects the current title. A title that is not a default, a fork
title, or one we wrote is treated as manually chosen, so the session starts
paused. This only affects a session the plugin has never recorded; state is
persisted, so a restart does not re-trigger it.

This is the one case where an auto-generated title can be mistaken for a manual
one: if OpenCode generated the title before the plugin loaded, there is no way to
attribute it. Set `lockExistingTitles` to `false` to retitle such sessions
instead of pausing them.

**Timing.** The marker that OpenCode is generating a title is shared across
plugin instances. It is written when the title request starts and refreshed
when the request's HTTP response arrives; the rename follows the response, so
`builtinGraceMs` defaults to two minutes rather than the old 45-second
start-only window that expired during slow provider calls. The trade-off is
that a rename you make within two minutes after an auto-generated title is
attributed to OpenCode and does not pause retitling.

## Behaviour notes

- The turn counter means **prompts since the last rename**. Only real user
  prompts count, and it resets after every retitle — turn, compaction, fork, or
  `/retitle-enable` — so two renames never bunch up and each interval is a full
  N prompts. Prompts admitted while a title is generating stay counted for the
  next interval.
- A turn retitle waits for the run to finish, so the triggering prompt and its
  response are both in the transcript. A compaction summary is included even
  when it is the only content left.
- Fork retitling is armed when a session is forked and fires on the first
  completed response in the new session, not on an intermediate tool step.
- Subagent/child sessions (those with a `parentID`) are never retitled; forks are
  root sessions and still are.
- Titles are generated by the session's own model unless `model` is set, from a
  recent transcript with code blocks stripped. The prompt is capped at 1000
  characters per message line and 3100 characters overall, so a single large
  paste cannot inflate it. `minPromptLength` measures that assembled transcript,
  so a code-only prompt does not qualify.
