> [!NOTE]
> **Disclosure:** This project is developed using LLM-assisted engineering with [nWave](https://github.com/nearwave/nwave).

# graphmind

Knowledge graphs as a long-term memory for your AI assistants

## Installation

### From npm

Add the plugin and built-in skills to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["graphmind"],
  "skills": {
    "paths": ["~/.cache/opencode/node_modules/graphmind/skill"]
  }
}
```

OpenCode will automatically install the plugin on startup. See the [Skills](#skills) section for available skills and alternative path configurations.

## Features

### Wikidata Query Tool

Query Wikidata for factual information about the world using the `wikidata_query` tool. This tool is optimized for querying the Wikidata knowledge base, which contains structured data about people, places, events, concepts, and more.

**Key Features:**

- Automatic Wikidata prefix injection (wd:, wdt:, p:, ps:, pq:, etc.)
- Optimized default timeout for Wikidata queries (30 seconds)
- Helpful error messages with guidance for common issues
- Support for Wikidata-specific features like the label service

**Use Cases:**

- Historical facts and events
- Geographical data and locations
- Information about people and organizations
- Scientific concepts and classifications
- Cultural and general world knowledge

### SPARQL Query Tool

Execute SPARQL queries over RDF data sources using the `sparql_query` tool. This tool uses Comunica under the hood to provide flexible querying capabilities.

**Supported Query Types:**

- `SELECT` - Retrieve bindings for variables
- `CONSTRUCT` - Generate RDF triples
- `DESCRIBE` - Retrieve RDF descriptions
- `ASK` - Boolean queries

**Supported Data Sources:**

- SPARQL endpoints (e.g., DBpedia, Wikidata)
- Triple Pattern Fragments (TPF) servers
- RDF files (Turtle, N-Triples, JSON-LD, etc.)
- Solid pods
- Any URL serving RDF data

## Usage Examples

### Wikidata Queries

#### Find Information About a Person

```
Who is Douglas Adams and when was he born?
```

OpenCode will construct a Wikidata query like:

```json
{
  "query": "SELECT ?personLabel ?birthDate WHERE { wd:Q42 wdt:P569 ?birthDate. SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. } }"
}
```

#### Find Countries by Population

```
What are the 10 most populous countries in the world?
```

#### Historical Events

```
What major events happened in 1969?
```

The tool automatically adds all necessary Wikidata prefixes, so you can focus on writing the query logic.

### Basic SELECT Query

Query DBpedia for the first 10 triples:

```
Can you query DBpedia for the first 10 triples?
```

OpenCode will use the tool with parameters like:

```json
{
  "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
  "sources": ["https://fragments.dbpedia.org/2016-04/en"]
}
```

### Query Multiple Sources

Query across multiple RDF sources simultaneously:

```
Query DBpedia and Wikidata for entities related to "artificial intelligence"
```

### CONSTRUCT Query

Generate RDF triples:

```
Use a CONSTRUCT query to get book information from DBpedia
```

### Custom Output Format

Request specific output formats:

```json
{
  "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
  "sources": ["https://fragments.dbpedia.org/2016-04/en"],
  "outputFormat": "text/csv"
}
```

**Available Output Formats:**

- `application/json` (default for SELECT)
- `application/sparql-results+json`
- `application/sparql-results+xml`
- `text/csv`
- `text/tab-separated-values`
- `text/turtle` (default for CONSTRUCT)
- `application/trig`
- `application/n-triples`
- `application/n-quads`
- `application/ld+json`

### Advanced Options

```json
{
  "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
  "sources": ["https://fragments.dbpedia.org/2016-04/en"],
  "baseIRI": "http://example.org/",
  "lenient": true,
  "httpTimeout": 30000,
  "logLevel": "debug"
}
```

## Tool Parameters

### `wikidata_query`

| Parameter      | Type   | Required | Description                                              |
| -------------- | ------ | -------- | -------------------------------------------------------- |
| `query`        | string | Yes      | SPARQL query for Wikidata (prefixes added automatically) |
| `outputFormat` | string | No       | Output format: json, csv, tsv, xml (default: json)       |
| `httpTimeout`  | number | No       | HTTP timeout in milliseconds (default: 30000)            |
| `logLevel`     | string | No       | Log level: error, warn, info, or debug                   |

**Note:** The tool automatically adds common Wikidata prefixes (wd:, wdt:, p:, ps:, pq:, wikibase:, bd:, rdfs:) if they're not already in your query.

### `sparql_query`

| Parameter      | Type     | Required | Description                             |
| -------------- | -------- | -------- | --------------------------------------- |
| `query`        | string   | Yes      | The SPARQL query string to execute      |
| `sources`      | string[] | Yes      | One or more URLs to query over          |
| `outputFormat` | string   | No       | Output format for results               |
| `baseIRI`      | string   | No       | Base IRI for the query                  |
| `lenient`      | boolean  | No       | If true, log errors instead of throwing |
| `httpTimeout`  | number   | No       | HTTP request timeout in milliseconds    |
| `logLevel`     | string   | No       | Log level: error, warn, info, or debug  |

## Skills

Graphmind ships domain-specific skills that give your AI agent knowledge about SPARQL query patterns and RDF modeling conventions. Skills are instruction files that improve how agents use the plugin's tools.

### Available Skills

| Skill | Description |
|-------|-------------|
| `graphmind-wikidata` | Answer real-world factual questions by querying Wikidata, the world's largest open knowledge base |
| `graphmind-sparql-patterns` | Common SPARQL query patterns for querying RDF knowledge graphs with Graphmind |
| `graphmind-rdf-modeling` | RDF modeling patterns and ontology conventions for knowledge graph construction |

### Enabling Skills

Add the skills path to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["graphmind"],
  "skills": {
    "paths": ["node_modules/graphmind/skills"]
  }
}
```

If OpenCode installed the plugin to its cache directory, use the cache path instead:

```json
{
  "skills": {
    "paths": ["~/.cache/opencode/node_modules/graphmind/skills"]
  }
}
```

For local plugin installations, point to the local path:

```json
{
  "skills": {
    "paths": [".opencode/plugins/graphmind/skills"]
  }
}
```

## Requirements

- Node.js >= 18.0.0
- The plugin automatically installs Comunica dependencies

## License

MIT
