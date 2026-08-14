<p align="center">
  <img src="https://raw.githubusercontent.com/alohaninja/shift/main/assets/shift-icon.png" alt="SHIFT" width="200" />
</p>

<h1 align="center">SHIFT</h1>

<p align="center">
  <strong>Smart Hybrid Input Filtering & Transformation</strong>
</p>

<p align="center">
  A multimodal preflight layer that automatically adapts inputs before they reach an AI model.
</p>

<p align="center">
  <a href="https://github.com/alohaninja/shift/actions"><img src="https://github.com/alohaninja/shift/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://github.com/alohaninja/shift/releases"><img src="https://img.shields.io/github/v/release/alohaninja/shift" alt="Release"></a>
  <a href="https://crates.io/crates/shift-preflight-cli"><img src="https://img.shields.io/crates/v/shift-preflight-cli" alt="crates.io"></a>
  <a href="https://www.npmjs.com/package/@shift-preflight/runtime"><img src="https://img.shields.io/npm/v/@shift-preflight/runtime?label=runtime" alt="npm runtime"></a>
  <a href="https://www.npmjs.com/package/@shift-preflight/opencode-plugin"><img src="https://img.shields.io/npm/v/@shift-preflight/opencode-plugin?label=opencode-plugin" alt="npm opencode-plugin"></a>
  <a href="https://skills.sh/alohaninja/shift"><img src="https://img.shields.io/badge/skills.sh-shift--ai-black" alt="skills.sh"></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache-2.0"></a>
</p>

<p align="center">
  <a href="https://shift-ai.dev">Website</a> &bull;
  <a href="https://shift-ai.dev/guide/">Guide</a> &bull;
  <a href="#install">Install</a> &bull;
  <a href="https://github.com/alohaninja/shift/blob/main/CHANGELOG.md">Changelog</a>
</p>

---

## What it does

SHIFT sits between your application and the model API. Every request passes through a pipeline that **inspects**, **evaluates**, and **transforms** media inputs so they conform to provider constraints.

<p align="center">
  <img src="https://raw.githubusercontent.com/alohaninja/shift/main/assets/flow.svg" alt="SHIFT pipeline flow" width="900" />
</p>

**Before SHIFT:** oversized images, unsupported formats, and bloated payloads cause hard failures (400 errors, token waste, session crashes).

**After SHIFT:** every request is valid, optimized, and tuned to your cost/quality preference.

## Token savings

SHIFT estimates per-provider token savings for every run. Both OpenAI and Anthropic charge tokens based on image dimensions — resizing images before they hit the API reduces cost.

| Scenario | Before | After | OpenAI tokens | Anthropic tokens |
|---|---|---|---|---|
| 4000×3000 hero image (balanced) | 4000×3000 | 2048×1536 | 765 → 765 | 1,568 → 1,568 |
| 4000×3000 hero image (economy) | 4000×3000 | 1024×768 | 765 → 765 | 1,568 → 1,082 (−31%) |
| 1254×1254 app icon (economy) | 1254×1254 | 1024×1024 | 765 → 765 | 1,568 → 1,405 (−10%) |
| SVG diagram → rasterized PNG | SVG | 512×256 PNG | 255 → 255 | 0 → 98 |

*Token estimates based on published provider formulas. OpenAI uses tile-based counting (GPT-4o/4.1 family, 512×512 tiles); Anthropic uses pixel-based (`w×h/750`, 1568px long-edge cap for standard models). Actual billing may vary by model — newer OpenAI models use patch-based counting, and Anthropic Opus 4.7 supports higher resolution (2576px, 4784 max tokens).*

### Sample report

```
$ cat request.json | shift-ai -m economy -o report

=== SHIFT Report ===
Images found:      1
Images modified:   1
Images dropped:    0
Original size:     42262 bytes
Transformed size:  17018 bytes
Size reduction:    59.7%

Token Savings (estimated):
  OpenAI:    765 -> 765 tokens  (0.0% saved)
  Anthropic: 1,568 -> 1,082 tokens  (31.0% saved)

Per-image breakdown:
  [0] 4000x3000 -> 1024x768  (OpenAI: 765 -> 765, Anthropic: 1,568 -> 1,082)

Actions:
  [image 0] resize — 4000x3000 -> 1024x768
```

