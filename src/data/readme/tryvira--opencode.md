![vira — Own how your AI behaves](assets/vira-hero.svg)
<p align="center"><strong>Define it. Test it. Release it. Know what ran.</strong></p>
<p align="center">Own how your AI behaves. Define what it should say, decide and do; evaluate and release those expectations; run eligible behavior through governed tasks with inspectable evidence.</p>
<p align="center">
  <a href="docs/start-here.md">Get started</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="examples/frameworks/node-next/README.md">OFF/ON chatbot</a> ·
  <a href="skills/README.md">Agent Skills</a> ·
  <a href="README.tr.md">Türkçe</a>
</p>

<table align="center">
  <tr>
    <th align="center">Official MCP Registry</th>
    <th align="center">MCP Quality · Glama</th>
    <th align="center">SDK Security · Socket</th>
    <th align="center">MCPtry · Listing</th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://registry.modelcontextprotocol.io/v0.1/servers/io.github.hrpering%2Fvira/versions/latest">
        <img src="https://img.shields.io/badge/MCP_Registry-View_Entry-087f5b?style=for-the-badge" alt="View Vira on the Official MCP Registry" height="72" />
      </a>
    </td>
    <td align="center">
      <a href="https://glama.ai/mcp/connectors/xyz.tryvira.api/vira-mcp">
        <img src="https://glama.ai/mcp/connectors/xyz.tryvira.api/vira-mcp/badges/score.svg" alt="Vira MCP quality on Glama" height="72" />
      </a>
    </td>
    <td align="center">
      <a href="https://badge.socket.dev/npm/package/@tryvira/sdk/0.1.74">
        <img src="https://badge.socket.dev/npm/package/@tryvira/sdk/0.1.74" alt="Socket security badge for @tryvira/sdk 0.1.74" height="72" />
      </a>
    </td>
    <td align="center">
      <a href="https://mcptry.com/servers/io.github.hrpering/vira">
        <img src="https://mcptry.com/badge/io.github.hrpering/vira" alt="Vira on MCPtry" height="72" />
      </a>
    </td>
  </tr>
</table>

<p align="center">
  <a href="https://mcprush.com/to/vira-own-how-your-ai-behaves-mcp?ref=badge">
    <img src="https://mcprush.com/badge/vira-own-how-your-ai-behaves-mcp/card.svg" alt="Vira on MCPRush" width="420" />
  </a>
</p>

> **Early access:** The SDKs, Agent Skills and examples are public. Live Vira operations require a provisioned account; **Studio is optional for SDK-supported operations**. [See what you can try today](docs/start-here.md).

## Operate Vira directly from your coding agent

Vira is **agent-first**. Install the single [`vira` root Skill](SKILL.md); it routes integration, MCP/SDK, Packs, Teach, evaluation, release, TaskRuns and traces without asking developers to select among 28 specialist manuals. The specialists remain optional advanced references, while actual Vira access and authority stay with the customer service.

~~~bash
npx skills add hrpering/tryvira --skill vira
~~~

The default Skill uses the connected MCP server when available, otherwise documented installed JavaScript/Python SDK methods, and never routes around an authorization denial. OpenCode users can follow the [public OpenCode adapter setup](plugins/opencode/README.md). The separately distributed plugin is not embedded in this repository.

Ask your coding agent: **“Connect my AI application, build a Behavior Pack, evaluate it and prepare it for release. Don't modify production until I approve.”** The agent discovers actual MCP tools or installed SDK methods, verifies scope, and reads real server state. [See the common operation flow](docs/agent-first-operation-flow.md). The [Studio-less capability ledger](docs/agent-skills/studio-less-parity.md) identifies workflows still waiting for public API support; a Skill cannot invent them.



## The problem

Your agent does a task. You correct an answer. The same mistake returns in another session, workflow, or model. A rule gets added to a prompt, another to application code, and a third to a test. Soon nobody can answer: **What is this AI expected to do, which version is live, and was the change evaluated?**

Vira provides a separate, governed place to define and operate those behaviors. It works **with** your existing AI application, model, and agent framework rather than replacing them.

## Make AI behavior something you can manage

A prompt can tell an assistant what to do today. Vira helps teams keep those expectations consistent as applications, models, agents and requirements change.

- **Define** reusable, task-specific expectations outside a single prompt.
- **Evaluate** proposed changes with examples and failure cases before release.
- **Release** the approved revision to the intended scope.
- **Inspect** available runtime evidence to understand which behavior was selected.
- **Improve** behavior through reviewed feedback and Teach proposals.

Vira complements the models and agents you already use. Start with [everyday and business scenarios](docs/use-cases.md), or explore the [technical execution path](docs/canonical-taskrun.md).

## See the full Vira loop

Vira is more than a Pack editor or a runtime rules switch. It connects **real AI activity → governed behavioral changes → execution-time evidence**:

