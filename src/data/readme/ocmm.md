# ocmm — OpenCode Multi-Model Auto-Router

A small OpenCode plugin that auto-routes per-agent models, translates a single "variant" knob into provider-specific reasoning settings, attaches workflow-specific prompts declaratively at config time, and reactively falls back to the next model in a chain when the active model fails at runtime.

Concepts (model tiering, per-model specialized prompts, intent gating, proactive + reactive fallback) are inspired by [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode); naming and code are independent.

## What it does

| Hook                                 | What ocmm does                                                                                                                                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`                             | Registers 11 agents + 10 category-subagents with their preferred provider/model, shared skill paths, and slash commands. Attaches functional agent prompts plus workflow/model-family deepwork prompts to built-in agents, and category prompts to category subagents. User config can add, override, or disable any of them. |
| `chat.params`                        | Resolves the variant for the active agent/model (4-tier priority: user-config -> agent-default -> category-default -> input-variant), respects explicit user choices, and applies only the model-family parameters ocmm supports for that model. Built-in defaults normalize category work to model-appropriate high/max reasoning where supported and avoid implicit Opus 4.7+ thinking budgets.                  |
| `chat.message`                       | v1 workflow: queues superpowers skills content on the first message per session. Also expands bare ocmm slash commands in noninteractive `opencode run` input so `/ralph-loop ...` and shared-skill commands get command context even when the TUI slash parser is bypassed. |
| `experimental.chat.system.transform` | Prepends queued v1 skill content and one-shot slash command context to `output.system`. omo workflow only uses this hook when a bare slash command was expanded by `chat.message`.                                                                                                               |
| `event`                              | Cleans up per-session state on `session.deleted` / `session.idle`. On `session.error`: classifies the error, and if retryable, dispatches the next model in the agent's fallback chain via `client.session.prompt`. When `idleContinuation.enabled` is true, on `session.idle` with unfinished todos and no prior ESC abort, re-prompts the model to continue. ESC aborts (detected via abort errors on `session.error`) suppress continuation. |
| `command.execute.before`            | Handles the `/idle-continuation` slash command to toggle idle auto-continuation per session (`on` / `off` / `status`). Session overrides win over global `idleContinuation.enabled` config. |

The plugin **does not** change the model on a per-call basis via `chat.params`. OpenCode's `chat.params` output schema has no `model` field. Per-agent routing happens via the `config` hook (the only safe seam for model selection), and reactive re-routing happens via the `event` hook + `client.session.prompt`.

## Workflows

ocmm supports two workflows, switchable via the `workflow` config field:

**`omo`** (default) — Upstream oh-my-opencode system prompts. Aggressive tone (CODE RED, ABSOLUTE CERTAINTY). Prompts are attached declaratively to agents at config time based on model family.

**`v1`** — Skill-driven deepwork workflow. The config/path label stays `v1`, but model-facing prompt text calls it `deepwork`. The default prompt is a concise local controller; GPT/Gemini/GLM/Codex/planner variants stay close to upstream omo model-specific prompt style with local tool/agent/path adaptation. Skills are injected on the first message per session via `chat.message` + `system.transform` hooks.

```jsonc
{ "workflow": "v1" }
```

## Install

### From npmjs.org

The main `ocmm` package is published to npmjs.org as `ocmm`. Native LSP binaries are per-platform optional dependencies — npm installs the matching platform package for your system automatically. Use `--omit=optional` to skip native binaries if you only need the plugin logic:

```bash
pnpm add ocmm
# or: npm install ocmm
```

The npm tarball excludes native LSP binaries to keep it platform-agnostic. When installed with default options, the matching `ocmm-lsp-<platform>` optional package is fetched from npmjs.org alongside the main package. Runtime resolution: optional platform package first, then bundled `dist/bin` fallback (GitHub Release/Codex tarballs only), then local build / PATH.

```jsonc
// opencode.json
{ "plugin": ["./node_modules/ocmm/dist/index.js"] }
```

For Codex, add the installed package root as a local marketplace:

```bash
codex plugin marketplace add ./node_modules/ocmm --json
codex plugin add deepwork@deepwork-local --json
```

### From GitHub Release

Main package releases (`vX.Y.Z`) publish self-contained OpenCode/Codex plugin tarballs and their checksums. Standalone native `ocmm-lsp-*` executables and platform package `.tgz` assets belong to the separate `ocmm-lsp-vA.B.C` release lane.

A main `vX.Y.Z` release contains:

- `ocmm-opencode-plugin-<version>.tgz` — package-manager install package for the OpenCode plugin, CLI wrappers, Codex bundle, and bundled native binaries.
- `deepwork-codex-plugin-<version>.tgz` — direct Codex plugin package root for local marketplace installation.
- `SHA256SUMS.txt` — checksums for every release asset.

For OpenCode, install the release tarball asset URL with your package manager:

```bash
VERSION=0.6.5
pnpm add "https://github.com/<owner>/ocmm/releases/download/v${VERSION}/ocmm-opencode-plugin-${VERSION}.tgz"
```

The release tarball bundles the OpenCode plugin, the `ocmm`, `ocmm-profiles`, and `ocmm-lsp` CLI wrappers, plus platform-suffixed native `ocmm-lsp` binaries under `dist/bin/`.
It also includes the Codex marketplace file and a self-contained generated plugin bundle under `.agents/plugins/marketplace.json` and `plugins/deepwork/`; the Codex bundle carries its own plugin-local `dist/cli`, `dist/shared`, and `dist/bin` runtime so Codex's plugin cache can run the default `lsp` MCP.

```jsonc
// opencode.json
{ "plugin": ["./node_modules/ocmm/dist/index.js"] }
```

For Codex, either add the installed package root as a local marketplace:

```bash
codex plugin marketplace add ./node_modules/ocmm --json
codex plugin add deepwork@deepwork-local --json
```

Or install directly from the Codex release package. The tarball is package-root-shaped, so extract it to a directory such as `.codex-plugins/deepwork` and point the marketplace at that directory:

```bash
VERSION=0.6.5
curl -L -o "deepwork-codex-plugin-${VERSION}.tgz" "https://github.com/<owner>/ocmm/releases/download/v${VERSION}/deepwork-codex-plugin-${VERSION}.tgz"
mkdir -p .codex-plugins/deepwork
tar -xzf "deepwork-codex-plugin-${VERSION}.tgz" -C .codex-plugins/deepwork
codex plugin marketplace add ".codex-plugins/deepwork" --json
codex plugin add deepwork@deepwork-local --json
```

### From GitHub Packages

The release workflow can also publish the same package contents to GitHub Packages as `@<owner>/ocmm`. This still avoids npmjs.org, but installs through `npm.pkg.github.com` and normally requires a GitHub personal access token with `read:packages` in `.npmrc`:

```ini
@<owner>:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<github_pat_with_read:packages>
```

```bash
pnpm add @<owner>/ocmm
```

```jsonc
// opencode.json
{ "plugin": ["./node_modules/@<owner>/ocmm/dist/index.js"] }
```

For Codex, use the scoped package root as the marketplace root:

```bash
codex plugin marketplace add ./node_modules/@<owner>/ocmm --json
codex plugin add deepwork@deepwork-local --json
```

In GitHub Actions, `${GITHUB_TOKEN}` can be used instead of a personal token when the workflow has package read permission.

### Native LSP Support

ocmm ships the `ocmm-lsp` native binary in multiple forms:

- **npm optional platform packages**: 8 per-platform packages published to npmjs.org (`ocmm-lsp-linux-x64-gnu`, `ocmm-lsp-linux-arm64-gnu`, `ocmm-lsp-linux-x64-musl`, `ocmm-lsp-linux-arm64-musl`, `ocmm-lsp-darwin-x64`, `ocmm-lsp-darwin-arm64`, `ocmm-lsp-windows-x64`, `ocmm-lsp-windows-arm64`). npm installs the matching one automatically based on your OS, CPU, and libc.
- **bundled inside GitHub Release tarballs** under `dist/bin/` and `plugins/deepwork/dist/bin/`;
- **standalone release assets** named `ocmm-lsp-*` for direct download or custom `OCMM_LSP_COMMAND` setups.

Runtime resolution priority (first match wins):

1. Optional npm platform package (`node_modules/ocmm-lsp-<platform>/bin/ocmm-lsp-<target>`)
2. Bundled release binary (`dist/bin/ocmm-lsp-<target>`) — GitHub Release tarballs only
3. Local Cargo release/debug build
4. `cargo run` from `crates/ocmm-lsp/`
5. PATH `ocmm-lsp`

Linux builds cover both glibc (GNU) and musl libc targets, so Alpine and other musl-based distributions are now fully supported out of the box.

Native binaries are built for:

| Platform | npm package | Asset |
| --- | --- | --- |
| Linux x64 glibc | `ocmm-lsp-linux-x64-gnu` | `ocmm-lsp-x86_64-unknown-linux-gnu` |
| Linux arm64 glibc | `ocmm-lsp-linux-arm64-gnu` | `ocmm-lsp-aarch64-unknown-linux-gnu` |
| Linux x64 musl | `ocmm-lsp-linux-x64-musl` | `ocmm-lsp-x86_64-unknown-linux-musl` |
| Linux arm64 musl | `ocmm-lsp-linux-arm64-musl` | `ocmm-lsp-aarch64-unknown-linux-musl` |
| macOS x64 | `ocmm-lsp-darwin-x64` | `ocmm-lsp-x86_64-apple-darwin` |
| macOS arm64 | `ocmm-lsp-darwin-arm64` | `ocmm-lsp-aarch64-apple-darwin` |
| Windows x64 | `ocmm-lsp-windows-x64` | `ocmm-lsp-x86_64-pc-windows-msvc.exe` |
| Windows arm64 | `ocmm-lsp-windows-arm64` | `ocmm-lsp-aarch64-pc-windows-msvc.exe` |

ocmm registers the built-in OpenCode MCP named `lsp` with the project-owned `ocmm-lsp mcp` server by default. Resolution prefers optional npm platform package first, then bundled release binaries in `dist/bin/`, then local Cargo release/debug builds, then `cargo run` from `crates/ocmm-lsp/`, then a PATH `ocmm-lsp`. Set `OCMM_LSP_COMMAND` to force a custom command, add `disabledMcps:["lsp"]` to disable it, or define `mcp.servers.lsp` to override the built-in.

For direct external-program use, download the matching standalone asset from the `ocmm-lsp-vA.B.C` release and point `OCMM_LSP_COMMAND` at it:

```bash
LSP_VERSION=0.3.2
curl -L -o ~/.local/bin/ocmm-lsp "https://github.com/<owner>/ocmm/releases/download/ocmm-lsp-v${LSP_VERSION}/ocmm-lsp-x86_64-unknown-linux-gnu"
chmod +x ~/.local/bin/ocmm-lsp
OCMM_LSP_COMMAND="$HOME/.local/bin/ocmm-lsp" opencode run "check diagnostics"
```

Plain `OCMM_LSP_COMMAND` values automatically receive the `mcp` argument. Use a JSON array, for example `["/path/to/ocmm-lsp","mcp"]`, only when you need exact argument control.

### From source

```bash
pnpm install
pnpm run build
```

Then point your OpenCode config at the built plugin:

```jsonc
// opencode.json
{ "plugin": ["./node_modules/ocmm/dist/index.js"] }
```

Or use the `ocmm` shim binary (see below) to launch opencode with automatic plugin loading and config isolation.

## Nix

Run ocmm without adding it to a profile, or build either primary package:

```console
nix run github:hugefiver/ocmm
nix build github:hugefiver/ocmm#ocmm
nix build github:hugefiver/ocmm#ocmm-lsp
```

The default package and app wrap the `nixpkgs` OpenCode package, so the shim always has a known OpenCode executable. `ocmm-unwrapped` contains the plugin and native LSP only; OpenCode selection is then left to the CLI, configuration, environment, or `PATH`.

### Unfree policy

The direct flake packages and apps carry only a narrow internal AAAPL `allowUnfreePredicate` allowance for ocmm's own derivations, so ordinary `nix run github:hugefiver/ocmm` does not need an ambient `NIXPKGS_ALLOW_UNFREE`. Because AAAPL is non-free, downstream overlay, factory, Home Manager, and NixOS consumers must configure the same narrow predicate in their own `pkgs`:

```nix
nixpkgs.config.allowUnfreePredicate = package:
  builtins.elem (lib.getName package) [
    "ocmm-lsp"
    "ocmm-unwrapped"
    "ocmm"
  ];
