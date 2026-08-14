# opencode-workflow

An [opencode](https://opencode.ai) plugin that runs named sequential workflows from your opencode plugin options.

`opencode-workflow` reads workflow definitions from its configured plugin options in `opencode.json`, then executes them step by step through the opencode SDK. Each workflow is a list of prompts and models. Steps run in order, later steps automatically receive the outputs of earlier steps, and every step receives a built-in clarification instruction. There is no built-in default workflow; every workflow must be configured and invoked by name.

## Install

`opencode-workflow` is distributed as an npm plugin. Enable it by adding `opencode-workflow` to the `plugin` list in your `opencode.json` using the tuple form shown below.

opencode installs npm plugins automatically at startup. Restart opencode after adding or updating the plugin list.

## Configure a workflow

Define named workflows in the plugin tuple options in `opencode.json`. Each workflow must contain at least one step, and each step must have a `prompt` and a `model`.

A step `prompt` may be either:

- **Inline text** — the prompt is sent exactly as written.
- **A `.opencode/` file path** — the runtime reads the file and uses its contents as the prompt. Paths are relative to `.opencode/`; they must not escape that directory with `..` or absolute paths.

### Minimal single-step workflow

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-workflow",
      {
        "workflows": {
          "summarize": {
            "steps": [
              {
                "prompt": "Summarize the recent changes in plain language.",
                "model": "anthropic/claude-sonnet-4"
              }
            ]
          }
        }
      }
    ]
  ]
}
```

### Prompt file workflow

Store long prompts under `.opencode/` and reference them by relative path.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-workflow",
      {
        "workflows": {
          "review": {
            "steps": [
              {
                "prompt": "prompts/review.md",
                "model": "anthropic/claude-sonnet-4"
              }
            ]
          }
        }
      }
    ]
  ]
}
```

With `.opencode/prompts/review.md`:

```md
Review the current branch changes for correctness, risks, and missing tests.
```

### Complete multi-step workflow example

The following `pir-piv` workflow is an example only. It demonstrates how to chain steps so that later prompts can build on earlier outputs. Adapt the prompts to your own process.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-workflow",
      {
        "workflows": {
          "pir-piv": {
            "steps": [
              {
                "prompt": "Review the current branch changes. List every file that was added, modified, or deleted, and explain in one sentence what each change does.",
                "model": "anthropic/claude-sonnet-4"
              },
              {
                "prompt": "Based on the file summaries above, identify the main risks, assumptions, and open questions introduced by these changes.",
                "model": "anthropic/claude-sonnet-4"
              },
              {
                "prompt": "For the highest risks identified above, suggest concrete fixes, tests, or follow-up questions that should be addressed before merging.",
                "model": "anthropic/claude-sonnet-4"
              }
            ]
          }
        }
      }
    ]
  ]
}
```

This workflow is not built in; it is included here as a starting point. You can copy, rename, and modify it.

### Passing structured arguments

Use the optional `args` object on the `opencode_flow` tool to forward values such as a GitHub issue number into every step prompt.

Example custom command `.opencode/commands/flow.md`:

```md
---
description: Run a named opencode-workflow workflow with arguments
agent: build
---

Run the opencode-workflow workflow using the `opencode_flow` tool.

"$ARGUMENTS" contains the workflow name and an optional number separated by a space, for example "summarize 2342".

If "$ARGUMENTS" is empty, ask the user which configured workflow to run and what number to pass. Do not choose defaults.

Parse "$ARGUMENTS" as:

1. workflowName: the first word
2. args.githubIssueNumber: the second word, if present

Then use the `opencode_flow` tool with workflowName and args.
```

Invoke it in opencode like:

```text
/flow summarize 2342
```

The `args` object appears in every step prompt as:

```text
Workflow arguments:
- githubIssueNumber: 2342
```

This makes values like issue numbers, flags, or identifiers available to every step without hard-coding them in the prompt text.

## How it works

- `opencode-workflow` exposes a single custom tool named `opencode_flow`.
- The tool requires a `workflowName` that matches one of the keys under the plugin options `workflows` object.
- Steps run in the order they appear in the configuration.
- Each later step receives the accumulated outputs from previous steps.
- A clarification instruction is injected automatically into every step prompt, telling the agent to ask for clarification when anything is unclear.
- Invalid configuration fails before any step runs.
- Calling the tool with an unknown workflow name fails and lists the configured workflow names.
- There is no built-in default workflow. If the command is called without a workflow name, the agent should ask the user rather than guess.

## Development

```bash
pnpm install
pnpm run check   # format:check + lint + typecheck + test + build
pnpm run format  # apply prettier formatting
pnpm run lint    # run oxlint
pnpm run lint:fix # run oxlint with auto-fix
```

## Build

```bash
pnpm run build
```

This produces the compiled output in `dist/`.

## Release setup

This package is published to the npm registry from GitHub Actions using npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC). No long-lived npm token is stored in GitHub. Before automated publishes work, complete these steps manually:

1. **Create or claim the npm package.** The package name is `opencode-workflow`. If it does not yet exist on npm, the first publish will create it automatically. If it already exists, make sure you own it or choose a different name in `package.json`.
2. **Enable the trusted publisher on npmjs.com:**
   - Open `https://www.npmjs.com/package/opencode-workflow/access` → **Trusted Publisher**.
   - Select **GitHub Actions**.
   - Fill in:
     - Owner: `MarcoMuellner`
     - Repository: `opencode-workflow`
     - Workflow filename: `publish.yml`
     - Allowed action: `npm publish`
   - Save the trusted publisher.
3. **Protect the main branch in GitHub.**
   - Go to `Settings → Branches → Add rule`.
   - Require the `CI` workflow to pass before merging.
   - Restrict who can push to `main`.
4. **Release a version.**
   - Ensure `package.json` version matches the intended GitHub release tag (for example, tag `v0.2.0` needs version `0.2.0`).
   - Create a GitHub release with the tag; the `publish.yml` workflow will publish to npm with the `latest` dist-tag.

### Nightly builds

Every push to `main` that passes the `CI` workflow also triggers `publish.yml` and publishes a unique prerelease version to npm under the `nightly` dist-tag. The version looks like `<base>-nightly.<run>.<attempt>.<sha>`.

### npm publishing security notes

- The publish workflow uses Node 24 and `id-token: write` so npm can authenticate via OIDC.
- Provenance attestations are generated automatically because publishing happens through GitHub Actions trusted publishing from a public repository.
- After the first successful automated publish, consider switching the package’s publishing access to **Require 2FA and disallow tokens** for maximum security.
