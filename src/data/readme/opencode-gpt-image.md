# opencode-gpt-image

Image **generation** and **editing** tools for [opencode](https://opencode.ai), powered by OpenAI `gpt-image-2`.

Add one line to your config and any agent can create and edit images.

<!--
  VIDEO: drag-and-drop your screen recording into this README on GitHub
  (edit the file in the browser). GitHub uploads it and replaces the cursor
  with a https://github.com/user-attachments/assets/... link. Paste that link
  below, or use the <video> tag form:

  https://github.com/user-attachments/assets/XXXXXXXX
-->

> [!NOTE]
> Demo video coming soon.

## Install

Add it to the `plugin` array in your `opencode.json` (global: `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gpt-image"]
}
```

Restart opencode. Done — no key required if you've already run `opencode auth login` and connected OpenAI (see [Auth](#auth) below).

## Auth

The tools are always registered; auth is only resolved when you actually call one, in this order:

1. **`OPENAI_API_KEY`** env var — a [platform API key](https://platform.openai.com/api-keys), billed per image.
2. **opencode's own `openai` credential**, whatever you already connected via `opencode auth login` (or the `/connect` command) — no separate setup:
   - a platform API key you entered there, reused directly, **or**
   - your **ChatGPT/Codex subscription** (Plus/Pro/Business), if you signed in with "Sign in with ChatGPT". Rides the same session opencode itself uses for chat — refreshed automatically, no extra OAuth flow, no per-image API billing.
3. **A key file** (`~/.config/opencode/openai.key` by default) — a fallback for headless/CI setups that don't want to touch opencode's managed auth store.
4. Nothing found → the tool call fails with a message telling you exactly what to do.

If you don't already have `opencode auth login` set up with OpenAI, either export `OPENAI_API_KEY`, or run:

```bash
opencode auth login
# pick OpenAI, then either "ChatGPT Pro/Plus" (browser or headless) or "Manually enter API Key"
```

> [!NOTE]
> The ChatGPT/Codex subscription path calls the same undocumented `chatgpt.com/backend-api/codex/images/*` endpoints Codex CLI/opencode use internally. It's not a publicly documented API and can change without notice. `mask_path` and non-PNG output are only available in platform API key mode. Usage must comply with OpenAI's [Terms of Use](https://openai.com/policies/row-terms-of-use/) and [Usage Policies](https://openai.com/policies/usage-policies/).

## Tools

| Tool | Does |
| --- | --- |
| `image_generate` | Text prompt (+ optional reference image(s)) -> image(s), saved to disk. |
| `image_edit` | Edit/transform existing image(s), optional mask, -> image(s). |

`image_generate` also accepts an optional `image_paths` array of existing reference images to guide/condition the generation.

Both support `size`, `quality`, `background`, `output_format`, `n`, and `output_path`.

## Config

| Env var | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Platform API key (overrides opencode's stored credential and the key file). |
| `OPENCODE_OPENAI_KEY_FILE` | Custom key-file path. Default `~/.config/opencode/openai.key`. |
| `OPENCODE_IMAGE_MODEL` | Override the model. Default `gpt-image-2` (try `gpt-image-1-mini` for cheaper output). |

## License

MIT
