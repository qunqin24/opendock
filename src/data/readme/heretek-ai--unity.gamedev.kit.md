# @heretek-ai/unity.gamedev.kit

An [OpenCode](https://opencode.ai) plugin that sets a Unity project up for agent-driven game development:

- Connects the **AnkleBreaker Unity MCP** server (`unity_*` tools) and **Context7** docs, with no `mcp` block to write.
- Adds a `unity-openspec-workflow` skill and loads the skill packs that `npx skills add` installs into `.agents/skills`, which OpenCode V2 does not scan on its own.
- Lets the built-in **plan** agent write OpenSpec planning files (`openspec/`, `docs/`, `AGENTS.md`) while every other edit stays blocked in plan mode.
- Blocks edits to Unity's generated folders (`Library/`, `Temp/`, `Obj/`, `Logs/`, `UserSettings/`, `MemoryCaptures/`) and to credential files (`.env*`, `*.keystore`, `*.pem`, `id_rsa*` ...).
- Adds the `/unity-bootstrap`, `/unity-connect`, `/spec-feature` and `/unity-verify` commands and the `gamedev_bootstrap_stack` and `gamedev_status` tools.
- Adds short Unity/OpenSpec rules to the agent's system prompt.

It targets the OpenCode V2 plugin API (`@opencode/plugin`) and also ships a smaller OpenCode 1.x entrypoint (1.18.29 or newer).

## Install

**OpenCode V2**

```sh
opencode plugin add @heretek-ai/unity.gamedev.kit
```

or add it to the project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@heretek-ai/unity.gamedev.kit"]
}
```

**OpenCode 1.x** (1.18.29+): add `"plugin": ["@heretek-ai/unity.gamedev.kit"]` to `opencode.json`.

**Unity side.** The `unity_*` tools talk to a bridge that runs inside the Unity Editor. In Unity, open **Window > Package Manager > + > Add package from git URL** and add:

```
https://github.com/AnkleBreaker-Studio/unity-mcp-plugin.git
```

## First run

1. Open the Unity project folder in OpenCode.
2. Run `/unity-bootstrap`. OpenCode asks before it runs, because the bootstrap does global npm installs. It installs:
   - six skill packs with `npx skills add <pack> --agent opencode`: `gamedev-skills/awesome-gamedev-agent-skills`, `vercel-labs/skills` (find-skills), `unity-technologies/industry-ai-workflows`, `unity-technologies/unity-agent-plugin`, `unity-technologies/skills`, `mattpocock/skills`
   - the OpenSpec CLI (`npm i -g @fission-ai/openspec`), then `openspec init --tools opencode` if `openspec/` is missing
   - `@aerovato/operator-helper`, then `operator-helper install opencode-v2`
3. Open the project in the Unity Editor, then run `/unity-connect`.

The same bootstrap runs outside OpenCode with `npx @heretek-ai/unity.gamedev.kit` (flags: `--no-skills`, `--no-openspec`, `--no-operator-helper`).

## Commands and tools

| Name | What it does |
| --- | --- |
| `/unity-bootstrap` | Runs `gamedev_bootstrap_stack`, then `gamedev_status`, and reports what is missing. |
| `/unity-connect` | Finds running editors with `unity_list_instances`, selects one, and reports editor state and compile errors. |
| `/spec-feature <idea>` | Interviews you with `grill-me`/`write-a-prd`, then writes an OpenSpec change. |
| `/unity-verify` | Checks the active OpenSpec change against the Unity console and EditMode/PlayMode tests. |
| `gamedev_bootstrap_stack` | The installer above, as a tool the agent can call. Asks permission first. |
| `gamedev_status` | Reports Unity projects found, whether the Unity MCP package is in `Packages/manifest.json`, and OpenSpec/skill folders. |

## Options

Pass options with the object form of the plugin entry:

```jsonc
{
  "plugins": [
    {
      "package": "@heretek-ai/unity.gamedev.kit",
      "options": { "unityHubPath": "C:/Program Files/Unity Hub/Unity Hub.exe", "installOperatorHelper": false }
    }
  ]
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `enableUnityMcp` | `true` | Register the `unity` MCP server (skipped if you already define one). |
| `unityMcpCommand` | `["npx","-y","anklebreaker-unity-mcp@latest"]` | Command that starts the Unity MCP server. |
| `unityHubPath` | unset | Passed to the server as `UNITY_HUB_PATH` for Unity Hub tools. |
| `enableContext7` | `true` | Register the `context7` MCP server (skipped if you already define one). |
| `skillDirectories` | `[".agents/skills","~/.agents/skills"]` | Extra skill folders to load. |
| `planWritablePaths` | `["openspec/*","docs/*","AGENTS.md"]` | Paths the plan agent may edit. |
| `protectGeneratedFiles` | `true` | Block edits to Unity generated folders and credential files. |
| `injectSystemPrompt` | `true` | Add the Unity/OpenSpec rules to the system prompt. |
| `installOperatorHelper` | `true` | Include Operator Helper in the bootstrap. |
| `autoBootstrapOnLoad` | `false` | Run the bootstrap once per project when the plugin loads, **without asking**. |

## OpenCode 1.x differences

The 1.x entrypoint registers the MCP servers, the four commands, the system prompt rules and the edit guard. It has no `gamedev_*` tools and no plan-agent change; there `/unity-bootstrap` runs `npx @heretek-ai/unity.gamedev.kit` through the shell tool.

## Develop

```sh
npm install
npm test        # builds to dist/ and runs the tests
```

`server.js` at the package root lets OpenCode load a local checkout (`"plugins": ["/path/to/unity.gamedev.kit"]`); run `npm run build` first.

## Publish

Releases publish from GitHub Actions with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so no npm token is stored in the repository. `.github/workflows/publish.yml` runs when a GitHub release is published.

One-time setup:

1. The first version has to exist on npm before a trusted publisher can be attached. From a clean checkout: `npm login`, then `npm publish` (it runs the typecheck and tests first). Your npm account needs publish rights in the `heretek-ai` organization.
2. On npmjs.com, open the package's **Settings > Trusted publishing**, choose **GitHub Actions**, and enter organization `Heretek-AI`, repository `unity.gamedev.kit`, workflow `publish.yml`.
3. Optionally, in the same settings page, set **Publishing access** to require 2FA and disallow tokens, so only the workflow can publish.

Each release after that: bump `version` in `package.json`, merge, then publish a GitHub release tagged `v<version>`.
