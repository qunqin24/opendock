# opencode-session-notes

opencode plugin: persistent session notes and plans with cross-session search.

## Install

In `~/.config/opencode/opencode.jsonc` (or a project's `opencode.json`):

```jsonc
{
  "plugin": ["opencode-session-notes"]
}
```

The plugin also loads its `session-notes` skill (when and how to use the note
tools); there is nothing to link into `~/.config/opencode`.

Requires opencode 1.19.0 or later.

## Releasing

Releases go through [`jflowers/ship`](https://github.com/jflowers/ship)'s shared
npm workflow, the same one the other opencode plugins use, so the pipeline
is fixed in one place. To release:

1. Make sure CI passed on `main`. There is no version bump: `package.json`
   holds `0.0.0-development`, and the release sets the version from the tag.
2. Dispatch the Publish workflow with the tag (don't push tags yourself):

   ```bash
   gh workflow run publish.yml -f tag=vX.Y.Z
   ```

ship's preflight checks the tag (semver, new, newer than the last), that CI
passed on `main`, and that there are unreleased commits, then creates the
tag. The package is published to npm with provenance through trusted
publishing (no token) and the GitHub release is created with generated
notes. A version already on npm is skipped, so a re-run is safe.

npm trusts `publish.yml` by name: renaming it breaks publishing until the
trusted publisher on npmjs.com is updated.
