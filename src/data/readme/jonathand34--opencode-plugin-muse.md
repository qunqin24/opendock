# opencode-plugin-muse

Use a Muse Code subscription in [opencode](https://opencode.ai). Muse models appear in
the model picker as the `muse` provider, and requests go through the signed-in `muse`
CLI, so no Muse credential reaches opencode or your config.

Tested with Muse CLI 1.4.23 and opencode 2.3.2. Republished build of
[`@rasyid_rafi/opencode-muse`](https://www.npmjs.com/package/@rasyid_rafi/opencode-muse)
with two patches: [`CREDITS.md`](CREDITS.md) has the diff, `docs/provenance.md` the
build hash and what it does and does not prove.

Not affiliated with Meta or opencode. Best-effort maintenance by one person, with no
support commitment.

![opencode's model picker, showing Muse Ember under the Muse Code provider](https://raw.githubusercontent.com/jond34/opencode-plugin-muse/v0.1.12/media/opencode-model-picker.png)

## What it does

- registers the `muse` provider (labelled "Muse Code") with `muse-ember-1.0`,
  `muse-wonder-1.0`, `muse-spark-1.3`, and `muse-spark-1.2`, usable as a main or
  subagent model
- implements `LanguageModelV3`, translating opencode turns into Muse CLI sessions
- runs a loopback-only MCP server (`127.0.0.1`, random port, per-start bearer token)
  so Muse can call opencode's tools
- forwards `museAgent` and `museInstructions` options

Muse Code authenticates in its own CLI. Meta attests the Muse Code client: a subscription
covers requests that client makes, and `api.meta.ai` refuses requests carrying a
subscription key from anything else (`permission_error`,
`code: client_attestation_denied`). So the plugin drives the signed-in CLI (`muse serve`,
via `@muse-code/sdk`) instead of calling the model API itself. It never holds Muse
credentials, and the API key it reports to opencode is a placeholder that is never sent
to Muse.

## What a turn looks like

One turn end to end. opencode draws the model label, the latency, and the throughput
from the provider, so the line under the reply is the plugin reporting back:

![a hello turn answered by Muse Ember, showing 5.5s and 72.0 tok/s](https://raw.githubusercontent.com/jond34/opencode-plugin-muse/v0.1.12/media/opencode-turn.png)

## Install

```bash
opencode plugin add @jonathand34/opencode-plugin-muse
```

If that fails (some opencode builds currently error in their embedded installer with
`NpmInstallFailedError`), install the package yourself and point a plugin file at it,
which is what opencode loads:

```js
// ~/.config/opencode/plugins/muse.js
export { default } from "@jonathand34/opencode-plugin-muse";
```

Requirements: opencode 2.x (the plugin targets the V2 plugin API in
`@opencode/plugin`); Muse Code CLI 1.4.20 or newer, already logged in; Node >= 22 for
the build and bun >= 1.4.4 for the tests. Runtime dependencies are
`@ai-sdk/provider@3.0.8`, `@muse-code/sdk@1.4.15`, and `@opencode/plugin@2.2.7`.

If the CLI is missing or signed out, model discovery fails and the provider has no
models; the plugin logs `model discovery failed` with the reason.

## Verify the build

```bash
bash scripts/repro.sh
```

It installs from the committed lockfile, compiles, and compares the resulting `dist/`
against the hash recorded in `docs/provenance.md`. It prints `PASS` or exits non-zero.

```bash
npm run check:offline   # typecheck plus the offline test suite
```

`npm run check:offline` runs 32 tests that need no network or credentials. `bun test`
adds five suites (`tool-bridge`, `fork-live`, `model-live`, `conformance`, `restart-live`)
that spawn a real `muse serve` host: 38 tests in total, all needing a logged-in Muse Code
CLI. One reuses a tool result on the next turn; another resumes a session after its host
has been restarted.

Those live suites pass `contributorMode: "off"` for the same reason the plugin does.
The `empty` preset turns contributor mode on, which routes every model to its
`-contributor` variant, and `muse-ember-1.0` has none, so the model request fails with
`code: "modelError"` unless the flag is set.

## Verify the published package

The npm package is built and published by `.github/workflows/publish.yml` on
GitHub Actions, and every version carries a provenance attestation. After
installing, two checks tie the bytes you have to that workflow:

```bash
npm audit signatures          # registry signatures and attestations
```

To match the tarball against the attestation yourself, compare the two digests.
The registry reports base64, the attestation reports hex:

```bash
npm view @jonathand34/opencode-plugin-muse@0.1.10 dist.integrity

curl -sS -A npm/11.19.1 \
  "https://registry.npmjs.org/-/npm/v1/attestations/@jonathand34%2fopencode-plugin-muse@0.1.10" \
  | jq -r '.attestations[] | select(.predicateType=="https://slsa.dev/provenance/v1")
      | .bundle.dsseEnvelope.payload' \
  | base64 -d | jq -r '.subject[0].digest.sha512'
```

What the attestation establishes: the tarball was built by this repository's
`publish.yml` at `refs/heads/main` on a GitHub-hosted runner, and it names the
workflow run. That is SLSA Build Level 2 — it shows where the bytes came from,
not that they are free of bugs. The plugin never holds credentials; it drives
the signed-in `muse` CLI.

The attestation endpoint needs an npm-style `User-Agent`. A bare `curl` gets a
404.

## Layout

```text
src/        upstream source plus the two patches in docs/provenance.md
test/       upstream test suite
docs/       provenance record
evidence/   inputs for the reproduction check (diffs, measurements); repository only
scripts/    repro.sh, check.sh
```

## Licence

MIT, same as upstream. See `LICENSE` and `CREDITS.md`.
