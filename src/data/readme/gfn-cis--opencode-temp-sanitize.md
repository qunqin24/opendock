# opencode-temp-sanitize

OpenCode 2 plugin that gives each project its own temporary directory.

## Why

OpenCode tells every model to prefer `$TMPDIR/opencode` (usually `/tmp/opencode`) over
`/tmp` for scratch files, and pre-approves it for external access. All projects and
sessions share that one directory, so it grows without bound and nobody can tell which
project left what. On hosts where `/tmp` is a size- or quota-limited tmpfs this
eventually breaks unrelated programs.

## What it does

- Creates `/tmp/opencode/<slug>` for the current project, where `<slug>` is the project
  directory relative to `$HOME` with `/` replaced by `-`, plus the CRC32 of the OpenCode
  project id: `~/work/example-app` becomes `work-example-app-1a2b3c4d`. Sessions outside
  any project use `global`.
- Rewrites the core temporary-directory hint in the system prompt to point at that
  directory, and asks models to delete files there that they or their subagents created
  once those files are certainly no longer needed. The directory stays inside the
  pre-approved tree, so no new permission prompts.
- Sets `TMPDIR` to the same directory for shell commands the agent runs.
- Deletes files older than 48 hours from project directories, on startup and then
  hourly. "Older" means neither atime nor mtime changed in that time (mtime covers
  `noatime` mounts). Rules:
  - only regular files and symlinks are deleted; symlinks are never followed, so their
    targets are safe; sockets and FIFOs are left alone;
  - subdirectories are removed once empty; project directories themselves stay;
  - every project directory in `/tmp/opencode` is swept, so projects that are never
    reopened get cleaned too; loose files directly in `/tmp/opencode` are not touched,
    since OpenCode instances without this plugin put them there.

Models treat the hint as advice; nothing prevents them from writing elsewhere.

## Install

Add to the `plugins` array in `opencode.json`, pinned to a version:

```json
{
  "plugins": ["@gfn-cis/opencode-temp-sanitize@0.3.0"]
}
```

or straight from a git tag:

```json
{
  "plugins": [
    "@gfn-cis/opencode-temp-sanitize@git+https://github.com/GFN-CIS/opencode-temp-sanitize.git#v0.3.0"
  ]
}
```

Requires OpenCode 2.

Each tag has a [GitHub Release](https://github.com/GFN-CIS/opencode-temp-sanitize/releases)
with the `npm pack` tarball, `SHA256SUMS` and a Sigstore build-provenance bundle; CI then
publishes that same tarball to npm via trusted publishing (OIDC, no tokens). Verify a
downloaded tarball with:

```sh
gh attestation verify gfn-cis-opencode-temp-sanitize-<version>.tgz --repo GFN-CIS/opencode-temp-sanitize
```

## Upstream dependency

The rewrite matches the exact sentence emitted by OpenCode core in
`packages/core/src/instructions/builtins.ts` (`core/environment`, verified at v2.2.6),
and assumes the shared directory is `path.join(os.tmpdir(), "opencode")` as in
`packages/util/src/global-roots.ts`. If upstream changes the wording, the plugin logs
`[temp-sanitize] tmp hint not found` once per session and models fall back to the shared
directory. `tests/project-tmp.test.js` pins the sentence.

## Development

```sh
npm ci
npm run coverage   # vitest, 80% thresholds
npm run lint       # biome
npm run knip
```

Logic lives in `src/project-tmp.js` and `src/sweep.js`; `index.js` only wires OpenCode
hooks and the cleanup timer.

CI runs the checks above on Node 22 and 24. Also in `.github/workflows/`: CodeQL
(`security-and-quality` suite, only while the repository is public, since code scanning on
private repositories needs GitHub Advanced Security), OpenSSF Scorecard, and dependency
review on pull requests. Security reports: see [SECURITY.md](SECURITY.md).
