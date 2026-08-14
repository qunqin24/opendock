# Cocrates Harness - How to Use AI the Right Way

Cocrates = Co-Socrates

* You become Socrates, questioning what AI misses, what it does not know, and what it tries to skip too quickly.
* AI also becomes Socrates, turning vague requests into structure and producing outputs against criteria you designed together.

## OpenCode Plugin

Cocrates is an agent harness implemented as an [OpenCode](https://opencode.ai) plugin. It combines a core **Cocrates Agent** with pluggable **Skills** — each skill encodes a specialized workflow for a specific kind of deliverable or activity.

> *The unexamined code is not worth generating.*

Here, `code` means any final artifact you ask AI to produce: software, documents, presentations, analysis reports, study notes, design documents, images, and other finished work.

### Architecture

Cocrates separates shared principles from task-specific procedures:

| Layer | Location | Role |
|-------|----------|------|
| **Cocrates Agent** | [`cocrates.md`](static/cocrates.md) | Persona, principles, intent recognition, skill selection, task management, and guardrails |
| **Skills** | `skills/*/SKILL.md` | Independent, task-specific workflows — loaded and followed when the agent infers the right intent |

Two core activity pipelines are defined in the agent:

- **Generation** — ADR → Spec → generation → verification
- **Learning** — education → knowledge capture → reflection

### Install

Ask your AI assistant in OpenCode to install the harness:

```
Install Cocrates Harness following https://cocrates.ai/install.md
```

Full installation guide: [cocrates.ai/docs/installation](https://cocrates.ai/docs/installation)

### Skills

The `skills/` directory ships with the following built-in skills. The Cocrates Agent selects a skill based on inferred user intent — not on specific trigger words.

| Skill | Purpose |
|-------|---------|
| **education** | Socratic 1:1 learning coach — turn-based missions that guide retrieval and metacognition toward active creation (Bloom's Create level) |
| **knowledge-capture** | Persist what the user actually understood and confirmed into the knowledge base (`kb/`) |
| **reflection** | Socratic understanding review — surfaces what the user knows well, misunderstands, or is missing |
| **adr-writing** | Create Any Decision Records — compare alternatives and tradeoffs for a specific concern before committing |
| **spec-writing** | Consolidate requests, decisions, and constraints into a living Spec document for one deliverable |
| **spec-driven-generation** | Produce artifacts (software, documents, images, presentations, etc.) strictly from Spec documents |
| **spec-driven-verification** | Verify generated artifacts against Spec documents item by item |
| **generating-skill-creation** | Author a new artifact-generation skill with Snowflake stages and approval gates |
| **document-authoring** | Write general Markdown documents via Snowflake progressive elaboration |
| **blog-series-authoring** | Plan and write a progressive blog series (overview → outline → episodes) |

### Examples

| Path | Description |
|------|-------------|
| [`examples/blog/`](https://github.com/cocrates/cocrates.ai/tree/main/examples/blog) | A multi-episode blog series introducing Cocrates Harness, written with `blog-series-authoring` |
| [`examples/jsondb/`](https://github.com/cocrates/cocrates.ai/tree/main/examples/jsondb) | A JSON database (Go) built end-to-end with `spec-driven-generation` — includes specs, ADRs, and verification |
| [`examples/kb/`](https://github.com/cocrates/cocrates.ai/tree/main/examples/kb) | Knowledge base entries captured from Socratic learning sessions (e.g. Bloom's Taxonomy) |

## cocrates.ai

Documentation site built with Docusaurus and deployed to GitHub Pages.

- **Site URL**: https://cocrates.ai/

### Local Development

```bash
npm install
npm start
```

Open http://localhost:3000/ in your browser.

### Build

```bash
npm run build
npm run serve
```

### Deployment

Pushing to the `main` branch triggers GitHub Actions to deploy automatically to GitHub Pages.
