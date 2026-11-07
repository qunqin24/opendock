# zcode-plugin-secret-env

**A local credential manager for AI coding agents**: secrets travel straight from your private vault into the Bash subprocess environment — the model context only ever sees placeholder / variable names, never values.

> **For npm reviewers / security scanners**: this is an *open-source developer tool in the same category as doppler / bitwarden-cli / 1password-cli*. It manages the user's own credentials on their own machine: it calls local vault CLIs (`security` for macOS Keychain, `bw`, `op`, `ov`) and injects resolved values into a subprocess environment via a temp 0600 file. It sends nothing anywhere, has no network listeners, and every external call is to the user's own configured vault backend. Source of truth: `core.mjs` (~400 lines), fully readable.

[简体中文](./README.zh-CN.md) | English

## ⚠️ Version security notice

**Versions up to and including 0.1.x are not recommended.** Their design stores credential mappings (and, when configured, the vault master password) in a **plaintext JSON file** (`~/.config/secret-env/secrets.json`, 0600). Protection covers the *agent context* only — values never enter the model, the command text, or the audit log — **not** the disk: anyone who can read the mapping file gets every configured token.

From **0.2.0 onwards the tool uses a KeePassXC-compatible encrypted `.kdbx` vault** as its secret store. It does **not** use the system keychain and does **not** touch system-protected secrets (OS keyring entries, login/payment credentials stay entirely outside this tool's scope). Mappings and high-value values live in the AES-encrypted vault; only the vault path and master password are configured in secrets.json.

## Origin

OpenViking's privacy area is the ideal home for secrets — but when consuming them via the `{{ov_privacy:...}}` placeholder, the MCP side (`privacy_resolve`) resolves the plaintext and it **inevitably flows back into the model context and session records**. However strict the storage side is, that consumption step hands the value to the model. This plugin exists to close that gap: secrets travel from the privacy area straight into the Bash subprocess environment, with the resolution chain completely bypassing the model context.

## How it works

A PreToolUse(Bash) hook scans the command text for **explicit references** (a `{{secret:NAME}}` placeholder or a configured well-known `$VAR`), resolves the true value via a provider into a 0600 temp env file (exported under the name actually referenced in the command, i.e. the well-known original name), and lets the command through with only a source prefix: `. <envfile>; <original command>`. The command text is never rewritten; for implicit env consumers the skill guides the agent to make the reference explicit. Text and value are separated — the audit log only ever sees the env file path.

- **Providers**: `keychain://` (macOS Keychain) / `viking://` (OpenViking privacy layer via `ov privacy resolve`) / `bitwarden://` (Bitwarden CLI) / `onepassword://` (1Password CLI)
- **Dump blacklist**: a command is rejected only when it contains both a secret reference and a dump intent (`env` / `printenv` / bare `set` / bare `export`) at command position
- **Single-quote taboo**: a reference inside single quotes would never expand → the whole command is rejected (fail loudly, no magic)
- **Explicit-reference convention**: the hook is a dumb text scanner; tools that consume env vars implicitly (e.g. bare `gh pr list` reading `' + 'GH_TOKEN' + '`) are handled by the model per the skill, written explicitly as `' + 'GH_TOKEN' + '=$' + 'GH_TOKEN' + ' gh pr list`

## Working with other agent harnesses

Any tool that reads credentials from environment variables is supported with **zero integration code** — write the well-known variable explicitly and the hook injects it:

```bash
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY pi        # pi coding agent (reads the DeepSeek key)
OPENAI_API_KEY=$OPENAI_API_KEY my-cli        # same pattern for any env-var-driven tool
```

This forms a two-tier integration spectrum:

| Tier | Mechanism | Cost | Covers |
|---|---|---|---|
| Env-var injection | explicit `$`VAR` reference in the command → hook injects into the subprocess env | zero code | every harness whose credentials come from env vars (the common convention) |
| Interception adapters | per-host rewrite of tool calls (ZCode PreToolUse hook / opencode plugin / DSH cordis wrapper) | one adapter per host | hosts where the *agent's own Bash commands* need injection |

The two compose: an agent running inside ZCode can invoke another harness as a subprocess, and credentials flow harness-to-harness without ever entering the model context. For a host with no adapter at all, driving it through `srun` (below) from inside the agent's Bash is the escape hatch.

## srun — injection outside agent hosts

Everything above happens inside an agent host. Outside one — bare terminal, ad-hoc commands, scripts, cron, launchd/systemd units — `srun` is the injection channel. It reads the same secrets file, resolves the named entries through the same providers, and execs the command with them in the subprocess environment: stdio inherited, exit code passed through, and the value appears nowhere — not on the command line, not in rc files, not in shell history.

```bash
srun GH_TOKEN -- gh pr list            # resolve one entry and run
srun GH_TOKEN BW_SESSION -- ./deploy.sh  # several entries at once
srun DEEPSEEK_API_KEY -- pi            # launch an agent host with its key in env
srun --all -- ./legacy-tool.sh         # inject every configured entry (exists for the cases that genuinely need the full set)
```

The named form is the default and recommended one. For long-running services, `srun` works as the unit's entry point (e.g. systemd `ExecStart=/usr/local/bin/srun BW_SESSION -- my-service`), so plaintext never appears in the unit file either.


## Install

This project is an npm package plus thin per-host shells. Install per harness — **ZCode needs the main package only; opencode needs the main package plus its plugin package; DSH needs the main package (global CLI) plus the bundle package.**

Global command (the real body). It is **required** for ZCode and opencode — ZCode's hooks and opencode's interception hook both shell out to the bare `secret-env` command, resolved via `PATH`; DSH's bundle likewise speaks the host protocol to that `PATH` command (`$SENV_BIN` overrides the path):

```bash
npm i -g @foperate/secret-env   # or `bun link` inside the repo, which registers secret-env and senv (same CLI, short alias)
```

ZCode shell: Plugin Marketplace → Add Marketplace, paste this repo root → Install **secret-env**. Main package only — the marketplace step installs the shell's declarations (hooks.json, plugin.json, skills) but **does not run any package manager**, so it does not bring the `secret-env` command with it. Its hooks invoke the bare commands `secret-env` and `senv-mcp`, resolved through `PATH`; without the global install above the plugin loads but every hook fails. Install the global command first, then the plugin.

opencode shell (V2): shipped as a **separate package** `@foperate/secret-env-opencode`, install it globally **together with the main package** (the plugin only forwards interception to the CLI and registers the skill; no `senv-mcp` — in-session registration falls back to the `senv add` terminal command; the file guard for Read/Write/Edit tools is not implemented yet — do not let the agent touch secrets.json/vault.kdbx directly):

```bash
bun install -g @foperate/secret-env @foperate/secret-env-opencode
```

```jsonc
// ~/.config/opencode/opencode.json (or project opencode.json)
{ "plugin": ["@foperate/secret-env-opencode"] }
```

Two constraints shape this setup:

- **The `plugin` array takes a package name only.** opencode rejects `@scope/pkg/subpath` specs — `npa` parses the subpath, the spec no longer counts as a registry version/range/tag, and opencode falls through to an npm install of a bogus path (`/Users/<you>/@scope/pkg/subpath/package.json`, `NpmInstallFailedError`). Subpath exports stay useful for programmatic `import`, not for this config key.
- **Install both packages globally.** The plugin declares the main package as a dependency, so installing it pulls the main package in — but a transitively installed package's `bin` entries are not linked into `~/.bun/bin` or `~/.npm/bin`, so `senv` / `senv-mcp` would not be on `PATH`. Installing both at the top level links them.

The adapter references the main package through `createRequire` absolute resolution (core, `senv-mcp`, and the skill asset), so it does not depend on `PATH`. Local development: `bun install` at the repo root establishes the workspace link, then point the plugin array at the adapter directory.

Note the host does **not** auto-discover a plugin package's own `skills/` directory — the adapter registers the skill via `ctx.skill.transform`, reading `SKILL.md` from the main package; removing the plugin removes skill and MCP with it.

DSH (DeepSeek Harness) bundle: **a separate package, `@foperate/secret-env-dsh`** (zero-dependency thin package that imports no main-package code). At runtime it speaks the host protocol (`protocol 1`: `info`/`inject`/`store`; values only over stdin, never echoed) to the global CLI on `PATH`, so DSH needs **two packages**: the global CLI plus the bundle. The Host plugin provides the bash injection, file/channel guards, the secret-list prompt section, and the `add_secret` tool:

1. The global CLI is installed above under “Global command” — DSH must find `secret-env` on `PATH`, otherwise the plugin refuses to load (fail closed).
2. Install the bundle — inside DSH you can have the agent follow this section (each `plugin_manager` call asks for a one-shot full-file-access approval): `plugin_manager` → `action: install_bundle`, `target` = `@foperate/secret-env-dsh@0.3.2` (the npm package, never a local directory). The profile's `package.json` dependency and `dsh.profile.bundles` record `@foperate/secret-env-dsh` afterwards.
3. Install the skill (**shipped inside the bundle**), pointing at the installed bundle:
   ```bash
   ln -sfn "$HOME/.dsh/profiles/desktop/node_modules/@foperate/secret-env-dsh/skills/secret-env" ~/.dsh/skills/secret-env
   ```
4. Restart DSH — Host plugin code loads at startup, so install/replace both need a restart.

Verify: a new session shows the `add_secret` tool and the configured-secret list in the system prompt (names only, never values). To update, upgrade the CLI and the bundle separately (their protocol versions must match) and restart DSH; the skill symlink follows the bundle across upgrades. To uninstall, `plugin_manager remove_bundle` (`@foperate/secret-env-dsh`) and delete `~/.dsh/skills/secret-env`. The step-by-step agent-facing version is [docs/INSTALL-DSH.md](docs/INSTALL-DSH.md).

In-session registration (all hosts): the agent asks the user to finalize the metadata — env var name with aliases (well-known candidates from context or custom input in `KEY, alias1, alias2` form), an optional description, the provider — then hands over a complete `senv add` command to run in your own terminal (hidden input, the value never touches the conversation). This terminal path is the universal baseline and works on every host.

Host integrations upgrade the value-entry step to an in-session card (type the secret into the host UI; it is written straight to the credential store, never entering the model context):

| Host | Channel | Detail |
| --- | --- | --- |
| ZCode | Bundled with the plugin: `senv-mcp` (MCP elicitation), auto-registered on install | skill `references/zcode.md` |
| opencode | Not registered (opencode host elicitation support unverified) — registration falls back to the `senv add` terminal command | n/a |
| DSH | Bundled with the DSH adapter: the `add_secret` tool (host question card) | skill `references/dsh.md` |

Whichever channel is used, the secret value never enters the model context, and results returned to the agent are always sanitized (never contain the value).

Vault a credential manually (run in your own terminal, hidden input, the value never touches the conversation):

```bash
secret-env add GH_TOKEN --provider keychain --desc 'GitHub token' --alias GITHUB_TOKEN
secret-env list
```

## Configuration

`~/.config/secret-env/secrets.json` (700 dir / 600 file; maintained by `secret-env add`, or hand-written):

```json
{
  "GH_TOKEN": { "uri": "viking://credential/github-token/token" },
  "OPENAI_API_KEY": { "uri": "keychain://zcode-openai", "aliases": ["OPENAI_KEY"] }
}
```

See [adapters/zcode/secrets.example.json](./adapters/zcode/secrets.example.json) for the template. With an empty config the hook is a pure bypass.

## Known limitations (honest disclosure)

- **No egress sanitization**: ZCode PostToolUse output has no tool_result rewrite capability (verified against harness source), so `echo $GH_TOKEN` reflow has no automatic defense — forbidden by the skill only
- **Depends on skill guidance quality**: without an explicit reference in the command, injection does not happen — by design, fail loudly
- The `viking://` provider requires the `ov` CLI (≥0.5.1) and a local OpenViking service

Design history and mechanism verification records: [docs/DESIGN.md](./docs/DESIGN.md) (Chinese).

## Feedback

Suggestions on the design or implementation are welcome — please open a [GitHub issue](https://github.com/whitemay/zcode-plugin-secret-env/issues) (Gitee users may use [Gitee issues](https://gitee.com/whitemay/zcode-plugin-secret-env/issues); the two do not sync).
