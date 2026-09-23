# @skyvence/coolify-oc

Deploy and configure projects on a self-hosted [Coolify](https://coolify.io)
instance from OpenCode. Adds a **Coolify section to the sidebar** and **21 tools**
the model can use to inspect, deploy and configure your applications.

## Install

```sh
opencode plugin add @skyvence/coolify-oc
```

That installs the package and adds it to your global `opencode.json(c)`. The
sidebar half loads automatically through the package's `./tui` entry, so it does
not also go in `cli.json`.

Restart the TUI (`opencode service restart`), run `/coolify`, choose
**Set up instance**, and enter your Coolify URL and API token.

<details>
<summary>Per project instead</summary>

Install into one project rather than globally by adding a `plugins` entry to
that project's `opencode.jsonc`:

```jsonc
{
  "plugins": [
    { "package": "@skyvence/coolify-oc", "options": { "endpoint": "https://coolify.example.com" } }
  ]
}
```

Use one or the other, not both. A global and a project entry share the same
plugin id, and OpenCode loads both, so the plugin would run twice.

</details>

## Use

There is **one** command. `/coolify` with no argument opens the configure
picker; with an argument it goes straight to that aspect. An argument rather
than a command per setting, because every one of these already exists behind the
picker — and a picker you have to click through is the thing a command should
skip:

| Aspect | What it opens |
| --- | --- |
| `/coolify instance` | Prompt for the instance URL. `url` and `endpoint` also work. |
| `/coolify token` | Prompt for the API token. `key` also works. |
| `/coolify access` | The instance and access popup, with a **refresh access** action that re-probes rather than re-reading the ten-minute cache. |
| `/coolify apps` | Every application on the instance. |
| `/coolify link` | Link this project deterministically. |
| `/coolify link model` | Link in a background tab, for a monorepo or an ambiguous match. |
| `/coolify deploy` | Deploy in a background tab. |

`instance`, `token`, `access` and the picker itself are deliberately *not* gated
on being configured — being asked for the endpoint while setting the endpoint
would be absurd. `apps`, `link` and `deploy` are gated, because they need a
working client. A typo is reported rather than quietly opening the picker.

The sidebar shows the instance, the working directory it is answering for, and
one row per application with a status light, a compact state and a refresh
countdown. Clicking a row offers Deploy, Logs, Restart and Roll back. An
unlinked project shows a `link` action beside it: the first click links with
the model in a background tab, a second click opens a paste box for a
`coolify.json` you supply yourself.

**Configure** is the entry point for linking a project and for fixing the
instance, so it is hidden once the instance answers *and* the project is
already linked — there is nothing left behind it but a redundant re-link. It
reappears as soon as either half breaks, which is also when the token's level
of access, shown inside it, is worth reading.

## Skills

The plugin registers two skills, so a client that exposes skills but not plugin
tools can use them too:

| Skill | What it does |
| --- | --- |
| `coolify-link` | Link the repository to its existing Coolify applications and record the result in `coolify.json`. |
| `coolify-deploy` | Set up and deploy the project: application settings, databases, domain, port. |

Both appear in the model's skill guidance and can be loaded with the `skill`
tool. The sidebar's deploy and link actions reference them rather than pasting
instructions, so there is one copy of each.

`/coolify link` and the `coolify-link` skill are deliberately different tools:
the aspect is the deterministic path, matching this directory against Coolify
with no model turn, while the skill is the model-driven path for a monorepo or
an ambiguous match. The sidebar's `link` action uses the skill.

## Names

The words this plugin uses, and where each one lives: [NAMING.md](NAMING.md).

## Configuration

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `endpoint` | string | — | Your Coolify base URL. `https://host`, `host` and `https://host/api/v1` all work. |
| `refreshSeconds` | integer 5–600 | `25` | Sidebar cadence. Automatically faster while a deployment or restart is in flight. |
| `recursiveProjects` | boolean | `false` | Look for **every** `coolify.json` in the repository and show one section per project. Off by default; only the literal `true` enables it. |

The API token is stored by OpenCode as a credential, never in configuration.
`COOLIFY_ENDPOINT` is used when no `endpoint` option is set.

Options are set through the object form of a `plugins` entry. `opencode plugin
add` records a bare package name and sets none, so with that install use
`/coolify instance` or `COOLIFY_ENDPOINT` for the endpoint and take the defaults
for the rest.

## `coolify.json`

Commit this at a repository root to link the repo — and each package in a
monorepo — to Coolify resources:

```jsonc
{
  "projectUUID": "proj_uuid",
  "environmentName": "production",
  "serverUUID": "srv_uuid",
  "applicationUUID": "app_uuid",              // shorthand for a single-app repo
  "applications": {
    "web": { "applicationUUID": "web_uuid", "path": "apps/web" },
    "api": { "applicationUUID": "api_uuid", "path": "apps/api" }
  },
  "databases": {
    "postgres": { "databaseUUID": "pg_uuid", "type": "postgresql", "path": "apps/api" }
  }
}
```

- By default only the **nearest** config is used — the one that owns the
  directory you are in. Set `recursiveProjects: true` to walk **down** from the
  repository root (4 levels, skipping `node_modules`, `.git`, `dist`, `build`,
  `.next`, `coverage`, `.turbo` and `vendor`) and show **one sidebar section per
  config** instead.
- `path` is repo-relative and the longest match wins, so `apps/web/admin`
  resolves the `apps/web` entry.
- Lookup order: `coolify.json` → a pinned link → matching the git remote, then
  the directory name against `GET /applications`.
- The tools can write it for you: `coolify_configure_project`, or **Map this
  project** in the sidebar.

## Tools

21 tools in the `coolify` namespace, each on one permission tier.

| Tool | Tier | Purpose |
| --- | --- | --- |
| `capabilities` | read | What the token may do, and the evidence for each verdict. |
| `resolve` | read | Find the application that already deploys this project. |
| `link` / `unlink` | write | Pin or forget an application locally. |
| `status` | read | One application's runtime state and latest deployment. |
| `list_resources` | read | Projects, applications, servers, destinations, environments. |
| `deployment_status` | read | One deployment by UUID, with a log tail. |
| `plan_application` | read | Propose build pack, port and base directory from the checkout. |
| `application` | read | `settings`, `envs` (names only), `logs`, `deployments`, `rollback_images`, `storages`. |
| `databases` / `database` | read | Every database; then one database's `backups`, `executions`, `storages`. |
| `project` | read | `get`, `environments`, `resources`. |
| `configure_project` | write | Create or update `coolify.json`. |
| `application_update` | write | `settings`, `env_set`, `env_unset`, `env_sync`, `storage_create`. |
| `create_application` | write | From public git, deploy key, GitHub App, Dockerfile or image. Records the result. |
| `create_database` | write | Provision postgres, mysql, mariadb, mongo, redis, keydb, clickhouse or dragonfly. |
| `database_manage` | write | `backup_create`, `backup_update`, `backup_trigger`, `storage_create`, `storage_update`. |
| `project_manage` | write | `create`, `environment_create`. |
| `deploy` | deploy | `deploy`, `cancel`, `rollback`, `start`, `stop`, `restart`. |
| `destroy` | destructive | Every delete, plus `migrate_*` and `move_*`. Requires explicit UUIDs. |
| `env_value` | secrets | Read one environment variable's value. The only tool that returns a secret. |

## Permissions

Five actions: `coolify.read`, `coolify.write`, `coolify.deploy`,
`coolify.destructive`, `coolify.secrets`.

Every call **asks by default**. A `deny` rule removes the tool from the model's
view rather than letting it fail:

```jsonc
{
  "permissions": [
    { "action": "coolify.read", "resource": "*", "effect": "allow" },
    { "action": "coolify.destructive", "resource": "*", "effect": "ask" }
    // deny coolify.secrets to keep environment values away from the model entirely
  ]
}
```

Environment values never appear in listings. `env_value` is the only path that
returns one, and `env_sync` pushes a `.env` file server-side so values reach
Coolify without entering the conversation.

## Development

```sh
bun install
bun run check   # tsc --noEmit + vitest
bun run test
```

Opening OpenCode in this repository runs the working tree, not the published
package. `.opencode/plugins/coolify-local/` re-exports `src/` under the ids
`opencode.coolify.local` and `opencode.coolify.local.tui`, and `opencode.jsonc`
turns off the global package for this project. Edits under `src/` hot-reload.

## Limitations

- Coolify **servers and destinations must already exist**. Projects,
  applications and databases can be created.
- `rollback`, `migrate_*`, `move_*` and the storage and backup verbs have not
  been exercised against a live instance — they are covered by mocked tests only.
- `GET /databases` does not report a project or environment, so a database cannot
  always be attributed to a project.
- A Coolify API token's abilities are probed, not reported: nothing in the API
  exposes them, so `capabilities` shows the evidence for each verdict.
