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

`@veris-ai/daytona` also installs a `veris-daytona` executable, and it has five
verbs. `run` does the whole job in one command — box up, code in, suite run,
receipt read, everything down. The other four are that job cut into the pieces a
caller drives itself: `provision` wires a box on a twin you already have and
stops there, `push` puts code in it, `exec` runs a command in it with the trust
variables applied, `teardown` deletes it. The three middle ones exist because
Daytona's own CLI has no upload command and no way to set a variable on a
command it runs; whoever calls them still decides what the receipt proved. The
Veris-shaped half is identical either way and belongs here —
the egress credential, the 20-domain allowlist, the outbound proxy, the CA
bundle, the canary, the trust variables. The "did this run prove anything" half
belongs to the `veris` CLI, which already owns what a receipt means, what
`--require-service` means and what the exit codes mean.

## How it works

Every sandbox is created with two Daytona parameters:

- **`domainAllowList`** — the vendor hostnames the twin answers for, the gateway
  itself, the twin's data planes, the twin's own host where a service can only
  be reached there, and package registries. Nothing else leaves.
- **`outboundProxyUrl`** — the Veris gateway, over HTTP CONNECT.

Daytona chains them: sandbox traffic reaches Daytona's own proxy, which drops
anything not allowlisted and forwards the rest to the gateway, which answers
vendor hostnames from the twin. This is the same tier `@veris-ai/e2b` uses.

**Daytona caps that list at 20 domains**, and a large environment fills it: nine
vendor hostnames plus the gateway leave room for half the default registry list.
Everything the twin cannot work without is kept, the registries are trimmed from
the tail of `DEFAULT_REGISTRY_HOSTS`, and what was dropped is printed. If the
required hosts alone exceed 20, `create()` refuses and says so rather than
letting Daytona answer "Domain allow list cannot contain more than 20 domains".

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

**CA trust.** The gateway presents a certificate it forged for the vendor
hostname, signed by the Veris CA, and that certificate reaches the client
directly: Daytona tunnels the `CONNECT` end to end rather than terminating TLS
itself (measured: the leaf a sandbox sees for `api.stripe.com` is issued by
`Veris Gateway CA`). So the Veris CA is load-bearing. A bundle is assembled
inside the sandbox from the distribution's public roots plus ours, requiring
nothing of the image, and the trust variables Daytona does not itself set
(`PIP_CERT`, `CARGO_HTTP_CAINFO`, `DENO_CERT` and a dozen more) point at it.
Daytona then overwrites `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`
and `NODE_EXTRA_CA_CERTS` with its own bundle, which does **not** carry the
Veris CA and so cannot validate the chain — see the Limitations entry below for
what that breaks and how each runtime gets the right value back.

**Bundled CAs.** An SDK that ships its own CA file and loads it by path reads
none of those variables: stripe-python passes `verify=stripe.ca_bundle_path`,
and its first call fails with "Could not verify Stripe's SSL certificate" in a
sandbox where `curl`, Node and `requests` all succeed. `sbx.veris
.patchBundledCas()` appends the Veris CA to the known ones (certifi, pip's
vendored certifi, botocore, stripe, httplib2) — the Daytona-shaped version of
the veris CLI's `--patch-bundled-cas`. Run it after installing dependencies;
`veris-daytona run` does. Every sandbox also carries the same patcher as a
script at `/tmp/veris-patch-bundled-cas.sh`, which is how a `provision`ed box
gets patched by whoever installed the dependencies in it.

**On `socks_address`.** The egress credential also carries a SOCKS endpoint,
which is what `@veris-ai/e2b` uses. Daytona cannot: it accepts only
`http`/`https` outbound proxies, which is why the gateway has an HTTP CONNECT
listener.

## Limitations

- **Requires a Veris control plane that serves an HTTP CONNECT gateway.**
  Without one, `create()` fails at `credential-mint` saying so.
- **The canary probe and CA install need `curl` and a POSIX shell in the
  image.** A `python:3.12-slim`-style image fails at `create()` with
  `curl: not found` in the `canary` phase.
- **Python 3.13+ needs a gateway that mints strict-verifier-safe leaves.**
  Newer Python verifies with `VERIFY_X509_STRICT` and rejects a forged leaf
  without an Authority Key Identifier. The control plane fix is
  services-sandbox#1044; a control plane without it fails Python with
  `Missing Authority Key Identifier` while `curl` and Node succeed.
- **Daytona overwrites the CA variables, and its own CA file cannot verify
  the gateway's leaf.** Inside the sandbox `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`,
  `CURL_CA_BUNDLE` and `NODE_EXTRA_CA_CERTS` all point at Daytona's file, which
  lacks the Veris CA and is root-owned on a read-only mount. Measured with
  Python's `requests`: `unable to get local issuer certificate` with the
  inherited value, 200 with `REQUESTS_CA_BUNDLE=/tmp/veris-ca-bundle.crt`. So
  every runtime that reads one of those variables as its only trust source
  needs the Veris bundle exported per command. `veris-daytona run` does that;
  a command run any other way (the OpenCode plugin's bash tool, `daytona ssh`)
  inherits Daytona's value. The SDK serves the right values two ways for
  whoever runs the command: `sbx.veris.getTrustEnv()` when you can hand the
  process an env map, and `sbx.veris.trustPrelude()` — one line of shell
  `export`s — when all you can do is prefix a command line. Node is handled at
  create time instead
  (`NODE_OPTIONS=--use-openssl-ca`, which Daytona leaves alone, reading the
  system certificate directory the Veris CA is installed into; that install
  needs passwordless sudo and `update-ca-certificates`, both in Daytona's
  default image). curl returns 200 under the inherited value; it consults the
  system directory as well.
- **An SDK that bundles its own CA reads no variable at all.** stripe-python
  passes `verify=stripe.ca_bundle_path`, so the trust variables never reach it
  and the first Stripe call fails with "Could not verify Stripe's SSL
  certificate". `sbx.veris.patchBundledCas()` appends the Veris CA to the
  bundles listed above; run it after installing dependencies, because that is
  when they arrive. `veris-daytona run` calls it between `--setup` and the
  command. An SDK outside that list still fails, and its own error names the
  file to add.
- **`github.com` is not on the default allowlist.** The platform's route table
  maps it to the `github` twin, and the gateway resolves that table for every
  sandbox rather than only the services the environment deployed — so in an
  environment without a github twin the gateway forges a leaf for `github.com`
  (it verifies) and then dials a backend pod that does not exist, and every
  request gets an empty reply. Measured: `uv` could not fetch a CPython the
  image lacked. `codeload.github.com` and `raw.githubusercontent.com` are
  unaffected and remain allowed; an environment that *does* have the github
  twin gets `github.com` from its vendor routes, which is where it belongs.
- **A very long run's receipt is a floor, not a count.** The twin's log is read
  in pages of 1000 up to a budget; past that the count prints as `≥N` and
  `entry.capped` is true. Below the budget it is exact — the count used to stop
  silently at the server's default of 50.
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
