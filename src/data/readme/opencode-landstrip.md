# landstrip

`landstrip` runs commands in an OS-level sandbox using Landlock on Linux,
Seatbelt on macOS, and AppContainer or restricted users on Windows.

## Quick start

Install:

```sh
npm install --save-dev @landstrip/landstrip-api
```

On Linux/macOS, save this as `policy.json`. Windows also needs explicit read
grants for the executable and its dependencies.

```json
{
  "filesystem": {
    "allowWrite": ["."],
    "denyWrite": ["**/.env", "**/*.pem"],
    "denyRead": ["~/.ssh"],
    "allowRead": ["~/.ssh/config"]
  },
  "network": {
    "allowNetwork": false,
    "allowLocalBinding": false
  }
}
```

```sh
npx landstrip run -p policy.json -- cargo test
npx landstrip check -p policy.json
npx landstrip doctor
```

See [landstrip(1)](packages/landstrip/man/man1/landstrip.1) for CLI options,
policy rules, and platform limits.

On Linux, commands always run in new user, PID, and mount namespaces with a
private `/proc`. Landlock and seccomp still enforce filesystem and network
policy. Execution fails closed when namespaces are unavailable; `check` and
`doctor` report the kernel error.

## Trap transport and denial reporting

On Unix, `landstrip run --trap FD|PATH` accepts an inherited open FD ≥3 or
an absolute Unix domain stream socket path. Landstrip connects to the listening
socket before sandbox setup; the sandboxed child never inherits the trap
transport. On Linux the stream is bidirectional, using the existing broker
query/response protocol, not merely passive monitoring.

Linux explicit read denials (`DenyMatch`, JSON `reason: "deny_match"`) are
reported even when the command exits 0.

The optional `macos.logTag` policy field tags Seatbelt denial logs for
correlation. It must be a nonempty string without double quotes, backslashes,
ASCII control characters (0x00–0x1f), or DEL (0x7f).

## Integrations

- [Node.js API](packages/landstrip-api/README.md)
- [OpenCode plugin](packages/opencode-landstrip/README.md)
- [Pi extension](packages/pi-landstrip/README.md)

## License

- Native sandbox: [LGPL-2.1-or-later](packages/landstrip/LICENSE).
- Node.js API and agent extensions: Apache-2.0; see each package's `LICENSE`.
