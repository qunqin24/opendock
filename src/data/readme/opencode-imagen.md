# OpenCode Imagen

Generate and edit images with OpenAI GPT Image 2.5 Flare from any OpenCode V2 agent.
The plugin reuses OpenCode's existing ChatGPT/Codex OAuth connection, so it
does not require a separate OpenAI API key.

## Requirements

- OpenCode V2 `2.3.0` or a compatible release
- An active OpenAI ChatGPT/Codex OAuth connection in OpenCode
- A ChatGPT plan with Codex and image-generation access

OpenCode's newer **Sign in with ChatGPT** (`chatgpt-token-sharing`) method
authenticates successfully but currently rejects the `image_generation` tool
with `subscription_sharing_unsupported_capability`. Reconnecting that same
method does not grant image access. Legacy Codex OAuth uses a different endpoint;
its image access still depends on the account. API-key generation is not currently
implemented by this plugin.

This package pins the OpenCode `2.3.0` SDK and matching Effect `4.1.0` packages.
OpenCode supplies the host Effect runtime; plugins must use its supported module
paths rather than loading another Effect release from their own dependencies.
UUID generation uses `effect/crypto/SecureRandom`; the older `effect/Crypto`
module is not provided by this OpenCode release.

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

Select OpenAI and authenticate with ChatGPT/Codex OAuth. Configuration changes
reload automatically; use `/reload` to force a reload.

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
| `quality` | `auto`, `low`, `medium`, `high`, `xhigh`, `max` | `auto` |
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

## Claude Code

Claude Code sessions can use the same tool. A bundled MCP server forwards each
call to the plugin's `imagen.generate` RPC on the local OpenCode service, so
OpenCode still resolves and refreshes the OpenAI connection. Credentials never
leave OpenCode.

The OpenCode plugin must be configured as described above. Build the MCP server
and install the plugin from this repository's local marketplace:

```sh
bun run build:claude
claude plugin marketplace add /absolute/path/to/opencode-imagen
claude plugin install imagen@opencode-imagen --scope user
```

Run `/reload-plugins` in an open session. Claude then sees the
`mcp__plugin_imagen_imagen__imagen` tool. It takes the inputs listed above.
Relative `referencePaths` and `outputPath` resolve against the Claude Code
project directory, and images default to `.opencode/generated-images/`. The
result includes the image inline when it is under Claude's size limit.

Claude Code installs a copy of the plugin. After changing `src/claude/`, rebuild
and refresh that copy:

```sh
bun run build:claude
claude plugin marketplace update opencode-imagen
claude plugin update imagen@opencode-imagen
```

Changes to the shared generation code in `src/` also need `bun run build` and
`/reload` in OpenCode, because the OpenCode service does the generation.

The server runs `opencode api`, which starts the OpenCode service when needed.
Set `IMAGEN_OPENCODE_BIN` to use a different executable, or
`IMAGEN_OPENCODE_DIRECTORY` to call the RPC at a specific OpenCode location
instead of the service default.

## How It Works

1. The plugin asks OpenCode for the active `openai` connection.
2. OpenCode resolves that connection without exposing or reading credential
   storage directly.
3. The plugin selects the public Responses endpoint for token-sharing OAuth or
   ChatGPT's Codex backend for legacy OAuth, using
   `gpt-6.1-sol` as the dispatcher and the native `image_generation` tool with
   `gpt-image-2.5-flare`.
   GPT-5.5 retired from Codex with ChatGPT sign-in on October 14, 2026; see
   [OpenAI's retirement notice](https://developers.openai.com/codex/models#gpt-55-retirement).
   Dispatcher model IDs are wire IDs, not OpenCode's `-fast` aliases.
4. Account selection uses OpenCode's credential metadata first, then optional
   token claims. Opaque or encrypted claims do not cause local authentication
   failures; the provider authenticates the token. Effect Schema decodes SSE events. Final
   image bytes are read from `response.completed.output`, with populated
   `response.output_item.done` items as a fallback. Partial previews are never
   saved as final images.
5. Effect platform services write the returned image to disk.

The access token is wrapped as `Redacted` and is never logged or returned in
tool output.

The image model identifier and quality levels are documented in OpenAI's
[GPT Image 2.5 Flare model card](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare).
Its default snapshot is `gpt-image-2.5-flare-2026-09-08`. The Responses API
[streaming example](https://developers.openai.com/api/docs/guides/image-generation#streaming)
reads final image data from `response.completed.output`.

Failed image calls report their status and a bounded provider error code/message
when supplied. If only dispatcher text accompanies the failure, it is labeled
`Dispatcher message`; that text is not a structured moderation or service error
code. Missing explanations remain explicit. Logs contain image-result counts
and error tags, not image bytes, prompts, credentials, or raw error objects.

## Development

For local development, load the repository directly:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-imagen/dist"],
}
```

Use `dist`, which contains the compiled `index.js` entrypoint. This is also the
local plugin path verified with OpenCode `2.3.0`.
Install dependencies and build the plugin first:

```sh
bun install
bun run build
bun run check
npm pack --dry-run
```

After rebuilding source changes, use `/reload` in OpenCode to reload the plugin
without restarting the shared service. The CLI equivalent is:

```sh
opencode api post /api/location/reload
```

Changes affect subsequent model requests; an in-flight request retains its
captured tool implementation. Dependency upgrades can leave old `node_modules`
imports cached even after a reload. If the log still names a removed import,
restart the service with `opencode service restart` when active work has finished.
This was necessary when upgrading from Effect `4.0.1` to `4.1.0`.

Verify activation for the session's actual working directory:

```sh
opencode api get '/api/plugin?location[directory]=/path/to/project'
```

Look for `opencode-imagen` with `state.status` set to `active`. The `imagen`
tool should then be available to agents in that location.

With the plugin configured and reloaded, run the real-server smoke check:

```sh
bun run test:server
IMAGEN_TEST_DIRECTORY=/path/to/project bun run test:server
```

This checks plugin activation through the installed OpenCode CLI, briefly waits
for location initialization, and fails if the plugin is absent or failed.
It does not generate images or resolve OAuth
credentials. Unlike unit tests, it catches incompatibilities with the host's
Effect runtime. The CLI may start the local service if it is not running.

The completion gate runs strict TypeScript with the Effect language service,
Oxlint with Effect-specific rules, Vitest, dprint, and the publish build.

## Limitations

- This plugin intentionally supports only OpenCode V2 and ChatGPT/Codex OAuth.
- The Codex image endpoint is not a stable public API and can change without
  notice.
- Image availability and usage limits depend on the connected ChatGPT account.
- Browser galleries, batch generation, and slash commands are outside the
  initial scope.
- Claude Code support depends on a running OpenCode service with this plugin
  active, and is intended for local use.

## License

MIT
