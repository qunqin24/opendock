# opencode-context-limit

> Forked from [jadmadi/opencode-context-limit](https://github.com/jadmadi/opencode-context-limit), which is licensed AGPL-3.0-only and Copyright (C) 2026 Jad Madi. This fork ports the plugin to OpenCode 1.x.

An OpenCode V1 plugin that sets a working context budget and a max output-token
budget per model. Lower the context budget to make compaction fire earlier than
the catalog window, for cost tiers or when a provider serves less than the
catalog claims. Lower the output budget to cap a single reply. A budget never
raises the value.

## OpenCode

This plugin runs on OpenCode 1.x: https://opencode.ai

## Install

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/amit-batra/opencode-context-limit/main/context-limit.ts \
  -o ~/.config/opencode/plugins/context-limit.ts
```

For one project, put it in `.opencode/plugins/`. Tested against OpenCode v1.19.6.

To pin a release, replace `main` in the URL with a tag such as `v2026.11.0`.

## Use

| Command                            | Effect                                        |
| ---------------------------------- | --------------------------------------------- |
| `/context-limit`                   | Show the context budget for the current model |
| `/context-limit 128K`              | Set it for the current model                  |
| `/context-limit 50%`               | Set half the catalog window                   |
| `/context-limit opencode-go/* 128K`| Set a context pattern                         |
| `/context-limit <target> 0`        | Clear a context target                        |
| `/output-limit`                    | Show the output budget for the current model  |
| `/output-limit 16K`                | Set it for the current model                  |
| `/output-limit * 16K`              | Cap output for every model                    |
| `/output-limit <target> 0`         | Clear an output target                        |

Values accept plain tokens (`128000`), `128K`, `1M`, and `50%`. Every value is
clamped to the catalog value for that field, so it can only lower the budget,
never raise it.

Patterns match `provider/model`. `opencode-go/*` matches one provider, `*`
matches everything. The longest matching pattern wins. Use `current` as the
target to mean the current model explicitly.

Command output is shown as a toast. The command is intercepted before it can
start a model turn.

## How it works

OpenCode 1.x has no runtime model transform. At startup the plugin reads the
catalog from `~/.cache/opencode/models.json`, loads its rules, and uses the
`config` hook to lower `limit.context` and `limit.output` on matching provider
models. Compaction's default threshold follows the model's usable input budget,
so a lower window makes compaction fire earlier. Nothing is written to
`opencode.json`.

Rules live in `~/.local/share/opencode/context-limit/rules.json` (or under
`XDG_DATA_HOME`). Changing a **context** budget requires restarting OpenCode,
because v1 loads model limits once at startup. An **output** budget also takes
effect immediately through the `chat.params` hook, which caps
`maxOutputTokens` on each request.

## Tests

```sh
bun test
```

## Releasing

Every push to `main` opens (or updates) a `release`-labelled PR that bumps the
patch version. You can edit that PR before merging: change `version` in
`package.json`, then run `node scripts/sync-version.mjs` to copy it into the
`VERSION` constant. Merging the PR publishes the new version to npm from
`publish.yml`. A manual `workflow_dispatch` run of that workflow also publishes.

One-time npm setup: on npmjs.com, open the package's **Settings → Trusted
publishing** and add a GitHub Actions publisher with user `amit-batra`,
repository `opencode-context-limit`, workflow filename `publish.yml`, no
environment, and **npm publish** enabled (new configurations default to staging
only). The first successful publish must happen within two days of creating the
configuration. The workflow uses OIDC, so no npm token secret is needed.

## Attribution

Inspired by MiMoCode's `/context-limit`. See `NOTICE`.

## License

AGPL-3.0-only. Copyright (C) 2026 Jad Madi. V1 port Copyright (C) 2026 Amit Batra.
