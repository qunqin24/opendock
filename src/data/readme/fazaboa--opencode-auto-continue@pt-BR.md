# opencode-auto-continue

[English](./README.md) · [Português (BR)](./README.pt-BR.md)

Plugin do [OpenCode](https://opencode.ai) que **autocontinua respostas cortadas pelo limite de output do modelo**.

## O problema

Modelos de contexto grande às vezes param no meio da resposta — o output é truncado pelo teto de tokens (ou o modelo entra em loop de raciocínio e bate no limite), e você fica com metade de um arquivo, um diff quebrado ou uma explicação pela metade. Aí precisa digitar "continue" manualmente… toda hora.

Se você já passou por isso, sabe como é chato:

![Exemplo: resposta truncada no meio do arquivo](docs/assets/before.png)

## A solução

O plugin observa a sessão por fora. Quando a última mensagem do assistant:

- termina com `finish: "length"` / `MessageOutputLengthError`, **ou**
- passa de um soft limit de tokens de output (~88% do teto),

ele injeta automaticamente um prompt pedindo para o modelo continuar **exatamente de onde parou** — sem repetir nada.

![Exemplo: plugin detecta truncamento e autocontinua](docs/assets/after.png)

### Guardrails

| Proteção | Padrão |
|---|---|
| Máx. de autocontinuações por turno do usuário (anti-loop infinito) | 3 |
| Contador reseta quando você manda mensagem nova | ✓ |
| Soft limit bem abaixo do teto (pega também "terminou colado no teto") | 115k tokens |
| Falha silenciosa (nunca quebra sua sessão) | ✓ |

## Instalação

```bash
npm install @fazaboa/opencode-auto-continue
```

E registre no seu `opencode.json`:

```jsonc
{
  "plugin": ["@fazaboa/opencode-auto-continue"]
}
```

Ou copie o arquivo-fonte direto para `.opencode/plugins/auto-continue.ts` no seu projeto — é um arquivo único e autocontido.

## Configuração (opcional)

```jsonc
{
  "plugin": [
    [
      "opencode-auto-continue",
      {
        "outputSoftLimit": 115000,
        "maxAutoContinues": 3,
        "continueText": "[auto-continue] Continue exatamente de onde parou."
      }
    ]
  ]
}
```

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `outputSoftLimit` | `number` | `115_000` | Limite de tokens de output que dispara a continuação |
| `maxAutoContinues` | `number` | `3` | Máx. de continuações por turno do usuário |
| `continueText` | `string` | *(ver código)* | Prompt injetado na continuação |

Uso programático:

```ts
import { autoContinue } from "@fazaboa/opencode-auto-continue"

export const AutoContinuePlugin = autoContinue({ maxAutoContinues: 5 })
```

## Como funciona

1. Escuta os eventos do OpenCode.
2. No `session.idle`, busca as mensagens da sessão via client do SDK.
3. Verifica se a última mensagem do assistant foi truncada (`finish === "length"` / `MessageOutputLengthError`) ou passou do soft limit.
4. Se disparou, envia um `promptAsync` com o texto de continuação e incrementa o contador da sessão.
5. Mensagem nova do usuário reseta o contador.

## Licença

[MIT](./LICENSE)
