***The workflow engine for traceable autonomous job execution***

![Autocode](docs/logo.webp)

AutoCode is an OpenCode plugin that turns rough conceptual ideas into completed solutions by means of structured workflow phases and optional review gates.

Run jobs autonomously with **Auto mode**, or stay in control with **Assist mode**, where AutoCode does the safe hard work and separates dangerous operations into guided manual steps.

No special UI required. AutoCode runs in OpenCode, keeps progress in version-controllable text files, and lets you track multiple jobs across their full lifecycle making it the ideal solution for remote development or server administration.

---

## Features

### Implementation Modes

- 💡 **Advise mode** — *guidance*: agent researches topics, answers questions, and guides manual implementation.
- 🧑‍💻 **Assist mode** — *interactive*: you make decisions, agent orchestration do the work, manage job lifecycle and suggest next steps.
- 🤖 **Auto mode** — *autonomous*: agent oversee full lifecycle of structured jobs until completion.

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

### Autonomous Job Workflow

```mermaid
flowchart TD
  Advise([💡 advise guidance]) --📐 design--> Drafts[.agents/jobs/drafts]
  Concepts[ .agents/jobs/concepts] --📐 design--> Drafts
  Drafts --🤖 auto --> Executing[.agents/jobs/executing]
  Executing --> Review[.agents/jobs/review]
  Review --> Shelved
  Executing -.blocked.-> Facilitate[.agents/jobs/facilitate]
  Facilitate -.unblocked.-> Executing
```

1. 💡 Use `advise` to research possibilities, answer questions, or create concept md document in `.agents/jobs/concepts`.
2. Run `/job-design` to investigate feasibility, design best approach and draft solution plan in `.agents/jobs/drafts/{job_name}/plan.md`.
3. Revise draft `plan.md` before autonomous handover.
4. Run `/job-execute` to execute `plan.md` fully autonomously.
5. The job will move automatically to `.agents/jobs/executing` while busy, `.agents/jobs/facilitate` if blocked and then to `.agents/jobs/review` when done.
6. When done, do manual testing, then:
   - *Reject* job with `/job-shelve` to shelve (clean up files) job or
   - *Accept* job with `/commit` to commit to git and shelve.

### Assisted Workflow

```mermaid
flowchart TD
  Advise([💡 advise guidance]) --📐 design--> Drafts[.agents/jobs/drafts]
  Concepts[ .agents/jobs/concepts] --📐 design--> Drafts
  Drafts --🧑‍💻 assist --> Facilitate[.agents/jobs/facilitate]
  Facilitate -.completed.-> Shelved[.agents/jobs/shelved]
```

1. 💡 Use `advise` to research possibilities, answer questions, or create concept md document in `.agents/jobs/concepts`.
2. Run `/job-design` to investigate feasibility, design best approach and draft solution plan in `.agents/jobs/drafts/{job_name}/plan.md`.
3. Run `/job-facilitate` to execute `plan.md` semi-autonomously with assistant (you make decisions, assistant do work).
4. When done, do manual testing, then:
   - *Reject* job with `/job-shelve` to shelve (clean up files) job or
   - *Accept* job with `/commit` to commit to git and shelve.

### Hybrid Workflow

Combinations of Autonomous and Assisted Workflows are also possible as you can switch any time between `auto` and `assist` agents.

For example you may start in `assist` mode and then later when you get busy, switch to `auto` mode so that agent can continue with your plan without your presence or vice versa.

## Reference

- [Installation](docs/installation.md) — AI installation guide with native CMD and Bash branches.
- [Documentation](docs/index.md) — human installation, verification, update, uninstall, and troubleshooting.

## Development

Build and local shim installation use cross-platform Bun scripts. Bun is required for source builds and tests, not public plugin installation.
