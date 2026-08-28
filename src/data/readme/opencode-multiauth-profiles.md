# OpenCode MultiAuth Profiles

`opencode-multiauth-profiles` is a local [OpenCode plugin](https://opencode.ai/docs/plugins/) for storing and switching authentication credentials for multiple accounts.

Version 1 is configured for OpenAI ChatGPT OAuth (`openai`) by default. The profile storage is provider-agnostic and supports OpenCode credential formats `oauth`, `api`, and `wellknown`; additional providers must be explicitly enabled in plugin configuration.

## Why

OpenCode stores one active credential per provider in its auth file. Signing in again with `/connect` replaces that credential. This plugin saves named, local copies and restores one when requested. It only changes the selected provider entry, so credentials for other providers are preserved.

OpenCode must be restarted after selecting a profile. Do not select profiles while another OpenCode process is running: it could refresh and overwrite the active credential during the switch.

## Install

Clone the repository:

```bash
git clone https://github.com/RuBAN-GT/opencode-multiauth-profiles.git
```

Add the local checkout to `~/.config/opencode/opencode.json`, replacing the path with the location where you cloned it:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-multiauth-profiles"]
}
```

Point the local spec at the package directory, not `src/index.ts`, so OpenCode can load both the server and TUI entrypoints.

After the package is published to npm, it can instead be added by package name:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-multiauth-profiles"]
}
```

Quit and restart OpenCode after changing its configuration. `/account` appears in the command menu. In the terminal TUI it can also open a profile dialog; otherwise the command lists profiles and asks which to use. The `auth_profiles` tool remains available to the model.

## OpenAI Setup

1. In OpenCode, run `/connect`, choose OpenAI, then choose ChatGPT Plus/Pro and authenticate the first account.
2. Run `/account save openai work`. The plugin saves the current credential as `work`.
3. Run `/connect` again and authenticate the second account.
4. Run `/account save openai personal`.
5. To switch later, run `/account` and pick a profile in the TUI dialog, or run `/account use openai work`. Then quit OpenCode and start it again.

Use these commands:

```text
/account save openai <profile>
/account use openai <profile>
/account list
/account list openai
/account current openai
```

OpenCode custom commands are model-driven. The `/account` command instructs the active model to call the plugin tool and returns the tool result. No credential values are sent to the model: the tool returns only profile names and operation status.

## Configuration

The default configuration enables only OpenAI:

```json
{
  "plugin": [["opencode-multiauth-profiles", { "providers": ["openai"] }]]
}
```

To enable a verified additional provider later:

```json
{
  "plugin": [
    [
      "opencode-multiauth-profiles",
      {
        "providers": ["openai", "github-copilot"]
      }
    ]
  ]
}
```

Available options:

| Option        | Default                            | Purpose                                                            |
| ------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `providers`   | `["openai"]`                       | Provider IDs that `save`, `use`, and `current` may access.         |
| `command`     | `"account"`                        | Name of the OpenCode slash command.                                |
| `profilesDir` | `~/.config/opencode/auth-profiles` | Directory used to hold local profile files.                        |
| `authFile`    | OpenCode XDG auth path             | Override only for tests or non-standard OpenCode data directories. |

`profilesDir` is a directory of plaintext OAuth refresh tokens, not encryption. The plugin creates profile directories with mode `0700` and profile files with mode `0600`. Use full-disk encryption or a secret manager if the local machine needs stronger protection.

## Token Refreshes

OpenCode refreshes OAuth credentials in its active auth file. Before a profile is replaced, the plugin snapshots the outgoing credential into its selected profile. This retains a rotated refresh token when switching accounts.

The initial `save` command marks that profile as selected. If credentials are later changed manually with `/connect`, run `save` again to associate the new credential with a profile.

## Development

```bash
corepack enable
yarn install
yarn check
```

The package uses Yarn 4.5.0 with the `node-modules` linker, so dependencies are available in the standard `node_modules` directory. It uses the strict configuration from [eslint-config-detemiro](https://github.com/RuBAN-GT/eslint-config-detemiro) and Prettier. Tests use temporary files with synthetic credentials only.

## Security

- Credentials are never emitted in tool output, errors, tests, or documentation.
- Profile names are validated and cannot escape the profile directory.
- Provider directory names are URL-encoded before being used as paths.
- The primary OpenCode auth document is updated through a temporary file and atomic rename.
- This plugin does not authenticate with OpenAI itself; use OpenCode `/connect` for OAuth.

## License

[MIT](LICENSE)
