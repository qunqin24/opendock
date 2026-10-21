# herdr-ocx

OCX-aware Herdr restoration for OpenCode V2. Preserves the selected root conversation, OCX profile, launcher, and explicit `OPENCODE_DB` value. Deleting the selected conversation clears its saved restore command.

Requires OpenCode V2, OCX 3, and Herdr 0.9.2 or newer. Runs only inside Herdr when launched with an OCX profile.

## Install

Install the npm package into an OCX profile:

```sh
ocx oc --profile yourprofile plugin add herdr-ocx
```

`plugin add` does not disable Herdr's built-in session-selection plugin. In `~/.config/ocx/profiles/<profile>/cli.json`, add `-herdr.opencode.session-selection` to the `plugins` list (or leave it there if already present). For example:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "-herdr.opencode.session-selection",
    { "package": "herdr-ocx" }
  ]
}
```

Preserve your other settings and plugin entries, and don't enable another Herdr session/state reporter alongside this replacement. Restart OpenCode after changing plugins.

Launch normally, for example:

```sh
ocx oc --profile personal
ocx oc --profile work
```

The reporter preserves `OPENCODE_DB` verbatim. OpenCode resolves relative database overrides against its data directory, not the working directory. Restoration uses `ocx oc` with the active profile.

## Publish

To validate and publish a new version:

```sh
npm ci
npm run typecheck
npm publish --dry-run
npm publish
```

OpenCode loads the exported TypeScript entrypoints directly; no build step is needed.

MIT. See [LICENSE](./LICENSE).
