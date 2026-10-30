# Massdriver for opencode

Build and ship infrastructure on [Massdriver](https://massdriver.cloud) from [opencode](https://opencode.ai). Describe what you need and opencode designs the bundle, deploys it to a throwaway environment, and iterates until it works and passes compliance. It drives Massdriver through the [Massdriver MCP server](https://github.com/massdriver-cloud/mcp-server), and a safety guard keeps it away from production.

This is the opencode version of the [Massdriver Claude Code plugin](https://github.com/massdriver-cloud/claude-plugins). Both use the same skill, agents and commands.

## Requirements

- opencode 1.19 or newer
- Docker, installed and running. The MCP server runs as a container.
- The [`mass` CLI](https://docs.massdriver.cloud/cli/overview), for building and publishing bundles
- Massdriver credentials (see below)

## Install

Add the plugin to `opencode.json`, either in your project or in `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@massdriver/opencode"]
}
```

opencode installs the package the next time it starts.

To run a local build instead, clone this repo, build it, and point the plugin entry at the built file:

```bash
git clone https://github.com/massdriver-cloud/opencode-plugin.git
cd opencode-plugin
npm ci
npm run build
```

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-plugin/dist/index.js"]
}
```

Check that everything loaded:

```bash
opencode mcp list      # massdriver should show as connected
opencode agent list    # massdriver-architect, massdriver-bundle-dev, ...
opencode debug skill   # includes massdriver
```

## Credentials

The MCP server reads its credentials from the environment opencode was started in. Set them before you start opencode. Changing them later means restarting opencode.

You can use environment variables:

```bash
export MASSDRIVER_API_KEY="your-api-key"
export MASSDRIVER_ORGANIZATION_ID="your-org-id"
export MASSDRIVER_URL="https://api.massdriver.cloud"   # only for self-hosted Massdriver
```

Or a `mass` CLI profile. If `MASSDRIVER_API_KEY` is not set, your `~/.config/massdriver` directory is mounted into the container read-only and the `default` profile is used. Set `MASSDRIVER_PROFILE=<name>` to pick another one.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MASSDRIVER_API_KEY` | Yes, unless you use a profile | API key for the organization |
| `MASSDRIVER_ORGANIZATION_ID` | Yes, unless you use a profile | Organization the agent works in |
| `MASSDRIVER_URL` | No | API URL for self-hosted Massdriver |
| `MASSDRIVER_PROFILE` | No | `mass` CLI profile to use when no API key is set |

## MCP server

The plugin registers an MCP server named `massdriver`. It runs `docker.io/massdrivercloud/mcp-server` over stdio, pulls the image each time opencode starts, and falls back to the local copy if the registry can't be reached.

It tracks the `latest` tag. To pin a version, pass options to the plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@massdriver/opencode", { "mcpImageTag": "0.2.0" }]]
}
```

Setting `MASSDRIVER_MCP_SERVER_TAG` in your shell does the same. `mcpImage` (or `MASSDRIVER_MCP_IMAGE`) replaces the whole image reference, for a mirror or private registry.

If you would rather define the server yourself, for example on a machine without bash, turn off registration and add it to `opencode.json`. A server you define named `massdriver` always takes priority over the plugin's.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@massdriver/opencode", { "mcp": false }]],
  "mcp": {
    "massdriver": {
      "type": "local",
      "command": [
        "docker", "run", "-i", "--rm",
        "-e", "MASSDRIVER_API_KEY",
        "-e", "MASSDRIVER_ORGANIZATION_ID",
        "-e", "MASSDRIVER_URL",
        "-e", "MASSDRIVER_PROFILE",
        "docker.io/massdrivercloud/mcp-server:0.2.0"
      ],
      "timeout": 60000
    }
  }
}
```

That form needs `MASSDRIVER_API_KEY` and `MASSDRIVER_ORGANIZATION_ID`. To use a profile instead, add `"-e", "XDG_CONFIG_HOME=/config", "-v", "/Users/you/.config/massdriver:/config/massdriver:ro"` before the image name.

## Plugin options

| Option | Default | Effect |
| --- | --- | --- |
| `mcp` | `true` | Register the `massdriver` MCP server |
| `mcpServerName` | `"massdriver"` | Name of the MCP server the guard watches, and the name it is registered under |
| `mcpImageTag` | `latest` | MCP server image tag |
| `mcpImage` | `docker.io/massdrivercloud/mcp-server:<tag>` | Full MCP server image reference |
| `mcpTimeout` | `60000` | Milliseconds opencode waits for the server to list its tools |

## Commands

| Command | What it does |
| --- | --- |
| `/massdriver:develop <use case>` | Builds a bundle and runs the full deploy and compliance loop in a test environment |
| `/massdriver:gen <use case>` | Scaffolds a bundle locally and validates it, without deploying |
| `/massdriver:test-upgrade <instance> <version>` | Forks a production environment and tests a bundle upgrade against its configuration |
| `/massdriver:import <resource>` | Brings an existing cloud resource under Massdriver, as a new bundle, into an existing bundle, or as a resource only |
| `/massdriver:architect <app idea>` | Designs a whole project for an app: layout, bundles, runtime and the path to production |

Each command hands off to one of the agents below. You can also call an agent directly, for example `@massdriver-bundle-dev`.

## Agents

- `massdriver-bundle-dev` develops and tests a bundle end to end.
- `massdriver-upgrade-tester` validates a version upgrade against production configuration.
- `massdriver-resource-import` adopts existing cloud resources.
- `massdriver-architect` turns an app idea into a governed Massdriver project.

## Skill

The `massdriver` skill holds the bundle patterns, references and snippets the agents work from. The agents load it first, and any agent can pick it up when you work with `massdriver.yaml`, `bundles/`, `resource-type/`, `platforms/` or `projects/`.

## Safety guard

The plugin checks every `bash` call and every Massdriver MCP call before it runs.

Always blocked:

- `approve_deployment`. Approving a deployment is for a person, in the Massdriver UI.
- `mass bundle publish` without `--development`. Stable releases are for a person.

Blocked in production environments:

- Provisioning or decommissioning: `create_deployment` with any action other than `PLAN`, `mass instance deploy` (unless `--plan`) and `mass instance destroy`
- Deploying, decommissioning or deleting an environment
- Orphaning an instance, or deleting a resource an instance provisioned
- Deleting a project, or creating an environment, whose id matches the production pattern

Needs your approval in production:

- Configuration changes: `update_instance`, instance secrets and remote references, `copy_instance` into production, `update_environment`, environment defaults, `update_resource` and resource grants, `propose_deployment`, `mass env update`, `mass env default` and `mass instance version`
- `mass config get --show-secrets`, anywhere

When the guard holds one of these calls, the agent asks you through opencode's permission prompt. If you approve, the agent may retry that one call. Every other call needs a new approval. In `--auto` mode opencode approves these prompts for you, so leave auto mode off when working near production.

Read-only Massdriver tools (`get_*`, `list_*`, `compare_*`, `evaluate_*`, `explain_*`) run without asking unless your own permission settings name them. `export_resource` returns unmasked secrets, so it goes through your normal permission settings.

### What counts as production

An environment is production when its id matches the production pattern, `(prod|production)` by default. Only the environment part of a slug is checked: for the instance `ecomm-prod-db` that is `prod`. A component called `prodcache` in a `testa` environment is not production, and a `preprod` environment is.

To change the pattern, create `.opencode/massdriver.local.md` in your project (`.claude/massdriver.local.md` also works):

```markdown
---
production_pattern: (live|prd)
mass_profile: ""
default_test_project: ""
---
```

Anchor the pattern, as in `^(prod|production)$`, to match whole environment names only.

The guard only sees `mass` commands and Massdriver MCP calls. A plain `tofu import` against a production instance's state is not checked, which is why the import agent confirms the target with you first.

## Development

```bash
npm ci
npm run build   # fetches content from claude-plugins, then compiles
npm test
```

The skill, agents, commands and the MCP launcher script come from [massdriver-cloud/claude-plugins](https://github.com/massdriver-cloud/claude-plugins) at the commit pinned in `package.json` under `claudePlugin.ref`. `npm run build` fetches that commit into `.cache/` and writes:

- `dist/skills/` as an exact copy of the Claude plugin's `skills/`
- `dist/bin/run-mcp-server.sh` as an exact copy of its MCP launcher
- `dist/content.json` with the agents and commands in opencode's format

Agents and commands get a small set of rewrites, listed in `scripts/translate.mjs`, for the places where opencode differs from Claude Code: tool names, the agent name prefix, and the settings file location. If a rewrite stops matching the upstream text, the build fails so the change gets reviewed.

To update, change `claudePlugin.ref` to a newer claude-plugins commit and rebuild. To build against a local checkout, set `CLAUDE_PLUGINS_DIR=/path/to/claude-plugins`.

## Releasing

Bump the version on a branch and merge it to `main` through a pull request:

```bash
npm version 0.2.0 --no-git-tag-version
git commit -am "Release v0.2.0"
```

After the merge, tag the merged commit and push the tag:

```bash
git checkout main && git pull
git tag v0.2.0 && git push origin v0.2.0
```

The tag starts the Release workflow. It checks that the tag matches `package.json`, builds and tests the package, and waits for approval in the `npm-publish` environment. After approval it publishes to npm, then creates a GitHub release with generated notes. A version with a suffix, such as `v0.2.0-rc.1`, goes to the `next` dist-tag on npm and is marked as a pre-release on GitHub.
