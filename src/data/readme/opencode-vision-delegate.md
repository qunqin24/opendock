# OpenCode Vision Delegate

> **Disclaimer:** OpenCode Vision Delegate is an independent, community-built project. It is **not** built by, endorsed by, or affiliated with the opencode team. It is a port of [kilo-vision-bridge](https://github.com/chengsongren/kilo-vision-bridge) (itself based on [wezzard/opencode-vision](https://github.com/wezzard/opencode-vision), MIT) back to the opencode plugin SDK, and builds on their design.

## Introduction

Give text-only opencode orchestrators (GLM, DeepSeek, and similar models) eyes by delegating visual tasks to a vision-capable model through a dynamically registered vision subagent.

When the orchestrator model is text-only and a task needs pixels — not just accessibility metadata — the plugin's `vision` skill detects the visual intent, extracts a task-specific JSON response template, delegates the task, and parses the structured findings back into the conversation.

**Tool-first architecture.** Delegation targets a native plugin tool, `vision_analyze`, registered through the `@opencode-ai/plugin` `tool` hook. The tool runs the visual judgment in-process — it reads the listed image files and calls the configured vision model directly, so **no subagent nesting is required** and the tool works from any session, including subagent sessions. The skill calls `vision_analyze` first and falls back to spawning the `vision-agent` subagent only when the tool is unavailable in the session or the call fails with a provider/protocol/HTTP error. With the tool path, **`permission.task` configuration is not needed** for visual delegation.

### About the v2 plugin architecture

opencode is migrating to a new ("v2") internal plugin architecture. As of opencode 1.18, the v2 plugin surface covers agents, skills, catalog, commands, and integrations — but **not** custom tools, chat message/system transforms, or permission hooks, which are exactly what this plugin's core features need. The official plugin docs still document the hooks API ("v1") as the way to write plugins, and the `opencode plugin` installer loads it.

This package therefore ships **both entries in one default export**:

- `server` (hooks API) — full features: `vision_analyze` tool, per-model vision routing, image materialization, permission handling. **This is what `opencode plugin` loads today.**
- `setup` (v2 API) — forward compatibility: registers the `vision-agent` subagent and the vision skill through the v2 `agent`/`skill` domains. A v2 host that loads `setup` gets subagent + skill delegation (the tool-dependent features stay on the hooks entry until upstream v2 gains tool registration).

The two entries write disjoint registration systems, so there is no double-registration conflict if both loaders ever see the package.

## Requirements

- opencode 1.18+
- At least one configured provider with an image-capable model (`enabled_providers` and/or `provider` entries in opencode config). The plugin discovers models from your configured providers and opencode's cached model catalog (`~/.cache/opencode/models.json`) — it does not ship a fixed model list.

## Installation

```bash
# install globally (available to all projects) — installs the package and patches the config
opencode plugin opencode-vision-delegate --global

# or install for the current project only
opencode plugin opencode-vision-delegate

# or install straight from GitHub (git source, works the same)
opencode plugin github:ChengZiiii/opencode-vision-delegate --global
```

Pin a specific version with `opencode plugin opencode-vision-delegate@<version>` (or a branch/tag with `github:ChengZiiii/opencode-vision-delegate#<ref>`). The command adds the package to the `plugin` array in your opencode config (global: `~/.config/opencode/opencode.json`; project: `.opencode/opencode.json`) and manages the package under opencode's package store (`~/.cache/opencode/packages/`). Equivalent manual config:

```jsonc
{
  "plugin": ["opencode-vision-delegate"]
}
```

After install, restart opencode. The plugin registers the `vision-agent` subagent and the `vision_analyze` tool on launch; the `vision` skill is discovered straight from the installed package directory via `skills.paths`.

> **Renamed from `opencode-vision-bridge`** (the npm name belongs to an unrelated pre-captioning plugin by martinmose). If you installed this plugin before the rename via the git spec `github:ChengZiiii/opencode-vision-bridge`: switch the `plugin` entry in your opencode config to `github:ChengZiiii/opencode-vision-delegate`, run `opencode plugin github:ChengZiiii/opencode-vision-delegate --global --force`, and delete the old store dir `~/.cache/opencode/packages/github_ChengZiiii/opencode-vision-bridge` — opencode keys its package store on the install spec, so the renamed spec installs to a new dir and the old one is dead weight. (The old GitHub URL redirects, but keeping the old spec in your config would keep installing under the old store key.)

> **Why this package ships no `build`/`postinstall` scripts:** opencode's bundled installer runs npm's git-dependency preparation whenever an installed-from-git package declares any of `preinstall`/`install`/`postinstall`/`prepack`/`prepare`/`build` (or a `workspaces` field), and that preparation fails inside the compiled opencode binary — see [opencode issue #49704](https://github.com/anomalyco/opencode/issues/49704). This package commits a pre-built `dist/index.js` and keeps `scripts` free of those names, so GitHub installs work on any machine.

### Alternative installs

- **Local checkout:** `"plugin": ["file:///<repo-absolute-path>"]` — the skill is discovered straight from the package directory via `skills.paths`.
- **Single file:** copy `dist/index.js` to `~/.config/opencode/plugin/vision.js` and copy `SKILL.md` to `~/.config/opencode/skills/vision/SKILL.md` manually (there is no installer script).

Do not mix install methods for the same plugin id (`vision`) — they would double-register.

### Updating / uninstalling

Re-run the install command **with `--force`** to replace the installed version (`opencode plugin opencode-vision-delegate --global --force`), then restart opencode.

opencode 1.18 has **no built-in plugin uninstall command**. To uninstall manually (verified working):

1. Remove the entry from the `plugin` array in your opencode config (`~/.config/opencode/opencode.json` for global, `.opencode/opencode.json` for project).
2. Delete the package from opencode's store: `~/.cache/opencode/packages/<sanitized-spec>/` (e.g. `opencode-vision-delegate` or `github_ChengZiiii/opencode-vision-delegate`).
3. Delete `~/.config/opencode/skills/vision/` if it exists (a leftover from a single-file install's manual copy).
4. Optionally remove the `agent["vision-agent"]` model knob — otherwise `opencode agent list` keeps showing the name.

Restart opencode and the `vision-agent` subagent, the `vision_analyze` tool, and the `vision` skill are gone.

## Quick start

1. Install with `opencode plugin opencode-vision-delegate --global` and restart opencode.
2. Set the vision model (see below): `agent["vision-agent"].model = "<provider-id>/<model-id>"` — use any vision-capable model from your configured providers.
3. Drag an image into the opencode input (or reference an image path) and ask a visual question. The orchestrator detects the visual intent, delegates to `vision_analyze`, and the vision model returns structured JSON matching the template.

## Usage

### The vision model knob

The plugin registers **exactly one** subagent, `vision-agent`, WITHOUT a default model — the plugin never writes `model`. The vision model is set by **you** through the agent model override on `vision-agent`:

```jsonc
{
  "agent": {
    "vision-agent": {
      "model": "<provider-id>/<model-id>" // any vision-capable model from your configured providers
    }
  }
}
```

If no override is set, opencode falls back to the default model.

### Free models: zero-setup vision

opencode's Zen gateway (provider id `opencode`) serves free models that need **no provider authentication** — e.g. `opencode/space-bunny-free` (image input, 1M context). The plugin treats this gateway as keyless: with no `auth.json` entry and no `OPENCODE_API_KEY`, the `vision_analyze` tool simply sends the request without an auth header. Zero-setup usage:

```jsonc
{
  "agent": {
    "vision-agent": { "model": "opencode/space-bunny-free" }
  }
}
```

Every other provider keeps the strict contract: a missing API key is a `provider error` naming the fix, and no request is made. If Zen ever starts requiring auth for a model, the HTTP 401 surfaces as a normal `provider error` (the skill's subagent fallback applies).

This override is the **single vision model knob for both delegation paths**: the `vision_analyze` tool's model source is exactly this override, and the `vision-agent` subagent fallback uses it too. The plugin never writes the field, so your override is always preserved.

### Request tuning knobs (tool path)

The `vision_analyze` tool calls the provider directly, so knobs opencode's runtime would normally inject (model variants, thinking control) do not apply to it. Three knobs cover the gap — all optional, set on the same `vision-agent` entry (or via env):

```jsonc
{
  "agent": {
    "vision-agent": {
      "model": "minimax-cn-coding-plan/MiniMax-M3",
      // 1. Native opencode agent option, passed through to the request body
      //    (default 0.1 when unset).
      "temperature": 0.1,
      // 2. Generic body passthrough: deep-merged into the final request
      //    body — e.g. disable thinking on GLM endpoints.
      "extraBody": { "thinking": { "type": "disabled" } }
    }
  }
}
```

```bash
# 3. Timeout ceiling for one vision call (default 300000ms; <=0 disables
#    the timeout; invalid values fall back to the default).
OPENCODE_VISION_TIMEOUT_MS=300000
```

Body semantics: OpenAI-shaped requests set **no** `max_tokens` (server default applies); Anthropic-shaped requests keep the protocol-required `max_tokens` (default 8192) — override it through `extraBody` if needed. On timeout the error reads `timeout after <N>ms posting <url>` instead of a generic network error, so the skill's subagent fallback routing still applies.

### Dual request shapes

The tool selects the HTTP request shape from the resolved endpoint URL: endpoints containing `/anthropic` get Anthropic `/messages` bodies (base64 image blocks, `x-api-key`); everything else gets OpenAI `/chat/completions` bodies (`image_url` data: URLs, Bearer auth). This matters in practice: some providers' OpenAI-compatible endpoints silently drop `data:` images (measured on `api.minimaxi.com`), while their Anthropic-style endpoint delivers them — the built-in endpoint map points minimax-family providers at the Anthropic-style URL.

### Per-model vision routing

The plugin routes images based on the **handling model** of each request, not a single global toggle. The `vision-agent` subagent is always registered — regardless of the top-level `model` — so a text-only agent in a mixed config can always delegate.

- **Multimodal (vision-capable) model.** Image `FilePart`s pass through untouched — the model sees images natively. A system transform injects a `[vision:native]` instruction telling the model to inspect images directly and NOT use the vision skill, call `vision_analyze`, or spawn a `vision-agent` subagent.
- **Text-only model.** Image `FilePart`s are materialized under the plugin's temp dir (`<system-tmp>/opencode-vision-delegate/`) and rewritten to `[vision:dropped-image]` markers carrying the resulting path. The orchestrator then delegates via the `vision_analyze` tool, falling back to the `vision-agent` subagent only when the tool is unavailable or errors with a provider/protocol/HTTP failure.

Capability is resolved per request: the messages transform checks the message's `info.model` first, then the agent's configured model, then the top-level config `model` as a final fallback. Provider/model ids match case-insensitively. To bypass the skill per task on a text-only model, prepend this to your prompt:

> You MUST not use the vision skill.

### The `vision_analyze` tool and permissions

The tool's arguments are `images` (`[{id, path}]` — short contract ids plus local image paths), `question` (the exact visual question), `response_template` (JSON string defining the required response shape), and optional `response_rules`. The tool reads the images, calls the configured vision model, and returns exactly one JSON object matching the template.

`vision_analyze` is auto-allowed: sessions — including subagent sessions — call it without permission prompts. An explicit user deny wins: set `permission.vision_analyze = "deny"` and the plugin never upgrades it.

### Disabling vision delegation

To stop delegation entirely, set `disable: true` on `agent["vision-agent"]`. This disables **both** paths: the agent does not appear in `opencode agent list` and cannot be delegated to, and the `vision_analyze` tool is not registered in any session. The plugin never writes `disable`, so your setting stays effective.

## Troubleshooting

- **Plugin not loading:** run opencode with `opencode --print-logs` and check the output for plugin load errors.
- **Stale plugin cache:** reset the package store under `~/.cache/opencode/packages/` and restart.
- **Missing `vision-agent` subagent / `vision_analyze` tool:** no model is pre-configured — set one via the agent model override on `vision-agent`. Confirm the override is set and that `~/.cache/opencode/models.json` contains the provider. The tool is also absent when `disable: true` is set on `vision-agent`.
- **`vision_analyze` returns "model not configured":** set `agent["vision-agent"].model` to a vision-capable provider/model from your configured providers; the skill does not fall back on this error.
- **`vision_analyze` returns a provider error:** check the API key (`opencode auth login <provider>` / `auth.json` entry, or the provider's `*_API_KEY` env var) and the endpoint (`provider.<id>.options.baseURL` in config, else the catalog/built-in endpoint). The skill automatically falls back to the `vision-agent` subagent on provider/protocol/HTTP errors.
- **A multimodal model still delegates to the vision skill / `vision_analyze`:** update the plugin. Before the keyless-provider fix, capability resolution only consulted providers that passed availability gating (config blocks / env keys / `auth.json`), so keyless providers like opencode Zen (`opencode/space-bunny-free`, `opencode/big-pickle`, …) were misjudged text-only and their images were rewritten to `[vision:dropped-image]` markers. Capability is now resolved from the full cached model catalog (`~/.cache/opencode/models.json`) plus config provider model overrides, independent of availability.

## License

MIT — see [LICENSE](./LICENSE).

Upstream design and implementation: [wezzard/opencode-vision](https://github.com/wezzard/opencode-vision), MIT, and [kilo-vision-bridge](https://github.com/ChengZiiii/kilo-vision-bridge). See also [I Gave GLM-5.2 Eyes](https://wezzard.com/post/2026/06/i-gave-glm-5-2-eyes-d896) for the design rationale.
