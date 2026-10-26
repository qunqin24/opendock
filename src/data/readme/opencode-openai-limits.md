# opencode-openai-limits

OpenCode V2 plugin displaying ChatGPT/Codex usage windows in the CLI footer and sidebar.

The footer shows `OpenAI ↻ 4h 35m` until the primary reset, followed by a compact two-level remaining-usage bar
and the remaining primary-window percentage (for example, `80%`).
On the home screen it appears only in the bottom footer; inside a session it appears below the prompt instead.
The upper half of the bar represents the primary window (normally five hours) in the theme's info color;
the lower half represents weekly usage.
The sidebar shows `OpenAI [Codex]` when using fallback credentials, or `OpenAI` otherwise,
followed by two remaining-usage bars with percentages. Each section has a blank line above it and its own reset countdown,
for example `Primary ↻ 2h 8m` and `Weekly ↻ 5d 0h`. Weekly countdowns use days from 24 hours onward;
primary countdowns stay in hours. Reset labels are omitted when the endpoint returns no timestamp.
Remaining percentages are colored success above 25%, warning at 25% or less, and error at 10% or less.
Countdown text updates every minute. Missing percentages are shown as `—`, not zero.

## How it works

- The server plugin reads the active `openai` integration through OpenCode's plugin API and resolves its credential
  with `ctx.integration.connection.resolve()`.
- Only OAuth credentials with an access token are used. API keys are not treated as ChatGPT plan credentials.
- With an active OpenAI API key (including environment credentials resolved as a key), the widget is hidden and no
  Codex auth file or usage endpoint is accessed. This check runs before the usage cache is read.
- The server requests `https://chatgpt.com/backend-api/wham/usage` and exposes only percentages and reset time via a
  plugin RPC method. The token never leaves the server plugin or appears in the TUI.
- Responses are cached for one minute and invalidated when the resolved OpenCode credential changes;
  the TUI refreshes every five minutes. Unsupported response shapes are reported as errors rather than valid usage.

The ChatGPT usage endpoint is undocumented and may change. OpenCode's documented experimental
`/api/experimental/usage/limits` endpoint is not assumed to represent OpenAI/Codex limits.

## Install

OpenCode V2 supports installing a GitHub repository without publishing to npm:

```sh
opencode plugin add github:vdistortion/opencode-openai-limits
```

The repository must contain the plugin code before this command can install it. After creating a release tag,
you can pin a revision, for example `github:vdistortion/opencode-openai-limits#v0.1.0`.

After the package is published to npm, it can also be installed with:

```sh
opencode plugin add opencode-openai-limits
```

Installing the package enables both server and TUI components. There is no need to add it to `cli.json` separately.
Configuration reloads automatically; use `/reload` to force a reload.

## Development and publishing

Install development dependencies and run checks:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

The tests run with Node.js 24 or newer. Rendering happens inside OpenCode using its OpenTUI runtime.
To publish to npm, first verify package contents, installation in an isolated OpenCode environment, the npm account
and availability of the package name, then run `npm login` and `npm publish`. Publishing is a separate manual step.

The `files` allowlist includes only the compiled `dist/`, root JS entrypoints, README and license. Local OpenCode
config, tests and source TSX are not shipped. `npm run build` compiles TypeScript and Solid JSX without bundling
the host's Solid/OpenTUI runtimes. The `prepare` hook runs the build before packing/publishing and for Git installs.
Check the resulting archive with `npm pack --dry-run` before publishing.

Source TSX entrypoints include `@jsxImportSource @opentui/solid` for local development. npm packages use precompiled
Solid JS: a pragma alone is not enough when runtime transforms skip `node_modules`. React is not a dependency and
must not be added as a workaround. Generated `dist/`, `index.js` and `tui.js` are ignored by Git.

### Test the npm archive without publishing

```sh
python3 scripts/smoke-test.py
```

Requires Linux/macOS (a PTY), `npm`, Node.js 24+ and OpenCode in `PATH` and an existing `/tmp/opencode` directory.
The script builds a real `.tgz` with `npm pack`, installs it in a new consumer project, checks package exports and
compiled Solid JS (no TSX or React runtime),
then starts a separate local OpenCode server with an isolated home/config/data/cache/state directory. It checks
server activation, TUI entrypoint discovery, the no-credentials RPC response and hiding with a synthetic API key.
Finally it launches the actual TUI in a pseudo-terminal and requires the widget to render the no-auth RPC response,
not stay in `Loading…`. This verifies component mounting and reactive updates, not just entrypoint discovery.
No real API key, OAuth credential or existing OpenCode configuration is copied, and nothing is published.

