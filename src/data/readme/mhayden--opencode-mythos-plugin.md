# Mythos Provider Plugin for OpenCode (Unofficial)

> **Unofficial project.** This is a community plugin. It is not affiliated with, endorsed by, or supported by the OpenCode project or Anthropic. "OpenCode", "Anthropic", "Claude", and "Mythos" are names and trademarks of their owners and are used here only to describe what this plugin works with. Report problems with this plugin to this project, not to OpenCode or Anthropic.

This plugin registers a `mythos` provider in OpenCode V2. It sends Mythos requests to the Anthropic API using your existing `ant` CLI profile. It does not use browser automation, import browser state, or write credentials. The official `@anthropic-ai/sdk` (pinned to `0.133.0`) loads credentials, refreshes tokens, and writes them back.

```
 opencode  ──►  mythos provider  ──►  Anthropic API
                 (this plugin)         Authorization: Bearer <ant profile token>
                      ▲
                      │ reads token on each request
              ~/.config/anthropic  (written by `ant auth login`)
```

## Requirements

- OpenCode V2
- The `ant` CLI, signed in to an Anthropic account that can use Mythos models

## Quick start

1. Sign in with the `ant` CLI:

   ```sh
   ant auth login
   ```

2. Add the plugin to your OpenCode config. Use the global file (`~/.config/opencode/opencode.json` or `opencode.jsonc`) to load it in every project, or a project file to load it in one project:

   ```jsonc
   {
     "plugins": ["@mhayden/opencode-mythos-plugin"]
   }
   ```

3. Start OpenCode. It downloads and installs the plugin from npm on its own. Pick a Mythos model, for example `mythos/claude-mythos-5-1`.

That is all. You do not need to clone anything or run `bun install`.

### Pin a version

Add `@<version>` to the name to stay on one release, the same way you would pin any other OpenCode plugin:

```jsonc
{
  "plugins": ["@mhayden/opencode-mythos-plugin@0.1.0"]
}
```

### Pass options

