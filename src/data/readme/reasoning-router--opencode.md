# reasoning-router

Harness-agnostic adaptive reasoning effort for coding agents.

> **Status: alpha.** The packages below are a port of
> `opencode-jev-router`. Install them from npm as described in each package
> README.

## Alpha limitations

- **Tested with:** Node.js 24.x, OpenCode V2 2.0.18, Pi 1.0.4, and Codex CLI
  0.159.0 (through the proxy). Other versions may work but are untested.
- **Models:** GPT-6 Astra, Luna, Sol, and 6.1 Sol on Responses APIs, and the
  Claude models listed in [docs/behavior.md](docs/behavior.md) on Anthropic
  Messages. Other models are rejected locally. Pi routes Claude models only.
- **Classifiers:** the router asks the configured classifier and applies its
  answer; it makes no claim about how well any classifier picks effort for
  your workload.
- **Proxy:** for trusted local use only; see its
  [trust model](packages/proxy/README.md#trust-model).

Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## Intent

[`opencode-jev-router`](https://github.com/robertn702/opencode-jev-router) asks
[Jev](https://typesafe.ai/) how much reasoning each step of an OpenCode session
needs, then applies that effort to the outgoing model request without breaking
the prompt cache. It works, but only inside OpenCode (or behind its standalone
proxy).

`reasoning-router` generalizes that idea in two directions:

- **Any classifier.** Jev is one of several decision models that can classify
  how much reasoning a step needs, and more are being released. Which
  classifier to use is configuration, not a dependency: `reasoning-router`
  must not depend on Jev or any single provider.
- **Any harness.** The same routing should run inside other agent harnesses,
  not only OpenCode.

The packages are:

- [`@reasoning-router/core`](packages/core): the shared, harness- and
  classifier-independent router.
- [`@reasoning-router/opencode`](packages/opencode): the OpenCode V2 plugin.
- [`@reasoning-router/classifiers`](packages/classifiers): the
  classifiers (Jev, Cloudflare Clef, and Laya), selected by
  `classifier.provider`.
- [`@reasoning-router/pi`](packages/pi): the Pi extension (Claude models
  only, for now).
- [`@reasoning-router/proxy`](packages/proxy): the standalone
  Responses/Messages proxy (command `reasoning-router`).

See [docs/architecture.md](docs/architecture.md) for the problem statement,
the package plan, and the open questions, and
[docs/behavior.md](docs/behavior.md) for the router's wire behavior.

## Laya

[Laya](https://huggingface.co/convaiinnovations/laya) is an open-source,
Jev-compatible decision model that you run yourself. The router only calls
it over HTTP; it never installs or loads the model. Start Laya's
`laya-serve`, then point the router at it:

```bash
pip install "laya[serve]"
LAYA_HOST=127.0.0.1 LAYA_PRELOAD=1 laya-serve   # http://127.0.0.1:8000
REASONING_ROUTER_CLASSIFIER=laya reasoning-router
```

The default base URL is `http://127.0.0.1:8000`. See
[docs/environment.md](docs/environment.md) for a remote server, a key, or a
checkpoint.

## Development

Requires Node.js 24.x.

```bash
npm ci
npm run check   # typecheck + lint + test
```

See [AGENTS.md](AGENTS.md) for the full command list and repo conventions.

## Decisions so far

These are reversible:

- **npm workspaces** (`packages/*`).
- **Node 24, TypeScript, Vitest**, matching `opencode-jev-router`.
- **Biome** for lint and format. `opencode-jev-router` has no linter or
  formatter; Biome covers both with one dev dependency and no plugins.
  `noNonNullAssertion` is off, and `noExplicitAny` is off in tests, to keep
  ported code close to its source.
- **No type assertions.** Biome's `nursery/noUnsafeTypeAssertion` is an
  error, and `as const` is the only exception. Use annotations, `satisfies`,
  type predicates, or narrowing, and fix flagged code instead of suppressing
  the rule. The rule is in Biome's nursery, so its behavior may change in a
  minor release.
- **Source condition.** Package `exports` map the custom
  `@reasoning-router/source` condition to `src/*.ts`, so typecheck and tests
  run against source without a build; published consumers get `dist/`.
- **Changesets** with independent versions. Add a changeset to each PR
  that changes a package's published behavior. The release workflow opens a
  "Version Packages" PR, and merging it publishes to npm with provenance
  through npm trusted publishing (no npm token is stored).
- **The standalone proxy is its own package** (`@reasoning-router/proxy`,
  command `reasoning-router`), since it needs a classifier and core must not
  depend on one. The unscoped `reasoning-router` name stays free for a future
  umbrella CLI.
- **Zod for configuration only.** Plugin options, proxy environment
  variables, and classifier settings are Zod schemas, and their option types
  are inferred from those schemas. Core exports the shared schemas and `parseConfig`, which
  reports every problem in one error. Request bodies and streamed usage stay on
  `isRecord` narrowing so unknown provider fields pass through unchanged. Zod
  is core's only dependency.
- **The Pi extension uses Pi's virtual models.** It sets only the thinking
  level and lets Pi place effort, so it supports only Anthropic models that
  Pi gives mid-conversation effort. It reads the proxy's `REASONING_ROUTER_*`
  variables, since Pi extensions have no options, and stores the last
  classified effort in Pi's session for `previous` fallback.
- **Laya `baseUrl` is HTTPS, or plain HTTP to loopback only**, so the
  conversation summary never crosses a network unencrypted. The default is
  `laya-serve`'s `http://127.0.0.1:8000`, and the router doesn't send
  `max_len`.

## License

[MIT](LICENSE)
