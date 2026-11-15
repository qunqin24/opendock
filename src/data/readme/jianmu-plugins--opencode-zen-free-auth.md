# Jianmu Plugin Community

**English edition** · [简体中文](README.zh-CN.md)

A community-maintained collection of plugins for Jianmu. The catalog is [`registry.json`](registry.json); plugins live in [`packages/`](packages/).

- Maintainer: DamonZS · [1032428220@qq.com](mailto:1032428220@qq.com)
- Issues and proposals: use the issue tracker of the Jianmu community repository.
- License: the repository root MIT license applies to Jianmu-authored collection material. Individual packages and vendored components may carry their own licenses; consult each package's `LICENSE`, `NOTICE`, and `THIRD-PARTY-NOTICES.md`.

## Development

- Use the `@jianmu-plugins/` npm scope for new Jianmu package names. Keep a stable descriptive package name and version.
- Include a package README describing purpose, supported platforms, setup, required permissions, authentication, data sent to third parties, limitations, support contact, and how to disable/remove the plugin.
- Keep dependencies minimal and locked. Do not commit credentials, tokens, private keys, personal data, built secrets, or local configuration.
- Request only the access required for the documented feature. Disclose telemetry, network calls, filesystem access, subprocesses, and background services.
- Use vendor-supported sign-in/API flows. Do not bypass access controls, harvest credentials, evade usage limits, or misrepresent a vendor's service.
- Test the exact package contents and report commands/results. Cover success, errors, refresh/retry behavior, removal, and supported platforms; do not claim untested behavior.
- Preserve compatibility identifiers and user data. A package rename or provider change must include a tested migration; do not silently change IDs, saved keys, environment variables, or protocol headers.

## Catalog inclusion

A package is considered for `registry.json` when:

1. Its public source and responsible maintainer are identifiable.
2. The package is published and installable under `@jianmu-plugins/`, unless maintainers explicitly approve a documented exception.
3. It has a license compatible with redistribution and a user-facing README meeting the documentation requirements above.
4. It has a clear Jianmu use case and sufficient test evidence for reviewers to assess its core behavior.
5. The registry entry's package spec, display name, type, provider IDs, replacement mapping, and English/Chinese summaries match the package and its source.
6. It does not duplicate another listing or claim another publisher's package/provider identity.

### Automatic listing

A pull request that only adds entries to `registry.json` is merged without a
person when all of these hold; the `auto-list` workflow does it:

1. It changes nothing but `registry.json`, and only adds entries — no existing
   entry is changed or removed.
2. `bun scripts/check.mjs` passes.
3. Every added package is published and resolvable on npm
   (`npm view <package> version`).
4. It comes from this repository and either from a member's account or carries
   the `auto-list` label a maintainer set.

Anything else — code under `packages/`, a changed or removed entry, a new
scope — is reviewed by a person. Plugins run with the user's sign-ins, so code
and permission changes are never merged automatically. GitHub's topic
discovery is not an automatic listing: those plugins stay **Unreviewed**
until someone lists them here.

### Automatic publishing

Merging a version bump in `packages/*/package.json` runs the publish workflow:
tests, the registry check, then `scripts/publish.sh`, which publishes only
versions npm doesn't have yet. It needs the repository secret `NPM_TOKEN` — an
automation token, or a granular token with bypass 2FA allowed, in the
`@jianmu-plugins` scope.

Maintainers review proposed changes before merging. Automated checks validate structure; they do not certify a package as safe. Inclusion is not a security audit or a guarantee about future releases. Jianmu's automatic discovery is not an approval signal. To report a vulnerability, use a private reporting channel when available and do not disclose exploit details publicly.

## Submit a change

Submit a focused change covering one package or a closely related migration. Include its source URL, exact package name/version, license, maintainer, supported platforms, permissions, data handling, test evidence, and matching English/Chinese registry summaries. For identity changes, explain how old installs and user data remain compatible.

### Add a plugin to the catalog

1. Add the plugin source under `packages/<plugin-id>/` — `bun scripts/new.mjs <name> --kind provider|middleware|agent|page|tools` writes the skeleton, its registry entry and a test that already passes `bun scripts/check.mjs`. Then fill in the implementation and a user-facing README, and keep its own license and third-party notices.
2. Publish the package as `@jianmu-plugins/<package>` to the configured npm registry. Do not publish from this local snapshot; maintainers must first configure the destination repository and npm trusted publisher/credentials.
3. Add one entry to `registry.json` with the exact new package spec, display name, provider IDs/type, and both `summary.en` and `summary.zh`. Include `community: true` only for listings maintained in this catalog.
4. Run `bun scripts/check.mjs` and the relevant package tests. In the PR, include the test commands/results and explain any old package-spec or metadata compatibility.
5. Open a PR against the Jianmu community repository. A maintainer reviews the code, package identity, permissions/data behavior, tests, license compatibility, and registry diff before merging.

Because this source folder is currently a local snapshot without Git metadata, it cannot submit a PR itself. First place the reviewed changes in the configured Git repository; package publication and catalog merge are separate steps.

## Compatibility note

The repository retains legacy plugin metadata and protocol identifiers where existing hosts or installed packages depend on them. Jianmu metadata and new package names may be added alongside legacy identifiers; changing the public package name alone does not migrate an installed user's saved plugin state.
