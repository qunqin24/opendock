# opencode-warp-retry

Automatically rotate your **Cloudflare WARP** IP and retry when **OpenCode** hits a free usage limit.

When a free model returns `provider.free-limit`, the plugin disconnects WARP, reconnects to get a new egress IP, waits for the proxy to come back, and asks OpenCode to retry — repeating on every failed retry within OpenCode's attempt cap.

> Not affiliated with OpenCode or Cloudflare. Use at your own risk.

## How it works

1. Registers a `retry` hook on the OpenCode server.
2. Detects `provider.free-limit` (and `provider.quota` errors whose message contains "free usage limit").
3. Runs:
   - `warp-cli disconnect`
   - wait 0.8 s
   - `warp-cli connect`
   - poll `https://www.cloudflare.com/cdn-cgi/trace` until `warp=on`
4. If WARP came back on the **same IP**, it rotates again (up to `maxRotations`).
5. Waits 1 s and sets `{ retry: true, delay: 1000 }` on the retry event.
6. Repeats on the next failure, so it keeps rotating until an IP change works or OpenCode's own retry cap is reached (~10 attempts per request).

The plugin only activates when the OpenCode **server process** has `HTTPS_PROXY`, `HTTP_PROXY`, or `ALL_PROXY` pointing at the WARP proxy. It does not change system-wide proxy settings.

## Requirements

- **OpenCode v2** (tested with `2.2.6`).
- **Cloudflare WARP** client installed, logged in, and in **proxy mode**.
- `curl` available (Windows 10+ ships it; macOS and most Linux distributions do too).
- The OpenCode server must inherit the proxy environment variables.

Set WARP to proxy mode once:

```sh
warp-cli mode proxy
warp-cli connect
```

The default proxy is `http://127.0.0.1:40000`. If yours differs, set `proxyUrl` (see Configuration).

## Install

### From npm

```sh
opencode plugin add opencode-warp-retry
```

### From GitHub

```sh
opencode plugin add github:lipey1/opencode-warp-retry
```

Replace `lipey1` with the repository owner if you forked it.

### Windows one-click (downloaded copy)

If you downloaded the repository (ZIP or clone) and do not want to use the CLI:

```powershell
powershell -ExecutionPolicy Bypass -File .\launcher\windows\Install.ps1
```

This copies the plugin to `%USERPROFILE%\.config\opencode\plugins\warp-retry\index.ts` (saving a `.bak` of any previous file) and creates the **OpenCode (WARP)** shortcut. Add `-Force` to replace an existing shortcut without confirmation; the previous shortcut is saved as `.lnk.bak`.

> Use only one installation method. If the plugin is already installed with `opencode plugin add`, do not also copy `src/index.ts` manually.

### Manual

Copy `src/index.ts` to one of these paths (OpenCode auto-discovers plugin directories):

- Windows: `%USERPROFILE%\.config\opencode\plugins\warp-retry\index.ts`
- macOS/Linux: `~/.config/opencode/plugins/warp-retry/index.ts`

No `opencode.jsonc` entry is required. To pass options, reference the package explicitly:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-warp-retry",
      "options": {
        "proxyUrl": "http://127.0.0.1:40000",
        "retryDelayMs": 1000,
        "maxRotations": 3
      }
    }
  ]
}
```

## Launch OpenCode with the WARP proxy

The plugin cannot change the network stack of an already-running process. The OpenCode **background service** must be started with the proxy variables set.

### Windows (included launcher)

The `Install.ps1` above already installs the plugin and creates this shortcut. To create or refresh only the shortcut:

```powershell
powershell -ExecutionPolicy Bypass -File .\launcher\windows\Install-Shortcut.ps1
```

This creates an **OpenCode (WARP)** shortcut on your Desktop. It asks before overwriting an existing shortcut and saves the previous one as `.lnk.bak`. The launcher:

- refuses to run if OpenCode is already open (quit it completely first);
- stops the old background service so it can inherit the proxy;
- checks the WARP proxy and tries to connect WARP if needed;
- starts OpenCode with `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and `NO_PROXY`;
- falls back to opening OpenCode without WARP (with a warning) if the proxy is unreachable.

### Manual (any OS)

```sh
opencode service stop
export HTTPS_PROXY=http://127.0.0.1:40000
export HTTP_PROXY=http://127.0.0.1:40000
export ALL_PROXY=http://127.0.0.1:40000
export NO_PROXY=localhost,127.0.0.1,::1
opencode
```

