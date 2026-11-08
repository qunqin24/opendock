# Mushroom

Coding rules for OpenCode that keep generated code clear, changeable, and
honest about why.

Mushroom is inspired by Ponytail. It does not depend on it, and you should not
run both at once.

[日本語 README](README.ja.md)

## Install

```sh
opencode plugin add mushroom-mentor
```

Or add it to the `plugins` array in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["mushroom-mentor"]
}
```

For local development, point `plugins` at this directory instead.

## Use

| Command | Effect |
| --- | --- |
| `/mushroom` | Turn on, or keep on, and show the state |
| `/mushroom on` | Turn on |
| `/mushroom off` | Turn off |
| `/mushroom status` | Show the state without changing it |
| `/mushroom-review [target]` | Review changes without changing code |
| `/mushroom-help` | Show the quick reference |

Use `@mushroom` to load the coding rules and `@mushroom-review` to request a read-only review. Loading a skill with `@` does not change the session state; use `/mushroom` to turn the rules on or off.

The state is per session. New sessions start OFF. Run /mushroom to turn it on. Rules apply to normal turns,
tool continuations, and compaction, not to title generation.

If Ponytail is loaded and on, Mushroom refuses to turn on and asks you to run
`/ponytail off` first. It never changes Ponytail's state.

## Rules

The ruleset lives in `rules/SKILL.md`. It is the only source of the rules.

## License

MIT. See `LICENSE`.

## Development

```sh
npm install
npm run check    # Biome and rumdl
npm run verify   # checks, typecheck, and tests
```

Requires [Biome](https://biomejs.dev/) and [rumdl](https://rumdl.dev/). MD013
is disabled in `.rumdl.toml`.
