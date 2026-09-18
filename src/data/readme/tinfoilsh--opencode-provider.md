# Tinfoil provider for opencode

Use [Tinfoil](https://tinfoil.sh)'s verifiably-private open models from the
[opencode](https://opencode.ai) coding agent. Inference runs inside hardware
secure enclaves that even Tinfoil cannot read into.

[![npm](https://img.shields.io/npm/v/@tinfoilsh/opencode-provider)](https://www.npmjs.com/package/@tinfoilsh/opencode-provider)
[![Documentation](https://img.shields.io/badge/docs-tinfoil.sh-blue)](https://tinfoil.sh/coding-agents)

## Setup

1. Install the plugin:

   ```bash
   opencode plugin @tinfoilsh/opencode-provider --global
   ```

2. Set your API key:

   ```bash
   opencode auth login
   ```

   Pick **Tinfoil**, then paste your key from the
   [Tinfoil Dashboard](https://dash.tinfoil.sh).

3. Pick a Tinfoil model with `/models`, or run one directly:

   ```bash
   opencode run --model tinfoil/gpt-oss-120b "explain this repo"
   ```

## How verification works

When opencode starts, the plugin uses the
[`tinfoil` SDK](https://github.com/tinfoilsh/tinfoil-js) to verify the inference
enclave: it checks the enclave's attestation, confirms the running code against
the release digest signed in Sigstore, and binds the attested key to the live
connection. Every request body is then encrypted end-to-end with HPKE, so only
the verified enclave can read it.

The plugin fails closed. If verification does not succeed, requests are refused
before anything leaves your machine, including your API key, your prompts and
your code.

## Seeing the verification state

The sidebar shows a Tinfoil section, above Context and LSP:

```
    Tinfoil ✓ encrypted
      v0.0.145 · 43fe4ff77e94
```

For the full verification document run **`/tinfoil`**,
or open the command palette (`ctrl+p`) and pick **Tinfoil: verification
details**.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `TINFOIL_API_KEY` | _(none)_ | Your `tk_…` key, for headless workflows. Not needed if you use `opencode auth login`, the preferred login for everyday operation. |
| `TINFOIL_DEBUG` | _(unset)_ | Log verification and model discovery to stderr. |
