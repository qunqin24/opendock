# opencode-posthog-observability

OpenCode plugin that sends AI generation telemetry to [PostHog AI Observability](https://posthog.com/docs/ai-observability).

Each completed OpenCode assistant message is captured as one PostHog `$ai_generation` event. Completed and failed OpenCode tool calls are captured as child `$ai_span` events. The plugin keeps each generation as its own trace while grouping related turns with the OpenCode session ID.

## Install

```sh
npm install opencode-posthog-observability
```

Add the plugin to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-posthog-observability"]
}
```

Set your PostHog project token:

```sh
export OPENCODE_POSTHOG_PROJECT_TOKEN=phc_your_project_token
```

For EU projects, set:

```sh
export OPENCODE_POSTHOG_HOST=https://eu.i.posthog.com
```

## Configuration

The plugin reads config from the first file it finds:

- `OPENCODE_POSTHOG_CONFIG`
- `.opencode/posthog-observability.json`
- `.opencode/posthog-observability.jsonc`
- `.opencode/opencode-posthog-observability.json`
- `.opencode/opencode-posthog-observability.jsonc`
- matching files in your global OpenCode config directory

Example:

```jsonc
{
  "projectToken": "phc_your_project_token",
  "host": "https://us.i.posthog.com",
  "distinctId": "opencode",
  "projectName": "my-project",
  "agentName": "opencode",
  "captureInputs": true,
  "captureOutputs": true,
  "captureMetadata": true,
  "maxTextLength": 12000,
  "diagnostics": false,
  "tags": {
    "env": "local"
  }
}
```

Environment variables override file config:

- `OPENCODE_POSTHOG_PROJECT_TOKEN` or `POSTHOG_PROJECT_TOKEN`
- `OPENCODE_POSTHOG_HOST`
- `OPENCODE_POSTHOG_DISTINCT_ID`
- `OPENCODE_POSTHOG_AGENT_NAME`
- `OPENCODE_POSTHOG_PROJECT_NAME`
- `OPENCODE_POSTHOG_CAPTURE_INPUTS`
- `OPENCODE_POSTHOG_CAPTURE_OUTPUTS`
- `OPENCODE_POSTHOG_CAPTURE_METADATA`
- `OPENCODE_POSTHOG_MAX_TEXT_LENGTH`
- `OPENCODE_POSTHOG_DIAGNOSTICS`
- `OPENCODE_POSTHOG_FLUSH_TIMEOUT_MS`
- `OPENCODE_POSTHOG_TAGS` as `key=value,team=ai` or JSON

## Privacy

By default, the plugin captures prompt input, assistant output, tool input/output, model/provider metadata, token counts, latency, OpenCode session/message/tool IDs, and configured tags.

When OpenCode exposes reasoning separately from the final answer, reasoning is sent as its own output entry before the assistant response. This keeps PostHog's conversation view readable without discarding reasoning content.

Disable sensitive content capture when needed:

```sh
export OPENCODE_POSTHOG_CAPTURE_INPUTS=false
export OPENCODE_POSTHOG_CAPTURE_OUTPUTS=false
```

The plugin redacts common secret-looking object keys before sending metadata or prompt inputs: `token`, `secret`, `password`, `authorization`, `cookie`, `apiKey`, and `bearer`.

## Development

```sh
npm install
npm test
```

For local OpenCode tests before publishing:

```sh
npm pack
npm install ./opencode-posthog-observability-0.1.0.tgz --prefix .opencode
```

Then point local `.opencode/opencode.json` at the installed artifact:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-posthog-observability/dist/index.js"]
}
```
