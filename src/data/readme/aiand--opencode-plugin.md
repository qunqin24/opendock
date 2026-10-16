# ai& for OpenCode (deprecated)

**This plugin is no longer maintained. Use the [ai& CLI](https://github.com/aiandlabs/aiand-cli) instead.**

The ai& CLI signs you in through your browser and connects stock [OpenCode](https://opencode.ai)
to ai&. It keeps your existing providers and chosen model.

## Move to the ai& CLI

1. Remove `"@aiand/opencode-plugin"` from the `plugin` list in your `opencode.json` or
   `~/.config/opencode/opencode.jsonc`. The plugin and the CLI both set up an `aiand` provider.
2. Install the CLI and start OpenCode on ai&:

   ```bash
   npm install -g @aiand/cli   # Requires Node.js 22 or newer.
   aiand code
   ```

See the [ai& CLI README](https://github.com/aiandlabs/aiand-cli#readme) for other install options
and commands.

The previous README is in the repository history at
[`d6fc209`](https://github.com/aiandlabs/aiand-opencode-plugin/blob/d6fc209/README.md).
