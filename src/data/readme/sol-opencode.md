# SoL-OpenCode

Unofficial OpenCode V2 port of **two** [SoL-Pi](https://github.com/NVlabs/SoL-Pi) harness mechanisms:

- **Action Fusion** — optional `then_run` on `edit`, `write`, and (when path enumeration is reliable) `patch`
- **Observation Pack** — pack host-visible tool text **> 10 KiB**; project on `session.hook("http.request")`; `obs_recall` pages the archive

This project is **not** NVIDIA, **not** NVlabs, and **not** the full four-mechanism SoL-Pi stack.

## From source

Requires Node.js **22+**. Pinned host is OpenCode **2.0.27** (see [docs/pin.md](docs/pin.md)).

```bash
git clone https://github.com/lucas-albers-lz4/SoL-OpenCode.git
cd SoL-OpenCode
npm ci
npm test
npm run build
```

Load the built package in an OpenCode 2.0.27 project:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/SoL-OpenCode",
      "options": { "actionFusion": true, "observationPack": true }
    }
  ]
}
```

Register per [V2 plugin docs](https://dev.opencode.ai/v2/docs/build/plugins).

## npm

`sol-opencode` is published on npmjs. The plugin config below pins the version
this README is written against; `npm i sol-opencode` installs the latest. The
first CI publish (`v0.1.0`) went out via GitHub Actions trusted publishing,
2026-10-12 — OIDC, no tokens. Install:

```bash
npm i sol-opencode
```

```jsonc
{
  "plugins": [
    { "package": "sol-opencode@0.1.1", "options": { "actionFusion": true, "observationPack": true } }
  ]
}
```

The npm channel resolves through the package.json `exports` map (`dist/index.js`),
independent of the local-directory channel above. Pinned against OpenCode **2.0.27**.

### How OpenCode resolves this plugin (two entry channels)

| How you reference it | What OpenCode V2 loads |
|---|---|
| Local directory path (clone-to-try, `"package": "/abs/path"` or `"./plugins/x"`) | `<dir>/index.ts` → `<dir>/index.js` directly. **The `exports` map is NOT consulted** on this channel. |
| Package name / `file:` specifier | Normal Node resolution via the package.json `exports` map → `dist/index.js`. |

The root `index.ts` is the local-directory entrypoint and simply re-exports `src/index.ts`;
`exports` (→ `dist/`) remains the publish entrypoint. Both channels land on the same implementation,
so the local-path form works even before `npm run build`.

The published tarball contains `dist/` plus the root `index.ts` and `src/` source. For an installed
npm package, reference it by package name or `file:` specifier so OpenCode follows `exports`; an
absolute path inside `node_modules/sol-opencode` selects the local-directory channel instead.

## Plugin id

`sol.opencode`

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `actionFusion` | `true` | Wrap mutation tools with optional `then_run` |
| `observationPack` | `true` | Archive large tool results and project placeholders on later provider requests |

Option handling is defensive. A value that is not `true`/`false` logs a warning and disables that
mechanism only; an unrecognised key (a typo such as `actionfusion`) warns and leaves the other
mechanism enabled; a non-object `options` value disables both. None of those cases throw.

`setup` throws only when **no** mechanism could register at all. A mechanism whose host domain is
missing (`ctx.tool`, `ctx.session`, `ctx.storage`, an absolute `ctx.location.directory`) warns and is
skipped, and the other mechanism stays active. Disposal attempts every registration in reverse
registration order, so one failing disposer cannot leave the rest registered.

## Provenance

Portable algorithms are copied from SoL-Pi (MIT, NVIDIA copyright). Reference commit: `e1a586af0ad8956f42ae5b26bba20e48fbf30e00`.

Pinned runtime: see [docs/pin.md](./docs/pin.md).

## License

MIT — see [LICENSE](./LICENSE).

## Releasing (npm)

Versions are published by CI via **npm trusted publishing (OIDC)** — no npm token
exists for this package. The publish job runs on **Node 24** so the runner has
npm ≥ 11.5.1 (required for OIDC). The published package still declares
`engines.node: ">=22"`.

Flow:

1. GitHub environment **`npm-publish`** is already configured (required reviewer,
   15-minute wait, tags `v*` only, admins cannot bypass).
2. Bump `package.json` version in a PR; merge to `main`.
3. Tag the merged commit: `git tag -a vX.Y.Z -m "release vX.Y.Z" && git push origin vX.Y.Z`.
4. `.github/workflows/publish.yml` checks that the tag equals `package.json`
   version, then validates (tests, typecheck, build) and runs
   `npm publish --access public` with the OIDC id-token. Provenance is attached
   automatically.

### One-time npmjs bootstrap (human laptop, not CI)

**Status: completed 2026-10-12** — placeholder + publisher attached, `v0.1.0`
published via CI, publisher validated. Keep this section as the runbook only
if the package is ever deleted/recreated or a new package is added to the repo.

Trusted publishing can only be attached to a package that **already exists**,
and `npm trust` needs an interactive npm login with account 2FA (a granular
token that bypasses 2FA will not work). Do this **immediately before** the
first `v0.1.0` tag — a new publisher row **expires in 2 days** without a
successful publish.

1. `npm login` (web + 2FA).
2. Publish a **throwaway `0.0.0` placeholder** from a temp directory so you do
   not publish `0.1.0` from `main` without OIDC:

   ```bash
   mkdir -p /tmp/sol-opencode-bootstrap && cd /tmp/sol-opencode-bootstrap
   npm init -y
   npm pkg set name=sol-opencode version=0.0.0 license=MIT \
     description="Placeholder — do not install; real releases start at 0.1.0" \
     publishConfig.access=public
   printf '%s\n' 'Placeholder. Install sol-opencode@0.1.0 or later.' > README.md
   npm publish --access public
   ```

3. Attach the GitHub Actions trusted publisher (`npm` ≥ 11.15). Fields must
   match the workflow **exactly** (case-sensitive):

   ```bash
   npm trust github sol-opencode \
     --file publish.yml \
     --repo lucas-albers-lz4/SoL-OpenCode \
     --environment npm-publish \
     --allow-publish
   ```

   Equivalent UI: package → Settings → Trusted publishing → GitHub Actions.

   | Field | Value |
   |--------|--------|
   | Organization or user | `lucas-albers-lz4` |
   | Repository | `SoL-OpenCode` |
   | Workflow filename | `publish.yml` |
   | Environment | `npm-publish` |
   | Allowed actions | **Allow `npm publish`** |

   After 2026-09-03, new publishers default to `npm stage publish` only. This
   workflow uses `npm publish`, so `--allow-publish` / that checkbox is required.

4. Do not tag `v0.0.0`. The first real release is `v0.1.0` from CI after
   [issue #2](https://github.com/lucas-albers-lz4/SoL-OpenCode/issues/2) is GO.
