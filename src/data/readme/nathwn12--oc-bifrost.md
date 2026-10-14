<p align="center">
  <img src="assets/icon.svg" width="128" height="128" alt="oc-bifrost icon" />
</p>
<h1 align="center">oc-bifrost</h1>
<p align="center"><strong>Run V1-era OpenCode plugin hooks on the OpenCode V2 runtime. V2 hard-rejects them at load; this small plugin loads them anyway.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-bifrost" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-bifrost" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## What it is

oc-bifrost is an OpenCode plugin that runs V1-era plugin hooks on the OpenCode V2 runtime, which otherwise hard-rejects a V1 module at load (`Plugin must export a default definition with an id and an effect or setup function`). Each named module is routed by shape: V1 hook modules get their hooks translated one by one against the compatibility matrix, while V2-shaped definitions mount as-is, exactly as the host would mount them. Plugins are sourced from GitHub (the snapshot-first `github:` route), the npm registry, a local path, or a bundled offline fallback (`preset:rtk`). It is published as `@nathwn12/oc-bifrost` — these docs describe `1.6.4` — and needs Node 22 or later on the host.

## Why

OpenCode V2 intentionally broke the V1 plugin API, stranding every V1-era plugin. oc-bifrost exists so the mappable subset keeps working untouched: one entry in the `plugins` array of `opencode.jsonc`, no fork of each legacy plugin. It bridges only what has a faithful V2 destination and refuses the rest out loud instead of silently dropping it — nine of the twenty-four matrix rows are refused by design, and a plugin that depends on those needs a real port.

## Features

- Shape-based routing: V1 hook factories are translated hook by hook; V2 definitions (including dual-export files that ship both) mount as-is with the host context.
- Snapshot-first `github:` sourcing: the ref resolves to a commit once at first fetch, then the whole repository tree is materialized so sibling files work; hostile archives are refused outright, never materialized.
- Registry sourcing: bare names (`oc-todo`, `pkg@1.2.0`, `@scope/pkg@^1.0.0`) and `npm:` / `pnpm:` / `bun:` prefixed forms install into a bifrost-owned cache and mount whatever they resolve to, V1 or V2.
- Bundled offline fallback `preset:rtk` (verbatim `rtk-ai/rtk` `v0.50.0`, Apache-2.0) with zero network; it probes for the `rtk` binary (`>= 0.23.0`) on `PATH` before mounting.
- Honest compatibility contract: 6 full, 9 partial, 9 refused over all 24 matrix rows (`src/compat-matrix.ts` is the single source of truth); refused hooks warn at load or abort under `strict: true`.
- Consent-gated fetching: a cold-cache `github:` fetch refuses by default until `trustRemote: true` (or `OC_BIFROST_TRUST=github`); a warm, hash-verified cache loads with no network and no re-consent.
- Durable mount report: the per-plugin bridged / approximated / refused rows print to the console and are mirrored to an append-capped file for hosts that discard stdout.
- Stranded-file warning when a V1 file sits in a V2 discovery directory, where the host rejects it before the bridge can run.

## Install

1. Confirm the host is OpenCode V2 (`opencode --version` should report `2.x`) and find the config path in use with `opencode debug paths` — never assume the default location.
2. Add the bridge entry to the `plugins` array in `opencode.jsonc` (OpenCode resolves the package itself, so there is no separate install step):
```jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@1.6.4",
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

## Usage

Name each legacy plugin with exactly one specifier in `options.plugins`: `github:<owner>/<repo>[@<ref>][#<path>]` (the advertised default route), a registry package, a local path, or the bundled `preset:rtk` for offline hosts:
```jsonc
{ "package": "@nathwn12/oc-bifrost@1.6.4", "options": { "plugins": ["preset:rtk"] } }
```
On load the bridge prints a per-plugin mount report naming every hook that bridged (`full`), was approximated (`partial`), or was refused (`unsupported`), plus each `github:` resolved commit and digest; the same lines are mirrored to `~/.cache/opencode/oc-bifrost/report.log` (`$XDG_CACHE_HOME` when set, `OC_BIFROST_REPORT=<path>` to redirect, `off` to disable). The remaining options are `strict` (default `false`: abort setup on an unsupported or unmountable hook), `verbose` (default `true`: print the report), `freshness` (`off` / `online`: opt-in pin-vs-upstream check, never downloads plugin code), `provision` (`host` / `npm` / `off`: how a fetched snapshot's declared dependencies are provided), and `wireTui` (default `false`: opt-in TUI wiring for a mounted snapshot). A plugin's external prerequisites are not the bridge's job: if it shells out to a binary, that binary must exist on `PATH`, and a `github:` fetch carries no npm dependencies.

## Build from source

Prerequisites: Node 22 or later, npm.
```sh
npm install
npm run check      # typecheck + compile + tests
```

## Docs

- [INSTALL.md](INSTALL.md) — agent-first setup: the three mount paths, the consent gate, verification, and rollback.
- [PROOF.md](PROOF.md) — the verification record behind every claim above.
- [VERIFIED-PLUGINS.md](VERIFIED-PLUGINS.md) — plugins smoke-tested against oc-bifrost on OpenCode V2, with the route each row exercised.
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add hook coverage or a verified plugin; both doors are gated on proof.
- [src/compat-matrix.ts](https://github.com/nathwn12/oc-bifrost/blob/main/src/compat-matrix.ts) — the single source of truth for the compatibility matrix; every row names the test that proves it (the published package ships the built `dist/compat-matrix.js`).

## Status

**Unverified** — as-is, use at your own risk.
Behavior on OpenCode releases newer than the ones recorded in PROOF.md is unverified.

## License

MIT — see [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
