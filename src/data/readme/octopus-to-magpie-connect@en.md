# Octopus to Magpie Connect

[中文说明](README.md)

Community plugin `octopus-to-magpie-connect` (a Magpie page plugin). The connector runs **inside Magpie's existing Bun plugin host**. It does not start a separate Go Connector, companion, daemon, service or child process, and never exits/kills Magpie. No changes to Magpie are required.

- **Octopus upstream project:** [`https://github.com/lingyuins/octopus`](https://github.com/lingyuins/octopus)
- **This plugin:** [`https://github.com/lingyuins/octopus-to-magpie-connect`](https://github.com/lingyuins/octopus-to-magpie-connect)

> The Octopus GitHub repository above is the upstream source repository. It is not the cloud WebSocket endpoint entered in the plugin page; use the `wss://.../node/v1/connect` address generated for your node by the Octopus Local Nodes page.

## What it logs into and where credentials live

This plugin connects **two** things you own:

1. **The Octopus cloud** — with a **node token** from a node you create on the Octopus site (Local Nodes). It opens one outgoing TLS WebSocket to your `wss://.../node/v1/connect` endpoint; there is no account password and no OAuth flow.
2. **Your local Magpie gateway** — with a **Magpie API key** you create in Magpie. The connector only calls `http://127.0.0.1:<port>` (default 3425); the key is required even on loopback.

**Where credentials are stored (your choice, never auto-discovered):**

- Plugin page fields → plain text in Magpie's local `plugins.json` on this machine.
- Environment variables `OCTOPUS_NODE_TOKEN` / `OCTOPUS_MAGPIE_KEY` / `OCTOPUS_MAGPIE_URL` → nowhere on disk from this plugin.
- An external private JSON file you point `OCTOPUS_MAGPIE_PRIVATE_CONFIG` at → stays wherever you put it; protect it with OS permissions.

Nothing is sent anywhere except the node token to your chosen Octopus endpoint and the Magpie key to your own loopback gateway.

## Which models

There is no fixed model list. Choose the exact model IDs your Octopus node should expose (one per chip, no wildcards), either by adding them individually or importing a list. Only IDs on this allowlist are forwarded to Magpie. The cloud Octopus page's Test connection verifies the tunnel, key and allowlist without running inference.

### Get the gateway's models

On the computer running Magpie, this PowerShell command prints the gateway's published model IDs, one per line:

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3425/v1/models?format=text').Content
```

Use your actual gateway port instead of `3425`. The current Magpie gateway permits this read-only directory request from loopback without a key; the connector itself still requires a Magpie API key. `magpie models` is also available for inspecting the model catalog in a terminal.

To list what the connector's specific key can use, supply that key in an Authorization header. This example prompts without putting the key in a URL or command history, and uses the connector's User-Agent so per-agent visibility also matches:

```powershell
$key = Read-Host 'Magpie API key' -AsSecureString
try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3425/v1/models?format=text' `
    -UserAgent 'octopus-ly-connector:v0.1.1' `
    -Headers @{ Authorization = 'Bearer ' + [System.Net.NetworkCredential]::new('', $key).Password }).Content
} finally {
  Remove-Variable key -ErrorAction SilentlyContinue
}
```

The result is the gateway's published, currently visible catalog, not every model an upstream vendor might offer. Enabled providers, hidden models, per-agent settings and key restrictions can change the list. A directory entry does not prove a model request will succeed or be free.

Open **Import model list** on the plugin page. Its command preview follows the port entered in the form (empty means `3425`); **Copy command** copies it without saving preferences or including credentials. If the browser refuses clipboard access, select the read-only command and copy it manually. Run it in PowerShell, then paste the output into the import box. The JSON response from `/v1/models` (`{"data":[{"id":"provider/model"}]}`) is accepted too. Imports are bounded to 4 MiB and the resulting allowlist to 1024 unique IDs. Duplicates are skipped; any invalid ID or limit violation leaves the draft unchanged. Review/remove the chips, then explicitly save and confirm. Importing never saves or requests a connection automatically.

Magpie's plugin-page sandbox forbids direct network calls (`connect-src 'none'`), and its official bridge has no model-directory read. The page therefore imports locally rather than presenting a Fetch models button that cannot work. No extra server or relaxed sandbox is needed.

## Install

Inside Magpie, install the published npm package:

```sh
magpie plugin add octopus-to-magpie-connect
# Pin the current release when needed:
magpie plugin add octopus-to-magpie-connect@0.1.1
# Or install from git / from a folder:
magpie plugin add lingyuins/octopus-to-magpie-connect
magpie plugin add D:/CodeWorkspace/octopus-to-magpie-connect
```

No build step is needed. For a fresh local checkout, run `npm ci` in the checkout before adding its folder: Magpie loads a local folder directly, so its pinned `ws` dependency must already be installed. npm/Git package installs use Magpie's package installer. Nothing in this package automatically installs/enables the plugin. Disable/remove the old page-only connector plugin if migrating; do not keep a separately running old Connector for the same node.

## Private configuration

Create a cloud Octopus node and obtain its node token. Obtain a Magpie API key yourself. Credentials can be supplied in either of two ways; the plugin never reads auth files or discovers credentials automatically.

**On the plugin page (plain text in plugins.json):** open the Octopus Connector page in Magpie and fill in Node token, Magpie API key and optionally the Magpie port on this machine (default 3425; the connector fixes the host to `127.0.0.1`) under Private credentials, then save. Values are stored in plain text in Magpie's `plugins.json` on this machine. A field showing `__keep__` holds a stored secret; leave it untouched to keep it, type a new value to replace it, or clear it to fall back to the environment or private file. This is the simplest path when this machine is yours alone.

**Environment variables (set before starting Magpie):**

```powershell
$env:OCTOPUS_NODE_TOKEN = '<your-node-token>'
$env:OCTOPUS_MAGPIE_KEY = '<your-magpie-api-key>'
$env:OCTOPUS_MAGPIE_URL = 'http://127.0.0.1:3425'
# Launch Magpie from this environment now.
```

The local URL must be a fixed HTTP literal-loopback origin, not `localhost`, with no path, query, credentials or redirects to other origins. The Magpie key is mandatory **even on loopback**. Use the actual port of your Magpie gateway. The default is `http://127.0.0.1:3425`.

Alternatively, explicitly set `OCTOPUS_MAGPIE_PRIVATE_CONFIG` to an **absolute external private JSON file**, outside the plugin source directory. Use only these snake_case names:

```json
{
  "node_token": "<your-node-token>",
  "magpie_key": "<your-magpie-api-key>",
  "magpie_url": "http://127.0.0.1:3425",
  "allow_insecure_loopback": false
}
```

Protect that file using OS permissions; never commit it or put it under this plugin. Environment values override JSON fields, and credentials stored on the plugin page override both. No automatic private-config/auth search occurs. `OCTOPUS_ALLOW_INSECURE_LOOPBACK=true` is an explicit private test-only switch; it never removes key authentication and never permits plaintext remote cloud origins. The public UI always requires `wss://`.

Changing environment requires restarting Magpie. Changing a private file makes the old connector disconnect and permanently retire; explicitly reload/restart Magpie's plugin host afterwards to use the new secrets. A retiring host never adopts a replacement node token. On Windows, a brief read handle can make an atomic replacement return `EPERM`; Magpie's existing settings writer retries this for approximately 500 ms. External private-file editors should also retry transient sharing conflicts. The plugin closes each read handle before parsing, and any read failure retires the runtime safely. Never paste secrets into the models field or diagnostic messages.

## Configure and connect

Open the plugin page in Magpie. It uses only the official `_magpie/bridge.js` `ready`, `theme`, `onTheme`, and own `options.get/set` APIs; it has no custom RPC, direct network calls or fake live-status API. Credentials entered on the page remain local in plugins.json.

1. Enter your cloud WSS endpoint, optionally prefixed, ending `/node/v1/connect`.
2. Add exact model IDs with the Add button (or Enter), or open **Import model list** and paste a gateway model list as described above. Each ID becomes a removable chip. Case, commas and `*` are literal; there is no wildcard expansion. Click a chip to remove that model from the allowlist.
3. Save preferences and separately confirm **Request connection**. Installing or opening the page never sets `connect=true`. Chip edits and field edits reach Magpie only through a confirmed save.
4. **Fully quit and restart Magpie after saving. Refreshing the plugin page is not enough.** Restart after changing ports, tokens, keys or models too.
5. Check actual status on the **cloud Octopus Local Nodes page**, then click **Test connection**. This checks the tunnel, gateway, key and allowed model list without inference. The plugin page shows the saved desired state, not online status, and keeps the restart instructions visible before and after saving.

**Bun host lifecycle:** Magpie starts its Bun host lazily when it needs plugin hooks. Adding the page or opening it does not prove the host is running. Saving options may reload the host; reload/disconnect cancels active cloud requests, which can fail. Requests are not replayed. If a saved connection does not start, explicitly reload/restart Magpie and use the normal Magpie operation that loads plugins; no separate Connector command is needed.

Save preserves the current desired connection state. Disconnect ignores invalid unsaved form edits and saves the last valid configuration with `connect=false`. All writes require confirmation and are rate-limited. Unknown stored fields are not echoed and are dropped on a confirmed save; a stored credential field shows the `__keep__` placeholder instead of its real value. Only that placeholder keeps a stored secret: clearing a secret or the port removes its page override and restores the environment/private-file/default source.

## Public options: exactly nine fields

```json
{
  "version": 1,
  "connect": false,
  "cloud_url": "wss://octopus.example/prefix/node/v1/connect",
  "models": ["provider/exact-model-id"],
  "max_concurrency": 4,
  "request_timeout_seconds": 300,
  "node_token": "",
  "magpie_key": "",
  "magpie_url": ""
}
```

`version` is 1; `connect` is boolean. Cloud URL: safe `wss://`, no credentials/query/fragment/encoded path/backslashes/dot or empty path segments. Models: 1–1024 unique exact IDs, 1–512 UTF-8 bytes, no surrounding whitespace or control characters. Concurrency: integer 1–32; timeout: integer 1–3600 seconds. The only unconfigured shape is `{ "version": 1, "connect": false, "cloud_url": "", "models": [], "max_concurrency": 4, "request_timeout_seconds": 300, "node_token": "", "magpie_key": "", "magpie_url": "" }`. Missing options/empty options mean that disabled default.

`node_token`, `magpie_key` and `magpie_url` may be empty strings, in which case the environment variables `OCTOPUS_NODE_TOKEN`, `OCTOPUS_MAGPIE_KEY` and `OCTOPUS_MAGPIE_URL` (or the external private JSON file) supply them. When they hold values, those values are stored in plain text in `plugins.json` and take precedence over environment and file sources.

## Ownership and fail-closed behavior

The runtime reads controls from `input.directory/plugins.json`. It recognizes absolute directory specs and npm/Git installation specs only when their resolved installation target, canonicalized with `fs.realpath`, is its own module directory. Package names only select candidate paths; a matching name alone is never sufficient. Git specs are mapped through the exact dependency values in `input.directory/plugins/package.json`; this and the plugin's own package metadata are bounded JSON reads, not credential discovery or code execution. Exactly one entry must match. Normal npm/Git installations do not require an environment override. For an explicitly chosen entry, `OCTOPUS_MAGPIE_PLUGIN_SPEC` remains an exact full-spec override before launching Magpie; it does not publish this package.

Off/removal/missing file/malformed or duplicate controls/invalid config/disconnect cancel the active session as soon as observed (poll interval 250 ms plus read/cancellation time). The connector joins canceled local requests and closes its WSS before releasing ownership. It never terminates the host.

Two exclusive `127.0.0.1` TCP listeners are the OS leases, derived from the canonical plugin directory and the SHA-256 node-token identity (ports 32000–59999). This excludes both multiple hosts for one installation and copied installations using the same node token on this machine. They serve **no HTTP or management API** and immediately destroy incoming sockets. Only one owner can bind; a live owner is never stolen and owner death releases the listeners through the OS. Port collisions fail closed, possibly preventing connection until the conflict is removed. Ownership loss aborts the session. No stale files, timestamps or PID takeover exist.

During Magpie options reload an old host may remain alive for up to ten minutes. Each host is pinned to its initial public options. A change permanently retires the old runtime; a new host waits for the old lease and all active requests to finish cancellation before connecting. The old host cannot race to reconnect using the new settings or token. Automatic retries only occur while the same control and private credentials remain valid. Retries use jittered exponential backoff from 500 ms to a 30-second cap; a connected session lasting more than 60 seconds resets the backoff. Control polling continues independently and cancellation interrupts backoff immediately.

## Tests

```sh
npm test
# Optional, if Bun is available:
bun test tests/*.test.mjs
```

Tests cover the migrated page, strict control/private configuration, immediate entry return, replacement-host cancellation, lease exclusion and explicitly launched multi-process fixtures (including owner death). Only fixtures start/stop test children; the installed plugin never does. Tests use synthetic credentials and do not install a real Magpie plugin. The browser bridge fixture is test-only, never referenced by the installed page.
