# Mathesis

Mathesis (Greek μάθησις, "learning") is an [opencode](https://opencode.ai) v2 plugin that teaches you a subject at the
edge of what you already understand, and then keeps it in your memory with spaced repetition.

1. **Probe** finds where your understanding of each prerequisite ends: something you reliably get right (a floor) and
   something you get wrong or don't know (a ceiling), from your answers, your confidence and your reasoning.
2. **Plan** writes a dependency map from what you already hold to your goal.
3. **Teach** goes one reasoning step at a time: predict → teach → check. A gap is repaired before anything is built on it.
4. **Spaced review** schedules every idea you demonstrated with [FSRS](https://github.com/open-spaced-repetition/ts-fsrs),
   and asks a newly written question each time.
5. **Practice** gives interleaved problems where you must bring the right idea to mind yourself.

Everything you learn is plain Markdown in a folder (default `~/mathesis`) that you can read and edit in any editor.

> **Disclaimer: this is a heavily AI-assisted port.** Mathesis ports the learning method of
> [LearnHarness](https://github.com/amosblomqvist/learnharness) to opencode and adds spaced repetition. The design and
> the decisions are the maintainer's, but most of the code, prompts, tests and documents were written by an AI model
> (Claude, in Claude Code), reviewed by separate AI review agents and checked by hand in the opencode TUI. It is early
> software: expect rough edges, read `docs/history.md` for what was and was not verified, and please report problems.

## Requirements

- opencode 2.2.1 or a later 2.x release (the v2 plugin API), with the terminal UI.
- Bun, which opencode uses to load plugins.

## Install

Run `opencode plugin add opencode-mathesis`, or add the package to `plugins` in `~/.config/opencode/opencode.jsonc`
yourself, then restart opencode:

```jsonc
{
  "plugins": ["opencode-mathesis"]
}
```

With options. opencode passes options to each part from its own config file: the server part reads them from
`opencode.jsonc`, the TUI part from `~/.config/opencode/cli.json` (the TUI config). The TUI options (`notify`,
`panelKey`, `voice`) only work in `cli.json`:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-mathesis",
      "options": {
        "vault": "~/mathesis",
        "models": { "teach": "anthropic/claude-opus-5-5", "recall": "anthropic/claude-sonnet-5-5" },
        "reviewCap": 20
      }
    }
  ]
}
```

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    { "package": "opencode-mathesis", "options": { "notify": true, "panelKey": "ctrl+x m" } }
  ]
}
```

From a checkout: `git clone https://github.com/AlapinEnjoyer/mathesis && cd mathesis && bun install` (this also builds
the TUI part into `dist/`), then put the absolute path of the checkout in `plugins`.

## Use

| Command | What it does |
|---|---|
| `/mathesis-setup` | Run once (the first `/learn`, `/recall` or `/practice` offers it). Writes the `mathesis` agent (`~/.config/opencode/agents/mathesis.md`) and the vault folders, and asks whether to use one model for everything. |
| `/learn <goal>` | Starts a new session, `Mathesis: <goal>`, in the probe phase. `/learn` alone lets you continue a topic. |
| `/recall [topic]` | Spaced review of the cards due today, interleaved across topics (at most 20 per session). |
| `/practice [topic]` | Interleaved practice problems built from the cards you hold, weakest first. |
| `/mathesis` | Status: cards due per topic (or the next review date), recent lapses, misconceptions, and your calibration: how often you were right at each confidence you gave. |
| `/mathesis panel`, `/mathesis-panel` | Toggles the side panel: what this session did so far, the plan with its progress ("3 of 7 steps have a card") and the current node, and the cards due today. |

You don't need the commands every time: switch to the `mathesis` agent and say what you want to learn.

Questions appear as forms in the chat. You give your answer (or "I don't know"), your confidence, and optionally your
thinking. Every idea you demonstrate in a check becomes a card in your vault. The footer shows how many cards are due,
and once a day you get a notification when cards are due and the terminal is in the background (`notify: false` turns
it off).

### Models

By default Mathesis uses the model of the session for everything. `/mathesis-setup` (or the `models` option) can choose
separate models for teaching and for review. A model is only chosen when a session is created and never switched
inside it, so the provider's prompt cache stays warm.

### Voice (optional)

Thinking out loud is the most useful part of an answer, and speaking is faster than typing. Mathesis can record your
thinking while a question form is open, transcribe it, and add it to the thinking of your answer. It can also read the
open question aloud. Both are off until you set them in `cli.json`. They run in the TUI process, so with a local
model your audio never leaves your machine.

