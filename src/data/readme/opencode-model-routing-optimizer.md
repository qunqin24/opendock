# opencode-model-routing-optimizer

OpenCode plugin that installs two complementary skills and their slash commands
for cost- and quota-aware model routing:

| Slash command              | Skill                          | What it does                                                                                         |
| -------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `/optimize-micode`         | `optimize-micode-models`       | Audit and Pareto-optimize `model` assignments in `~/.config/opencode/micode.json` across all configured providers. |
| `/design-fallback-chain`   | `design-fallback-chain`        | Design subscription-aware tier routing (presets + fallback chains) for [`opencode-model-router`](https://github.com/marco-jardim/opencode-model-router). |

The plugin installs both assets into your opencode config directory on
startup; nothing else runs. No hooks, no commands, no keybindings.

## Why

Most users pick their `micode.json` once and never revisit it. But pricing,
quality, and quota caps shift every time a provider rotates a model. The
two skills cover that gap end-to-end:

- **`/optimize-micode`** handles **static per-agent assignment** — which
  `(provider, model)` tuple each opencode agent uses at startup.
- **`/design-fallback-chain`** handles **dynamic per-task routing** — a
  preset the `opencode-model-router` plugin selects from at runtime by
  task tier (`@fast`/`@medium`/`@heavy`).

The two are siblings. The Pareto skill does **not** touch routing config;
the routing skill does **not** touch `micode.json`. Together they keep
the lead cheap, the heavy work on a heavy subscription, and fall back
gracefully on quota exhaustion.

## Installation

opencode's plugin loader supports three ways to reference a plugin
([docs](https://opencode.ai/docs/plugins/#use-a-plugin)):

| Path | How |
| --- | --- |
| **A. npm package** | Listed in `~/.config/opencode/opencode.json` `plugin: [...]`; Bun installs it at startup into `~/.cache/opencode/node_modules/` |
| **B. GitHub reference** | Same `plugin: [...]` entry, but `github:owner/repo` — Bun clones and installs straight from the repo, no npm publish needed |
| **C. local plugin directory** | Drop the built file into `~/.config/opencode/plugins/` (project: `.opencode/plugins/`) |

Pick whichever applies. Path A is the most convenient for end users.
Path B installs the latest commit from this repo directly — handy for
testing unreleased changes without publishing to npm. Path C is the
lightest for local development.

### Path A — npm (for end users)

```sh
bun add -g opencode-model-routing-optimizer
```

Then add it to your opencode config (`~/.config/opencode/opencode.json`):

```jsonc
{
  "plugin": [
    ...,
    "opencode-model-routing-optimizer"
  ]
}
```

Restart opencode. The four files (`SKILL.md`s and `.md` commands) get
copied into `~/.config/opencode/skills/` and `~/.config/opencode/command/`
on first load — and re-copied automatically on every plugin upgrade.

### Path B — GitHub reference (direct, no npm publish needed)

Add the repo reference to your opencode config:

```jsonc
{
  "plugin": [
    ...,
    "github:squizzeak/opencode-model-routing-optimizer"
  ]
}
```

Restart opencode. Bun clones the repo and installs it into
`~/.cache/opencode/node_modules/` at startup, exactly like an npm
package — the `dist/` build output is committed to the repo, so the
plugin loads without a build step. This tracks the default branch's
latest commit rather than a published release.

### Path C — local plugin file (for development)

```sh
git clone https://github.com/squizzeak/opencode-model-routing-optimizer
cd opencode-model-routing-optimizer
bun install
bun run build
mkdir -p ~/.config/opencode/plugins/opencode-model-routing-optimizer
cp -r dist/. ~/.config/opencode/plugins/opencode-model-routing-optimizer/
```

The plugin is a multi-file build (`index.js` + `installer.js` + `assets/`),
so copy the whole `dist/` directory — copying only `index.js` leaves the
plugin unable to load. Restart opencode. `opencode` loads everything under
`~/.config/opencode/plugins/` automatically
([docs](https://opencode.ai/docs/plugins/#use-a-plugin)). Any edit to
`src/` followed by `bun run build && cp -r dist/. ~/.config/opencode/plugins/opencode-model-routing-optimizer/`
takes effect on the next restart.

## Verifying the install

After restarting opencode you should see two new slash commands available:

- `/optimize-micode`
- `/design-fallback-chain`

…plus two new skills in your skill inventory:

- `optimize-micode-models`
- `design-fallback-chain`

The plugin logs to `client.app.log` under the `routing-optimizer` service.
Look in `~/.local/share/opencode/log/` if anything looks wrong:

```sh
grep routing-optimizer ~/.local/share/opencode/log/*.log
```

### Confirm what got installed

```sh
ls ~/.config/opencode/skills/optimize-micode-models/SKILL.md \
   ~/.config/opencode/skills/design-fallback-chain/SKILL.md \
   ~/.config/opencode/command/optimize-micode.md \
   ~/.config/opencode/command/design-fallback-chain.md
```

Each file should contain a line near the top:

```html
<!-- routing-optimizer:version=0.1.2 -->
```

That marker is what tells the plugin whether to overwrite on upgrade.

## Uninstallation

Remove the plugin entry from `~/.config/opencode/opencode.json`, restart
opencode, then optionally delete the assets it installed:

```sh
rm -rf ~/.config/opencode/skills/optimize-micode-models
rm -rf ~/.config/opencode/skills/design-fallback-chain
rm    ~/.config/opencode/command/optimize-micode.md
rm    ~/.config/opencode/command/design-fallback-chain.md
```

## How the two skills differ

**`optimize-micode-models`** (static, per-agent, every start)

- Operates on `~/.config/opencode/micode.json`.
- Computes Pareto dominance across every candidate `(provider, model)`
  tuple and swaps strictly-dominated assignments.
- Defaults to a two-tier constraint: speed-where-interactive,
  cost-where-unattended, all configured providers in scope.
- Refuses to silently substitute off opencode-go — every swap table row
  shows the provider change.

**`design-fallback-chain`** (dynamic, per-task, runtime routing)

- Operates on `~/.config/opencode/opencode-model-router.overrides.jsonc`.
- Composes a `presets.<name>` block + a `fallback.global` chain, with the
  `sub-<cheap>-<heavy>` shape as the default. Friendly provider aliases
  (`claude` → `anthropic`, `codex` → `openai`, `copilot` →
  `github-copilot`, etc.) resolve against the user's configured
  providers.
- Defaults to the cheapest bundled subscription as the `@fast` tier and
  the largest subscription as `@heavy`.
- Refuses — does not silently substitute — when a requested provider
  isn't in `opencode.json`. Surfaces the missing-credential recipe.

Both skills publish their full output (validation, swap/reasoning
tables, restart reminders) in the command's render and never apply
changes silently.

## Versioning & upgrades

The plugin version is the npm package version (`package.json` `"version"`).
Every shipped markdown file has a matching `<!-- routing-optimizer:version=X.Y.Z -->`
marker right under the YAML frontmatter. On plugin load, the installer
compares the destination marker against the source marker and copies
whenever the source is newer (or the destination is missing).

To force a reinstall, delete the destination file; the next plugin load
sees a missing destination and re-copies from the bundle.

## Marketplace / discoverability

This package is published to npm with the canonical opencode plugin
metadata:

- `name`: `opencode-model-routing-optimizer` (unscoped, matches the
  ecosystem convention `opencode-<thing>`)
- `keywords`: `opencode`, `opencode-plugin`, plus routing-specific terms
- `peerDependencies`: `@opencode-ai/plugin` (TypeScript types)
- `repository`, `bugs`, `homepage` pointing at this github repo

It is listed in the [opencode ecosystem page](https://opencode.ai/docs/ecosystem#plugins)
alongside the other community plugins. To suggest additions or removals,
open an issue or PR on the [opencode repo](https://github.com/anomalyco/opencode/edit/dev/packages/web/src/content/docs/ecosystem.mdx)
(`packages/web/src/content/docs/ecosystem.mdx`).

## Development

```sh
bun install              # install dev deps
bun run typecheck        # tsc --noEmit
bun run test             # bun test
bun run build            # cleans dist/, runs tsc, copies assets/
```

The build script (`scripts/build.ts`) is just `rm dist` → `tsc` → `cp -r assets dist/assets`.
The result of `bun run build` is the publishable artifact.

### Publishing

Publishing is via **npm OIDC trusted publishing** — no long-lived
`NPM_TOKEN` secret in github, no `npm login` dance per release.
[`.github/workflows/publish.yml`](.github/workflows/publish.yml) runs on
every `v*.*.*` tag push, builds + tests + publishes. CI-minted releases
carry **provenance attestation**; a local `npm publish` never does — see
[About provenance](#about-provenance) below.

One-time setup (per repo, per npm namespace):

1. **Create an npmjs.com account** if you don't have one. Free. Email +
   username + password + TOTP. ~2 minutes.
2. **First publish from your terminal** (one-time, to claim the name
   before the Trusted Publisher linkage can be added):
   ```sh
   npm login
   # (interactive: enter username, password, email, 2FA)
   npm run typecheck
   bun run build
   npm publish
   ```
   `publishConfig` in `package.json` already sets `access: "public"`, so
   no CLI flag is needed. The first release lands **without** provenance
   (only CI mints that) — that's expected.
3. **Link this GitHub repo as the Trusted Publisher** for that npm
   package so future pushes publish automatically without `npm login`:
   - Open <https://www.npmjs.com/package/opencode-model-routing-optimizer/access>
   - Under "Publishing access" → "Add a Trusted Publisher":
     - Repository owner: `squizzeak`
     - Repository: `opencode-model-routing-optimizer`
     - Workflow filename: `publish.yml`
     - Environment: (leave blank — no environment selected)
   - Save.
4. **Push a tag** to test the loop:
   ```sh
   git tag v0.1.2
   git push origin v0.1.2
   ```
   GitHub Actions will publish the new version automatically. After
   this, every `git tag v*.*.* && git push --tags` is a release.

#### About provenance

`dist.provenance` lets consumers verify a release was built and
published from the linked GitHub repo by your trusted CI workflow.
This package opts in (`publishConfig.provenance: true`), so every CI
release from v0.1.2 forward carries provenance. npm mints provenance
only from a known CI provider's OIDC token — a local CLI publish never
gets it regardless of flags.

If you ever want to roll back a release: npm publishes are immutable,
but you can deprecate (`npm deprecate`) or unpublish within 72 hours
via the npm web UI / CLI. Roll back the tag with
`git tag -d v0.1.2 && git push --delete origin v0.1.2` if the
workflow-side release failed before publishing.

## License

MIT — see [LICENSE](./LICENSE).
