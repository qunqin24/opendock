# Modular Agents for OpenCode

[![npmjs.com](https://img.shields.io/npm/v/modular-agents.svg?color=blue)](https://www.npmjs.com/modular-agents) [![tests](https://github.com/gko/modular-agents/actions/workflows/test.yml/badge.svg)](https://github.com/gko/modular-agents/actions/workflows/test.yml)

> Define agents as folders with multiple maintainable prompt files.

## Features

- Agents as folders instead of single files
- Recursively includes all `.md` and `.txt` files
- Supports all agent configuration fields via YAML frontmatter
- Works alongside native single-file agents

## Installation

### From npm (Recommended)

```bash
opencode plugin modular-agents --global
```

Or add it to your `opencode.json`:

```json
{
  "plugin": ["modular-agents"]
}
```

### Local Development

Place `modular-agents.ts` and `package.json` in:

- `.opencode/plugins/` (project level)
- or `~/.config/opencode/plugins/` (global)

## Usage

Create folders inside `.opencode/agents/` (project) or `~/.config/opencode/agents/` (global).

### Folder Structure Example

```
.opencode/agents/rust-expert/
├── index.md                 # Recommended
├── rules/
│   ├── core.md
│   └── security.md
├── examples/
│   └── good-patterns.md
├── constraints.md
└── test/
    └── index.md             # Included as normal content
```

### `index.md` – Recommended, Not Strictly Required

- If `index.md` exists in the folder root, **OpenCode** parses it (frontmatter + base prompt).
- The plugin then **enriches** that prompt with all other `.md`/`.txt` files found recursively.
- If there is **no `index.md`**, the plugin will still create the agent using the folder name and all other files as the prompt. This is useful for trait-only / composable agents.

**Example without `index.md`** (trait composition):

```
.opencode/agents/code-reviewer/
├── pragmatic.txt
├── security-focused.txt
└── concise.txt
```

This creates an agent called `code-reviewer` composed purely from the trait files.

### How Files Are Merged

- OpenCode handles the `index.md` (if present).
- The plugin appends every other `.md` and `.txt` file (including `index.md` files inside subfolders).
- YAML frontmatter in additional files is stripped.
- Files are sorted alphabetically by relative path.
- Subfolder `index.md` files become regular sections (e.g. `### test/index.md`).

### Resulting Prompt

```markdown
You are a senior Rust developer...

### constraints.md
...

### rules/core.md
...

### test/index.md
...
```

This design lets you build large, maintainable agents from smaller reusable pieces.

## Limitations

- Changes require restarting the session.
- Best suited for complex or large agents.

## License

This project is open source and available under the [MIT](/LICENSE) license.
