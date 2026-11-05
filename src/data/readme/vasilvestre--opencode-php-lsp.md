# opencode-php-lsp

PHP tools for OpenCode v2, backed by real language servers. OpenCode v2 runs no
language server of its own ([#38528](https://github.com/anomalyco/opencode/issues/38528)),
so the plugin starts one and answers from it.

```
php_diagnostics   templates/Admin/Page/_treeWithButtons.html.twig
templates/Admin/Page/_treeWithButtons.html.twig:5:21 error [symfony]: Route "app_page" requires parameter "slug".

php_definition   src/Fixture/PageFixture.php:29:12
/home/vsilvestre/projects/akawaka/smsp/src/Entity/Page.php:48:7
```

## Install

```bash
opencode plugin add @vasilvestre/opencode-php-lsp
```

```jsonc
{
  "plugins": ["@vasilvestre/opencode-php-lsp"]
}
```

Requires OpenCode 2 and `intelephense` on `PATH`:

```bash
npm install -g intelephense
```

## Tools

| Tool | Server | Answers |
| --- | --- | --- |
| `php_diagnostics` | Symfony Language Tools, else intelephense | Errors and warnings for one PHP or Twig file |
| `php_definition` | intelephense | Where the symbol at this position is declared |
| `php_references` | intelephense | Every use of the symbol across the project |
| `php_hover` | intelephense | Signature and docblock of the symbol |

## Symfony projects

`php_diagnostics` switches to `symfony-lsp` when the project root holds a
`.symfony-lsp.json` file. That server reads routes, services and Twig at
runtime, so it reports what intelephense cannot see: a missing route
parameter, a template that does not exist, a deprecated config key.

It boots your application, so the file says how:

```json
{
  "version": 1,
  "phpCommand": ["docker", "compose", "exec", "-T", "php", "php"],
  "containerProjectRoot": "/app"
}
```

Rules that bite:

- `docker compose exec` needs `-T`, or it allocates a tty and the bridge hangs.
- A symlink pointing outside the project breaks discovery. Add it to
  `excludePaths`, for example `[".codegraph"]`.
- `symfony-lsp` must be 0.21 or newer: older builds ignore `.symfony-lsp.json`
  and run the host `php`.
- The first call per project costs about 6 seconds, because the app boots and
  the Twig index is built. The process stays alive afterwards, so every later
  call answers from memory.

## Known limits

- The Symfony server answers diagnostics only. Definition, references and hover
  come from intelephense, which does not read Twig.
- The container named in `phpCommand` must be running before the first call.
- One server process per project root, held for the life of the session.
- PHP 8.5 deprecation notices from an older Symfony print on every boot. They
  do not stop the index.

## Test

```bash
npm test
```

The suite uses a fake language server, so it needs no PHP install.

## License

MIT. See `LICENSE`.
