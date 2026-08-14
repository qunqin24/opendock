# oh-my-groundcontrol: Open Multi-Agent Suite

## Abstract
`oh-my-groundcontrol` is an advanced multi-agent orchestration plugin for OpenCode, engineered to distribute complex software development tasks across specialized language models. Operating under strict procedural constraints inspired by NASA technical standards, this suite minimizes architectural drift, enforces validation protocols, and optimizes for quality, speed, and computational efficiency. 

By categorizing AI agents into distinct operational domains (e.g., planning, risk analysis, codebase reconnaissance, and implementation), the system ensures high-reliability outputs suitable for mission-critical software engineering environments.

## Core Architecture

The architecture delegates responsibilities to nine domain-specific subagents, segmented into two primary functional groups: **Planning & Verification** and **Execution & Integration**.

### Planning & Verification Systems
- **Groundcontrol (Lead Systems Engineer)**: Conducts requirements gathering and strategic planning. Generates decision-complete work schematics. (Prompt: `groundcontrol/index.ts`)
- **PreFlight (Risk Analyst)**: Performs pre-planning anomaly detection. Identifies logical ambiguities and failure points prior to execution. (Prompt: `pre-flight.ts`)
- **Verification (Launch Committer)**: Serves as the ultimate quality assurance gatekeeper. Verifies execution plans against constraints before authorization. (Prompt: `verification.ts`)

### Execution & Integration Systems
- **Orchestrator (Flight Director)**: The central command node. Routes tasks dynamically to specialized subagents. (Prompt: `orchestrator.ts`)
- **Explorer (Telemetry Scout)**: Dedicated to parallel codebase search, utilizing AST, grep, and glob protocols. (Prompt: `explorer.ts`)
- **Oracle (Principal Architect)**: Strategic advisor for complex debugging, long-term trade-offs, and deep system refactoring. (Prompt: `oracle.ts`)
- **Librarian (Data Archivist)**: Retrieves and synthesizes external API references and official documentation. (Prompt: `librarian.ts`)
- **Designer (Interface Specialist)**: Focuses exclusively on UI/UX aesthetics, visual consistency, and interaction design. (Prompt: `designer.ts`)
- **Fixer (Systems Integrator)**: Parallel execution engine for rapid code implementation based on precise specifications. (Prompt: `fixer.ts`)

## Operational Guidelines

### Standard Installation

Execute the following command to install the plugin suite:

```bash
bunx @frenchtoastman/oh-my-groundcontrol@latest install
```

### Advanced Configuration (Free Models & Hybrid Modes)

The installer can refresh and automatically assign OpenCode free models directly, or run in a hybrid configuration combining OpenCode free models with external providers (OpenAI, Kimi, Antigravity, Chutes).

```bash
bunx @frenchtoastman/oh-my-groundcontrol@latest install --no-tui --kimi=yes --openai=yes --antigravity=yes --chutes=yes --opencode-free=yes --opencode-free-model=auto --tmux=no --skills=yes
```

Following installation, authenticate your OpenCode session:

```bash
opencode auth login
```

Verify agent connectivity by running `ping all agents` within the OpenCode terminal.

> **Note on Model Customization:** The active model matrix is fully configurable. Edit `~/.config/opencode/oh-my-groundcontrol.json` (or `.jsonc`) to override agent-to-model assignments manually.

### Langfuse Observability (Optional)

Langfuse tracing is available as an optional, toggleable feature for observability and debugging. When enabled, it injects metadata into LLM requests including:

- **Agent tags** (e.g., `agent:explorer`, `task:research`)
- **Session ID** for request correlation
- **Trace user ID** (configurable, defaults to `opencode`)
- **Model and provider information**
- **Plugin version** for tracking

To enable Langfuse tracing, add the following to your configuration:

```json
{
  "langfuse_tracing": {
    "enabled": true,
    "traceUserId": "opencode",
    "customMetadata": {}
  }
}
```

The feature is **disabled by default** and must be explicitly enabled in `~/.config/opencode/oh-my-groundcontrol.json`.

### For AI Agents / LLMs

To instruct an external coding agent to utilize this suite, paste this block into the agent's prompt:

```
Install and configure by following the instructions here:
https://raw.githubusercontent.com/frenchtoasters/oh-my-groundcontrol/refs/heads/master/README.md
```

*Operational Note:* It is highly recommended to add `.groundcontrol/` to your project's `.gitignore` file to exclude generated flight plans from version control systems.

## Verification & Validation (V&V) Procedures

Our execution pipelines are strictly governed by protocols modeled on the NASA Technical Standards System to ensure maximal software assurance.

1. **Destructive Pause (NASA-STD-8739.8B):** Agents must halt and request explicit user authorization before executing irreversible actions, such as force-pushing to remote repositories or bulk file deletions.
2. **Pre-Flight Verification (NASA-HDBK-8739.19-3):** Agents are required to execute continuous integration checks (`bun run check:ci`, `bun run typecheck`) to validate syntactic and structural integrity prior to mission conclusion.
3. **Atomic Checkpoints (NASA-HDBK-8739.18):** Stable codebase states must be committed prior to the initiation of widespread architectural refactors.
4. **Escalation Protocol (NASA-STD-7009B):** In the event an automated verification process fails three or more consecutive times, agents must abort automated remediation attempts and escalate to the human operator for guidance.

### Source Standards Documentation
The principles governing our agent behaviors are extracted directly from the [NASA Technical Standards System](https://standards.nasa.gov):

- [NASA-STD-7009B](https://standards.nasa.gov/standard/nasa/nasa-std-7009): Standard for Models and Simulations
- [NASA-STD-8739.8B](https://standards.nasa.gov/standard/nasa/nasa-std-87398): Software Assurance and Software Safety Standard
- [NASA-STD-5017B](https://standards.nasa.gov/standard/nasa/nasa-std-5017): Design and Development Requirements for Mechanisms
- [NASA-HDBK-8739.18](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873918): Software Engineering Handbook
- [NASA-HDBK-8739.19-2](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873919-2): Software Assurance Handbook
- [NASA-HDBK-8739.19-3](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873919-3): Software Measurement Handbook
- [NASA-HDBK-8709.22](https://standards.nasa.gov/standard/nasa/nasa-hdbk-870922): Safety and Mission Assurance Acronyms, Abbreviations, and Definitions
- [NASA-HDBK-8709.24](https://standards.nasa.gov/standard/nasa/nasa-hdbk-870924): Planetary Protection Handbook
- [NASA-HDBK-1004](https://standards.nasa.gov/standard/nasa/nasa-hdbk-1004): Data Requirements Descriptions (DRDs) for Software
- [NASA-HDBK-1009A](https://standards.nasa.gov/standard/nasa/nasa-hdbk-1009): Software Error Causes

## Reference Documentation

- [Quick Reference](docs/quick-reference.md): Presets, Skills, MCPs, Tools, Configuration
- [Installation Guide](docs/installation.md): Detailed installation and troubleshooting
- [Cartography Skill](docs/cartography.md): Custom skill for repository mapping + codemap generation
- [Antigravity Setup](docs/antigravity.md): Complete guide for Antigravity provider configuration
- [Tmux Integration](docs/tmux-integration.md): Real-time agent monitoring with tmux

## License

MIT
