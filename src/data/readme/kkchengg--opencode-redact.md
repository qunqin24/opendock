# opencode-redact

**Two-way secret redaction for [OpenCode](https://opencode.ai) v2.**

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

[![npm](https://img.shields.io/npm/v/%40kkchengg%2Fopencode-redact)](https://www.npmjs.com/package/@kkchengg/opencode-redact)
[![license](https://img.shields.io/npm/l/%40kkchengg%2Fopencode-redact)](./LICENSE)

`opencode-redact` replaces API keys, tokens, passwords and other secrets in your
OpenCode conversation with stable placeholders **before** they are sent to the
model, then swaps them back **just before a tool runs**. The model never sees the
secret; the tool still gets the real value.

## Why

OpenCode v2 changed the plugin API, so V1 privacy plugins such as
`opencode-vibeguard` no longer load — and v2 ships no built-in redaction.
`opencode-redact` fills that gap with a small, dependency-free plugin written for
the v2 hook API.

## How it works

```text
                    redact                     rehydrate
prompt ──▶ [REDACTED:aws-access-key:…] ──▶ model ──▶ tool input ──▶ real secret
           (prompt + context hooks)                 (execute.before hook)
```

- **`prompt`** — redacts the text you type, before it is persisted.
- **`context`** — redacts the system prompt, message history (including earlier
  tool output) and tool definitions right before the request is sent.
- **`execute.before`** — swaps placeholders back to the real secret in the tool
  input, so the command that needs it still works.

Every secret becomes a stable token `[REDACTED:<rule>:<fingerprint>]`. The same
secret always yields the same token, so the model can still refer to it.

## Install

**From npm**

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@kkchengg/opencode-redact@latest"]
}
```

**As a local drop-in file** — copy `src/index.ts` to
`~/.config/opencode/plugins/redact/index.ts`. Global plugins are auto-loaded and
need no config entry.

## Detected secrets

| Rule | Matches |
|------|---------|
| `aws-access-key` | `AKIA…`, `ASIA…`, `AGPA…`, … |
| `gcp-api-key` | `AIza…` |
| `github-pat` | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` |
| `github-fine-grained` | `github_pat_…` |
| `gitlab-pat` | `glpat-…` |
| `openai-key` | `sk-…`, `sk-proj-…` |
| `anthropic-key` | `sk-ant-…` |
| `slack-token` | `xoxb-`, `xoxa-`, `xoxp-`, `xoxr-`, `xoxs-` |
| `stripe-key` | `sk_live_`, `sk_test_`, `rk_live_`, `rk_test_` |
| `npm-token` | `npm_…` |
| `pypi-token` | `pypi-…` |
| `jwt` | three dot-separated base64url segments starting `eyJ` |
| `private-key` | PEM `-----BEGIN … PRIVATE KEY-----` blocks |
| `credential` | `password: …`, `api_key=…`, `secret=…`, `token: …` |

## Coverage & limits

**Protected** — your prompt, system prompt, message history (incl. tool output)
and tool definitions on the way out; tool input on the way in.

**Not protected**

- Secret formats not listed above.
- Base64-encoded, encrypted or split secrets, and passwords with no `key = value` shape.
- Large/binary strings (`data:` URIs, oversized base64) are skipped on purpose so
  images and files are never corrupted.
- The vault is in-process: after a service restart, placeholders in old history
  can no longer be rehydrated.
- Rehydration depends on the model echoing a placeholder verbatim.

Redaction guards what leaves your machine. It is one layer of defence, not a
reason to paste real credentials into a conversation.

## Compatibility

OpenCode **v2.0.18+** (v2 `prompt`, `context`, `tool.execute.before` hooks) · Node **20+**.

## Development

```bash
npm install
npm run build     # tsc -> dist/
npm test          # build + node --test
```

## License

[MIT](./LICENSE)
