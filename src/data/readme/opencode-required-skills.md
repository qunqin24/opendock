# opencode-required-skills

Force OpenCode to load a skill before an agent can access files covered by a project rule.

## Why

This is useful when a project has rules that are easy for an agent to forget: file organization, specialized formats, review procedures, or validation workflows. The plugin turns those rules into a visible project policy:

1. A path matches a configured rule.
2. The required skill has not completed in the current session.
3. The file-tool call is blocked.
4. The error names the missing skill.
5. The agent loads the native skill and retries.

The plugin does not replace OpenCode's skill loader, inspect skill files, infer policies from frontmatter, or provide a complete security boundary. Release 1 guards only the native `read`, `write`, `edit`, and `apply_patch` tools. Shell commands, MCP tools, custom tools, subagents, `glob`, and `grep` are intentionally outside scope.

## Install

Install the published npm package with the OpenCode CLI:

```sh
opencode plugin opencode-required-skills
```

The command installs the plugin and updates the appropriate OpenCode configuration. A global `npm install` is not required.

For this plugin's policy options, update the generated `opencode.json` entry to the tuple form below:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-required-skills",
      {
        "require": [
          {
            "skill": "project-organization",
            "on": {
              "path": "workspace/projects/**/*.md"
            }
          }
        ]
      }
    ]
  ]
}
```

Restart OpenCode after changing plugin configuration.

For local development, place a JavaScript or TypeScript plugin in `.opencode/plugins/` and configure its options according to the local-plugin workflow.

## Configuration

Each `require` policy maps one skill name to one repository-relative `on.path` glob. Add multiple policies when a path requires multiple skills. Matching is case-sensitive; `*` matches one path component and `**` matches multiple components.

See the full behavior and validation rules in [`spec/spec.md`](spec/spec.md), the implementation sequence in [`spec/plan.md`](spec/plan.md), and the product intent in [`spec/intent.md`](spec/intent.md).

## Session behavior

Completed native skill calls are tracked per session. The plugin restores successful skill calls from session history when a protected path is first accessed. Failed, denied, pending, interrupted, and malformed calls do not authorize a skill. Compaction clears authorization, and forked sessions do not inherit authorization.

## Documentation

- [OpenCode plugins](https://opencode.ai/docs/plugins/) — plugin installation, local plugins, hooks, and lifecycle
- [OpenCode configuration](https://opencode.ai/docs/config/) — `opencode.json` and plugin options
- [OpenCode skills](https://opencode.ai/docs/skills/) — native skill format and loading behavior
- [Project intent](spec/intent.md) — purpose, value, scope, and non-goals
- [Specification](spec/spec.md) — normative MVP behavior
- [Implementation plan](spec/plan.md) — planned modules and verification coverage
- [OpenCode v2 notes](spec/opencode-v2.md) — deferred v2 research; the MVP targets stable v1

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

The MVP targets the stable OpenCode `1.18.x` plugin API. OpenCode v2 is currently a separate beta with a different plugin contract and is not an MVP target.