![How Vira works: a conceptual lifecycle from Observe through AUTO TaskRun to runtime verification and receipts](assets/vira-lifecycle.svg)

*Vira behavior lifecycle, illustrated.*

| Capability | The practical question | Start here |
| --- | --- | --- |
| **Connect / Observe** | What do our AI agents actually say, decide, call and fail at? | [Observe](docs/observe.md) |
| **Discover / Signals** | Which tasks and typed context signals can we identify from permitted evidence? | [Semantic routing](docs/semantic-routing.md) · [Signals](docs/signals.md) |
| **Define / Packs / Strategies** | What behavior should apply, and how should it execute? | [Pack Academy](docs/pack-authoring-guide.md) · [Strategies](docs/strategies.md) |
| **Teach / Feedback / Outcomes** | How does a correction become a reviewed improvement, rather than another prompt patch? | [Teach](docs/teach.md) · [Observe](docs/observe.md) |
| **Evaluate / Release** | Has this exact revision been tested and explicitly approved? | [Evaluation](docs/evaluation-and-approval.md) · [Release](docs/release.md) |
| **AUTO TaskRun / Runtime enforcement** | Which eligible behavior and child executor actually ran? | [Canonical TaskRun](docs/canonical-taskrun.md) |
| **Runtime verification / Response Quality** | Did the actual output satisfy the configured checks, and what happens on failure? | [Runtime verification](docs/runtime-verification.md) · [Quality](docs/decision-and-quality.md) |
| **Traces / Receipts / Operations** | What was applied, skipped, denied or measured, and can the team inspect it? | [Receipts](docs/traces.md) · [Product feature map](docs/product-feature-map.md) |

Explore [Vira capabilities](docs/product-feature-map.md), including Signals, runtime behavior, evaluation, Teach, integrations and operational tooling. [Product availability](docs/product-status.md) lists current access and integration requirements.

## Examples for different kinds of AI work

Vira is not limited to one industry or to complex agents. Start simple, then move to multi-task execution:

| Complexity | Example | What you would govern |
| --- | --- | --- |
| Everyday | **A four-person dinner** | Keep a configured vegetarian, onion-free preference while producing a useful recipe |
| Team support | **A delayed package** | Ask for missing order context; never invent tracking status or promise a refund |
| Business | **A marketing performance report** | Avoid comparing incompatible attribution windows as if they matched |
| Technical | **A safe SDK upgrade** | Follow a bounded verification and rollback strategy |
| Advanced | **An operations decision brief** | Coordinate multiple independently governed tasks and approvals |

[12 scenarios with sample prompts and failure cases](docs/use-cases.md) · [copyable short/detailed fixture prompts](examples/scenarios/README.md) · [Compare Vira with Skills and agents](docs/approach-comparison.md)

### From one task to multi-step workflows

Start with a single task, or govern a process with several steps or coordinated tasks. Vira's AUTO TaskRun can select among eligible SINGLE, STRATEGY, COMPOUND and HYBRID execution paths, depending on the connected application and released behavior.

[Execution modes](docs/execution-modes.md) · [TaskRun example](examples/javascript/taskrun-modes.mjs) · [Integration compatibility](docs/integration-compatibility.md)

## Learn to author high-quality Behavior Packs

Start with [four versioned Behavior Packs](examples/packs/README.md): **recipe preferences**, **retail-media evidence review**, **marketing launch decisions** and **operations orchestration** (including a structured Strategy). They include 108 diverse design-time test scenarios, not measured model outcomes. [Compare real OFF/ON responses](docs/pack-evaluation.md). [Where each Pack field belongs](docs/pack-authoring-guide.md).

## A business example

Imagine a retail-media assistant answering:

> "Which campaign performed better? Compare these two channel reports and tell me where to move next month's budget."

The reports use different attribution windows and sales definitions. An ordinary answer might rank the ROAS figures as though they were directly comparable.

A Vira behavior for this task can explicitly require the assistant to:

1. **Check comparability:** identify attribution windows, sales scope, and metric definitions before ranking channels.
2. **Handle uncertainty:** distinguish supported findings from assumptions and request missing information rather than inventing a comparison.
3. **Preserve the workflow:** provide a useful recommendation when evidence permits, including the basis and limitations.

That definition can be packaged, evaluated with positive and negative cases, reviewed, and explicitly released. A supported runtime integration resolves eligible behavior for the request and returns evidence of what was selected.

*Illustrative scenario. Actual output quality and behavior enforcement depend on the model, deployed controls and test results.*

## What Vira adds

| Without a governed behavior layer | With Vira |
| --- | --- |
| Requirements spread across prompts, code, and notes | Named **Semantic Tasks**, **Behavior Points**, **Programs**, and **Strategies** |
| Changes that are hard to inspect or reproduce | Versioned candidates, evaluations, explicit review and release |
| Rules activated without a clear authority boundary | Scoped runtime resolution of eligible released behavior |
| Repeated mistakes with no structured improvement process | Permitted evidence → **Teach** proposals → review → evaluation |
| "It behaved differently" with little context | Returned identities, receipts, and traces for supported operations |

