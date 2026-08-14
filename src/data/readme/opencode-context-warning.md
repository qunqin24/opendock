# OpenCode Context Warning Plugin

OpenCode plugin that warns agents about context window consumption and nudges handoff

## Installation

```bash
npm install opencode-context-warning
```

## Features

- Monitors the LLM context window token usage during the session.
- Provides customizable warnings (e.g., at 70% capacity) to prompt the agent to summarize.
- Forces sub-agent handoffs when context approaches maximum limits (e.g., 90%).
- Prevents degradation of reasoning quality caused by bloated context windows.

## Usage

This is a plugin for [OpenCode](https://github.com/opencode-ai). 

You can easily enable this plugin globally by adding it to your `opencode.json` (or `opencode.jsonc`) configuration file under the `plugins` array.

```json
{
  "plugins": [
    "opencode-context-warning"
  ]
}
```

Once added to your configuration, OpenCode will automatically load and activate the plugin whenever it starts.

Alternatively, if you are configuring OpenCode programmatically via the SDK, you can register it like this:

```typescript
import { configureAgent } from '@opencode-ai/sdk';
import plugin from 'opencode-context-warning';

const agent = configureAgent({
  plugins: [
    plugin({
      // Provide configuration options here
    })
  ]
});
```

## License

[MIT](LICENSE)
