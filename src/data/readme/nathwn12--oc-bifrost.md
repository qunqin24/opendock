# oc-bifrost

**Keep your V1-era OpenCode plugins running on OpenCode V2 — supported hooks bridge across, the rest refuse out loud.**

## Install

Add one entry to the `plugins` array in your `opencode.jsonc`. OpenCode fetches the package itself, so you run no install command:

```jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@latest",
      "options": {
        "plugins": ["github:obra/superpowers"],
        "trustRemote": true
      }
    }
  ]
}
```

Restart OpenCode after saving. On first run the bridge downloads the listed plugin snapshot, executes its entry file with your user rights, and prints a per-plugin mount report. You need OpenCode V2 already configured — find your config path with `opencode debug paths` before you edit. The npm route is the supported route and tracks `main` one to one; the git ref route currently fails host-side, so do not use it.

### Or let your AI install it

Paste this to your agent:

```text
Add "@nathwn12/oc-bifrost@1.6.5" to the plugins array in my OpenCode V2 opencode.jsonc with options {"plugins": ["github:obra/superpowers"], "trustRemote": true}. Restart OpenCode, then run `opencode plugin check` and `opencode plugin list`, and report the oc-bifrost mount lines plus any unsupported hooks.
```

### Wire it yourself

If you manage the config by hand, this is the smallest working entry — the offline preset, zero network:

```jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@latest",
      "options": { "plugins": ["preset:rtk"] }
    }
  ]
}
```

`preset:rtk` mounts the bundled fallback and needs the `rtk` binary (`>= 0.23.0`) on your `PATH` first.

### Offline or pinned

Pin the exact release instead of tracking latest:

```jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@1.6.5",
      "options": { "plugins": ["preset:rtk"] }
    }
  ]
}
```

`@1.6.5` equals the current npm `latest` tag. `preset:rtk` runs with zero network; a cold `github:` fetch needs network plus `trustRemote`.

## Use it

List each legacy plugin in `options.plugins` with exactly one specifier: `github:<owner>/<repo>[@<ref>][#<path>]`, `preset:rtk`, a local path, or a registry package. Park local V1 files in `legacy/`, never in a discovery directory (`plugin/` or `plugins/`), or the host rejects them before the bridge runs. Restart OpenCode, then verify with `opencode plugin check` followed by `opencode plugin list`. Read the mount report per hook: `full` means bridged, `partial` names what was lost, `unsupported` means refused. Set `strict: true` if you want an unsupported hook to abort setup instead of warning.

## What you get

- Shape-based routing: V1 factories and V1 modules bridge hook by hook; V2 `{id, setup}` definitions mount as-is; Effect-only definitions refuse out loud.
- An honest contract of 24 V1 hooks: 5 bridge fully, 10 bridge with a stated loss, 9 refuse by design.
- Four plugin sources: GitHub snapshot, registry package, local path, and the bundled `preset:rtk` fallback.
- Consent-gated fetching: a cold `github:` cache refuses until `trustRemote`, then pins the snapshot by commit and digest.
- A durable mount report on every load, mirrored to a file for hosts that discard stdout.

## Requirements

- OpenCode V2 (`opencode --version` reports `2.x`).
- Node 22 or later (`node --version`).
- The npm registry reachable for the first fetch; `preset:rtk` needs no network but needs the `rtk` binary on `PATH`.
- Peer `@opencode/plugin@2.0.30`, supplied by your host — you install nothing extra.

## Links

- Repository: <https://github.com/nathwn12/oc-bifrost>
- Package: <https://www.npmjs.com/package/@nathwn12/oc-bifrost>
- Compatibility matrix: <https://github.com/nathwn12/oc-bifrost/blob/main/src/compat-matrix.ts>
- Setup guide: [INSTALL.md](INSTALL.md)
- Verification record: [PROOF.md](PROOF.md)