[Explore the capabilities](docs/product-feature-map.md) · [Understand the concepts](docs/what-is-vira.md)

## See it in action

![Public demonstration: OFF returns a provider response, while ON presents AUTO TaskRun admission/status pending verified provider output](assets/vira-on-off.svg)

*Current sample: real OFF provider response; ON shows TaskRun admission and status.*

**Try the Next.js + OpenAI Agents example.** OFF calls your configured model; ON submits an AUTO TaskRun and displays the server's admission and state. Final verified ON answers are not yet available in this example.

```bash
git clone https://github.com/hrpering/tryvira.git
cd tryvira/examples/frameworks/node-next
npm ci
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local (server-side)
npm run dev
```

Open the local app and try **Vira OFF**. To test **Vira ON** admission, configure your provisioned Vira environment and eligible released behavior. [Setup and prerequisites](examples/frameworks/node-next/README.md).

The sample is intended for local development. Add authentication, rate limits and tenant mapping before making its routes public.

[Chatbot setup](examples/frameworks/node-next/README.md) · [Framework examples](examples/frameworks/README.md) · [Marketing Agent walkthrough](tutorials/marketing-agent/README.md)

## Build with the stack you already use

![Build with Vira: 28 Agent Skills, graded Behavior Packs and developer integration paths](assets/vira-build.svg)

| Integration | Install or entry point | Guide |
| --- | --- | --- |
| JavaScript / TypeScript | `npm install @tryvira/sdk` | [SDK guide](docs/reference/javascript-sdk.md) |
| Python | `python -m pip install tryvira-sdk` | [Python guide](docs/reference/python-sdk.md) |
| MCP | `npx -y @tryvira/mcp` | [MCP setup and tool discovery](docs/reference/mcp.md) |
| OpenCode plugin | Configure `@tryvira/opencode` in OpenCode | [OpenCode host integration](plugins/opencode/README.md) |
| HTTP | Customer deployment's documented API | [HTTP integration boundaries](docs/reference/api.md) |
| Agent Skills | Task-specific guidance for coding agents | [Skills library](skills/README.md) |

Each integration has its own supported operations. Check the [compatibility guide](docs/capability-map.md) and [current availability](docs/product-status.md) before connecting to a provisioned service.

## Find your path

- **New to Vira?** [Start here](docs/start-here.md) and [understand the concepts](docs/what-is-vira.md).
- **Building an integration?** [Example verification status](docs/example-verification.md), [Developer checklist](docs/developer-checklist.md), [mode guide](docs/execution-modes.md), [Developer guide](docs/developer-guide.md), [examples](examples/README.md), and [troubleshooting](docs/troubleshooting/README.md).
- **Evaluating it for a team?** [Use cases](docs/use-cases.md), [approach comparison](docs/approach-comparison.md), [Team evaluation guide](docs/for-teams.md), [product overview](docs/product-positioning.md), and [FAQ](docs/faq.md).
- **Working with behavior changes?** [Packs](docs/packs.md), [Teach AI](docs/teach.md), [evaluation](docs/evaluation-and-approval.md), and [runtime](docs/runtime.md).
- **Contributing?** [Contribution guide](CONTRIBUTING.md), [support](SUPPORT.md), and [security reporting](SECURITY.md).

## Legal

[Terms (EN)](docs/legal/terms.en.md) · [Terms (TR)](docs/legal/terms.tr.md) · [Privacy (EN)](docs/legal/privacy.en.md) · [Privacy (TR)](docs/legal/privacy.tr.md) · [Cookies (EN)](docs/legal/cookies.en.md) · [Cookies (TR)](docs/legal/cookies.tr.md) · [AUP (EN)](docs/legal/acceptable-use.en.md) · [Complete legal directory (DPA, KVKK, billing, regional EU/US/TR addenda)](docs/legal/README.md)

## Trust, limits, and licensing

Vira is **not** a foundation model, an agent framework, or an automatic replacement for application authorization. Runtime outcomes depend on the integration boundary. Semantic matches and Teach suggestions are not permission to release or execute. Check the [authority and security model](docs/security-model.md).

This repository publicly shares documentation, examples, and Skills. Its [repository license](LICENSE) is **proprietary**; public visibility does not grant an open-source license. The separately published JavaScript, Python, and MCP client packages use **MIT licenses under their own distribution terms**. See [published packages and licensing](docs/published-packages.md).

Found an issue? Use [GitHub Issues](https://github.com/hrpering/tryvira/issues) for reproducible public-doc or package problems, and [private vulnerability reporting](SECURITY.md) for security concerns. Do not post credentials or customer information.