```

### Overlay

Add the overlay to the package set that installs ocmm. This complete NixOS flake example keeps ocmm and the consumer on the same `nixpkgs` input and applies the narrow predicate before selecting `pkgs.ocmm`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    ocmm = {
      url = "github:hugefiver/ocmm";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ nixpkgs, ... }: {
    nixosConfigurations.example = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ({ lib, pkgs, ... }: {
          nixpkgs.config.allowUnfreePredicate = package:
            builtins.elem (lib.getName package) [
              "ocmm-lsp"
              "ocmm-unwrapped"
              "ocmm"
            ];
          nixpkgs.overlays = [ inputs.ocmm.overlays.default ];
          environment.systemPackages = [ pkgs.ocmm ];
          system.stateVersion = "24.11";
        })
      ];
    };
  };
}
```

### Package factory

`lib.mkOcmmPackage` creates a wrapper around a chosen base ocmm package. Select either an OpenCode derivation:

```nix
inputs.ocmm.lib.mkOcmmPackage {
  inherit pkgs;
  opencodePackage = pkgs.opencode;
}
```

or an executable command:

```nix
inputs.ocmm.lib.mkOcmmPackage {
  inherit pkgs;
  opencodeCommand = "/opt/opencode/bin/opencode";
}
```

`opencodePackage` and `opencodeCommand` are mutually exclusive. Configure the narrow predicate above in the `pkgs` passed to the factory.

The shim resolves OpenCode in this exact order:

```text
1. --opencode
2. non-empty OCMM_OPENCODE
3. ocmm.json or ocmm.jsonc shim.opencode
4. non-empty OCMM_NIX_OPENCODE
5. non-empty OCMM_PROGRAMS_OPENCODE
6. opencode from PATH
```

### Home Manager