For OpenCode Desktop, use the launcher (or restart the service after setting the variables) so the service inherits the proxy.

## Configuration

Options can be passed through the plugin entry in `opencode.json(c)`, or via environment variables. Options take precedence over environment variables.

| Option | Environment variable | Default | Description |
|---|---|---|---|
| `proxyUrl` | `WARP_RETRY_PROXY` | `http://127.0.0.1:40000` | WARP proxy URL |
| `warpCli` | `WARP_RETRY_WARP_CLI` | auto-detect | Full path to `warp-cli` |
| `curl` | `WARP_RETRY_CURL` | auto-detect | Full path to `curl` |
| `logFile` | `WARP_RETRY_LOG` | platform default | Log file path |
| `retryDelayMs` | `WARP_RETRY_DELAY_MS` | `1000` | Delay before the retry (0–60000) |
| `maxRotations` | `WARP_RETRY_MAX_ROTATIONS` | `3` | Rotations per failure when the IP does not change (1–10) |
| `requireProxyEnv` | `WARP_RETRY_REQUIRE_PROXY` | `true` | When `false`, activates even without a matching proxy environment |

`warpCli` auto-detection:

- Windows: `C:\Program Files\Cloudflare\Cloudflare WARP\warp-cli.exe`, otherwise `warp-cli` from `PATH`.
- macOS/Linux: `warp-cli` from `PATH`.

## Logs

- Windows: `%LOCALAPPDATA%\opencode-warp-retry\warp-retry.log`
- macOS/Linux: `~/.local/share/opencode-warp-retry/warp-retry.log`

Typical output:

```text
plugin loaded; automatic free-limit retry enabled (proxy: http://127.0.0.1:40000)
free usage limit on attempt 2; starting a WARP rotation
free usage limit reached: disconnecting WARP (rotation 1/3)
disconnect: ok=true code=0 Success
reconnecting WARP
connect: ok=true code=0 Success
WARP ready after 500ms; IP 2a09:bac5:... -> 2a09:bac1:...; settling for 1000ms
WARP reconnected; retrying in 1000ms (attempt 2)
```

If the plugin is loaded but the proxy variables do not match, it logs:

```text
plugin loaded but no proxy environment matches http://127.0.0.1:40000; automatic retry disabled.
```

## Behavior and limitations

- OpenCode v2 caps retries at roughly **10 physical attempts per request**. The plugin rotates within that cap. Once the cap is reached, the original error is shown.
- If changing the IP does not help after several rotations, the limit is probably **account-based**, not IP-based. Waiting for the quota reset or using a paid model is the only fix.
- Rotating WARP briefly interrupts other traffic that uses WARP on the same machine.
- The plugin does not modify system-wide proxy settings and does not work if OpenCode is launched without the proxy environment (by design).
- Multiple simultaneous failures share one WARP cycle; a recent rotation is reused for the same attempt wave.

## Troubleshooting

| Symptom | What to do |
|---|---|
| `plugin loaded but no proxy environment matches ...` | Launch OpenCode through the WARP shortcut, or set `HTTPS_PROXY`. |
| `warp-cli connect failed` | Set `warpCli` to the full path and confirm WARP is logged in. |
| `WARP proxy did not return within 10s` | Run `warp-cli mode proxy` and `warp-cli connect`; verify port 40000. |
| The plugin never triggers | Check the log. The error must be `provider.free-limit`. |
| OpenCode opens without WARP | The launcher could not reach the proxy; it falls back and shows a warning. |
| Still limited after rotations | Likely an account-level quota; rotating the IP will not help. |

## Development

```text
src/index.ts                  plugin source
launcher/windows/             Windows launcher + one-click installer
examples/opencode.jsonc       configuration example
```

The plugin is plain TypeScript with Node built-ins and the `@opencode/plugin` SDK. No build step is required; OpenCode loads `src/index.ts` directly.

To try a local checkout, add its absolute path to `opencode.json(c)`:

```jsonc
{
  "plugins": ["D:/path/to/opencode-warp-retry"]
}
```

Then launch OpenCode with the proxy environment variables.

## License

MIT — see [LICENSE](LICENSE).

Português: [README.pt-BR.md](README.pt-BR.md)
