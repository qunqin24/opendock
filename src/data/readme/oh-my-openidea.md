<div align="center">
  <img src="img/team.png" alt="Research Council" />
</div>

Six minds forged from the depths of human knowledge, each an eternal master of their domain,
await your question to summon ideas that push the boundaries of what is known.


Open Research Pipeline · Mix any models · From survey to paper draft


## 📦 Installation

### Quick Start

```bash
bunx oh-my-openidea@latest install
```

Non-interactive mode with API keys:

```bash
bunx oh-my-openidea@latest install --no-tui --openai=yes --anthropic=no --antigravity=yes --copilot=no --zai-plan=no --chutes=no --kimi=yes --tmux=no --skills=yes
```

Then authenticate:

```bash
opencode auth login
```

Optional Zotero library access:

```bash
uv tool install zotero-mcp-server
```

Run `ping all agents` to verify everything works.

> 💡 Configuration is stored in `~/.config/opencode/oh-my-openidea.json` (or `.jsonc` for comments support).

### For LLM Agents

Paste this into any coding agent:

```
Install and configure by following the instructions here:
https://raw.githubusercontent.com/ZeguanXiao/oh-my-openidea/refs/heads/master/README.md
```

Detailed installation guide: [docs/installation.md](docs/installation.md)

Additional guides:

- [Antigravity Setup](docs/antigravity.md) - Complete guide for Antigravity provider configuration
- [Tmux Integration](docs/tmux-integration.md) - Real-time agent monitoring with tmux

---

## 🔬 Meet the Research Council

### 01. Orchestrator: The Architect of Discovery

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/orchestrator.png" alt="Orchestrator" width="220" />
    </td>
    <td valign="top">
      <strong>The one who sees all paths.</strong> The Orchestrator is
      the lead coordinator for the whole research workflow. Give it a
      problem, and it decides which agents should work next, what
      information is still missing, and how the pieces should come
      together into a strong research direction. In practice, it runs
      the full pipeline: clarifies the problem, dispatches parallel
      literature searches to <code>@surveyor</code>, hands the corpus
      to <code>@synthesizer</code> for gap extraction, generates
      3-5 concrete hypotheses itself, sends the strongest candidates
      to <code>@critic</code> for novelty/feasibility review, then
      calls <code>@architect</code> and <code>@writer</code> to turn
      the winning idea into an executable plan and paper outline. It
      is the only agent with full delegation authority and is
      responsible for deciding when to branch in parallel and when to
      keep steps sequential.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Strategic research coordination and idea synthesis<br/>
      <strong>How it works:</strong> Multi-stage planner with explicit subagent routing, limited refinement loops, and final synthesis across all intermediate outputs<br/>
      <strong>Best Model Traits:</strong> Strong long-horizon planning, reliable tool/subagent orchestration, stable structured reasoning, and the ability to compress many intermediate results into clear decisions<br/>
      <strong>Prompt:</strong> <code>orchestrator.ts</code><br/>
    </td>
  </tr>
</table>

---

### 02. Surveyor: The Cartographer of Knowledge

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/explorer.png" alt="Surveyor" width="220" />
    </td>
    <td valign="top">
      <strong>The one who maps the unknown.</strong> The Surveyor finds
      and collects the most relevant papers for your topic. It helps
      you quickly understand what has already been done, which papers
      matter most, and where the current limits of the literature are.
      Its job is deliberately narrow and read-only: search, retrieve,
      and organize. It runs parallel queries across arXiv via AlphaXiv MCP;
      prefers recent work by
      default; separates foundational papers from recent advances; and
      always returns traceable identifiers such as arXiv IDs so later agents
      can verify claims instead of relying on vague summaries.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Literature search and paper retrieval<br/>
      <strong>How it works:</strong> Read-only retrieval agent that fans out across multiple academic sources, compares query variants, and builds a paper corpus with metadata for downstream use<br/>
      <strong>Best Model Traits:</strong> Fast tool calling, high extraction precision, low hallucination rate on bibliographic details, and good breadth-first search behavior under ambiguous queries<br/>
      <strong>Prompt:</strong> <code>surveyor.ts</code><br/>
    </td>
  </tr>
</table>

---

### 03. Synthesizer: The Weaver of Understanding

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/librarian.png" alt="Synthesizer" width="220" />
    </td>
    <td valign="top">
      <strong>The one who connects the dots.</strong> The Synthesizer
      turns a pile of papers into a clear understanding of the field.
      It groups results, highlights patterns and disagreements, and
      points out open problems that can lead to new research ideas.
      Instead of merely summarizing, it builds a research landscape:
      themes, trends, recurring limitations, and evidence-backed gaps.
      It reads key sections of papers, cross-references claims across
      the corpus, and distinguishes between gaps that are unaddressed
      because they are genuinely hard and gaps that have simply been
      overlooked. If the corpus is missing an important branch, it can
      trigger a targeted follow-up search via <code>@surveyor</code>.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Gap analysis and knowledge synthesis<br/>
      <strong>How it works:</strong> Corpus-level analyzer that reads paper sections, clusters ideas into themes, surfaces contradictions and blind spots, and outputs evidence-linked research gaps<br/>
      <strong>Best Model Traits:</strong> Long-context reading, cross-document comparison, disciplined citation use, and strong abstraction ability without drifting away from source evidence<br/>
      <strong>Prompt:</strong> <code>synthesizer.ts</code><br/>
    </td>
  </tr>
