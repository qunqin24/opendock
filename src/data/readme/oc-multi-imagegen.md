# oc-multi-imagegen

[![npm version](https://img.shields.io/npm/v/oc-multi-imagegen)](https://www.npmjs.com/package/oc-multi-imagegen)

Generate and edit images without leaving OpenCode. Describe what you need, give your agent a reference when you have one, and get an image saved in your project.

Use your OpenCode ChatGPT sign-in with the default **Codex backend**, or connect an OpenAI Images API or NanoGPT key. The plugin works in OpenCode 1 and OpenCode 2 and includes a skill that guides agents through prompting, reference images and checking the result.

**[Examples](#from-a-prompt-to-a-finished-asset) · [Get started](#get-started) · [Backends](#choose-a-backend) · [Documentation](#documentation)**

## What you can make

- **Illustrations from a prompt:** scene art, website imagery, textures and visual concepts.
- **Variations from references:** change the weather, restyle an image or combine several images in one request.
- **Transparent assets:** request a character or object cut-out for an avatar, sticker or illustrated icon. Results depend on the model; inspect the returned alpha.
- **Vector logos and short animations:** with an OpenAI Images API key, ask for a static SVG logo or icon, or a short looping GIF.
- **Images your agent can keep working with:** each result is a local file with the provider's original bytes and a matching extension: PNG, JPEG or WebP, or GIF and SVG from the OpenAI Images API. Use the returned path to inspect the file or use it in your project. A PNG, JPEG or WebP result can also be the reference image for another call; a GIF or SVG result cannot.

## From a prompt to a finished asset

These original, Ghibli-inspired illustrations were generated through the Codex backend. Each step builds on the image before it. The prompts below show how to ask your agent; the [full prompts and settings](docs/examples.md) are available too.

### 1. Describe a scene

> Create a hand-painted woodland post office inside an enormous old tree, with a mossy roof, a stone bridge and warm afternoon light. A little fox postmaster in a teal raincoat carries a letter. Give it the quiet wonder of a Ghibli-inspired animation background. Save it as `forest-post-office.png`.

![A fox postmaster on a stone bridge outside a tree-house post office, overlooking a sunlit mountain lake.](docs/images/forest-post-office.webp)

You don't need to name a tool or write a JSON request. Your agent turns the description into an `imagegen` call and saves the result.

### 2. Give it a reference and a new direction

> Use `forest-post-office.png` as a reference. Keep the post office, bridge and fox, but make it a rainy blue-hour scene with glowing amber windows and reflections on the wet stone. Save it as `forest-post-office-rain.png`.

![The same woodland post office and fox at rainy blue hour, with amber windows and wet reflections.](docs/images/forest-post-office-rain.webp)

Your agent sends the reference and the change to `imageedit`. Name what to keep and what to change; edits generate a new image, so they aren't pixel-exact patches.

### 3. Pull out a reusable character

> Use `forest-post-office-rain.png` as a reference. Turn the fox postmaster into a standalone illustrated icon. Keep the teal coat, mail satchel, bell and envelope. Show the whole character on a transparent background, without the scenery or a drop shadow. Save it as `fox-postmaster-icon.png`.

<img src="docs/images/fox-postmaster-icon.png" width="320" alt="The fox postmaster as an isolated, transparent character illustration, wearing a teal coat and carrying a letter and mail satchel.">

For this Codex example, the agent supplied the reference and set `background: "transparent"`. This PNG has real transparency, checked on light and dark backgrounds. Fine edges and the character itself can have soft alpha; use a vector tool when you need an editable vector icon.

## Get started

Add the npm package to your OpenCode configuration. OpenCode installs it when the server starts.

**OpenCode 1** (`plugin`):

```json
{
  "plugin": ["oc-multi-imagegen"]
}
```

**OpenCode 2** (`plugins`):

```json
{
  "plugins": ["oc-multi-imagegen"]
}
```

Sign in to OpenCode with ChatGPT and restart the server that loads the plugin. Codex is the default, so it needs no backend setting or separate image API key. The [setup guide](docs/getting-started.md) covers authentication, version pinning and local development.

Then ask for an image. The [permissions guide](docs/permissions.md) covers agents with restricted tool access.

## Choose a backend

Every backend provides the same two image tools: `imagegen` creates a new image from a text prompt, and `imageedit` changes or combines existing images that you pass as references. The backend decides the sign-in, the controls each tool takes and how your agent can discover models.

| Backend | Use it with | Backend-specific controls | Model discovery |
| --- | --- | --- | --- |
| **Codex** (default) | Your OpenCode ChatGPT sign-in | Seven size presets | None: model and quality are sent as requested and can't be verified |
| **OpenAI Images API** | An OpenAI image API key | Native pixel sizes, and SVG or GIF output from `imagegen` | `imagegen_models` lists the key's models live |
| **NanoGPT** | A NanoGPT API key | A curated choice of models, each with its own controls | `imagegen_models` describes the curated models locally |

[Backend setup and model choices](docs/backends.md) explain authentication, controls, availability and [recorded NanoGPT workflow coverage](docs/backends.md#nanogpt-live-workflow-coverage). Generation uses the selected provider's account quota or API credit. If you made Codex or OpenAI reference edits with `imagegen` in an earlier release, see [moving reference edits to imageedit](docs/tool-reference.md#moving-reference-edits-to-imageedit).

## Documentation

| Guide | What you'll find |
| --- | --- |
| [Getting started](docs/getting-started.md) | Installation, ChatGPT sign-in and configuration for both OpenCode hosts |
| [Examples](docs/examples.md) | Full prompts, reference chain and settings behind the images above |
| [Backends](docs/backends.md) | Codex, OpenAI and NanoGPT setup, credentials and model selection |
| [Tool reference](docs/tool-reference.md) | Arguments, sizes, references, transparency and output behavior |
| [Permissions](docs/permissions.md) | Agent access, backend-scoped rules and file access |
| [Development](docs/development.md) | Build, test, packaging and compatibility details |
| [Container testing](https://github.com/imarshallwidjaja/oc-multi-imagegen/blob/main/docs/container-testing.md) | Source-checkout runbook for live tests with real agents |

## License

[MIT](LICENSE). The original copyright and permission notice are retained.
