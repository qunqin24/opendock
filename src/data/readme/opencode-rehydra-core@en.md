<p align="center">
  <img src="https://framerusercontent.com/images/NT4xWP34VHd2Wlrk197je5BUi4.png?scale-down-to=512" width="400" alt="Rehydra" />
</p>

<p align="center">
  PII security for AI workflows, coding agents and browser workloads.<br/>
  Detects, replaces, encrypts, and <strong>rehydrates</strong> back when needed.
</p>

<p align="center">
  <a href="./README.md">中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-rehydra"><img src="https://img.shields.io/npm/v/pi-rehydra?color=blue" alt="npm" /></a>
</p>

<p align="center">
  <code>pi install npm:pi-rehydra</code>
</p>

## The Problem

When you send code, messages, or documents through an LLM, real names, emails, and API keys go with them. Existing anonymizers either strip PII permanently — which breaks the conversation — or merely mask it, which leaves the model unable to reason.

You need **pseudonyms** the LLM can work with and your tools can reverse.

## How Rehydra Solves It

1. **Detect** — Regex patterns catch structured PII (emails, phones, UK postcodes, IBANs, credit cards). An on-device NER model (ONNX, no cloud calls) catches soft PII (names, organizations, locations).
2. **Replace** — Each PII value gets a stable placeholder: `<PII type="PERSON" id="1"/>`. The LLM works with these instead of real data.
3. **Persist** — The same entity always gets the same ID, across every message in the session. The LLM maintains relational coherence without ever seeing real PII.
4. **Rehydrate** — When a response needs to become real again (a file write, a bash command, a final answer), Rehydra restores the original values from its encrypted map.

## Quick Start

### Pi extension

```bash
pi install npm:pi-rehydra
```

Add the package declaration and configuration in `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    { "source": "npm:pi-rehydra" }
  ],
  "rehydra": {
    "envFiles": [".env", ".env.local"],
    "redactValues": ["sk-live-abc123..."]
  }
}
```

It intercepts the conversation between [Pi](https://pi.dev) and the LLM: secrets from `.env` files are replaced with placeholders before they leave your machine and restored before tools execute. Messages sent to the model and tool results are scrubbed (`context_with_system` / `tool_result`); tool arguments and the final answer are rehydrated (`tool_call` / `message_end`). See the [Pi extension documentation](packages/pi-extension/README.en.md) for configuration, hooks, and limitations.

## Why Rehydra?

### Reversible, not destructive

Most PII libraries mask or redact permanently. Rehydra encrypts the original values with AES-256-GCM and restores them on demand. Anonymize for the LLM, rehydrate for your tools — a full round-trip, not a one-way street.

### Session-persistent identity

`PERSON_1` stays `PERSON_1` across every message in the conversation. When John Smith comes up in message 1, message 5, and message 20, the LLM sees the same placeholder every time. It can track relationships, reference earlier context, and produce coherent multi-turn output — without ever seeing real PII. Sessions persist to SQLite (server), IndexedDB (browser), or in-memory, so identity mappings survive restarts.

### Zero-trust, on-device

NER inference runs locally via ONNX Runtime (~280 MB quantized model). No API calls to external services. Works offline. PII never leaves your machine.

### Core capabilities

- **Secrets, not just PII**: beyond names, emails, and phone numbers, Rehydra detects API keys (OpenAI, Anthropic, Stripe, AWS, GitHub...), JWTs, private keys, database connection strings, and `.env` secrets.
- **Semantic enrichment for machine translation**: optional gender and scope attributes on PII tags (`<PII type="PERSON" gender="male" id="1"/>`, `<PII type="LOCATION" scope="city" id="2"/>`) preserve grammatical context for downstream systems.

## Address detection

The default regex registry detects UK postcode syntax and numbered English-language street addresses such as `34a Friskin Road`. Apartment identifiers are included when adjacent to a street address, as in `Flat 1\n34a Friskin Road`. A contiguous UK address block ending in a postcode is masked as one `ADDRESS`; a standalone postcode uses `POSTAL_CODE`. Bare apartment numbers, unnumbered buildings, and other countries' postal formats need custom recognizers or NER. Postcode matching checks syntax, not whether a postcode is currently assigned.

Disable `ADDRESS` or `POSTAL_CODE` through the detection policy to opt out of either recognizer.

## Case-id detection and tool-call blocking

The default generic case-id rule matches only `CASE` / `FILE` / `REF` / `TICKET` ids that carry an **explicit separator** (space, tab or hyphen) **and at least one digit**, such as `CASE-123456` or `TICKET-456789`; glue-on (`CASE123456`) and letters-only (`CASEABCDEF`) forms no longer match. This keeps real business ids while stopping short source identifiers such as `case CapPower:` from being replaced with placeholders. Declare other shapes with `createCustomIdRecognizer`. German ids and caller-provided patterns are unchanged.

Tool arguments (Pi `tool_call` and the proxy's built-in tool loop) are rehydrated **strictly** before local execution: every argument is restored and verified on a copy first, and any placeholder that cannot be resolved — not in this session's map, partial, missing map, or decryption failure — aborts the call instead of handing `<PII .../>` to the tool as a real value. Plain text rehydration and display paths stay lenient.
Tools that intentionally write tag examples (`write` / `edit`) can be exempted per tool name via `allowLiteralTagsIn`: unresolvable literal tags are kept and logged, while resolvable tags are still restored in every tool.

A placeholder can only be restored from the map of the **same session**. The Pi extension uses an in-memory map by default, so tags from before a process restart cannot be restored and such calls are blocked; use a persistent key provider and storage when you need to survive restarts.
## Packages

| Package | Description |
|---------|-------------|
| [`pi-rehydra`](packages/pi-extension/) | Pi extension — detects and replaces PII and secrets in Pi conversations, restoring them before tool execution and in the final answer |

## Documentation

- [Pi extension](packages/pi-extension/README.en.md)
- [中文](README.md)

## License

[MIT](LICENSE)
