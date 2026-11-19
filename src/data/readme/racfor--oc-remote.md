# oc-remote

Remote control of a local OpenCode v2 server from a phone or browser through a
self-hosted relay. The agent, files, tools and MCP servers stay on the laptop;
the relay only carries HTTP, SSE and permission signals.

- Spec: [SPEC.md](SPEC.md)
- Deployment: [deploy/README.md](deploy/README.md)
- Relay: Go, Docker, nginx + Let's Encrypt
- Plugin: npm `oc-remote` (server, TUI, RPC, `join` CLI)

Status: `0.1.0`, deployed at <https://rc.addies.ai>. The npm package is not
published yet; the local package is used through `file:///`.

## How it works

```
phone browser --HTTPS--> nginx (rc.addies.ai) --> relay 127.0.0.1:4097
                                                     ^
                                                     | outbound WSS, device key
                                                     |
laptop: OpenCode server + oc-remote plugin  <--------+
```

1. The plugin mints a 5-minute single-use pair code from the local
   `POST /api/pair` and registers it with the relay.
2. The browser opens `https://rc.addies.ai/_ocr/pair/<code>`. The relay redeems
   the code server-side and stores the resulting OpenCode token; the browser
   only gets a `__Host-ocr_session` cookie (7 days, sliding).
3. Every request is proxied through the outbound WebSocket tunnel to the local
   OpenCode server with the stored token. No inbound ports on the laptop.
4. HTML responses get one extra same-origin script: a **Remote** button that
   opens the control panel.

## Use

In the OpenCode TUI:

```
/remote          # status + a new pair link, copied to the clipboard
/remote off      # close the tunnel
/remote on       # reopen it
```

Or open <https://rc.addies.ai> with the laptop browser (after the first pair)
and use the **Remote** button:

- **Connect device** — new pair link for another phone/browser (5 minutes).
- **Enable notifications** — Web Push for `permission.asked` (iOS needs
  "Add to Home Screen").
- **Sign out everywhere** — deletes every browser session of the tenant.
- Agent picker for the current session (when opened from a session page).

Pair links are one-time and expire after 5 minutes. The browser session lasts
7 days of activity and is renewed silently while the laptop is online. There is
no static link by design: if all browsers are lost, run `/remote` on the laptop.

## Onboarding a colleague

Single-tenant per colleague, shared relay. The administrator creates a tenant
and a device key:

```sh
cd /opt/oc-remote
docker compose -f deploy/docker-compose.yml exec -T relay \
  /usr/local/bin/oc-remote-relay admin add alice --device alice-laptop
```

The command prints:

```
join: npx @racfor/oc-remote join https://rc.addies.ai ocr_...
```

The colleague runs that command on their laptop. For development against a
local checkout, point `--package` at the folder instead:

```sh
node plugin/bin/oc-remote.mjs join https://rc.addies.ai <key> \
  --package file:///D:/Source/oc-remote/plugin --name laptop
```

`join` validates the URL and key, then adds one entry to the global
`~/.config/opencode/opencode.json` (`plugins`), preserving comments and every
other setting; a `.bak` copy is written once. Each tenant has its own device
key, browser sessions and push subscriptions; a browser session is bound to one
device.

Admin commands:

```sh
docker compose -f deploy/docker-compose.yml exec -T relay \
  /usr/local/bin/oc-remote-relay admin list
docker compose -f deploy/docker-compose.yml exec -T relay \
  /usr/local/bin/oc-remote-relay admin disable alice
docker compose -f deploy/docker-compose.yml exec -T relay \
  /usr/local/bin/oc-remote-relay admin rm alice
docker compose -f deploy/docker-compose.yml exec -T relay \
  /usr/local/bin/oc-remote-relay admin rotate-key alice
```

`disable` kicks the tunnel and deletes the tenant's sessions. The administrator
does not get a per-session revoke or content view.

## Security model

- Pair code: 22 chars, single use, 5 minutes, hashed at rest, rate-limited.
- Browser session: 32 random bytes, `__Host-ocr_session`, `Secure`,
  `HttpOnly`, `SameSite=Lax`, 7 days sliding.
- OpenCode token: stored encrypted (AES-GCM) in SQLite, never sent to the
  browser. The browser never receives an OpenCode cookie.
- TLS is terminated by the host nginx; HSTS is on; nginx access logs are off
  for `rc.addies.ai`, so pair codes are not logged.
- The relay stores metadata only: tenants, devices, sessions, push
  subscriptions. No prompt or response bodies, no IP addresses.
- Anyone who obtains a valid pair link can control that device. Treat the link
  as a credential; it dies after one use or 5 minutes.
- The admin API is loopback-only inside the container; the admin token lives in
  the data volume.

## Development

```sh
go test ./...                    # relay, fake tunnel device, pair/proxy/admin
cd plugin && npm test            # config edit, service helpers, join CLI
cd plugin && npm run typecheck
```

Layout:

```
cmd/oc-remote-relay     relay entrypoint (serve, admin, healthcheck)
internal/               config, store, secret, tunnel, app handlers
web/                    embedded panel, inject script, notify page, SW
plugin/                 npm package: server, TUI, RPC, join CLI
deploy/                 Dockerfile, compose, nginx, install script
```

## Known gaps

- Permission push delivery was not exercised end to end; it needs a real
  permission prompt and a subscribed browser. The subscription, VAPID key,
  service worker and relay fan-out are implemented.
- The TUI `/remote` dialog and clipboard copy are typechecked and the TUI part
  loads, but they were not driven in a real TTY during the automated e2e.
- Multi-device selection for one tenant is not exposed in the UI; each browser
  session is bound to the device that minted the link.
