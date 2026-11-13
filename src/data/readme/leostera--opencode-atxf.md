# ATXF: Agent Transcript Exchange Format

Specification: **https://atxf.leostera.dev**

**ATXF** is a JSON Schema and JSONL format for exchanging coding-agent session transcripts between tools such as Pi, Codex, Claude Code, OpenCode and Gemini CLI.

> Status: **v0.1 draft**. Expect breaking changes until v1.

## Why

Every coding agent stores sessions differently: in-file trees, Responses-API rollouts, Anthropic message logs, SQLite event stores, op logs. Existing interchange formats such as [ATIF](https://github.com/harbor-framework/harbor/blob/main/rfcs/0001-trajectory-format.md) linearize sessions for evaluation, which loses branches, rewinds and compaction semantics.

ATXF aims to be general enough to hold any of these formats without losing their structure. For example, ATXF has a branching tree, OpenCode records tool lifecycles and Codex records turn policies. Each source record can also be carried verbatim alongside, so a converter can go back to the original format.

## Design in one screen

- **One JSONL file per transcript.** The first line is a `transcript` header. Records are append-only.
- **A tree.** Records link through `id`/`parentId`, and branches are never deleted. Rewinds, rollbacks and reverts become `leaf` moves.
- **Three layers on one tree:**
  - **context:** what the model saw (`message`, `context`, `compaction`, `context_edit`, `branch_summary`).
  - **state:** under which settings (`settings`).
  - **events:** what happened around the model (`turn`, `tool_status`, `usage`, `checkpoint`, `agent_link`, `custom`).
- **Provider-neutral messages.** Roles are `system | user | assistant | tool`. Content blocks are `text | image | resource | reasoning | tool_call`.
- **Opaque replay data** (thinking signatures, encrypted reasoning) travels in `replay`. It is passed back only to the provider that produced it.
- **Lossless escape hatch.** `native` carries the verbatim source records; `ext` and `custom` carry namespaced extras.
- **Fidelity is declared, not guessed.** The header says what the producer could capture: topology, instructions, reasoning, and so on.
- **Tamper-evident, like Git.** With `integrity` declared, each record's hash commits to its content and to the hashes of the records it references. `seal` records commit to the whole file, and a record can be proven to belong to a transcript from digests alone.

```jsonl
{"type":"transcript","atxf":"0.1","id":"t1","time":"2026-10-29T12:00:00Z","source":{"agent":"pi"}}
{"type":"message","id":"e1","parentId":null,"time":"2026-10-29T12:00:01Z","role":"user","content":"What does README.md say?"}
{"type":"message","id":"e2","parentId":"e1","time":"2026-10-29T12:00:03Z","role":"assistant","content":[{"type":"tool_call","id":"call-1","name":"read","arguments":{"path":"README.md"}}],"stop":"tool_use"}
{"type":"message","id":"e3","parentId":"e2","time":"2026-10-29T12:00:03Z","role":"tool","toolCallId":"call-1","content":"# Demo"}
```

## Contents

| Path | What |
| --- | --- |
| [`SPEC.md`](SPEC.md) | Normative semantics: tree, active leaf, context building, compaction, usage, replay |
| [`schema/v0.1/atxf.schema.json`](schema/v0.1/atxf.schema.json) | JSON Schema (draft 2020-12) for one record (one line) |
| [`docs/mappings.md`](docs/mappings.md) | How Pi, Codex, Claude Code, OpenCode, Gemini CLI and ATIF map onto ATXF |
| [`examples/`](examples) | Example transcripts in the style of each source |
| [`packages/atxf-ts/`](packages/atxf-ts) | `@leostera/atxf`: types, validator, hashes and seals, context building, lossless converters for Pi, Claude Code, Codex, OpenCode and Gemini CLI (`@leostera/atxf/pi`, …), reconciliation (`@leostera/atxf/reconcile`) and the `atxf` CLI |
| [`packages/atxf-rs/`](packages/atxf-rs) | The `atxf` Rust crate and binary: the same API, writing the same bytes and hashes as `@leostera/atxf` |
| [`scripts/`](scripts) | `cross-check.sh` and `cross-check-generated.ts`: the TypeScript and Rust implementations must agree byte for byte |
| [`fixtures/`](fixtures) | Native session files per agent, shared by the tests |
| [`specs/`](specs) | Feynman models of distributed behaviour: [`reconcile.ts`](specs/reconcile.ts) (copies of a session reconciled into one tree), [`stream-resume.ts`](specs/stream-resume.ts) (a live Pi session read across evictions and deploys) |
| [`sites/atxf.leostera.dev/`](sites/atxf.leostera.dev) | The specification website (Astro + Kumo), deployed to https://atxf.leostera.dev |

## Use it

```sh
npx @leostera/atxf validate path/to/session.atxf.jsonl      # Node 22+, or bunx
npx @leostera/atxf convert --from pi --to codex session.jsonl > rollout.jsonl
npx @leostera/atxf reconcile studio.atxf.jsonl laptop.atxf.jsonl > merged.atxf.jsonl
```

In this repository, `bun run atxf` runs the same CLI from source:

```sh
bun install
bun run atxf validate path/to/session.atxf.jsonl
bun run atxf convert --from pi --to codex session.jsonl > rollout.jsonl
bun run check   # typecheck and tests
```

From Rust, the crate has the same converters and commands:

```sh
cargo install --path packages/atxf-rs
atxf convert --from pi --to codex session.jsonl > rollout.jsonl
```

```rust
use atxf::{formats, Converter};

let transcript = formats::PI.to_atxf(&std::fs::read_to_string("session.jsonl")?, true)?;
let rollout = formats::CODEX.from_atxf(&transcript, true)?;
```

```ts
import { buildContext } from "@leostera/atxf";
import { reconcile } from "@leostera/atxf/reconcile";
import { pi } from "@leostera/atxf/pi";
import { codex } from "@leostera/atxf/codex";

const transcript = pi.toAtxf(await Bun.file("session.jsonl").text());
const rollout = codex.fromAtxf(transcript); // Codex can continue it; reading it back gives `transcript`
```

### One session across agents

The [Pi extension](packages/pi-atxf) and the [OpenCode plugin](packages/opencode-atxf) add `/atxf export`,
`/atxf import` and `/atxf join <file>`. Agents that join the same file share one session: each pushes its turns
when it finishes them and pulls the others' turns while it is idle.

```sh
pi install npm:@leostera/pi-atxf
opencode plugin add @leostera/opencode-atxf
```

`bun run e2e` runs both with scripted models, in temporary directories.

## Versions

Packages have their own versions. The format version they implement is separate: `ATXF_VERSION` (written) and
`ATXF_VERSIONS` (accepted) in `@leostera/atxf` and the `atxf` crate, and `atxf.protocols` in each package's
`package.json`. Every package today implements ATXF 0.1. ATXF 0.2, which adds attribution, is a proposed draft: [`SPEC-v0.2.md`](SPEC-v0.2.md), from [RFD0001](docs/rfds/RFD0001-actors.md).

## Roadmap

- Conformance fixtures for the reference `buildContext` (SPEC §5).
- Signed seals.
- ATXF to ATIF.
- Streaming converters for every format; Pi streams, resumable from a saved state, in `@leostera/atxf` (`pi.stream`) and the `atxf` crate (`PiStream`); the others do not yet.

## License

MIT
