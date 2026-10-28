# OpenCode Kiro Auth

Development-stage OpenCode provider using the official `kiro-cli` ACP interface, with tools executed by OpenCode. Intended public package: `@vidit19sharma/opencode-kiro-auth` (not yet published to npm). Source: https://github.com/vidit19sharma/opencode-kiro-auth.

## Install and authenticate

See [installation.md](installation.md) for the current **local build + `file://` plugin entry** setup. Initial support is **macOS/Linux only**, with Node.js **>=22.13**; ACP cleanup uses POSIX process groups. A Windows Kiro installer does not establish Windows plugin support.

1. Install the official Kiro CLI and run `kiro-cli login` in a terminal.
2. Build this checkout and register its local plugin entry in OpenCode.
3. Run `opencode auth login --provider kiro`, select the CLI-login method, and enter **`kiro-cli-managed` at both the registration text prompt and the additional API-key prompt**. This is a non-secret registration marker, not a Kiro API key.
4. Restart OpenCode **after registration** so its auth loader runs, then select a `kiro/` model.

Explicit OpenCode registration is required. Startup does not seed `auth.json`, scrape tokens, or overwrite credentials. In the inspected OpenCode TUI, `/connect` bypasses custom API-method `authorize`; request-side CLI identity checks are therefore required. Terminal prompt sequencing is source-verified, not interactively exercised by G2.

## Architecture

```text
OpenCode provider request → local bridge → kiro-cli ACP (explicit v2)
OpenCode tool execution  ← authenticated loopback MCP held call
```

The provider's dummy API URL is a routing placeholder: no backend traffic is sent to it. There **is** local MCP HTTP: a per-process listener on an ephemeral loopback port, with authenticated scope endpoints. The bridge design uses one Kiro child per active session/agent scope; observed process cost was roughly **100–250 MB each**, not a guaranteed bound.

MCP tool calls remain held across OpenCode tool-result turns so OpenCode executes the tools and Kiro continues with their results. Current system/developer instructions are supplied through a scratch resource prompt under the Kiro harness; this does not replace Kiro's own harness. Native session artifacts remain Kiro-managed; the plugin owns only its scratch directories and cache, and does not bulk-delete Kiro session storage.

The scope/session map is **in memory**. After a plugin/OpenCode restart, the bridge reconstructs from the text history supplied by OpenCode; it does not promise disk-backed native-session resume. Model/history divergence or incompatible instruction/schema changes can also trigger reconstruction: this is approximate replay, not guaranteed exact native transcript semantics. Same-scope native session reuse depends on retained in-memory state and a safe quiescent boundary.

Models come dynamically from `kiro-cli chat --list-models --format json`. The catalog uses a 24-hour cache with stale-while-refresh behavior; without a usable catalog/cache it falls back to `auto`. Cache: `$XDG_CACHE_HOME/opencode-kiro-auth/models.json` (absolute XDG path), otherwise `~/.cache/opencode-kiro-auth/models.json`.

## Development status and limits

- Research baseline: **Kiro CLI 2.33.1**, with **v2 explicitly selected**, not the CLI default. OpenCode v1 evidence uses runtime **1.19.1** and plugin/SDK types **1.19.4**; broader compatibility is unverified.
- [G1](docs/gate-g1-kiro.md) verified authenticated endpoint reattachment, refreshed tools/schema, and native session load after a quiescent turn. This is probe evidence, not proof of the finished plugin; pending-tool resume and exhaustive isolation were not established by G1.
- Native acceptance passed with **two Haiku 4.5 ACP prompts**: a real secret tool result continued the same prompt, then a remembered code survived a quiescent schema change/native reload, with owned-resource cleanup. This predates the final cancellation-only fix.
- Current-tree packed QA passed **ten checks on real OpenCode 1.19.1 with a fake Kiro executable**, including exact image file-part delivery in one ACP prompt and parked host-tool abort → one ACP cancel, one MCP gate release, child exit, and next-message success in the same scope without disposal. See [image evidence](docs/image-input.md) and [integration QA](docs/integration-qa.md). The earlier cancellation delta received independent approval; no independent image review, publication or vendor approval is claimed. Terminal prompt sequencing and timeout settings remain source-verified only; elapsed long calls/full UI rendering were not exercised.
- Image input supports **PNG/JPEG/GIF/WebP base64 data attachments**, at most **5 MiB decoded per image / 10 MiB per request**. The bridge is **offline-verified through real OpenCode + fake Kiro** and confirmed with **one native Haiku 4.5 prompt (Kiro CLI 2.34.2, ACP v2)** that correctly described the test image; this does not establish broader version compatibility. Missing image capability fails closed; external URLs are never fetched. The catalog does not report per-model vision. Image bytes go to Kiro's backend like other prompt content. Historical images are not resent on reconstruction. See [image scope](docs/image-input.md).
- Output remains text-only; no PDF/audio/video input, thought events, effort variants, native token accounting, or API-key-only authentication are promised.
- Kiro credits and context-percentage metadata are not tokens or dollar prices. Missing native usage is omitted; OpenCode may display **zero for unknown usage**.
- Model output limits exposed by the plugin are **local accounting reserves**, not vendor-reported maximum output sizes. Zero displayed price does not mean free inference.
- Long tools have a configured two-hour ACP/MCP bound, not unlimited duration. Host timeout overrides can shorten it. A prior Kiro probe exceeded 120 seconds; full OpenCode long-call behavior remains unverified.

Tests are offline-first: `npm test` invokes [`scripts/test-offline.sh`](scripts/test-offline.sh), which isolates HOME/XDG paths and uses offline fixtures. The retained image-input log records 174 Bun tests passing plus CLI checks. QA artifacts default to the checkout parent's `.qa/kiro/` (`auth_setup/.qa/kiro/` here); `KIRO_QA_ARTIFACTS` overrides the parent artifact base. See [image evidence](docs/image-input.md), [QA evidence](QA-EVIDENCE.md) and [integration QA](docs/integration-qa.md). Any further live smoke requires fresh explicit authorization; historical [plan](docs/implementation-plan.md) budgets are not new authorization.

## Policy

Using the official ACP interface does not establish vendor approval of this integration or permission under every account/subscription plan. Review the [official Kiro FAQ](https://kiro.dev/faq/) and current terms for your use; policy compatibility remains uncertain. This project does not scrape tokens or call private CodeWhisperer APIs.

MIT licensed; see [LICENSE](LICENSE).
