# opencode-dutch-coach

An OpenCode 1.x plugin that provides Dutch A1/A2 and A2/B1 correction and
practice skills. It explains common mistakes in English and adds a `/dutch`
command for direct access. The command selects the appropriate level from an
explicit target, the request and current conversation, and uses A1/A2 when the
level is unclear.

## Installation

Install the package from npm in an OpenCode project:

```sh
pnpm add --save-dev opencode-dutch-coach
```

Add the plugin to that project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dutch-coach"]
}
```

## Local Testing

Install Node.js 26 or newer and pnpm 11.24.0 before running the commands below.

```sh
pnpm pack
```

Install the generated tarball in an OpenCode project, replacing `<version>` with
the version printed by `pnpm pack`:

```sh
pnpm add --save-dev /absolute/path/to/opencode-dutch-coach-<version>.tgz
```

Add the plugin to that project's `opencode.json` if it is not already present:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dutch-coach"]
}
```

For an isolated test fixture, the plugin entry can instead point directly to
the installed artifact with a `file://` URL. This avoids relying on package
resolution outside the fixture:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///absolute/path/to/project/node_modules/opencode-dutch-coach/dist/plugin.js"
  ]
}
```

Quit and restart OpenCode after changing the plugin or its configuration.

## Usage

Use `/dutch` with text to request a correction:

```text
/dutch Ik heb gisteren naar school gegaan.
```

Use `/dutch` without text to start an interactive coaching session. The command
supports both A1/A2 and A2/B1 practice. You can state the target level directly,
or ask OpenCode to correct, review, or help you practise Dutch and let it infer
the level from the request and current conversation.

The plugin adds its skill path without removing existing skill paths or URLs.
It also does not replace an existing `dutch` command. If another configuration
already defines `/dutch`, that command remains active.

## Development

```sh
pnpm test
pnpm run test:integration
```

The automated tests validate the source package, the packed package artifact, and
OpenCode's model-free skill and command discovery. Model-backed response
quality is covered by manual smoke testing because it depends on the selected
provider.
