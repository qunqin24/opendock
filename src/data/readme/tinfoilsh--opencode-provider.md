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

   Use this command rather than editing your config by hand. The plugin has two
   halves, the provider and the sidebar panel, and the command registers both.

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

opencode already knows the `tinfoil` provider through
[models.dev](https://models.dev), so there is no base URL, API key or model list
to add to `opencode.json`, and no local proxy to run.

## How verification works

When opencode starts, the plugin uses the
[`tinfoil` SDK](https://github.com/tinfoilsh/tinfoil-js) to verify the inference
enclave: it checks the enclave's attestation, confirms the running code against
the release digest signed in Sigstore, and binds the attested key to the live
connection. Every request body is then encrypted end-to-end with HPKE, so only
the verified enclave can read it.

The plugin fails closed. If verification does not succeed, requests are refused
before anything leaves your machine, including your API key, your prompts and
your code:

```
Error: Tinfoil: refusing to send this request. Enclave verification failed: <reason>
```

Verification is retried on the next request, at most once every 30 seconds.

This is not a full external verifier: there is no independent AMD
signature-chain check. For that, use
[tinfoil-cli](https://github.com/tinfoilsh/tinfoil-cli).

## Seeing the verification state

The sidebar shows a Tinfoil section, above Context and LSP:

```
    Tinfoil ✓ encrypted
      v0.0.145 · 43fe4ff77e94
```

| Sidebar | What it means |
| --- | --- |
| `Tinfoil ✓ encrypted` | Verified. Requests are sealed to this enclave. |
| `Tinfoil ! UNVERIFIED` | Verification failed. Requests are blocked. |
| `Tinfoil ! NOT PROTECTED` | opencode is not sending through the plugin, so nothing is verified or encrypted. Please [report it](https://github.com/tinfoilsh/opencode-provider/issues). |
| `Tinfoil · checking…` | The first attestation is still running. |

No Tinfoil section at all means the plugin is not loaded, and you are not
verified. Start opencode with `TINFOIL_DEBUG=1` to see why.

For the full verification document — release tag and digest, code and enclave
fingerprints, attested keys, and every verification step — type **`/tinfoil`**,
or open the command palette (`ctrl+p`) and pick **Tinfoil: verification
details**. It opens in the terminal only: nothing is added to the conversation
and no context is re-sent.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `TINFOIL_API_KEY` | _(none)_ | Your `tk_…` key, for headless workflows. Not needed if you use `opencode auth login`, the preferred login for everyday operation. |
| `TINFOIL_DEBUG` | _(unset)_ | Log verification and model discovery to stderr. |

## Contributing

Bug reports and patches are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for
how to run the plugin from a checkout, and for the opencode plugin behaviour
worth knowing before you change anything.

## License

[Apache-2.0](LICENSE)
