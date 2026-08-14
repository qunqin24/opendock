# Trailhead

Ranger integrations for AI coding agents. This repo ships the Claude Code plugin and the OpenCode plugin.

## Claude Code

1. Install the CLI.

```bash
npm install -g @ranger-testing/ranger-cli
```

2. Run setup from your project root.

```bash
ranger setup
```

3. Restart Claude Code, then run `/ranger:enable`.

## OpenCode

1. Install the CLI.

```bash
npm install -g @ranger-testing/ranger-cli
```

2. Run setup from your project root.

```bash
ranger setup --opencode
```

3. Confirm `opencode.json` includes the plugin.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@ranger-testing/opencode-plugin"]
}
```

4. Restart OpenCode, then run the `ranger_enable` tool.
