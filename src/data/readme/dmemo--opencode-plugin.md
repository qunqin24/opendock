# dMemo

**Private, decentralized, plug-and-play memory for AI agents.**

dMemo gives coding and personal agents (Claude Code, Codex, OpenCode, OpenClaw, Hermes) persistent
long-term memory that the agent's host never owns: memories are extracted locally with
[mem0 OSS](https://github.com/mem0ai/mem0), embedded locally (no embedding API calls), encrypted
to your wallet's public key, and persisted as an append-only chain of blobs on
[0G Storage](https://0g.ai). The only thing that ever leaves your machine is ciphertext.

- **Private by construction** — ECIES encryption to your wallet key; local embeddings
  (bge-small-en-v1.5 via fastembed); optional LLM steps route through 0G Compute Router's
  TEE-verified inference. Read the honest limits in [docs/disclosure.md](docs/disclosure.md).
- **Portable** — your memory is a wallet, not an account. Any host adapter restores the same
  memory chain from the same key, on any machine.
- **Verifiable** — every blob is Merkle-self-verified against its on-chain root before decrypt;
  tampering is detected, not trusted away.
- **Cheap** — a memory flush costs ~0.0012 0G on testnet; session restore is ~3 s
  ([docs/benchmarks.md](docs/benchmarks.md)).

## Quickstart

```bash
npx @dmemo/cli setup             # 0G mainnet (default)
npx @dmemo/cli setup --testnet   # free, throwaway chain — evaluate without spending
```

Generates (or imports) a wallet, writes `~/.dmemo/config.json`, offers to fund the account, and
installs the adapter for every supported host it detects. The memory leg needs no web sign-ins,
no API keys, and no accounts — just a funded wallet.

**Funding.** Memory writes cost ~0.0012–0.003 0G each, so the account needs a small balance.
`npx @dmemo/cli fund` (also offered by `setup`) handles every starting point from a local page: send
from a wallet you already have, convert crypto you hold on Base / Arbitrum / Optimism / Polygon /
BNB and more, or pay by card, Apple Pay, or Google Pay — that last one needs no wallet and no
crypto at all. On `--testnet` it is the faucet instead. `npx @dmemo/cli balance` checks it any time.

Re-running `setup` **keeps the wallet already on record** and just re-wires hosts — that key is
the only thing that can decrypt your memories, so replacing it takes an explicit `--new-wallet`
/ `--import-key` plus confirmation, and always leaves a timestamped `0600` backup
([details](packages/setup-cli/README.md#replacing-a-wallet)).

### Config precedence

Every host (Claude Code, Codex, OpenCode, OpenClaw, Hermes) resolves config the same way, so the
result of `dmemo setup` is visible everywhere identically:

1. a real environment variable (e.g. `DMEMO_PRIVATE_KEY=... opencode`) always wins,
2. otherwise `${DMEMO_HOME:-~/.dmemo}/config.json` (written by `dmemo setup`/`dmemo connect`,
   mode `0600`) is used,
3. otherwise dMemo reports it found neither — naming the exact path it looked for — and points
   you at `dmemo setup`, instead of silently doing nothing.

Precedence is per-key, not all-or-nothing: an env var covers just `DMEMO_NETWORK`, say, and the
rest still comes from the file.

## 30-second live demo

```bash
pnpm install && pnpm build && pnpm demo
```

Runs the whole story against the real 0G Galileo testnet: an agent learns six facts
locally → the delta is ECIES-encrypted and flushed to 0G Storage → the raw on-chain
bytes are shown to be pure ciphertext (a stranger's wallet decrypts to unparseable
garbage) → local state is wiped → a fresh session restores everything from chain with
nothing but the wallet key, and returns the identical search hit. Needs a funded
testnet wallet in `spike/.env` (see [docs/demo-video.md](docs/demo-video.md)).

## How it works

```
agent turn ──▶ mem0 OSS (local extraction + local embeddings)
                  │
                  ▼
        journaling vector store (delta log)
                  │  flush (per completion, fire-and-forget)
                  ▼
   encrypt (ECIES → your wallet pubkey) ──▶ 0G Storage blob
                  │                          (delta chain + periodic checkpoint)
                  ▼
   next session: resolve pointer via eth_getLogs → download → Merkle-verify → decrypt → replay
```

## Packages

| Package | What it is |
|---|---|
| [`packages/blob-spec`](packages/blob-spec) | Canonical encrypted-blob format (`dmemo/1`): encode/decode, versioning |
| [`packages/core`](packages/core) | `DmemoSession`: mem0 engine, journaling store, 0G storage client, flush/restore lifecycle, crypto-shred forget |
| [`packages/sdk-wrappers`](packages/sdk-wrappers) | Memory-augmented `fetch`/middleware for raw OpenAI & Anthropic SDK users + 0G Router client presets |
| [`packages/node-adapter`](packages/node-adapter) | Bundled hook scripts for Claude Code + Codex (private; build tool) |
| [`claude-dmemo/`](claude-dmemo) | Claude Code plugin + marketplace repo (`/plugin install dmemo`) |
| [`packages/opencode-plugin`](packages/opencode-plugin) | OpenCode plugin (every-turn recall, capture, compaction hook) |
| [`packages/openclaw-plugin`](packages/openclaw-plugin) | OpenClaw memory-slot plugin (recall, capture, dream consolidation) |
| [`packages/hermes-plugin`](packages/hermes-plugin) | Hermes `MemoryProvider` — native Python engine on the same blob spec, storage via a Node bridge |
| [`packages/setup-cli`](packages/setup-cli) | `npx @dmemo/cli setup` onboarding CLI (`connect`, `fund`, `balance`) |
| [`packages/integration-tests`](packages/integration-tests) | Live-testnet integration suite (private) |

## Docs

- [docs/disclosure.md](docs/disclosure.md) — what dMemo does *not* protect: on-chain metadata,
  key loss, TeeML vs TeeTLS, what "forget" really means. Read this before trusting it.
- [docs/benchmarks.md](docs/benchmarks.md) — measured latency, cost, and the LoCoMo
  flush/restore-invariance benchmark.
- [TASKS.md](TASKS.md) — the implementation spec and per-phase build log.
- [RELEASE.md](RELEASE.md) — publish checklist.

## Status

v0.1.0. All packages build (`pnpm -r build`) and pass tests (`pnpm -r test`);
integration-tested live on 0G Galileo testnet (chain 16602). The setup CLI now defaults to
0G mainnet (Aristotle, chain 16661), with testnet one `--testnet` away. Not yet published to npm.
Runs on **Node.js ≥ 20 and Bun** — Bun hosts (OpenCode loads plugins in-process under Bun) are
handled transparently by `@dmemo/core`, which routes mem0's `better-sqlite3` dependency to
`bun:sqlite` (see [packages/core](packages/core#runtime-support)).
Known open items: no TeeML chat model is currently live on the 0G testnet Router (private
inference for chat is pinned but unavailable until the catalog recovers), and true per-epoch
crypto-shred lands in v1.1.

## License

MIT — see [LICENSE](LICENSE).
