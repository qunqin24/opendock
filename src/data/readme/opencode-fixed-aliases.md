# OpenCode Fixed Aliases

Give OpenCode agents stable, organization-friendly model names. Map each alias to an approved provider, model, and optional fixed variant, then update that mapping when the team migrates models.

Designed for enterprise development teams, the plugin reduces repetitive edits across agents and commands that use those agents. A migration from one approved OpenAI model to another, or to an approved Anthropic model, becomes a change to the alias map rather than a sweep through agent definitions.

> **Scope:** OpenCode 2.0 currently lets plugins transform agents, but not rewrite existing commands. A command that invokes an alias-backed agent benefits from the mapping; a command with its own `model` field does not.

## How It Works

```text
Agent model: alias/company-review
              |
              v
Alias map:    company-review -> anthropic/claude-4.5-haiku
              |
              v
OpenCode agent model: anthropic/claude-4.5-haiku
```

Keep agent and command workflows stable while changing the model target in one reviewed configuration entry.

## Install

Install the plugin directly from GitHub:

```sh
opencode plugin add github:e-baloo/opencode-fixed-aliases
```

OpenCode adds the plugin to your global configuration. Add the alias mappings
under its `options` field as shown below.

## Configuration

Add aliases to the plugin entry in `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-fixed-aliases",
      "options": {
        "aliases": {
          "company-fast": "openai/gpt-5.5-luna#mini",
          "company-review": "anthropic/claude-4.5-haiku"
        }
      }
    }
  ]
}
```

Use model IDs and variants available from providers configured in your OpenCode installation. For local development before publishing the package, set `package` to the plugin's local path, such as `./plugins/opencode-fixed-aliases`.

## Use an Alias

Set an agent's model to `alias/<name>` in `opencode.jsonc`:
```jsonc
{
  "agents": {
    "reviewer": {
      "description": "Reviews code changes",
      "mode": "subagent",
      "model": "alias/company-review",
      "system": "Review for correctness, security, and missing tests."
    }
  }
}
```

Or add `model: alias/company-review` to the frontmatter of `.opencode/agents/reviewer.md`. Commands can continue to invoke the `reviewer` agent by name. Changing the alias target updates the model used by that agent without changing those commands.

## Fixed Variants

Put a variant in the alias definition so it stays part of the reviewed target:

```jsonc
"company-fast": "openai/gpt-5.5-luna#mini"
```

The plugin rejects `alias/company-fast#high`; variants cannot be overridden at the use site. Alias names may contain letters, numbers, dots, underscores, and hyphens, but not `/` or `#`. Targets must follow `provider/model` or `provider/model#variant`.

An English error is raised for malformed targets, unknown aliases, and alias references with per-use variants.

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

## Appendix: OpenCode 2.0.29 Lifecycle

Configured agents can be added after user plugins initialize. This local version
reorders its agent transform when an `agent.updated` event exposes unresolved
aliases, then reloads and verifies the agent models.

Before each user prompt, it also applies the alias target to the session's model.
This replaces the global default, a persisted model selection, or a manual model
override for an alias-backed agent. Agents without aliases are unaffected.

Diagnostics use the `[opencode.fixed-aliases]` prefix in OpenCode logs. The
`model request` entry records the actual provider, model, and variant for each
request; use `kind=primary` to distinguish agent responses from title generation.