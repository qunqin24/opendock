# opencode-skill-lister

[![CI](https://github.com/ranjithrajv/opencode-skill-lister/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithrajv/opencode-skill-lister/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-skill-lister)](https://www.npmjs.com/package/opencode-skill-lister)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Lists available [Skills](https://opencode.ai/v2/docs/build/plugins) in the
OpenCode sidebar — grouped into collapsible categories, sorted alphabetically.
Skills with `autoinvoke` enabled are tagged with ⚡.

**Categories**: a skill's frontmatter `category:` field wins; otherwise the
parent directory of its `SKILL.md` (when it isn't a generic `skills/` folder);
otherwise `general`. Un-categorized skills render as a flat list when no
skill declares any category.

Appends to `sidebar.content`, alongside other sidebar widgets like the
[model recommender](https://github.com/ranjithrajv/opencode-model-recommender).

## What it shows

```
SKILLS
opencode
  Use this skill for any question about OpenCode itself
ponytail ⚡
  Forces the laziest solution that actually works
...
```

- **Name** — the skill's `name`, falling back to its `id`
- **Description** — the skill's `description` (indented beneath the name)
- **⚡ autoinvoke** — skills that auto-invoke are tagged

## Install

Published on [npm](https://www.npmjs.com/package/opencode-skill-lister).

**Automatic (recommended)** — add it to your OpenCode config (`~/.config/opencode/opencode.json`) and it installs on startup:

```jsonc
{ "plugins": ["opencode-skill-lister"] }
```

**Manual**:

```sh
npm install opencode-skill-lister
```


Restart the TUI (or `opencode2 service restart`) after changing the config.

## Prerequisites

- OpenCode **V2** (plugin API is beta)

Placement: appends to `sidebar.content`.

## Remove

Remove the plugin's entry from the `plugins` array in `opencode.json`.

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).
