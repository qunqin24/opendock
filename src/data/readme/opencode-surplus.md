# opencode-surplus

`opencode-surplus` is a Surplus provider integration for OpenCode. It keeps a
credential-free local copy of the public Surplus model inventory and exposes
only the exact models selected in your OpenCode provider configuration.

It supports:

- OpenCode V1 `>=1.18.29`
- the current OpenCode V2 plugin API
- one shared runtime-neutral inventory core with thin V1 and V2 adapters
- rich Surplus catalog metadata in V2 and a compatible down-map in V1
- cache-first startup with a one-hour refresh TTL and a manual refresh command

## Public beta

The first beta is `0.3.0-beta.1`. Pin it in your OpenCode config:

```jsonc
// V2
{ "plugins": ["opencode-surplus@0.3.0-beta.1"] }
// V1
{ "plugin": ["opencode-surplus@0.3.0-beta.1"] }
```

Install the CLI with `npm install --global opencode-surplus@beta` after the
beta is published. Beta releases use the `beta` distribution tag, not `latest`.
Use a test project for initial setup; this release changes provider configuration
when you confirm setup or model selections.

## Select models

Discovery never exposes every model automatically. Add the exact Surplus model
IDs you want to use.

### OpenCode V1

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-surplus"],
  "provider": {
    "surplus": {
      "models": {
        "deepseek-v4-flash": {},
        "minimax-m2.1": {
          "name": "MiniMax M2.1 (my label)"
        }
      }
    }
  }
}
```

### OpenCode V2

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-surplus"],
  "providers": {
    "surplus": {
      "models": {
        "deepseek-v4-flash": {},
        "minimax-m2.1": {}
      }
    }
  }
}
```

An empty `models` map intentionally leaves the Surplus provider loaded with
zero models. A model missing from a valid catalog is hidden and logged. Manual
model metadata wins over catalog metadata when both define the same property.

### Interactive model picker

The V2 TUI exposes **Select Surplus models** in the command palette and through
the `/surplus-models` slash command. It refreshes the public Surplus catalog,
provides searchable model names and IDs, supports multi-selection, and writes
the exact selection to the active project's `providers.surplus.models` map.
Cancel leaves the configuration unchanged; confirming with no models writes an
empty map.

For V1, use the version-neutral CLI picker. It uses the V1 native
`provider.surplus.models` map when the V1 config is detected:

```bash
opencode-surplus pick --version=v1
```

Use `--version=v2` to force the V2 config shape. The picker never stores or
requests an inference API key; catalog discovery remains public.

## Connect an API key and configure the provider

OpenCode owns the Surplus API key; the plugin never reads, stores, or logs it.
Catalog discovery is public and never sends the key.

**V2:** the plugin registers **Surplus Intelligence** with OpenCode's credential
flow. Run `/connect`, choose Surplus Intelligence, and paste your key. OpenCode
stores it and sends it as a bearer token on inference requests. Alternatively,
export `SURPLUS_API_KEY` before starting OpenCode. Surplus models appear in
`/models` only once a key is connected or the variable is set.

**V1:** export `SURPLUS_API_KEY`. The plugin declares it as the provider's
credential variable.

To set the endpoint, request headers, or other provider settings, run
`/surplus-setup` in the V2 TUI or use the CLI:

The TUI edits headers and settings as JSON objects. For example, enter
`{"Content-Type":"application/json; charset=utf-8","X-Team":"core"}`
in the headers field. Removing an entry removes it from the saved config;
clearing the headers or settings field resets that object. Clearing the endpoint
field removes the endpoint override. Your model selection remains unchanged.

```bash
opencode-surplus setup \
  --base-url=https://api.surplusintelligence.ai/v1 \
  --header="X-Team: core" \
  --setting=timeout=600000
```

`--header` and `--setting` may be repeated. Setting values are parsed as JSON
when possible. CLI flags update only the supplied settings and headers, and an
empty header value (`--header="X-Team:"`) removes that header. Fresh CLI setup
defaults to V2; detected V1 configs stay V1. Use `--version=v1` or `--version=v2`
to choose explicitly. Setup writes V2 `providers.surplus.settings`/`headers` or V1
`provider.surplus.options`, keeps your model selection, and adds
`env: ["SURPLUS_API_KEY"]` if no credential variables are already declared.
It refuses literal `apiKey` settings and `Authorization`-style headers, including
those nested in settings objects or arrays. Use an `{env:NAME}` reference if you
need to point at another variable. Validation errors never echo credential values.

## Endpoint and policy overrides

The default catalog endpoint is:

```text
https://api.surplusintelligence.ai/v1/models
```

The integration owns the Surplus provider defaults. Explicit endpoint settings
are retained for local proxies and testing:

- V1: `provider.surplus.options.baseURL`
- V2: `providers.surplus.settings.baseURL`

Advanced plugin options can change the cache TTL. V1 uses a tuple and V2 uses
an object:

```jsonc
// V1
{ "plugin": [["opencode-surplus", { "ttlHours": 6 }]] }

// V2
{ "plugins": [{ "package": "opencode-surplus", "options": { "ttlHours": 6 } }] }
```

The supported options are `ttlHours`, `ttlMs`, `endpoint`, and `cacheDir`.
The last two are intended for proxies, tests, and isolated environments.

