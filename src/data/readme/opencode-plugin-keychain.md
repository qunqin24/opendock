# opencode-plugin-keychain

> [!WARNING]
> Currently **macOS only** (uses the `security` CLI). Linux support is TBD.

Load OpenCode provider API keys from the macOS login Keychain at startup, so your `opencode.json` / `opencode.jsonc` stays **secret-free and safe to commit**.

## Why

In principle, you do not want to save your credentials on your machine as plaintext, that includes opencode config files:

```jsonc
{
  "provider": {
    "openai": {
      "options": { "apiKey": "sk-REAL-SECRET-DO-NOT-COMMIT" }
    }
  }
}
```

OpenCode supports `{env:VAR}` interpolation, but that just moves the secret into plaintext in `~/.zshrc` or a `.env` file, where it leaks into every subprocess and `env` dump.

This plugin keeps the placeholder syntax **and** keeps the real secret in the OS-encrypted Keychain:

```jsonc
{
  "provider": {
    "openai": {
      "options": { "apiKey": "{env:OPENAI_API_KEY}" } // resolved from Keychain at runtime
    }
  }
}
```

- **Config is commit-safe** — no secrets in the file, ever.
- **Secrets live in encrypted storage** — the macOS login Keychain, not plaintext dotfiles.
- **Predictable convention** — service name = env var name, no config drift.
- **Works for tools too** — resolved values are injected into shell/tool subprocesses.

## Install

OpenCode loads plugins from two places — pick whichever fits.

### Option A — npm package (recommended)

Add it by name to the `plugin` array. OpenCode installs npm plugins automatically (via Bun) at startup:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-keychain"]
}
```

### Option B — drop-in plugin directory

OpenCode auto-loads any `.ts` / `.js` file in a plugin directory, with no config entry needed (`~/.config/opencode/plugins/` globally, or `.opencode/plugins/` per project):

```bash
git clone https://github.com/tiansuyu/opencode-plugin-keychain ${some_project_path}

mkdir -p ~/.config/opencode/plugins
ln -s ${some_project_path}/index.ts ~/.config/opencode/plugins/keychain.ts
```

> After installing or editing your config, **restart OpenCode** — config and plugins are loaded once at startup and are not hot-reloaded.

## Adding secrets

The plugin uses a fixed convention in the **login** Keychain (the `security` default):

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| service (`-s`) | the env var name, e.g. `OPENAI_API_KEY` |
| account (`-a`) | `$USER` (current macOS user)            |

**1. Store the secret**:

```bash
security add-generic-password -a "$USER" -s OPENAI_API_KEY -w # prompts for adding secrets
security add-generic-password -U -a "$USER" -s OPENAI_API_KEY -w # if you want to update an existing one
```

**2. Reference it** with `{env:VAR_NAME}` — the placeholder name **must exactly match** the service name:

```jsonc
{
  "provider": {
    "openai": { "options": { "apiKey": "{env:OPENAI_API_KEY}" } }
  }
}
```

Secrets are stored once, then can be referenced multiple times.

**3. Restart OpenCode** when done.

## How it works

This is how the secrets get loaded into OpenCode:

1. **Read the raw config.** Reads the first existing file from `$OPENCODE_CONFIG` → `./opencode.jsonc` → `./opencode.json` → `./.opencode/opencode.json` → `~/.config/opencode/opencode.{jsonc,json}`, strips comments, and parses it.
2. **Find placeholders.** Walks the parsed object and records every `{env:VAR}` string with its **path** in the config tree (e.g. `provider.openai.options.apiKey → OPENAI_API_KEY`).
3. **Resolve from Keychain.** For each unique var, runs `security find-generic-password -a "$USER" -s VAR -w`. A missing entry logs a warning (with the exact command to fix it) and is skipped — the plugin never crashes.
4. **Inject** via the two hooks: `config` writes each secret back into its recorded path (overwriting the empty string OpenCode left behind), and `shell.env` adds the secrets to subprocess environments.

The secret only ever exists in the Keychain and in process memory — never in your config file or git history.

## Requirements

- **macOS** — uses the `security` CLI. On other platforms the plugin is a no-op.
- **OpenCode** with **Bun** (the runtime it uses to execute plugins).
- **Node.js ≥ 18** (only relevant if you run/install it outside OpenCode's Bun runtime — the code uses only long-stable `node:` built-ins).

## Releasing

Publishing is triggered **only** by pushing a `v*` git tag — never by a local command. To cut a release:

1. Update [`CHANGELOG.md`](./CHANGELOG.md) and bump the version in `package.json` (e.g. `bun pm version patch --no-git-tag-version`), then commit and merge to `main`.
2. Tag the release commit and push the tag:

   ```sh
   git tag v0.1.1
   git push origin v0.1.1
   ```

The pushed tag triggers the **Publish** workflow, which typechecks, verifies the tag matches `package.json`, and runs `npm publish`.

Publishing uses **npm OIDC trusted publishing** — no tokens or secrets are stored in the repo. (npm's classic automation tokens were deprecated in December 2025.)

> **One-time setup:** on npmjs.com, open the package → **Settings → Trusted Publisher** and add a GitHub Actions publisher: organization/user `TiansuYu`, repository `opencode-plugin-keychain`, workflow filename `publish.yml`. After that, the workflow authenticates automatically via OIDC.

## License

MIT
