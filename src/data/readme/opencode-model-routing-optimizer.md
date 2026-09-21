# opencode-model-routing-optimizer

OpenCode plugin that installs one skill and its slash command for
intent-driven, cost- and quota-aware model selection:

| Slash command      | Skill                    | What it does                                                                                                                                            |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/optimize-micode` | `optimize-micode-models` | Audit and optimize the `model` assignments in `~/.config/opencode/micode.json` for the priorities and domain expertise you name, using research that is re-fetched live on every run. |

The plugin installs the assets into your opencode config directory on
startup; nothing else runs. No hooks, no commands, no keybindings.

## Why

Most users pick their `micode.json` assignments once and never revisit
them. But pricing, quality, latency, and quota caps shift every time a
provider rotates a model. `/optimize-micode` covers that gap:

- **Static per-agent assignment.** It edits only the `model` fields in
  `~/.config/opencode/micode.json` — which `(provider, model)` tuple each
  configured opencode agent uses at startup. Nothing else is touched.
- **Intent-driven.** You state the priorities that matter (TTFT, TPS,
  quality, cost, context, reliability) and the domain expertise the picks
  should favor (report writing, creative writing, Python, Java,
  spreadsheets, technical documents, or freeform). Candidates are ranked
  by the goals you name, so a domain-strong model can win even when it is
  merely adequate on an axis you did not ask about.
- **Fresh research every run.** Pricing, plans, quota mechanics, TTFT/TPS,
  benchmark capability, and model validity are re-fetched from live,
  date-anchored sources on every invocation — nothing is applied from
  memory.
- **Billing is never asked.** Billing nature is derived from fresh web
  evidence plus `opencode-quota` account telemetry — never from a
  questionnaire, and never inferred from a `$0` or missing price or from
  absent credentials. Unknown stays reported as unknown.
- **Quota-pool spreading, not runtime fallback.** When two routes are
  materially equivalent on every requested priority, they are assigned to
  different agents so load spreads across independent quota pools. These
  are static micode assignments: a quota-exhausted provider does not fail
  over at runtime, and the skill never describes it as if it did.

## Gates and guarantees

Every run enforces the same gates in both the skill and its command wrapper:

- **Role/domain suitability first.** Expertise and each agent's actual
  responsibilities establish competence, tool-use, and context fitness
  *before* ranking. Every configured agent gets a change/keep/blocked
  verdict with a rationale; agent names are never invented.
- **Live-catalog validity only.** A model is valid only if it resolves in
  the current `opencode models` catalog. Docs and price pages are research,
  not truth, and the catalog differs by auth mode.
- **Delegation hard gate.** A lead/commander candidate is disqualified
  without positive evidence it invokes subagents under the orchestration
  prompt — regardless of wins on any other axis. Evidence is
  strongest-first: your own observed sessions, then a live probe, then
  recent (≤ ~90 days) community reports.
- **Capacity gate.** Fresh positive remaining capacity or documented usable
  entitlement is required before any new assignment, in *every* eligibility
  mode — `unrestricted` removes billing restrictions, not capacity or
  competence requirements. Unknown or stale capacity stays unverified and
  cannot silently pass. Catalog presence and API keys do not establish
  usable funds, and public pages cannot establish a private balance.
- **Billing unknown is blocked in constrained modes.** A route whose billing
  nature cannot be classified is excluded from `avoid-paygo`, `paygo-only`,
  and `free-only`; under `unrestricted` its cost/billing is reported
  unknown. Billing is derived from fresh evidence plus telemetry, never
  asked.
- **Exact-edit consent.** The skill shows the exact `Edit` target and gets
  explicit confirmation before writing. There are no silent config
  mutations, and prerequisite plugin entries are offered as `@latest`.
- **Acceptance canary.** Success requires the catalog command to exit `0`
  *and* emit zero `Model not available` warnings. A CLI failure is never
  read as success just because a `grep` matched nothing.

## Installation

opencode's plugin loader supports three ways to reference a plugin
([docs](https://opencode.ai/docs/plugins/#use-a-plugin)):

| Path | How |
| --- | --- |
| **A. `plugin` stanza (recommended)** | One line in `~/.config/opencode/opencode.json`; Bun resolves and installs the npm package at startup. No separate install command. |
| **B. GitHub reference** | Same `plugin: [...]` entry, but `github:owner/repo` — Bun clones and installs straight from the repo, no npm publish needed |
| **C. local plugin directory** | Drop the built file into `~/.config/opencode/plugins/` (project: `.opencode/plugins/`) |

### Path A — `plugin` stanza (recommended)

Add one line to `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": [
    ...,
    "opencode-model-routing-optimizer@latest"
  ]
}
```

That's the whole install. On the next startup, Bun resolves the package
from npm into `~/.cache/opencode/node_modules/` and opencode loads it —
no `bun add`, no global install, no build step. Pinning `@latest` (or
leaving the name bare) keeps you on the newest release; avoid version
pins so the skill picks up catalog and behavior fixes automatically.

Restart opencode. The two files (the `SKILL.md` and its `.md` command)
get copied into `~/.config/opencode/skills/` and
`~/.config/opencode/command/` on first load — and re-copied
automatically on every plugin upgrade.

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

After restarting opencode you should see one new slash command available:

- `/optimize-micode`

…plus one new skill in your skill inventory:

- `optimize-micode-models`

The plugin logs to `client.app.log` under the `routing-optimizer` service.
Look in `~/.local/share/opencode/log/` if anything looks wrong:

```sh
grep routing-optimizer ~/.local/share/opencode/log/*.log
```

### Confirm what got installed

```sh
ls ~/.config/opencode/skills/optimize-micode-models/SKILL.md \
   ~/.config/opencode/command/optimize-micode.md
```

Each file should contain a line near the top:

```html
<!-- routing-optimizer:version=0.3.0 -->
```

That marker is what tells the plugin whether to overwrite on upgrade.

## Upgrading from <=0.2.4

Versions up to 0.2.4 shipped a **second** skill, `design-fallback-chain`,
and its `/design-fallback-chain` command, and selected assignments with a
strict all-axis Pareto rule. Both of those are retired in 0.3.0: the
`design-fallback-chain` skill and command are gone, and the remaining
`optimize-micode-models` skill now ranks candidates by the priorities and
domain expertise you state each run — no all-axis dominance requirement.
This is a breaking change, hence the `0.3.0` minor bump under `0.y.z`.

On the first load of 0.3.0, the installer retires the old assets only when
their bytes are **byte-identical to a revision this plugin actually
shipped** (sha256 of the CRLF-normalized bytes):

- `skills/design-fallback-chain/SKILL.md`
- `command/design-fallback-chain.md`

If the content matches a known shipped revision, the file is deleted and
its now-empty `skills/design-fallback-chain/` directory is pruned. Only that
skill's own empty directory is ever pruned — the shared `skills/`, `command/`,
and config root are never removed. If you edited the file — or it is a
symlink, sits under a symlinked parent, or is otherwise not byte-identical —
the installer leaves it **in place** and logs a warning, because it cannot
prove the content is its own. The fingerprint is rechecked immediately before
removal, and only a missing file counts as absent: read/permission failures
are reported, never swallowed. To remove kept files yourself:

```sh
rm -rf ~/.config/opencode/skills/design-fallback-chain
rm ~/.config/opencode/command/design-fallback-chain.md
```

Check what the installer did:

```sh
grep routing-optimizer ~/.local/share/opencode/log/*.log
```

## Using the commands

`/optimize-micode` works bare and accepts **priorities** (an explicit
order is respected only when you state one), an optional **eligibility
mode**, and **expertise**:

```sh
/optimize-micode prioritize ttft first, then cost # explicitly prioritize TTFT over cost
/optimize-micode quality free-only              # best quality among free-as-in-beer routes
/optimize-micode expertise: creative writing    # favor creative-writing strength
/optimize-micode cost expertise: spreadsheets   # cost-first picks strong at spreadsheets
/optimize-micode ttft and creative writing      # natural language works too
```

Natural language works — the flags are optional conveniences, not required
syntax. `/optimize-micode ttft and creative writing` means the same thing
as `/optimize-micode ttft expertise: creative writing`.

- **Priorities** accept arbitrary dimensions, including `ttft`, `tps`,
  `quality`, `cost`, `context`, and `reliability`. State an explicit order
  or weighting when you care about priority; otherwise requested dimensions
  are treated equally. Incidental mention order is not silently treated as
  strict priority. Questions are reserved for genuine ambiguity, not merely
  unfamiliar vocabulary.
- **Eligibility modes** are `unrestricted` (default), `avoid-paygo`,
  `paygo-only`, and `free-only`, passed as `--eligibility <mode>`. A route
  whose billing nature cannot be classified is excluded from the three
  constrained modes rather than assumed to qualify.
- **Expertise** is free text after `expertise:` (the older `focus:` is
  accepted as a back-compat alias). It scopes the domain research used to
  judge quality — coding effectiveness, creative writing, a specific
  language, spreadsheets, technical documents, anything. If expertise is
  not stated, the skill asks for it rather than assuming a coding domain.

If you leave priorities or expertise unstated, the skill asks exactly what
is missing — one question about which dimensions to optimize (and in what
order), one about the area of expertise. It never asks you to classify
billing, and never asks which plan you own. `ttft` and `tps` are distinct,
provider-route-dependent measures, and domain expertise drives suitability
**before** ranking, not merely as a tie-breaker.

## Uninstallation

Remove the plugin entry from `~/.config/opencode/opencode.json`, restart
opencode, then optionally delete the assets it installed:

```sh
rm -rf ~/.config/opencode/skills/optimize-micode-models
rm    ~/.config/opencode/command/optimize-micode.md
```

## Versioning & upgrades

The plugin version is the npm package version (`package.json` `"version"`).
Each shipped markdown file has a matching
`<!-- routing-optimizer:version=X.Y.Z -->` marker right under the YAML
frontmatter — two markers. All **four** values must match: the
`package.json` version, the plugin's `PLUGIN_VERSION` constant, and the
two asset markers. On plugin load, the installer compares the destination
marker against the source marker and copies whenever the source is newer
(or the destination is missing).

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
