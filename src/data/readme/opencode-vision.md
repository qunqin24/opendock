# OpenCode Vision

> **Disclaimer:** OpenCode Vision is an independent, community-built project. It is **not** built by, endorsed by, or affiliated with the OpenCode team. "OpenCode" appears in this project's name solely to indicate that it builds upon the OpenCode platform.

## Introduction

Give text-only OpenCode orchestrators (GLM 5.2, DeepSeek, and similar models) eyes by delegating visual tasks to dynamically registered vision subagents.

## Installation

```bash
opencode plugin opencode-vision -g
```

OpenCode installs the npm package via Bun on next launch. Restart OpenCode for the change to take effect.

Configure at least one provider with an image-capable model (`enabled_providers` and/or `provider` entries in OpenCode config). The plugin discovers models from your configured providers and OpenCode's cached model catalog — it does not ship a fixed model list.

## Usage

The plugin ships a `vision` skill. When your orchestrator model is text-only and a task needs pixels — not just accessibility metadata — the skill routes the work to a `vision-*` subagent backed by a vision-capable model you choose.

### 1. Running Visual Tasks

**Image as User Inputs:**

Drag an image into the OpenCode input box, or reference a screenshot path in your message.

![Image prompt before vision routing](docs/images/image-prompt-before-vision.png)

![Selecting a vision model](docs/images/selecting-vision-model.png)

**Image as Tool Results:**

The same flow applies to screenshots from browser-use and computer-use tools (chrome-devtools, Playwright, cua-driver, and similar).

![Computer-use example with vision routing](docs/images/computer-use-example.png)

### 2. Picking the Vision Model

On the first visual task, the orchestrator runs the bundled model discovery script and presents a short list of image-capable models from your configured providers. Pick one — that selection is persisted for future sessions.

![Discovering vision-capable models](docs/images/discovering-vision-models.png)

Your choice is saved to `~/.config/opencode/vision-model-image.txt` and reused in later sessions. A vision subagent inspects the image and returns structured findings as text for the main agent to relay.

### 3. Re-picking the Vision Model

Re-picking the vision model is very simple: just say, **"Select the vision model."**

### 4. Temporarily Bypassing the Plugin

When your main model is already vision-capable (for example GPT with native image input), native multimodality is usually the better path. Plugins installed with `opencode plugin` do not appear in OpenCode's plugin management UI, so bypass the skill per task by prepending this to your prompt:

> You MUST not use the vision skill.

OpenCode will skip the `vision` skill for that task.

## License

MIT — see [LICENSE](./LICENSE).

---

Learn more about the design in [I Gave GLM-5.2 Eyes](https://wezzard.com/post/2026/06/i-gave-glm-5-2-eyes-d896).
