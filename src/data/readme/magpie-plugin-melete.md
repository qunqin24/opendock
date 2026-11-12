# Melete for Magpie

English | [简体中文](README.zh-CN.md) | [Español](README.es.md)

Look back at how you and AI work together.

Choose DSH or Codex in Magpie and start a review. The selected agent reads its own history through restricted tools; Melete presents observations as cards and checks their citations. You do not need to select individual sessions or enable Magpie conversation recording.

Currently each review uses one source, DSH or Codex. Support for other agents and combined reviews is planned for future updates.

## Install and use

Install from npm:

```sh
magpie plugin add magpie-plugin-melete
```

You can also install a development copy from a local folder with `magpie plugin add /path/to/magpie-plugin-melete`.

Open **Melete Debrief** in Magpie's sidebar, choose an agent and time range, optionally enter an intention, then start. You can leave the page and return while it runs. Stop affects only the current review.

Magpie and the chosen agent must be installed. DSH uses its headless profile's model configuration; Codex uses its default configuration. Melete does not change them and needs no separate Melete API key. If authentication or quota is unavailable, first restore normal use in the agent.

Node.js 24+ is required; Magpie's plugin host runs Bun. Tested on macOS with Magpie 0.1.3812 and 0.1.3838 and Codex CLI 0.167.0-alpha.3.2. Other platforms, remote Magpie and mobile access have not been verified.

## Data and model processing

- Melete operates no server, has no account, and collects no data or telemetry. Its interface service listens only on `127.0.0.1` (default port 3497).
- Reviews consume the selected agent's model quota. Relevant history is sent by that agent to its configured model; the provider and whether Magpie is involved depend on the agent's configuration. Inference is not necessarily offline.
- Only the selected source and requested range are considered. The review agent receives no shell, file-writing, web-browsing or delegation tools; instructions inside history are treated as material.
- At most 24 recent sessions are included, with 6,000 characters per message. Files above 64 MiB are skipped and a review stops after eight minutes. The agent decides which pages to read. Results disclose actual coverage, omissions and truncation; complete coverage is not guaranteed.
- DSH reads version 0/4 JSONL or zstd records; Codex reads accessible rollout JSONL under `sessions` and `archived_sessions`. Encrypted and cloud-only history is not read. Unsupported records are skipped and reported.
- Citations must match records actually read. Unverified observations are excluded. An agent's explanation of itself is one possible reading.

## Saving, export and deletion

Settings, reviews, job state, source-run files and user-initiated exports are stored under `~/.melete/magpie/`, separately from Melete for DSH, with files normally readable only by the current user.

Export a complete offline HTML card or an image from the review page. Exports omit internal session IDs, paths and full context; check the text for identifying details before sharing. Deleting a review does not delete source history. “Delete all reviews and exports” removes this plugin's reviews and exports, not the original agent's history or runtime records. Temporary source-run records are in `private/` and are not read as review history. Uninstalling does not automatically erase user files; the folder can be removed separately.

## Interface, development and license

The card interface supports light and dark themes and Simplified Chinese and English. It covers your use of AI, the AI's conduct and the social context, with evidence, possible readings and an open question. Small experiments require an intention. Multi-agent aggregation, the method library, private letters and saved Magpie conversation input are not implemented.

Run `npm test` for automated tests. `node test/real-runtime.mjs dsh` and `node test/real-runtime.mjs codex` use synthetic histories but call real agents and models and consume quota.

Code: Apache-2.0. The bundled Melete Lens: CC BY 4.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE). This is an early version; community listing is pending.

## Other Melete versions

- [Melete Skill](https://github.com/yancanny/melete-skill): for AI tools that support Skills.
- [Melete DSH](https://github.com/yancanny/dsh-plugin-melete): the DeepSeek Harness plugin.
