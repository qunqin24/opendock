# opencode-ext

OpenCode extensions for loading environment variables and restricting
long-running bash commands.

## Usage

Add the package to your OpenCode config (`opencode.json`):

```json
{
  "plugin": ["opencode-ext"]
}
```

The package exports `OpenCodeExtEnv` and `OpenCodeExtArmor`. OpenCode loads both
extensions from the package.

## Configuration

Create a configuration file in any of these locations:

1. `~/.opencode-ext.json` - global
2. `./.opencode-ext.json` - project root
3. `./.opencode/ext.json` - OpenCode project configuration

Higher-precedence scalar values override lower-precedence values. Arrays and
objects use the feature-specific merge behavior described below.

```json
{
  "$schema": "https://github.com/NazmusSayad/opencode-ext/raw/refs/heads/schema/schema.json",
  "env": {
    "files": [".env", ".env.local"],
    "define": {
      "NODE_ENV": "development",
      "MY_VAR": "value"
    },
    "disableGlobal": false,
    "disableCwdEnv": false,
    "disableDirenv": false,
    "disableCwdDirenv": false
  },
  "armor": {
    "priority": "whitelist",
    "message": "Blocked: `{{COMMAND}}` (matched `{{PATTERN}}`)",
    "blacklist": {
      "commands": ["custom-pattern"],
      "disableDefaults": false,
      "disableGlobal": false
    },
    "whitelist": {
      "commands": ["vitest"],
      "disableDefaults": false,
      "disableGlobal": false
    },
    "command": {
      "before": { "command": "set -e", "comment": "Fail fast" },
      "after": { "command": "echo done", "comment": "Notify" }
    }
  }
}
```

## Environment Variables

`env.files` lists `.env` files to load. Relative paths are resolved from the
project or shell working directory, and paths beginning with `~/` are resolved
from the home directory. Files are loaded in configured order, with later files
overriding earlier files.

`env.define` adds inline variables. Project settings override global settings,
and `.opencode/ext.json` settings override project settings.

`env.disableGlobal` excludes only the global `files` and `define` values.
`env.disableCwdEnv` prevents loading configured files from a different shell
working directory. `env.disableDirenv` disables direnv entirely, while
`env.disableCwdDirenv` disables direnv only for a different shell working
directory.

Direnv is enabled by default and requires the `direnv` executable to be
installed. No `.env` files are loaded unless `env.files` is configured.

## Command Armor

`armor.priority` accepts `whitelist` or `blacklist` and defaults to
`whitelist`. The blacklist blocks matching bash command prefixes, while the
whitelist provides allowed exceptions according to the selected priority.

`armor.blacklist.commands` and `armor.whitelist.commands` add patterns.
`disableDefaults` excludes that list's built-in patterns, and `disableGlobal`
excludes that list's global patterns.

`armor.message` customizes the blocked-command error and supports the
`{{COMMAND}}` and `{{PATTERN}}` placeholders.

`armor.command.before` and `armor.command.after` inject commands before or after
allowed bash commands. Each accepts `command` and an optional `comment`.

## CLI

Update explicitly named plugins in OpenCode's package cache:

```sh
opencode-ext update-plugin plugin-one plugin-two
```

Omit plugin names to update every plugin discovered in
`~/.cache/opencode/packages/`.

## Debugging

Set `OPENCODE_EXT_ENV_LOG_ENABLED=true` to enable environment extension logs.
They are written to `os.tmpdir()/.opencode-ext-env-logs/` by default. Set
`OPENCODE_EXT_ENV_LOG_PATH` to use another directory.

Environment logs contain resolved variable names and values, including secrets.
Enable them only when needed and protect or remove the resulting files.

Set `OPENCODE_EXT_ARMOR_ENABLE_LOG=true` to write Armor logs to
`os.tmpdir()/.opencode-ext-armor-logs/`.
