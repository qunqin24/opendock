# opencode-session-notes

opencode plugin: persistent session notes and plans with cross-session search.

## Install

In `~/.config/opencode/opencode.jsonc` (or a project's `opencode.json`):

```jsonc
{
  "plugin": ["opencode-session-notes"]
}
```

Requires opencode 1.19.0 or later.

## Releasing

Releases go through [`jflowers/ship`](https://github.com/jflowers/ship)'s shared
npm workflow, the same one the other opencode plugins use, so the pipeline
is fixed in one place. To release:

1. Commit the version bump to `main` (`package.json`), and wait for CI.
2. Dispatch the Publish workflow with the matching tag (don't push tags
   yourself):

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

**First release only.** `opencode-session-notes` isn't on npm yet. Publish 0.1.0 once by
hand (`npm publish` from a clean checkout of `main`, with 2FA), add the
trusted publisher on npmjs.com (repository `jflowers/opencode-session-notes`, workflow
`publish.yml`, no environment), then dispatch `v0.1.0`: the run tags it,
skips the publish because 0.1.0 is already there, and creates the GitHub
release.
