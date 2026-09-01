# Veris for Daytona

Run code in a [Daytona](https://daytona.io) sandbox where calls to
`api.stripe.com` and the rest of your vendor stack are answered by **Veris
twins** — stateful, contract-accurate fakes — with the code under test
completely unmodified.

No base-URL overrides, no injected config, no mocking library. Your code keeps
its production hostnames, credentials and SDKs; the network layer does the rest.
And every run ends with a **receipt** of what the vendor actually received.

| package | | |
|---|---|---|
| **[`@veris-ai/daytona`](veris-daytona/)** | a drop-in for `@daytona/sdk` | run your own code against twins |
| **[`@veris-ai/daytona-opencode`](daytona-opencode/)** | an [OpenCode](https://opencode.ai) plugin | every agent session runs in one of these sandboxes |

Each has its own README with installation and usage. This page is about how they
work and how to develop them.

## How it works

Every sandbox is created with two Daytona parameters:

- **`domainAllowList`** — the vendor hostnames the twin answers for, the gateway
  itself, the twin's data planes, and package registries. Nothing else leaves.
- **`outboundProxyUrl`** — the Veris gateway, over HTTP CONNECT.

Daytona chains them: sandbox traffic reaches Daytona's own proxy, which drops
anything not allowlisted and forwards the rest to the gateway, which answers
vendor hostnames from the twin. This is the same tier `@veris-ai/e2b` uses.

Nothing of ours runs inside the sandbox, so any image works — there is no
snapshot to register, no `NET_ADMIN` to request, and no environment to thread
through individual commands.

**Why allowlisting vendor hostnames is not a leak.** It reads backwards, but the
allowlist is not what stands between the sandbox and the real vendor — the
gateway is. A vendor host that is *absent* never reaches the gateway and so
never reaches the twin; it is simply blocked. And Daytona's enforcement is not a
convention a client can opt out of: stripping every proxy variable does not let
a process reach an allowlisted host directly.

**The canary.** Before `create()` resolves, a probe dials a reserved hostname
only the gateway answers, whose body carries the twin id. It proves in one
request that egress is tunnelled, that the credential reached the right twin,
and that trust is wired — and it cannot pass by accident, because outside the
tunnel that host has no listener. It runs again on every `receipt()`, so a
receipt is never reported from a sandbox whose egress cannot be vouched for.

**CA trust**, which is subtler here than it looks. A MITM gateway presents a
certificate it forged for the vendor hostname, and whoever validates it must
trust the signing CA. On Daytona there are *two* proxies in the chain and the
client's TLS peer is the near one: Daytona terminates TLS with a certificate
signed by its own CA, already trusted in the image, and re-originates to the
gateway. The Veris CA is therefore not in the client's validation path today.

It is installed regardless. If Daytona tunnels `CONNECT` end-to-end instead —
the ordinary behaviour for an HTTP proxy — the gateway's certificate reaches the
client directly and nothing works without it. A bundle is assembled inside the
sandbox from the distribution's public roots plus ours, requiring nothing of the
image, and the trust variables Daytona does not itself set (`PIP_CERT`,
`CARGO_HTTP_CAINFO`, `DENO_CERT` and a dozen more) point at it.

**On `socks_address`.** The egress credential also carries a SOCKS endpoint,
which is what `@veris-ai/e2b` uses. Daytona cannot: it accepts only
`http`/`https` outbound proxies, which is why the gateway has an HTTP CONNECT
listener.

## Limitations

- **Requires a Veris control plane that serves an HTTP CONNECT gateway.**
  Without one, `create()` fails at `credential-mint` saying so.
- **Interception depends on Daytona intercepting TLS itself.** The client's
  certificate chain terminates at Daytona's CA, not ours. If that changes, the
  Veris CA becomes load-bearing — it is already installed for that reason, but
  that path is untested.
- **Git sync into the sandbox can fail** with `Host key verification failed`.
  Inherited from upstream `@daytona/opencode`; the agent works, but local
  changes are not pushed in. Setting `DAYTONA_SSH_KNOWN_HOSTS` is the likely fix.
- **QUIC/HTTP3 and ECH are not intercepted.** The gateway relays TCP; both are
  reported in the receipt's `leaks` rather than silently omitted.

## Layout

| directory | package |
|---|---|
| `veris-daytona/` | `@veris-ai/daytona` |
| `daytona-opencode/` | `@veris-ai/daytona-opencode`, forked from `@daytona/opencode` 0.192.0 |

Both npm packages sit under the `@veris-ai` scope, which already says "Veris",
so neither name repeats it. `@veris-ai/daytona` is the engine integration,
mirroring `@veris-ai/e2b`; `@veris-ai/daytona-opencode` is the plugin built on
it. `<engine>-opencode` scales: a future E2B-backed plugin is
`@veris-ai/e2b-opencode`.

### Two meanings of "sandbox"

Held apart carefully throughout this codebase, because both are in play:

- a **Daytona sandbox** is the container your code runs in (`sandbox.id`)
- a **Veris twin** is the stateful fake answering its vendor calls
  (`sandbox.verisSandboxId`, `VERIS_SANDBOX_ID`)

Never write "sandbox" bare in a log line, error, or doc here.

### The plugin fork is one import line

`@veris-ai/daytona` re-exports all of `@daytona/sdk` and overrides only
`Daytona`, so the entire behavioural diff against upstream is:

```diff
- } from '@daytona/sdk'
+ } from '@veris-ai/daytona'
```

in `daytona/core/session-manager.ts`. That one line carries twin provisioning,
the egress credential, the allowlist, the outbound proxy, CA trust and the
canary — because all of it lives inside `create()`. Twin teardown rides along
too: `@veris-ai/daytona` wraps `delete()` on the sandbox it returns, so the
plugin's existing `sandbox.delete()` removes the twin with no plugin change at
all. Beyond that the fork adds one tool, registers it, one paragraph in the
system prompt, and a check that the Veris coordinates are set.

`@daytona/sdk` is a **peer** dependency, which is load-bearing. The plugin
branches on `err instanceof DaytonaNotFoundError` to tell "this sandbox is gone,
replace it" from "transient failure, keep the session mapping" — and
`tools/bash.ts` imports that class from `@daytona/sdk` directly while
`session-manager.ts` imports from us. Two copies of the SDK in one tree and
those checks silently return `false`. `tests/unit/exports.test.ts` fails loudly
if that ever regresses.

## Developing

See [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
npm install          # workspaces link @veris-ai/daytona into the plugin
npm run typecheck
npm test             # unit tests, no credentials needed

# live, costs money, needs all three keys:
npm run smoke
```

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE) — `daytona-opencode/` is
a fork of `@daytona/opencode`, Copyright Daytona Platforms Inc.