For standalone Home Manager, construct the `pkgs` passed to `homeManagerConfiguration` with the same narrow predicate. The configuration imports the default module and enables both programs:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
    ocmm = {
      url = "github:hugefiver/ocmm";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ nixpkgs, home-manager, ocmm, ... }:
    let
      system = "x86_64-linux";
      lib = nixpkgs.lib;
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfreePredicate = package:
          builtins.elem (lib.getName package) [
            "ocmm-lsp"
            "ocmm-unwrapped"
            "ocmm"
          ];
      };
    in {
      homeConfigurations."user@example" = home-manager.lib.homeManagerConfiguration {
        inherit pkgs;
        modules = [
          {
            imports = [ ocmm.homeManagerModules.default ];
            home.username = "user";
            home.homeDirectory = "/home/user";
            home.stateVersion = "24.11";
            programs.ocmm.enable = true;
            programs.opencode.enable = true;
          }
        ];
      };
    };
}
```

When both programs are enabled and `programs.opencode.package` is non-null, the wrapper reuses that package and appends ocmm's store plugin path to the end of the existing OpenCode plugin list.

Both modules also accept `programs.ocmm.opencode.command` for an explicit OpenCode executable path or command name. `programs.ocmm.opencode.package` and `programs.ocmm.opencode.command` are mutually exclusive; in Home Manager, leaving both unset allows the module to reuse the enabled `programs.opencode.package`.

### NixOS module

After configuring the same predicate in the NixOS package set, import the default NixOS module and set the OpenCode package explicitly:

```nix
{
  imports = [ inputs.ocmm.nixosModules.default ];

  programs.ocmm = {
    enable = true;
    opencode.package = pkgs.opencode;
  };
}
```

The NixOS module installs only the package and wrapper. It never creates a service or user configuration.

### CI cache

The repository's Nix workflow always uses a GitHub Actions Nix store cache. Cachix is optional: set the repository variable `CACHIX_CACHE_NAME` to enable it and the repository secret `CACHIX_AUTH_TOKEN` to authenticate writes. Without the variable, Cachix is not configured; without the token, it is read-only. Pull requests never receive the token, and only trusted pushes to `master` or manual workflow runs can use it to push.

## Codex adapter

ocmm also ships a Codex plugin bundle generated from the same local workflow data:

```
.agents/plugins/marketplace.json
plugins/deepwork/
  .codex-plugin/plugin.json
  .mcp.json
  package.json
  agents/*.toml
  dist/{cli,shared,bin}/
  skills/*
```

Generate or refresh it after changing prompts, skills, agents, categories, or MCP config logic:

```bash
pnpm run gen:codex-plugin
```

The generator is intentionally separate from the OpenCode runtime. It reads project config from `<project>/.codex/ocmm.jsonc` first, then `<project>/.opencode/ocmm.jsonc`; it does **not** read user-global config by default, so local provider names or secrets are not baked into the committed Codex bundle. If no project config exists, it uses ocmm defaults.

Install into an isolated Codex home for testing:

```powershell
$env:CODEX_HOME = "$env:LOCALAPPDATA\Temp\codex\ocmm-test"
mkdir.exe -p $env:CODEX_HOME
codex plugin marketplace add . --json
codex plugin add deepwork@deepwork-local --json
codex plugin list --available --json
```

The Codex plugin exposes:

- copied ocmm shared skills plus flattened `deepwork-*` skills from `skills/v1/`;
- a `deepwork` skill that maps ocmm's planning/delegation semantics to Codex tools;
- plugin-scoped MCP servers generated from ocmm's MCP config, including the default `lsp` MCP served by the plugin-local `ocmm-lsp` wrapper;
- generated `dw-*` Codex agent TOML files under `plugins/deepwork/agents/` for installers or local agent registration, including functional agents such as `dw-oracle`, `dw-oracle-2nd`, and `dw-creative`; configured review `variants` can also emit logical tier profiles such as `dw-oracle-high` and `dw-oracle-2nd-low`.

OpenCode still uses `dist/index.js` and its OpenCode hook surface. The Codex adapter does not import or mutate the OpenCode plugin module at runtime.

## Configure

Drop a config file in either of these locations (project wins on conflicts):

- `<project>/.opencode/ocmm.jsonc`
- `~/.config/opencode/ocmm.jsonc` (all platforms, including Windows — follows opencode's convention)

Schema (Zod-validated; unknown object keys are stripped). Declared invalid fields fail direct schema parsing and are pruned locally by runtime loading so valid siblings and lower-priority values can survive. All fields optional:

```jsonc
{
  "workflow": "omo", // "omo" (default) or "v1"

  "disabledAgents": ["media-reader"],
  "disabledSkills": ["debugging"],
  "disabledCommands": ["ralph-loop"],
  "disabledMcps": [],

  "skills": {
    "sources": [],
    "enable": [],
    "disable": []
  },

  // Opt in per provider before --fast / OCMM_FAST can promote a route.
  "fastModels": {
    "defaultRules": true,
    "providers": ["openai"],
    "mappings": {
      "openai/<original-model>": "<provider-local-fast-model>"
    },
    // Rules are a fallback after model promotion. Later matches override earlier ones.
    "rules": [
      {
        "match": { "provider": "openai" },
        "options": { "telemetry": { "fast": true } }
      },
      {
        "match": { "model": "gpt-5.*", "sdk": "@ai-sdk/openai" },
        "options": { "serviceTier": "priority", "telemetry": { "sampled": true } }
      },
      {
        "match": { "model": "gpt-5.*", "sdk": "@ai-sdk/openai-compatible" },
        "options": { "service_tier": "priority", "telemetry": { "sampled": true } }
      }
    ]
  },

  "agents": {
    "reviewer": {
      "model": "<provider>/<primary-reasoning-model>",
      "variant": "max",
    },
    "orchestrator": {
      "reasoning": "high",
      "models": [
        "openai/gpt-5.6-sol:high",
        {
          "model": "anthropic/claude-sonnet-4-6:max",
          "reasoning": "max",
          "temperature": 0.2,
          "top_p": 0.8,
          "max_tokens": 8192
        }
      ],
    },
    "builder": {
      "requirement": {
        "variant": "high",
        "requiresProvider": ["<provider>"],
        "fallbackChain": [
          { "providers": ["<provider>"], "model": "<implementation-model>", "variant": "high" },
        ],
      },
    },
  },

  "categories": {
    "hard-reasoning": {
      "models": ["openai/gpt-5.6-sol:xhigh"],
    },
  },

  "runtimeFallback": {
    "enabled": true,
    "dispatch": true,
    "maxAttempts": 3,
    "cooldownSeconds": 60,
    "retryOnStatusCodes": [429, 500, 502, 503, 504],
    "retryOnPatterns": [
      "rate.?limit",
      "too.?many.?requests",
      "usage.?quota.{0,20}?(?:exceeded|exhausted|reached)",
      "quota.?exceeded",
      "(?:exceeded|exhausted|reached).{0,20}?quota",
      "free.?usage.{0,20}?(?:exceeded|exhausted|limit)",
      "usage.?exceeded",
      "(?:usage|quota)\\s+limit\\s+exhausted",
      "exhausted\\s+your\\s+capacity",
      "all\\s+credentials\\s+for\\s+model",
      "cool(?:ing)?\\s+down",
      "model.{0,20}?not.{0,10}?supported",
      "model_not_supported",
      "service.?unavailable",
      "temporarily.?unavailable",
      "overloaded",
      "internal server error",
      "gateway timeout",
      "bad gateway",
      "try\\s+again\\s+(?:later|shortly|in\\s+\\d+\\s*(?:seconds?|minutes?))",
      "\\b429\\b",
      "\\b503\\b",
      "\\b529\\b",
      "使用上限",
      "频率限制",
      "请求过于频繁",
      "暂时不可用",
      "服务不可用",
      "请稍后重试",
    ],
    "subagent429": {
      "enabled": true,
      "maxRetries": 5,
      "providerScopes": {
        "anthropic": "provider",
        "openai": "model"
      }
    }
  },

  "subagent": {
    "maxDepth": 3
  },

  "idleContinuation": {
    "enabled": false,
    "maxContinuations": 20,
    "prompt": "Your todo list has unfinished items. Continue with the next pending or in-progress task. Do not ask for confirmation — proceed."
  },

  "mcp": {
    "enabled": true,
    "envAllowlist": ["EXA_API_KEY", "CONTEXT7_API_KEY"],
    "websearch": { "provider": "exa" }, // "exa" or "tavily"
    "servers": {
      // Explicit entries override built-ins. Use this to replace or pin lsp.
      // "lsp": { "type": "local", "command": "custom-lsp", "args": ["mcp"] }
    }
  },

  "shim": {
    "mode": "none", // none|inline|config-file|config-dir|xdg (default: none)
    "configDir": "/custom", // target dir for config-dir/xdg modes
    "configFile": "/path.json", // target file for config-file mode
    "opencode": "/usr/local/bin/opencode",
    "keepOmo": false,
    "noProviders": false,
    "noPlugins": false,
  },

  "registerBuiltinAgents": true,
  "debug": false,
}
```

### OpenCode host subagent depth compatibility

OpenCode commit `285d315b4e5355e0a94608acc0678a11b720079e` added the top-level `subagent_depth` setting. Its implicit default is `1`. ocmm's `subagent.maxDepth` default remains `3`.

When both guards are active, the effective Task limit is the lower value. ocmm never copies its value into host config and never changes either default. If the host field is observable in the plugin config hook, `OCMM_DEBUG=1` logs the host and local combination once: an `info` message when they agree, or a `warn` message that identifies the stricter guard when they differ. If ocmm's guard is disabled, the same debug setting logs an `info` message for the host-only limit.

An absent `subagent_depth` field does not identify the host version. It can mean an older host without the capability or a newer host using its implicit default of `1`, and neither runtime case produces a compatibility log. On a newer host with the field omitted, the actual host limit is `1`, the local limit is `3`, and the effective limit is `1`; this documentation is the only way to explain that case at runtime.

| Host situation | Host limit | Local guard | Effective Task limit | Diagnostic with `OCMM_DEBUG=1` |
| --- | ---: | --- | ---: | --- |
| Before the commit, field unavailable | Unavailable | Enabled, local `3` | `3` | None |
| New host, field omitted | Implicit `1` | Enabled, local `3` | `1` | None |
| Explicit `subagent_depth: 1` | `1` | Enabled, local `3` | `1` | `warn`, host is stricter |
| Explicit `subagent_depth: 3` | `3` | Enabled, local `3` | `3` | `info`, limits agree |
| Explicit `subagent_depth: 5` | `5` | Enabled, local `3` | `3` | `warn`, ocmm is stricter |
| Explicit `subagent_depth: 1` | `1` | Disabled | `1` | `info`, host only |

Both controls apply only to OpenCode `task` dispatches. ocmm does not classify a tool named `execute` as `task`, so neither depth guard applies to `execute`.

### Canonical review-slot configuration

```jsonc
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.6-terra",
      "variant": "xhigh",
      "variants": {
        "low": "high",
        "high": "max",
        "max": { "model": "openai/gpt-5.6-sol", "variant": "max" }
      }
    },
    "oracle-2nd": {
      "model": "anthropic/claude-opus-4-7",
      "variant": "xhigh",
      "variants": { "max": "max" }
    },
    "oracle-3rd": { "model": "google/gemini-3.1-pro" },
    "reviewer": {
      "model": "openai/gpt-5.6-sol",
      "variants": { "high": { "variant": "max" } }
    },
    "planner": {
      "variants": {
        "low": { "model": "openai/gpt-5.5", "variant": "high" },
        "high": "max",
        "max": { "model": "openai/gpt-5.6-sol", "variant": "max" }
      }
    },
    "plan-critic": {
      "variants": {
        "low": { "model": "openai/gpt-5.5", "variant": "low" },
        "high": "xhigh",
        "max": { "model": "openai/gpt-5.6-sol", "variant": "max" }
      }
    }
  }
}
```

- Unsuffixed slot names (`oracle`, `oracle-2nd`, `oracle-3rd`, `reviewer`) mean logical **normal** tier.
- Logical tier (`-low`/`-high`/`-max`) and native provider model `variant` are separate controls.
- Review slots are priority order, not capability ranking.
- Slots `oracle-3rd` through `oracle-9th` require explicit config.
- Multiple configured review profiles do not fan out automatically; dispatch still uses one selected profile.
- `reviewer` has no ordinal slot naming.
- `reviewer` is primary-model or primary-lane self-review; Oracle slots are external-model cross-checks by default. Explicit user model configuration may remove that heterogeneity.
- Reviewer and Oracle profiles are reserved for software implementation acceptance or focused code-quality verification after an implementation diff exists, not research, ideation, architecture design, root-cause debugging, general-answer validation, or routine confidence.
- xhigh-equivalent review floors still apply even when a logical `low` tier is selected.
- Unsuffixed `planner` and `plan-critic` are their logical **normal** profiles. Their `-low`, `-high`, and `-max` suffix profiles are materialized only for explicitly configured `variants`; examples or generated files do not prove that a profile is currently callable.
- Before dispatching a planning role, inspect current callable/registered names and select the first available candidate: explicit cost/latency request uses low then normal; small/clear uses normal; complex/cross-module uses high then normal; security/performance/data-loss/release-safety/runtime-safety/critical-migration work uses max then high then normal. Never invent an absent suffix.
- Every generated planning tier inherits its canonical role's prompt, mode, permissions, registration policy, routing behavior, and receipt semantics. A tier changes the configured model route only.
- `plan-critic-low` may select a lower-cost or lower-latency model, but it is not lower-effort review: the xhigh-equivalent floor remains mandatory.
- `agents.oracle-high` is a deprecated config spelling migrated to `agents.oracle-2nd`, while runtime `oracle-high` remains the first-slot logical high tier.
- Alias/canonical collisions fail validation.
- `schema.json` and direct `OcmmConfigSchema` parsing remain strict. Runtime `loadConfig()` is tolerant: a schema-mismatched review field or entry is discarded locally while valid siblings and lower-priority values remain loaded. Only ambiguous alias/canonical migration collisions fall back to defaults.

### Disabling review slots and interruption recovery

```jsonc
{
  "disabledAgents": ["oracle-2nd", "oracle-high"],
  "disabledHooks": ["subagent-interruption-recovery"]
}
```

- `oracle-2nd` disables that entire second review slot, including its logical tier profiles.
- `oracle-high` disables only the first-slot logical high tier profile; it does not disable `oracle` normal or other slots.
- `subagent-interruption-recovery` is optional evidence correlation + resume-note behavior layered on top of existing fallback flow.

Interruption recovery behavior:

1. Reuses the existing dedicated 429/generic fallback controller and retry budgets.
2. Keys correlation by child session and deduplicates parent `message.part.updated` evidence.
3. Treats child `session.error` as provider-error evidence.
4. Never retries explicit abort, permission denial, unknown agent, deletion, or ordinary empty output outcomes.
5. May append one manual continuation notice only when an explicit task identifier is observed in task input/output or correlated parent-part evidence; it never substitutes `childSessionID` for `task_id`, dispatches from `tool.execute.after`, or synthesizes a parent prompt.

### Shorthand vs full form

Both `agents.*` and `categories.*` accept either shape:

| Field            | Type                                                                                             | Meaning                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `models`         | non-empty array of `string \| { model, reasoning?, temperature?, top_p?, max_tokens? }`         | Preferred canonical fallback chain. Objects validate `temperature` `0..2`, `top_p` `0..1`, and positive integer `max_tokens`; unknown keys are stripped. |
| `model`          | `"provider/model"` string                                                                        | Legacy primary shorthand. Split into `providers: [provider]` plus `model`.                                                  |
| `variant`        | `"low" \| "medium" \| "high" \| "xhigh" \| "max" \| "minimal" \| "none" \| "auto" \| "thinking"` | Requirement default; with legacy `model`, also promoted onto the first chain entry.                                        |
| `reasoning`      | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max" \| "auto"`; deprecated input alias `"none"` | Canonical requirement default. An individual `models` object value is entry-local and wins its model suffix. |
| `fallbackModels` | array of `string \| FallbackEntry`                                                               | Legacy fallback shorthand appended after legacy `model`; its ordinary user/project accumulation behavior is unchanged.     |
| `requirement`    | full `ModelRequirement` object                                                                   | Full guards/defaults. With `models`, only its chain is replaced; otherwise it outranks legacy `model`/`fallbackModels`.    |
| `disabled`       | `true`                                                                                           | (Agents only.) Removes the agent from registration.                                                                         |
| `description`    | string                                                                                           | Overrides the built-in description (used in agent registration).                                                            |

`models[0]` is the primary model; the remaining entries are ordered runtime fallbacks. Internally, ocmm normalizes the array to the existing route/fallback chain. Direct model-source precedence is `models` → `requirement` chain → `model` plus `fallbackModels` → alias; chains are never merged. When `models` and `requirement` coexist, ocmm replaces only `fallbackChain` while preserving cloned requirement guards and defaults. Explicit top-level `reasoning`/`variant` overrides requirement defaults; per-entry fields remain local. `provider_options` is unsupported and, like other unknown object fields, is stripped before runtime. Legacy forms remain supported.

## Hook defaults

`disabledHooks` in config controls which hooks are active. Default: `["directory-readme-injector"]` — only the directory README injector is disabled out of the box; all other hooks are enabled. The full list:

| Hook name | Default | Purpose |
| --- | --- | --- |
| `directory-readme-injector` | **Disabled** | Read tool output appends the nearest `README.md` once per directory/session; disabled by default. |
| `directory-agents-injector` | Enabled | Read tool output appends `AGENTS.md` directory context found upward from the read file, within project root, once per directory/session. |
| `rules-injector` | Enabled | Appends configured rule blocks to matching Read/Write/Edit tool output when rules are enabled. |
| `write-existing-file-guard` | Enabled | Tracks Read permissions; blocks `write` overwriting existing files and `edit`/`multiedit`/patch-style edits without prior read where applicable. |
| `notepad-write-guard` | Enabled | Blocks `write`/`edit`/`multiedit` under `.omo/notepads/` and `.sisyphus/notepads/`. |
| `bash-file-read-guard` | Enabled | Warns when a Bash command appears to be a simple file read (`cat`, `head`, `tail`); does not block. |
| `bash-file-write-guard` | Enabled | Blocks Bash commands that write to existing project files through redirects, `tee`/`dd`/`install`/`truncate`, in-place editors, copy/move overwrites, or nested shell scripts. |
| `question-label-truncator` | Enabled | Truncates ask-user-question option labels over 30 chars. |
| `tasks-todowrite-disabler` | Enabled | Blocks `todoread` while the task system is active, making `todowrite` the source of truth. |
| `webfetch-redirect-guard` | Enabled | Resolves HTTP redirects and rewrites the WebFetch URL to the final URL. |
| `empty-task-response-detector` | Enabled | Replaces empty Task tool output with a warning/notice. |
| `comment-checker` | Enabled | Warns on AI-attribution comments in `write`/`edit`/`multiedit` content unless a bypass marker is present. |
| `plan-format-validator` | Enabled | Warns on malformed checklist lines in `.omo/plans/*.md` writes/edits. |
| `read-image-resizer` | Enabled | Appends a dependency-free build notice for image Read outputs; does not resize. |
| `json-error-recovery` | Enabled | Appends recovery instructions when tool output contains JSON parse errors. |
| `fsync-skip-warning` | Enabled | Appends drained fsync skip warnings from the fsync tracker. |
| `tool-output-truncator` | Enabled | Truncates very large selected tool outputs. |
| `todo-description-override` | Enabled | Overrides the `todowrite` tool description with ocmm’s structured todo format. |
| `commit-guard-injector` | Enabled | Injects the no-autonomous-git-write constraint into the system prompt. |
| `subagent-git-guard` | Enabled | Blocks git write commands in subagent sessions except allowed temp-repo cases. |
| `subagent-interruption-recovery` | Enabled | Correlates child-session interruption evidence (`session.error` + `message.part.updated`) and lets the output adapter append at most one manual continuation notice without owning retry dispatch. |
| `subagent-depth-guard` | Enabled | Blocks `task` dispatches that would exceed local `subagent.maxDepth` (default `3`); when host `subagent_depth` is observable, the effective limit is the lower active value and `OCMM_DEBUG` logs compatibility once per combination. Never treats `execute` as `task`. |

## Variant policy

`variant` is a routing hint, not a portable provider API. ocmm normalizes it by model family before writing `chat.params`:

| Model family | ocmm behavior |
| ------------ | ------------- |
| Explicit user config or request | Respected as written except for review/plan-review floors: `reviewer`, Oracle review profiles (`oracle`, `oracle-high`, `oracle-2nd`, etc.), and `plan-critic` are raised to the model family's xhigh-equivalent/highest-supported review effort when possible. |
| GPT-like non-mini built-in defaults | Built-in defaults never request below `high`; category defaults from `coding` upward resolve to `max`. GPT-5.6 supports native `reasoningEffort=max`; other GPT-like/Codex-like families use their catalog-supported maximum effort. |
| GPT-like mini | Keeps the provider's full low-effort ladder, including `minimal`, `low`, and no-op `none` when supported. |
| Claude Opus 4.7+ / Fable | Built-in defaults do not emit an ocmm-owned `thinking` budget or `reasoningEffort`; explicit non-review user config is passed through as written, while review/plan-review agents still receive the xhigh-equivalent floor when possible. |
| Older Claude | Uses Anthropic `thinking` budgets for non-`none` variants. |
| Gemini | Uses `reasoningEffort`; high and above also enable provider thinking. |
| Latest GLM / DeepSeek | Built-in defaults normalize low/medium-style local variants to canonical high/max controls where the provider family supports them; non-review explicit user config or request variants are left as written. |
| Category defaults | `quick` stays lightweight. Built-in category defaults from `coding` upward resolve to `max`; explicit user category config or input variants are respected as written. |
| Kimi / MiniMax / unknown | Uses the existing temperature shaping fallback when no better family-specific knob exists. |

## Built-in agents

```
orchestrator    primary reasoning lane          variant=max     main coordinator
builder         implementation lane             variant=high    autonomous implementer
reviewer        primary review lane             xhigh floor     implementation self-review
oracle          review slot 1 (logical normal) xhigh floor     external-model cross-check
oracle-high     review slot 1 logical high     derived profile runtime tier profile (from variants)
oracle-2nd      review slot 2 (logical normal) xhigh floor     second-priority external cross-check
doc-search      lightweight lookup lane         (none)          external docs / OSS lookup
code-search     lightweight lookup lane         (none)          internal codebase grep
planner         primary reasoning lane          variant=max     work-plan author
clarifier       analysis lane                    (none)          pre-plan analysis
plan-critic     primary review lane             variant=xhigh   plan QA
media-reader    multimodal-capable lane         variant=high    multimodal analysis
```

## Built-in categories (also registered as subagents)

```
frontend        UI/multimodal-capable lane   variant=high    UI/UX, layout, styling, visual QA
creative        creative-capable lane        variant=high    concepts, naming, narrative, framing
hard-reasoning  primary reasoning lane       variant=xhigh   ultrabrain-style decisions and tradeoffs
research        research-capable lane        variant=high    missing-fact investigation and evidence gathering
quick           lightweight lane             (none)          fully specified mechanical edits
coding          implementation lane          (none)          determined code edits and bug fixes
normal-task     implementation lane          (none)          ordinary bounded tasks
complex         coordinated-work lane        variant=high    coordinated multi-step ordinary tasks
deep            primary reasoning lane       variant=max     autonomous system development and delivery
documenting     prose-capable lane           (none)          standalone documentation and prose
```

Rows above describe built-in selection lanes, not required provider channels or model IDs. Example model names elsewhere in the repository are references only; explicit user configuration and the currently available model catalog decide the actual model. Agent rows show source defaults or enforced review floors; category rows show the **raw source values** from `src/data/categories.ts`. At runtime the variant policy normalizes categories from `coding` upward to model-appropriate `max` unless the user explicitly overrides them; see the variant policy table above. Entries marked `(none)` carry no built-in variant and rely on this normalization.

The primary review structure is primary-model or primary-lane self-review through `reviewer`, plus external-model cross-checks through canonical Oracle slots (`oracle`, `oracle-2nd`, optional `oracle-3rd` ... `oracle-9th` when explicitly configured). Runtime logical tier names such as `oracle-high` and `oracle-max` are derived from configured `variants` and stay within slot 1; they are not separate slot registrations. `oracle` is the first external cross-check slot and shares implementation-review semantics via `promptSource: "reviewer"`; `oracle-2nd` is the second-priority external slot. Explicit user model configuration remains authoritative and may remove model heterogeneity. `agents.oracle-high` is a deprecated config spelling migrated to `agents.oracle-2nd` during config load so legacy config keeps working while canonical keys remain slot-based. Supporting utility agents (`builder`, `doc-search`, `code-search`, `media-reader`) still use the workflow/model-family deepwork prompt without an additional role prompt. `builder` is registered with `mode:"primary"`; `planner` is registered with `mode:"all"` so it can be selected directly and used as a delegated task agent. Each category has a prompt under `prompts/<workflow>/category/<name>.md` that is set as the category-subagent's system prompt. Callers invoke categories via `task(category="deep", ...)` or direct subagent names such as `@deep` and `@quick`. The upstream-style compatibility alias `@explore` maps to local `code-search`; `@oracle` selects the independent local `oracle` agent rather than aliasing `reviewer`.

### Category model-availability diagnostics

With `OCMM_DEBUG=1`, the config hook emits one deduplicated availability diagnostic for each successfully registered built-in or custom category and each distinct observed diagnostic state. Every message includes the category name, requirement/primary provenance, selected model, candidate summaries, and `routePreserved=true`.

| Status | Meaning |
| --- | --- |
| `available` | The current host catalog contains an exact eligible provider/model key, or `requiresAnyModel` is active and an eligible observed provider exposes at least one model. |
| `dead` | The normalized fallback chain is empty, or every candidate is structurally impossible because it conflicts with `requiresModel` or `requiresProvider`. |
| `unknown` | At least one candidate is structurally eligible, but the host catalog is missing, malformed, incomplete, or does not currently show the provider/model. |

These diagnostics are read-only. `target.provider[*].models` is observation evidence, not proof of credentials or runtime access, and catalog absence never disables a category. A `dead` or `unknown` category remains registered; diagnostics do not change selected primaries, catalog upgrades, provider defaults, canonical `models[]`, effective-route snapshots, or runtime fallback. Messages contain provider IDs and model keys only—never provider options, API keys, URLs, response bodies, or the full host config. The existing logger keeps all of this output silent unless `OCMM_DEBUG` is enabled.

## Prompt architecture

Prompts are organized by workflow:

```
prompts/
  omo/                              # upstream omo prompts
    deepwork/{default,gpt,gpt-5.6,gemini,glm,codex,planner}.md
    agents/{orchestrator,reviewer,planner,clarifier,plan-critic}.md
    category/*.md (10 files)
  v1/                               # superpowers-style prompts
    deepwork/{default,gpt,gpt-5.6,gemini,glm,codex,planner}.md
    agents/{orchestrator,reviewer,planner,clarifier,plan-critic}.md
    category/*.md (10 files)
skills/
  ast-grep/                          # shared skills registered as OpenCode skills + slash commands
  coding-agent-sessions/             # local session-history finder shared skill
  debugging/
  frontend/
  git-master/
  init-deep/
  v1/                               # forked superpowers skills (v1 only)
    brainstorming/SKILL.md
    writing-plans/SKILL.md
    subagent-driven-development/SKILL.md
    requesting-code-review/SKILL.md
    receiving-code-review/SKILL.md
```

Model-family variant selection (`pickDeepworkVariantForAgent`):

- planner agent -> `planner.md`
- GPT family -> `gpt.md`
- Gemini family -> `gemini.md`
- GLM family -> `glm.md`
- Codex family -> `codex.md`
- others (Claude/Kimi/Minimax/unknown) -> `default.md`

Variant is selected at config time using the final selected agent model after explicit user configuration, inherited aliases, and catalog-confirmed upgrades are considered. For built-in functional agents, ocmm composes `agents/<name>.md` with the selected `deepwork/<variant>.md`; the role prompt is authoritative for that agent's scope and the deepwork prompt supplies workflow/model calibration. Categories receive only their category prompt. No runtime keyword detection — prompts are attached declaratively.

For v1 workflow, superpowers skills are injected on the first message per session via `chat.message` (queue) + `system.transform` (prepend). For omo workflow, prompts are attached declaratively at config time; `chat.message` and `system.transform` only participate when a bare noninteractive slash command needs compatibility expansion.

## Slash Commands

ocmm registers OpenCode `config.command` entries for:

- Shared skills under `skills/`, available as `/git-master`, `/ast-grep`, `/coding-agent-sessions`, `/frontend`, `/debugging`, and `/init-deep` by default.
- v1 injected deepwork skills when `workflow:"v1"` is active, available as `/brainstorming`, `/writing-plans`, `/subagent-driven-development`, `/requesting-code-review`, and `/receiving-code-review`. In v1, ocmm also adds `skills/v1` to OpenCode skill paths so native skill slash resolution works without "skill not found" noise.
- Loop protocol commands `/ralph-loop`, `/audit-loop`, and `/dwloop` (`/dwloop` is the deepwork-loop alias for `/audit-loop`).

Interactive OpenCode uses its native slash-command parser. For noninteractive `opencode run "/command args"` calls, OpenCode 1.17.9 passes the first message directly and does not parse project commands; ocmm compensates by expanding bare ocmm command text during `chat.message` and injecting the expanded command once through `system.transform`.

The loop commands are command-template entry points only. The full upstream omo idle continuation engine, verifier orchestration, Boulder/Atlas state, and cancel/stop hooks are not yet migrated; the templates explicitly tell the model to run the loop inside the current session and not claim hidden auto-continuation. The Ralph Loop runtime and related hooks are tracked as follow-up work in `docs/kb/omo-features/loops.md`.

ocmm does not ship a separate `/lsp-setup` command. OpenCode already provides LSP setup guidance, while ocmm's responsibility is to register and distribute the default `lsp` MCP backed by `ocmm-lsp`. Configure external language servers through `.opencode/ocmm-lsp.json`, `.opencode/lsp.json`, or `.codex/lsp-client.json` when overrides are needed.

### Coding-agent session search

`/coding-agent-sessions` searches local coding-agent session stores, including Aside, through its bundled finder. It supports JSON `list`, `search`/`find`, and `get`/`read` output with child-session linkage; it reads local stores only and implies no network request. Runtime needs Python 3.11+ and the standard library only; the source retains pytest development tests, but they are not distributed.

Use explicit platform and root constraints when reading history. Omitting either broadens known-store discovery and may inspect local session history:

```powershell
$sessionRoot = "C:\exports\coding-agent-session-fixture"
python skills/coding-agent-sessions/scripts/find-agent-sessions.py find "ambassador" --platform aside --root "$sessionRoot"
```

The imported subtree has its separate license in `skills/coding-agent-sessions/LICENSE-UPSTREAM.md`.

## Profiles

A **profile** is a named partial overlay on the base config. It can override any top-level field (agents, categories, runtimeFallback, subagent, debug, etc.) except `profiles` and `activeProfile` themselves. At load time, after merging user + project configs, the active profile is deep-merged over the result — profile wins over both.

### Selecting a profile

Ambient selection remains, in priority order: `OCMM_NO_PROFILE`, then `OCMM_PROFILE`, then config `activeProfile`.

1. **`OCMM_NO_PROFILE=1` or `OCMM_NO_PROFILE=true`** disables profile selection for that process.
2. **`OCMM_PROFILE` env var** selects a profile for the shell without persisting it:

   ```bash
   OCMM_PROFILE=gpu opencode run "..."
   ```

   Empty string is treated as unset — falls back to the config's `activeProfile`.

3. **`activeProfile` in the config file** is the persisted fallback:

   ```jsonc
   { "activeProfile": "gpu" }
   ```

If the named profile doesn't exist, the OpenCode plugin facade warns and preserves the base config.

### OpenCode plugin profile facade and qualified aliases

Directory profile descriptors and qualified aliases are an **OpenCode plugin facade** feature. Only `loadOpenCodePluginConfig` materializes them; ordinary programmatic `loadConfig` calls — including `loadConfig({ host: "opencode" })` — and the Codex adapter remain non-materializing.

For each profile name, descriptor precedence is inline `profiles.<name>` < user `ocmm-profiles/` directory < project `.opencode/ocmm-profiles/` directory. When both extensions exist for one basename, `.jsonc` wins **before parsing**. An invalid inactive descriptor is inert. An invalid selected descriptor at higher precedence makes the plugin atomically use defaults; it does not fall through to a lower-precedence descriptor.

An alias containing a colon uses first-colon grammar, `<profile>:<agent>`. For example, a base agent can import the `reviewer` requirement from the `precision` profile while retaining its own behavior:

```jsonc
{
  "agents": {
    "oracle": {
      "alias": "precision:reviewer",
      "description": "Local Oracle behavior remains local",
      "promptAppend": "Use this role's local review instructions."
    }
  }
}
```

The import is requirement-only: it copies the normalized `ModelRequirement` — `fallbackChain`; its requirement-level native `variant`; each fallback entry's `providers`, `model`, native `variant`, and model-control metadata; and `requiresModel`, `requiresAnyModel`, and `requiresProvider`. Agent-level logical review `variants` remain local and are not imported. Permissions, prompts, tools, description, other agent controls, and profile-wide fields also stay on the source agent.

### Profile merge semantics

| Field type                                          | Behavior under profile overlay                 |
| --------------------------------------------------- | ---------------------------------------------- |
| Scalars (`debug`, `workflow`, ...)                  | Replaced                                       |
| Objects (`agents`, `categories`, `runtimeFallback`, `subagent`) | Deep-merged (profile field wins per-key)       |
| Nested `agents.*.models`, `categories.*.models`     | **Replaced** (the overlay owns the complete canonical chain; no index merge or union) |
| `fallbackModels`, `disabledAgents`                  | **Replaced** (profile fully owns these arrays) |
| Other arrays (`retryOnStatusCodes`, ...)            | Replaced                                       |

Nested canonical `models` arrays replace across both ordinary user/project layers and profiles. Root `fallbackModels` and `disabledAgents` remain unioned across user/project configs and replaced by profiles.

### Fast model routing

Fast routing is opt-in and applies only to **OCMM-managed routes**. It never mutates unmanaged OpenCode agents or provider catalogs. Use the OpenCode shim:

```bash
ocmm --fast run "Review this change"
```

Before an explicit `--` separator, the shim consumes `--fast`; `ocmm -- --fast` instead passes `--fast` to OpenCode verbatim. The shim sets `OCMM_FAST=1` in its child environment only when it consumes that flag; otherwise it clears any inherited child value. For direct plugin activation, only the exact ambient values `OCMM_FAST=1` and `OCMM_FAST=true` enable fast routing; every other value is false.

`fastModels.providers` is an explicit, case-sensitive provider allowlist. Omitting it or leaving it empty disables promotion. For an allowlisted selected model, `fastModels.mappings` looks up the qualified original key `provider/model`; its value is a provider-local model ID (it may itself contain `/`), and the already-selected provider is retained. An explicitly owned mapping key is authoritative, including a self-map no-op.

`providers` plus `mappings` are always the first-priority fast-model promotion path. Without an explicit mapping, ocmm tries `${modelID}-fast` only when that exact model exists in the selected provider's catalog. An explicit self-mapping and a selected model already ending in `-fast` are authoritative no-ops; neither falls through to option rules.

`fastModels.defaultRules` defaults to `false`. When enabled on an options-only fast path, ocmm applies a best-effort OpenAI Priority Processing default based on the exact, case-sensitive runtime `model.api.npm` and model ID: `@ai-sdk/openai` receives `serviceTier: "priority"`, while `@ai-sdk/openai-compatible` receives the wire-compatible `service_tier: "priority"`. Other or missing SDK metadata is unchanged. It performs no network probe.

The model must start with lowercase `gpt-` followed immediately by numeric major version 4 or newer. Standard, mini, snapshot, and future numeric GPT generations are eligible; IDs containing an exact `.`, `_`, or `-` delimited token from `nano`, `pro`, `realtime`, `audio`, `transcribe`, `image`, `search`, `tts`, `vision`, or `codex` are excluded. GPT 3.5, non-GPT, fine-tuned, and case-mismatched IDs are excluded. This heuristic is intentionally best-effort: OpenAI can change Priority support, and an OpenAI-compatible backend remains the final authority and may reject `service_tier`.

### `fastModels.rules`

When `--fast` / `OCMM_FAST=1|true` is active and an OCMM-managed route has no eligible mapping or catalog-backed `-fast` promotion, `fastModels.rules` provides an options-only fallback. It does not change the selected model, and it does not use `fastModels.providers` as an allowlist; use `match.provider` to scope a rule. `off` and model-promoted routes, plus unmanaged routes, never apply rules.

Each rule has `match` and `options`. `match` must declare at least one of optional `provider`, `model`, or `sdk`; omitted fields are unrestricted and all present fields use AND semantics. Values are matched against the runtime `providerID`, provider-local runtime `modelID`, and OpenCode `model.api.npm` (for example `@ai-sdk/openai` or `@ai-sdk/anthropic`). Patterns are case-sensitive whole-string globs: `*` matches any number of characters, including `/`, and `?` matches exactly one character. A rule with `sdk` does not match when SDK metadata is absent.

For an options path, ordinary route/hook options are the base, enabled built-ins overlay that base, matching user rules overlay the built-ins in declaration order, and protected reviewer/plan-critic reasoning floors write last. A user rule can therefore override a built-in field or reset the official provider with `serviceTier: "default"`; the two SDK-specific names are not emitted together unless a user rule explicitly adds the other name. Plain objects deep-merge, while arrays, scalars, and `null` replace the earlier value, so later rules win. Runtime fallback requests are re-matched against their actual fallback provider, model, and SDK on every `chat.params` call.

Profile `fastModels.defaultRules` is a scalar: omission inherits the root value, while explicit `true` or `false` overrides it. Profile-declared `fastModels.rules` continues to replace the root array wholesale; omission continues to inherit the root rules.

## `ocmm` shim

The `ocmm` binary launches opencode with configurable config isolation. It merges providers from your global `opencode.json`, adds the ocmm plugin, and optionally strips the `oh-my-openagent` plugin to avoid collision.

```bash
ocmm                              # start opencode (no isolation by default)
ocmm -p work run "hello"          # select profile + run
ocmm --fast run "Review this change" # opt into fast model routing
ocmm --background-subagents run "Delegate this work" # experimental OpenCode background subagents
ocmm --mode xdg run "hello"       # full config isolation
ocmm --mode config-file -c run x  # config-file mode + continue
ocmm --help
```

### Flags

```
-p, --profile <name>     Select ocmm profile (sets OCMM_PROFILE)
    --fast               Enable opt-in fast model routing
    --background-subagents
                         Experimental, OpenCode-only background subagents
                         (sets child-process env OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true)
    --mode <m>            Isolation: none|inline|config-file|config-dir|xdg (default: none)
    --no-providers        Don't merge providers from global config
    --no-plugins          Don't merge plugins from global config
    --ocmm-only           Shorthand for --no-providers --no-plugins
    --config-dir <path>   Target dir for config-dir/xdg modes
    --config-file <path>  Target file for config-file mode
    --opencode <path>     Custom opencode binary path
    --keep-omo            Keep oh-my-openagent plugin (stripped by default in xdg)
    --reset               Clear isolated dir before starting
-h, --help                Show help
--                        Separator; everything after passes to opencode verbatim
```

All non-ocmm args (including `-c`, `--continue`, `--model`, `run`, etc.) pass through to opencode. Before the explicit `--` separator, `--fast` is an ocmm shim flag; after it, `ocmm -- --fast` passes that token through to OpenCode.

### Experimental OpenCode background subagents

Use the CLI-only switch when launching a new OpenCode process:

```bash
ocmm --background-subagents ...
```

The experimental, OpenCode-only switch sets `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` only in the spawned child process. Without it, the shim removes any ambient inherited value for that variable so background subagents cannot activate accidentally. Before the first exact `--`, ocmm consumes the switch; `ocmm -- --background-subagents ...` forwards it unchanged to OpenCode and does not set the child environment variable.

This is a startup opt-in: direct `opencode` use or direct plugin loading bypasses it, and an existing process needs to be restarted through `ocmm --background-subagents ...` to activate it. OpenCode owns its background child sessions, jobs, completion, and cancellation. It automatically injects completion into the parent conversation, so ocmm does not poll. Jobs are process-local and non-durable; after a restart they are gone. Use OpenCode's returned `task_id` to continue the related session.

### Isolation modes

| Mode             | Env var                   | Isolation                           | Notes |
| ---------------- | ------------------------- | ----------------------------------- | ----- |
| `none` (default) | `OPENCODE_CONFIG_CONTENT` | No config-dir isolation             | Inline config is additive; it cannot remove an already-loaded global plugin. |
| `inline`         | `OPENCODE_CONFIG_CONTENT` | No config-dir isolation             | Explicit form of `none`. |
| `config-file`    | `OPENCODE_CONFIG`         | Generated single config file        | Writes `<config-dir>/opencode.json`. |
| `config-dir`     | `OPENCODE_CONFIG_DIR`     | Generated config directory          | Uses `~/.config/opencode/ocmm-opencode/` unless `--config-dir` overrides it. |
| `xdg`            | `XDG_CONFIG_HOME`         | Full OpenCode config-dir isolation  | Uses the same default isolated directory and can strip global plugins. |

Supported config defaults can be set in the `shim` section of `ocmm.jsonc`. CLI flags override config values; `--background-subagents` is CLI-only.

## `ocmm-profiles` CLI

Manage profiles without editing JSON:

```bash
ocmm-profiles list                 # list all (* = active)
ocmm-profiles use claude           # set active profile (persisted)
ocmm-profiles show [name]          # print a profile
ocmm-profiles add gpu ./gpu.json  # add/replace from JSON file
ocmm-profiles rm gpu              # delete a profile
ocmm-profiles clear                # clear activeProfile
ocmm-profiles current             # print active profile name
```

The CLI reads/writes the **user** config file at `~/.config/opencode/ocmm.json[c]`. Comments are not preserved on write.

## Runtime fallback

When a model call falls through to generic runtime fallback (HTTP 429/5xx, or a message matching `retryOnPatterns`), ocmm:

1. Resolves the failing agent's `ModelRequirement` (user config -> built-in defaults).
2. Marks the just-failed model as failed with a timestamp.
3. Finds the next entry in the fallback chain that is not in cooldown (default 60s).
4. Dispatches a new `client.session.prompt` call with the next model, reusing the latest contiguous user-message block.
5. Aborts the original session first (best-effort).

### Subagent 429 recovery

New child sessions have a dedicated recovery path only for retryable errors with an explicit HTTP status of `429`. It recognizes the OpenCode parent-session fields `parentID`, `parentId`, `parentSessionID`, and `parentSessionId` when the child is created; root sessions, untracked sessions, and regex-only matches remain on generic fallback. A non-429 error before the child enters the dedicated path leaves it on the generic path.

Each dedicated 429 waits for two signals before retrying or switching: its delay timer and the idle event owned by that error. Dedicated dispatches do **not** abort the child session; generic fallback continues to use a best-effort abort. Recovery hints longer than 10 minutes become a zero-delay probe, while hints of 10 minutes or less wait in full. With no hint, the wait uses capped equal-jitter exponential backoff (1-second base, 30-second cap).

`subagent429.maxRetries` defaults to 5 and is scoped to a model by default. Set it to 0 to prepare a switch immediately (the two signals still gate dispatch). A configured provider scope blocks every model of that provider, but only in the current child session. Every newly selected model starts with a fresh retry budget; `runtimeFallback.maxAttempts` counts only committed model switches, not same-model dedicated retries.

While a dedicated dispatch is active, the first queued provider outcome takes priority over idle. A queued 429 continues the dedicated flow after the active dispatch settles; a queued non-429 error hands off to generic fallback after settlement; and a bare `false` dispatch result with no queued outcome stops the dedicated flow. With `runtimeFallback.dispatch: false`, ocmm is observe-only and dispatches neither dedicated retries nor generic fallback. Dedicated state is never shared between child sessions.

```jsonc
"runtimeFallback": {
  "enabled": true,
  "dispatch": true,
  "maxAttempts": 3,
  "cooldownSeconds": 60,
  "retryOnStatusCodes": [429, 500, 502, 503, 504],
  "retryOnPatterns": [
    "rate.?limit",
    "too.?many.?requests",
    "usage.?quota.{0,20}?(?:exceeded|exhausted|reached)",
    "quota.?exceeded",
    "(?:exceeded|exhausted|reached).{0,20}?quota",
    "free.?usage.{0,20}?(?:exceeded|exhausted|limit)",
    "usage.?exceeded",
    "(?:usage|quota)\\s+limit\\s+exhausted",
    "exhausted\\s+your\\s+capacity",
    "all\\s+credentials\\s+for\\s+model",
    "cool(?:ing)?\\s+down",
    "model.{0,20}?not.{0,10}?supported",
    "model_not_supported",
    "service.?unavailable",
    "temporarily.?unavailable",
    "overloaded",
    "internal server error",
    "gateway timeout",
    "bad gateway",
    "try\\s+again\\s+(?:later|shortly|in\\s+\\d+\\s*(?:seconds?|minutes?))",
    "\\b429\\b",
    "\\b503\\b",
    "\\b529\\b",
    "使用上限",
    "频率限制",
    "请求过于频繁",
    "暂时不可用",
    "服务不可用",
    "请稍后重试"
  ],
  "subagent429": {
    "enabled": true,
    "maxRetries": 5,
    "providerScopes": {
      "anthropic": "provider",
      "openai": "model"
    }
  }
}
```

Abort errors are never retried. Deduplication is enforced via an in-flight `Set<sessionID>`.

### Subagent interruption recovery

The `subagent-interruption-recovery` hook is enabled by default and layers evidence correlation over the existing fallback ownership model:

- It reuses the existing 429/generic fallback controller and budget accounting.
- Correlation is keyed by child session and deduplicates parent `message.part.updated` task-part evidence.
- Child `session.error` events are treated as provider-error evidence in that correlation record.
- It never retries explicit abort, permission denial, unknown agent, deletion, or ordinary empty-output outcomes.
- The task-output adapter may append at most one manual continuation notice only when an explicit task identifier is observed in tool input/output or correlated parent-part evidence. It never substitutes `childSessionID` for `task_id`, dispatches from `tool.execute.after`, or synthesizes a parent prompt.

## Develop

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Tests use `node --test --experimental-strip-types` (Node 22+) plus `cargo test` for the native `ocmm-lsp` MCP server in `crates/ocmm-lsp/`. `pnpm run build` emits TypeScript into `dist/` and copies the Rust release binary into `dist/bin/` as both the target-triple release name and the local fallback name.

## Release

ocmm publishes through two independent release lanes.

### ocmm-lsp release

1. Bump `crates/ocmm-lsp/Cargo.toml` version.
2. Tag `ocmm-lsp-vA.B.C` and push.
3. CI builds 8 native binaries (Linux glibc x64/arm64, Linux musl x64/arm64, macOS x64/arm64, Windows x64/arm64).
4. CI publishes 8 npm platform packages to npmjs.org through npm Trusted Publishing (GitHub Actions OIDC).
5. CI publishes standalone native binaries, platform package tarballs (`ocmm-lsp-<platform-package>-<version>.tgz`), and `SHA256SUMS.txt` to the GitHub Release.

### ocmm release

1. Set `package.json.version` and `package.json.ocmm.lspVersion` (must match an already-published `ocmm-lsp-vA.B.C` release).
2. Regenerate the Codex plugin bundle: `pnpm run build:ts && pnpm run gen:codex-plugin`.
3. Tag `vX.Y.Z` and push.
4. CI downloads pinned `ocmm-lsp-v<lspVersion>` release assets, bundles them into GitHub Release tarballs.
5. CI publishes to npmjs.org as `ocmm` through npm Trusted Publishing (GitHub Actions OIDC).
6. On tag pushes, CI also publishes `@<owner>/ocmm` to GitHub Packages (optional for manual dispatch).
7. CI publishes self-contained tarballs (`ocmm-opencode-plugin-X.Y.Z.tgz`, `deepwork-codex-plugin-X.Y.Z.tgz`) and `SHA256SUMS.txt` to the GitHub Release.

The npm tarball excludes native LSP binaries (platform-agnostic, relies on optional dependency resolution). GitHub Release tarballs are self-contained with bundled native binaries for all 8 platforms.

Required npm configuration:
- Configure npm Trusted Publishing for `ocmm` and each `ocmm-lsp-*` platform package, with GitHub repository `hugefiver/ocmm`, workflow filename `release.yml` (the file at `.github/workflows/release.yml`), and publish permission enabled. The workflow uses GitHub Actions OIDC (`id-token: write`) and does not require an npm token for npmjs.org publishes.

### Completion proof

Workflow terminal success is an intermediate signal, not release completion. The post-run checker is the completion authority: report a release complete only when its JSON receipt has `outcome: "COMPLETED"` and the command exits `0`.

For a main tag push, run this from the exact released checkout after the tag and matching run exist. This is a release-stage command, not a feature-development command:

```powershell
pnpm --silent run check:release-completion -- --mode remote --repository hugefiver/ocmm --tag v0.6.6 --deadline-ms 5400000 --poll-ms 15000
```

Use the authorized later tag in place of `v0.6.6`. A manually dispatched run also requires its numeric `--run-id`.

No local `GITHUB_TOKEN` is needed to bump, tag, push, or trigger CI. npmjs and GitHub Packages are not completion checks or proof surfaces, so the checker does not request either registry. Registry publish jobs remain in CI and their workflow job conclusions remain part of the completion contract.

| Exit | Receipt outcome | Meaning |
| --- | --- | --- |
| `0` | `COMPLETED` | Every required surface is proven; this is the only completion outcome. |
| `1` | `FAILED` | At least one definite identity, workflow, asset, checksum, or required content invariant failed. |
| `2` | `UNRESOLVED` | No definite failure won, but a required surface could not be proven before the deadline. |

| Lane | Required surfaces | Explicitly non-applicable surfaces |
| --- | --- | --- |
| Main `vX.Y.Z` tag push | Peeled tag commit; fixed `release.yml` run/attempt and exact job conclusions; exact nonempty GitHub Release assets with downloaded SHA-256 verification; and the non-draft pinned `ocmm-lsp` Release. | npmjs and GitHub Packages completion checks are skipped. |
| LSP `ocmm-lsp-vA.B.C` | Peeled tag commit; fixed `release.yml` run/attempt and exact job conclusions; exact nonempty GitHub Release assets with downloaded SHA-256 verification. | npmjs, GitHub Packages, and pinned-LSP-release proof are skipped. |

Registry publication still runs in CI, but registry metadata is outside completion proof for every lane. Keep tokens, authorization headers, registry bodies, and signed asset URLs out of terminal captures, receipts, and chat.

After any partial publication, the tag is immutable: never move, delete, or recreate it, and never overwrite packages or Release assets from a workstation. Report the `FAILED` or `UNRESOLVED` receipt, preserve its bound identity, and use a separately authorized new commit/version/tag or an explicitly authorized same-identity rerun.

### Live integration test

See `AGENTS.md` for the full live test procedure using isolated XDG dirs.

## License

Licensed under the **Anti American AI Public License (AAAPL)** — see [`LICENSE`](./LICENSE) (English), [`LICENSE.zh.md`](./LICENSE.zh.md) (Chinese), or [`LICENSE.bilingual.md`](./LICENSE.bilingual.md) (authoritative bilingual reference).

SPDX identifier: `LicenseRef-AAAPL`.

## Architecture & internals

For design rationale, hook flow, the 4-tier variant resolution pipeline, two-layer fallback system, and config schema overview, see [`docs/architecture.md`](./docs/architecture.md).

Authoritative agent and category definitions live in `src/data/agents.ts` and `src/data/categories.ts`. For prompt provenance, see [`docs/v1-maintenance.md`](./docs/v1-maintenance.md) (v1/deepwork) and [`docs/prompt-sync.md`](./docs/prompt-sync.md) (omo).
