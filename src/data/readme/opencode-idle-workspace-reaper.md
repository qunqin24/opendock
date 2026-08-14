# OpenCode Idle Workspace Reaper

OpenCode plugin that disposes a workspace after one hour of inactivity, using a five-second confirmation pass and a five-minute retry after SDK failures. It also disposes immediately when the current workspace session is archived or deleted, and stops its timers when OpenCode reports that the current directory's server instance was already disposed. It vetoes idle disposal while a session is busy or a PTY is running, scopes status, PTY, log, and dispose calls to the plugin directory, and only disposes through the explicit hook lifecycle.

Install with `npm install opencode-idle-workspace-reaper`, then point OpenCode at the installed package entry file under `node_modules/opencode-idle-workspace-reaper/index.ts`. For local development, configure OpenCode with `file:///home/bhyoo/projects/typescript/opencode-idle-workspace-reaper/index.ts`. Run `bun install`, then `bun run check`.

Limitation: a separate plugin cannot observe an OMO task stuck pending before session creation for over one hour.

## Releasing

The first npm publish for `0.1.1` is manual so the package exists on npm. Future publishes use npm Trusted Publishing through GitHub Actions OIDC; do not add an npm token or `NODE_AUTH_TOKEN` secret for publishing.

After `0.1.1` exists on npm, configure the package on npmjs.com under Settings → Trusted Publisher with these values:

- Publisher: GitHub Actions
- Organization or user: `isac322`
- Repository: `opencode-idle-workspace-reaper`
- Workflow filename: `publish.yml`
- Environment name: leave blank
- Allowed action: `npm publish`

For each later release, bump `package.json`, commit, tag the same version as `vX.Y.Z`, push the commit and tag, then publish a GitHub Release for that tag. The `.github/workflows/publish.yml` workflow checks the package, verifies the release tag matches `package.json`, and runs `npm publish` through OIDC. The first CI-published version should be `0.1.2` or newer, because `0.1.1` is reserved for the manual bootstrap publish.

npm provenance is generated automatically for GitHub Actions trusted publishing only when the package and source repository are public. If this GitHub repository stays private, OIDC publishing can still be configured but npm provenance will not be generated.
