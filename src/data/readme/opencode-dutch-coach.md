# opencode-dutch-coach

An OpenCode 1.x plugin that provides Dutch A1/A2 and A2/B1 correction and
practice skills. It explains common mistakes in English and adds a `/dutch`
command for direct access. The command selects the appropriate level from an
explicit target, the request and current conversation, and uses A1/A2 when the
level is unclear.

## Installation

Install the plugin globally with the OpenCode CLI:

```sh
opencode plugin opencode-dutch-coach --global
```

This installs the npm package and adds it to OpenCode's global configuration. To
install it for the current project only, omit `--global`:

```sh
opencode plugin opencode-dutch-coach
```

You can also add the plugin to `opencode.json` manually:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dutch-coach"]
}
```

OpenCode installs npm plugins automatically at startup and caches them in its
OpenCode data directory. Quit and restart OpenCode after installing the plugin
or changing its configuration.

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

## Automatic Updates

When OpenCode starts, npm installations that use `latest` or a version range are
checked for a newer Dutch Coach release. If one is available, the plugin clears
OpenCode's cached package copy and shows a notification asking you to restart
OpenCode to finish the update.

Pinned versions, local paths, and Git-based installations are not changed. Update
checks and notifications fail silently, so they never prevent the Dutch coaching
skills or `/dutch` command from loading.

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
