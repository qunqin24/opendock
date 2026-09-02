# Mnogovid Marketplace

This repository is the public distribution point for Mnogovid plugins.
It contains marketplace catalogs for Codex and Claude Code and host-specific
OpenCode configuration assets.

The marketplace itself is only a catalog: it does not scan repositories, send
data to an AI model, or install scanner programs. Those actions belong to the
installed plugin and remain consent-gated.

## Catalog

| Plugin | Status | What it provides | Primary users |
| --- | --- | --- | --- |
| `mnogovid-code-scanner` | Available | Workspace SAST, secrets, dependency, SBOM, and IaC assessment. | Codex, Claude Code, and OpenCode users. |
| `mnogovid-system-scanner` | Available | Linux host, container, service, port, firewall, and traffic assessment. | Codex, Claude Code, and OpenCode users. |

The Codex catalog is defined in [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json); the Claude Code catalog is in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).

## First run and later runs

Both plugins have one unified workflow. In Codex, mention the plugin or run
its command:

```text
@mnogovid-code-scanner
@mnogovid-system-scanner
```

On first use, the workflow checks its profile and installed adapters, then asks
before creating a missing profile. On later use, it validates that profile and
the available toolchain before asking for an analysis mode: adapters only,
adapters plus AI triage, or adapters plus AI triage and independent review.

## What the scanners do

The plugin discovers a workspace, selects relevant allowlisted scanner CLIs,
previews commands, and runs only the scanners the user explicitly approves.
Every completed workflow produces a redacted Markdown report at:

```text
<project>/.mnogovid/code-scanner/<unixtime>/result.md
```

`mnogovid-system-scanner` is the corresponding host-level plugin. It uses an
explicitly selected, private report directory; previews every fixed argv; and
requires separate approvals for each scanner, active probing of one authorized
IP, and bounded packet-metadata capture. Its report path is:

```text
<report-directory>/.mnogovid/system-scanner/<unixtime>/result.md
```

| Component | Responsibility | Explicitly does not do |
| --- | --- | --- |
| MCP server | Detects project technology, plans and runs allowlisted scanners, normalizes reports, writes Markdown reports, and prepares redacted AI payloads. | Execute arbitrary shell commands or call an LLM itself. |
| `security-orchestrator` agent | Owns the local-scan boundary: confirmation, preview, execution status, skipped-run reasons, and report storage. | AI triage, web advisory lookups, package installation, or code edits. |
| `security-triage` agent | Independently classifies supplied redacted findings and checks advisory evidence after approval. | Execute scanners or modify a workspace. |
| `security-scan` skill | Defines the evidence-first local scan workflow. | Bypass per-scanner and network approval. |
| `security-triage` skill | Defines redacted AI triage and advisory verification rules. | Treat model output as verified evidence. |

## Safety and consent

The following are independent decisions. A yes to one never implies a yes to
another:

1. Create a missing scanner profile.
2. Permit network-dependent scanners or advisory lookups.
3. Run each scanner process after its exact preview.
4. Share bounded, redacted findings with the host AI.
5. Request an independent agent review.

For the system scanner, active port scanning, local service probes, image
scanner databases, and traffic capture are additional independent consents. It
never installs a tool, invokes `sudo`, applies a fix, or writes a packet-capture
file.

Scanner commands use an allowlist and argv execution without a shell. Network
permission is a policy gate, not operating-system egress isolation. Reports
redact secret-like fields before they are written.

## Install

### Codex

```bash
codex plugin marketplace add https://github.com/BergaBruh/mnogovid
```

Then install the scanner plugin you need and start a new Codex task.

### Claude Code

```bash
claude plugin marketplace add https://github.com/BergaBruh/mnogovid
```

### OpenCode

Register either published package as a local MCP server; `npx` downloads it and
starts the bundled Python bridge automatically:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mnogovid-code-scanner": {
      "type": "local",
      "command": ["npx", "--yes", "@bergabruh/code-scanner"]
    },
    "mnogovid-system-scanner": {
      "type": "local",
      "command": ["npx", "--yes", "@bergabruh/system-scanner"]
    }
  }
}
```

No absolute paths or copied `.opencode` assets are needed.
The user still needs `python3` and any desired scanner executables installed
locally; the packages never install system software.

## Repository layout

```text
.agents/plugins/marketplace.json        Codex marketplace catalog
.claude-plugin/marketplace.json         Claude Code marketplace catalog
plugins/mnogovid-code-scanner/          Installable plugin
plugins/mnogovid-code-scanner/adapters/ Host-specific agent definitions
plugins/mnogovid-system-scanner/         Installable Linux host-scanning plugin
```

See the plugins’ READMEs for their scanner catalogs and implementation notes:
[code scanner](plugins/mnogovid-code-scanner/README.md) and
[system scanner](plugins/mnogovid-system-scanner/README.md).

## License

Both bundled plugins are licensed under Apache-2.0; see their respective
[`LICENSE`](plugins/mnogovid-code-scanner/LICENSE) files.
