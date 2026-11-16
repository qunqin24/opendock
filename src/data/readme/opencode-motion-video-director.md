# opencode-motion-video-director

An [OpenCode](https://opencode.ai) plugin that ships the **Motion Video Director** skill: plan, direct, and produce code-drawn 2D/3D motion graphics and edited videos — reels, hooks, SaaS/product explainers, talking-head edits — locally, with your agent as director, producer, motion designer, editor and sound designer in one.

Everything is drawn in code (Canvas/SVG/p5.brush/Three.js/GSAP in headless Chrome, Motion Canvas/Revideo), encoded with ffmpeg, and checked with a fast contact-sheet preview loop. Stock, fonts, SFX and references come from LottieFiles, Freesound, Pexels/Pixabay, Scrapling, ElevenLabs, and visual browsing with the Playwright MCP.

No ElevenLabs key? Voiceover still happens: write the script, then generate it locally with the bundled `make_vo.py` — Kokoro-82M → edge-tts → macOS `say`, all free, no API key.

## Install

Add the plugin to your `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-motion-video-director"]
}
```

That registers the `motion-video-director` skill. Ask for a video and your agent will pick it up, or load it explicitly with `@motion-video-director`.

> If you previously installed the skill manually under `~/.config/opencode/skills/motion-video-director/` (or `.claude/skills`, `.agents/skills`, or a project `.opencode/skills`), remove that copy: a manually installed copy **shadows** the plugin's registration because discovery sources register after plugin skills. Both copies have the same content, so nothing breaks, but the plugin's version will not be used until the manual copy is gone.

### Options (optional MCP auto-setup)

The workflow is smoother with the Playwright, Scrapling and ElevenLabs MCP servers. Let the plugin register them at runtime (no `mcp.servers` config needed):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-motion-video-director",
      "options": { "mcps": ["playwright", "scrapling", "elevenlabs"] }
    }
  ]
}
```

| Name | Needs key | Key (in project `.env` or environment) |
| --- | --- | --- |
| `playwright` | no | — (visual browser, downloads land in `./cache/browser`) |
| `scrapling` | no | — (needs a local `pip install "scrapling[ai]" && scrapling install`) |
| `elevenlabs` | yes | `ELEVENLABS_API_KEY` |
| `lottiefiles` | no | — |

- A server is only registered when its key (if any) is already set in the **project `.env`** or OpenCode's process environment — otherwise it is skipped with a log line. Create the project `.env` during `/mvd-setup` (or with the skill's `scripts/create_env.sh`) and add `"mcps": true` to register every server whose key is present.
- Keys never land in config: each server runs through the bundled `scripts/with-env.sh` wrapper, which loads the project `.env` at spawn time.
- A server you configured yourself in `mcp.servers` is never touched.
- `bash` is required for the wrapper (macOS/Linux/WSL all have it).

## The `/mvd-setup` command

In your video project directory, run `/mvd-setup`. It loads the skill and starts Preflight:

1. checks Node, Python, ffmpeg, Playwright, libraries, local models and MCPs, and shows a status table,
2. walks you through every missing item (install / skip / alternative),
3. creates your `.env` key file (gitignored) — you paste keys, the agent only ever sees *which* keys are set, never the values,
4. sends you the kickoff message: what to give it (references, story, format, length, brand) and what to connect.

Then the normal director workflow takes over: voiceover script for ElevenLabs → you generate the MP3 → storyboard and style frames → scenes with contact-sheet previews → final render, loudness-normalised, with a credits/licence list.

## Install via skills catalog (no plugin)

Prefer not to use plugins? The same skill is also published as an [HTTP skills catalog](https://opencode.ai/docs/skills#catalogs):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": ["https://viksaaskool.github.io/opencode-motion-video-director/"]
}
```

(Catalog installs get the skill only — no `/mvd-setup` command and no MCP auto-setup.)

The site's root is a human-readable landing page (install snippets, MCP table, file links); the machine-readable catalog OpenCode fetches is at [`index.json`](https://viksaaskool.github.io/opencode-motion-video-director/index.json).

## What the skill covers

- **Preflight & project tracking** — tool checks, `.env` key handling, `PROGRESS.md`/`LOG.md`/`manifest.json` so any session can resume.
- **Director craft** — hook/structure formulas, intensity levels per video type, shot vocabulary, pacing, safe zones, 60-30-10 color, animation principles, sound design trio and −14 LUFS mix targets.
- **ElevenLabs voiceover** — paste-ready script blocks (model, voice, settings, audio tags), word budgets per length, pronunciation and retake guidance. *You* generate the MP3 on elevenlabs.io; nothing is built before it arrives.
- **Code-drawn production** — deterministic `drawFrame(t)` rendering, the fast preview-loop (`preview.mjs` contact sheets), 2D↔3D moves, kinetic type, cutouts (RVM/rembg/SAM2), Demucs stem separation, reference-video reverse-engineering.
- **Visual asset hunting** — the agent browses sites itself with the Playwright MCP and logs every asset's source and licence in `manifest.json`.

## Development

```sh
bun install
bun test            # unit tests
bunx tsc --noEmit   # typecheck
npm pack            # pack exactly what would be published
node scripts/build-catalog.mjs   # build the HTTP skills catalog into catalog/
```

The plugin is TypeScript executed directly by OpenCode (Bun) — no build step for the server part. The catalog is generated from `skill/motion-video-director/` and deployed to GitHub Pages on push to `main`.

### Testing the packed artifact

`npm pack`, install the tarball into a scratch project, and point your config at the installed copy (the bare package-name form only resolves from npm, so it can't be used before publishing):

```sh
npm pack
mkdir /tmp/packtest && cd /tmp/packtest && npm i /path/to/opencode-motion-video-director-<version>.tgz
```

```jsonc
{ "plugins": [{ "package": "/tmp/packtest/node_modules/opencode-motion-video-director" }] }
```

Then check `/api/skill`, `/api/command` and `/api/mcp` (or just ask the agent to load `motion-video-director`), and run `/mvd-setup` in the scratch project.

## License

[MIT](LICENSE)
