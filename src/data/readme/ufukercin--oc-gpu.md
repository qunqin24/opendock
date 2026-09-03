# oc-gpu

Displays live GPU metrics, **VRAM usage**, **compute utilization**, and **temperature**, right in the OpenCode session prompt.

> **Main use case: local LLMs.** This plugin is built for people running opencode against a **local LLM on the same machine** (e.g. with [llama.cpp](https://github.com/ggerganov/llama.cpp), [Ollama](https://ollama.com), [vLLM](https://github.com/vllm-project/vllm), LM Studio...). When opencode talks to a local model, your GPU does the work, and this plugin lets you watch it live while it's generating.

```
VRAM 7.5/32G 35% 48°C
```

## Why monitor your GPU in opencode?

When you use a local LLM, every token you stream comes out of your GPU, so its health, headroom, and noise level directly affect your workflow. oc-gpu puts that information on screen next to your prompt so you can answer questions like:

- **"Will the next model fit?"** The VRAM gauge (`7.5/32G`) shows exactly how much memory is free. If you are about to load a bigger model or a longer context, you can see at a glance how much room you have left.
- **"Is it actually working, or stuck?"** A saturated compute util (`35%`) means tokens are being generated right now. Unexpectedly low utilization during streaming usually signals a small model, heavy quantization, or the model fitting in a CPU/cached path.
- **"Am I pushing it too hard?"** The temperature reading (`48°C`) tells you how hot the card runs. Sustained high temperatures mean throttling, which slows down generation and shortens hardware life.

It updates automatically, needs no configuration, and cooperates with other TUI plugins such as [oc-tps](https://github.com/Tarquinen/oc-tps) (tokens-per-second) that render in the same prompt slot.

## Installation

Install from the CLI:

```bash
opencode plugin oc-gpu@latest --global
```

Requires `opencode` `1.3.14` or newer.

## What it shows

For each detected GPU, the plugin renders in the right side of the session prompt:

| Metric         | Example    | Meaning                                                              |
| -------------- | ---------- | -------------------------------------------------------------------- |
| VRAM           | `7.5/32G`  | Used / total video memory. Falls back to `7.5G` if total is unknown. |
| Compute usage  | `35%`      | Current GPU compute utilization, 0% to 100%.                         |
| Temperature    | `48°C`     | Current GPU temperature, when exposed by the driver.                 |

With multiple GPUs each one gets a label:

```
GPU0 VRAM 7.5/32G 35% 48°C  GPU1 VRAM 2.0/45G 12% 54°C
```

If no supported GPU tool can be reached, the prompt shows `GPU n/a`.

### About the temperature reading

- Temperature comes from the GPU's **edge die sensor** (or the first sensor exposed by the driver, such as hotspot/junction on AMD cards).
- It is shown in degrees Celsius and rounded to a whole number.
- Typical idle temperatures are `30°C` to `50°C`; under sustained LLM inference you'll usually see `60°C` to `80°C`, depending on the card and cooling.
- If a vendor tool does not expose a temperature (e.g. `intel_gpu_top`), that part of the readout is simply omitted. VRAM and utilization still display where available.

## Backends

The plugin auto-detects the first working backend, in this order:

| Vendor          | Tool                          | Notes                                                                 |
| --------------- | ----------------------------- | --------------------------------------------------------------------- |
| NVIDIA          | `nvidia-smi`                  | Available on Windows, Linux and macOS.                                |
| AMD             | `amd-smi` (`metric --json`)   | Newer ROCm tool. A tolerant parser handles varying field names/units. |
| AMD (legacy)    | `rocm-smi --json`             | Fallback for older ROCm installs.                                     |
| Intel (Linux)   | sysfs (`/sys/class/drm`)      | Reads `gpu_busy_percent`, hwmon temperatures and `mem_info_vram_*`.   |
| Intel (Linux)   | `intel_gpu_top -J`            | Utilization-only fallback when sysfs is unavailable.                  |

AMD and Intel support is best-effort across the many versions of their tools; NVIDIA is the most battle-tested. If a metric can't be reported it is simply omitted.

> The plugin only reports **overall** GPU readings from the machine opencode is running on. Those readings naturally reflect whatever uses the GPU, so for it to be meaningful you'll typically run a local LLM on the same machine. It does not show remotely-hosted or cloud models.

## Configuration

The plugin needs no configuration. Two environment variables are available:

| Variable           | Default | Description                                     |
| ------------------ | ------- | ----------------------------------------------- |
| `OC_GPU_INTERVAL`  | `5000`  | Polling interval in ms (clamped to 1s to 60s).  |
| `OC_GPU_DISABLED`  | (none)  | Set to `1` to disable polling entirely.         |

```bash
# poll every 2 seconds
OC_GPU_INTERVAL=2000 opencode
```

## Development

```bash
npm install
npm test             # runs the parser/formatter smoke tests (no GPU needed)
npm run typecheck
```

To try the plugin locally from a checkout, point opencode at your local build:

```bash
opencode plugin ./path/to/oc-gpu --global
```

Built as a TUI plugin in the spirit of [oc-tps](https://github.com/Tarquinen/oc-tps).

## License

MIT