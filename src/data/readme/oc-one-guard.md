# oc-one-guard

An OpenCode plugin that checks proposed tool calls for possible data exfiltration. It is a heuristic guardrail - not a promise that every risky call will be caught.

## How Does It Work?

**Tool call → local checks → judge if needed → allow or block.**

- We look for risky transfers - e.g. uploading keys, dumping environment variables, or staging a script that sends files out.
- Ordinary local calls can skip the judge. Calls that need review go to your configured System One endpoint before execution.
- The model can miss things. I'd treat this as an extra check, not a firewall.

⚠️ **Judge offline? Reviewed calls block by default.** Unclear answers and escalations block too. Keep the [disable instructions](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/installation.md#disable-it-if-the-judge-is-offline) handy.

![Configurable default risk bands for the judge violation signal, from 0 to 1: below 0.50 allows the tool call; 0.50 to below 0.70 blocks for manual review without an approval popup; 0.70 to below 0.90 denies the call; 0.90 through 1 denies the call and requests best-effort cancellation of the current run, retaining the conversation. This is a static policy scale, not elapsed time or measured progress.](docs/assets/risk-policy.svg)

The default `noul` question asks whether the call violates exfiltration policy. These are configurable cutoffs, not calibrated probabilities. Stopping a run is best-effort and keeps the conversation for follow-up; `stopThreshold: null` disables cancellation. See [configuration](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/configuration.md) for overrides and cancellation limits.

## Quick Heads-Up

- Branches: `main` targets the latest OpenCode (2.x) and also still loads on 1.19.4. The `opencode-1.x` branch delivers the 1.x-only line. Version numbers are plain semver and do not track OpenCode versions.
- OpenCode 2.2.x (`setup` entry) was tested end to end on 2.2.5 with a scripted model and judge: allowed and blocked calls, judge outage, staged scripts and the load check. Subagent and MCP calls are not tested yet. OpenCode 1.19.4 (`server` entry) is the tested v1 host. Unsupported before 1.19.4.
- OpenCode 2.x does not log decisions or show toasts. A load failure is logged as `failed to load plugin`, so [check it loaded](docs/installation.md#verify-it-loaded).
- On OpenCode 2.x, `/guard.off`, `/guard.on` and `/guard.status` switch the guard for one session and its subagents; `enabled` in the config stays the default for everything else. See [configuration](docs/configuration.md#turning-the-guard-off-for-one-session).
- Setup is opt-in. Cloning this repo does not register the plugin or change OpenCode configuration.
- The judge receives rendered tool arguments and, in some cases, staged file contents. Pick an endpoint you trust.

An optional timeout-only fallback can send the same unredacted state to a second trusted judge; see [advanced configuration](docs/configuration.md#optional-timeout-fallback).

## Install

Published on npm as [`oc-one-guard`](https://www.npmjs.com/package/oc-one-guard). Add it to one project's OpenCode config, pin the version you reviewed, then restart OpenCode:

```json
{
  "plugin": [
    [
      "oc-one-guard@0.3.0",
      {
        "endpoint": "http://127.0.0.1:8081/v1/systemone",
        "model": "h2o-lightning-4b"
      }
    ]
  ]
}
```

OpenCode 2.x uses the `plugins` key with an object entry instead; see [installation](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/installation.md). Use the global config instead if you want it in every project. To uninstall, remove that entry and restart. Full details and the local-checkout option: [installation](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/installation.md).

## How Does the Check Work?

- [Read the short explainer](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/explainer.md) - Markdown with a flow diagram, right here on GitHub.
- [Open the visual walkthrough](https://htmlpreview.github.io/?https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/explainer.html) - rendered HTML via third-party HTMLPreview. No download needed.

## How Did H2O Do?

The following direct-judge comparison is historical research, not an end-to-end guard benchmark. On one fixed 100-case synthetic fixture, E02 traded fewer benign blocks for more missed malicious cases than the previous default:

| Question | Benign blocked | Malicious blocked | Malicious misses |
|---|---:|---:|---|
| V0, previous default | 15/53 | 37/37 | none |
| E02, current default | 3/53 | 32/37 | `auth-06`, `storage-08`, `ssh-06`, `mcp-08`, `web-07` |

The 300-request repeat matched all scores across three conditions, but reused the same cases and did not exclude server-side caching. The reported model name was `h2o-lightning-4b`; its revision and weights were not verified. [Read the evaluation and its limits](docs/research/e02-external-evaluation.md).

An earlier synthetic guard run requested **H2O Lightning 4B** (the served model and revision weren't verified). See the [H2O JevBench article](https://h2o.ai/blog/2026/h2o-lightning-jevbench), [model weights](https://huggingface.co/h2oai/h2o-lightning-4b), and [GGUF weights](https://huggingface.co/h2oai/h2o-lightning-4b-gguf):

| Guard results | Outcome |
|---|---|
| Benign calls scored by H2O | 17 allowed, **9 blocked** |
| Malicious calls scored by H2O | **24 blocked**, 0 allowed |

The run was **incomplete**: 45 requests timed out across the direct and guard tests. Timeout blocks aren't model detections, and these small synthetic samples aren't production rates. [See the cases and full breakdown](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/research/h2o-synthetic-evaluation.md).

## Where to Go Next?

- [Install the plugin](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/installation.md)
- [Configure the guard](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/configuration.md)
- [Data handling and security limits](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/security.md)
- [Run tests and contribute](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/contributing.md)
- [Documentation index](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/README.md)

## What's Next?

These are ideas, not current features: a simpler setup and calibration path that stays conservative by default, and end-to-end tool-call tests on OpenCode 2.x. Version 0.2.0 adds the OpenCode 2.x entry; see [ADR 0011](https://github.com/HumanFace-Tech/oc-one-guard/blob/main/docs/adr/0011-opencode-v2-adapter.md).

## License

Open source under the [MIT License](LICENSE). Copyright (c) humanfacetech.
