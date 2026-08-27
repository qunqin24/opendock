# Athena

[![Required checks](https://github.com/HomericIntelligence/Athena/actions/workflows/_required.yml/badge.svg?branch=main)](https://github.com/HomericIntelligence/Athena/actions/workflows/_required.yml)
[![Release](https://github.com/HomericIntelligence/Athena/actions/workflows/release.yml/badge.svg)](https://github.com/HomericIntelligence/Athena/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/HomericIntelligence/Athena)](https://github.com/HomericIntelligence/Athena/releases)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE)

Athena supplies portable, architecture-first skills for repository review, development, and
orchestration. It gives each coding harness the same trusted, evidence-based workflow. It does not
require a host-specific runtime.

Athena is available only as a coding-harness skill and plugin package. It does not publish a Python
wheel, a source distribution, or a runtime library.

## Technical English

All Athena English technical prose must follow the
[ASD-STE100 technical-English policy](skills/TECHNICAL_ENGLISH.md). This rule is for skill sources,
the engineering principles catalog, and prose that a skill produces. Literal text does not have to
obey this rule.

The current official ASD-STE100 standard is the complete authority. Athena checks do not certify
conformance to the standard.

## Required repositories

Athena has two required repositories:

| Purpose | Default | Owner override | Checkout |
| --- | --- | --- | --- |
| Knowledge | `HomericIntelligence/Mnemosyne` | `HOMERIC_INTELLIGENCE_MNEMOSYNE_OWNER` | `$HOME/.agent_brain/knowledge` |
| Automation | `HomericIntelligence/Hephaestus` | `HOMERIC_INTELLIGENCE_HEPHAESTUS_OWNER` | `$HOME/.agent_brain/automation` |

Athena resolves a trusted, current dependency checkout under the
[`dependency-resolution` contract](docs/dependency-resolution.md). An invalid override, a trust or
authentication failure, a checkout mismatch, or an update failure is fatal. The knowledge backend
is mandatory. If `learn` has a verified, non-duplicate lesson and direct write authority, it uses an
isolated worktree and a pull request. In all other conditions, it reports without a mutation.

Script-backed skills require Git and Python 3.13 on the host. Dependency resolution and the GitHub
pull-request route also require authenticated GitHub CLI (`gh`) access. GitHub issue and repository
routes require the authenticated GitHub capability that their skill selects.

GitLab issue, merge-request, and epic routes require an authenticated GitLab capability from the
host. They must not fall back to GitHub CLI. A skill does not require a forge client when it does not
select a forge route. Athena ships scripts as plugin resources. It does not install a Python package
or a third-party runtime library.

## Install

Use the documented skill or plugin mechanism of your coding harness to install Athena. Use the
[Git-backed Athena source](https://github.com/HomericIntelligence/Athena). Prefer an immutable
commit or a supported release tag. Then, restart or reload the harness so that it can find the Athena
skills.

opencode installs Athena as the scoped npm plugin `@homericintelligence/athena-opencode`. Add this
plugin to the `plugin` array of your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@homericintelligence/athena-opencode"]
}
```

Then, quit and restart opencode. At startup, the plugin installs the canonical skill corpus in
`$XDG_CONFIG_HOME/opencode/skills/athena/`. The default path is
`~/.config/opencode/skills/athena/`. opencode finds the skills in that location. The plugin writes
only in its `athena/` namespace. See
[`npm/athena-opencode/README.md`](npm/athena-opencode/README.md) for details and removal steps.

Invoke skills through the native skill mechanism of the harness. For example, ask the harness to use
the `repo-review` skill. Use the same mechanism to update or remove the configured Git-backed source
or npm plugin.

Some workflows optionally need delegation or explicitly scoped web access. When those capabilities
are unavailable, Athena uses sequential work where supported or reports the capability gap. Install
any required third-party extensions through the harness's own package mechanism and review their
source before installing them.

Mnemosyne and Hephaestus remain Athena's repository dependencies under the contract above. They are
not copied into or represented as coding-harness packages.

## Release archives

Coding harnesses install Athena from the Git-backed skill or plugin source above. Each GitHub release
also provides a checksummed portable archive for offline distribution and provenance. The archive is
not a Python package. It does not replace an installation from source.

The archive contains only these items:

- skills that coding harnesses use;
- host metadata;
- runtime documentation;
- assets; and
- notices.

The archive excludes these items:

- tests;
- repository scripts;
- development lockfiles;
- task-runner files;
- continuous integration configuration; and
- generated development output.

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
[Full environment setup lives in CONTRIBUTING.md](CONTRIBUTING.md#environment-setup).

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
