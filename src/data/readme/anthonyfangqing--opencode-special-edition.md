# opencode-special-edition

MOSTLY CLANKER-BUILT

OpenCode plugin that shortens the default system prompt and built-in tool descriptions so each request sends fewer tokens. Inspired by the minimal style of [pi](https://github.com/mariozechner/pi).

The built-in JSON parameter schemas for tools are unchanged. This package only replaces the long prose descriptions where a shorter version exists.

## What it does

### System prompt

Replaces OpenCode’s default system prompt with a shorter version from `prompt/default.txt`. Keeps the environment block (model name, cwd, date), the skills block (see below), and `AGENTS.md` content when OpenCode composes the default layout.

### Skills section (not modified by this plugin)

OpenCode adds a **separate** system fragment listing discovered skills (from `SKILL.md` files under paths such as `skill/`, `skills/`, `.claude`, `.agents`). It is built in `SystemPrompt.skills` and concatenated with env + instructions when assembling the prompt. Typical shape:

```text
Skills provide specialized instructions and workflows for specific tasks.
Use the skill tool to load a skill when a task matches its description.
<available_skills>
  <skill>
    <name>…</name>
    <description>…</description>
    <location>file://…</location>
  </skill>
  …
</available_skills>
```

If no skills are loaded, the third part is the line `No skills are currently available.` If the agent has the `skill` permission disabled, this block is omitted entirely.

### Tool descriptions

Supplies shorter description strings from `tool/<tool-id>.txt` for built-in tools OpenCode exposes. Parameter schemas are still the full definitions from OpenCode.

### Rough size comparison

| Component | Typical before | With this plugin | Approx. savings |
|-----------|----------------|------------------|-----------------|
| System prompt (provider text only) | ~1800 tokens | ~100 tokens | ~1700 |
| Tool descriptions | ~5500 tokens | ~350 tokens | ~5150 |
| Skills section | (unchanged) | (unchanged) | — |
| **Total (order of magnitude)** | | | **~6850** |

Exact counts depend on model tokenizer and OpenCode version.

## Install

### From npm

```bash
npm install @anthonyfangqing/opencode-special-edition
```

In `opencode.json` / `opencode.jsonc`:

```jsonc
{
  "plugin": ["@anthonyfangqing/opencode-special-edition"]
}
```

### Local path

```jsonc
{
  "plugin": ["./path/to/opencode-special-edition/index.ts"]
}
```

### Project plugin directory

Copy or link the package under `.opencode/plugins/` (see [OpenCode plugins](https://opencode.ai/docs/plugins/)). Files there load automatically; you do not have to list them in `plugin` unless you also use npm plugins and want a specific setup.

## Customization

- Project rules: use `AGENTS.md`; this plugin keeps that content when it is injected into the default prompt shape.
- Full custom system prompt: set `agent.build.prompt` in config. The plugin skips rewriting when the prompt does not look like the default.

## What it does not change

- The **skills** fragment OpenCode adds (`Skills provide specialized…`, `<available_skills>`, etc.): this plugin does not remove or edit it; it remains after the env block in the composed system text.
- JSON parameter schemas for tools (still full definitions)
- Environment lines (model, cwd, date) when present in the default prompt
- `AGENTS.md` text when present in the composed prompt
- Plan-mode reminders, compaction/summary/title prompts, or other internal agent prompts
- MCP tool descriptions (only OpenCode’s built-in tools are overridden here)

## Publish

From this directory, logged in as a member of the [anthonyfangqing](https://www.npmjs.com/org/anthonyfangqing) org (`npm login`):

```bash
npm publish
```

`package.json` sets `publishConfig.access` to `public` so the scoped package is visible without passing `--access public`. Use `npm pack --dry-run` to inspect the tarball before publishing.
