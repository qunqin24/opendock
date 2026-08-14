# opencode-sonar-fix

[![npm version](https://img.shields.io/npm/v/opencode-sonar-fix.svg)](https://www.npmjs.com/package/opencode-sonar-fix)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An [OpenCode](https://opencode.ai) plugin that fetches **NEW** SonarQube
issues introduced by the current pull request and lets the agent fix them
automatically — then commits and pushes so your PR is updated.

Comes with:

- A custom tool `sonar_pr_issues` (registered by the plugin)
- A `/sonar-fix` slash command that orchestrates the full flow

---

## Install

### 1. Add the plugin to OpenCode

Edit `~/.config/opencode/opencode.json` (create if missing):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-sonar-fix"]
}
```

OpenCode will `bun install` the package automatically on next startup.

### 2. Install the `/sonar-fix` slash command

The slash command is shipped as a Markdown template. OpenCode can't
auto-register slash commands from npm packages, so install it once with
either approach:

**Option A — one-liner (recommended):**

```bash
mkdir -p ~/.config/opencode/commands && \
  curl -fsSL https://raw.githubusercontent.com/azazali30/opencode-sonar-fix/main/commands/sonar-fix.md \
  -o ~/.config/opencode/commands/sonar-fix.md
```

**Option B — copy from `node_modules`:**

```bash
mkdir -p ~/.config/opencode/commands
cp ~/.cache/opencode/node_modules/opencode-sonar-fix/commands/sonar-fix.md \
   ~/.config/opencode/commands/sonar-fix.md
```

### 3. Configure SonarQube credentials

Create `~/.config/opencode/sonar.json` (chmod 600):

```json
{
  "url": "https://sonarqube.mycompany.com",
  "token": "squ_xxxxxxxxxxxx"
}
```

```bash
chmod 600 ~/.config/opencode/sonar.json
```

Generate the token at `<url>/account/security/`. Use a service-account
token with **Browse** permission on the projects you care about.

### 4. (Per-project) declare the Sonar projectKey

In each repo where you want to use this:

```bash
mkdir -p .opencode
echo '{ "projectKey": "<your-sonar-project-key>" }' > .opencode/sonar.json
git add .opencode/sonar.json
git commit -m "chore: add Sonar config for /sonar-fix"
```

### 5. Install the GitHub CLI

PR auto-detection uses `gh`:

```bash
sudo apt install gh    # or brew install gh
gh auth login
```

(Or pass the PR number explicitly each time: `/sonar-fix 1234`.)

---

## Use

On a branch with an open PR, inside OpenCode:

```
/sonar-fix
```

The command will:

1. Call `sonar_pr_issues` to fetch every NEW issue on the PR.
2. Print a summary (counts by severity + Sonar UI link).
3. **Ask you which severities to fix** (default & recommended:
   `BLOCKER` + `CRITICAL` + `MAJOR`; deselect or add `MINOR` / `INFO`).
4. Plan fixes via the todo list.
5. Edit offending files with minimal, behavior-preserving fixes.
6. Run lint/test/build if present and fix any regressions.
7. Commit `fix: address SonarQube issues on PR #N` and push.

---

## Configuration reference

Settings are resolved in this order, **first hit wins**:

1. Environment variable (e.g. `SONAR_URL`)
2. Project file: `<repo>/.opencode/sonar.json`
3. Global file: `~/.config/opencode/sonar.json`

| Env var               | sonar.json key | Notes                                           |
|-----------------------|----------------|-------------------------------------------------|
| `SONAR_URL`           | `url`          | Required                                        |
| `SONAR_TOKEN`         | `token`        | Required - prefer the global file (chmod 600)   |
| `SONAR_PROJECT_KEY`   | `projectKey`   | Required (per-project)                          |
| `SONAR_SEVERITIES`    | `severities`   | Comma list `BLOCKER,CRITICAL,MAJOR,MINOR,INFO`  |
| `SONAR_TYPES`         | `types`        | Comma list `BUG,VULNERABILITY,CODE_SMELL`       |
| `SONAR_PAGE_SIZE`     | `pageSize`     | Default `500`, max `500`                        |
| `SONAR_PR_KEY`        | -              | Override auto-detected PR number                |
| `SONAR_BRANCH`        | -              | Override branch in error messages               |

A sample `sonar.json` lives in [`examples/sonar.json`](./examples/sonar.json).

---

## How "new" issues are scoped

The plugin calls Sonar's `/api/issues/search` with `pullRequest=<n>&resolved=false`,
which by definition returns only issues **introduced or carried by the PR
analysis** (not pre-existing tech debt on the base branch). So `/sonar-fix`
will never try to fix unrelated old issues.

---

## Troubleshooting

**`Missing Sonar config: set env SONAR_URL ...`**

The plugin couldn't find `SONAR_URL` (or `url`) in any config source.

- Make sure `~/.config/opencode/sonar.json` exists and has `url`.
- Make sure your repo has `<repo>/.opencode/sonar.json` with `projectKey`.
- Restart OpenCode (commands and plugins are loaded once at startup).

**`Could not auto-detect PR number for branch "..."`**

The `gh` CLI isn't installed or authed. Either install + auth `gh`
(`sudo apt install gh && gh auth login`), or pass the PR number explicitly:
`/sonar-fix 1234`.

**`/sonar-fix` doesn't appear after install**

Restart OpenCode — slash commands are loaded only at startup. Verify with:

```bash
ls ~/.config/opencode/commands/sonar-fix.md
```

**Token rotation**

Update the value in `~/.config/opencode/sonar.json` and restart OpenCode.

---

## Rules the agent follows

The slash command's prompt enforces:

- Only **NEW** issues on the PR are fetched.
- **No suppression** — `// NOSONAR`, `@SuppressWarnings`, etc. are explicitly
  banned. Real fixes only. False positives are reported, not silenced.
- **No behavior changes** beyond what the rule requires.
- **No amend, no force-push.** Updates always land as a new commit on top
  of the branch.

---

## Develop / contribute

```bash
git clone https://github.com/azazali30/opencode-sonar-fix.git
cd opencode-sonar-fix
npm install
npm run build      # compiles src/ -> dist/
npm run typecheck
```

To test changes locally before publishing:

```bash
npm pack                                            # produces a .tgz
# in another OpenCode-using repo, install the tarball:
# (set "plugin": ["/abs/path/to/opencode-sonar-fix-X.Y.Z.tgz"] in opencode.json)
```

PRs welcome at <https://github.com/azazali30/opencode-sonar-fix>.

---

## License

[MIT](./LICENSE) © Md Azaz Ali
