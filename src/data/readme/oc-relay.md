<div align="center">

# oc-relay

**Your fleet is the computer.**

Route OpenCode work between every machine you own — dispatch heavy
sessions to idle boxes, offload to free up your laptop, pick up exactly
where you left off on any device. One command, even if the target is
offline right now.

[![CI](https://github.com/itz4blitz/oc-relay/actions/workflows/ci.yml/badge.svg)](https://github.com/itz4blitz/oc-relay/actions/workflows/ci.yml)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![mutation score](https://img.shields.io/badge/mutation%20score-100%25-brightgreen)
![mutants](https://img.shields.io/badge/mutants%20killed-2008%20%2F%202008-blue)
![license](https://img.shields.io/badge/license-MIT-black)

**`relay send --target gpu-box --steal`**

</div>

---

<p align="center">
  <img src="demo/demo.gif" width="720" alt="oc-relay hero: listing the fleet, pinging targets, offloading a session to gpu-box with --steal (real recording of the real binary on a loopback fleet)">
</p>

*A real recording of the real binary* — typed commands, genuine output
timing, loopback stand-ins for the sync endpoints only. Replay it
yourself: `git clone && npm install && npm run demo` (full tour) or
`npm run demo:record` (re-records and re-renders this GIF).

## Use it inside OpenCode (the GUI)

```sh
cd your-project && relay init    # writes .opencode/plugins/ + /relay
```

Restart OpenCode. In the GUI:

1. Command Palette: **Relay: send session** (or type `/relay`)
2. Pick a fleet machine
3. Confirm whether to detach the session here (`--steal`)
4. A toast reports the target session id, or the bundle path if that machine is offline

The agent still has `relay_targets` / `relay_send` if you just say "send this to gpu-box".
On the receiving machine the worktree, session, and agent environment land together:
your **agent environment** travels too: MCP servers (secrets redacted to `${VAR}`
references with a `requiredEnv` list), skills, and rules are snapshotted on send
and applied on the target through `@itz4blitz/ai-tools` when installed there
(`.opencode/relay-environment.json` is always written as the reviewable source
of truth). Hooks are functions, not data: they live in committed config and
travel with git.

You can also add `"oc-relay"` to `plugins` in `opencode.json` (or
`~/.config/opencode/opencode.json`) after `npm install oc-relay`. That loads the
same server + TUI plugin from the package (`oc-relay/server` and `oc-relay/tui`).

## Three ways people use it

**1. Offload — free up the machine you're on.**
A session is cooking your laptop's fans. Send it to the box with the
headroom *and let go of it here*:

```
laptop $  relay send --target gpu-box --session ses_7f3 --steal

          ✓ pushed via sync-replay → gpu-box
          ✓ target session ses_9c2
          ✓ detached here: session ses_7f3 now lives on gpu-box

          your laptop is yours again.
```

`--steal` moves the session rather than copying it — after the target
confirms it has everything, relay detaches it from the source machine.

**2. Orchestrate from a thin client.**
Keep a lightweight machine as your cockpit and treat the rest as compute.
Your fleet is a list; `relay ping --all` shows what's alive; work goes
wherever has the resources — NAS, desktop, rack box, three machines
sitting idle under your desk.

```
thin $    relay targets
          nas       http://nas:49374        ~/code/myapp
          desktop   http://desktop:49374    ~/code/myapp
          gpu-box   http://gpu-box:49374    ~/srv/myapp

thin $    relay send --target nas --session ses_2k --steal
```

**3. Hand off — continue anywhere.**
Leave your desk mid-thought, resume at the desktop: same branch, same
WIP commits, same notes, same session. Nothing to re-explain.

## What actually moves

| What | How | Survives offline |
|---|---|---|
| **Your code** | git branch + WIP commits | ✓ rides as a git-bundle sidecar next to the handoff file |
| **Your context** | a `done / left / decisions` memo | ✓ anchored to `.relay/handoff.json` in the repo — plain JSON, forever readable |
| **Your session** | OpenCode's sync protocol (fast path), `export`/`import` fallback | ✓ carried in-band inside the bundle |

Target reachable? Direct push, instant — and `--steal` hands over
ownership. Target asleep? relay writes a portable bundle; carry it over
by any means and `relay receive` rebuilds worktree + commits + context +
session.

## 60-second start

```sh
npm install -g oc-relay
```

List your machines once (all of them — this is your compute pool):

```jsonc
// ~/.config/oc-relay/fleet.json  (override: $RELAY_FLEET)
{ "targets": {
    "nas":     { "baseUrl": "http://nas:49374",     "passwordEnv": "NAS_RELAY_PASS",     "repoDir": "~/code/myapp" },
    "desktop": { "baseUrl": "http://desktop:49374", "passwordEnv": "DESKTOP_RELAY_PASS", "repoDir": "~/code/myapp" },
    "gpu-box": { "baseUrl": "http://gpu-box:49374", "passwordEnv": "GPUBOX_RELAY_PASS",  "repoDir": "~/srv/myapp" } } }
```

Then, from inside your repo:

```sh
relay ping                    # who's alive?
relay send --target nas       # move code + context
relay send --target nas --session ses_x --steal   # + move the session off this machine
relay send --target nas --context-file ctx.json
# target offline? a handoff.json + .bundle sidecar are written instead:
relay receive --bundle relay-bundle-*.json --into ~/code/myapp
```

New machine on the tailnet? `relay enroll gpu-box --repo-dir ~/srv/myapp`
discovers and registers it. Inside OpenCode, `relay init` installs the
palette command **Relay: send session** (`/relay`) for the same flow.

## Commands

| Command | What it does |
|---|---|
| `relay send [--steal]` | Route work to a machine: direct push, or bundle if unreachable. `--steal` moves the session off this machine after the target takes it |
| `relay init [--force]` | Install the OpenCode GUI: palette picker, `/relay`, and agent tools |
| `relay receive` | Unpack a carried bundle: worktree, commits, context, session |
| `relay targets` | List your fleet — the machines work can go to |
| `relay ping [--all] [--port N]` | Reachability. `--all` adds discovered tailnet peers — **strictly opt-in, never scans unless asked**; `--port` overrides the peer probe port |
| `relay enroll` | Add a machine to the fleet (auto-discovers its URL on your tailnet) |
| `relay doctor` / `relay apply` | Audit / converge a machine's env against `.opencode/env.json` |
| `relay authz new` | Mint a one-time approval — prints a claim URL + QR for your phone |
| `relay serve-approvals` | Run the phone-approval endpoint (loopback by default) |

## Security you don't have to think about

- **Secrets never touch disk.** Credentials resolve from env vars at use time.
- **Approvals are one-time.** Tokens are shown once, stored only as SHA-256
  hashes, valid for one tap and a TTL. A stolen link approves exactly
  nothing else, ever.
- **No ambient network scanning.** Discovery runs only when you pass
  `--all`. Privacy is the default, not a setting.
- **Atomic, locked state.** Concurrent relay processes can't corrupt or
  double-consume approvals; crashed locks self-heal.

## The receipts

Most tools ask you to trust the README. This one ships proof:

- **100% coverage** — every line, branch, and function, enforced in CI
- **2,008 mutants killed, 0 survivors** — an automated saboteur rewrote
  the code thousands of ways ("flip this check", "delete this guard");
  every single one was caught by a test. The three exemptions that exist
  are documented with reasons and audited.
- **23 end-to-end scenarios** drive the real binary with real git:
  offline transfers, session steals, phone approvals, corrupted
  configs, concurrent writes — [the whole map](TEST-MATRIX.md).
- **Synthetic fixtures only.** No test ever touches a real network,
  tailnet, or hostname. ([Why that matters](CONTRIBUTING.md#the-rules).)

```sh
npm run check       # typecheck + tests + 100% coverage gate
npm run test:e2e    # 23 scenarios against the real binary
npm run mutate      # the saboteur. 2,008 attempts, zero survivors.
```

## Built for OpenCode

relay is the missing client for OpenCode's own cross-machine sync
protocol — the same internal path their tools use (history, replay, and
steal), productized for everyone, with the stability contract written
down and mutation-tested. Adapters are swappable slots (discovery,
secrets, transport): Tailscale is a *reference implementation*, never a
hard dependency. If you have git and an OpenCode server on each machine,
you have 100% of relay.

We'd love to see this upstreamed or featured in the plugin ecosystem.

## Contributing

TDD-first, 100%-or-documented-exemption, three-OS CI. Start with
[CONTRIBUTING.md](CONTRIBUTING.md) and [TEST-MATRIX.md](TEST-MATRIX.md).

## License

[MIT](./LICENSE)
