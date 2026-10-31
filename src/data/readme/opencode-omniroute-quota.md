# opencode-omniroute-quota

An OpenCode TUI plugin that shows OmniRoute account quotas in the session sidebar. Open the details panel to inspect individual quotas, usage and reset times.

## Requirements

- OpenCode 2.1.0. The plugin targets its V2 TUI plugin API.
- An OmniRoute server and a key authorized to access its usage endpoint.
- Bun for building the plugin from source or packing it for npm.

## Installation

Add the following entry to `~/.config/opencode/cli.json`:

```json
{
  "plugins": [
    {
      "package": "opencode-omniroute-quota",
      "options": {
        "baseUrl": "https://omniroute.example.com",
        "apiKey": "{env:OMNIROUTE_API_KEY}",
        "pinnedProvider": "codex",
        "start-closed": true
      }
    }
  ]
}
```

Set `OMNIROUTE_API_KEY` in the environment of the process that starts the OpenCode TUI. The plugin resolves environment references in the TUI process, not the server process. Avoid putting the key directly in configuration. You can also omit `apiKey` and use `OMNIROUTE_API_KEY` automatically.

### Run from a local checkout

Install dependencies and build the plugin in the checkout:

```sh
bun install --frozen-lockfile
bun run build
```

Use a `file://` URL pointing to the absolute path of the checkout instead of the package name in the configuration above. For example, `file:///absolute/path/to/opencode-omniroute-quota`. Set the API key in the TUI process environment before starting OpenCode.

## Options

Click `⚙️ Quota` to expand or collapse the section. The collapsed view summarizes the first provider; the expanded view shows account quotas and the last successful fetch time. Unknown values show `?`, and unlimited quotas show `∞`.

### Sidebar styles

These fictional examples show a 32-column sidebar. Colors come from the active
theme and are not shown in the plaintext previews. Account labels are masked.

#### `bar-style` (default)

```json
{ "options": { "style": "bar-style" } }
```

```text
▼ ⚙️ Quota · Updated 12:34:56
CODEX
#1  demo****01
  5h ████████████▒░░░░░░░    61%
  7d ███████████████████▒    95%
────────────────────────────────
#2  prod****02
  7d ███████████████████▒    95%
/omni-quota — details
```

The shaded bars use `░`, `▒`, `▓`, and `█`. The second account has no 5h row.

#### `percents-only-style`

```json
{ "options": { "style": "percents-only-style" } }
```

```text
▼ ⚙️ Quota · Updated 12:34:56
CODEX
#  ACCOUNT             5h     7d
#1 demo****01         61%    95%
────────────────────────────────
#2 prod****02                95%
/omni-quota — details
```

The second account's 5h cell is blank. If no account in a provider group has
a 5h window, the table omits the entire 5h column.

#### Collapsed preview

Both styles use the same collapsed header. Its separators use the theme's muted color:

```text
▶ ⚙️ · CODEX · 61% · 95%
```

All options belong in the plugin entry's `options` object.

| Option | Default | Description |
| --- | --- | --- |
| `baseUrl` | `OMNIROUTE_BASE_URL`, or empty | OmniRoute server URL. An explicit string takes precedence over the environment variable. |
| `apiKey` | `OMNIROUTE_API_KEY`, or empty | Bearer key or `{env:VARIABLE_NAME}` reference. An explicit string takes precedence over the environment variable. |
| `style` | `bar-style` | Use `bar-style` for bars or `percents-only-style` for a table without bars. Applies to the sidebar and details panel. Invalid values use `bar-style`. |
| `start-closed` | `false` | Start with the sidebar section collapsed when set to `true`. Other values start it expanded. Clicking the header still toggles the section. |
| `pinnedProvider` | unset | Provider code, such as `codex`, `claude`, or `agy`. Moves the matching provider first in the sidebar and details; the collapsed header summarizes it. Matching ignores case and surrounding whitespace. If unset or unknown, providers retain API order. |
| `intervalMs` | `60000` | Polling interval in milliseconds. Must be a finite number of at least `1000`; invalid values use the default. |
| `timeoutMs` | `10000` | Request timeout in milliseconds. Must be a finite number of at least `1000`; invalid values use the default. |

An empty or unresolved key, or an empty base URL, produces `unavailable` without a request. The URL must use HTTP or HTTPS and must not contain credentials.

## Usage

Open a session and its sidebar. Both commands are also available in the command palette.

| Action | Behavior |
| --- | --- |
| Automatic polling | Reads the existing usage cache with GET. It never triggers a server refresh. |
| `/omni-quota` | Opens the details panel. |
| `/omni-quota-refresh` | Sends POST to refresh provider limits, waits for the server, then reads the usage cache. |

Manual refresh requires the configured API key to be an OmniRoute management token with the `manage` or `admin` scope. A regular usage key may read quotas but receive HTTP 403 for manual refresh. The same `apiKey` option is used for both operations. The POST has a five-minute timeout and is not retried; the server may continue working after a timeout. Partial failures are reported without exposing server error details.

The displayed fetch time is not the age of OmniRoute's upstream data. Quotas do not guarantee route availability. If a request returns HTTP 401 or 403, check the key and OmniRoute's `allowUsageCommand` setting.

## Security and privacy

The plugin sends the same key as a Bearer token to these endpoints on the configured OmniRoute origin:

- `GET /api/usage/om-usage?format=json` to read cached quotas.
- `GET /api/providers` for optional account labels, when accounts are present.
- `POST /api/usage/provider-limits` to refresh upstream quotas when you run `/omni-quota-refresh`. This requires `manage` or `admin` scope; automatic polling never sends this POST.

Use HTTPS for remote servers. Redirects are rejected. The providers response may contain secrets and is processed in the TUI process memory; use a trusted OmniRoute server and protect the local environment. The plugin does not intentionally save keys or responses to disk or display server error text.

Account labels may be visible in the TUI. Email labels are shortened to the part before `@`, which can still identify an account.

## Development

### CI and releases

GitHub Actions checks pushes to `main` and pull requests: typecheck, lint, tests, and package build. The `npm-package` artifact contains the verified archive, including its license and both TUI entry points.

Publishing a non-prerelease GitHub Release runs the same checks and publishes that archive to npm with provenance. The release tag must be `v` followed by the version in `package.json`, for example `v0.1.2`. Creating a Git tag alone does not publish the package.

Publishing uses npm trusted publishing (OIDC), without an `NPM_TOKEN` secret. Once the package exists on npm, configure its trusted publisher in the package settings:

- Provider: GitHub Actions
- Organization or user: `m1c1b`
- Repository: `opencode-omniroute-quota`
- Workflow filename: `publish.yml`
- Environment: leave empty

The package must exist before npm allows this configuration. After a complete unpublish, wait for npm's 24-hour restriction, publish a new version manually once, then configure the trusted publisher. An unpublished version cannot be reused. Do not publish a GitHub Release for an already manually published version after enabling the workflow; use a new version for the next automated release.

For each subsequent release, update `package.json`, merge the change to `main`, wait for CI, and publish a GitHub Release with the matching tag. Prereleases are intentionally excluded from automatic npm publication.

```sh
bun run test
bun run typecheck
bun run lint
bun run build
```

`npm pack` runs the build through `prepack` and therefore requires Bun and installed development dependencies.

## License

Copyright 2026 m1c1b. Licensed under the [Apache License 2.0](LICENSE).
