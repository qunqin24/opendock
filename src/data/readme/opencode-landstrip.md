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
npx landstrip capabilities
npx landstrip doctor
```

See [landstrip(1)](packages/landstrip/man/man1/landstrip.1) for CLI options,
policy rules, and platform limits.

On Linux, commands always run in new user, PID, and mount namespaces with a
private `/proc`. Landlock and seccomp still enforce filesystem and network
policy. Execution fails closed when namespaces are unavailable; `check`,
`doctor` and `capabilities` report the kernel error.

## Integrations

- [Node.js API](packages/landstrip-api/README.md)
- [OpenCode plugin](packages/opencode-landstrip/README.md)
- [Pi extension](packages/pi-landstrip/README.md)

## License

- Native sandbox: [LGPL-2.1-or-later](packages/landstrip/LICENSE).
- Node.js API and agent extensions: Apache-2.0; see each package's `LICENSE`.
