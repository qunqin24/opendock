# opencode-model-hide

OpenCode plugin that lets you hide models from the model picker — managed entirely
from the terminal UI with a picker-style selection dialog, no config editing required.

- `/model-hide` (or `Ctrl+Shift+h`): open the model list grouped by provider, arrow-key
  through it, and press Enter to toggle the highlighted model. `🟢` marks visible
  models, `🔴` marks hidden models, and `⭐` marks the default model. Press `Ctrl+A`
  in the same dialog to toggle the highlighted model as the persisted plugin default.
  Changes are applied in one batch to avoid rebuilding the model catalog for every toggle.
  The persisted favorite is prioritized for new TUI sessions at startup; an explicitly selected
  model in an existing session remains unchanged.
- Server side, hidden models are removed from the active model catalog, so they
  disappear from `opencode models`, `/models`, and every OpenCode instance for the
  user account — across restarts and catalog refreshes.
- Everything else (other providers, other models) is left untouched.

## Install

```bash
npm install @franiboy/opencode-model-hide
```

Install it globally with OpenCode:

```bash
opencode plugin add @franiboy/opencode-model-hide
```

The package exposes both its server plugin and `./tui` entrypoint. OpenCode automatically loads the TUI entrypoint
from the active server plugin, so no duplicate `cli.json` entry is required.

## Bridge file

Hidden models are stored in `~/.config/opencode/model-hide.json`:

```json
{
  "hidden": ["opencode-go/kimi-k2.6", "opencode-go/grok-4.6"],
  "favorite": "opencode-go/space-bunny-free"
}
```

- Changes are picked up automatically (debounced watch, `ctx.model.reload()`).
- `MODEL_HIDE_BRIDGE_FILE` can move the file location.

## Contributing

Every change needs an entry under `## [Unreleased]` in
[CHANGELOG.md](CHANGELOG.md), **in the same pull request that makes the
change**. Write it when you change something, not when you remember it at
release time.

This is not enforced by a script. `npm run release` copies that section verbatim
into the new version, and nothing checks whether it describes what actually
changed: a change that touches `src/` without an entry is released with no entry
and no warning. Keeping the section current is the author's job.

`CHANGELOG.md` and this file are the only documentation here, so a behaviour
change that nobody could discover by reading `src/` deserves a sentence in the
Unreleased section.

## Development

```bash
npm ci
npm run check          # format:check + typecheck + test
npm run format         # prettier --write .
npm run release        # suggest a version from the changelog, then release
```

CI runs the same checks on Node 22 and 24 and asserts that the npm tarball
contains nothing outside `src/`, `README.md`, `LICENSE` and `package.json`.

Because the package ships raw TypeScript and its entire type surface comes
from `@opencode/plugin`, the typecheck in CI runs against the resolved plugin
version. A breaking plugin release therefore shows up as a red check on the
Dependabot PR instead of as a bug report.

Releasing goes through `npm run release`, not a hand-written `npm publish`. It
suggests a version from the Unreleased section, bumps `package.json` and
`package-lock.json` together, commits and tags locally, publishes, and only
then pushes. If the publish fails it resets `main` to the commit it started from
and deletes the tag, so nothing is ever left with a release that does not exist
on npm. It refuses to run anywhere but `main`, and publishing needs the npm
one-time password, so the confirmation happens in a browser.

## License

MIT
