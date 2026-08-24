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

`.agents/skills` in every directory from the session directory up to the worktree root, then `~/.agents/skills`. Project directories come first, so a project skill shadows a global one of the same name — the same precedence OpenCode uses. The walk stops at the worktree root, so nothing above your repo leaks in.

