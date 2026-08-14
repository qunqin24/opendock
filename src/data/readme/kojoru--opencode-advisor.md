# opencode-advisor

An [opencode](https://opencode.ai) plugin that implements the [advisor strategy](https://claude.com/blog/the-advisor-strategy): a smaller model working on a task gets access to an `ask_advisor` tool that routes questions to a larger, more capable model.

The plugin automatically gathers the full session transcript (including tool inputs and outputs) so the advisor model sees complete context without the working model having to describe its own situation.

## How it works

1. The working model hits a hard problem — architectural decision, tricky bug, non-obvious tradeoff
2. It calls `ask_advisor` with a concise question
3. The plugin fetches the full session transcript and sends it along with the question to the advisor model
4. The advisor responds with targeted, actionable guidance
5. The working model synthesizes the advice and continues

The advisor runs as a **separate, ephemeral session** — it can't take actions, only give advice.

## Installation

### Option A: local plugin (recommended for now)

Copy `src/index.ts` into your project as `.opencode/plugins/advisor.ts`, then install its dependency:

```
cd .opencode
npm install @opencode-ai/plugin
```

No changes to `opencode.json` needed — opencode auto-loads files in `.opencode/plugins/`.

### Option B: npm package

```
npm install opencode-advisor
```

Then add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-advisor"]
}
```

## Configuration

Create `.opencode/advisor.json` in your project:

```json
{
  "model": "anthropic/claude-opus-4-7",
  "maxToolOutput": 10000
}
```

| Field | Default | Description |
|---|---|---|
| `model` | `anthropic/claude-opus-4-7` | Advisor model in `provider/model` format. Must be a model available in your opencode setup. |
| `maxToolOutput` | *(none)* | Truncate tool call outputs in the transcript at this many characters. Useful to prevent token overload when sessions contain large file reads. Omit to include full outputs. |

You can also set `ADVISOR_MODEL=provider/model` as an environment variable — this takes precedence over the config file.

### Choosing a model

The advisor model must be a `provider/model` pair configured in opencode (e.g. via your `opencode.json` or environment variables). Examples:

- `anthropic/claude-opus-4-7`
- `anthropic/claude-opus-4-5`
- `openai/o3`
- `google/gemini-2-5-pro`

The whole point is to use a *more capable* model than your working model — pick accordingly.

## When should the working model use it?

The tool description instructs the model to use it sparingly:

> Consult a more powerful model for guidance when you are genuinely stuck, need architectural advice, or face a critical decision with non-obvious tradeoffs. Use sparingly — only for hard problems where expert input materially changes the outcome.

Good uses: stuck on a hard bug, uncertain between two architectures, need a second opinion on a risky refactor.

Bad uses: simple questions the model can answer itself, routine tasks, fishing for validation.

## Viewing logs

The plugin logs to opencode's structured log. On **Windows**:

```
%APPDATA%\opencode\log\
```

On **macOS/Linux**:

```
~/.local/share/opencode/log/
```

Or run opencode with `--print-logs` to stream logs to stdout.

Filter for plugin activity:

```
grep "opencode-advisor" opencode.log
```

## Development

```bash
npm install       # installs @opencode-ai/plugin in root node_modules/
npm run build     # compile to dist/
npm run dev       # watch mode
```

`src/index.ts` is the single source of truth. `.opencode/plugins/advisor.ts` is a thin re-export that lets opencode load the plugin when working in this repo itself — it relies on `npm install` having been run at the root so that `@opencode-ai/plugin` is resolvable from `src/`.

## License

MIT
