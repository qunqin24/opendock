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
    { "package": "sol-opencode@0.1.3", "options": { "actionFusion": true, "observationPack": true } }
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

### Archive retention

Observation Pack writes archived tool results beneath `<data-home>/sol-opencode/observation-pack/objects/`.
An absolute `XDG_DATA_HOME` selects the data home when configured; otherwise the plugin uses the
platform default (`~/.local/share` on Linux, `~/Library/Application Support` on macOS, or
`%LOCALAPPDATA%` on Windows). Archive objects are kept indefinitely: the plugin does not expire or
garbage-collect them when a session ends, the session index changes, the plugin is disposed, or
OpenCode restarts. This includes objects that become orphaned from their session index. There is no
automatic size limit or built-in purge command, so archive storage can grow over time. Removing an
object file makes its archived text unavailable to `obs_recall`.

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
- `then_run` is exposed on `edit` and `write` with optional `shell`. Tests cover the allow, reject, failure, and blank paths.
- In the 2026-10-13 fixer sessions, neither of the two plugin-enabled models adopted `then_run`. The prompt only permitted chaining. Two other planned model lanes failed on quota.
- The explicit-instruction probe below measured adoption in both plugin runs. Each matched pair saved one provider round-trip. This is a small synthetic task on one model, not a broad adoption rate.

### Issue #27 residual probes (2026-10-20)

Both probes used OpenCode 2.0.27 and `opencode-zen/nemotron-3.5-lightning-free`. The raw captures are not committed. The fixture generator, prompts, and procedure are in [`benchmarks/probes/`](./benchmarks/probes/) and [`benchmarks/README.md`](./benchmarks/README.md).

#### Forced archive retrieval

The `neu` arm read a fresh 16,765-byte `BIG.txt`. The model made two separate checkpoint calls. It then retrieved the archived observation at offset 0. The prompt did not include the expected sentinel. Both runs completed `obs_recall`. An independent byte check confirmed that each `SENTINEL_OUT.txt` matched the 17-byte fixture value. Each run packed one object. `big_results` counts the large read and the recall result.

| rep | round-trips | billed ctx | avg/RT | peak | tail4 avg | output tokens | tool calls | >10 KiB results | recalls | objects | wall | exact file |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 5 | 48,805 | 9,761 | 12,146 | 10,599 | 439 | 5 | 2 | 1 | 1 | 44 s | yes |
| 2 | 12 | 163,278 | 13,606 | 17,007 | 16,574 | 591 | 13 | 2 | 1 | 1 | 44 s | yes |

Rep 2 first tried two invalid observation IDs. The run then retrieved the placeholder ID. The reported cost includes these failed calls and its extra file checks. The initial `cat` result in rep 1 showed the sentinel before the checkpoints. The model reported the archived ID after the checkpoints. The `obs_recall` call returned the sentinel line. The trace proves that the retrieval path completed. It does not prove that the model forgot the earlier value.

#### Action Fusion with an explicit instruction

Each pair used identical prompt bytes and a fresh copy of the same off-by-one fixture. The `off` arm ran the test in a separate shell call. The `neu` arm passed an object to `then_run`. Both edit results showed `[then_run:succeeded] PASS`. All four fixtures passed an independent `sh test_sum.sh` check after the run.

| rep | off RT | plugin RT | saved | off billed ctx | plugin billed ctx | off tool calls | plugin tool calls | `then_run` | test |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | 4 | 3 | 1 (25%) | 25,626 | 19,885 | 5 | 4 | succeeded | PASS |
| 2 | 4 | 3 | 1 (25%) | 25,898 | 19,902 | 5 | 4 | succeeded | PASS |

One `off` trace included a string-valued `then_run` field. It did not return a fusion-success marker. The test ran in a separate shell call. The small sample (n=2) and single model limit this result to the tested task.

### Issue #71: `then_run` adoption across models (2026-10-23)

This plugin-arm experiment varied model and prompt on the `v0.1.2` base (`origin/main` `52e3e58`) with OpenCode 2.0.32. It used two fresh, seeded fixtures for each model/prompt pair, a separate `XDG_DATA_HOME` per run, and `umask 0022`. Each fixture failed before the run with `expected 7, got 3`. The independent test passed after all 12 runs, and every `test_sum.sh` stayed unchanged. The three lanes returned the smoke response and loaded the plugin before the matrix.

The prompts are [`issue-71-p1.md`](./benchmarks/probes/issue-71-p1.md) (permissive) and [`issue-71-p2.md`](./benchmarks/probes/issue-71-p2.md) (explicit). P1 SHA-256: `e755b55bb7c00d5a521978928121e5c0301f10763eb0e714a170abd376b021f0`. P2 SHA-256: `540bc2a7acd2fb9bcfeb86d2c0b9d75ed12619433902c0c7d4a1089c0ea824bb`. Adoption counts only an edit/write result with `[then_run:succeeded]`. The model's final claim does not count as adoption.

| Model lane | P1 adopted (n=2) | P2 adopted (n=2) | First `then_run` attempt was an object |
|---|---:|---:|---|
| `opencode-zen/glm-5.3-flash-free` | 2/2 | 2/2 | P1 1/2, P2 2/2 |
| `opencode-zen/mimo-v2.6-flash-free` | 1/2 | 2/2 | P1 1/1 attempted, P2 2/2 |
| `opencode-zen/nemotron-3.5-lightning-free` | 0/2 | 2/2 | P1 0/0 attempted, P2 2/2 |
| **All lanes** | **3/6** | **6/6** | — |

