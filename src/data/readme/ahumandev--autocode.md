***The workflow engine for traceable autonomous job execution***

![Autocode](docs/logo.webp)

AutoCode is an OpenCode plugin that turns rough concepts into durable designs and completed solutions.

Run jobs autonomously with **Auto mode**, or stay in control with **Assist mode**, where AutoCode does the safe hard work and separates dangerous operations into guided manual steps.

No special UI required. AutoCode runs in OpenCode and keeps concepts and durable design workspaces in version-controllable text files, making it suited to remote development or server administration.

---

## Features

### Implementation Modes

- 💡 **Advise mode** — *guidance*: agent researches topics, answers questions, and guides manual implementation.
- 🧑‍💻 **Assist mode** — *interactive*: you make decisions while agent orchestration does the work and suggests next steps.
- 🤖 **Auto mode** — *autonomous*: agent executes structured design work until completion.

### Workflow Optimizations

- 📦 **Cross-project tasking** — delegate investigation or edits to isolated OpenCode sessions in external directories.
- 🪙 **Cost-saving workflows** — improve performance and reduce token usage with smart orchestration, tiered agent models, Caveman English.
- 🔒 **Secret-safe tools** — agents never see passwords or secrets; predefined keys resolve credentials at tool runtime.
- ⚠️ **Safe hand-offs** — provide a thorough manual task tutorial when an operation is unsafe.
- 📚 **Self-learning memory** — auto capture corrections, environment quirks, permissions, and user preferences as skills for future sessions.
- 🧹 **Agent cleanup** — agents remove temporary files and stop stray processes they started after debugging.

### Build-in Tools

- 🗄️ **Read-only database inspection** — discover configured database tables and read one table at a time without write access.
- 🌐 **HTTP REST client** — simulate API calls for troubleshooting.
- 🧪 **Sandbox isolation** — agents automatically manage and experiment in their own isolated sandboxes.
- 🔐 **SSH tools** — run remote commands and manage files through environment-keyed tools.
- 🔀 **Git tools** — inspect changes and commit updates to Git repositories.

As well as [OpenCode bundled tools](https://opencode.ai/docs/tools/).

## Installation

Install AutoCode as public OpenCode plugin. AI agents use [installation guide](docs/installation.md); humans use [human guide](docs/index.md#installation-for-humans).

### Prerequisites

- [OpenCode](https://opencode.ai) is required to load and use AutoCode.
- The npm package / plugin entry is `@ahumandev/autocode`.

#### Optional

- [Bubblewrap](https://github.com/containers/bubblewrap) is required only for Linux sandbox execution.
- [Bun](https://bun.sh) is required only to build the plugin from source, run tests, or install the local shim.
- [MCP servers](docs/index.md#linux-mcp-setup) MCP servers are optional integrations.

### Installation for LLM Agents

Fetch this guide and follow its OS branch.

**Windows CMD**

```cmd
curl -s https://raw.githubusercontent.com/ahumandev/autocode/refs/heads/main/docs/installation.md
```

**Linux Bash**

```bash
curl -s https://raw.githubusercontent.com/ahumandev/autocode/refs/heads/main/docs/installation.md
```

The guide detects OS at startup: use CMD for Windows agents and Bash for Linux agents.

### Installation for Humans

Use [human installation guide](docs/index.md#installation-for-humans).

Windows route uses native CMD. Linux route uses Bash and includes optional Bubblewrap setup. Both install the public plugin with:

```text
opencode plugin -g @ahumandev/autocode@latest
```

## Usage

AutoCode is an OpenCode plugin. It does not start a web server or expose a local URL. It registers managed agents, slash commands, generated skills, and tools.

At startup, AutoCode detects OS. Agents use CMD on Windows and Bash on Linux. Windows does not register sandbox agents or tools; Linux sandbox execution uses Bubblewrap when available. Generated skills are written to `<home>/.agents/skills`.

### Primary Agents

|      | Agent      | Purpose                                 |
| ---- | ---------- | --------------------------------------- |
| 💡   | `advise`   | Research topics, answer questions, and guide manual work. |
| 📐   | `design`   | Design and propose solutions.           |
| 🤖   | `auto`     | **Autonomously** solve problems.        |
| 🧑‍💻   | `assist`   | Assist **interactively** with problems. |

### Concept, Design, and Execution Workflow

```mermaid
flowchart TD
  Concepts([.agents/concepts])
  Concepts -- 📐 design --> Design[.agents/job/.../design.md]
  
  Design -- 💡 advise --> Advise([manual execution])
  Design -- 🧑‍💻 assist --> Assist([interactive execution])
  Design -- 🤖 auto --> Auto([autonomous execution])
  
```

1. Use `/job-concepts` to save an early idea under `.agents/concepts`, then run `/job-design` to investigate and select a solution.
2. `autocode_design_write` saves the selected design at `.agents/jobs/YYYY-MM-DD_hh-mm-ss_{title}/design.md`; timestamp is UTC and workspace remains in place.
3. `autocode_design_read` reads a design by `job_name` or current session title and selects newest matching timestamped workspace.
4. Select `/job-execute` for `auto` execution or `/job-facilitate` for `assist` execution. `/job-facilitate` is an assist-mode selector, not a workspace state.

### Hybrid Workflow

Switch between `auto` and `assist` when work needs a different autonomy level; workspace path does not change.

### Session Design Fallback

`autocode_session_create` uses explicit nonblank `prompt` input directly. With blank input, it derives a slug from current title, loads newest matching timestamped `design.md`, and uses that content as prompt. If no matching design exists, it returns a retriable error that asks for a nonblank `prompt`.

### Root Session Heading

Only `advise`, `assist`, and `auto` assistant turns can update root session title. First eligible text line must be `# {emoji} {title}`. Generated parenthesized title postfix is replaced; otherwise heading appends as postfix. Title-update failure is advisory and does not interrupt work.

## Reference

- [Installation](docs/installation.md) — AI installation guide with native CMD and Bash branches.
- [Documentation](docs/index.md) — human installation, verification, update, uninstall, and troubleshooting.

## Development

Build and local shim installation use cross-platform Bun scripts. Bun is required for source builds and tests, not public plugin installation.
