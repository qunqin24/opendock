# opencode-quill

[![CI](https://github.com/ozandogrultan/opencode-quill/actions/workflows/ci.yml/badge.svg)](https://github.com/ozandogrultan/opencode-quill/actions/workflows/ci.yml)

Local word autocomplete and next-word prediction for the **OpenCode V2** prompt
composer — inspired by [oh-my-pi (OMP)](https://github.com/can1357/oh-my-pi)'s
n-gram text prediction engine.

As you type, Quill predicts the remainder of your current prose word or the next
word in sequence, shown as dimmed inline ghost text directly at your cursor.
Press <kbd>Tab</kbd> or <kbd>→</kbd> to accept it, or <kbd>Esc</kbd> to dismiss.

```text
> can you refactor the test
                           s   ← dimmed ghost text, Tab or → to accept
```

## What it does

- **Zero AI, completely local:** Runs entirely on-device without sending prompt
  text to any model, API, or external service. Query latency is under 0.05 ms.
- **Context-aware ranking:** Blends a high-frequency English vocabulary prior
  with an online absolute-discounting n-gram model (bigrams and trigrams)
  learned dynamically from your submitted prompt history.
- **Completes words and predicts next words:** Completes the active word
  prefix as you type (`refac` → `tor`) and predicts following words after a space
  (`please run ` → `tests`) when prior evidence supports the sequence.
- **Ghost-text styling:** Matches [opencode-ghost](https://github.com/ozandogrultan/opencode-ghost)'s
  dimmed appearance (`0.55` opacity over the theme's muted text color),
  rendering seamlessly in the OpenTUI buffer without displacing cursor position.
- **Safe acceptance:** Inserts editable text into the draft without submitting.
  Supports native undo (<kbd>Ctrl+-</kbd> or <kbd>Cmd+Z</kbd>). Never overwrites
  existing text and never touches the system clipboard.
- **Coexists with Ghost:** [Ghost](https://github.com/ozandogrultan/opencode-ghost)
  suggests entire next prompts in an *empty* composer using a model; Quill
  predicts words in an *active* draft locally. When both are installed, each
  activates only in its respective domain without key conflicts.
- **Prose-aware gating:** Automatically suppresses suggestions in code blocks,
  backticks, file paths, URLs, slash commands, shell executions, active selections,
  and modal dialogs.

## Requirements

- [OpenCode](https://opencode.ai) ≥ 2.0.26 (V2 TUI plugin runtime).
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

## Learning and Prediction Architecture

### 1. How Quill Learns

Quill listens to OpenCode session events in real time:
- `session.execution.started` (prompt submitted)
- `session.execution.succeeded` (turn completed)
- `session.inbox.delivered` (message delivered to a session)

When a message is received:
1. **Deduplication:** Message IDs (`<sessionID>:<messageID>`) are checked against
   a rolling set of up to 8,000 processed messages so each prompt is ingested once.
2. **Prose Sanitization:** Text is stripped of markdown fenced code blocks, inline
   backticks, URLs, file paths (`foo/bar.ts`), camelCase identifiers, slash commands
   (`/command`), shell lines (`$ ...`), and lines indented by 4+ spaces.
3. **Sequence Splitting:** Consecutive prose words delimited by spaces or punctuation
   are partitioned into independent grammatical clauses. Punctuation (`.`, `,`, `!`, `?`)
   and code snippets reset the context window so words separated by syntax are never
   learned as adjacent phrases.
4. **Vocabulary Hygiene:** New words not present in the base dictionary must appear
   at least **twice** across distinct prompts before becoming suggestible candidates.
   This prevents accidental typos or one-off strings from entering your suggestions.
   Pasted blocks exceeding 4,000 characters or 12 lines are ignored.

### 2. How Predictions Grow

The language model consists of two tiers:

- **Baseline Prior:** A static unigram frequency table of 20,000 common English words
  derived from the open-source SUBTLEX corpus. Provides instant, high-quality
  spelling completions from your very first keystroke.
- **Personal N-Gram Model:** Increments frequency counts as you submit prompts:
  - **Unigrams** (`w`): Individual word frequencies.
  - **Bigrams** (`u → w`): Transition frequencies from previous word `u`.
  - **Trigrams** (`u, v → w`): Transition frequencies from two preceding words `u, v`.

**Scoring & Interpolation:**
Candidates are scored using Jelinek-Mercer interpolation combined with absolute
discounting ($D = 0.5$):

$$\text{score}(w \mid u, v) = \max\left(\frac{c(u, v, w) - D}{c(u, v)}, 0\right) + \frac{D \cdot |\{w : c(u, v, w) > 0\}|}{c(u, v)} \cdot \text{score}(w \mid v)$$

If strong trigram evidence exists, the contextual prediction dominates. As context
thins out, the model falls back gracefully to bigram transitions and then unigram
frequencies.

**Prefix-Constrained Posterior:**
When you type a prefix (e.g. `refac`), all candidates matching the prefix—including
the prefix itself if it is already a complete word—are ranked. A suggestion is only
displayed when its calibrated confidence exceeds a quality threshold (30% for prefix
completions, 55% for next-word predictions). If the typed prefix is already the most
probable word, no ghost text is shown.

**Bounded Capacity:**
To keep memory and storage footprint minimal, the personal model enforces strict caps:
- Words: Top 8,000 most frequent entries
- Bigrams: Top 30,000 transitions
- Trigrams: Top 30,000 transitions
- Message deduplication log: 8,000 IDs

### 3. Where State is Stored

Quill uses OpenCode V2's durable plugin storage API (`context.storage.store`), which
persists state as clean JSON files inside your standard XDG state directory:

| Setting / Data | File Path |
| --- | --- |
| **Learned Model** | `~/.local/state/opencode/<channel>/tui/plugin.quill.learning.json` |
| **Plugin Settings** | `~/.local/state/opencode/<channel>/tui/plugin.quill.settings.json` |

*(On systems with `$XDG_STATE_HOME` set, `$XDG_STATE_HOME/opencode/<channel>/tui/` is used).*

**Privacy Guarantee:**
- The snapshot file stores **only token frequency pairs** (e.g. `["refactor", 12]`, `["run\0tests", 5]`)
  and the IDs of processed messages (`<sessionID>:<messageID>`).
- **Raw prompt text is never written to disk or stored in snapshots.**
- The storage files stay strictly on your local machine and are never tracked in Git
  or included in npm packages.

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
