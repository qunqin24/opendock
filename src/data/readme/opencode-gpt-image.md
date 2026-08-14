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

Then set your OpenAI key (one of):

```bash
export OPENAI_API_KEY="sk-..."
# or store it once:
echo "sk-..." > ~/.config/opencode/openai.key
```

Restart opencode. Done.

> The key is a [platform API key](https://platform.openai.com/api-keys), billed per image — **not** the ChatGPT/Codex subscription.

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
| `OPENAI_API_KEY` | API key (overrides the key file). |
| `OPENCODE_OPENAI_KEY_FILE` | Custom key-file path. Default `~/.config/opencode/openai.key`. |
| `OPENCODE_IMAGE_MODEL` | Override the model. Default `gpt-image-2` (try `gpt-image-1-mini` for cheaper output). |

## License

MIT
