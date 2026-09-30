# opencode-9router-sync

Plugin do [opencode](https://opencode.ai) que puxa a lista de modelos direto do [9router](https://www.npmjs.com/package/9router) toda vez que o opencode inicia. Você não precisa manter os modelos à mão na config.

- Lê o `/v1/models` do 9router e registra cada modelo no provider `9router`.
- Converte as capacidades (tools, reasoning, visão, PDF, áudio, vídeo) e os limites de contexto e saída para o formato do opencode.
- Se não houver provider `9router` na config, cria um automaticamente.
- Só altera a config em memória: seu `opencode.jsonc` nunca é reescrito.
- Se o 9router estiver fora do ar, não faz nada e o opencode abre normalmente.

## Instalação

Adicione o plugin na config do opencode (`~/.config/opencode/opencode.jsonc` ou `opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-9router-sync"]
}
```

O opencode instala o pacote sozinho na próxima vez que abrir.

Se o seu 9router exige chave, defina-a no shell (por exemplo, no `~/.zshrc`):

```bash
export NINEROUTER_API_KEY="sua-chave"
```

Pronto. Confira com:

```bash
opencode models 9router
```

## Configuração

O plugin procura a URL e a chave nesta ordem:

| | 1º | 2º | Padrão |
|---|---|---|---|
| URL | `provider.9router.options.baseURL` | `NINEROUTER_BASE_URL` | `http://localhost:20128/v1` |
| Chave | `provider.9router.options.apiKey` | `NINEROUTER_API_KEY` | nenhuma |

### Com o provider na config

Se você já tem um provider `9router`, o plugin só preenche os modelos. O que você definir à mão em `models` tem prioridade, campo a campo, sobre o que vem do servidor. Isso serve para trocar o nome de exibição ou ajustar um limite:

```jsonc
{
  "plugin": ["opencode-9router-sync"],
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "{env:NINEROUTER_API_KEY}"
      },
      "models": {
        "meu-combo": { "name": "Meu combo", "limit": { "context": 200000, "output": 64000 } }
      }
    }
  }
}
```

A lista final contém só os modelos que o 9router devolve. Um modelo que existe na config mas não aparece no `/v1/models` fica de fora enquanto o 9router estiver no ar.

### Sem o provider na config

O plugin cria o provider `9router` (via `@ai-sdk/openai-compatible`) apenas se o servidor responder com modelos. Nesse modo o timeout é de 1,5 s, para não atrasar a abertura do opencode de quem não tem o 9router rodando.

## Nomes de exibição

Os modelos aparecem como `DONO · modelo`, usando o `owned_by` do 9router. Por exemplo, `cc/claude-opus-5` vira `CC · claude-opus-5`. Os donos `combo`, `cc`, `ocg` e `openrouter` têm nomes próprios; os demais aparecem em maiúsculas.

## Instalação manual

Sem npm: copie o `index.js` para `~/.config/opencode/plugin/sync-9router.js` (global) ou `.opencode/plugin/sync-9router.js` (por projeto). Não use as duas formas ao mesmo tempo, senão o plugin roda duas vezes.

## Licença

MIT
