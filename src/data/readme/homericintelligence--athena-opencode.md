# Athena

[![Required checks](https://github.com/HomericIntelligence/Athena/actions/workflows/_required.yml/badge.svg?branch=main)](https://github.com/HomericIntelligence/Athena/actions/workflows/_required.yml)
[![Release](https://github.com/HomericIntelligence/Athena/actions/workflows/release.yml/badge.svg)](https://github.com/HomericIntelligence/Athena/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/HomericIntelligence/Athena)](https://github.com/HomericIntelligence/Athena/releases)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE)

Portable, architecture-first repository-review, development, and orchestration skills for coding
harnesses. They give every harness the same trusted, evidence-based workflow without requiring a
host-specific runtime.

Athena is distributed only as a coding-harness skill and plugin package. It does not publish a
Python wheel, source distribution, or runtime library.

## Required repositories

Athena has two hard dependencies:

| Purpose | Default | Owner override | Checkout |
| --- | --- | --- | --- |
| Knowledge | `HomericIntelligence/Mnemosyne` | `HOMERIC_INTELLIGENCE_MNEMOSYNE_OWNER` | `$HOME/.agent_brain/knowledge` |
| Automation | `HomericIntelligence/Hephaestus` | `HOMERIC_INTELLIGENCE_HEPHAESTUS_OWNER` | `$HOME/.agent_brain/automation` |

Athena resolves a trusted, current dependency checkout under the
[`dependency-resolution` contract](docs/dependency-resolution.md); invalid overrides, trust or
authentication failures, checkout mismatches, and update failures are fatal. The knowledge backend
is mandatory. For a verified, non-duplicate lesson with direct write authority, `learn` uses an
isolated worktree and pull request; otherwise it reports without mutation.

Script-backed skills require Git and Python 3.13 on the host. Dependency resolution and the
GitHub pull-request helper route additionally require authenticated GitHub CLI (`gh`) access. GitHub
issue and repository routes require the authenticated GitHub capability selected by their own skill.
GitLab issue, merge-request, and epic routes instead require an authenticated GitLab capability
supplied by the host; they must not fall back to GitHub CLI. Skills that do not select a forge route
do not require a forge client. Athena ships scripts as plugin resources; it does not install a Python
package or third-party runtime library.

## Install

Install Athena through your coding harness's documented skill or plugin mechanism using the
[Git-backed Athena source](https://github.com/HomericIntelligence/Athena). Prefer an immutable
commit or supported release tag, then restart or reload the harness so its skill catalog recognizes
Athena.

opencode installs Athena as the scoped npm plugin `@homericintelligence/athena-opencode`. Add it to the `plugin` array of your
`opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@homericintelligence/athena-opencode"]
}
```

Then quit and restart opencode. On startup, the plugin installs the canonical skill corpus under
`$XDG_CONFIG_HOME/opencode/skills/athena/` (`~/.config/opencode/skills/athena/` by default), where
opencode discovers it natively. The plugin only writes inside that `athena/` namespace; see
[`npm/athena-opencode/README.md`](npm/athena-opencode/README.md) for details and uninstall steps.

Invoke skills through the harness's native skill-invocation mechanism; for example, ask the harness
to use the `repo-review` skill. Update or remove Athena by managing the configured Git-backed source
or npm plugin through that same mechanism.

Some workflows optionally need delegation or explicitly scoped web access. When those capabilities
are unavailable, Athena uses sequential work where supported or reports the capability gap. Install
any required third-party extensions through the harness's own package mechanism and review their
source before installing them.

Mnemosyne and Hephaestus remain Athena's repository dependencies under the contract above. They are
not copied into or represented as coding-harness packages.

## Release archives

Coding harnesses install Athena from the Git-backed skill or plugin source above. Each GitHub release
also provides a checksummed portable archive for offline distribution and provenance; it is not a
Python package and does not replace source-based installation. The archive contains only
harness-consumed skills, host metadata, runtime documentation, assets, and notices. It excludes tests,
repository scripts, development lockfiles, task-runner files, CI configuration, and generated
development output.

## Skills

- Architecture-first review: `change-review`, `repo-review`, and `pr-review`.
- Issue planning, review, and finalization: `plan-issue`, `issue-review`, and `finalize-plan`.
- Engineering: `brainstorm`, `systematic-debugging`, and `test-driven-development`.
- Coordination: `myrmidon-swarm`, `git-worktrees`, and `tidy`.
- Knowledge and enablement: `advise` and `learn`.

All harnesses consume the same top-level [`skills/`](skills/) directory. Missing delegation runs
sequentially with the current agent.

## Develop

Prerequisites are Git, uv, Just, and Python 3.13 for repository validation only.

```bash
git clone https://github.com/HomericIntelligence/Athena
cd Athena
just bootstrap
just all
```

`just all` validates skills and manifests, runs executable unit tests, enforces at least 80% branch
coverage for every repository and skill-local executable script, runs Ruff and strict mypy over the
same tooling, lints public documentation and workflows, and builds a deterministic plugin archive
with a SHA-256 checksum. It never builds Python distribution artifacts.

## Layout

```text
skills/                  canonical skills and their tested local helpers
scripts/                 typed validation, CI-policy, and archive tooling
tests/unit/              executable-script behavior tests
docs/                    local policies and dependency contracts
.github/                 ownership and required/release workflows
```

## License

BSD-3-Clause. See [`LICENSE`](LICENSE), [`NOTICE`](NOTICE), and
[`skills/THIRD_PARTY_LICENSES.md`](skills/THIRD_PARTY_LICENSES.md).
