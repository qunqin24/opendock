# @makcimbx/opencode-gpt-imagegen

<p align="center"><img src="./ogp.png" alt="opencode-gpt-imagegen × gpt-image-2" /></p>

> Bring [**ChatGPT Images 2.0**](https://openai.com/index/introducing-chatgpt-images-2-0/) (`gpt-image-2`) to [OpenCode](https://opencode.ai). It uses your **ChatGPT/Codex OAuth** path first and can fall back to **OmniRoute** when Codex auth is unavailable.

[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-blue.svg)](https://opencode.ai/docs/plugins/)
[![npm version](https://img.shields.io/npm/v/@makcimbx/opencode-gpt-imagegen.svg)](https://www.npmjs.com/package/@makcimbx/opencode-gpt-imagegen)
[![CI](https://github.com/makcimbx/opencode-gpt-imagegen/actions/workflows/ci.yml/badge.svg)](https://github.com/makcimbx/opencode-gpt-imagegen/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

| Auth path | Status | Billing |
|---|---|---|
| **ChatGPT subscription** (Codex OAuth) | **Default when available** | Comes out of your existing Plus / Pro / Business plan |
| **OmniRoute API** | **Fallback when Codex OAuth is absent** | Depends on your OmniRoute backend/provider |
| **OpenAI API key** | **Planned** | Pay-per-image against your API credits, with `generate` + `edit` support |

## Highlights

- **Subscription-friendly by default.** Generations ride on the same Codex backend channel OpenCode already uses for ChatGPT subscription chat when Codex OAuth exists.
- **OmniRoute fallback.** If Codex OAuth is unavailable, the plugin can reuse OpenCode's `omniroute` API credential and OpenCode OmniRoute base URL config.
- **Reference images.** Pass input images alongside the prompt for style guidance, edit targets, or compositing inputs. Codex uses hosted `input_image`; OmniRoute sends data URLs through `image_url` / `image_urls` for compatible image models.

## Installation

Add this plugin to your [OpenCode config](https://opencode.ai/docs/plugins/). For example, in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@makcimbx/opencode-gpt-imagegen"]
}
```

OpenCode auto-installs the package via Bun on next launch — no separate `npm install` step is needed. The plugin works best when OpenCode is authenticated with ChatGPT/Codex OAuth, and can also use OmniRoute credentials already stored in OpenCode auth.

## Auth Selection

Default behavior is `auto`:

1. Use Codex OAuth from OpenCode's `openai` auth entry when available.
2. Otherwise fall back to OmniRoute API auth from OpenCode's `omniroute` auth entry or `provider.omniroute.options.apiKey`.

Force a provider for debugging:

```sh
GPT_IMAGEGEN_AUTH_PROVIDER=codex
GPT_IMAGEGEN_AUTH_PROVIDER=omniroute
```

OmniRoute configuration:

| Variable / config | Purpose |
|---|---|
| `GPT_IMAGEGEN_AUTH_PROVIDER=auto|codex|omniroute` | Select provider behavior; default is `auto` |
| `GPT_IMAGEGEN_CODEX_MODEL` | Overrides the Codex subscription model; default is `gpt-5.6-sol` |
| `GPT_IMAGEGEN_OMNIROUTE_BASE_URL` | Overrides the OmniRoute OpenAI-compatible base URL |
| `GPT_IMAGEGEN_OMNIROUTE_MODEL` | Overrides the OmniRoute image model; default is `codex/gpt-5.6-sol` |
| OpenCode `omniroute` auth | Preferred source for the OmniRoute API key |
| `provider.omniroute.options.baseURL` | Standard OpenCode provider base URL source |
| OmniRoute wrapper plugin `options.baseURL` | Supported fallback for wrapper configs such as `./plugins/omniroute-wrapper.ts` |

Base URLs are normalized so both `https://host` and `https://host/v1` call `POST /v1/images/generations` without producing `/v1/v1`.

`gpt-5.6-sol` drives the hosted tool call; the rendered image still comes from `gpt-image-2`. If an account or OmniRoute deployment does not expose GPT-5.6 yet, use the corresponding model override to select `gpt-5.5`.

Exact `size` and `quality` are currently best-effort on Codex-backed paths. Codex OAuth forwards both values; OmniRoute forwards `size` but currently omits unverified `quality`. The upstream Codex image backend may still select automatic settings and return different PNG dimensions, and the plugin does not rescale the result. This affects both paths and is tracked in [openai/codex#28723](https://github.com/openai/codex/issues/28723).

## Usage

Just ask your agent in natural language and `gpt_imagegen` will be picked up.

The three examples below are the **actual outputs of this repo's e2e test suite** — see [`tests/e2e/subscription.test.ts`](./tests/e2e/subscription.test.ts) for the exact prompts and assertions.

### Example A — generate

> Draw a man in a navy samue with a red hachimaki, standing in a garden full of cherry blossoms. 90s anime style. Save it as `character.png`, portrait 1024x1536.

<p align="center"><img src="./assets/character.png" alt="Example A output: man in samue, portrait" width="320" /></p>

### Example B — auto-versioning

`gpt_imagegen` never overwrites an existing file: when the `out` path is already taken, it picks `-v2`, `-v3`, … instead.

> Now do the same path but make it a woman in a yellow yukata holding a red wagasa, in a moonlit garden with fireflies. Landscape 1536x1024.

The previous `character.png` is left untouched; the new image lands at `character-v2.png`.

<p align="center"><img src="./assets/character-v2.png" alt="Example B output: woman in yukata, landscape (auto-versioned)" width="480" /></p>

### Example C — feed existing image files as input

Pass any number of image paths via the `images` argument and the model uses them as references for the next generation — for style guidance, characters to keep, scenes to extend, and so on.

> Take `character.png` and `character-v2.png` and put both characters together on the engawa of an old Japanese house, smiling at the viewer. 2048x1152, same 90s anime style.

<p align="center"><img src="./assets/together.png" alt="Example C output: both characters composed onto an engawa" width="640" /></p>

## Roadmap

| Version | Auth path | Scope | Status |
|---|---|---|---|
| **v0.1.x** | ChatGPT subscription + OmniRoute API | `gpt_imagegen` with provider selection, safe output, and optional reference images | **Released** |
| **v0.2.0** | OpenAI API key | Adds the API-key billing path: both `generate` (`/v1/images/generations`) and `edit` (`/v1/images/edits`) with reference images | Planned |
| **Later** | OpenAI API key | Adds **pixel-precise mask inpainting** via `/v1/images/edits` (binary PNG alpha mask) | Planned |

## How it works

OpenCode already talks to the OpenAI Codex backend to power ChatGPT subscription chat. This plugin reuses that same endpoint first, attaching the hosted `image_generation` tool to a single-turn request, then writes the returned PNG to disk.

When Codex OAuth is unavailable, the plugin can call OmniRoute's OpenAI-compatible `POST /v1/images/generations` endpoint. OmniRoute mode returns the same safe PNG output path and forwards reference images as data URLs for providers/models that accept image input.

## Disclaimer

This is an **unofficial, third-party** plugin, not affiliated with or endorsed by OpenAI or OpenCode.

It uses the same Codex backend endpoint OpenCode itself calls for ChatGPT subscription chat — this plugin just adds the hosted `image_generation` tool to that conversation. Use must comply with OpenAI's [Terms of Use](https://openai.com/policies/row-terms-of-use/) and [Usage Policies](https://openai.com/policies/usage-policies/).