P2 adoption was 2/2 for all three lanes. P1 adoption varied from 0/2 to 2/2. This small sample points to a prompt effect, but it does not establish a general model ranking.

In GLM P1 repetition 1, the first edit input supplied `then_run` as a string and omitted `oldString`. The host rejected that call with `then_run: Expected object`. A later object-shaped call succeeded. The exact runtime text `then_run must be an object with a command` appeared zero times.

Every P2 `then_run` attempt used an object on its first attempt. All 12 final test claims agreed with the independent test. P2 final responses also reported the `then_run` use shown in the trace. P1 did not ask for a `then_run` claim.

The tables below report every run. `shape errors` counts the exact runtime message above. `billed ctx` is input plus cache read/write. Output tokens are separate.

Wall time is runner elapsed time. This experiment used the plugin arm only. It does not measure savings against plugin-off.

| Run | Model | Adopted | Attempts | Shape errors | First attempt object | Independent test | Claim matches trace | Wall |
|---|---|---:|---:|---:|---|---|---|---:|
| P1-GLM-1 | GLM | yes | 2 | 0 | no | PASS | not asked | 18 s |
| P1-GLM-2 | GLM | yes | 1 | 0 | yes | PASS | not asked | 7 s |
| P2-GLM-1 | GLM | yes | 1 | 0 | yes | PASS | yes | 14 s |
| P2-GLM-2 | GLM | yes | 1 | 0 | yes | PASS | yes | 12 s |
| P1-MiMo-1 | MiMo | yes | 1 | 0 | yes | PASS | not asked | 43 s |
| P1-MiMo-2 | MiMo | no | 0 | 0 | — | PASS | not asked | 29 s |
| P2-MiMo-1 | MiMo | yes | 1 | 0 | yes | PASS | yes | 140 s |
| P2-MiMo-2 | MiMo | yes | 1 | 0 | yes | PASS | yes | 14 s |
| P1-Nemotron-1 | Nemotron | no | 0 | 0 | — | PASS | not asked | 22 s |
| P1-Nemotron-2 | Nemotron | no | 0 | 0 | — | PASS | not asked | 27 s |
| P2-Nemotron-1 | Nemotron | yes | 1 | 0 | yes | PASS | yes | 20 s |
| P2-Nemotron-2 | Nemotron | yes | 1 | 0 | yes | PASS | yes | 26 s |

| Run | Round-trips | Billed ctx | Avg/RT | Peak | Tail-4 avg | Output tokens | Tool calls |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1-GLM-1 | 3 | 17,130 | 5,710 | 5,917 | 5,710 | 149 | 4 |
| P1-GLM-2 | 2 | 11,199 | 5,600 | 5,742 | 5,600 | 84 | 3 |
| P2-GLM-1 | 2 | 11,285 | 5,642 | 5,778 | 5,642 | 110 | 3 |
| P2-GLM-2 | 2 | 11,195 | 5,598 | 5,688 | 5,598 | 165 | 2 |
| P1-MiMo-1 | 2 | 11,506 | 5,753 | 5,907 | 5,753 | 149 | 3 |
| P1-MiMo-2 | 3 | 17,506 | 5,835 | 5,999 | 5,835 | 113 | 4 |
| P2-MiMo-1 | 2 | 11,579 | 5,790 | 5,944 | 5,790 | 146 | 3 |
| P2-MiMo-2 | 2 | 11,579 | 5,790 | 5,944 | 5,790 | 146 | 3 |
| P1-Nemotron-1 | 4 | 27,872 | 6,968 | 7,802 | 6,968 | 503 | 5 |
| P1-Nemotron-2 | 5 | 36,147 | 7,229 | 8,101 | 7,452 | 581 | 6 |
| P2-Nemotron-1 | 3 | 20,246 | 6,749 | 7,194 | 6,749 | 423 | 4 |
| P2-Nemotron-2 | 3 | 20,218 | 6,739 | 7,180 | 6,739 | 339 | 4 |

The metric output matches `benchmarks/measure.py` for all 12 traces. The raw NDJSON captures remain outside the repository. See issue [#71](https://github.com/lucas-albers-lz4/SoL-OpenCode/issues/71) for the design and audit trail.

See [`benchmarks/README.md`](./benchmarks/README.md) for the protocol, the method rules that make these numbers citable, and how to regenerate them.

The merge rule for a model-visible change — schema text, result text, an archive
chunk boundary, or a failure path that replaces a silent drop — is in
[`docs/quality-guard.md`](./docs/quality-guard.md).

## Provenance

Portable algorithms are copied from SoL-Pi (MIT, NVIDIA copyright). Reference commit: `219568034fa54ed121ede80961655e33dfb9d0e3`.

Some fixes follow upstream pull requests that are not merged there yet; the [fork register](./docs/upstream-fork-register.md) names each one.

Where this port does not follow SoL-Pi, and why: [docs/upstream-fork-register.md](./docs/upstream-fork-register.md).

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
