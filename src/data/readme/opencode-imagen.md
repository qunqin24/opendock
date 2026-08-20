# OpenCode Imagen

Generate and edit images with OpenAI GPT Image 2 from any OpenCode V2 agent.
The plugin reuses OpenCode's existing ChatGPT/Codex OAuth connection, so it
does not require a separate OpenAI API key.

## Requirements

- OpenCode V2 `0.0.0-next-17444` or a compatible release
- An active OpenAI ChatGPT/Codex OAuth connection in OpenCode
- A ChatGPT plan with Codex and image-generation access

OpenCode's V2 plugin API is currently beta. This package pins the matching
OpenCode SDK and Effect versions and will publish compatibility updates as the
API changes.

## Install

Add the package to the `plugins` array in your global OpenCode V2 config at
`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-imagen@0.1.0"],
}
```

Connect OpenAI through OpenCode if it is not already connected:

```text
/connect
```

Select OpenAI and authenticate with ChatGPT/Codex OAuth. Restart OpenCode after
installing or changing the package version.

## Use

Ask any agent to use the `imagen` tool. For example:

```text
Create a wide editorial illustration of a lunar greenhouse at dawn. Save it
to assets/lunar-greenhouse.webp.
```

The tool accepts:

| Input | Values | Default |
| --- | --- | --- |
| `prompt` | Non-empty image description | Required |
| `size` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | `auto` |
| `quality` | `auto`, `low`, `medium`, `high` | `auto` |
| `background` | `auto`, `opaque`, `transparent` | `auto` |
| `outputFormat` | `png`, `webp`, `jpeg` | `png` |
| `thinking` | `off`, `minimal`, `low`, `medium`, `high` | `low` |
| `referencePaths` | Local image paths used as visual references | `[]` |
| `outputPath` | Exact file path, or a directory when extensionless | Generated path |

Without `outputPath`, images are written under
`.opencode/generated-images/<image-id>.<format>` in the current OpenCode
working directory. The tool returns both structured metadata and OpenCode file
content, allowing compatible agents and interfaces to inspect the result.
Existing files are never overwritten; choose a new `outputPath` when a target
already exists.

## How It Works

1. The plugin asks OpenCode for the active `openai` connection.
2. OpenCode resolves that connection without exposing or reading credential
   storage directly.
3. The plugin sends a typed Responses request to ChatGPT's Codex backend using
   the native `image_generation` tool with `gpt-image-2`.
4. Effect Schema decodes the OAuth token claims and Codex SSE events.
5. Effect platform services write the returned image to disk.

The access token is wrapped as `Redacted` and is never logged or returned in
tool output.

## Development

For local development, load the repository directly:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-imagen/dist/index.js"],
}
```

OpenCode imports local files directly, so install dependencies and build the
plugin first:

```sh
bun install
bun run build
bun run check
npm pack --dry-run
```

The completion gate runs strict TypeScript with the Effect language service,
Oxlint with Effect-specific rules, Vitest, dprint, and the publish build.

## Limitations

- This plugin intentionally supports only OpenCode V2 and ChatGPT/Codex OAuth.
- The Codex image endpoint is not a stable public API and can change without
  notice.
- Image availability and usage limits depend on the connected ChatGPT account.
- Browser galleries, batch generation, and slash commands are outside the
  initial scope.

## License

MIT
