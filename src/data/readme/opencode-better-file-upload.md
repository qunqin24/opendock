<div align="center">

# opencode-better-file-upload

### Drop any file into OpenCode chat — it just works.<br/>Even on models that can't read PDFs, Word, or PowerPoint.

[![npm version](https://img.shields.io/npm/v/opencode-better-file-upload?color=cb3837&logo=npm)](https://www.npmjs.com/package/opencode-better-file-upload)
[![npm downloads](https://img.shields.io/npm/dm/opencode-better-file-upload?color=cb3837&logo=npm)](https://www.npmjs.com/package/opencode-better-file-upload)
[![license](https://img.shields.io/npm/l/opencode-better-file-upload?color=blue)](./LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-000000)](https://opencode.ai/docs/plugins/)

<img src="./assets/hero.png" alt="Before and after: dragging a PDF into OpenCode chat fails on most models; this plugin makes it work" width="480" />

</div>

OpenCode forwards binary attachments (PDF, Word, PowerPoint, Excel…) to the model as-is, but most LLMs can't read them — so dragging a PDF into chat fails with `this model does not support pdf input`. This plugin intercepts those files, drops them on disk, and converts them to Markdown **on demand** when the model actually needs the contents. Images and plain text pass straight through.

## Highlights

- **It just works** — drag any document into chat instead of getting `this model does not support pdf input`.
- **Lazy by design** — nothing is converted until the model asks for it. A 15 MB PDF never blocks your message, and you never pay to convert a file the model doesn't read.
- **Works everywhere** — runs inside OpenCode itself (the `chat.message` hook), so every frontend you use — TUI, CLI, web, [OpenChamber](https://openchamber.dev/) — gets the fix with no per-client setup.
- **Non-intrusive** — images and plain-text/code files pass straight through untouched.

## Supported files

| Category | Extensions |
|---|---|
| PDF | `.pdf` |
| Word | `.docx`, `.doc` |
| PowerPoint | `.pptx`, `.ppt` |
| Excel | `.xlsx`, `.xls` |
| Web / data | `.html`, `.htm`, `.csv`, `.json`, `.xml` |
| Books / archives | `.epub`, `.zip` |
| Email | Outlook `.msg` |
| Images / audio | OCR for `.png` / `.jpg`, transcription for `.wav` / `.mp3` |
| Web video | YouTube URLs |

→ Background, diagrams, and full reference: [`docs/details.md`](./docs/details.md).

## Install

```bash
opencode plugin opencode-better-file-upload --global   # recommended — fixes file upload everywhere
```

That's it — OpenCode installs the package and adds it to your global config. Drop `--global` to enable it for the current project only, or edit config by hand: add `"plugin": ["opencode-better-file-upload"]` to `opencode.json`.

### Optional: `uv` for document conversion

Conversion is lazy — you only need [`uv`](https://docs.astral.sh/uv/) the first time the model actually reads a document. Without it, files are still saved and referenced; the model just gets a clear `is 'uv' installed?` message when it tries to convert one. Install it whenever you like:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # or: brew install uv
```

It's the only system dependency — no Python environment to set up. `uvx` downloads and caches MarkItDown automatically on first use.

## Usage

Just attach files the way you already do:

```bash
opencode run "summarize this document" --file report.pdf
```

…or drag the file into the TUI / web / [OpenChamber](https://openchamber.dev/) chat. New files land in `./uploads/`, and the model receives a compact path reference instead of the raw binary — then calls the `markitdown` tool when it needs the contents.

## Configuration

All optional, via environment variables:

| Variable | Default | What it does |
|---|---|---|
| `BETTER_FILE_UPLOAD_PYPI_INDEX` | _(unset)_ | Custom PyPI index for `uvx` (handy on [slow PyPI / in China](./docs/details.md#china--slow-pypi)). |
| `BETTER_FILE_UPLOAD_MARKITDOWN_EXTRAS` | per-format | Force the MarkItDown extras to install, e.g. `all`. |
| `BETTER_FILE_UPLOAD_DEBUG` | `0` | Set to `1` to write a debug log to `uploads/.better-file-upload.log`. |

**China / slow PyPI** — if `markitdown` downloads time out, point it at a mirror (runs as `uvx --default-index <mirror> markitdown …`):

```bash
export BETTER_FILE_UPLOAD_PYPI_INDEX="https://mirrors.aliyun.com/pypi/simple/"
```

See [`docs/details.md`](./docs/details.md) for supported file types, how it works, OpenChamber notes, and troubleshooting.

## Roadmap

- [ ] Configurable uploads location (project-local vs. global cache)
- [ ] Pass-through for OCR / Azure Document Intelligence options

## License

[MIT](./LICENSE) © brikerman
