# ai& for OpenCode

Add [ai&](https://aiand.com) as a provider in [OpenCode](https://opencode.ai) with a single plugin.

## What you get

An **ai&** provider in OpenCode that:

1. **Routes to the ai& gateway** — `https://api.aiand.com/v1` (OpenAI-compatible).
2. **Logs in cleanly** — `opencode auth login` → **ai&** → paste your `sk-...` key.
3. **Lists the live catalog** — the model picker is populated straight from ai&'s public
   `/v1/api.json`, so new models show up without touching the plugin.

Requires [OpenCode](https://opencode.ai) (`curl -fsSL https://opencode.ai/install | bash`).

## Install

**One line** (installs OpenCode if missing, wires up the plugin, and offers to enable
[web search](#web-search)):

```bash
curl -fsSL https://opencode.aiand.com/install.sh | bash
```

Or do it by hand — reference the npm package in your `opencode.json` (per-project) or
`~/.config/opencode/opencode.jsonc` (global) — OpenCode installs it automatically on first run:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@aiand/opencode-plugin"],
  "model": "aiand/zai-org/glm-5.2"
}
```

Then log in and run:

```bash
opencode auth login                 # choose ai& → paste your sk-... key
opencode                            # TUI
opencode run "say hi in one word"   # one-shot
```

(Non-interactive alternative: `export AIAND_API_KEY=sk-...` instead of `auth login`.)

> **Version pinning:** a bare `"@aiand/opencode-plugin"` installs the latest version on first
> run and keeps using that cached copy afterwards. To pin (or force an upgrade), use an explicit
> version — `"@aiand/opencode-plugin@0.1.0"` — which OpenCode caches separately per version.

## Auth

- **Main path:** `opencode auth login` → choose **ai&** → paste your `sk-...` key. The key is
  stored by OpenCode and used for every project.
- **Alternative (non-interactive / CI):** `export AIAND_API_KEY=sk-...`.

The model picker and catalog populate **without** a key (`/v1/api.json` is public); a key is
only needed to actually send a message. Get one at [aiand.com](https://aiand.com).

## Web search

OpenCode ships a built-in web search tool (via [Exa](https://exa.ai) — free, no API key), but for
third-party providers like ai& it's gated behind an environment variable:

```bash
export OPENCODE_ENABLE_EXA=1
```

The [installer](#install) offers to add this line to your shell profile (`~/.zshrc` / `~/.bashrc`)
for you — it's the "Enable web search?" question. To set it up by hand, add the export line to
your shell profile and open a new terminal (fish: `set -Ux OPENCODE_ENABLE_EXA 1`).

**OpenCode Desktop (GUI):** no extra steps — the app sources your login shell's environment at
startup, so the same profile line applies. Restart the app after adding it. If your setup somehow
doesn't pick it up, launching the app from a terminal where the variable is exported also works.

## How it works

The plugin uses two OpenCode hooks:

| Hook | What it does |
|---|---|
| `config` | fetches ai&'s public `/v1/api.json` and registers the `aiand` provider (`@ai-sdk/openai-compatible`, `baseURL`) **with the live model list injected inline** |
| `auth` | adds the "ai& API Key" login method; injects the stored key as `Bearer` |

> Why inline models (not the `provider.models()` hook)? OpenCode only runs `provider.models()`
> for providers already known to models.dev; a brand-new provider's models must be declared in
> config. The `config` hook runs *before* OpenCode reads `cfg.provider`, so fetching the catalog
> there and setting `provider.aiand.models` is what makes the picker show ai&'s live models.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `AIAND_API_KEY` | — | Your ai& API key (alternative to `opencode auth login`). |
| `AIAND_BASE_URL` | `https://api.aiand.com/v1` | Override the gateway base URL. |
| `OPENCODE_ENABLE_EXA` | — | Set to `1` to enable OpenCode's built-in [web search](#web-search) (read by OpenCode itself, not the plugin). |

## Contributing / local development

The plugin is a single module, `src/index.ts`. The repo's own `opencode.json` loads it as a
file plugin, so you can test changes without building or publishing:

```bash
git clone git@github.com:aiandlabs/aiand-opencode-plugin.git
cd aiand-opencode-plugin
opencode run "say hi in one word"   # loads ./src/index.ts directly
```

To use your checkout from other projects, reference it by absolute path in your global config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/aiand-opencode-plugin/src/index.ts"]
}
```

Build and check the published artifact shape (also run in CI):

```bash
npm install
npm run build        # tsc → dist/
npm run check:dist   # asserts the compiled entry satisfies OpenCode's plugin loader
```

### Releasing

Releases are automatic: bump `version` in `package.json` and merge to `main`. The `Publish`
workflow runs on every push to `main`; when it sees a version that isn't on npm yet, it
builds, checks the artifact, runs `npm publish` with provenance, and creates the matching
`v<version>` GitHub Release. Pushes without a version bump publish nothing.

## Next steps

- Add an OAuth login method as an alternative to API keys.