</table>

---

### 04. Critic: The Guardian of Truth

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/oracle.png" alt="Critic" width="220" />
    </td>
    <td valign="top">
      <strong>The voice of rigorous doubt.</strong> The Critic
      stress-tests your idea before you invest too much in it. It
      looks for weak assumptions, missing baselines, overlap with
      prior work, and other reasons the idea might fail novelty or
      review standards. Operationally, it behaves like an adversarial
      program committee reviewer: it searches for overlapping prior
      work, reads candidate papers to verify whether the overlap is
      superficial or real, and scores each idea on novelty,
      feasibility, significance, clarity, and overall quality. When
      needed, it can trigger targeted follow-up literature checks via
      <code>@surveyor</code>, but it does not redesign the idea
      itself; its purpose is to reject weak directions early and make
      promising ones harder to fool yourself about.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Novelty validation and adversarial review<br/>
      <strong>How it works:</strong> Evidence-first evaluator that combines prior-work search, paper-level overlap verification, and structured review scoring in a NeurIPS/ICML-style format<br/>
      <strong>Best Model Traits:</strong> Skeptical reasoning, careful distinction between related and duplicate ideas, strong comparative judgment, and consistency when turning evidence into explicit scores and verdicts<br/>
      <strong>Prompt:</strong> <code>critic.ts</code><br/>
    </td>
  </tr>
</table>

---

### 05. Architect: The Builder of Methods

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/designer.png" alt="Architect" width="220" />
    </td>
    <td valign="top">
      <strong>The one who turns vision into plan.</strong> The
      Architect converts an idea into a concrete experiment plan. It
      defines datasets, baselines, metrics, ablations, failure cases,
      and resource needs so you know exactly how to test whether the
      idea works. It takes a hypothesis that has already survived
      critique and expands it into an executable methodology: method
      overview, baseline stack, dataset choices, statistical tests,
      ablation plan, implementation notes, and realistic compute
      estimates. It is a leaf agent by design, which means it focuses
      on turning validated ideas into concrete experimental decisions
      rather than delegating further.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Methodology and experiment design<br/>
      <strong>How it works:</strong> Execution planner that translates validated ideas into benchmarkable experiments with concrete baselines, datasets, metrics, ablations, and compute budgets<br/>
      <strong>Best Model Traits:</strong> High specificity, strong methodological priors, good benchmark literacy, realistic resource estimation, and low tolerance for vague implementation advice<br/>
      <strong>Prompt:</strong> <code>architect.ts</code><br/>
    </td>
  </tr>
</table>

---

### 06. Writer: The Voice of Science

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="img/fixer.png" alt="Writer" width="220" />
    </td>
    <td valign="top">
      <strong>The one who makes it legible to the world.</strong> The
      Writer turns your research into a clear paper draft. It helps
      organize the story, sharpen the main message, and present the
      method and results in a way that is easy for readers and
      reviewers to follow. Unlike the other agents, it is intentionally
      execution-only: no external search, no tool-driven fact hunting,
      and no subagent delegation. It assumes the research content has
      already been established upstream and focuses on turning that
      content into paper structure, abstract, introduction, related
      work narrative, and section-level draft text that follows
      mainstream ML conference conventions.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>Role:</strong> Research writing and paper structure<br/>
      <strong>How it works:</strong> Context-conditioned writer that receives finalized idea and methodology, then produces publication-style outlines and drafts without inventing unsupported claims<br/>
      <strong>Best Model Traits:</strong> Strong academic writing quality, good discourse organization, precise controllability, and discipline about staying within provided evidence instead of fabricating results<br/>
      <strong>Prompt:</strong> <code>writer.ts</code><br/>
    </td>
  </tr>
</table>

---

## 📚 Documentation

- [Quick Reference](docs/quick-reference.md) - Presets, Skills, MCPs, Tools, Configuration
- [Installation Guide](docs/installation.md) - Detailed installation and troubleshooting
- [Cartography Skill](docs/cartography.md) - Custom skill for repository mapping + codemap generation
- [Antigravity Setup](docs/antigravity.md) - Complete guide for Antigravity provider configuration
- [Tmux Integration](docs/tmux-integration.md) - Real-time agent monitoring with tmux

---

## 📄 License

MIT
