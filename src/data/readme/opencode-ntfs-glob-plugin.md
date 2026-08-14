# opencode-ntfs-glob-plugin

Windows-only OpenCode plugin that replaces the `glob` tool with an NTFS-accelerated implementation and an `rg --files` fallback.

## Platform Support

This plugin is Windows-only. The package declares `os: ["win32"]` and `cpu: ["x64", "arm64"]`, so npm blocks installation on unsupported platforms.

The accelerated globbing backend is designed for local NTFS volumes and uses NTFS-native USN/MFT/file-ID APIs. On unsupported filesystems, network shares, insufficient-permission paths, USN journal rebuild or rollback cases, or when native volume APIs are unavailable, the plugin falls back to a slower best-effort traversal path.

This package does not provide macOS/Linux native acceleration, content grep acceleration, or a cross-platform filesystem index.

## Install

```powershell
opencode plugin opencode-ntfs-glob-plugin@latest --global
```

Alternatively, add it to OpenCode config:

```json
{
  "plugin": ["opencode-ntfs-glob-plugin@latest"]
}
```

## Tool Surface

The plugin registers only `glob`.

Arguments:

- `pattern`: glob pattern to match files.
- `path`: optional directory to search.

It does not register `grep` and does not accelerate content search.

## Development Verification

```powershell
bun run typecheck
bun test --max-concurrency=1 --timeout=120000
bun run build:ntfs-broker
bun run check:package
rtk cargo fmt --check --all
rtk cargo check -p opencode-ntfs-broker
rtk cargo test -p opencode-ntfs-broker
```

Packaged broker benchmarks must run serially, not concurrently with other benchmarks.

## License

UNLICENSED. No open-source license is granted by this package metadata.