Use the object form to pass [options](#options):

```jsonc
{
  "plugins": [
    {
      "package": "@mhayden/opencode-mythos-plugin",
      "options": { "profile": "work" }
    }
  ]
}
```

### Load from a local checkout

To run the plugin from a clone (for example while you change it), install its dependencies and point `package` at the clone's **directory**. OpenCode finds the entry point through `server.ts` at the repository root.

```sh
git clone https://github.com/major/opencode-mythos-plugin.git ~/git/opencode-mythos-plugin
cd ~/git/opencode-mythos-plugin
bun install --omit dev --omit peer --ignore-scripts
```

```jsonc
{
  "plugins": ["/home/you/git/opencode-mythos-plugin"]
}
```

- `package` must point to a directory, not to a file. OpenCode skips plugin paths that point to a file.
- Paths can be absolute, `file://` URLs, or relative (`./` or `../`). Relative paths are resolved from the folder that holds the config file.
- A symlink in a `plugins` folder, such as `.opencode/plugins/mythos`, also works, but plugins found this way get no options. Set `ANTHROPIC_PROFILE` in your environment instead.

## Use Mythos models

After OpenCode loads the plugin, a provider named **Mythos** (ID `mythos`) shows in the model picker. To make a Mythos model the default, add it to your config:

```jsonc
{
  "model": "mythos/claude-mythos-5-1"
}
```

The model reference format is `provider/model`, with an optional `#variant` at the end.

## Authentication

### Profile resolution

The plugin uses the first profile name it finds, in this order:

1. The `profile` plugin option
2. The `ANTHROPIC_PROFILE` environment variable
3. The active profile stored in `<config dir>/active_config`
4. `default`

The config dir is `~/.config/anthropic` by default. Set `ANTHROPIC_CONFIG_DIR` to use another directory.

The SDK credential chain can also resolve environment-based federation config. If it finds one, the plugin uses it.

### Setup and first request

- **Setup** only checks that a profile configuration resolves. It does not read or refresh the token.
- **No configuration** means no Mythos provider is registered. Mythos will not appear in OpenCode.
- **Missing or broken credentials** do not stop setup. The error shows on the first Mythos request and tells you to run `ant auth login`.

### Each request

- Each request uses the current token from the SDK. The SDK refreshes the token when it is close to expiry and writes the new token back.
- Concurrent requests share one token load.
- If the API returns `401`, the next token load forces a refresh. If a load is already running, the next request waits for it to finish first. The failed request is not retried automatically. Send your message again.

## Options

| Option    | Type   | Default                         | Purpose                                                |
| --------- | ------ | ------------------------------- | ------------------------------------------------------ |
| `profile` | string | Resolved as described above     | Which `ant` profile to use.                            |
| `baseURL` | string | Profile `base_url` or Anthropic | API host override, for example a local test server.    |

### `baseURL` rules

- Must use `https`.
- `http` is allowed only for loopback hosts: `localhost`, `127.0.0.0/8`, and `::1`. Use this for local testing.
- Must not include credentials, a query string, or a hash.

> **Warning:** Real credentials are sent to the configured `baseURL`. The plugin refuses to attach credentials to any other origin. Only point `baseURL` at hosts you trust.

## Model list

The `mythos` provider includes:

- Every model from OpenCode's built-in `anthropic` catalog, with the same pricing and limits. This includes mode entries such as `-fast`.
- `claude-mythos-5-1` and `claude-mythos-5`. These reuse the pricing and limits of `claude-fable-5-1` and `claude-fable-5`.

If a template model is missing from the catalog, the plugin uses static fallback values for the Mythos models.

All models use the native Anthropic driver.

## Troubleshooting

| Problem | What to check |
| ------- | ------------- |
| Mythos is not in the model picker | Run `ant auth login`. Check that the `profile` option or `ANTHROPIC_PROFILE` names a profile that exists. For a local checkout, check that `package` points to the plugin directory, not to `server.ts`. |
| `Invalid profile` error at startup | The `profile` option is empty or is not a string. |
| `Invalid API base URL` error at startup | The `baseURL` is not `https` (or `http` on a loopback host), or it has a user name, password, query, or hash. |
| `refusing to send credentials to <origin>` on a request | The request went to a host other than the configured `baseURL`. The plugin never attaches your token to other hosts. |
| `could not load Anthropic profile credentials` on a request | Your token could not be loaded or refreshed. Run `ant auth login` again. |
| `Cannot find module '@anthropic-ai/sdk'` (local checkout) | Run `bun install --omit dev --omit peer --ignore-scripts` in the plugin directory. |

## Local development

The plugin uses the OpenCode V2 plugin API. Install all dependencies, including the published `@opencode/plugin`, `@opencode/ai`, `@opencode/schema` (2.0.28), and Effect (4.0.1) packages used for type checks and tests:

```sh
bun install
```

These development copies are only for checks and tests. They are not bundled and are not installed with the published package.

Run the checks with:

```sh
bun test ./test
bun run check
```

Tests use fixture credentials only. They never read real profile files.

## Packaging

The npm package ships only the built `dist/index.js`. The `./server` export is the entry point OpenCode looks for when it loads a plugin by package name.

- `@anthropic-ai/sdk` is a normal dependency, so npm installs it with the plugin.
- `@opencode/plugin`, `@opencode/ai`, `@opencode/schema`, and `effect` are **optional** peer dependencies. OpenCode provides its own copies at runtime, so an install must not download them. Two copies of `effect` would break the plugin.

Check a release before you publish it:

```sh
bun run build
bun run verify:package
```

`verify:package` packs the plugin, installs the tarball in a scratch folder the way OpenCode does, checks that no OpenCode or Effect packages were installed, and loads the plugin by its package name. `npm publish` runs the type check, the tests, the build, and this check first through `prepublishOnly`.

## Releasing

Releases are cut by hand from a local clone. Nothing is published from GitHub Actions.

```sh
git switch main && git pull --ff-only
rm -rf node_modules && bun install --frozen-lockfile

npm version patch --no-git-tag-version          # or minor / major
v="v$(node -p "require('./package.json').version")"
git commit -S -s -am "chore: release $v"
git tag -s "$v" -m "$v"

npm publish                                     # prepublishOnly runs all checks first
git push origin main "$v"
gh release create "$v" --verify-tag --generate-notes
```

`npm publish` runs `prepublishOnly` first: the type check, the tests, the build, and `verify:package`. If any of them fail, nothing is uploaded. Push the tag only after the publish succeeds, so every GitHub Release matches a version on npm.

## Disclaimer

This plugin is unofficial. It is not affiliated with, endorsed by, sponsored by, or supported by the OpenCode project or Anthropic. All product names and trademarks belong to their owners. Use of the Anthropic API through this plugin is subject to your own agreement with Anthropic.

## License

[MIT](LICENSE)