### Cumulative tracking

SHIFT automatically records run statistics to `~/.shift/stats.jsonl`. View cumulative savings with `shift-ai gain`:

```
$ shift-ai gain

=== SHIFT Cumulative Savings ===

Runs:     42
Images:   156 processed, 89 modified
Bytes:    247.3 MB saved

Token Savings (estimated):
  OpenAI:    52,400 -> 12,300 tokens  (76.5% saved)
  Anthropic: 84,200 -> 28,100 tokens  (66.6% saved)
```

```
$ shift-ai gain --daily

=== SHIFT Daily Token Savings ===

Date          Runs  Images    OpenAI saved Anthropic saved
----------------------------------------------------------
2026-04-20       8      24           3,200           5,400
2026-04-21      12      42           4,800           8,200
2026-04-22      22      90          12,100          18,500
```

Use `shift-ai gain --format json` for machine-readable output.

## Runtime: AI SDK Middleware + HTTP Proxy

The `@shift-preflight/runtime` package (`runtime/` directory) provides two ways to integrate SHIFT into any AI agent or application:

**AI SDK Middleware** — transparent, in-process optimization for any [Vercel AI SDK](https://sdk.vercel.ai) app:

```typescript
import { shiftMiddleware } from "@shift-preflight/runtime";
import { wrapLanguageModel } from "ai";

const model = wrapLanguageModel({
  model: anthropic("claude-sonnet-4-20250514"),
  middleware: shiftMiddleware({ mode: "balanced" }),
});
```

**HTTP Proxy** — transparent reverse proxy for any agent in any language:

```bash
npx @shift-preflight/runtime proxy --port 8787 --mode balanced

# Point any agent at the proxy:
export ANTHROPIC_BASE_URL=http://localhost:8787   # Claude Code (no /v1 — SDK appends it)
# Codex CLI — add to ~/.codex/config.toml: openai_base_url = "http://localhost:8787"
```

See [`runtime/README.md`](runtime/README.md) for full documentation.

**OpenCode Plugin** — auto-starts the proxy on [OpenCode](https://opencode.ai) launch:

```json
{
  "plugin": ["@shift-preflight/opencode-plugin"],
  "provider": {
    "anthropic": {
      "options": {
        "baseURL": "http://localhost:8787/v1"
      }
    }
  }
}
```

See [`opencode-plugin/README.md`](opencode-plugin/README.md) for setup details.

## Agent integrations

The fastest way to configure all your agents at once:

```bash
shift-ai setup
```

This detects installed agents, configures each one, and optionally installs a
macOS LaunchAgent to keep the proxy running.

| Agent | Method | Setup |
|-------|--------|-------|
| **Any agent** | [Interactive setup](#setup) | `shift-ai setup` (auto-detects + configures) |
| [OpenCode](https://opencode.ai) | [Plugin](opencode-plugin/) (auto) | Plugin auto-starts proxy and sets `baseURL` |
| [Claude Code](https://claude.ai/code) | [`settings.json`](claude-code-hook/) | Writes `ANTHROPIC_BASE_URL` to `~/.claude/settings.json` |
| [Codex CLI](https://github.com/openai/codex) | [`config.toml`](codex-plugin/) | Writes `openai_base_url` to `~/.codex/config.toml` |
| Cursor | Settings UI (manual) | Paste URL into Settings > Models > Override OpenAI Base URL |
| AI SDK apps | Middleware (in-process) | `wrapLanguageModel({ middleware: shiftMiddleware() })` |

> **Gemini CLI** does not support API base URL overrides and is not currently supported.

### Quick per-agent setup

```bash
# Claude Code — env var (add to ~/.zshrc)
eval "$(shift-ai env claude-code)"

# Codex CLI — prints TOML snippet for ~/.codex/config.toml
shift-ai env codex

# List all agents and their config methods
shift-ai env --list
```

All agents share the same proxy on port 8787 — start it once and every agent benefits.

## Install

### Homebrew (macOS/Linux)

```bash
brew tap alohaninja/shift
brew install shift-ai
```

### Quick install script

```bash
curl -fsSL https://raw.githubusercontent.com/alohaninja/shift/main/install.sh | sh
```

Installs to `~/.local/bin`. Detects OS/arch automatically (macOS x86/arm, Linux x86/arm).

### From crates.io

```bash
cargo install shift-preflight-cli
```

### Pre-built binaries

Download from [GitHub Releases](https://github.com/alohaninja/shift/releases) — macOS (x86/arm) and Linux (x86/arm).

### From source

```bash
git clone https://github.com/alohaninja/shift.git && cd shift
cargo install --path shift-cli
```

### AI Agent Skill

If you use an AI coding agent (Claude Code, Cursor, Copilot, Windsurf, etc.):

```bash
npx skills add alohaninja/shift
```

This installs the `shift-ai` skill, which teaches your agent when and how to use SHIFT to optimize image payloads. The skill is listed on [skills.sh](https://skills.sh/alohaninja/shift), the open Agent Skills directory.

### Verify installation

```bash
shift-ai --version
shift-ai --help

# Quick validation — transform a sample payload
echo '{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}' | shift-ai

# Check stats tracking
shift-ai gain
```

## Quick start

```bash
# Transform an OpenAI request (stdin/stdout pipe)
cat request.json | shift-ai -p openai -m balanced > safe_request.json

# Transform an Anthropic request from a file
shift-ai request.json -p anthropic -m economy > safe_request.json

# See what would change without modifying anything
shift-ai request.json --dry-run -o report

# Compose with curl
shift-ai request.json -p openai | curl -s -X POST \
  https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @-
```

## Options

```
shift-ai [OPTIONS] [FILE]

Arguments:
  [FILE]  Input file (JSON request payload). Reads stdin if omitted.

Options:
  -p, --provider <PROVIDER>  Target provider [default: openai]
                              [openai, anthropic, claude]
  -m, --mode <MODE>          Drive mode [default: balanced]
                              [performance, balanced, economy]
      --svg-mode <MODE>      SVG handling [default: raster]
                              [raster, source, hybrid]
  -o, --output <FORMAT>      Output format [default: json]
                              [json, report, json-report, both]
      --dry-run              Show what would change without modifying
      --profile <FILE>       Custom provider profile JSON
      --model <MODEL>        Target model (overrides model in payload)
      --no-stats             Disable saving run statistics
  -v, --verbose              Verbose output

Commands:
  shift-ai gain                 Show cumulative token savings
  shift-ai gain --daily         Day-by-day breakdown
  shift-ai gain --format json   Machine-readable output for dashboards
  shift-ai proxy start          Start the proxy daemon
  shift-ai proxy stop           Stop the proxy daemon
  shift-ai proxy status         Show proxy status
  shift-ai proxy ensure         Start if needed, no-op if healthy
  shift-ai env <agent>          Output config for an agent
  shift-ai env --list           List all supported agents and methods
  shift-ai env --all            Output config for all agents
  shift-ai setup                Interactive multi-agent setup
```

## Drive modes

| Mode | What it does |
|---|---|
| **performance** | Minimal transforms. Only enforce hard provider limits (max dimension, max file size). Preserve original fidelity. |
| **balanced** | Moderate optimization. Resize oversized images, recompress bloated files. Remove obvious waste. **Default.** |
| **economy** | Aggressive optimization. Downscale everything to 1024px, drop excess images beyond provider limits, minimize token usage. |

## SVG handling

Most AI model APIs reject SVG. SHIFT detects SVG inputs and handles them based on `--svg-mode`:

| Mode | Behavior |
|---|---|
| **raster** | Rasterize SVG to PNG via `resvg` (default, provider-safe) |
| **source** | Replace the image with SVG XML as a text content block |
| **hybrid** | Rasterize to PNG and retain SVG source as text |

## Supported formats

**Detected and processed:**

| Category | Formats |
|---|---|
| Raster images | PNG, JPEG, GIF, WebP, BMP, TIFF |
| Vector images | SVG (auto-rasterized to PNG) |
| Encodings | base64 data URIs, raw base64, URL references |

BMP and TIFF are auto-converted to PNG. SVGs are rasterized. Everything else passes through if it meets provider constraints.

## Provider profiles

Built-in constraints for the two major multimodal providers:

| Provider | Max images | Max dimension | Max file size | Megapixel limit |
|---|---|---|---|---|
| **OpenAI** | 10 | 2048 px | 20 MB | -- |
| **Anthropic** | 20 | 8000 px | 5 MB | 1.15 MP |

Profiles include per-model overrides (gpt-4o, gpt-4.1, claude-sonnet-4, etc.) and fall back to provider defaults for unknown models.

Custom profiles can be loaded with `--profile custom.json`.

## Library usage

SHIFT is split into two crates: `shift-preflight` (library) and `shift-preflight-cli` (binary, installs as `shift-ai`). The library can be used directly in Rust applications:

```toml
# Cargo.toml
[dependencies]
shift-preflight = "0.1"
```

```rust
use shift_preflight::{pipeline, ShiftConfig, DriveMode};
use serde_json::json;

let payload = json!({
    "model": "gpt-4o",
    "messages": [{
        "role": "user",
        "content": [{
            "type": "image_url",
            "image_url": {"url": "data:image/png;base64,..."}
        }]
    }]
});

let config = ShiftConfig {
    mode: DriveMode::Balanced,
    provider: "openai".to_string(),
    ..Default::default()
};

let (safe_payload, report) = pipeline::process(&payload, &config).unwrap();
eprintln!("{}", report); // what changed and why
```

## How it works

1. **Inspect** -- Detect every image in the request payload. Extract format (via magic bytes), dimensions, file size, encoding type. Handles base64 data URIs, raw base64, and URL references (fetched automatically).

2. **Evaluate** -- Load the provider profile for the target API. Compare each image's metadata against the constraints. Apply mode-specific rules to determine what actions are needed (resize, recompress, convert, rasterize, drop).

3. **Transform** -- Execute the actions. Resize preserves aspect ratio using Lanczos3 filtering. SVGs are rasterized with `resvg` (supports gradients, text, viewBox). BMP/TIFF are converted to PNG. JPEG recompression uses mode-tuned quality levels.

4. **Reconstruct** -- Rebuild the original payload with transformed images slotted back in. Output is a valid JSON request ready to send to the API.

## Project structure

```
shift/
├── shift-core/          Library crate: shift-preflight (all processing logic)
│   └── src/
│       ├── inspector/   Format detection, metadata extraction
│       ├── policy/      Provider profiles, constraint evaluation, rules
│       ├── transformer/ Image resize, recompress, SVG rasterize, convert
│       ├── payload/     OpenAI + Anthropic message format parse/reconstruct
│       ├── pipeline.rs  Orchestrator: inspect -> policy -> transform
│       ├── cost.rs      Token estimation (OpenAI tile, Anthropic pixel)
│       ├── stats.rs     Persistent run statistics, gain summaries
│       ├── report.rs    Transformation report with token savings
│       └── mode.rs      DriveMode, SvgMode, ShiftConfig
├── shift-cli/           Binary crate: shift-preflight-cli → shift-ai
│   └── src/
│       ├── main.rs      CLI entry point + existing commands
│       ├── proxy.rs     Proxy daemon lifecycle (start/stop/ensure)
│       ├── env.rs       Agent env var generation
│       └── setup.rs     Interactive multi-agent setup
├── runtime/             @shift-preflight/runtime (TS middleware + proxy)
├── opencode-plugin/     @shift-preflight/opencode-plugin (OpenCode)
├── claude-code-hook/    Claude Code integration (settings + installer)
├── codex-plugin/        Codex CLI integration (env var + installer)
├── launchagent/         macOS LaunchAgent plist for auto-start
├── profiles/            Provider constraint JSON (embedded at compile time)
├── tests/
│   ├── fixtures/        Test images and sample payloads
│   └── docker/          Dockerfiles for cross-distro CI (Ubuntu, Arch)
└── .github/workflows/   CI + Linux distro tests
```

## Roadmap (v2+)

- **Video**: frame sampling, keyframe extraction, resolution downscale
- **Audio**: compression, transcription to text
- **Documents**: chunking, summarization, text extraction
- **Smart image selection**: near-duplicate detection, keep most informative
- **Caption fallback**: replace low-value images with text descriptions
- **Adaptive policies**: dynamic adjustment based on request size and latency targets

## License

Apache-2.0
