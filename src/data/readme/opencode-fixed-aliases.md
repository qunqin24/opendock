# OpenCode Fixed Aliases

[GitHub](https://github.com/e-baloo/opencode-fixed-aliases) · [npm](https://www.npmjs.com/package/opencode-fixed-aliases)

Give OpenCode agents stable, organization-friendly model names. Map each alias to an approved provider, model, and optional fixed variant, then update that mapping when the team migrates models.

Designed for enterprise development teams, the plugin reduces repetitive edits across agents and commands that use those agents. A migration from one approved OpenAI model to another, or to an approved Anthropic model, becomes a change to the alias map rather than a sweep through agent definitions.

> **Scope:** OpenCode 2.0 currently lets plugins transform agents, but not rewrite existing commands. A command that invokes an alias-backed agent benefits from the mapping; a command with its own `model` field does not.

## How It Works

```text
Agent model: alias/test-model
              |
              v
Alias map:    test-model -> opencode/nemotron-3.5-super-vl-free
              |
              v
OpenCode agent model: opencode/nemotron-3.5-super-vl-free
```

Keep agent and command workflows stable while changing the model target in one reviewed configuration entry.

## Install

Install the plugin from the npm registry using OpenCode:

```sh
opencode plugin add opencode-fixed-aliases
```

OpenCode adds the plugin to your global configuration. Add the alias mappings
under its `options` field as shown below.

## Configuration

Add aliases to the plugin entry in `opencode.jsonc`. Merge this example with your existing configuration, updating the plugin entry created during installation rather than adding a duplicate:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-fixed-aliases@0.9.3",
      "options": {
        "aliases": {
          "test-model": "opencode/nemotron-3.5-super-vl-free"
        }
      }
    }
  ],
  "agents": {
    "test-model": {
      "description": "Minimal agent for verifying that the `test-model` model alias resolves correctly.",
      "model": "alias/test-model",
      "prompt": "Reply with `ALIAS_TEST_OK`. Do not use any tools."
    }
  }
}
```

Use model IDs and variants available from providers configured in your OpenCode installation. Restart OpenCode after changing the configuration.

## Use an Alias

Set an agent's model to `alias/<name>` in `opencode.jsonc` or in the frontmatter of an agent file under `.opencode/agents/`. The `test-model` agent above demonstrates the alias in a complete configuration. Commands can continue to invoke an alias-backed agent by name; changing the alias target updates the model used by that agent without changing those commands.

> **Fixed model selection:** For an alias-backed agent, the configured target is enforced before each user prompt, including its variant when specified. A different model selected manually or saved in the session is replaced by the alias target. Agents without aliases are unaffected.

### Chain Aliases

In the plugin's `options.aliases` object, an alias may target another alias. This lets agents use role-oriented names while concrete model choices and fixed variants remain centralized:

```jsonc
{
  "aliases": {
    "model-base": "provider/model-base#mini",
    "model-max": "provider/model-max#high",
    "coder": "alias/model-base",
    "architect": "alias/model-max"
  }
}
```

Alias chains are resolved during plugin setup, so declaration order does not matter. Chains may contain multiple aliases, but keeping them short makes configuration easier to follow. Every reference must exist, and cycles are rejected with an error. Put a fixed variant on the final concrete model target; variants cannot be added to an `alias/<name>` target.

## List Configured Aliases

Run `/aliases` in a conversation to display every configured alias, its target (including the resolved concrete model and any fixed variant for chained aliases), and whether that model is present and enabled in OpenCode's current model catalog. A green indicator means the model is available; a red indicator means it is missing or disabled. If no aliases are configured, the command reports that explicitly.

To verify resolution, send a prompt to the `test-model` agent and inspect OpenCode logs for `[opencode.fixed-aliases] model request` with `kind=primary`. Check that the logged model has provider `opencode` and model ID `nemotron-3.5-super-vl-free`. The `ALIAS_TEST_OK` response only confirms that the agent replied; it does not prove which model was used.

## Fixed Variants

Put a variant in the alias definition so it stays part of the reviewed target. The following is a template: replace `provider`, `model`, and `variant` with values supported by your installation.

```jsonc
{
  "test-model": "provider/model#variant"
}
```

The plugin rejects `alias/test-model#high`; variants cannot be overridden at the use site or attached to an alias target. Alias names must start with an ASCII letter or digit and may then contain ASCII letters, digits, dots, underscores, and hyphens, but not `/` or `#`. A target must be a concrete `provider/model` (optionally with `#variant`) or another alias written as `alias/<name>`.

## Governance Note

This plugin provides a consistent alias layer; it does not prevent users from putting a direct model ID in another agent or command. For enforceable provider restrictions, combine it with OpenCode's managed configuration and provider policies.

## Development

Requires Node.js 22 or later.

```sh
npm install
npm test
```

The test command type-checks against the OpenCode 2.0.29 plugin SDK and runs the unit tests.

## License

Apache License 2.0. See [LICENSE](LICENSE).
