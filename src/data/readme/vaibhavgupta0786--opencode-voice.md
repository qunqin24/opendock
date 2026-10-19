# opencode-voice

Local-only push-to-talk dictation for [OpenCode](https://opencode.ai) v2.
Press `f9`, talk (pauses welcome), press `f9` again — the transcript lands
in a draft you can edit; takes pile up until you send them as one prompt.

No cloud, no temp audio files, no auto-send, no permission answering.

## Install

Requirements: OpenCode v2, a local STT server (see `docs/STT.md`),
macOS Microphone permission for your terminal.

```sh
mkdir -p ~/.config/opencode/plugins
git clone https://github.com/vaibhavgupta0786/opencode-voice ~/.config/opencode/plugins/voice
# restart the OpenCode TUI, open a session, press f9
```

Or via npm (after `v0.3.0` is published):

```sh
opencode plugin add @vaibhavgupta0786/opencode-voice
```

`f9` may be hijacked by macOS Fn keys — `Ctrl+P` → `dictate` (or
`/dictate`) works the same.

## Usage

| Input | Action |
|---|---|
| `f9` | dictate a take (press to start, press to stop) — appended to the draft |
| `f9` again | stop → transcribe → draft editor opens with all takes |
| `f10` | open the draft editor anytime (empty or not — hand-compose works too) |
| `f12` | wipe the draft (confirmation dialog) |
| `/dictate`, `/voice-send`, `/voice-clear` | same via slash command / palette |

On MacBooks press F-keys **with Fn**. Plain `F10` is the hardware mic-mute
key and plain `F11` is Show Desktop (macOS reserves it — which is why wipe
lives on `F12`).

> **Windows**: not yet supported — the bundled recorders target macOS
> (CoreAudio) and Linux (ALSA/PulseAudio). PRs welcome; the recorder source
> is [opencode-dictate](https://github.com/rodri45l/opencode-dictate)'s
> `recorder.c` (miniaudio supports WASAPI).

**Editor semantics** (one dialog, always the whole draft):

- Opens after every take, with the cursor at the end and the view scrolled
  to the bottom — long drafts scroll while you type.
- `Ctrl+Enter` sends everything as one prompt (`Cmd+Enter` also works where
  the terminal delivers it). `Esc` closes and **keeps your edits** — they
  are folded back into the draft automatically, whichever way the dialog
  was closed.
- A failed send keeps the draft and lets you retry; switching sessions
  with the editor open refuses to deliver to the wrong chat.
- The draft is **per session**: dictate in chat A, switch to B, and each
  keeps its own takes. Switching back shows A's draft intact, take count
  and all.
- Switching chats **mid-take discards that take**: the recorder stops
  within half a second, nothing is transcribed or saved, and a toast says
  so. The drafts themselves are never touched.

A mic indicator lives in the prompt footer: 🎤 idle, 🔴 recording, 🟡
transcribing, `🎤·N` = N takes in the draft. With a local STT server the
mic carries a health dot — `🟢🎤` server up, `🔴🎤` server down (checked
every 30 s, refreshed on every take; cloud STT endpoints show no dot).
Takes cap at 60 s (raise via the `maxMs` option). Debug log:
/tmp/opencode/voice-plugin.log.

## Keeping the STT server alive

Dictation needs the local whisper server on `127.0.0.1:8080`. If it ever
dies (machine restart, crash), recovery is:

1. **One-time opt-in:** run `/voice-setup` (palette: "Install voice-check
   recovery skill"). This copies the bundled skill into your global
   skills directory — nothing is installed silently, ever.
2. Whenever voice breaks: type `@voice-check` (or just say "voice is
   dead") and the agent verifies the server, restarts it if needed, and
   reports back.

Manual recovery is one health check plus a restart — see below.

## How it works

```
f9 -> bundled mic recorder (16 kHz PCM, stdout, in memory)
   -> silence/VAD state machine (toggle: pauses never end the take)
   -> POST WAV to local whisper at 127.0.0.1:8080
   -> draft (takes accumulate) -> editor -> session.prompt
```

See `docs/STT.md` (server + model choice) and `docs/TROUBLESHOOTING.md`.

## Development

```sh
npm ci
npm test        # 12 unit tests, no mic needed
npm run typecheck
```

Pure logic in `logic.ts`, host/IO in `tui.ts`. See `CONTRIBUTING.md`.

## Recorder binaries

`bin/` ships prebuilt mic recorders built from
[opencode-dictate](https://github.com/rodri45l/opencode-dictate)'s
`recorder/recorder.c` (miniaudio, MIT) — see NOTICE. SHA256 pinned in
`bin/SHA256SUMS` and verified in CI. To rebuild from source, fetch
`recorder.c` + `miniaudio.h` upstream and compile, e.g. on macOS:
`cc -O2 -o recorder recorder.c -framework CoreAudio -framework AudioToolbox -framework CoreFoundation`.

## Why this instead of X?

| | This | [renjfk/opencode-voice](https://github.com/renjfk/opencode-voice) | [opencode-dictate](https://github.com/rodri45l/opencode-dictate) |
|---|---|---|---|
| Input | `F9` press / `F9` press (toggle) | hold `ctrl+r` | hands-free, open mic |
| Review before send | always (editable draft) | optional | auto-sends in conversation mode |
| Draft accumulation | per session | single | n/a (immediate send) |
| LLM cleanup pass | none needed | required (cloud API) | required for voice commands |
| TTS voice-out | roadmap | yes (Piper) | no |
| Answers permissions by voice | never | via LLM | yes (opt-out) |
| External audio deps | none (bundled recorders) | `sox`, `whisper-cli` | none (bundled) |

**Choose this if** you want push-to-talk with edit-before-send, zero
surprises (no auto-send, no permission answering), and nothing to install
beyond a local whisper server.

## Roadmap

- 🎤 mic button in the prompt footer
- Voice-out: spoken digest of long replies (not verbatim readout) + local TTS

## License

MIT — see LICENSE.
