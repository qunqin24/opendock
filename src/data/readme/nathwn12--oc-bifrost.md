<p align="center">
  <img src="assets/icon.svg" width="120" height="120" alt="oc-bifrost icon" />
</p>
<h1 align="center">oc-bifrost</h1>
<p align="center"><strong>Run V1-era OpenCode plugin hooks on the OpenCode V2 runtime — unmapped hooks are refused loudly, never silently dropped.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-bifrost" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-bifrost" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## Project name and description

oc-bifrost is an OpenCode plugin — a compatibility bridge for anyone still running legacy plugins. OpenCode V2 hard-rejects a V1 module at load (`Plugin must export a default definition with an id and an effect or setup function`); this small plugin loads those modules anyway and translates each V1 hook against a compatibility matrix. It is published as `@nathwn12/oc-bifrost` — these docs describe `1.6.5` — and needs Node 22 or later on the host.

OpenCode V2 intentionally broke the V1 plugin API, stranding every V1-era plugin. oc-bifrost exists so the mappable subset keeps working untouched: one entry in the `plugins` array of `opencode.jsonc`, no fork of each legacy plugin. It bridges only what has a faithful V2 destination and refuses the rest out loud — nine of the twenty-four matrix rows are refused by design, and a plugin that depends on those needs a real port.

## Technology stack

| Layer | Version |
|---|---|
| Language | TypeScript (`typescript` `^5.6.0`, dev-only) |
| Runtime | Node `>= 22` |
| Host API | `@opencode/plugin` `2.0.30` (peer — supplied by the host, never bundled) |
| V1 types | `@opencode-ai/plugin` `^1.19.2` (dev-only) |
| Test runner | Node's built-in runner (`node --test test/*.test.js`) |
| Runtime dependencies | none — `package.json` carries no `dependencies` field |

## Architecture

Modules route by shape at discovery (`src/discover.ts`): a V1 factory or V1 module is bridged hook by hook (`src/hooks.ts`), with the V1 `PluginInput` facade (`src/context.ts`: `client`, `project`, `$`) and a shell facade spawned with no shell (`src/shell.ts`); a V2 `{id, setup}` definition mounts as-is with the live host context; an Effect-only `{id, effect}` definition is refused out loud. `src/compat-matrix.ts` is the contract — one row per V1 hook with its level and proving test — and `src/report.ts` plus `src/sink.ts` form the honesty layer: every bridged, approximated, and refused row is reported at load and mirrored to a durable file. Plugin bytes arrive over four paths: snapshot-first GitHub fetch into a hash-verified cache (`src/github.ts`, `src/archive.ts`), registry install into a bridge-owned cache (`src/registry.ts`, `src/provision.ts`), local path, or the vendored `preset:rtk` (`src/preset.ts`, `vendor/`).

## Getting started

1. Confirm the host is OpenCode V2 (`opencode --version` should report `2.x`) and find the config path in use with `opencode debug paths` — never assume the default location.
2. Add the bridge entry to the `plugins` array in `opencode.jsonc` (OpenCode resolves the package itself, so there is no separate install step):
```jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@1.6.5",
      "options": {
        "trustRemote": true, // consent: the first `github:` fetch downloads and executes a remote plugin
        "plugins": ["github:obra/superpowers"]
      }
    }
  ]
}
```
3. Park any local legacy plugin in `legacy/`, never in a discovery directory (`plugin/`, `plugins/`): V2 loads those directly and hard-rejects the module before the bridge can see it.
4. Restart OpenCode.
5. Verify with `opencode plugin check`, then `opencode plugin list` (shows what actually loaded).
6. If an update does not appear, delete the `~/.cache/opencode/npm/@nathwn12/oc-bifrost@latest` directory and reload.

> [!NOTE]
> The full agent-first setup — the three mount paths, the consent gate, verification, and rollback — lives in [INSTALL.md](INSTALL.md). Every version pin there equals the manifest version.

Name each legacy plugin with exactly one specifier in `options.plugins`: `github:<owner>/<repo>[@<ref>][#<path>]` (the advertised default route), a registry package, a local path, or the bundled `preset:rtk` for offline hosts:

```jsonc
{ "package": "@nathwn12/oc-bifrost@1.6.5", "options": { "plugins": ["preset:rtk"] } }
```

