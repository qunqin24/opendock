# opencode-git-integrity

An [OpenCode](https://opencode.ai) v2 plugin that stops coding agents from **disabling, bypassing, or tampering with Git integrity controls** — hooks, signing, and the config that provides them.

Agents under pressure reach for the same escape hatches: `--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false`, `core.hooksPath` redirection, `GIT_CONFIG_*` env injection, `HUSKY=0`, editing `.git/hooks/*`… This plugin makes those decisions **hard** instead of hoping the model behaves. It is deliberately *not* a destructive-command guard (`reset --hard`, force-push, `clean` are out of scope — use a tool like [ptuf](https://docs.rs/crate/ptuf) for those domains; the two compose well).

## How it works

Decisions are made **semantically, by invariant** — never by substring:

- shell commands are parsed (POSIX / PowerShell / cmd dialects, selected automatically) into a git argument model that knows `-n` means `--dry-run` on `push`, `--no-stat` on `merge`, and *only* `--no-verify` on `commit`; that `git -c k=v commit` is config but `git commit -c <sha>` is not; and that a commit *message* containing `--no-verify` is data, not a flag.
- enforcement happens through OpenCode's native permission pipeline (`permission.evaluate`): the guard sets **allow / ask / deny** with a token-precise explanation, so `ask`-level findings surface as real approval prompts.
- the complete shell script is retained per tool call and checked alongside permission resources, which can omit PowerShell environment assignments or truncate arguments. Dry-run commands are checked by the same policy.
- Code Mode (`execute`) has no permission pipeline (verified empirically) — it is covered separately by analyzing spawn calls in the submitted JavaScript.

Every equivalent weakening of an invariant produces the same decision, whichever of these channels it arrives through:

| Channel | Examples |
|---|---|
| CLI flags | `git commit --no-verify`, `git push --signed=false`, `git tag --no-sign` |
| One-shot config | `git -c core.hooksPath=/dev/null commit`, `--config-env` |
| Env injection | `GIT_CONFIG_COUNT/_KEY_0/_VALUE_0`, `GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_GLOBAL=/dev/null`, `$env:`/`set` forms |
| Persistent config | `git config commit.gpgsign false` (all scopes, set/unset) |
| Hook managers | `HUSKY=0`, `LEFTHOOK=0`, `SKIP=…`, `HK=0`, `HK_SKIP_*`, `HK_FILE`, `hk install --global` |
| Filesystem | `rm`/redirect/`Set-Content`/`chmod -x` on `.git/config*`, `.git/hooks/**` (worktrees & submodules included) |
| Aliases & plumbing | alias creation with violating expansions; `commit-tree`/`update-ref`/`hash-object -w` (ask) |

Signing invariants are **gated on effective configuration** — if a repo never signs commits, `--no-gpg-sign` passes. Manager env vars only matter when that manager is actually in use in the repo. A drift check catches effective-config weakening that happened through channels the guard didn't see.

## Install

User scope (a repository must not be able to ship its own disabled guard):

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugins": [
    { "package": "@seanlatimer/opencode-git-integrity" }
  ]
}
```

Optionally add the static backstop for the edit tool and Code Mode (removing Code Mode entirely is the strongest option — the plugin still analyzes it, but config-deny cannot be unhooked by anything the agent controls):

```jsonc
{
  "permissions": [
    { "action": "edit", "resource": ".git/*", "effect": "deny" },
    { "action": "execute", "resource": "*", "effect": "deny" }
  ]
}
```

## Configuration

`~/.config/opencode/git-guard.json` (or plugin `options`); project files may only *raise* strictness:

```jsonc
{
  "$schema": "https://unpkg.com/@seanlatimer/opencode-git-integrity/git-guard.schema.json",
  "failMode": "closed",              // deny unparseable git-looking commands
  "policy": {                        // invariant → allow | ask | deny
    "commit.hooks.must-run": "deny",
    "tag.signing.must-stay-enabled": "ask",
    "hookmanagers.must-run": "deny"
  },
  "protectPaths": [".git/**"],
  "protectSampleHooks": false,
  "strictAliases": false
}
```

### Human escape hatch (permits)

The guard only sees agent tool calls — a human terminal is always untouched. Inside a session:

- **Env permit** (OpenCode's process env; the agent cannot self-grant): `OPENCODE_GIT_GUARD_PERMIT=hooks,signing`
- **One-shot command**: `/git-guard-permit signing` — arms a 10-minute permit consumed by the next matching decision.

Domains: `hooks`, `signing`, `config`, `files`, `managers`, `plumbing`, `scope`, `dynamic`, `parse`, `all` — or exact invariant IDs.

## Honest boundary

**This is not an OS-level sandbox and not a hostile-code security boundary.** We do not claim to stop:

1. Indirect execution (`node evil.js`, `python -c "os.system('git …')"`, downloaded binaries, make/npm scripts, git aliases defined in files we can't attribute) — and **obfuscated Code Mode JS**: the `execute` tool has *no* permission pipeline, so our mitigations are config-deny catalog removal + `execute.before` code analysis; a deliberately obfuscated `Bun.spawnSync("g"+"it", …)` remains a documented residual gap.
2. `git` invoked with an absolute path + `--git-dir` pointing at a consistent attacker-controlled fake repository (flagged ask-level when outside the worktree, not denied).
3. Commits via plumbing (`commit-tree`+`update-ref`) — detected as *suspicious* (ask-level), denied only if configured, because legitimate tooling uses plumbing (OpenCode itself does).
4. Remote commits via MCP tools (GitHub MCP) — permission-config problem, out of scope v1.
5. The agent asking the *user* to run the bypass in their terminal (phishing the human).
6. Anything after the human escape hatch is armed (deliberately human-only).
7. Non-git-CLI writes to `~/.gitconfig` (detected when via `git config --global` or listed file commands; free-form program writes are out of scope).

## Development

```sh
npm test                  # unit + corpus (210 cases) + fuzz-equivalence
npm run test:integration  # live opencode scenarios (model quota) — optional
```

- `corpus/corpus.jsonl` — versioned decision corpus (substring guards fail it)
- `test/fuzz.test.ts` — decision-equivalence fuzzing (deterministic seed)

Requires OpenCode v2.0.22+ (plugin API re-verified against each pinned release).

## License

[MIT](./LICENSE)
