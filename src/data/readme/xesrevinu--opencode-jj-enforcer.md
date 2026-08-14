# @xesrevinu/opencode-jj-enforcer

OpenCode plugin that blocks `git` usage inside Jujutsu workspaces and forces agents onto `jj`.

## Highlights

- inspects `bash` tool calls before execution instead of relying on post-hoc review
- detects `.jj` roots from the workspace, `git -C`, and `cd ... && git ...` command patterns
- blocks wrapper forms such as `rtk git ...` so rewrite plugins cannot bypass the policy
- stays repository local with no external service or daemon requirements
- ships as a small npm package that can also be copied directly into `.opencode/plugin`

## Install

Use the published package from `opencode.jsonc`:

```jsonc
{
  "plugin": ["@xesrevinu/opencode-jj-enforcer@latest"],
}
```

Restart OpenCode after updating the plugin list.

If you want to iterate from a checkout instead of npm:

```bash
mkdir -p .opencode/plugin
cp plugin/jj-enforcer.ts .opencode/plugin/jj-enforcer.ts
```

## Usage

The plugin checks the current workspace plus directories referenced inside the shell command. If any of them belong to a Jujutsu repository, the command is rejected and the agent is told to use `jj`.

Examples that are blocked inside a `.jj` workspace:

```bash
git status
git -C ../repo log
cd ../repo && git diff
rtk git log
```

## Development

The repository uses Bun for dependency management and local commands.

```bash
bun install
bun run check
```

## Release

This package uses Changesets plus the shared GitHub Actions release workflow.

```bash
bun run changeset
bun run version-packages
bun run release
```

## License

MIT
