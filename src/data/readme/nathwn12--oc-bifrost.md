<div align="center">

# 🌈 oc-bifrost

**Run V1-era OpenCode plugin hooks on the OpenCode V2 runtime.**
*V2 hard-rejects them at load; this small plugin loads them anyway.*

[![npm](https://img.shields.io/npm/v/@nathwn12/oc-bifrost?label=npm&color=205EA6)](https://www.npmjs.com/package/@nathwn12/oc-bifrost) [![check](https://github.com/nathwn12/oc-bifrost/actions/workflows/ci.yml/badge.svg)](https://github.com/nathwn12/oc-bifrost/actions/workflows/ci.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-66800B.svg)](LICENSE) [![downloads](https://img.shields.io/npm/dm/@nathwn12/oc-bifrost)](https://www.npmjs.com/package/@nathwn12/oc-bifrost)

</div>

---

## ⚡ Quick start

OpenCode V2 intentionally broke the plugin API — a V1 module is hard-rejected at load:

> `Plugin must export a default definition with an id and an effect or setup function.`
> — `packages/core/src/plugin/module.ts`

The bridge is **one entry** in the `plugins` array of your `opencode.jsonc`; OpenCode resolves the package itself, so there is no separate install step.

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "@nathwn12/oc-bifrost@1.3.1",
      "options": {
        "trustRemote": true, // consent: the first `github:` fetch downloads and executes a remote plugin
        "plugins": ["github:obra/superpowers"]
      }
    }
  ]
}
```

Restart OpenCode. **That's the whole setup** — the mount report names what bridged and what was refused. Proof: [`PROOF.md`](PROOF.md), [`VERIFIED-PLUGINS.md`](VERIFIED-PLUGINS.md); agent-driven setup: [`INSTALL.md`](INSTALL.md).

### 🧭 What actually mounts — two paths

A module named in `options.plugins` is routed by its **shape**, and only the V1 shape is hook-translated:

- **V1 hook module** - a factory (a `default` async export, `{ server: factory }`, or any named function export - a `*Plugin` name is only the tie-breaker preference, `src/discover.ts`). Its hooks are translated one by one against the [compatibility matrix](#-compatibility-matrix) below.
- **V2-shaped definition** — an `export default` carrying `{ id, setup | effect }`. It mounts **as-is** with the host context, exactly as the host itself would have mounted it. A **dual-export** file that ships both a V1 named export *and* a V2 default (for example `obra/superpowers@v6.4.2`) takes this path: the V2 default is used and the V1 named export is left untouched — no hook translation is applied to it.

Sourcing is `github:` / a local path / a bundled `preset:` only. **npm and bare package names are refused** (`src/index.ts`); point at an installed copy by absolute path instead. And a plugin that needs one of the seven refused V1 hooks still needs a real port — the bridge will not fake it.

Name each legacy plugin with **exactly one** of three specifiers:

- **`github:<owner>/<repo>[@<ref>][#<path>]`** — **The advertised, default route — snapshot-first.** The ref resolves to a commit once, at first fetch (the default branch when no `@<ref>`), then the **repository tarball** is fetched from codeload **at that resolved commit** and materialized as a whole tree — sibling files exist beside the plugin entry, so `obra/superpowers` reads its own `skills/`. **Caps:** 16 MiB compressed · 64 MiB uncompressed · 5000 files. **Hostile archives are refused outright, never materialized** — path-traversal, absolute/`..` escapes, NUL/backslash names, duplicate paths; a link or device entry refuses the snapshot too. The old single-file fetch is the **loud fallback** for an over-cap, malformed, or candidate-less snapshot: the mount note names the loss — `sibling files are NOT available`, and a plugin that reads them by relative path is inert. Never a silent downgrade. No `#<path>` → `hooks/opencode/<repo>.ts`, `hooks/opencode/index.ts`, `plugin.ts`, `index.ts` are probed in order inside the tree, and a miss lists every path it tried.
- **A local path** — resolves against the session directory; park it in `legacy/`, never a discovery directory.
- **A bundled, zero-fetch fallback** — for offline / air-gapped hosts; documented in the fallback section below.

> **Version gate.** `github:` requires **oc-bifrost 0.4.0 or later**; releases **0.3.0 and below** cannot mount it — use the offline fallback or a local path there.

### 📌 Version choice & updates

- **Pin the exact version** — `"package": "@nathwn12/oc-bifrost@1.3.1"`. Predictable, and the version these docs describe.
- `@^1.0.0` auto-tracks 1.x and never adopts a new major silently.
- A bare `@nathwn12/oc-bifrost` or `@latest` may be unstable while OpenCode's plugin cache settles.
- **If an update does not appear:** run `opencode plugin check`; if it still does not, delete `~/.cache/opencode/npm/@nathwn12/oc-bifrost@latest` and reload.

---

## 🔐 Trust model

Mounting a `github:` plugin downloads the repository snapshot at the resolved commit and executes its entry file **in the host process, with your rights**. The sha256 recorded on first use pins those exact bytes — the tarball and the entry file alike — it does not vouch for them.

- **Cold cache refuses by default** — nothing is fetched or executed until you opt in, per bridge entry: `"trustRemote": true`, or `OC_BIFROST_TRUST=github` (an explicit `false` wins over the env var).
- **Warm, hash-verified cache** loads on its own: no re-consent, no network. A hash mismatch refuses loudly instead of running unverified bytes.
- **The mount report keeps consent informed** — one line naming the resolved commit, the `sha256` digest, the byte count, and that it executes with the host process's full user rights.
- **Offline or air-gapped** — the cold-cache fetch is fail-closed; pre-warm on a networked machine and copy the shared `oc-bifrost/github/v2/` cache across. It lives under `$XDG_CACHE_HOME/opencode/` or, by default, `~/.cache/opencode/`; snapshot trees materialize at `…/oc-bifrost/github/v2/<id>/tree/`. A flat pre-snapshot cache at `…/oc-bifrost/github/<id>/` is ignored with a warning (it cannot provide sibling files) and re-fetched with the same one-time consent.

---

## 🔌 Offline / no-fetch fallback — `preset:rtk` (optional)

**Optional; not the advertised route.** When GitHub is unreachable — an offline or air-gapped host — `preset:rtk` mounts a **bundled** V1 plugin (`vendor/rtk.ts`, verbatim `rtk-ai/rtk` `v0.50.0`, Apache-2.0) with **zero network**. It is opt-in, so nothing from RTK runs unless you ask for it.

```jsonc
{ "package": "@nathwn12/oc-bifrost@1.3.1", "options": { "plugins": ["preset:rtk"] } }
```

**Prerequisite:** the `rtk` binary (`>= 0.23.0`) on `PATH`; `preset:rtk` probes before mounting and names this command if it is missing. No winget? Take the release asset from [`rtk-ai/rtk`](https://github.com/rtk-ai/rtk/releases) instead. Not from crates.io — `cargo install rtk` installs a different project.

```sh
winget install rtk-ai.rtk        # Windows
brew install rtk                 # macOS / Linux
```

> ⚠️ **Do not run `rtk init -g --opencode`.** It writes `rtk.ts` into `~/.config/opencode/plugins/`, a discovery directory where V2 hard-rejects V1 modules. `preset:rtk` exists precisely so you never touch that path.

---

## 🧾 The mount report — and where to read it when stdout is gone

The per-plugin mount report is the proof surface: it names every hook that bridged (`full`), approximated (`partial`), or was refused (`unsupported`), plus each `github:` resolved commit and digest. It prints to the console (`verbose: true`, the default).

The host **discards stdout** when it runs as a **managed background service** or a **stdio server** — exactly the modes where nobody is watching a terminal — so the same lines are mirrored to a file:

- **Default:** `~/.cache/opencode/oc-bifrost/report.log` (or `$XDG_CACHE_HOME/opencode/oc-bifrost/report.log` when `XDG_CACHE_HOME` is set) — the same shared user cache `github:` artifacts live under.
- **Override:** `OC_BIFROST_REPORT=<path>` writes somewhere else; `OC_BIFROST_REPORT=off` disables the file.
- **Policy:** **append** across loads (a crashed or exited run is still readable), hard-capped at **256 KiB** — a write that would cross the cap rolls the file over so the newest report survives whole. Control characters are escaped before they reach disk; console behaviour is unchanged.

---

## 🚫 Never leave a V1 plugin in a discovery directory

V2 loads `.opencode/plugin/`, `.opencode/plugins/`, `<config>/plugin/`, and `<config>/plugins/` directly and hard-rejects the module before oc-bifrost can see it. Park legacy files in `legacy/` and reference them from `options.plugins`; the bridge also warns at load if it finds one stranded.

oc-bifrost bridges **hooks**, not a plugin's external dependencies: if a plugin shells out to a binary, that binary must exist on `PATH` or the plugin disables itself — correctly, and usually quietly. RTK in the offline fallback above is one example.

---

## 🧩 Compatibility matrix

The unit of compatibility is the **V1 hook**, not the plugin — once a hook is bridged, every plugin that uses it works untouched.

**6 🟢 full · 9 🟡 partial · 9 🔴 refused** — all 24 matrix rows (21 V1 hooks + 3 client-facade methods):

| V1 hook | Level | V2 destination |
|---|---|---|
| `tool.execute.before` | 🟢 full | `ctx.tool.hook("execute.before")` — mutation write-back verified |
| `shell.env` | 🟢 full | `ctx.shell.hook("create.before")` |
| `chat.headers` | 🟢 full | `ctx.session.hook("model.request")` |
| `permission.ask` | 🟢 full | `ctx.permission.hook("evaluate")` |
| `dispose` | 🟢 full | `setup` cleanup return |
| `tool.execute.after` | 🟡 partial | `ctx.tool.hook("execute.after")` — `title` ignored |
| `chat.params` | 🟡 partial | `ctx.session.hook("context")` |
| `chat.message` | 🟡 partial | `ctx.session.hook("prompt")` |
| `tool.definition` | 🟡 partial | `ctx.tool.transform` (apply-time snapshot) |
| `tool` | 🟡 partial | `ctx.tool.transform` editor.add |
| `event` | 🟡 partial | `ctx.event.subscribe()` - V2 `session.execution.succeeded\|failed\|interrupted` synthesised to the V1 `session.idle` envelope; other names/payloads pass through |
| `client.session.messages` | 🟡 partial | `ctx.session.context` — active context (post-compaction) only; the full transcript is HTTP-only |
| `experimental.chat.system.transform` | 🟡 partial | `ctx.session.hook("context")` |
| `experimental.chat.messages.transform` | 🟢 full | `ctx.session.hook("context")` — V1 `{info,parts}` envelope pre-fill + write-back |
| `experimental.session.compacting` | 🟡 partial | `ctx.session.hook("compaction")` |
| `client.session.children` | 🔴 refused | no plugin-scoped child listing in V2 (HTTP-only; the plugin context carries no server address) |
| `client.tui.showToast` | 🔴 refused | `tui.toast.show` is a TUI-process event; no server-plugin toast surface |
| `config` | 🔴 refused | per-domain transforms with different semantics |
| `auth` | 🔴 refused | `ctx.integration.transform` + integration APIs |
| `provider` | 🔴 refused | `ctx.provider.transform` / `ctx.model.transform` |
| `command.execute.before` | 🔴 refused | no one-to-one global V2 hook |
| `experimental.provider.small_model` | 🔴 refused | no V2 equivalent |
| `experimental.compaction.autocontinue` | 🔴 refused | no V2 equivalent |
| `experimental.text.complete` | 🔴 refused | no V2 equivalent |

**No hook is ever dropped silently.** Refused hooks warn at load, or abort under `strict: true`. The single source of truth is [`src/compat-matrix.ts`](src/compat-matrix.ts), and every row names the test that proves it.

---

## 🙏 Honest bounds

This bridges **the mappable subset**, not "any plugin, seamlessly." Nine of the twenty-four matrix rows are refused out loud (seven V1 hooks and two facade calls): no faithful V2 destination exists for their semantics, and no compatibility layer can invent one. Plugins that depend on those need a real port. The refusal list is the product being honest — and it is the contract.

---

## ⚙️ Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `plugins` | `Array<string \| { spec, options }>` | `[]` | Specifiers to bridge — `github:`, a local path, or the bundled offline fallback (`preset:`) |
| `trustRemote` | `boolean` | `false` | Consent to fetch + execute a `github:` plugin on a cold cache |
| `strict` | `boolean` | `false` | Abort setup on an unsupported or unmountable hook |
| `verbose` | `boolean` | `true` | Print the per-plugin compatibility report |
| `freshness` | `"off" \| "online"` | `"off"` | Check the bundled pin against upstream's latest release after mounting |

`freshness: "online"` (or `OC_BIFROST_FRESHNESS=online`) is off by default, never downloads or executes plugin code, fires off the load path, and reports `unknown` — not an error — when offline or rate-limited.

The durable report file (see above) is controlled by the `OC_BIFROST_REPORT` environment variable, not an option: it defaults to the shared OpenCode cache and can be redirected to a path or disabled with `off`.

---

## 🛠 Develop

```sh
npm install
npm run check      # typecheck + build + tests
```

## Contributing

Two doors, both gated on proof:
- **Add hook coverage** — edit `src/compat-matrix.ts`, implement the bridge, add the test its row names.
- **Add a verified plugin** — smoke-test it and add a row to [`VERIFIED-PLUGINS.md`](VERIFIED-PLUGINS.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
