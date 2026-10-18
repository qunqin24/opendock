<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="quill" height="96">
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/ozandogrultan/opencode-quill/actions/workflows/ci.yml"><img src="https://github.com/ozandogrultan/opencode-quill/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/opencode-quill"><img src="https://img.shields.io/npm/v/opencode-quill" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="#contributing"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome"></a>
  <a href="https://github.com/ozandogrultan/opencode-quill/stargazers"><img src="https://img.shields.io/github/stars/ozandogrultan/opencode-quill.svg?style=social" alt="GitHub stars"></a>
</p>

Local word autocomplete and next-word prediction for the **OpenCode V2** prompt
composer — inspired by [oh-my-pi (OMP)](https://github.com/can1357/oh-my-pi)'s
n-gram text prediction engine.

As you type, Quill predicts the remainder of your current prose word or the next
word in sequence, shown as dimmed inline ghost text directly at your cursor.
Press <kbd>Tab</kbd> or <kbd>→</kbd> to accept it, or <kbd>Esc</kbd> to dismiss.

## What it does

- **Zero AI, completely local:** Runs entirely on-device without sending prompt
  text to any model, API, or external service.
- **Context-aware ranking:** Blends a common-English vocabulary prior with an
  online n-gram model (bigrams and trigrams) learned from your prompt history.
- **Completes words, fixes typos, and predicts next words:** Completes the active
  prose prefix, offers single-edit corrections, and predicts following words
  when learned evidence supports the sequence.
- **Ghost-text styling:** Matches [opencode-ghost](https://github.com/ozandogrultan/opencode-ghost)'s
  dimmed appearance (the theme's muted text color), rendered in the OpenTUI
  buffer without displacing the cursor.
- **Safe acceptance:** Inserts or corrects the active word in the draft without
  submitting. Supports native undo (<kbd>Ctrl+-</kbd> or <kbd>Cmd+Z</kbd>). Never
  overwrites unrelated draft text and never touches the system clipboard.
- **Coexists with Ghost:** [Ghost](https://github.com/ozandogrultan/opencode-ghost)
  suggests entire next prompts in an *empty* composer using a model; Quill
  predicts words in an *active* draft locally. When both are installed, each
  activates only in its respective domain without key conflicts.
- **Prose-aware gating:** Automatically suppresses suggestions in code blocks,
  backticks, file paths, URLs, slash commands, shell executions, active selections,
  composers holding attachments or pasted-text chips, and modal dialogs.
- **End-of-draft only:** Suggestions appear when the cursor is at the end of the
  draft, either on a partial word or after a space.

## What suggestions look like

The suggestion appears dimmed at the end of the draft. It is not part of the
editable text until you press <kbd>Tab</kbd> or <kbd>→</kbd>.

| Kind | Your draft | Dimmed suggestion | Draft after acceptance |
| --- | --- | --- | --- |
| Word completion | `please comp` | `lete` | `please complete` |
| Typo correction | `please cmplete` | ` → complete` | `please complete` |
| Next word | `please run ` | `tests` | `please run tests` |

A correction looks like this, with only ` → complete` dimmed:

```text
> please cmplete → complete
```

- **Completions append** the missing letters or next word.
- **Corrections replace only the active word**, preserving its initial-capital
  or all-uppercase casing (`Cmplete` → `Complete`, `CMPLETE` → `COMPLETE`).
  First-person contractions use a capital `I` in corrections and next-word
  suggestions (`I'm`, `I'll`, `I've`, `I'd`). Lowercase contraction prefixes
  are replaced on acceptance too (`i'v` → `I've`).
- **Learned casing is kept.** A word you usually capitalize mid-sentence is
  suggested that way: `oz` shows ` → Ozan` and replaces the word, while `Oz`
  completes with `an`.
- **Normal completions take precedence.** For example, `whate` completes to
  `whatever` rather than being corrected to `what`. Typo correction is a
  fallback when no confident prefix completion is available; recognized words
  are not corrected.
- **Earlier words are never rewritten.** With learned evidence for
  `please run tests`, typing `please rnu ` can suggest `tests`. Accepting it
  produces `please rnu tests`, leaving `rnu` unchanged.

## Requirements

- [OpenCode](https://opencode.ai) with the V2 TUI plugin runtime (the supported
  range is `engines.opencode` in `package.json`).
- Node.js (for the installer script).

## Install

### From npm (recommended)

Add the package to `plugins` in `~/.config/opencode/cli.json`:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "opencode-quill"
  ]
}
```

OpenCode installs the package and its dependencies on the next start.

### From this repository

```sh
git clone https://github.com/ozandogrultan/opencode-quill.git
cd opencode-quill
bun install
./install.sh
```

Restart OpenCode to load it. `install.sh` copies the plugin and its local
vocabulary into `<config>/plugins/opencode-quill/` and registers that directory
in `<config>/cli.json`. Unrelated plugins and configuration are preserved.

To target a specific configuration directory:

```sh
./install.sh /path/to/config/opencode
```

### Manually

Add the plugin directory to `plugins` in `~/.config/opencode/cli.json`:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "/absolute/path/to/opencode-quill/src"
  ]
}
```

To pass custom options:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-quill/src",
      "options": {
        "enabled": true,
        "acceptKeys": ["tab", "right"],
        "dismissKeys": ["escape"]
      }
    }
  ]
}
```

Restart OpenCode after editing `cli.json`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enables or disables suggestions; can also be toggled with `/quill`. |
| `acceptKeys` | `string[]` | `["tab", "right"]` | Keys that accept and insert the active word suggestion. |
| `dismissKeys` | `string[]` | `["escape"]` | Keys that dismiss the visible suggestion without inserting. |

Custom keybindings can also be overridden using OpenCode's standard
`keybinds` map in `cli.json`:

```jsonc
{
  "keybinds": {
    "quill.accept": "ctrl+y",
    "quill.dismiss": "ctrl+g"
  }
}
```

## Commands

- `/quill` — Toggle word autocomplete on or off (persisted across sessions).
- `/quill on` / `/quill off` — Set autocomplete explicitly.
- `/quill clear` (alias `/quill reset`) — Erase everything Quill has learned from your prompts.
- **Command Palette (`Ctrl+P`)** — Includes **Word autocomplete: on/off** and
  **Clear word autocomplete history**.

## How it works

### Learning

Quill learns from your own submitted prompts, never from assistant output:

- It listens to session events (`session.execution.started`,
  `session.execution.succeeded`, `session.inbox.delivered`).
- On startup and when you open a session, it also backfills from the user
  messages of the current and most recently updated sessions.
- Each message is ingested once, tracked by `<sessionID>:<messageID>`.
- Only prose is learned. Code blocks, inline code, URLs, file paths,
  identifiers, slash commands, shell lines, indented blocks and very large
  pastes are ignored.
- Punctuation, line breaks and code reset the context, so words separated by
  syntax are never learned as adjacent.
- A word missing from the base vocabulary becomes suggestible only after it
  has been seen more than once, and not while it is a prefix of a learned word
  you use at least as often (`addr` yields to `addressed`).
- Casing is learned from words written mid-sentence; sentence-initial
  capitals are ignored.

### Prediction

- **Baseline prior:** a bundled English word-frequency table (SUBTLEX) gives
  useful completions from the first keystroke.
- **Personal model:** unigram, bigram and trigram counts from your prompts.
  Context evidence falls back from trigram to bigram to unigram as it thins out.
- **Current draft:** words already in the draft get a small boost.
- **Confidence gating:** a suggestion is shown only when it clears a
  confidence threshold, which is stricter for next-word predictions than for
  prefix completions. If the typed prefix is already the most likely word,
  nothing is shown.
- **Typo fallback:** when prefix completion is not confident enough, nearby
  words are ranked with an edit penalty and a stricter confidence threshold.
  Correction confidence is the edit-penalized model score. Suggestions must
  clear an absolute evidence floor and a separate candidate-dominance check.
  Corrections require at least three typed letters. Short words are eligible
  only for whole-word letter swaps that preserve the first letter; other edits
  and mistyped longer prefixes require at least five letters, except for
  apostrophe contractions, including missing apostrophes. Deletions repair only
  doubled letters, not arbitrary extra characters or word endings.
  Unknown tokens such as `json`, `yaml`, `bool`, `opts`,
  and `enum` are left unchanged, and uncertain typos such as `fucn` can produce
  no suggestion. Context repair uses the same edit guards and confidence checks
  and requires repeated learned continuation evidence; not every typo produces
  a suggestion.
- **Bounded size:** the personal model is pruned to its most frequent entries
  when saved. Once it holds about 100,000 learned words, every count is halved
  and single-use entries are dropped, so recent habits outweigh old ones.

### Storage

Quill uses OpenCode's durable plugin storage, which writes JSON under the XDG
state directory (`$XDG_STATE_HOME` when set, otherwise `~/.local/state`):

| Data | File |
| --- | --- |
| Learned model | `opencode/<channel>/tui/plugin.quill.learning.json` |
| Settings | `opencode/<channel>/tui/plugin.quill.settings.json` |

The learned model holds only word, bigram, trigram and word-casing counts plus
processed message IDs. Raw prompt text is never written to disk. These files stay on your
machine and are never tracked in Git or published to npm.

## Development

```sh
bun install
bun run test        # Unit tests and changelog checks
bun run typecheck   # Type verification (tsc --noEmit)
bun run lint:sh     # Syntax verification on shell scripts
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
[AGENTS.md](AGENTS.md) before submitting a pull request.

## License

[MIT](LICENSE) © Ozan Dogrultan
