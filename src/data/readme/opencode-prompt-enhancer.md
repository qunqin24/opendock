# OpenCode Prompt Enhancer

A TUI plugin for OpenCode that offers `/enhance`. It rewrites a rough draft into a clearer, more specific prompt and presents the result in a `/btw`-style modal.

## Requirements

- OpenCode v2 (tested with v2.2.5).
- A configured provider and model. Enhancement uses the currently selected prompt model unless the `model` option is set. The draft is sent to that provider through OpenCode when you run `/enhance`.

## Install

Add the plugin to your global or project `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-prompt-enhancer"]
}
```

Pin a release with `"opencode-prompt-enhancer@0.1.1"`. OpenCode installs the package and loads its TUI part automatically. If the TUI connects to a remote server and you want this plugin to keep running locally, add it to `~/.config/opencode/cli.json` instead. Run `/reload` if the command does not appear.

## Usage

```text
/enhance write a login page with validation
/enhance
```

- `/enhance <draft>` enhances the draft immediately.
- `/enhance` opens the built-in prompt dialog.
- While enhancement runs, the prompt footer shows `enhancing…`.
- In the result modal:
  - `Enter` inserts the enhanced prompt into the current composer.
  - `Esc` restores the original `/enhance <draft>` text when it was supplied on the slash command.
  - `c` copies the enhanced prompt.
  - `r` retries enhancement.
  - `j`/`k`, arrow keys, Page Up/Page Down, Home, and End scroll the result.

If the composer editor cannot be accessed when pressing Enter, the plugin falls back to copying the enhanced prompt to the clipboard.

The command palette also contains **Show prompt enhancer config**, which displays the merged options and the config sources that contributed them.

## Configuration priority

The plugin merges plugin options field by field:

1. Built-in defaults
2. User config: `~/.config/opencode/opencode.jsonc` (`%USERPROFILE%\.config\opencode\opencode.jsonc` on Windows)
3. Project config: `<project>/opencode.jsonc`
4. Project config: `<project>/.opencode/opencode.jsonc`

The plugin must be listed in the config where you want options to take effect, using the same package specifier (`opencode-prompt-enhancer`, or the same local path for development).

### User config example

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-prompt-enhancer",
      "options": {
        "role": "Software Developer",
        "experience": "25 years",
        "specialties": ["TypeScript", "React", "Node.js"],
        "tone": "direct and practical",
        "style": "balanced",
        "language": "auto",
        "rules": [
          "Preserve the user's intent and language.",
          "Never invent requirements or file paths.",
          "Make the goal, constraints, and expected output explicit."
        ],
        "examples": [
          {
            "input": "fix login",
            "output": "Fix the login flow. First reproduce the failure, identify the root cause, implement the smallest safe fix, and add a regression test. Report changed files and verification steps."
          }
        ]
      }
    }
  ]
}
```

### Project config example

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-prompt-enhancer",
      "options": {
        "role": "Senior Full-Stack Engineer",
        "specialties": ["Next.js", "PostgreSQL", "Playwright"],
        "rules": [
          "Follow the repository's existing patterns.",
          "Include a concrete test plan.",
          "Keep changes minimal and reviewable."
        ],
        "template": "You are a {{role}} with {{experience}} of experience. Rewrite the draft for an AI coding agent working in this repository. Follow these rules:\n{{rules}}\n\nDraft:\n{{draft}}\n\nReturn only the enhanced prompt."
      }
    }
  ]
}
```

### Merge behavior

- Objects are merged deeply.
- Strings, numbers, booleans, and arrays are replaced by the higher-priority value.
- `null` clears the inherited value. For example, `"tone": null` in project config removes the user's tone.
- Invalid values are ignored with a warning and do not erase valid lower-priority values.

## Options

| Option | Type | Purpose |
|---|---|---|
| `role` | string | Persona role, for example `Software Developer`. |
| `experience` | string or number | Human-readable experience, for example `25 years`. |
| `specialties` | string[] | Skills or technologies. |
| `tone` | string | Writing tone, for example `direct and practical`. |
| `style` | `"balanced" \| "structured" \| "minimal"` | Enhancement style. |
| `language` | string | Output language; `auto` preserves the draft language. |
| `maxWords` | number | Optional desired maximum length. |
| `template` | string | Custom enhancement template. |
| `rules` | string[] | Enhancement rules. Replaces the default rules when set. |
| `examples` | array | Few-shot examples using `{ "input": "...", "output": "..." }` or strings. |
| `extraInstructions` | string | Appended to the generated enhancement prompt. |
| `model` | `{ providerID, id }` | Model used for enhancement. Falls back to the selected prompt model, then the server default. |

Custom templates support these placeholders:

```text
{{role}}
{{experience}}
{{specialties}}
{{tone}}
{{style}}
{{language}}
{{maxWords}}
{{rules}}
{{examples}}
{{extraInstructions}}
{{draft}}
```

If a custom template does not contain `{{draft}}`, the plugin appends the draft after the template.

## Development

Run the local plugin from this directory with `opencode` and use `/reload` after edits.

```bash
npm install
npm run typecheck
npm test
npm run build
```

The plugin is compiled from `src/` to `dist/` with Babel + Solid (universal generate) before publishing. The checked-in `opencode.jsonc` loads `./dist` as a local plugin and includes sample persona options. Run `npm run build` after editing `src/` before `/reload`.

> Publishing raw `.tsx` from `node_modules` does not work: the Solid transform skips `node_modules`, so JSX falls back to React (`Cannot find package 'react'`). Always publish compiled `dist/*.js`, never raw TSX.

## Publishing

`prepublishOnly` runs the typecheck, tests, and build before every publish. The published tarball contains `dist`, `README.md`, `LICENSE`, and `package.json`.

```bash
npm login
npm run typecheck
npm test
npm pack --dry-run
npm publish --access public
```

## License

MIT
