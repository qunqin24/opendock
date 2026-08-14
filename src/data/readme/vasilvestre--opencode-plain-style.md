# opencode-plain-style

[![CI](https://github.com/vasilvestre/opencode-plain-style/actions/workflows/ci.yml/badge.svg)](https://github.com/vasilvestre/opencode-plain-style/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@vasilvestre/opencode-plain-style)](https://www.npmjs.com/package/@vasilvestre/opencode-plain-style)
[![license](https://img.shields.io/npm/l/@vasilvestre/opencode-plain-style)](LICENSE)

Plain-language writing rules for opencode agents, injected into every system prompt.

**Measured effect: fully-compliant prose rises from 66.7% to 93.3% of runs (+26.6 points).**
See the [benchmark](bench/BENCHMARK.md) for method, raw data, and reproduction steps.

## What it does

The plugin adds one rulebook to the system prompt on every LLM call.
The rulebook derives from ISO 24495-1 (plain language) and the Google developer documentation style guide.
It governs commit messages, code comments, READMEs, docs, PR descriptions, and chat explanations.
Code itself is exempt.

Rules include:

- Active voice, second person, present tense.
- Sentences of 25 words or fewer.
- Imperative mood for steps, one action per step.
- `must` for requirements, stated as facts without softening.
- No vague intensifiers or words that signal laziness or condescension.
- Lists and headings over walls of text, conclusion first.
- One "Next:" line at the end naming a concrete action.
- No em dashes as punctuation, no "please" in instructions, no "etc.".

Because the injection happens per request, the rules survive context compaction.
AGENTS.md instructions, by contrast, get summarized away during compaction.

## The rules, by example

Five of the nineteen rules, before and after.
Full rulebook: [.opencode/plugins/plain-style.md](.opencode/plugins/plain-style.md).

```text
Rule: imperative mood for steps
  Before: You should run the tests before merging.
  After:  Run the tests.

Rule: must for requirements, no hedging
  Before: The token may need a refresh during long sessions.
  After:  Refresh the token. Sessions over 1 hour must use a fresh token.

Rule: no vague intensifiers
  Before: A very simple, basically automatic setup.
  After:  A setup with two commands.

Rule: active voice
  Before: The file is rejected by the parser.
  After:  The parser rejects the file.

Rule: one action per step
  Before: Install the dependencies and then start the dev server.
  After:  1. Install the dependencies. 2. Start the dev server.
```

The pattern: every "before" hides a fact or an action. Every "after" states it.

## Rule decisions

Every rule in the rulebook earned its place through an A/B benchmark.
Rules enter only if their compliance lift beats the measured dilution cost
(~2.2 points per added rule) and they leave only if the model stays at ≥86.7%
fully compliant without them. Ablations on two models found no rule cuttable.
Full experiment history: [bench/README.md](bench/README.md).

Decisions from the English Language proposal (2026-08-02):

| Proposed rule                                              | Decision | Why                                            |
| ---------------------------------------------------------- | -------- | ---------------------------------------------- |
| Avoid belittling words (obviously, just, simply, ...)      | Adopted  | Folded into Rule 10, without the word list     |
| Avoid passive voice                                        | Kept     | Already covered by Rule 1                      |
| American English, title case, no Oxford commas,            | Not      | Not checkable by the scorer, and each injected |
| gender-neutral pronouns, contractions allowed              | injected | rule costs ~2.2 points of dilution             |

One design lesson shapes the phrasing: never list banned words in the rulebook.
Weaker models echo the list and produce more violations, not fewer.
Rules state what to do, not what to avoid by name.

## Install

### Requirements

- opencode installed and runnable (`opencode --version` prints a version).
- A config file at `~/.config/opencode/opencode.json`. Create it if it does not exist.

### Steps

1. Open `~/.config/opencode/opencode.json`.
2. Add the package name to the `plugin` array:

   ```json
   {
     "plugin": ["@vasilvestre/opencode-plain-style"]
   }
   ```

   opencode downloads the package from npm on the next start. You do not need to run `npm install`.

3. Restart opencode.
4. Verify the install. Ask the agent to describe a process. The answer must follow the rules: numbered steps, active voice, sentences of 25 words or fewer.

The plugin loads at startup and works for the primary agent and every subagent.

### Install from a local copy

Use this to test changes before publishing, or to run a fork.

1. Clone the repository:

   ```bash
   git clone https://github.com/vasilvestre/opencode-plain-style.git
   ```

2. Point the config at the local plugin file:

   ```json
   {
     "plugin": ["file:///absolute/path/to/opencode-plain-style/.opencode/plugins/plain-style.mjs"]
   }
   ```

   The path must be absolute and must point at the `.mjs` file, not the directory.

3. Restart opencode.

### Uninstall

1. Remove the entry from the `plugin` array in `~/.config/opencode/opencode.json`.
2. Restart opencode.

## How it works

The plugin registers one hook: `experimental.chat.system.transform`.
On each request it pushes the rulebook text into the system prompt array.
The rulebook is read from disk once at module load, so each request costs one array push and zero I/O.
Total plugin code: about 25 lines, no dependencies.

Note: the hook is marked experimental in opencode.
If opencode renames it, the plugin fails loudly at startup rather than injecting nothing.

## Example output

Same blind prompt, same model, same agent: "Describe what happens when an HTTP request reaches an Express server."

Without the plugin (control), the agent writes dense prose with vague intensifiers:

```text
Express is really just a callback you handed to http.createServer() —
app.listen(port) is sugar for http.createServer(app).listen(port).
It's middleware all the way down: routes are just middleware that
happens to match on path + method.
```

With the plugin (treatment), the same agent writes numbered steps and adds an example:

```text
1. Node's HTTP server receives it. Node parses the raw bytes into req
   (request) and res (response) objects, then calls your Express app
   as a handler function.
2. Express wraps the request. Express extends req and res with its own
   helpers (like req.query, res.json()), then starts walking the
   middleware stack.

Example:

const express = require('express');
const app = express();
app.use(express.json());          // parses JSON body
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});
```

Both excerpts are real benchmark outputs, unedited.
Full transcripts: [bench/runs/20260729-105827/](bench/runs/20260729-105827/).

## Benchmark

A/B design: same agent, same pinned model, two config replicas identical except this plugin.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   80.0% |      100% | +20.0  |
| Hedge-free              |   93.3% |      100% |  +6.7  |
| Sentences ≤25 words     |   73.3% |     93.3% | +20.0  |
| Fully compliant         |   66.7% |     93.3% | +26.6  |

30 runs total: 5 blind probes × 3 repetitions × 2 arms, deterministic scoring, zero LLM judging.
Injection shifts probability; it does not guarantee compliance.
For a hard guarantee, add deterministic linting (for example Vale) to CI.

The table shows the original 16-rule baseline. The current 19-rule rulebook
re-validated on the same model at +26.7 points (53.3% to 80.0%, 2026-08-03).

Full details: [bench/BENCHMARK.md](bench/BENCHMARK.md).

## Customize the rules

The rulebook is plain markdown at `.opencode/plugins/plain-style.md`.
Fork the repo, edit the file, and point your config at the local copy:

```json
{
  "plugin": ["file:///path/to/your/fork/.opencode/plugins/plain-style.mjs"]
}
```

## Development

The `bench/` directory holds the full benchmark suite: harness, scorer, aggregator, raw results.

```bash
cd bench
./harness.sh 3 --jobs 2
node aggregate.mjs runs/<timestamp>
```

The harness measures the machine's live opencode config, control arm versus treatment arm.

## License

MIT.
