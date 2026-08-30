# skill-commands

An OpenCode plugin that makes your skills show up in `/` autocomplete.

## The problem

Typing `/my-skill` works. Typing `/` doesn't list it.

OpenCode does register your skills as commands, but the TUI hides them from the autocomplete popup, so a skill is only reachable if you already remember its name — or you go through the `/skills` picker (palette entry `prompt.skills`, bindable as `"keybinds": { "prompt_skills": "..." }` in `tui.json`).

This plugin re-registers each skill as an ordinary command, so it shows up in the popup like everything else. Same name, same behaviour, no duplicates — a real command simply wins over the skill entry of the same name.

## Install

Add it to `plugin` in your `opencode.json` — OpenCode installs npm plugins automatically at startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@glaicer/supercode-skill-commands"]
}
```

Restart OpenCode after saving.

## Which skills it picks up

Parity with OpenCode's runtime (`~/.opencode/bin/opencode` `SkillDiscovery`):

- `~/.agents/skills/**/SKILL.md` and `~/.claude/skills/**/SKILL.md` (global, `dot:true`, `symlink:true`)
- `<session-dir>/.agents/skills/**/SKILL.md` and `<session-dir>/.claude/skills/**/SKILL.md` walked up to the worktree root (`**` recursive, dot + symlink, cycle-safe via `realpath`)
- `opencode.jsonc: skills.paths` (each entry scanned `**/SKILL.md`; `~/` expanded, relative resolved against worktree)

Project bases come first (nearest dir → worktree → global), `.agents` before `.claude` at each level, so a nearer or `.agents` skill shadows a farther / `.claude` one. A duplicate name is registered **once** (`config.command[name]` first-wins, same dedup as OpenCode's `duplicate skill name` warning). The walk stops at the worktree root, so nothing above your repo leaks in.

Not mirrored (require live fetch / plugin host): `skills.urls` and plugin-provided `{skill,skills}/**/SKILL.md` directories.

