<p align="center">
  <img src="assets/hero.jpg" width="820" alt="Vitruvius — engineering research that shows its work">
</p>

<h1 align="center">Vitruvius</h1>

<p align="center"><strong>Engineering research that shows its work.</strong></p>

<p align="center">
  An open-source toolkit for coding agents that turns engineering questions into
  evidence-backed briefs: sources opened, artifacts anchored, claims checked,
  and uncertainty recorded.
</p>

<p align="center">
  <a href="https://adeerkhan.github.io/vitruvius/"><strong>Website</strong></a>
  ·
  <a href="ABOUT.md"><strong>About</strong></a>
  ·
  <a href="COMMANDS.md"><strong>Commands</strong></a>
  ·
  <a href="docs/EVIDENCE.md"><strong>Evidence</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/commands-27-green" alt="27 commands">
  <a href="https://github.com/adeerkhan/vitruvius/actions/workflows/ci.yml"><img src="https://github.com/adeerkhan/vitruvius/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/adeerkhan/vitruvius/actions/workflows/security-scan.yml"><img src="https://github.com/adeerkhan/vitruvius/actions/workflows/security-scan.yml/badge.svg" alt="Security Scan"></a>
</p>

---

## Start with a decision

Ask a question that needs evidence:

```text
/engineering-research "Does this beam connection satisfy the governing shear check?"
```

Vitruvius opens the governing sources and your project artifacts, drafts a
decision-first brief, runs an independent verification pass, and writes:

- `outputs/<slug>.md` — the brief, with findings and next actions;
- `outputs/<slug>.provenance.md` — what was checked and what remains uncertain;
- `outputs/<slug>-problem-anchor.json` — the hash-pinned link between claims,
  artifacts, decisions, and negative coverage.

If the evidence does not settle the question, the output says so.

## Why it is different

A general research assistant returns a plausible summary. Vitruvius returns a
trail you can check.

- **Read the source, not the snippet.** A claim is capped by how much of its
  source was actually read.
- **Ground repository claims in real bytes.** A `repo` finding resolves to a
  hash-pinned `path:line`; an absence claim cannot hide behind an unrelated line.
- **Verify independently.** The writer does not grade its own work; a blind
  verifier checks the conclusion against the gathered evidence.
- **Keep uncertainty visible.** `verified`, `partial`, `blocked`, `unverified`,
  and `inferred` mean different things.
- **End with a decision.** Every finding names what to change, what to measure,
  what to defer, or why it is background.

## The research loop

```text
Plan → Gather → Synthesize → Verify → Review → Goal-check → Deliver
```

1. **Plan** the question, artifacts, decisions, and evidence needed.
2. **Gather** sources and record exact read depth and contradictory evidence.
3. **Synthesize** a decision-first brief with inline citations and one lead
   finding.
4. **Verify** claims through a blind, fail-closed verifier.
5. **Review** the verified artifact adversarially and re-check every original ask.
6. **Deliver** the brief, provenance, and problem-anchor record.

The craft pass runs before delivery. It removes template prose and tests whether
the report could have been written about any system, without changing claims.

## Install

Any Agent Skills host:

```bash
npx skills add adeerkhan/vitruvius
```

OpenCode:

```bash
npx @adeerkhan/vitruvius --target . --host opencode
```

Restart the host, then run `/vitruvius-help`. Claude Code, Codex, Cursor, Pi,
Command Code, and global installs are covered in the
[installation guide](docs/INSTALL.md).

## Choose a starting point

| You need to... | Start with |
| --- | --- |
| Research an engineering question | `/engineering-research` or a discipline skill |
| Check a claim or calculation | `/verifier` |
| Look up a governing provision | `/standards-lookup` |
| Compare design alternatives | `/design-alternatives` |
| Audit a document against implementation | `/audit` |
| Review academic literature | `/scholarly-research` |
| Read a PDF, drawing, or specification | `/artifact-reading` |
| See every command | [COMMANDS.md](COMMANDS.md) or `/vitruvius-help` |

## Evidence and measurement

Vitruvius publishes its checks and its weaknesses. Current checked-in results:

| Check | Result |
| --- | --- |
| Verifier adversarial — single-run corpus | 16/20 = 80% correct verdicts, 0 false approvals, 0 false blocks, 1 conservative overcall |
| Verifier adversarial — majority-of-3 certification | 18/20 = 90% correct verdicts, 0 false approvals, 0 false blocks, 2 conservative overcalls |
| PASS scoring controls | 5/5 deterministic parser/scorer fixtures; not independent verifier runs |
| Integrity under persuasion | 4/5 held with one false approval; no false-block guarantee is claimed |
| Skill routing | 28/28 baseline rank-1; 4/4 E1 top-k; 4/4 owner-negative; 10/10 must-not-fire |
| Baseline comparison | Isolated runner and scorer tested; the 13 cases remain unmeasured |

These are measurements, not certification. The underlying artifacts, limits,
and reproduction commands live in [docs/EVIDENCE.md](docs/EVIDENCE.md).

## Boundaries

Vitruvius is research-only. It is not final engineering sign-off, a code
compliance certificate, a CAD/BIM/simulation engine, or a substitute for reading
the governing standard and inspecting the physical system. It does not promise
that a model will always be right. It makes missing evidence and unresolved
questions visible early enough to act on them honestly.

## Documentation

| Document | What it covers |
| --- | --- |
| [ABOUT.md](ABOUT.md) | Mission, principles, audience, and boundaries |
| [COMMANDS.md](COMMANDS.md) | All 27 commands and example usage |
| [docs/EVIDENCE.md](docs/EVIDENCE.md) | Read depth, grounding, verification, measurements, and limits |
| [docs/INSTALL.md](docs/INSTALL.md) | Host setup, permissions, verification, and uninstall |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Skills, roles, artifacts, validators, and host adapters |
| [notes/examples.md](notes/examples.md) | Worked runs, including an honest BLOCKED result |
| [agents/README.md](agents/README.md) | Canonical research-role definitions |
| [AGENTS.md](AGENTS.md) | Repository contract and integrity rules |
| [installer/README.md](installer/README.md) | Host packages and installer internals |
| [SECURITY.md](SECURITY.md) | Security rules and vulnerability reporting |

## License

[MIT](LICENSE) · Copyright (c) 2026 [Adeer Khan](https://github.com/adeerkhan)
