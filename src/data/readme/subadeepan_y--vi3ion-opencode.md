# VI3ION — eyes for AI agents

[![CI](https://github.com/Subadeepan-Y/VI3ION/actions/workflows/ci.yml/badge.svg)](https://github.com/Subadeepan-Y/VI3ION/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/vi3ion.svg)](https://pypi.org/project/vi3ion/)
[![npm](https://img.shields.io/npm/v/@subadeepan_y/vi3ion-opencode.svg)](https://www.npmjs.com/package/@subadeepan_y/vi3ion-opencode)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**AI models cannot see. They read text.** Paste a screenshot into Claude Code,
Cursor, Codex or OpenCode and most agents will either ignore the image or
guess what it shows.

**VI3ION gives them eyes.** It looks at the image and hands the agent
*measurements* — what the text says, where each word sits in pixels, what
colour things are, how they line up, and what changed since the last
screenshot.

One `pip install`, one small config block. Local by default, no API key needed;
remote processing is opt-in. Private images stay on your machine unless you
explicitly enable a remote provider.

**Made for modest hardware.** Have an older laptop, no GPU, or 8 GB of RAM?
You cannot run a vision model — that is exactly who this is for. VI3ION does
the looking on your CPU and tells your text-only local model what it found in
a few hundred tokens. Bigger machines can still use VI3ION as a second opinion.
See [LOCAL_MODELS.md](LOCAL_MODELS.md).

---

## Install (about a minute)

```bash
pip install vi3ion
```

Then tell your agent where the server is — one block, in your MCP config:

```json
{
  "mcpServers": {
    "vi3ion": {
      "command": "vi3ion-mcp",
      "args": []
    }
  }
}
```

That is the whole installation. Check it with two commands:

```bash
vi3ion doctor       # is the engine and OCR ready?
vi3ion mcp-check    # does the server start and list its tools?
```

Updates are your call: `vi3ion version` compares what you have with the
latest on PyPI/npm and prints the exact command — it never installs without
you asking. The OpenCode plugin can ask for you (and shows a permission
prompt before anything runs); auto-updates are **off** by default and are
opted into with `vi3ion updates auto on`.

> **Windows:** if `pip install -U vi3ion` ever fails with *"file is being used
> by another process"*, your editor is holding the old launcher. Close it,
> upgrade, reopen — or register the server as `python -m vi3ion.mcp_server`
> instead of `vi3ion-mcp`, which is never rewritten.

Where the config goes: `adapters/` has one page per agent
([Claude Code](adapters/claude-code.md), [OpenCode](adapters/opencode/README.md),
[Cursor / Windsurf / Continue / Zed](adapters/editors.md),
[anything else](adapters/generic-mcp.md)).

### Optional: the OpenCode plugin

```bash
npm i -D @subadeepan_y/vi3ion-opencode
```

With the plugin, OpenCode measures every image you paste, tells the agent it
has eyes, and re-binds when you switch models mid-chat. Without it, the MCP
server alone still works — the agent just calls the tools itself.

### Optional: give the agent the rules

```bash
vi3ion skill --out AGENTS.md
```

A short instruction file (also shipped inside the package) that tells the
agent *when* to reach for VI3ION and what the rules are.

---

## What the agent actually receives

For a screenshot with a blue **Save** button, the agent gets:

```
Image 1280x800 (settings.png). Top bar: "Settings" ink:#f8f8f8 on:#1e3a8a
contrast:9.8 @[44, 32, 168, 69]. Centre: "Save" (uncertain) ink:#f8f8f8
on:#2563eb contrast:4.9 @[373, 619, 421, 640]; "Cancel" ink:#384858
on:#ffffff contrast:9.4 @[557, 617, 620, 640]. Composition: the largest colour
area is a blue horizontal band in the top centre (11% of the frame) ...
```

Plain language: *white text, blue button, contrast 4.9, those exact pixels.*
The agent can answer questions about the screen, point at a button, or verify
a claim ("are Save and Cancel aligned?") and get a **verdict with
measurements** back.

## What you get

| | |
|---|---|
| **The text, with coordinates** | every word and where it sits in the original pixels |
| **Real colours** | per element: `#f8f8f8` ink on `#2563eb` background, with the contrast ratio |
| **Layout** | which band, column or region each thing is in, and how the frame is divided |
| **Checks, not guesses** | "the Save button is aligned with Cancel" -> verified / contradicted / inconclusive, with the numbers |
| **Memory of versions** | it remembers every image it has seen, and diffs two states of the same screen |
| **Cross-checking** | an uncertain reading can be checked against your own source code |

Everything is labelled as **observed** (read from pixels), **inferred**, or
**unknown**. It never quietly corrects a reading.

### Demo: the same blind model, with and without eyes

Illustrative transcript — run it yourself with a text-only local model via
`python scripts/task_benchmark.py` (add `--dry-run` to see the structure without
calling a model).

**Without VI3ION**
> User: "What does this settings screen say?"  
> Model: "I cannot see images. Please describe the screen in text."

**With VI3ION**
> User: "What does this settings screen say?"  
> Evidence handed to the model: `"Settings" @[44,32,168,69]`; `"Save"` and
> `"Cancel"` with measured boxes; blue `#2563eb` button.  
> Model: "It is a Settings screen. The Save button is blue with white text, at
> x 373–421, y 619–640; Cancel is to its right."

That is the whole product: not prettier OCR, a blind model completing a task.

### Recreating an image

Give VI3ION a picture of three circles and ask for a blueprint. It returns a
simple recipe: canvas size, background colour, and each circle's position,
size and colour as percentages. An image-generating model can follow that
recipe without ever seeing the picture.

```bash
vi3ion blueprint drawing.png
```

Simple shapes are measured exactly. Fine detail — faces, textures, handwriting
— is described, not reproduced: expect roughly 70–80% there. The tool is a
measurement, not a promise of a perfect copy.

## Works with

**Agents:** Claude Code, Cursor, Windsurf, Continue, Zed, Antigravity,
Quoder, OpenCode, anything that speaks MCP.

**Models:** cloud or local. A text-only local model on Ollama, llama.cpp,
LM Studio, vLLM, Unsloth or SGLang gets its eyes from VI3ION; a model with
its own vision uses VI3ION as a second opinion. `vi3ion local` shows what is
running and which role fits.

## Honest limits

- It does not *name* objects. It says *"a small rectangular area in the upper
  right"*, never *"a button"* — that keeps the evidence auditable, and naming
  things is the model's job.
- Very faint decorative lettering is not transcribed, and the output says so.
- OCR is the weak spot, not the geometry: 96.9% average fidelity across the
  bundled ground-truth fixtures (numbers below).

---

## The text brief, measured

A brief that a model with **no vision** can reason over — no model calls, no
network, ~5s on a 1919x949 screenshot:

| Component | Score | What it measures |
|---|---|---|
| **Brief fidelity** | **96.9%** | average across the five bundled fixtures |
| Text recall | 96.4% | share of readable text that reached the brief |
| Text precision | 100% | share of the brief's confident quoted text that is really in the image |
| Region accuracy | 99.4% | matched text filed under the right region |
| Structure | 100% | composition line, colour map, shape sentences, honesty note |

Scores are reproducible: `vi3ion score --all`. Ground-truth entries marked
*uncertain* (garbled glyphs a human could not confidently transcribe) are not
used as pass/fail targets. The difficult fixture still loses points on OCR:
index digits read as `84/85/88` instead of `04/05/08`, and some Japanese labels
are garbled. Geometry, colour and layout stay above 96% throughout.

### Before and after

Same three original fixtures, scored before and after. A contrast-enhancement
experiment made things worse and was switched off by default (still available
with `VI3ION_OCR_CLAHE=1`). Two more fixtures — a known-text card and a
red-apple photo — were added later and are in the headline average above.

![Brief fidelity before and after, by fixture](docs/assets/fidelity-before-after.svg)

| Fixture | Before | After |
|---|---:|---:|
| Difficult dark screenshot | 80.4% | **95.8%** |
| Settings screenshot | 95.2% | **96.4%** |
| Clean settings dialog | 100% | **100%** |
| **Average (3 fixtures)** | **91.9%** | **97.4%** |

The gain came from four small fixes: uncertain ground-truth guesses stop
counting against recall, keyboard markers like `[M]` no longer count as text,
grammar fixes in the brief, and OCR preprocessing that no longer lifts
contrast on images that were already readable.

```bash
vi3ion brief screenshot.png    # the brief itself
vi3ion score screenshot.png    # score it against hand-transcribed ground truth
vi3ion score --all             # score every bundled fixture
```

Scores come from `tests/fixtures/*.expected.json` — hand-transcribed files of
the same images — so the claim is reproducible and every regression is visible.
On a clean settings dialog the same pipeline scores **98.5%**. The gap
between the two is the honest story: layout and composition hold up, and what
costs points is OCR, not placement. On the difficult image the loss is
concentrated in three known defects — index digits read as `84/85/88/89`
instead of `04/05/08/09`, misread Japanese labels, and one fused word.

### Honest boundaries

The brief deliberately does **not** name objects — it says *"a small rectangular
area in the upper right"*, never *"a button"*. Object names are the reading
model's job, and keeping them out is what makes the evidence auditable. Large
decorative lettering too faint for OCR is not transcribed, and the brief says so
in its closing note.

## How it ships

| Layer | What it is |
|---|---|
| **Core** | Agent-independent perception pipeline (Python). Pure computation: ingestion -> pixels -> geometry -> OCR -> spatial relations -> verification -> text brief. |
| **Adapter** | MCP server (stdio) exposing 11 tools. This is what the coding agent talks to. |
| **Skill** | Written instructions (`vi3ion/skill/SKILL.md`, also registered with OpenCode) telling the agent *when and how* to call the tools. |
| **Plugin** | Optional OpenCode plugin (`@subadeepan_y/vi3ion-opencode`) that measures attached images automatically and introduces VI3ION to the agent. |
| **Dashboard** | Local React dev dashboard (`dashboard/`) for testing and inspecting evidence. Never required in production. |

## Command reference

```bash
vi3ion doctor                      # OCR, RAM, registry, local runtimes, MCP entry point
vi3ion mcp-check                   # real MCP handshake: does the server start?
vi3ion version                     # installed vs latest (PyPI/npm) + update commands
vi3ion updates auto on|off         # auto-update consent (off by default)
vi3ion analyze screenshot.png      # full analysis as JSON
vi3ion screenshot                  # capture the current screen and analyse it
vi3ion blueprint drawing.png       # measured recipe for recreating an image
vi3ion ask drawing.png "Where is Save?" --limit 5
vi3ion graph img_123 --limit 20     # traceable evidence graph
vi3ion audit image.png ground.expected.json
vi3ion purge --days 7 --confirm    # delete old stored images
python scripts/task_benchmark.py --dry-run
vi3ion brief screenshot.png        # text-only brief for a vision-less model
vi3ion score screenshot.png        # brief fidelity vs the ground truth
vi3ion local                       # local LLM runtimes + the recommended role
vi3ion images                      # every image VI3ION remembers
vi3ion ingest shots\ --label run  # register a screenshot folder
vi3ion diff old.png new.png        # what changed between two states
vi3ion prune                       # forget images whose file is gone
vi3ion skill --out AGENTS.md       # the agent instruction file
vi3ion serve                       # optional local dashboard on :8765
```

---

## The evidence contract

Everything Vi3ion returns obeys one envelope (`ToolResponse`):

- `summary` — human-readable one-liner of what was found.
- `evidence[]` — items of kind `text | shape | color | object | relationship | note | image`,
  each with `label`, `confidence`, `attributes`, and a **bounding box in
  original image pixels** (`[x0, y0, x1, y1]`).
- `evidence_total` / `truncated` — pagination awareness.
- `cached` — true when the result was served from the evidence store.

### Measured colours per element

Every text and shape item also carries its own measured colour in
`attributes`:

| Attribute | Meaning |
|---|---|
| `ink_hex`, `ink_rgb`, `ink_name` | the element's own colour (letter ink, or a shape's fill) |
| `bg_hex`, `bg_name` | the local background it sits on |
| `contrast` | WCAG-style luminance ratio between the two (1..21) |
| `ink_share` | how much of the box the ink covers |

The text brief renders the same measurement inline, unquoted so the fidelity
score is unaffected:

```
"Save" (uncertain) ink:#f8f8f8 on:#2563eb contrast:4.9 @[373, 619, 421, 640]
```

`verify_claim` uses the same measurement, so `"the text 'Save' is white"` and
`"the Save button is blue"` are answered with a verdict instead of a guess.
- `timings_ms` — per-module timing breakdown.
- `verification` — for `verify_claim`: `verified | contradicted | inconclusive`
  plus measurements, never opinions.

Coordinate space is always the **original image**, even for region crops
(`inspect_region` remaps crop coordinates back).

### Observed vs inferred

| Evidence | Marked |
|---|---|
| OCR text, shapes, colours, measured relations, geometry | `observed` |
| Semantic object labels (when a provider is enabled) | `inferred` |

Agents must preserve that distinction when reporting to users.

## MCP tools

| Tool | Purpose |
|---|---|
| `inspect_image` | Ingest + analyse an image (by `path`, `path="clipboard"`, or `image_id`). |
| `screenshot` | Capture the current screen and analyse it — no path needed. Fails soft on headless machines. |
| `reconstruction_blueprint` | A measured recipe (canvas, shapes, text, colours, percentages) so a generator can recreate a simple image. |
| `ask` | Only the evidence relevant to a question, with stable IDs and UNCERTAIN flags. For small-context models. |
| `evidence_graph` | Stable IDs, provenance, boxes and relationships — reference evidence instead of re-finding it. |
| `confidence_audit` | False-confidence rate against ground truth: confident claims the image does not support. |
| `inspect_region` | Deep-dive on `[x0,y0,x1,y1]`; coordinates mapped back to original. |
| `query_evidence` | Query stored evidence by kind/text/region/confidence without re-analysis. |
| `verify_claim` | Check a claim ("Save is aligned with Cancel") against measurements. |
| `compare_regions` | Measure differences between two regions. |
| `cross_check_text` | Verify an OCR reading against project source string literals. |
| `list_images` | List remembered images (labels + identity metadata, including the perceptual hash). |
| `remember_image` | Attach a persistent label to an image. |
| `diff_images` | Compare two versions of a screen (observed text/layout changes **and** a pixel-level comparison). |
| `local_stack` | Detect local LLM runtimes (Ollama, llama.cpp, LM Studio, vLLM, …), their models, and the recommended Vi3ion role. |
| `doctor` | Self-check the setup: OCR, RAM/tier, registry, local runtimes, editor wiring. |

All results are returned as JSON strings over the MCP transport.

The **text brief** (`vi3ion brief` / `vi3ion score`) is currently a CLI entry
point rather than an MCP tool; wiring it into the adapter is a small, tracked
gap rather than an implied capability.

## Architecture

```
vi3ion/
  config.py            pydantic settings (VI3ION_* env vars)
  brief.py             the text-only brief: compose every section into one page
  image_memory.py      identity signatures, similarity, version diffs
  visual_diff.py       pixel-level comparison of two screenshots
  core/pixels/element_color.py  per-element colour measurement (ink + background)
  local_stack.py       local LLM runtime detection (Ollama, llama.cpp, LM Studio, vLLM, …)
  analyzer.py          OCR -> rows -> spatial regions -> per-region budget
  text_merge.py        split fused words, join fragments, pair numbers
  describe_shapes.py   region sentences: contours, pale columns, colour areas
  composition.py       large colour areas + "how the frame is divided"
  evaluate.py          brief-fidelity scorer against hand-transcribed truth
  colors.py            named colour set (Lab nearest-name)
  schemas/             evidence contract: BBox, Evidence, ToolResponse, claims
  storage/             SQLite schema, image store, repositories
  core/
    ingestion/         validation, EXIF orientation, dedup, thumbnails
    pixels/            CIELAB palette, statistics, colour regions
    geometry/          adaptive Canny, contours, shapes, measurements
    ocr/               rapidocr-onnxruntime (with tesseract fallback)
    semantics/         optional semantic provider (mock/remote/OpenAI-compatible)
    spatial/           scene graph, rows/columns, relationships
    verification/      claim parser + verifier
    engine.py          orchestrator (single entry to everything)
  server/              FastAPI app (dev dashboard API + static mount)
  mcp_server.py        MCP stdio server (11 tools) — the portable interface
  agent_interface/      legacy shim → vi3ion.mcp_server (kept for old launchers)
dashboard/              React + Vite dev dashboard
skill/                  the agent skill instructions
tests/                  82 tests: schema, ingestion, geometry, verification,
                        API, text merging, composition, brief fidelity
```

## Security model

- Server binds loopback by default (`127.0.0.1`).
- Agent-supplied filesystem paths are restricted to `VI3ION_ALLOWED_ROOTS`
  (default: cwd + data dir). Anything outside is refused.
- Images are validated at ingestion (magic bytes, format whitelist, size and
  pixel limits). **Image content is never executed**; OCR/semantics output is
  treated as untrusted data.
- The MCP server never prints to stdout (that is the protocol channel).

### Semantic providers (local, opt-in)

All perception beyond OCR/geometry is **inferred** and tagged as such.
Enable providers via `VI3ION_SEMANTIC_PROVIDER` (comma-separated):

| Value | Provider | Notes |
|---|---|---|
| `mock` | deterministic JSON fixtures keyed by image hash | default for tests; no model loaded |
| `florence` | Florence-2 base (object detection + region captions) | input capped at 768px, boxes mapped back |
| `owlvit` | OWL-ViT open-vocabulary detector | vocabulary in `core/semantics/vocabulary.json` (extend without code changes) |
| `clip` | CLIP zero-shot scene tags | top 3, marked `suggested` |
| `remote` | OpenAI-compatible API | **image leaves the machine** — opt-in only |

Heavy models require `pip install -e ".[semantic]"` (torch + transformers). If a
provider is enabled but its dependencies/weights are missing, it reports an
error and the analysis continues with the remaining providers.

```bash
# run with all local semantic layers
VI3ION_SEMANTIC_PROVIDER=florence,owlvit,clip vi3ion analyze shot.png
```

## Development

```bash
npm --prefix dashboard install
npm --prefix dashboard run build     # TS + Vite; dist/ mounts at server root
pytest                                # full suite
vi3ion score --all                    # fidelity on every bundled fixture
python scripts/stress_images.py "<folder>"   # sample a real screenshot folder
```

The stress script measures real folders without uploading anything. It samples
across the folder, adds the smallest and largest files, and reports failures,
slow analyses and images with no detected text. Use `--all` for a full pass.

The dashboard proxies `/api` to the server and is only mounted when
`dashboard/dist` exists.

## Stress test on real screenshots

Measured on `698` screenshots from one real folder: 1,971 s total, 6,594 ms
and 396 tokens per image **on the machine below**. Failures: 6 (tiny or
corrupt captures, now rejected with a clear message). Full data:
`docs/full-analysis-report.json` and `docs/full-analysis-progress.jsonl`.

**Test machine:** AMD Ryzen 5 5500GT (6 cores / 12 threads), 15.3 GB RAM,
AMD Radeon integrated graphics, Windows 11 Pro build 26200, Python 3.13.15,
RapidOCR 1.2.3 / ONNX Runtime 1.31.1 / OpenCV 5.0.0.93. CPU-only OCR;
`low_resource` was off.

**Results will vary.** Speed scales with CPU, image resolution, text density
and thermal throttling. A smaller laptop, a high-DPI 4K screen or a dense
terminal screenshot will be slower and may use a different evidence tier.
These numbers describe one machine, not a guaranteed baseline.
