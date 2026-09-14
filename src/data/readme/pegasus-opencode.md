# Pegasus

Ontology-based long-term memory for LLM coding agents — a knowledge graph
that mirrors human associative memory instead of a flat text summary bolted
onto a system prompt. This README is the source of truth for the project;
it supersedes the older design drafts and notes that used to live in
`Documentation/` (kept locally, no longer published from this repo).

## Why

The common way to give an LLM agent long-term memory is a running text
summary, re-injected into every conversation. That has three failure modes:

- **Irrelevant information always enters context.** Every fact ever stored
  shows up in every conversation regardless of relevance — ask about an
  unrelated topic and the model still surfaces something from months ago.
- **Episodic nuance is destroyed.** A summary knows the fact, not the
  texture — the specific wording, tone, and context that made it worth
  remembering in the first place.
- **The store doesn't self-organize.** Importance and recency have to be
  manually re-ranked on every write; nothing fades or strengthens on its own.

Pegasus replaces the flat summary with a **knowledge graph**: recall is
selective, context-triggered, and proportional to connection strength rather
than recency of an explicit write. The graph is the navigation structure;
episodic content (exact wording, nuance) lives in edge snippets, not in the
graph topology. Grounded in Complementary Learning Systems theory and
Spreading Activation Theory (Collins & Loftus, 1975) — it's a plain graph
data structure, not a neural network.

This is **Phase 1**. The long-term direction is to eventually replace the
external graph store with an encoder-only transformer whose weights *are*
the memory — Phase 1 exists partly to produce `(graph, conversation)` pairs
as training data for that, so keeping it inspectable is a deliverable in its
own right, not just a convenience.

## How it works

Three processes that never run concurrently and share no mutable state
(a correctness requirement, not a performance one):

| Process | When | Role |
|---------|------|------|
| **Write** | After a conversation ends | Extract entities/relationships → resolve against the existing graph → persist. Analogous to sleep-phase memory consolidation. |
| **Read** | Before every response | Seed activation from the user's message → spread it through the graph → inject the result into context. Analogous to associative recall. |
| **Decay** | Continuous / self-gated | Exponentially decays edge strength over time. Independent of Read/Write. |

**Data model**
- **Nodes** are canonical named concepts (`PERSON::sarah`, `ORG::walmart`) —
  time-invariant facts only (DOB, nationality). Nodes never decay or expire;
  a node's persistence is implied by whether any live edge still references it.
- **Edges** are directional relationships (`source::RELATION::target`) — the
  primary unit of memory. Freeform, verb-first relation labels
  (`WORKS_AT`, `COMPLAINED_ABOUT`); carry a `strength` that decays and
  reinforces over time, a `confidence`, a `stability` class, and a
  **snippet** — a short verbatim excerpt, the actual episodic content.
- **Episodes** are per-conversation records used for provenance and snippet
  ranking, binding everything extracted from one conversation together so
  a whole relevant conversation can surface as a unit.

**Write**: a context-assembly pass gathers the relevant slice of the existing
graph (deterministic, no LLM), then one extraction call reads the full
conversation plus that context and proposes entities/relationships, then a
merge stage resolves each proposed entity against the existing graph
(deterministic candidate generation, LLM disambiguation only when genuinely
ambiguous — a missed merge just creates a recoverable duplicate; a wrong
merge permanently and unrecoverably fuses two distinct concepts, so the
system is deliberately conservative), then a fully deterministic write stage
persists it all with an audit trail.

**Read**: nouns are extracted from the user's message, embedded, and matched
against precomputed node embeddings to find seed nodes; activation then
spreads outward through the graph (multi-source, asymmetric forward/reverse
traversal, capped hop depth), and nodes that cross an activation threshold
get injected — a terse relationship line for a weak match, a full snippet
for a strong one. A model can also call a deep-retrieval tool on demand for
anything the injected context doesn't cover.

**Decay**: edge strength follows `S(t) = S0 * e^(-λt)`, with `λ` set by a
per-edge stability class (immutable/stable/mutable/time_bound/ephemeral).
Traversing an edge during Read reinforces it (logged during Read, applied at
Write) — repeated activation keeps a memory strong, the same way repeated
recall strengthens a real memory. Dormant edges are flagged, never deleted —
nothing is truly forgotten, only weakened toward inaccessibility.

## Repository layout

| Directory | Role |
|-----------|------|
| `engine/` | The standalone Python memory engine — model, store, extractor, merge, retriever, decay, and an HTTP service exposing a host-agnostic contract (plain JSON in, plain JSON out; no host types leak in). |
| `plugin/` | `pegasus-opencode` — the packaged [opencode](https://opencode.ai) integration. Install it and it runs itself: no API keys (generation rides on opencode's own authenticated model access), no separate service to babysit (bootstrapped and self-shutting-down on idle), no embeddings API (runs fully local). |
| `cluster/` | Optional self-hosted inference setup (Slurm/GPU) for running the engine's generation/embedding backends without any hosted API — used for heavier dogfooding, not required for normal use. |

Planned: additional host integrations alongside `plugin/` for other coding
agents (Claude Code, Codex, etc.), each its own package in this same repo —
the engine itself is host-agnostic by design, so a new integration is a thin
adapter, not a fork.

## Getting started

For opencode, the whole install is:

```bash
opencode plugin pegasus-opencode
```

No API key, no separate process to start — see `plugin/README.md` for what
that actually does under the hood and how to configure it.

To run the engine standalone (for development, or a different host
integration):

```bash
cd engine && uv venv && uv pip install -e ".[dev,llm]"
uv run pytest                        # hermetic test suite
uv run python -m ontomem.service     # HTTP service on http://127.0.0.1:8765
```

See `engine/README.md` for the full contract and configuration options.

## Status

Phase 1 (the knowledge graph engine, this repo) is implemented and tested —
extraction, merge/entity-resolution, retrieval, decay, and the opencode
integration are all in place. Tunable parameters (node budget, activation
thresholds, decay rates) are provisional, calibrated against real usage
rather than fixed.

## License

MIT — see [LICENSE](LICENSE).
