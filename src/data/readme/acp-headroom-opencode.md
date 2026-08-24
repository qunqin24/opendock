# acp-headroom

ACP+Headroom — mechanical tool-output compression for coding agents, fused with model-driven context management.

One host-agnostic core, thin per-host adapters:

| Package | Host | Status |
|---|---|---|
| [`acp-headroom-core`](packages/core) | — (pure logic) | stable |
| [`acp-headroom-pi`](https://www.npmjs.com/package/acp-headroom-pi) | [pi](https://github.com/earendil-works/pi) | published (standalone repo) |
| `acp-headroom-opencode` | OpenCode | this repo |

## How it works

Oversized tool results are compressed through a local
[Headroom](https://www.npmjs.com/package/headroom-ai) proxy (`POST /v1/compress`,
CCR mode) right before the LLM call. The model sees a short marker with
retrieval hashes; originals are backed up on disk and retrievable by hash via
the built-in `headroom_retrieve` tool. Proxy down ⇒ results pass through
uncompressed (fail-open).

## Shared configuration (all adapters)

```bash
HEADROOM_PROXY_URL=http://127.0.0.1:8787   # proxy base URL
HEADROOM_CCR_DIR=~/.acp-headroom/ccr       # disk backup dir
```

## License

MIT. Headroom protocol integration is Apache-2.0 (headroom-ai), used via local HTTP proxy only.
