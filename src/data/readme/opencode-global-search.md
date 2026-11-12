# opencode-global-search

Search your entire OpenCode chat history — every session, every project — inside OpenCode.

It has two parts, and they are independent:

| Part | Where | Uses the model? |
| --- | --- | --- |
| **Search panel** (main) | OpenCode Desktop only | No: zero tokens |
| **`global_search` tool** (optional) | Any client (desktop, TUI, web, IDE) | Yes: the agent calls it |

The panel is the product: press `Ctrl+Shift+H`, type, and read the results.
The tool is a bonus so the agent can search your history too; you can turn it off.

Only what you and the assistant actually wrote is searched: reasoning traces and raw tool output are ignored.

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode-global-search"]
}
```

For a local checkout:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-global-search"]
}
```

### Disable the tool

Keep the panel and hide the tool from the agent:

```jsonc
{
  "plugins": [{ "package": "opencode-global-search", "options": { "tool": false } }]
}
```

## The search panel (desktop app)

- Open it with `Ctrl+Shift+H`, or pick **Search chat history** in the command palette.
- Choose all sessions or a single one.
- Results open that session in a tab when clicked.
- No model is involved: nothing is sent to a provider and no tokens are spent.

## Features

- **Global search** across every session and project.
- **Exact phrase by default**, like the built-in `Ctrl+F`: `lenovo 14` matches only that sequence.
- **Exact match** on by default; untick it to match every word in any order.
- Matches are ranked by how close the words are, and highlighted in the excerpt.
- **Role filter** and date filter for the tool.

## Usage (tool)

Ask in plain language:

- "Search my history for where we discussed the tablet"
- "Find sessions where I mentioned rate limiting"

Or call the tool directly:

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | string (required) | Exact phrase, case-insensitive |
| `since` | string | Earliest date, `YYYY-MM-DD` |
| `session` | string | Restrict to one session id (`ses_...`) |
| `role` | string | `user`, `assistant`, `synthetic` or `shell` |
| `limit` | integer | Maximum matches (default 20, max 100) |

## Output

```
3 match(es) in 1 session(s) for "postgres backup":

2026-03-14 18:02 · Database migration · [user] · ses_example000000000000000000
   …we should test the postgres backup script before touching production…
```

## Compatibility

- OpenCode 2.x (`session_message` schema).
- OpenCode 1.18.x databases (`part` / `message` schema) are also supported, detected automatically.

## Database location

Resolved in this order:

1. `OPENCODE_DB` environment variable.
2. `$XDG_DATA_HOME/opencode/opencode.db`.
3. `~/.local/share/opencode/opencode.db`.

## Privacy

The tool reads your full local chat history, which may contain secrets, paths and personal data.
It never writes to the database and sends nothing anywhere. Only the excerpts you receive become
part of the conversation, so review them before sharing a session.

## License

MIT

---

# opencode-global-search (español)

Búsqueda de texto completo en todo el historial de chats de OpenCode, desde adentro de OpenCode.

Tiene dos partes independientes:

| Parte | Dónde | ¿Usa el modelo? |
| --- | --- | --- |
| **Panel de búsqueda** (principal) | Solo app de escritorio | No: cero créditos |
| **Tool `global_search`** (opcional) | Cualquier cliente (app, TUI, web, IDE) | Sí: la llama el agente |

El panel es el producto: `Ctrl+Shift+H`, escribís y ves los resultados.
La tool es un extra para que el agente también pueda buscar; se puede apagar.

Solo se busca lo que escribiste vos y lo que respondió el agente: se ignoran el razonamiento y la salida cruda de las tools.

## Instalación

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode-global-search"]
}
```

### Apagar la tool

Dejá el panel y ocultale la tool al agente:

```jsonc
{
  "plugins": [{ "package": "opencode-global-search", "options": { "tool": false } }]
}
```

## El panel (app de escritorio)

- Se abre con `Ctrl+Shift+H` o desde el palette: **Buscar en el historial**.
- Elegís todas las sesiones o una sola.
- Al hacer clic en un resultado, abre esa sesión en una pestaña.
- No interviene el modelo: no se envía nada a ningún proveedor ni se gastan tokens.

## Uso de la tool

- "Buscá en el historial dónde hablé de la tablet"
- "En qué sesión mencioné rate limiting"

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `query` | string (obligatorio) | Frase exacta, sin distinguir mayúsculas |
| `since` | string | Fecha mínima, `YYYY-MM-DD` |
| `session` | string | Limitar a una sesión (`ses_...`) |
| `role` | string | `user`, `assistant`, `synthetic` o `shell` |
| `limit` | integer | Máximo de coincidencias (20 por defecto, tope 100) |

## Privacidad

Lee todo el historial local, que puede contener claves y datos personales. No escribe en la base
ni envía nada a ningún lado. Revisá los fragmentos antes de compartir una sesión.

## Licencia

MIT
