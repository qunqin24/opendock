# opencode-papersflow

OpenCode plugin for academic research by [PapersFlow](https://papersflow.ai) — search 474M+ papers, verify citations, explore citation graphs, and run deep research.

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-papersflow"]
}
```

## Tools

| Tool | Description |
|---|---|
| `papersflow_search_literature` | Search 474M+ papers from Semantic Scholar and OpenAlex |
| `papersflow_verify_citation` | Verify and normalize DOIs, arXiv IDs, PubMed IDs, URLs, or free-text citations |
| `papersflow_find_related_papers` | Find references, citations, and similar works for a paper |
| `papersflow_get_citation_graph` | Get the full citation graph for a paper |
| `papersflow_get_paper_neighbors` | Get one-hop neighbors grouped by type |
| `papersflow_expand_citation_graph` | Expand a citation graph from existing nodes |

## How it works

This plugin connects to the PapersFlow hosted MCP server at `https://doxa.papersflow.ai/mcp` and exposes its academic research tools as native OpenCode tools. No API key needed for public tools.

## Links

- [PapersFlow](https://papersflow.ai)
- [MCP Server](https://github.com/papersflow-ai/papersflow-mcp)
- [Documentation](https://papersflow.ai/docs)

## License

MIT
