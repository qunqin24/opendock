# opencode-kaush

Small, composable plugins for [OpenCode](https://opencode.ai) v2.

## Packages

| Package                                                               | Description                                                                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@opencode-kaush/opencode-intercom`](./extensions/opencode-intercom) | Inter-session messaging: `/intercom` picker, an `intercom_send` tool, queue-when-busy delivery, and reply-by-default between any two sessions. |

Every package is independently versioned and publishable to npm.

## Use a plugin

### Install from npm (recommended)

Add the package to your `opencode.jsonc`:

```jsonc
{
  "plugins": ["@opencode-kaush/opencode-intercom"],
}
```

Or run `opencode plugin add @opencode-kaush/opencode-intercom`. Restart OpenCode or run `opencode service restart` so the plugin loads.

### Run from a local clone

Clone the repository and point `plugins` at the checkout:

```sh
git clone https://github.com/kaushikgopal/opencode-kaush.git
cd opencode-kaush
npm install
npm run check
```

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-kaush/extensions/opencode-intercom"],
}
```

## Publishing

Packages publish from `.github/workflows/publish.yml` with npm Trusted Publishing. GitHub Actions exchanges its OIDC identity for a short-lived npm credential, so the repository stores no npm write token.

Each npm package must trust the following publisher:

- Provider: GitHub Actions
- Organization or user: `kaushikgopal`
- Repository: `opencode-kaush`
- Workflow filename: `publish.yml`
- Environment: `npm`
- Allowed action: `npm publish`

Create a GitHub release whose tag identifies the workspace and exactly matches its package version:

```text
opencode-intercom-v0.1.0
```

The workflow only publishes tag prefixes wired into `publish.yml` (the job filter and resolver); wiring a new package means adding its prefix there first, and the release is skipped otherwise.

The workflow verifies the tag against `package.json`, runs the full repository check, and publishes only that workspace. A package's first release must be bootstrapped interactively on npm before its Trusted Publisher can be configured; subsequent releases use GitHub OIDC without local login or write-action 2FA prompts.

### First release bootstrap

1. Create the npm org `opencode-kaush` on npmjs.com (one time).
2. From the repo root, publish manually and approve the 2FA prompt:
   ```sh
   npm publish --workspace @opencode-kaush/<package> --access public
   ```
3. On npmjs.com, open the package's **Settings → Trusted Publisher** and register the publisher listed above. The `npm` environment is created automatically in the GitHub repo by the workflow's first run.

From then on, `make publish PACKAGE=<package>` handles everything: it bumps the version, runs `npm run check`, commits, pushes to `main`, and creates the GitHub release that publishes the package via OIDC.

## License

[MIT](./LICENSE)