## Cache and refresh behavior

The adapters share this cache:

```text
~/.cache/opencode/surplus-models.json
```

`XDG_CACHE_HOME` is honored. The cache is versioned, scoped to the normalized
Surplus endpoint, contains no credentials, and is written atomically. The
upstream fork's legacy `models-surplus.json` cache is imported opportunistically
and never written again.

At startup the integration loads a last-known-good inventory first. A fresh
cache avoids a request. A stale cache is used immediately while one bounded
10-second refresh runs in the background. A cache miss makes one bounded request
so the first session can be populated. There are no startup retries or
permanent interval timers.

Only a valid, non-empty catalog replaces the inventory. Empty, malformed, and
failed responses retain the last-known-good inventory. The V2 adapter reloads
the provider registry after a successful background refresh; V1 uses the fresh
cache on the next startup.

## Security and dependency monitoring

Picker and cache saves stage an exclusively opened file under an unpredictable,
private sibling directory, then atomically rename it into place. On POSIX
systems, writes reject destination paths that traverse group- or world-writable
directories unless sticky-directory ownership protects the temporary entry. On
Windows, the integration rejects untrusted permissions that can replace path
ancestors or modify the destination's children, and fails closed if ACL
inspection is unavailable. Create-only permissions on ancestors and inherit-only
rules that do not apply to those ancestors are not treated as replacement rights.
The checks use built-in Windows PowerShell with a 60-second timeout per operation;
cold startup can make saves slower on Windows. Existing
POSIX permission bits are applied to the staged file before replacement;
existing Windows file ACLs are copied before replacement. New configs use
owner-only permissions (`0600` on POSIX, with a restricted Windows ACL). If
staging or permission preparation fails, the existing config remains untouched.
Windows replacements refuse files whose owner differs from the staged file's
owner, rather than silently changing ownership. Hard-link staging preserves the
prepared ACL when moving into the destination directory; filesystems without
hard-link support fail before replacement.

The full normalized endpoint, including its path and query, determines cache
identity so separate proxies cannot share an inventory. Cache metadata and logs
contain the origin and an opaque fingerprint, not the configured path, query,
user information, or fragment. When loading an older canonical cache with a raw
path, the integration keeps its inventory available and attempts a secure
rewrite. If rewriting fails, it warns that the old disk cache may still contain
endpoint details. Remove `surplus-models.json` from the configured cache
directory (or `~/.cache/opencode/`) manually if the warning persists. Remove
any other old cache files from former cache directories manually; the
integration does not scan or rewrite caches it never loads.

CI checks both production and full dependency audits. As checked on 2026-10-05,
the beta build lock reports zero vulnerabilities in both. Updating the V2
development host to `@opencode/plugin@2.0.22` and refreshing its transitive
dependencies removed the previous OpenTelemetry and HTTP cache advisories.
The compatibility matrix also tests the older `2.0.11` API using a separate
development installation; it is not the beta's source-build lock. Host peer
dependencies remain optional and are supplied by OpenCode. A separate `latest`
matrix lane tracks new host releases alongside the support floor and pinned beta
build versions.

## CLI

After installing the package, use the version-neutral CLI:

```bash
opencode-surplus list
opencode-surplus refresh
opencode-surplus pick [--version=v1|v2]
opencode-surplus setup [--base-url=URL] [--header="Name: value"] [--setting=key=value] [--version=v1|v2]
```

`list` shows the cached inventory and marks selected IDs. `refresh` performs one
public catalog request and updates the shared cache. `pick` opens a searchable
terminal picker, refreshes the catalog, and writes the selected native model
map to the active project config. The CLI reads the normal global/project
OpenCode config hierarchy; pass `--cache-dir=/path` to isolate its cache.
`setup` writes provider settings as described above. None of these commands
requires an API key.

## Development

```bash
npm install
npm run typecheck
npm run typecheck:test
npm test
npm run build
```

The repository also includes a minimal `Dockerfile` for running the test suite
without installing host dependencies:

```bash
docker build -t opencode-surplus-test .
docker run --rm opencode-surplus-test
```

## License and attribution

This modified fork is licensed under the GNU General Public License v3.0-only.
It is forked from
[`lprzychodzien/opencode-persistent-model-discovery`](https://github.com/lprzychodzien/opencode-persistent-model-discovery).
The upstream Git history and author attribution are retained.
The required upstream copyright and MIT permission notice is preserved in
`THIRD_PARTY_NOTICES.md`. It is an attribution notice, not a change to the
GPL-3.0-only project license.

Each npm tarball includes the matching TypeScript source, tests, build scripts,
TypeScript configuration, and `source-lock.json`. Source availability does not
depend on access to the GitHub repository. To reproduce the build from an
extracted package with Node.js 22 or newer:

```bash
cp source-lock.json package-lock.json
npm ci
npm run typecheck
npm run typecheck:test
npm test
npm run build
```

`source-lock.json` is generated from the release's `package-lock.json` during
packing because npm excludes the usual lockfile name from published packages.
The package check verifies that matching source is included and local agent
files are excluded. Release maintainers run `npm run check:package` before
publishing a beta with `npm publish --tag beta --access public`.