- **Dictate:** `ctrl+x v` starts recording, `ctrl+x v` again stops it. A toast shows the transcript, and a line above
  the form shows the recording state and how many dictations are attached; `ctrl+x z` removes the last one. When you
  submit the form, they are added to your thinking as `Spoken: …`, after anything you typed. It goes to the model with your
  answer and into the session note (`sessions/<date>-<topic>-<kind>.md`). It does not appear in the form itself
  (opencode forms can't be changed once shown), and it only works on Mathesis questions, not on opencode's built-in
  question tool.
- **Read aloud:** `ctrl+x o` reads the open question and its choices; press again to stop. `"autoRead": true` reads
  every question when it appears.

#### Local speech-to-text with whisper.cpp (recommended)

```sh
brew install whisper-cpp ffmpeg
mkdir -p ~/models
# a balanced model: multilingual, close to large-v3 accuracy, fast on Apple Silicon (574 MB)
curl -L -o ~/models/ggml-large-v3-turbo-q5_0.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin
```

Smaller models (`base`, `small`) are faster and less accurate; see the
[whisper.cpp README](https://github.com/ggml-org/whisper.cpp). whisper.cpp assumes English unless you pass `-l auto`
(or a language code).

Either run `whisper-cli` for each recording (simple, about 2 s per short clip because the model loads each time):

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "opencode-mathesis",
      "options": {
        "voice": {
          "stt": { "command": ["whisper-cli", "-m", "~/models/ggml-large-v3-turbo-q5_0.bin", "-l", "auto", "-nt", "-np", "-f", "{file}"] },
          "tts": { "command": ["say"] }
        }
      }
    }
  ]
}
```

or keep the model loaded in `whisper-server` (faster, about 1.5 s) and point Mathesis at it:

```sh
whisper-server -m ~/models/ggml-large-v3-turbo-q5_0.bin -l auto --port 8178 --inference-path /v1/audio/transcriptions
```

```jsonc
"stt": { "url": "http://127.0.0.1:8178/v1/audio/transcriptions", "model": "whisper-1" }
```

#### Paid APIs

Any OpenAI-compatible endpoint works, for example OpenAI or Groq. The key is read from the environment variable named
in `apiKeyEnv` and is never stored. Your audio (and, for speech, the question text) is then sent to that provider.

```jsonc
"stt": { "url": "https://api.openai.com/v1/audio/transcriptions", "model": "gpt-4o-transcribe", "apiKeyEnv": "OPENAI_API_KEY" },
"tts": { "url": "https://api.openai.com/v1/audio/speech", "model": "gpt-4o-mini-tts", "voice": "alloy", "apiKeyEnv": "OPENAI_API_KEY" }
```

#### Other settings

- `tts` with `command`: the text arrives on stdin (`say` on macOS, `piper` or `espeak` on Linux). With `url`, the
  returned audio is played with `play` (default `afplay` on macOS, `ffplay` on Linux; `{file}` is the audio file).
- Recording uses `ffmpeg` (macOS `avfoundation`, Linux PulseAudio). Change it with `record` (`{file}` is the WAV file
  to write). macOS asks once for microphone access for your terminal.
- Change the keys with `dictateKey`, `undoKey` and `readKey`, or bind the commands `mathesis.dictate`, `mathesis.dictate-undo` and `mathesis.read` in
  `keybinds`.
- opencode's own voice feature (realtime voice sessions with OpenAI, xAI or Google) is cloud-only and not available to
  the TUI, so Mathesis does not use it.

## The vault

```
~/mathesis/
  ideas/<id>.md                        one idea = one card
  topics/<id>.md                       goal, probe assessment, plan, links to the ideas
  sessions/<date>-<topic>-<kind>.md    every question with your answer, confidence and thinking
  log/reviews.jsonl                    every review, so the schedule can be rebuilt
```

An idea note:

```markdown
---
id: chain-rule-intuition
topic: calculus
kind: proposition
requires: [derivative-as-local-slope]
created: 2026-10-30
srs: {state: review, due: 2026-11-04T09:12:00.000Z, stability: 6.2, difficulty: 5.1, reps: 3, lapses: 0, ...}
---

Topic: [calculus](../topics/calculus.md)

## Claim
...

## Why
...

Builds on: [derivative as local slope](./derivative-as-local-slope.md)

## Picture
```mermaid
graph LR
  x --> u["u = g(x)"] --> y["y = f(u)"]
```

## Known misconceptions

## Asked before
- earlier question stems, so new reviews use new wording
```

The notes link to each other with plain Markdown links, so Obsidian's graph view (or any Markdown tool) shows the
structure: a card links its topic and the cards it builds on; a topic links its cards and, under **Related topics**,
other topics whose cards it builds on or that build on it; a session note links its topic and the cards it created,
reviewed or recorded as misconceptions.

When an idea is a structure or a flow, the model draws it: a small Unicode diagram in the chat (the terminal does not
render mermaid), and a mermaid diagram in the card's **Picture** section, which Obsidian renders.

Edit notes freely: Mathesis re-reads them every time, keeps keys and sections it does not know, and never overwrites
the Claim or Why you wrote. Setting a card's `due` to a past date makes it due.

## Privacy and permissions

Mathesis sessions may read files (for example your own notes), but they cannot edit files or run shell commands:
Mathesis writes the vault through its own tools. Nothing leaves your machine except the conversation with the model
provider you use in opencode.

## Development

`bun install`, `bun test`, `bun run typecheck`. See `AGENTS.md` for how to test in the TUI, `docs/decisions.md` for the
design decisions, `docs/spike.md` for what the opencode API does in practice, and `docs/history.md` for how Mathesis
was built and what is still open.

Use a separate checkout for daily use: opencode loads the plugin from the folder, and a half-finished change there can
make it fail to load until `opencode service restart`.

## License

AGPL-3.0. Mathesis adapts prompt text and ideas from [LearnHarness](https://github.com/amosblomqvist/learnharness) by
Amos Blomqvist. See `NOTICE.md`.
