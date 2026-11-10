# magpie-websearch

<p align="center">
  <img src="assets/magpie-websearch-hero.png" alt="magpie-websearch — One plugin. Many sources." width="100%">
</p>

[中文说明](README.md) | [English](README.en.md)

Additional web search APIs for [magpie](https://usemagpie.ai). Once installed, the APIs appear in **Settings › Models › Web search**, where Magpie manages keys, on/off switches and request order.

The plugin registers **21 search channels**: AnySearch, Bocha, Jina, Kagi, Keenable, Linkup, Metaso, Moonshot, Moonshot CN, Ollama, Parallel, Perplexity, Querit, SerpApi, Serper, StepFun, TinyFish, plus separate Standard REST and Coding Plan MCP channels for Z.ai and Zhipu. AnySearch, Keenable, Parallel and TinyFish support keyless anonymous access; the other seventeen require the key for their specific product.

## Install

```sh
magpie plugin add @guotree/magpie-websearch
# Or install from GitHub
magpie plugin add github:guotree/magpie-websearch
```

## Quick start

In Magpie's **Settings › Models › Web search**, add the APIs you want, switch them on and set their order. Leave the key empty for APIs that support anonymous access, or supply a key to use your account.

You can also add APIs from the terminal:

```sh
# Keyless anonymous search
magpie search add magpie-websearch:anysearch

# Use your own API key
magpie search add magpie-websearch:linkup <key>

# List search APIs
magpie search
```

All twenty-one APIs are registered by default without plugin options. Magpie's Web search settings determine which APIs are used.

Since Magpie v0.1.3062, agents can specify `count` when calling `web_search` (1–20, default 6). From the terminal:

```sh
magpie tool web_search "OpenAI API documentation" --count 20
```

Without a configured result limit, the plugin follows the host's `count`, subject to each provider's limits. All providers use the optional `resultLimit` or `*_RESULT_LIMIT` environment variable for a user cap. Providers may return fewer results; the plugin makes no extra requests to fill them. Legacy names remain compatible; see [migration and count policy](docs/technical-reference.en.md#configuration).

Leave **Base URL** empty for official services. A custom address must be the complete endpoint; the plugin does not append paths. See [Custom Base URL](docs/technical-reference.en.md#custom-base-url).

To adjust provider parameters, use **Plugins → Installed → Options**, or run:

```sh
magpie plugin options magpie-websearch '{"anysearch":{"format":"markdown"}}'
```

The Options editor starts from the package's AnySearch example. It is not applied until you click Save; the example uses AnySearch's default `format`, so saving it changes no behavior.

Each command replaces the complete saved options object, so include every option you want to keep. Saving reloads the plugin host. See the [technical reference](docs/technical-reference.en.md#configuration) for all parameters and registration filters.

## Supported providers

| Provider | Vendor ID | Key | Main capabilities |
|---|---|---|---|
| AnySearch | `magpie-websearch:anysearch` | optional | Intent routing, `cn`/`intl` zones, Markdown/JSON output |
| Bocha | `magpie-websearch:bocha` | required | Standalone China REST search, snippet default with optional generated summary, freshness filters |
| Jina | `magpie-websearch:jina` | required | Dedicated Jina Search endpoint, snippet default with optional full text truncation and publishedTime |
| Kagi | `magpie-websearch:kagi` | required | Kagi Search API in public preview, with Lens, recency, and region filters |
| Keenable | `magpie-websearch:keenable` | optional | Anonymous or keyed search, `pro`/`realtime` modes |
| Linkup | `magpie-websearch:linkup` | required | Query-relevant excerpts with four search depths |
| Metaso | `magpie-websearch:metaso` | required | Metaso search with scopes such as webpages and papers |
| Moonshot | `magpie-websearch:moonshot` | required | Basic search on international site, snippet default with optional full text |
| Moonshot CN | `magpie-websearch:moonshot-cn` | required | Basic search on domestic site, snippet default with optional full text |
| Ollama | `magpie-websearch:ollama` | required | Cloud Web Search API using an Ollama account key, configurable content length |
| Parallel | `magpie-websearch:parallel` | optional | Anonymous MCP (`fast`) or keyed REST; up to 20 results |
| Perplexity | `magpie-websearch:perplexity` | required | Standalone Search API, `web`/`fast` modes, recency and country/language filters |
| Querit | `magpie-websearch:querit` | required | Snippets or sentence-level matches |
| SerpApi | `magpie-websearch:serpapi` | required | Google organic search with geography, language and safe-search settings |
| Serper | `magpie-websearch:serper` | required | Alternative Google organic search, single-page 10 results, geography, language and tbs filters |
| StepFun | `magpie-websearch:stepfun` | required | Standalone China REST search with scenario preferences and snippet/full text selection |
| TinyFish | `magpie-websearch:tinyfish` | optional | Anonymous MCP or keyed REST; web, news and papers (papers require a key) |
| Z.ai | `magpie-websearch:zai` | required | Standalone REST search on Zhipu's international site using `search-prime` |
| Z.ai Coding Plan | `magpie-websearch:zai-coding` | required | International Coding Plan search over Streamable HTTP MCP; consumes shared plan credits |
| Zhipu | `magpie-websearch:zhipu` | required | Standalone REST search on the China site with `search_std`/`search_pro`, Sogou and Quark engines |
| Zhipu Coding Plan | `magpie-websearch:zhipu-coding` | required | China Coding Plan search over Streamable HTTP MCP; consumes shared plan credits |

Search entries appear as `<Provider> (magpie-websearch)` in Magpie. Vendor IDs remain `magpie-websearch:<id>`; plugin options and registration filters use short IDs such as `linkup`. See [PROVIDERS.md](PROVIDERS.md) for full support status and the integration plan.

## Privacy and security

- **Direct endpoints**: Requests go directly to official vendor APIs or an explicitly configured custom endpoint.
- **Search data and protocol metadata**: Requests contain search parameters; MCP initialization also includes the client name, package version and protocol capabilities. Conversation history, system prompts, user files, tool outputs and agent context are never read or forwarded.
- **Magpie manages credentials**: Keys are sent using each vendor's protocol. SerpApi errors omit original exceptions, response bodies and request URLs; other providers retain their own diagnostic handling. The plugin cannot control vendor or proxy access logs.
- **No silent downgrade**: Failed keyed requests never downgrade to anonymous access.
- **Strict channel isolation**: Coding Plan keys and Standard API keys are not interchangeable. A provider never turns an MCP failure into metered REST or an automatic retry on the other site. Magpie may try another explicitly configured provider in order, using that provider's own key.

The two Coding Plan providers are currently experimental. The official pages describe a Remote MCP for compatible clients but do not list Magpie as an officially supported client. Confirm the Coding Plan usage policy and your account terms before use; this project does not claim official Zhipu or Z.ai support for Magpie.

Leaving the key empty while editing an existing keyed entry keeps its saved key. See [Anonymous search and rate limits](docs/technical-reference.en.md#anonymous-search) for switching back to anonymous access and handling rate limits.

## Detailed documentation

| Topic | Contents |
|---|---|
| [Custom Base URL](docs/technical-reference.en.md#custom-base-url) | Exact endpoints, URL validation and MCP/REST switching |
| [CLI management](docs/technical-reference.en.md#cli) | Adding APIs, multiple keys, ordering, switches and removal |
| [Anonymous search and rate limits](docs/technical-reference.en.md#anonymous-search) | Anonymous endpoints, access-mode switching, 429 cooldowns and fallback |
| [Provider protocols](docs/technical-reference.en.md#parallel-search) | Endpoints, capability limits and verification records for Parallel, [TinyFish](docs/technical-reference.en.md#tinyfish-search), [SerpApi](docs/technical-reference.en.md#serpapi-search), [Moonshot](docs/technical-reference.en.md#moonshot-search), [Zhipu and Z.ai](docs/technical-reference.en.md#zhipu-search), [StepFun](docs/technical-reference.en.md#stepfun-search), [Perplexity](docs/technical-reference.en.md#perplexity-search), [Bocha](docs/technical-reference.en.md#bocha-search), [Ollama](docs/technical-reference.en.md#ollama-search), [Jina](docs/technical-reference.en.md#jina-search), [Kagi](docs/technical-reference.en.md#kagi-search), and [Serper](docs/technical-reference.en.md#serper-search) |
| [Result processing](docs/technical-reference.en.md#result-processing) | Result counts, text cleanup, dates and error statuses |
| [Full configuration reference](docs/technical-reference.en.md#configuration) | Options, environment variables, precedence, caching and timeouts |
| [Registration filters](docs/technical-reference.en.md#registration-filters) | `enable`/`disable` rules and examples |
| [Development and local tests](docs/technical-reference.en.md#development) | Node/Bun, Magpie host tests, sandboxing and verified versions |

## Roadmap

The third batch of planned standalone web search APIs (Jina, Kagi, Serper) has now been fully integrated; see [PROVIDERS.md](PROVIDERS.md#planned) for the integration plan. A model provider preset or a model's built-in search capability alone does not exclude a vendor's standalone search API from consideration. Official search support is checked before adding a new integration.

Both Coding Plan implementations and local simulations are complete. Real-key search, plan-credit versus Standard REST billing checks, and confirmation of the client policy for Magpie remain pending. Experimental support does not imply real-account verification.

## Acknowledgements

Provider adapters and response fixtures were initially based on [guotree/opencode-search-plugin](https://github.com/guotree/opencode-search-plugin) v4.6.1.

## License

MIT

## Friend Links

- [LINUX DO](https://linux.do/) — the new ideal community
