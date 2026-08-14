# token-lean

`token-lean` is an OpenCode plugin that reduces avoidable token overhead in OpenCode + Oh My OpenAgent (OMO) workflows.

It focuses on conservative, recoverable cleanup:

- deduplicates repeated OMO reminder blocks;
- cleans completed `task` and `background_output` parent Parts;
- distills large background results only when they can be reconstructed from the child session;
- compresses built-in tool descriptions without changing tool schemas.

If a transformation cannot be proven safe, the plugin keeps the original output.

## Compatibility

- Validated with OpenCode `1.18.2`, OMO `4.18.2`, and Bun `1.3.14`.
- Expected floor: OpenCode `>=1.17.15`, OMO `>=4.16.3`.

After upgrading OpenCode or OMO, rerun the test suite and at least one real foreground/background sentinel check.

## Installation

```bash
npm install @cat4869/token-lean
```

Add the plugin to your OpenCode config:

```json
{
  "plugin": ["@cat4869/token-lean"]
}
```

For local development, use an explicit file URL:

```json
{
  "plugin": ["file:///absolute/path/to/token-lean/src/index.ts"]
}
```

## Configuration

Create `config.json` beside the plugin:

```json
{
  "reminderDedup": true,
  "resultCompression": true,
  "backgroundResultDistillation": true,
  "backgroundDistillMinChars": 10000,
  "backgroundDistillMinSavings": 2000,
  "runtimeProbe": false,
  "toolDescriptionCompress": true
}
```

## Safety

`token-lean` does not patch OpenCode's SQLite database directly. Runtime writes go through OpenCode plugin Part update APIs.

The child session remains the recovery source. Compressed parent output includes a marker such as:

```text
[result compressed by token-lean, full session: ses_...]
```

Background distillation is strict: the parent output must be large enough, child messages must be available, and the flattened parent body must match child chunks exactly. Otherwise the output is left unchanged.

## Verification

```bash
bun run check
bun run test
bun run pack:dry-run
```

Optional read-only replay against an OpenCode database:

```bash
OPENCODE_DB_PATH="$HOME/.local/share/opencode/opencode.db" bun test/historical-replay.ts
```

For real runtime validation, use OpenCode/OMO foreground and same-process blocking background sentinel checks. Cross-process `bg_...` retrieval is not treated as a plugin guarantee.

## Replay results

One maintainer replay snapshot showed:

- 142 completed `background_output` parts;
- 69 distilled;
- 675,117 saved chars;
- 30.15% eligible savings;
- 43.24% changed-output savings.

These numbers are not a guarantee. Savings depend on task shape, OMO formatter behavior, tokenizer, and whether later turns include the optimized Part.