On load the bridge prints a per-plugin mount report naming every hook that bridged (`full`), was approximated (`partial`), or was refused (`unsupported`), plus each `github:` resolved commit and digest; the same lines are mirrored to `~/.cache/opencode/oc-bifrost/report.log` (`$XDG_CACHE_HOME` when set, `OC_BIFROST_REPORT=<path>` to redirect, `off` to disable). The remaining options are `strict` (default `false`: abort setup on an unsupported or unmountable hook), `verbose` (default `true`: print the report), `freshness` (`off` / `online`: opt-in pin-vs-upstream check, never downloads plugin code), `provision` (`host` / `npm` / `off`: how a fetched snapshot's declared dependencies are provided), and `wireTui` (default `false`: opt-in TUI wiring for a mounted snapshot). A plugin's external prerequisites are not the bridge's job: if it shells out to a binary, that binary must exist on `PATH`, and a `github:` fetch carries no npm dependencies.

Prerequisites: Node 22 or later, npm.

```sh
npm install
npm run check      # typecheck + compile + tests
```

`npm run check` is `typecheck && compile && test`; `dist/` is committed, so rebuild with `npm run compile` and commit the output with the source change.

## Project structure

| Path | Job |
|---|---|
| `src/index.ts` | Plugin entry; loads and mounts each entry |
| `src/discover.ts` | Recognises V1 factory / V1 module / V2 definition |
| `src/hooks.ts` | V1 hook → V2 registration translation |
| `src/context.ts` | V1 `PluginInput` facade (`client`, `project`, `$`) |
| `src/shell.ts` | Shell facade over the host runtime, spawned with no shell |
| `src/github.ts` / `src/archive.ts` | `github:` sourcing: snapshot-first fetch into a hash-verified cache |
| `src/registry.ts` / `src/provision.ts` | Registry sourcing: installs the package into a bridge-owned cache |
| `src/preset.ts` | Bundled offline fallback (`preset:rtk`) |
| `src/compat-matrix.ts` | The contract: one row per V1 hook with `level` and proving test |
| `src/report.ts` / `src/sink.ts` | The honesty layer — full/partial/refused reporting, durable mirror |
| `test/` | Node test runner; imports from `dist/` |
| `vendor/` | Vendored third-party code, byte-identical to upstream (see `vendor/README.md`) |
| `docs/` | Design specs and plans |
| `dist/` | Committed build output; regenerated by `npm run compile`, must stay in sync with `src/` |
| `index.ts` | Repo-root re-export of the plugin entry for path-based loading |

## Key features

- Shape-based routing: V1 hook factories are translated hook by hook; V2 `{id, setup}` definitions (including dual-export files that ship both) mount as-is with the host context, while Effect-only `{id, effect}` definitions are refused out loud for direct host mounting.
- Snapshot-first `github:` sourcing: the ref resolves to a commit once at first fetch, then the whole repository tree is materialized so sibling files work; hostile archives are refused outright, never materialized.
- Registry sourcing: bare names (`oc-todo`, `pkg@1.2.0`, `@scope/pkg@^1.0.0`) and `npm:` / `pnpm:` / `bun:` prefixed forms install into a bifrost-owned cache and mount whatever they resolve to, V1 or `{id, setup}` V2.
- Bundled offline fallback `preset:rtk` (verbatim `rtk-ai/rtk` `v0.50.0`, Apache-2.0) with zero network; it probes for the `rtk` binary (`>= 0.23.0`) on `PATH` before mounting.
- Honest compatibility contract: 5 full, 10 partial, 9 refused over all 24 matrix rows (`src/compat-matrix.ts` is the single source of truth); refused hooks warn at load or abort under `strict: true`.
- Consent-gated fetching: a cold-cache `github:` fetch refuses by default until `trustRemote: true` (or `OC_BIFROST_TRUST=github`); a warm, hash-verified cache loads with no network and no re-consent.
- Durable mount report: the per-plugin bridged / approximated / refused rows print to the console and are mirrored to an append-capped file for hosts that discard stdout.
- Stranded-file warning when a V1 file sits in a V2 discovery directory, where the host rejects it before the bridge can run.

## Development workflow

Branch as `<type>/<slug>`, land only through a pull request, squash-merge, then delete the branch. Commit subjects are conventional (`docs:`, `fix(scope):`, `chore(scope):`, `chore(release):`) and every PR lands as one logical change. `npm run check` must be green before review. Keep `CHANGELOG.md`, `INSTALL.md`, and the docs current with every change. Releases track `main` 1:1 — every fix lands on `main` and ships as the next patch, cut by pushing an annotated tag `v<version>`; the release workflow fails unless the tag equals the `package.json` version.

## Coding standards

The matrix is the contract: if the docs disagree with it, the matrix wins. Never claim `full` without a test that exercises the write-back; a `partial` row must state what is lost; refusing a hook is a valid contribution, faking one is not. Verify against the host source and cite by `file:line`. No new runtime dependencies without a reason stated in the PR body. Guardrails: no npm script named `install`, `postinstall`, `preinstall`, `build`, `prepare`, or `prepack`; every version pin in `INSTALL.md` must equal the manifest version; never edit the vendored `vendor/` tree by hand — refresh it only through `npm run vendor:update`.

## Testing

Tests live in `test/*.test.js` and import from `dist/`, so compile before running; the gate is `npm run check` (typecheck + compile + tests, currently green). Each compat-matrix row names the exact test that proves it. Live end-to-end evidence — real hosts, real plugins, decidable artifacts — is recorded in [PROOF.md](PROOF.md), and the per-plugin verdict table in [VERIFIED-PLUGINS.md](VERIFIED-PLUGINS.md) says which mounting route each row exercised.

## Contributing

Two doors, both gated on proof — see [AGENTS.md](AGENTS.md) for the working contract and [CONTRIBUTING.md](CONTRIBUTING.md) for the steps. To add hook coverage: change the matrix row, implement the bridge (or the refusal), add the named test, keep `npm run check` green. To add a verified plugin: load it through oc-bifrost on OpenCode V2 and add a row stating the plugin version, the route exercised, the hooks registered, and the command you ran.

Deeper docs:

- [INSTALL.md](INSTALL.md) — agent-first setup: the three mount paths, the consent gate, verification, and rollback.
- [PROOF.md](PROOF.md) — the verification record behind every claim above.
- [VERIFIED-PLUGINS.md](VERIFIED-PLUGINS.md) — plugins smoke-tested against oc-bifrost on OpenCode V2, with the route each row exercised.
- [CHANGELOG.md](CHANGELOG.md) — per-release changelog.
- [src/compat-matrix.ts](https://github.com/nathwn12/oc-bifrost/blob/main/src/compat-matrix.ts) — the single source of truth for the compatibility matrix; every row names the test that proves it.

## License

MIT — see [LICENSE](LICENSE).

## Credits

Bundles `rtk-ai/rtk` (`hooks/opencode/rtk.ts` @ `v0.50.0`, Apache-2.0) verbatim as the `preset:rtk` fallback — byte-identical, full text in `vendor/rtk-LICENSE`. This project is not affiliated with `rtk-ai/rtk`; see [vendor/README.md](vendor/README.md) for provenance.

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
