[🇻🇳 Tiếng Việt](README.vi.md)

# oh-my-openkei

**Open Multi Agent Suite** · Mix any models · Auto delegate tasks

by **Kei** · base from [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim)

---

## What's This Plugin

oh-my-openkei is an agent orchestration plugin for OpenCode. It includes a built-in team of specialized agents that scout codebases, look up documentation, review architecture, handle UI work, and execute implementation tasks under one orchestrator.

Instead of forcing one model to do everything, the plugin routes each part of the job to the best-suited agent, balancing **quality, speed, and cost**.

To explore the agents, see **[Meet the Pantheon](#meet-the-pantheon)**. For the full feature set, see **[Features & Workflows](#features-and-workflows)**.

---

### Quick Start

You must download the opencode first to use this plugin.  
- https://opencode.ai/download

Published package page:

- https://www.npmjs.com/package/oh-my-openkei

Copy and paste this prompt to your LLM agent:

```
Install and configure oh-my-openkei by following:
https://www.npmjs.com/package/oh-my-openkei
```

### Install

```bash
bunx oh-my-openkei@latest install
```

### Non-Interactive Install

```bash
bunx oh-my-openkei@latest install --no-tui --skills=yes
```

### Getting Started

1. **Log in to providers**:
   ```bash
   opencode auth login
   ```
2. **Refresh available models**:
   ```bash
   opencode models --refresh
   ```
3. **Review your generated plugin config** at `~/.config/opencode/oh-my-openkei.json`
4. **Adjust models, skills, or MCP access per agent if needed**
5. **Start OpenCode**:
   ```bash
   opencode
   ```
6. **Verify the agents are responding**:
   ```text
   ping all agents
   ```

> [!TIP]
> Want to understand how automatic delegation works in practice? Review the **[Orchestrator prompt](src/agents/orchestrator.ts)** — it contains the routing rules, specialist selection logic, and delegation-first operating model for the main agent.

The default generated configuration:

```jsonc
{
  "$schema": "https://unpkg.com/oh-my-openkei@latest/oh-my-openkei.schema.json",
  "preset": "default",
  "presets": {
    "default": {
      "orchestrator": {
        "model": "openai/gpt-5.4-fast",
        "variant": "high",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "planner": {
        "model": "openai/gpt-5.5-fast",
        "variant": "xhigh",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "sprinter": {
        "model": "openai/gpt-5.3-codex",
        "variant": "low",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "business-analyst": {
        "model": "openai/gpt-5.5-fast",
        "variant": "high",
        "skills": ["business-analyst"],
        "mcps": ["*", "!context7"]
      },
      "oracle": {
        "model": "openai/gpt-5.5-fast",
        "variant": "high",
        "skills": ["simplify", "requesting-code-review"],
        "mcps": []
      },
      "debugger": {
        "model": "openai/gpt-5.3-codex",
        "variant": "high",
        "skills": [],
        "mcps": []
      },
      "council": {
        "model": "openai/gpt-5.4-fast",
        "variant": "xhigh",
        "skills": [],
        "mcps": []
      },
      "librarian": {
        "model": "minimax-coding-plan/MiniMax-M2.7",
        "skills": [],
        "mcps": ["websearch", "context7", "grep_app", "atlassian"]
      },
      "explorer": {
        "model": "minimax-coding-plan/MiniMax-M2.7",
        "skills": [],
        "mcps": ["serena"]
      },
      "designer": {
        "model": "opencode-go/kimi-k2.6",
        "skills": ["agent-browser"],
        "mcps": ["figma"]
      },
      "frontend-developer": {
        "model": "opencode-go/deepseek-v4-flash",
        "skills": ["vercel-react-best-practices", "karpathy-guidelines"],
        "mcps": []
      },
      "backend-developer": {
        "model": "opencode-go/deepseek-v4-flash",
        "skills": ["backend-developer", "karpathy-guidelines"],
        "mcps": []
      },
      "trigger-developer": {
        "model": "opencode-go/deepseek-v4-flash",
        "skills": ["trigger-setup", "trigger-tasks", "trigger-agents", "trigger-config", "trigger-realtime", "trigger-cost-savings", "karpathy-guidelines"],
        "mcps": ["trigger"]
      }
    }
  }
}
```

`frontend-developer`, `backend-developer`, and `business-analyst` treat their available skills as mandatory instructions: when skills are configured for them, they are prompted to load those skills via the `skill` tool before doing substantive work. `trigger-developer` has its own set of default skills available but is not required to load them before substantive work.

Session management is enabled by default even though it is not shown in the starter config. See **[Session Management](docs/session-management.md)** if you want to customize how many resumable child-agent sessions are remembered.

### For Alternative Providers

To use Kimi, GitHub Copilot, ZAI Coding Plan, or a different mixed-provider setup, use **[Configuration](docs/configuration.md)** for the full reference. For a cheaper mixed-provider example, see **[$30 Preset](docs/thirty-dollars-preset.md)**.

The configuration guide also covers custom subagents via `agents.<name>`, where you can define both a normal `prompt` and an `orchestratorPrompt` block for delegation.

You can also mix and match any models per agent. For model suggestions, see the **Recommended Models** listed under each agent below.

### ✅ Verify Your Setup

After installation and authentication, verify all agents are configured and responding:

```bash
opencode
```

Then run:

```
ping all agents
```

If any agent fails to respond, check your provider authentication and config file.

> [!NOTE]
> The JSON block above shows the installer-generated preset. The per-agent "Default Model" values below describe runtime-safe defaults used when no explicit model config is provided.

---

<a id="meet-the-pantheon"></a>

## 🏛️ Meet the Pantheon

### Primary Agents

**Orchestrator**, **Planner**, **Sprinter**, and **Business Analyst** are the primary agents. Choose one based on how you want to work.

- **Orchestrator** (default): Delegation-first coordinator for planning, routing, and result integration.
- **Planner**: Interview-first planner that asks clarifying questions and returns structured `<planner-plan>` output.
- **Sprinter**: Fast self-executing agent for quick Q&A and direct tasks.
- **Business Analyst**: Analysis specialist for market research, competitive analysis, requirements elicitation, and strategic planning.

#### Routing Flow

- **Orchestrator** can delegate to `debugger`, `explorer`, `librarian`, `oracle`, `designer`, `frontend-developer`, `backend-developer`, `trigger-developer`, `observer`, and `council`.
- **Planner** is planning-only and can delegate only to `explorer`, `librarian`, `oracle`, and `designer`.
- **Sprinter** is self-executing and does not delegate.
- **Business Analyst** can delegate research to `explorer`, `librarian`, and `oracle`.
- **Specialists** are leaf executors: once delegated to, they do the bounded work and hand results back.
- **Observer** is disabled by default until you explicitly enable it in config.
- **Council** is available, but intentionally expensive and kept on a stricter path than normal delegation.

#### Orchestrator

**Role:** Delegation-first coordinator  
**Prompt:** [orchestrator.ts](src/agents/orchestrator.ts)  
**Default Model:** `openai/gpt-5.4-fast` (`high`)  
**Recommended Models:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Best Choice:** `openai/gpt-5.5-fast` with variant `high` — this is the strongest single configuration for the orchestrator role, offering the best balance of reasoning speed and routing accuracy.  
**Model Guidance:** Choose your strongest coordination model. Orchestrator should excel at routing, delegation discipline, judgment, and reliable instruction-following. Orchestrator delegates ALL substantive work to specialists and only acts directly when a subagent's "Don't delegate when" rule explicitly applies, or for integration/verification tasks.

#### Planner

**Role:** Interview-first planner that asks clarifying questions and returns structured `<planner-plan>` output  
**Prompt:** [planner.ts](src/agents/planner.ts)  
**Default Model:** `openai/gpt-5.5-fast` (`xhigh`)  
**Recommended Models:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Model Guidance:** Choose your strongest all-around coding model. Planner drives planning and delegation, so it needs excellent judgment, structured thinking, and reliable instruction-following. Planner delegates all exploration and research to specialists and only acts directly for synthesis, interviewing, and plan production.

#### Sprinter

**Role:** Fast self-executing agent for quick Q&A and direct tasks  
**Prompt:** [sprinter.ts](src/agents/sprinter.ts)  
**Default Model:** `openai/gpt-5.3-codex` (`low`)  
**Recommended Models:** `openai/gpt-5.3-codex`, `github-copilot/grok-code-fast-1`, `kimi-for-coding/k2p5`  
**Model Guidance:** Choose a fast, low-latency model. Sprinter handles everything directly and does not delegate — use it when you want direct answers and quick execution rather than heavy planning or delegation.

#### Business Analyst

**Role:** Market research, competitive analysis, requirements elicitation, and strategic planning specialist  
**Prompt:** [business-analyst.ts](src/agents/business-analyst.ts)  
**Default Model:** `openai/gpt-5.5-fast` (`high`)  
**Recommended Models:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Model Guidance:** Choose a strong reasoning model for structured analysis, research synthesis, and documentation generation. Business Analyst delegates research to `@explorer`, `@librarian`, and `@oracle`, then synthesises findings into actionable plans and requirements documents.

> **Auto-save behavior:** The Business Analyst always saves its full analysis output as a `.md` file under `.business-analyst/` and returns only a concise confirmation in chat. This differs from the Planner, which only saves to file when explicitly requested.

---

### Subagents

The following agents are delegated to by the primary agents based on task type.

#### Oracle

**Role:** Strategic advisor and escalation point for high-stakes decisions, unresolved bugs, and code review  
**Prompt:** [oracle.ts](src/agents/oracle.ts)  
**Default Model:** `openai/gpt-5.5-fast` (`high`)  
**Recommended Models:** `openai/gpt-5.5` (high), `google/gemini-3.1-pro-preview` (high)  
**Model Guidance:** Choose your strongest high-reasoning model for architecture review, escalation debugging, trade-offs, and code review. First-pass bug investigation should go to `@debugger` — route to Oracle only when the bug persists after initial investigation or has architectural implications.

#### Debugger

**Role:** Bug investigation specialist — finds root causes without implementing fixes  
**Prompt:** [debugger.ts](src/agents/debugger.ts)  
**Default Model:** `openai/gpt-5.3-codex` (`high`)  
**Recommended Models:** `openai/gpt-5.4-mini`, `minimax-coding-plan/MiniMax-M2.7`  
**Model Guidance:** Choose a capable coding model for systematic debugging. Debugger is read-only and focused on investigation — it traces error paths, analyzes root causes, and reports findings for implementation agents to act on. It does NOT implement fixes.

#### Explorer

**Role:** Codebase reconnaissance  
**Prompt:** [explorer.ts](src/agents/explorer.ts)  
**Default Model:** `minimax-coding-plan/MiniMax-M2.7`  
**Recommended Models:** `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Model Guidance:** Choose a fast, low-cost model. Explorer handles broad scouting work, so speed and efficiency usually matter more than using your strongest reasoning model.

#### Librarian

**Role:** External knowledge retrieval (docs, web, Confluence, Jira)  
**Prompt:** [librarian.ts](src/agents/librarian.ts)  
**Default Model:** `minimax-coding-plan/MiniMax-M2.7`  
**Recommended Models:** `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Model Guidance:** Choose a fast, low-cost model. Librarian handles research and documentation lookups, so speed and efficiency usually matter more than using your strongest reasoning model.

#### Designer

**Role:** UI/UX direction, layout/interaction decisions, visual polish, and accessibility judgment  
**Prompt:** [designer.ts](src/agents/designer.ts)  
**Default Model:** `opencode-go/kimi-k2.6`  
**Recommended Models:** `google/gemini-3.1-pro-preview`, `kimi-for-coding/k2p5`  
**Model Guidance:** Choose a model strong at UI/UX direction, layout/interaction judgment, visual polish, and design decision-making. Designer serves as the spec/decision authority; implementation work with clear direction goes to `@frontend-developer`.

#### Frontend Developer

**Role:** Client-side implementation and frontend tests — executes what @designer decides  
**Prompt:** [frontend-developer.ts](src/agents/frontend-developer.ts)  
**Default Model:** `opencode-go/deepseek-v4-flash` (`high`)  
**Recommended Models:** `google/gemini-3.1-pro-preview`, `kimi-for-coding/k2p5`  
**Model Guidance:** Choose a model strong at client-side implementation, component architecture, and styling execution. Receives bounded frontend tasks from Orchestrator once design direction is established.

#### Trigger.dev Developer

**Role:** Trigger.dev implementation specialist — implements tasks, config, schedules, realtime progress, and integrations  
**Prompt:** [trigger-developer.ts](src/agents/trigger-developer.ts)  
**Default Model:** `opencode-go/deepseek-v4-flash` (`high`)  
**Recommended Models:** `openai/gpt-5.4-mini`, `opencode-go/deepseek-v4-flash`  
**Model Guidance:** Choose a fast, reliable coding model. Receives bounded Trigger.dev implementation tasks from Orchestrator such as task definitions, trigger configuration, schedule setup, and API integrations.

#### Backend Developer

**Role:** Backend implementation specialist  
**Prompt:** [backend-developer.ts](src/agents/backend-developer.ts)  
**Default Model:** `opencode-go/deepseek-v4-flash` (`high`)  
**Recommended Models:** `cerebras/zai-glm-4.7`, `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Model Guidance:** Choose a fast, reliable coding model for routine backend tasks. Receives bounded server-side tasks from Orchestrator such as API implementation, database work, and service logic changes.

#### Council

> [!NOTE] > **Why doesn't Orchestrator auto-call Council more often?** This is intentional. Council runs multiple models at once, so automatic delegation is kept strict because it is usually the highest-cost path in the system. In practice, Council is meant to be used manually when you want it, for example: `@council compare these two architectures`.

**Role:** Multi-LLM consensus and synthesis  
**Prompt:** [council.ts](src/agents/council.ts)  
**Guide:** [docs/council.md](docs/council.md)  
**Default Setup:** Config-driven — councillors come from `council.presets` and the Council agent model comes from your normal `council` agent config  
**Recommended Setup:** Strong Council model + diverse councillors across providers  
**Model Guidance:** Use a strong synthesis model for the Council agent and diverse models as councillors. The value of Council comes from comparing different model perspectives, not just picking the single strongest model everywhere.

#### Observer

> [!NOTE] > **Why a separate agent?** If your Orchestrator model is not multimodal, enable Observer to handle images, screenshots, PDFs, and other visual files. Observer is disabled by default and gives the Orchestrator a dedicated multimodal reader without forcing you to change your main reasoning model. Set `disabled_agents: []` and an `observer` model in your configuration.

**Role:** Read-only visual analysis — interprets images, screenshots, PDFs, and diagrams. Returns structured observations to the orchestrator without loading raw file bytes into the main context window.

- Images, screenshots, diagrams → `read` tool (native image support)
- PDFs and binary documents → `read` tool (text + structure extraction)
- **Disabled by default** — enable with `"disabled_agents": []` and configure a vision-capable model

**Prompt:** [observer.ts](src/agents/observer.ts)  
**Default Model:** `openai/gpt-5.4-mini` — configure a vision-capable model to enable  
**Model Guidance:** Choose a vision-capable model if you want the agent to read screenshots, images, PDFs, and other visual files.

---

<a id="features-and-workflows"></a>

## 📚 Documentation

Use this section as a map: start with installation, then jump to features, configuration, or example presets depending on what you need.

### 🚀 Start Here

| Doc                                            | What it covers                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| **[Installation Guide](docs/installation.md)** | Install the plugin, use CLI flags, reset config, and troubleshoot setup |
| **[Low-tech Setup Guide](docs/lowtech-setup.md)** | Step-by-step setup for non-technical users (commands + success checks) |
| **[Quick Reference](docs/quick-reference.md)** | Jump table for install, configuration, skills, MCPs, tools, and presets |

### ✨ Features & Workflows

| Doc                                                  | What it covers                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| **[Council](docs/council.md)**                       | Run multiple models in parallel and synthesize a single answer with `@council` |
| **[Session Management](docs/session-management.md)** | Reuse recent child-agent sessions with short aliases instead of starting over  |
| **[Codemap](docs/codemap.md)**                       | Generate hierarchical codemaps to understand large codebases faster            |

### ⚙️ Config & Reference

| Doc                                        | What it covers                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **[Configuration](docs/configuration.md)** | Config file locations, JSONC support, prompt overrides, and full option reference              |
| **[Skills](docs/skills.md)**               | Built-in and recommended skills such as `simplify`, `agent-browser`, and `codemap`             |
| **[MCPs](docs/mcps.md)**                   | `websearch`, `context7`, `grep_app`, `figma`, `serena`, `atlassian`, and how MCP permissions work per agent |
| **[Tools](docs/tools.md)**                 | Built-in tool capabilities like `webfetch`, LSP tools, code search, and formatters             |

### 💡 Example Presets

| Doc                                             | What it covers                                     |
| ----------------------------------------------- | -------------------------------------------------- |
| **[$30 Preset](docs/thirty-dollars-preset.md)** | A budget mixed-provider setup for around $30/month |
| **[Minimax Preset](docs/minimax-codingplan-preset.md)** | Minimax M2.7 Preset |

---

## 📄 License

MIT

---
