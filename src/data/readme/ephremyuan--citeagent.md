# CiteIndex

CiteIndex, ingest sources with proper citation. PDF, URL, media, Office, DJVU.

Deterministic citation extraction, Merkle-verified integrity, CJK-first OCR.
Every claim is traced, verified, and cited — no hallucinations.

[![PyPI Downloads](https://static.pepy.tech/personalized-badge/citeindex?period=total&units=INTERNATIONAL_SYSTEM&left_color=BLACK&right_color=RED&left_text=downloads)](https://pepy.tech/projects/citeindex)

## Install

```bash
# Using uv (recommended)
uv pip install citeindex

# Or pip
pip install citeindex
```

## CLI

```bash
# Ingest a PDF
citeindex paper.pdf

# Ingest a scanned PDF with the default MinerU backend
citeindex scanned.pdf --ocr-engine mineru

# Use the optional GLM-OCR backend via local Ollama
citeindex scanned.pdf --ocr-engine glm-ocr --ocr-model glm-ocr:latest

# Ingest a URL
citeindex https://example.com/article

# Crawl and ingest all articles from a site
citeindex https://example.com/articles --all-url-article --crawl-depth 2

# Crawl and re-ingest only changed pages
citeindex https://example.com/articles --update-url-article

# Options
citeindex paper.pdf --llm ollama/qwen3 --type thesis --is-primary
citeindex paper.pdf --text-direction vertical --vertical-lang ch
citeindex scanned.pdf --ocr-engine mineru --lang auto --page-range "1-10"
citeindex paper.pdf --no-layout  # disable column/footnote detection
citeindex -v paper.pdf           # verbose/debug logging
```

## Python API

```python
from citeindex import ingest, IngestionConfig, IngestionFailure, PipelineResult

# Simple
result = ingest("paper.pdf")
print(result["status"])  # "ok"

# With config
config = IngestionConfig(
    llm_model="ollama/qwen3",
    text_direction="vertical",
    is_primary=True,
)
result = ingest("paper.pdf", corpus_root="my_corpus", config=config)
```

## Ingestion Pipelines

CiteIndex automatically detects the input type and routes to the correct pipeline:

### Digital PDF

```
PDF → PyMuPDF (text + images) → GROBID / DSPy citation enrichment
    → page-paragraph document structure
    → PageIndex tree (default, LLM-driven)
    → section_tree + heading injection for document.json / library markdown
    → Merkle tree → store to corpus/
```

- **GROBID** extracts metadata and references deterministically
- **PyMuPDF** extracts page text directly from digital PDFs and pulls embedded images
- **DSPy** reconciles GROBID output with pattern extraction as fallback
- Builds page-based document structure and augments it with PageIndex section headings
- **PageIndex** builds LLM-driven section hierarchy, persists it to corpus, and feeds library markdown headings

### Scanned PDF

```
PDF → scanned backend selector
    → MinerU (default) OR GLM-OCR + PaddleOCR LayoutDetection
    → normalized content_list / markdown / extracted figures
    → DSPy-backed metadata extraction
    → document structure + PageIndex tree (default)
    → Merkle tree → store only CiteIndex-native artifacts to corpus/
```

- **MinerU** is the default scanned backend
- **GLM-OCR** is an optional backend that runs through local **Ollama** using the native `/api/generate` endpoint
- **PaddleOCR LayoutDetection** (`PP-DocLayoutV3` / `PP-DocLayout_plus-L`) supplies external region proposals for GLM-OCR from the start
- Scanned PDFs do **not** use GROBID; metadata is extracted from structured backend output via DSPy-backed extraction
- DSPy is allowed to overwrite pattern-extracted metadata fields for scanned documents
- **PageIndex** runs by default for scanned PDFs, just like digital PDFs
- Only extracted figures / illustrations are exported into the corpus `images/` folder; raw backend artifacts are not preserved
- Supports `--ocr-engine mineru` or `--ocr-engine glm-ocr`

### Scanned PDF Backend Selection

Use the scanned backend flags only for image-based PDFs:

```bash
# Default scanned backend
citeindex scanned.pdf --ocr-engine mineru

# Local GLM-OCR through Ollama
citeindex scanned.pdf --ocr-engine glm-ocr --ocr-model glm-ocr:latest

# Custom Ollama host
citeindex scanned.pdf --ocr-engine glm-ocr --ollama-host http://localhost:11434
```

- `mineru` is the default and recommended general-purpose backend
- `glm-ocr` requires a local Ollama model plus PaddleOCR layout-detection dependencies
- `--mineru-backend` is forwarded directly to the MinerU CLI backend selector

### URL Article

```
URL → Playwright/requests (fetch) → trafilatura/readability (content)
    → Zotero (metadata) → in-page citation guidance (regex → DSPy fallback)
    → section-hierarchical paragraphs → PageIndex tree (optional)
    → hashes → Merkle tree → store to corpus/
```

- **Playwright** renders JavaScript-heavy pages (fallback to **requests**)
- **trafilatura** extracts clean markdown with heading structure (fallback to **readability-lxml**)
- **Zotero** extracts citation metadata via translation-server (title, authors, date, DOI)
- Discovers in-page citation guidance: 若要引用 / 引用格式 / Cite this / Zitierweise / Pour citer
- Parses citation strings with regex first, DSPy fallback for unparseable formats
- Citation guidance overrides Zotero/trafilatura metadata (more authoritative)
- Supports batch crawling with `--all-url-article` and `--update-url-article`

### Media

```
URL/File → yt-dlp (download) → ffmpeg (audio) → WhisperX (transcription)
        → pyannote (diarization, optional) → CSL JSON
        → chunking → hashes → Merkle tree → store to corpus/
```

- **yt-dlp** downloads from YouTube, Vimeo, podcasts, etc.
- **WhisperX** transcribes with word-level timestamps
- **pyannote** speaker diarization (optional)
- Supports audio (`.mp3`, `.wav`, `.m4a`) and video (`.mp4`, `.mkv`, `.webm`)

### Office & DJVU

Office documents (`.docx`, `.doc`, `.rtf`, `.odt`, `.pptx`, `.ppt`, `.odp`) are converted to PDF via **LibreOffice**, and DJVU (`.djvu`) via **ddjvu**, then routed to the digital or scanned PDF pipeline.

### Citation Enrichment Cascade

For PDF inputs, CiteIndex enriches metadata through a priority cascade:

1. **GROBID** — deterministic metadata + references (primary)
2. **LLM extraction** — DSPy-based citation parsing (fallback)
3. **PDF metadata** — basic file metadata only (last resort)

For web pages with ambiguous metadata, a local Perplexica search API can fill missing citation fields (title, author, publisher).

## Configuration Reference

| Option | CLI Flag | Default | Description |
|--------|----------|---------|-------------|
| `llm_model` | `--llm` | `ollama/deepseek-v4-flash:cloud` | LLM model (`ollama/name` or `gemini/name`) |
| `ocr_engine` | `--ocr-engine` | `mineru` | Scanned PDF OCR backend: `mineru` or `glm-ocr` |
| `ocr_model` | `--ocr-model` | `glm-ocr:latest` | Ollama model name used by model-backed OCR engines such as GLM-OCR |
| `ollama_host` | `--ollama-host` | `http://localhost:11434` | Ollama base URL for GLM-OCR requests |
| `mineru_backend` | `--mineru-backend` | `pipeline` | Backend value forwarded to the MinerU CLI |
| `mineru_timeout` | `--mineru-timeout` | `3600` | MinerU subprocess timeout in seconds, up to `3600` |
| `mineru_chunk_pages` | `--mineru-chunk-pages` | `auto` | Split large PDFs into adaptive MinerU chunks; use a page count to override or `0` to disable |
| `text_direction` | `--text-direction`, `-td` | `horizontal` | `horizontal`, `auto`, or `vertical` |
| `vertical_lang` | `--vertical-lang` | `ch` | CJK language: `ch` (Chinese) or `japan` |
| `lang` | `--lang`, `-l` | `auto` | OCR language (auto-detect or Tesseract code) |
| `page_range` | `--page-range`, `-p` | `1-5, -3` | Pages to extract (e.g. `"1-10"`, `"1-5, -3"`) |
| `doc_type_override` | `--type`, `-t` | auto | `book`, `thesis`, `journal`, or `bookchapter` |
| `use_layout_analysis` | `--no-layout` | `True` | Disable column/footnote detection |
| `is_primary` | `--is-primary` | `False` | Line-level granularity (vs paragraph-level) |
| `use_pageindex` | `--no-pageindex` | `True` | PageIndex hierarchy is enabled by default; pass `--no-pageindex` to disable it |
| `pageindex_model` | `--pageindex-model` | `ollama/deepseek-v4-flash:cloud` | LLM for PageIndex tree building |
| `citation_style` | (API only) | `chicago-author-date` | CSL citation style for output |
| `corpus_root` | `--corpus-root` | `corpus` | Output directory for ingested artifacts |
| `schema_version` | `--schema-version` | `1.0.0` | Output schema version tag |
| (CLI only) | `--crawl-depth` | `2` | Max BFS crawl depth for `--all-url-article` |
| (CLI only) | `--crawl-max-pages` | `100` | Max pages for `--all-url-article` |
| (CLI only) | `--verbose`, `-v` | off | Enable verbose/debug logging |

## Output

Each ingestion produces a corpus folder (e.g., `corpus/Author_2024_Title/`) and a companion library markdown file:

### Corpus artifacts (`corpus/Author_2024_Title/`)

| File | Description |
|------|-------------|
| `csl.json` | Citation metadata (CSL-JSON with `ci_*` extensions: `content_hash`, `merkle_root`, `source_type`, `ingestion_timestamp`) |
| `document.json` | Structured document tree — pages, paragraphs, and `section_tree` for URL articles and PageIndex-augmented PDFs |
| `pageindex_tree.json` | Persisted CiteIndex/PageIndex hierarchy with page ranges and summaries when PageIndex runs |
| `merkle.json` | SHA-256 Merkle tree for integrity verification |
| `transcript.json` | Timestamped transcript with speaker segments (media only) |
| `media_metadata.json` | Source media metadata (media only) |
| `ingestion_output.json` | Full ingestion result with all pipeline outputs |

### Library markdown (`library/Author_2024_Title.md`)

Human-readable markdown with YAML front-matter, inline citation, page/section/timestamp headers with CSL-level detail, full extracted text, and footnotes. When PageIndex is available, digital PDFs emit section headings into the markdown instead of only flat page labels. Written to `library/` (sibling of `corpus/`).

### Ingestion log (`corpus/ingestion_log.jsonl`)

Appended on every ingestion with `input_ref`, `resource_type`, `csl_id`, `merkle_root`, and `ingestion_timestamp`.

### URL content hashes (`corpus/_url_content_hashes.json`)

Persisted URL → content-hash mapping used by `--update-url-article` for change detection.

### Return Value

The `ingest()` function returns a dict:

```python
{
    "schema_version": "1.0.0",
    "status": "ok",                    # "ok" or "blocked"
    "document_path": "corpus/Author_2024_Title",
    "standardized_csl_json": { ... },  # Full CSL-JSON with ci_ extensions
    "sub_pipeline_outputs": { ... },   # Raw pipeline results
    "ingestion_log_entry": { ... },     # Log entry with merkle_root
    "library_md_path": "library/Author_2024_Title.md",
}

# On failure:
{
    "status": "blocked",
    "source_id": "unknown",
    "stage": "detect_resource_type",
    "error_code": "unsupported_input",
    "error_message": "Unsupported input: ...",
    "next_action": "Provide PDF, URL, or media file",
}
```

### Batch URL Ingestion Return

The `ingest_all_urls()` method (triggered by `--all-url-article` / `--update-url-article`) returns:

```python
{
    "status": "ok",
    "root_url": "https://example.com/articles",
    "discovered": 25,      # total article URLs found
    "ingested": 20,        # newly ingested
    "updated": 2,           # re-ingested (content changed)
    "skipped": 3,           # unchanged (--update-url-article only)
    "failed": 0,            # errors
    "results": [            # per-URL status list
        {"url": "...", "status": "ok"},
        {"url": "...", "status": "unchanged"},
        ...
    ]
}
```

## Supported Formats

| Format | Extension / Protocol |
|--------|----------------------|
| Digital PDF | `.pdf` (with embedded text) |
| Scanned PDF | `.pdf` (image-based, OCR applied) |
| URL Article | `http://` / `https://` |
| Media | `.mp3`, `.wav`, `.m4a`, `.mp4`, `.mkv`, `.webm` |
| Office | `.docx`, `.doc`, `.rtf`, `.odt`, `.pptx`, `.ppt`, `.odp` |
| DJVU | `.djvu` |

## Citation

If you use CiteIndex in your work, please cite it:

**APA:**

> ajia. (2025). *CiteIndex: Ingest sources with proper citation* (Version 0.12.0). MIT. https://github.com/ajia/citeindex

**BibTeX:**

```bibtex
@software{citeindex2025,
  author  = {Yongjia, Yuan},
  title   = {CiteIndex: Ingest sources with proper citation},
  version = {0.12.1},
  year    = {2025},
  license = {MIT},
  url     = {https://github.com/ajia/citeindex},
}
```

## License

MIT
