# opencode-belweave

An [opencode](https://opencode.ai) plugin that adds the **Belweave Triad** provider — an
OpenAI-compatible aggregator gateway that routes to Claude, Gemini, GLM, GPT-OSS, and
MiniMax models through a single endpoint.

Install the plugin and the provider + its model catalog appear automatically. No manual
`provider` block in `opencode.json` is required.

## Install

### From npm

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-belweave"]
}
```

### From a local path (development)

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./packages/opencode-belweave"]
}
```

opencode runs on Bun, which loads the TypeScript entry directly — so no build step is
needed while developing against a local path.

## Configure your API key

Your key has the format `trd_live_...`. Provide it one of two ways:

**Option A — environment variable:**

```bash
export BELWEAVE_API_KEY=trd_live_xxxxxxxxxxxxxxxx
```

**Option B — interactive login (stored in opencode's credential store):**

Run `opencode`, then `/connect` → select **Belweave Triad** → paste your key.

## Use a model

Run `opencode`, then `/models` → pick a Belweave Triad model, e.g. **Claude Haiku 4.5** or
**GPT-OSS 20B**.

## Exposed models

16 models are exposed. Token limits are family-based estimates (used for opencode's context
accounting); costs are set to `0` until the gateway's pricing is confirmed — override them in
your own `provider.belweave` block if needed.

| Model id | Family |
| --- | --- |
| `claude-haiku-4-5` | Claude |
| `claude-opus-4-1`, `claude-opus-4-5`, `claude-opus-4-6` | Claude |
| `claude-sonnet-4-5`, `claude-sonnet-4-6` | Claude |
| `gemini-3-1-flash-lite`, `gemini-3-1-pro`, `gemini-3-5-flash` | Gemini |
| `glm-4-7-flash`, `glm-5` | GLM |
| `gpt-oss-120b`, `gpt-oss-20b` | GPT-OSS |
| `gpt-oss-safeguard-120b`, `gpt-oss-safeguard-20b` | GPT-OSS Safeguard (moderation) |
| `minimax-m2-5` | MiniMax |

> **Note:** `gpt-oss-safeguard-*` are moderation / safety models and are exposed with minimal
> capabilities (text-only, no tool calling). Use them for classification / guardrails.

## Overriding defaults

Anything you put under `provider.belweave` in `opencode.json` takes precedence over the plugin's
defaults, including adding or tweaking individual models:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-belweave"],
  "provider": {
    "belweave": {
      "models": {
        "claude-opus-4-6": { "name": "Opus 4.6 (team)", "limit": { "context": 200000, "output": 16384 } }
      }
    }
  }
}
```

## Requirements

- opencode `>= 1.17.0`

## Releasing (maintainers)

Releases are published to npm automatically by GitHub Actions using
[npm trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/) — no npm token is
stored anywhere. The [`publish` workflow](.github/workflows/publish.yml) runs on every published
GitHub Release; it typechecks, tests, builds, and then publishes with provenance.

To cut a release, run one of:

```bash
bun run release:patch   # 0.1.0 -> 0.1.1
bun run release:minor   # 0.1.0 -> 0.2.0
bun run release:major   # 0.1.0 -> 1.0.0
```

Each script bumps the version, pushes the tag, and creates a GitHub Release, which triggers the
publish workflow.

> **One-time setup:** trusted publishing requires the package to exist on npm first. After the
> initial bootstrap publish, configure the trusted publisher at
> `npmjs.com → opencode-belweave → Settings → Trusted Publisher`: provider **GitHub Actions**,
> repository `aravhawk/opencode-belweave`, workflow filename `publish.yml`.
