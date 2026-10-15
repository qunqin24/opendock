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

## Measured behavior (2026-10-12/13 A/B campaigns)

Numbers below come from arm-controlled runs (same model, same prompt, same repo
state; plugin off vs on) measured with [`benchmarks/`](./benchmarks/). Every
figure here re-runs from the raw NDJSON captures with the committed
`benchmarks/measure.py`; per-round-trip and peak context are the
projection-controlled metrics, while run *totals* also scale with agent-chosen
step counts, which is itself arm-sensitive.

Lanes and scope: host OpenCode 2.0.27. Review bundle (n=4 per arm, 2026-10-13)
on `opencode-go/gpt-5.6-luna#high`. Audit fan-out over a pinned OpenWrt repo,
5 areas (n=8 pairs, 2026-10-12/13), all on free-tier lanes:
`mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`,
`nemotron-3-ultra-free`, plus `muse-spark-1.3-contributor-free` on the
plugin arm.

**Observation Pack**
- Review-sized sessions, medians (min–max over 4 runs/arm): **avg context per
  provider round-trip 82,292 (71,214–93,470) → 70,807 (58,309–80,226) with the
  imperative wording, −14%**, and **→ 63,908 (60,796–65,728) with the
  availability-style placeholder, −22%**. **Peak session context 116,094 →
  92,150 (−21%)** and **→ 80,856 (−30%)**. The placeholder arm needed ~1.5× the
  provider round-trips (median 14→21) where the imperative arm needed ~2.4×
  (14→33): the wording buys round-trips, not only context.
- Audit-style sessions (7 off-vs-plugin pairs, same model + prompt per pair):
  on the pairs where packing engaged **and neither arm hit the 730 s watchdog**,
  billed context fell **−49%** (`n35-docs`: 2,970,491 → 1,524,897; 9 packed
  objects) and **−80%** (`ultra-docs`: 4,225,138 → 830,894; 10 packed objects),
  with peak **−26%** / **−46%**. Pack coverage: 9 objects over 8 over-gate
  results, and 10 over 9.
- Two disclosures, because the pairs above are a subset:
  - **A gate-crossing pair went the other way.** `mimo-backend` packed 9
    objects and billed **+10.8%** (532,918 → 590,419). Both its arms were killed
    at the 730 s cap, so its totals are not comparable — and neither is
    `mimo-build-ci`'s −31%, the low end of any "−31% to −80%" style range, which
    was likewise truncated on both arms. Truncated pairs are excluded here
    rather than counted on the side that flatters the result.
  - **Small sessions show no projection effect either way.** `mimo-tests`
    (0 objects, −0.3% billed) is genuinely inert. `mimo-docs` (0 objects) shows
    **+178%** at 2 vs 5 round-trips, which is the step-count effect above, not a
    projection regression.
- Placeholder wording matters: the availability-style placeholder (since 0.1.1)
  beat the imperative "call obs_recall" phrasing by 13–37% in billed context and
  23–44% in provider round-trips (two families re-measured from captures, one
  taken from the campaign tables); runs carrying the imperative never recalled
  (0 across all of them), while neutral-wording runs recalled spontaneously when
  archived bytes were actually needed.
- Short sessions (~2 provider sends) never see a placeholder at all (recent
  results stay verbatim by design); projection savings require session length.

**Action Fusion**
- `then_run` is exposed on `edit`/`write` with optional `shell`, works when
  used (allow/reject/fail/blank paths verified), and **no free-tier model
  adopted it in the two plugin-arm fixer sessions that ran** (`n35`, `nu`; the
  other two planned fixer lanes failed in ~10 s on daily quota) where the prompt
  merely permitted it — agents serialized edit → shell regardless. The two
  off-arm sessions in that batch say nothing about adoption: without the plugin,
  `then_run` is unavailable. Fusion is currently opt-in-by-capability, not a
  measured win; treat it as scaffolding.

See [`benchmarks/README.md`](./benchmarks/README.md) for the protocol, the
method rules that make these numbers citable, and how to regenerate them.

The merge rule for a model-visible change — schema text, result text, an archive
chunk boundary, or a failure path that replaces a silent drop — is in
[`docs/quality-guard.md`](./docs/quality-guard.md).

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
