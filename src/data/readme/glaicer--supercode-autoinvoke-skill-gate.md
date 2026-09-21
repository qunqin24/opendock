# autoinvoke-skill-gate

You install a lot of skills globally. Most of them are meant for *you* to invoke — not for the model to grab on its own.

Claude Code, Codex, and OpenCode 2 beta already have a way to say "don't auto-invoke me". OpenCode v1 just ignores it, so the model sees every installed skill and may pick the wrong one by itself.

This plugin stops the model from auto-using your manual-only skills. It removes those manual-only skills from `<available_skills>` in the system prompt, so the model never considers them.

- Smaller prompt, fewer tokens, less deliberating over which skill to pick.
- Fewer surprise side effects from a skill firing when you didn't ask for it.
- Nothing is blocked: `/my-skill` or "use my-skill" still works — it just never happens automatically.

## How to mark a skill as manual-only

Any one of these is enough:

- **Claude Code** — in `SKILL.md` frontmatter:
  ```md
  ---
  disable-model-invocation: true
  ---
  ```
- **OpenCode v2** — in `SKILL.md` frontmatter:
  ```md
  ---
  metadata:
    opencode/autoinvoke: false
  ---
  ```
- **Codex** — in `agents/openai.yaml` next to `SKILL.md`:
  ```yaml
  policy:
    allow_implicit_invocation: false
  ```

Only real booleans count (`true` / `false`, no quotes).

## Install

Install with the OpenCode CLI:

```bash
opencode plugin add @glaicer/supercode-autoinvoke-skill-gate
```

- `--global` installs into the global config (`~/.config/opencode`); default is local (`.opencode` in the current project).
- `--force` replaces an already-installed version.
- Restart OpenCode after installing.

Manual install also works: add the package to the `plugins` array in `opencode.json`
(OpenCode v1 uses the `plugin` array instead):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@glaicer/supercode-autoinvoke-skill-gate"]
}
```

Restart OpenCode after saving.

> Put it **last** in your `plugins` (or v1 `plugin`) list so no later plugin re-adds the filtered skills.

On OpenCode v2 the plugin sets the native `autoinvoke: false` flag on
Explicit-only skills instead of patching the system prompt; on v1 it filters
`<available_skills>` via the `experimental.chat.system.transform` hook.

