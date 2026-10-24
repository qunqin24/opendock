# @pngdeity/opencode-rtk

Thin OpenCode V2 plugin that delegates `bash` / `shell` tool command rewriting to `rtk rewrite` (`rtk >= 0.51.0`).

## Installation

```bash
opencode plugin add @pngdeity/opencode-rtk
```

Or in `opencode.jsonc`:

```jsonc
{
  "plugins": [
    "@pngdeity/opencode-rtk"
  ]
}
```

## Configuration

Set `RTK_DISABLE=1` in the environment or pass `"options": { "disabled": true, "timeoutMs": 2000 }` in `opencode.jsonc` to configure or disable the plugin.

## TUI surfaces

The package also exposes a TUI half at `./tui`. It reads `rtk gain -f json` and
paints what rtk measured — nothing is estimated, and rtk's own reported rate is
recomputed from the integer counts printed beside it.

Surfaces are opt-in. An options entry with no `surfaces` registers nothing, so
an existing install is unchanged until it asks:

```jsonc
{
  "plugins": [
    {
      "package": "@pngdeity/opencode-rtk",
      "options": {
        "surfaces": ["footer", "sidebar", "pane"],
        "scopes": ["session"]
      }
    }
  ]
}
```

| Key | Values | Default |
| --- | --- | --- |
| `surfaces` | `footer`, `sidebar`, `pane`, `all` | none |
| `scopes` | `session` (rtk `-p`), `global`, `all` | `session` |

- **`footer`** — one fixed-width line in `prompt.footer.status`, padded so a
  count crossing a digit boundary does not reflow its neighbours.
- **`sidebar`** — a `sidebar.content` block: totals, then the savings bar.
- **`pane`** — a `session.panel` contribution named `rtk.gain`, opened from the
  command palette or `/rtk`. The pane adds the daily sparkline, rtk's own time
  cost, and rtk's count of excluded oversized commands.

`session` reads the project's rewrites and is labelled `project`; `global` reads
every rewrite on the machine and is labelled `all`. They are never summed into
one row. A reading older than a minute renders as stale with its age rather than
as current, and a missing or failing `rtk` renders that failure rather than a
zero.

Nothing here reports context occupancy or money: "saved" is rtk's filter
savings, which is the only thing `rtk gain` measures.

Sibling modules (`src/gain.ts`, `src/view.ts`, `src/theme.ts`) are pure and
`src/read.ts` is the only one that spawns a process. Only `tui.tsx` may import a
bare specifier: OpenCode resolves each file's imports independently.

## Installation on a machine that pins a resolver

A resolver that is a single `.ts` file cannot carry a TUI half — OpenCode loads a
fixed set of module names from a plugin directory. Use a directory with both
entrypoints, as the discovery layout in the docs shows:

```text
plugins/rtk/index.ts    export { default } from "@pngdeity/opencode-rtk";
plugins/rtk/tui.tsx     export { default } from "@pngdeity/opencode-rtk/tui";
```

Pass options from `cli.json`, which is where the CLI reads a plugin's own
configuration:

```jsonc
{
  "plugins": [
    { "package": "./plugins/rtk", "options": { "surfaces": ["footer"] } }
  ]
}
```

The `tui.tsx` beside the resolver carries no options of its own, so the object
form above is what delivers `surfaces` to the TUI half; a bare string entry
registers no surfaces.

## Local development loop (no live reload)

Editing this repository does **not** change what a running OpenCode server loads,
provided the installation pins the plugin as a packed tarball rather than a path.
Keep development in this repo and run the tests here:

```bash
bun test
```

Apply a change when you choose to, not when a file is saved:

```bash
bun pm pack --destination ~/.local/share/opencode/packs
cd ~/.config/opencode
bun add --no-progress --linker=hoisted \
  "file:$HOME/.local/share/opencode/packs/<the tarball pack printed>.tgz"
opencode service restart
```

Three rules that make this work:

- **`--linker=hoisted` is required.** The `isolated` layout nests the package
  under `node_modules/.bun/`, where a bare specifier imported from a plugin
  resolver does not resolve.
- **Re-packing over an existing tarball name needs `bun install --force`**;
  without it bun reports "no changes" and keeps the previously installed copy.
- **The tarball is a dependency record, so it lives outside `/tmp`.** It is what
  the host's `bun.lock` names; a cleanup or reboot that removes it makes the next
  `bun install` fail and the plugin silently stop loading. Use
  `~/.local/share/opencode/packs/`.

A `file:` dependency on the repository **directory** instead of a tarball
resolves through a symlink, which makes this repo the loaded code and every save
live watcher traffic — the interruption this loop exists to avoid.

Installing from a registry with `opencode plugin add <package>` or a `plugins`
array entry is the same model with the registry in place: the loaded copy is
immutable, application is an explicit version bump, and a new version needs a
restart.

## Publishing

Releases reach npm only from CI. `npm stage publish` runs in
`.github/workflows/publish.yml` on a push of a `v*` tag, using OIDC trusted
publishing (`id-token: write`, no `NPM_TOKEN` secret). Staging is deliberate: the
run uploads the tarball and a maintainer completes it with 2FA.

**One-time setup, per package.** Before the first tag-driven release, register
the workflow as a trusted publisher (needs browser 2FA; npm CLI >= 11.5.1):

```bash
npm trust github @pngdeity/opencode-rtk \
  --file publish.yml --repo pngdeity/opencode-rtk --allow-stage-publish
```

The workflow filename, repo, and `repository.url` in `package.json` must match
exactly — a mismatch surfaces as `ENEEDAUTH`. A new trusted-publisher
configuration expires unless it completes a successful publish within two days.
Then, on the package's npm settings, require 2FA and disallow tokens, so the
direct `npm publish` route cannot be used at all.

**Releasing.**

```bash
# bump "version" in package.json, commit, then tag that commit
git tag vX.Y.Z && git push origin vX.Y.Z
npm stage list                      # find the stage id (interactive auth + 2FA)
npm stage approve <stage-id>
```

`npm stage list|view|approve|reject` cannot use OIDC, so they run locally with an
authenticated login. Provenance is attached automatically once publishing goes
through OIDC on a public repo; a tarball published directly by `npm publish` has
no attestation.

**Tags are gated.** A tag ruleset named `release-gating` blocks creation, update,
and deletion for everyone with no bypass actor, so the tag push above needs a
maintainer to grant it deliberately (repository settings → rules → the ruleset's
bypass list). `main` also refuses force-pushes and deletion. Both exist because
anyone with repository write access can otherwise trigger a publish.

## Development

There is no build step: the package ships TypeScript and `bun` transpiles it.
`bun run prepack` runs the tests, so a packed tarball is always tested.

```bash
bun install
bun test
bunx biome check .
bunx tsc --noEmit
python3 scripts/audit.py
```

CI runs biome and the tests on every push to `main` and on every pull request.
