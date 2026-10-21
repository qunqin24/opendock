<h1><img src="https://raw.githubusercontent.com/expiracy/gigacode/340b28d712fee4e5078cb7901f7e86c92b701bd9/docs/assets/logo.svg" alt="GigaCode" width="460"></h1>

Multi-agent workflows for **OpenCode 2**. Select **GigaCode**, ask for an implementation, and it coordinates investigation, implementation, independent review, and configured checks automatically.

- **Start with a task:** no separate plan or run command is required for an implementation request.
- **Plan first when you want:** explicitly request a proposal and decide when to execute it.
- **Follow the work:** inspect worker sessions, findings, model choices, and command evidence.
- **Keep control:** pause, resume, cancel, export, and configure models from native popups.

![OpenCode with GigaCode selected as the active agent](https://raw.githubusercontent.com/expiracy/gigacode/340b28d712fee4e5078cb7901f7e86c92b701bd9/docs/assets/workspace.png)

*GigaCode 0.1.0-beta.1 selected in OpenCode 2.0.28, using a disposable project and scripted test provider. [Capture details](https://github.com/expiracy/gigacode/blob/340b28d712fee4e5078cb7901f7e86c92b701bd9/docs/assets/README.md).*

## Install

```sh
npm install --global opencode-gigacode@latest
gigacode setup --global
```

This README describes **0.1.0**. `@next` follows the prerelease channel; `@latest` follows the default release. They can point to different versions. Restart OpenCode, connect a model with tool support, and select **GigaCode** beside **Build** and **Plan**.

| Requirement | Supported |
| --- | --- |
| Runtime | Bun **1.3.10+**, including when installed with npm. |
| OpenCode host | Exactly **2.0.25**, **2.0.26**, or **2.0.28**. |
| Models | Connected tool-capable model; roles inherit your conversation's model and variant by default. |
| npm package / command | [`opencode-gigacode`](https://www.npmjs.com/package/opencode-gigacode) / `gigacode`. |

- `@next` follows the prerelease channel; [check npm](https://www.npmjs.com/package/opencode-gigacode?activeTab=versions) for published versions.
- Setup registers the installed package, adds its agents, enables delegation depth of at least two, and backs up changed configuration. Keep the global package installed.
- Run `gigacode doctor` for local diagnostics. See [installation, profiles, updates, and removal](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/installation.md).

## Choose how to work

| Path | Start with | What happens |
| --- | --- | --- |
| **Automatic GigaCode agent** | Select **GigaCode** and ask: “Implement resumable uploads and tests.” | Investigates or designs as needed, implements, reviews, and runs configured checks without a separate plan-to-run handoff. |
| **Explicit plan first** | `/gigacode plan Add resumable uploads` or ask GigaCode to “Plan this; stop at a proposal.” | Stops at a saved proposal. Inspect it, then choose **Run saved proposal** when you want implementation. |

OpenCode's separate **Build** and **Plan** agents remain available. Native permission prompts and requests for missing information still apply in GigaCode mode. General questions and settings requests do not start implementation workflows.

## Inspect and configure

| Command | Purpose |
| --- | --- |
| `/gigacode status` | Open workflows: inspect evidence, run a saved proposal, open worker sessions, pause, resume, cancel, or export. |
| `/gigacode config` | Open guided project/global settings for models, checks, prompts, and limits. |
| `/gigacode plan <task>` | Create a planning-only workflow. |

![GigaCode workflow controls as a popup inside OpenCode](https://raw.githubusercontent.com/expiracy/gigacode/340b28d712fee4e5078cb7901f7e86c92b701bd9/docs/assets/workflows.png)

*Select a workflow and press Enter or Actions (Ctrl+A). Run saved proposal confirms the objective and exact revision before checking workspace freshness.*

![GigaCode settings as a popup inside OpenCode](https://raw.githubusercontent.com/expiracy/gigacode/340b28d712fee4e5078cb7901f7e86c92b701bd9/docs/assets/settings.png)

*Full-app settings view from an isolated example profile.*

- Unconfigured checks discover existing `test`, `typecheck`, and `lint` package scripts. Configure project checks in `gigacode.json`; an explicit empty list disables discovery.
- Execution without a required machine check ends as **partial**. A model's claim cannot establish verified success.
- UI failures show native error notifications or error dialogs; workflow failures remain visible in saved state and conversation feedback. Inspect state before retrying a failed action.
- Switching agents does not cancel active work. Finish or cancel the workflow before editing directly in that conversation.

## Permissions and limits

- Workers use native sessions and permission checks. The version-sensitive execution bridge bypasses outer tool hooks; assess compatibility with other plugins separately.
- Multiple workers consume model requests and context. Default bounds: **4 workers**, **2 runs per project**, **24 attempts per run**, **45 minutes active run time**. These are not billing ceilings; no paid fallback model is selected automatically.
- State and exports live in the canonical project's **`.gigacode/`**. Exclude it from Git and review exports before sharing. Inspection is bounded and is not private model reasoning or a complete event replay.
- Writers are serial by default. Optional parallel writers require a clean committed Git root and disjoint plain UTF-8 additions/modifications. See [workflow limits and recovery](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/commands.md).

## Hosts, guides, and support

- **OpenCode:** CI covers package installation on Ubuntu, macOS, and Windows; native Linux integrations cover all three supported host versions. Native macOS was also checked locally; native Windows is outside the integration matrix.
- **OpenChamber 2.2.0:** conversational GigaCode use works with a supported bundled host. Terminal popups and deterministic command results have no desktop viewer; use **Settings → Plugins → Options (JSON)** or `gigacode.json`. [OpenChamber settings](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/configuration.md#openchamber-settings).
- [Models and configuration](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/configuration.md) · [Commands and recipes](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/commands.md)
- [Development and tagged releases](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/development.md) · [Architecture](https://github.com/expiracy/gigacode/blob/v0.1.0/docs/architecture.md) · [Changelog](https://github.com/expiracy/gigacode/blob/v0.1.0/CHANGELOG.md)
- [Report an issue](https://github.com/expiracy/gigacode/issues) with Bun/OpenCode versions and redacted error or run evidence.

Independent project; not affiliated with Anthropic, OpenCode, OpenChamber, or OpenUltraCode. Licensed under [MIT](https://github.com/expiracy/gigacode/blob/v0.1.0/LICENSE).

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/expiracy)