The server is stopped after the check; the sandbox and archive are retained under `/tmp/opencode/openai-limits-smoke-*`.
For a manual visual check, run the `open-tui.sh` path printed by the script. It launches a standalone OpenCode TUI
in the same clean environment. Sign in there explicitly if you want to check the live bars; otherwise the widget
shows its no-connection message. Live bars, colors and layout still need a manual check.
Every script run creates a new sandbox, so accounts connected in an older sandbox are not automatically available.

Keep the repository's local `opencode.json` for development. It is not part of the npm archive and is not required
in consumers' repositories. Its absolute plugin path is specific to this checkout; adjust it if you move the folder.

## Configure

For a local checkout, add the package directory to the server's `opencode.json` (or `opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-openai-limits"]
}
```

Because the package exports a `./tui` entrypoint, OpenCode loads its TUI contribution with the configured server
plugin. No separate CLI plugin entry is needed. If using a remote server, the server plugin must be installed on that
server; the CLI UI connects to its RPC.

For source checkouts, OpenCode discovers the root `index.ts` and `tui.tsx` files, which re-export the implementations
in `src/`. Installed npm archives have root `index.js` and `tui.js` shims targeting `dist/` instead. Package exports
alone are not sufficient for local-directory discovery.

To check server activation, run `opencode plugin list`. To query the plugin directly, replace the example directory
with the project location where it is enabled:

```sh
opencode api post '/api/rpc/opencode-openai-limits/usage?location[directory]=/absolute/path/to/project' --data '{"input":{}}'
```

An `active` plugin with an upstream HTTP 401 means loading and RPC work, but ChatGPT rejected the resolved credential
for this private endpoint. The legacy **Codex browser** and **Codex device code** OAuth methods have been tested
successfully. The new **Sign in with ChatGPT** token-sharing method returns 401 on this endpoint; use the optional
Codex fallback below if you want to keep that sign-in method. See [openai/codex#54219](https://github.com/openai/codex/issues/54219).

Connect OpenAI through `/connect` and choose **Sign in with ChatGPT** or a Codex OAuth method. The active OpenAI
connection must be OAuth; a normal OpenAI API key does not expose ChatGPT plan limits.

## Limitations

### Optional Codex auth fallback

Enable explicitly in the plugin entry's `options`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{
    "package": "opencode-openai-limits",
    "options": { "codexAuthFallback": true }
  }]
}
```

Use the same package target you installed: the npm name after npm publication, `github:vdistortion/opencode-openai-limits`
for GitHub installation, or the absolute directory for a local checkout. Replace the existing entry rather than
adding a second copy. The option defaults to off. This checkout enables it in its local `opencode.json`;
global settings are not modified. If the plugin is also configured globally, use the exact same package target
in the project entry (including a trailing slash for local paths), so the enabled options apply to the same entry.
The server reads `~/.codex/auth.json` only if OpenCode has no usable OAuth credential or the usage endpoint returns
401/403. It does not write the file, refresh tokens, or log secrets. Expired tokens require signing in again with
Codex. The home directory is that of the **server**, not necessarily the terminal client.

The sidebar shows `OpenAI [Codex]` for fallback credentials, with the label in the theme's info color;
for native OpenCode credentials it shows only `OpenAI`. The footer omits the credential source.
Use the same ChatGPT account in both applications. When both
tokens expose a ChatGPT account ID, mismatches are rejected. Token-sharing credentials may hide this identity, so
matching cannot always be verified; OAuth `sub` values are not compared across different clients.

- The upstream ChatGPT endpoint is private/undocumented; response fields and auth requirements can change.
- Labels `5h` and `weekly` are display conventions; percentages and reset timestamp come from the endpoint.
- OpenCode V2 plugin APIs and RPC are required.
- Without OpenCode OAuth and with fallback off, the widget shows a connection hint. If fallback is enabled but
  the Codex file is missing, invalid or expired, it shows an error; it does not silently hide. API-key connections
  are the exception: they always hide the widget without reading the Codex file.

## License

MIT — see [LICENSE](./LICENSE).
