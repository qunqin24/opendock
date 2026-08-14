<p align="center">
  <img src="website/public/capy.svg" height="60" alt="Capy" />
</p>

<h1 align="center">Capy</h1>

<p align="center">
  MCP server that gives AI coding agents the context they need to build and update UI - preview pages & design-system artifacts.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/capy-mcp"><img src="https://img.shields.io/npm/v/capy-mcp?style=flat-square&color=white&labelColor=171615" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/capy-mcp"><img src="https://img.shields.io/npm/dm/capy-mcp?style=flat-square&color=white&labelColor=171615" alt="downloads" /></a>
<a href="https://github.com/GithubAnant/capy/blob/main/LICENSE">
  <img src="https://img.shields.io/badge/license-Apache%202.0-white?style=flat-square&labelColor=171615" alt="license" />
</a>
</p>

<p align="center">
  <a href="https://capy.dev">Website</a> · <a href="https://www.npmjs.com/package/capy-mcp">npm</a> · <a href="https://capy.dev/docs">Docs</a>
</p>

---

## What it does

Capy inspects your React / Next.js repo and returns structured briefs so AI agents can implement UI changes with precision — no hallucinated components, no guessed tokens.

**Three tools:**

| Tool                | Purpose                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `get_preview_brief` | Returns repo map, inspection plan, constraints, and a `/preview` spec for the agent to follow |
| `get_design_system` | Writes a machine-readable design-system JSON artifact (`.capy/design-system.json`)            |
| `update_preview`    | Diffs against last snapshot, refreshes the design system, returns an incremental update brief |

---

## Quick start

```bash
npx capy-mcp@latest
```

---

## Setup

Pick your client. One command or one config change — you're set.

### Agents

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --scope user capy -- npx -y capy-mcp@latest
```

Or add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to your config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Codex</b></summary>

```bash
codex mcp add capy -- npx -y capy-mcp@latest
```

Or add to `~/.codex/config.toml`:

```toml
[mcp_servers.capy]
command = "npx"
args = ["-y", "capy-mcp@latest"]
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Copilot CLI</b></summary>

Add to `~/.vscode-server/data/User/mcp.json`:

```json
{
  "servers": {
    "capy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

> Make sure Copilot Chat is in Agent mode — MCP tools only work there.

</details>

<details>
<summary><b>Mistral Vibe</b></summary>

Add to `~/.vibe/config.toml`:

```toml
[[mcp_servers]]
name = "capy"
transport = "stdio"
command = "npx"
args = ["-y", "capy-mcp@latest"]
```

</details>

<details>
<summary><b>Kimi Code</b></summary>

```bash
kimi mcp add --transport stdio capy -- npx -y capy-mcp@latest
```

Or add to `~/.kimi/mcp.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "capy": {
      "type": "local",
      "command": ["npx", "-y", "capy-mcp@latest"],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><b>QwenCode</b></summary>

Add to `settings.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

### IDEs

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

Add to `~/.vscode-server/data/User/mcp.json`:

```json
{
  "servers": {
    "capy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

> Or via Command Palette: `MCP: Open User Configuration`

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Zed</b></summary>

Add to your settings file:

- **macOS:** `~/.zed/settings.json`
- **Linux:** `~/.config/zed/settings.json`
- **Windows:** `%USERPROFILE%\AppData\Roaming\Zed\settings.json`

```json
{
  "context_servers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"],
      "env": {}
    }
  }
}
```

</details>

<details>
<summary><b>Antigravity</b></summary>

Add to your config file:

- **macOS:** `~/.gemini/antigravity/mcp_config.json`
- **Windows:** `%USERPROFILE%\.gemini\antigravity\mcp_config.json`

```json
{
  "mcpServers": {
    "capy": {
      "command": "npx",
      "args": ["-y", "capy-mcp@latest"]
    }
  }
}
```

> Or via UI: Agent session → … dropdown → MCP Servers → Manage MCP Servers → View raw config.

</details>

---

## Library usage

```ts
import {
  buildPreviewBrief,
  buildDesignSystemArtifact,
  runPreviewUpdate,
  detectFramework,
} from "capy-mcp";

const brief = await buildPreviewBrief(process.cwd(), { task: "build_preview" });
const designSystem = await buildDesignSystemArtifact(process.cwd());
const update = await runPreviewUpdate(process.cwd());
```

---

## Local development

```bash
cd capy-mcp
npm install
npm test
npx capy-mcp
```

---

<p align="center">
  Built by <a href="https://anants.studio">Anant Singhal</a>
</p>

<p align="center">
  <a href="https://x.com/anant_hq">Twitter</a> · <a href="https://github.com/GithubAnant">GitHub</a> · <a href="https://linkedin.com/in/anantsinghal1">LinkedIn</a>
</p>
