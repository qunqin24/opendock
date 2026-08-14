# opencode-agent-cpa-env-switcher-plugin

OpenCode server plugin that selects the active CPA provider from `CPA_PROVIDER`
and rewrites configured model provider prefixes in memory at startup.

Supported provider IDs:

- `cpa-local`
- `cpa-jp-edge`
- `cpa-van-base`

The plugin rewrites known CPA provider prefixes and the literal
`{env:CPA_PROVIDER}` placeholder. Model IDs, variants, prompts, permissions, and
unrelated providers remain unchanged.

## Environment-neutral agent files

OpenCode expands `{env:VAR}` references in `opencode.json` before parsing, but
it does **not** expand them inside agent Markdown frontmatter. To keep agent
files environment-neutral, write the literal placeholder as the model prefix:

```markdown
---
mode: subagent
model: "{env:CPA_PROVIDER}/gpt-5.6-sol"
---
```

The unexpanded `{env:CPA_PROVIDER}` prefix reaches this plugin at startup and is
rewritten to the selected provider, exactly like a concrete `cpa-local`,
`cpa-jp-edge`, or `cpa-van-base` prefix. Agent files therefore never name a
specific endpoint and switching environments creates no Git diff.

## Install

Add the unpinned package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-agent-cpa-env-switcher-plugin"
  ]
}
```

OpenCode installs the current package release when it resolves the plugin.

## Environment

Set the selected provider before starting OpenCode:

```bash
export CPA_PROVIDER="cpa-van-base"
```

The plugin does not load `.env` files. Source your environment file before
launching OpenCode.

Example shell function:

```bash
opencode() {
  source "$HOME/.config/opencode/.env"
  command opencode --auto "$@"
}
```

## Provider configuration

The selected provider must exist in the resolved OpenCode configuration. Raw
environment substitution happens before JSON parsing, so the provider ID and
display name can both be environment-driven:

```json
{
  "model": "{env:CPA_PROVIDER}/gpt-5.6-sol",
  "small_model": "{env:CPA_PROVIDER}/gpt-5.6-luna",
  "provider": {
    "{env:CPA_PROVIDER}": {
      "name": "{env:CPA_PROVIDER_NAME}",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "{env:CPA_BASE_URL}/v1",
        "apiKey": "{env:CPA_API_KEY}"
      },
      "models": {
        "gpt-5.6-sol": {
          "name": "GPT-5.6 Sol"
        },
        "gpt-5.6-luna": {
          "name": "GPT-5.6 Luna"
        }
      }
    }
  }
}
```

## What is rewritten

At startup the plugin updates the provider prefix for:

- the top-level `model`
- `small_model`
- every primary agent and subagent model
- deprecated `mode` agent entries
- command-specific models

A prefix is rewritten when it is `cpa-local`, `cpa-jp-edge`, `cpa-van-base`, or
the literal `{env:CPA_PROVIDER}` placeholder. For example, with
`CPA_PROVIDER=cpa-van-base`:

```text
cpa-jp-edge/claude-fable-5
{env:CPA_PROVIDER}/claude-fable-5
```

both resolve in memory as:

```text
cpa-van-base/claude-fable-5
```

Tracked agent files are not modified, so switching environments does not create
a Git diff.

Models belonging to providers other than `cpa-local`, `cpa-jp-edge`, and
`cpa-van-base` are left unchanged.

## Failure behavior

OpenCode startup fails clearly when:

- `CPA_PROVIDER` is missing
- `CPA_PROVIDER` is not one of the supported IDs
- the selected provider is absent from the resolved provider configuration

Credentials are never read or logged by this plugin.

## Development

```bash
npm install
npm run check
npm pack --dry-run
```

## Publishing

CI runs on pushes and pull requests using supported Node.js versions.

Publishing runs automatically when a matching version tag is pushed:

```bash
npm version patch
git push origin main --follow-tags
```

The package version must match the tag (`0.1.1` requires `v0.1.1`). The publish
workflow uses npm trusted publishing with GitHub Actions OIDC and provenance.

After the initial npm publication, configure the package's npm trusted publisher:

- Provider: GitHub Actions
- GitHub owner: `caoool`
- Repository: `opencode-agent-cpa-env-switcher-plugin`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`
