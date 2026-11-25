# opencode-slack

[OpenCode](https://opencode.ai) plugins that connect your agents to Slack. macOS only for now, sorry!

| Package                                                          | What it does                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`@jonlinkens/opencode-slack-feedback`](packages/slack-feedback) | A `give_feedback` tool: agents report friction to a Slack channel for you to triage |
| [`@jonlinkens/opencode-slack-agent`](packages/slack-agent)       | Mention @OpenCode in a Slack thread to start or continue a session locally          |

## Installation

Add the plugins you want to `~/.config/opencode/opencode.json`. Refer to each package's `README.md` for more information on config:

```jsonc
{
  "plugins": [
    {
      "package": "@jonlinkens/opencode-slack-feedback",
      "options": { "channel": "C0123ABCD" },
    },
    {
      "package": "@jonlinkens/opencode-slack-agent",
      "options": { "allowedUsers": ["YOUR_SLACK_ID"] },
    },
  ],
}
```
