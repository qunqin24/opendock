# figma-opencode

[![npm version](https://img.shields.io/npm/v/figma-opencode)](https://www.npmjs.com/package/figma-opencode)
[![license](https://img.shields.io/npm/l/figma-opencode)](LICENSE)
![OpenCode 2.x](https://img.shields.io/badge/OpenCode-2.x-black)

Figma for OpenCode in one plugin — the OpenCode equivalent of installing the official Claude `figma` plugin.

One package does two things when OpenCode loads it:

1. **Registers the Figma MCP server** — `https://mcp.figma.com/mcp` (remote, OAuth), no config editing.
2. **Registers all 16 official Figma agent skills** — bundled from Figma's own [mcp-server-guide](https://github.com/figma/mcp-server-guide) repo and served straight from the installed package.

Zero runtime dependencies. `@opencode/plugin` is provided by the OpenCode host; this package is a plain ESM module.

> Full build log — how the v2 plugin API was reverse-engineered, how the package was tested, and every gotcha hit along the way: **[BUILD.md](BUILD.md)**.

## Install

```sh
opencode plugin add figma-opencode
```

or add it to `opencode.json(c)` (global config: `~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["figma-opencode"]
}
```

Restart OpenCode if it was already running.

## One manual step: sign in

OAuth can't be automated. Once per machine:

```
/mcps  →  figma  →  Sign in
```

A browser window opens; approve access to your Figma account. After that the `figma` MCP tools work in every session. If you already signed in to a `figma` MCP entry before, the plugin reuses those credentials (same name, same URL).

## Options

| Option | Default | Description |
| --- | --- | --- |
| `mcp` | `true` | Register the Figma MCP server |
| `mcpName` | `"figma"` | Name of the MCP entry |
| `url` | `"https://mcp.figma.com/mcp"` | Override the MCP endpoint |
| `skills` | `true` | Register the bundled Figma skills |

```jsonc
{
  "plugins": [
    {
      "package": "figma-opencode",
      "options": {
        // "mcp": true,
        // "mcpName": "figma",
        // "url": "https://mcp.figma.com/mcp",
        // "skills": true
      }
    }
  ]
}
```

Example — use the **Figma desktop app** local server (Dev Mode MCP) instead of the remote one:

```jsonc
{
  "plugins": [
    {
      "package": "figma-opencode",
      "options": { "url": "http://127.0.0.1:3845/mcp" }
    }
  ]
}
```

## What gets registered

**MCP:** `figma` → `https://mcp.figma.com/mcp`

**Skills:** all 16 Figma skills, with their `references/` files:

| Skill | Purpose |
| --- | --- |
| `figma-use` | Execute Figma Plugin API code in a file — mandatory before any `use_figma` write call |
| `figma-create-new-file` | Create new Figma Design, FigJam, or Slides files |
| `figma-generate-design` | Build full pages, screens, and composed UI in Figma from code or intent |
| `figma-design-to-code` | Implement Figma designs as code — mandatory before `get_design_context` |
| `figma-code-connect` | Create and maintain Figma Code Connect mappings |
| `figma-generate-library` | Build or extend design systems, variables, and component libraries in Figma |
| `figma-generate-diagram` | Create FigJam diagrams (flowcharts, architecture, sequence, ERD, …) |
| `figma-use-figjam` | FigJam-specific `use_figma` flows |
| `figma-use-motion` | Animate Figma nodes (keyframes, easing, animation styles) |
| `figma-implement-motion` | Implement Figma motion in production code |
| `figma-code-workflows` | Import HTML/project files into Figma; Design frames, Code Layers, Make |
| `figma-swiftui` | SwiftUI ↔ Figma translation in both directions |
| `figma-shaders` | Author shader effects and fills |
| `figma-spec` | Create, read, edit, review, or comment on Figma specs |
| `figma-generative-plugins` | Author generative Figma plugins |
| `figma-use-slides` | Figma Slides-specific `use_figma` flows |

## How it works

`setup(ctx)` runs when the plugin loads and performs two transforms:

```js
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "figma-opencode",
  async setup(ctx) {
    await ctx.mcp.transform((editor) => {
      editor.set("figma", { type: "remote", url: "https://mcp.figma.com/mcp" })
    })

    await ctx.skill.transform((editor) => {
      for (const skill of loadSkills()) editor.add(skill)
    })
  },
})
```

Skills are read from the bundled `skills/` directory at load time: `id`/`name` come from the directory and frontmatter, `description` from YAML frontmatter, `autoinvoke` from `disable-model-invocation`, and `path` points at the bundled `SKILL.md` so relative `references/…` links keep working.

## Verified

Tested end-to-end against OpenCode 2.0.32 on Windows:

- `opencode plugin add figma-opencode` installs from npm and loads from the package cache
- MCP entry registered programmatically and connects (OAuth state inherited)
- skills registered from the bundled `skills/` dir (verified with a probe skill visible to the model)
- package has zero runtime dependencies and loads with no local `node_modules`

## Notes

- **Duplicate skill ids:** if you previously copied `figma-*` skills to `~/.config/opencode/skills/`, the on-disk copies take precedence over the plugin's. Delete the old copies to switch fully to the package.
- **Releases:** `.github/workflows/publish.yml` publishes to npm when a GitHub Release is published. It needs the repository secret `NPM_TOKEN` (npm granular access token with *Read and write* + *bypass 2FA* enabled).
- **Version pinning:** `plugins: ["figma-opencode@0.1.1"]` pins an exact version; `opencode plugin update` handles the rest.

## Uninstall

```sh
opencode plugin remove figma-opencode
```

## License

Plugin code: MIT (see `LICENSE`).

The bundled skills under `skills/` are copied verbatim from [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) by Figma, Inc. That repository currently ships without a license file; the skills are redistributed here for convenience, with credit. If Figma objects, the skills can be dropped from the package without affecting MCP registration.
