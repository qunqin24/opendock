# utt

[![Latest release](https://img.shields.io/github/v/release/doublej/utt)](https://github.com/doublej/utt/releases/latest)
[![License: MIT](https://img.shields.io/github/license/doublej/utt)](LICENSE)
![macOS 26+ on Apple silicon](https://img.shields.io/badge/macOS-26%2B%20%C2%B7%20Apple%20silicon-black)

**Hold a key, speak, let go. The text lands at your cursor. Everything is
transcribed on your Mac.**

utt is one speech-to-text app for the Mac. It runs Parakeet TDT v3 (through
FluidAudio) by default, with Whisper models (through WhisperKit) alongside.
Your audio and your words never leave the machine.

## One app, many tools

You install utt once and set it up the way you like: the model, your vocabulary,
word replacements and cleanup. Extensions then bring that same engine, with all
of those settings, into the other tools you use. You add an extension per tool,
and utt asks you to approve each one before it shares anything with it.

| Extension | Where it works | What it does |
|---|---|---|
| [OpenCode](https://github.com/doublej/utt-opencode) | Terminal | Dictate into OpenCode's prompt and watch your words appear as you speak. Install with `opencode plugin add utt-opencode`. |
| [Deckhand](https://github.com/doublej/deckhand) | iPhone | Talk to your Claude Code sessions from your phone. utt transcribes the recording on your Mac. |
| [Reel](https://github.com/doublej/reel) | MCP | Lets your coding assistant transcribe any video on your Mac. |
| [Raycast](raycast/) | Raycast | Toggle dictation, pick a microphone and paste recent transcripts. Lives in this repo. |
| Deckhand VR | Headset | Planned. |

All of them are listed at [utt.jurrejan.com/extensions](https://utt.jurrejan.com/extensions).
To write your own, see [Building an extension](#building-an-extension).

<p align="center">
  <img src="docs/screenshots/utt-window.webp" alt="The utt window open to the Hotkey settings" width="720">
</p>

## Install

Download utt from [utt.jurrejan.com/download](https://utt.jurrejan.com/download)
or take `utt-<version>.dmg` from the
[latest release](https://github.com/doublej/utt/releases/latest). Open it and drag
`utt.app` onto the `Applications` shortcut.

The app is signed and notarized. On first launch it downloads the speech model
(about 650 MB) and asks for three permissions: Microphone, Input Monitoring and
Accessibility. [docs/INSTALL.md](docs/INSTALL.md) explains each one and how to
uninstall.

utt checks for updates once a day, shows you what changed, and installs only
when you say so.

## Requirements

- macOS 26 or later
- A Mac with Apple silicon (M1 or newer)

## Using it

| | |
|---|---|
| Hold the hotkey | Record while held, transcribe on release |
| Double-tap it | Lock recording on; tap again to stop |
| Escape | Cancel without transcribing |
| ⌥⇧V | Paste the last transcript again |

The window has two shapes: a small floating bar with a level meter, and a full
window with your transcripts and settings. The chevron switches between them.

In the window you can choose the hotkey, the microphone and the model, set word
replacements and formatting, and turn on cleanup, which removes filler words and
false starts. The Model page compares every Parakeet and Whisper model by speed,
accuracy, languages and size.

utt keeps a short rolling buffer, so recording starts about 0.45 s before you
press the key and the first word is not cut off. This keeps the microphone
indicator lit while utt runs. By default the microphone stops on sleep and screen
lock, and you can turn the buffer off on the Microphone page.

## Privacy

- Transcription runs on your Mac, also when you are offline.
- There is no account and no cloud service.
- Anonymous usage counts are off by default and never include your words or
  audio.
- An extension gets nothing until you approve it, and you can switch it off at
  any time.

## For developers

### Transcription API

utt can serve its engine over a local HTTP API, so a script, a phone or another
app can send a clip and get the text back. The audio is still transcribed on
this Mac. It is off by default. See [docs/api.md](docs/api.md).

### Building an extension

An extension is any program that wants to work with utt: a daemon, a menu bar
app, a script or a plugin for another tool. There is nothing to register and no
SDK. An extension uses three doors:

- **Files** in `~/Library/Application Support/dev.jurrejan.utt/extensions/`. A
  manifest gives the extension its own settings page inside utt. Through the same
  folder it can send audio to transcribe, receive finished or live transcripts,
  change text before it is pasted, and show its status.
- **`utt://` URLs**: `utt://start`, `utt://stop`, `utt://toggle`, `utt://cancel`
  and `utt://show`.
- **The HTTP API** described above.

The full contract is in the app: Extensions → Write one → **Copy guide**. It is a
brief you can paste into an LLM together with your project. The source is in
[UttCore/Sources/UttCore/Extensions/Guide/](UttCore/Sources/UttCore/Extensions/Guide/).
[raycast/README.md](raycast/README.md) shows a small working extension.

### Building from source

You need Xcode 26, [XcodeGen](https://github.com/yonaskolb/XcodeGen),
[SwiftLint](https://github.com/realm/SwiftLint) and [just](https://just.systems).

```bash
just install   # generate the Xcode project
just run       # build and launch
just check     # format, lint, build and test; must pass before a commit
```

`project.yml` pins a signing identity that only exists on the author's Mac. Set
`CODE_SIGN_IDENTITY` to your own; [docs/INSTALL.md](docs/INSTALL.md#building-it-yourself-instead)
explains what changes if you use ad-hoc signing.

### Layout

```
Utt/         SwiftUI app: App, Clients, Design, Features, Views
UttCore/     SwiftPM package: pure logic and all the tests
raycast/     Raycast extension
docs/        API, install, hotkey semantics, release notes
project.yml  XcodeGen source of truth (Utt.xcodeproj is generated)
```

[docs/architecture.md](docs/architecture.md) describes the layout and the path
from key press to pasted text.

## Attribution

- Parakeet TDT v3: NVIDIA NeMo, CC-BY-4.0
- Whisper: OpenAI, MIT, through WhisperKit
- FluidAudio runs the Parakeet models on the Neural Engine
- The other Parakeet models are credited in the app under About → Attribution

## License

[MIT](LICENSE)
