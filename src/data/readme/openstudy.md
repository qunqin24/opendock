# OpenStudy

> Aprenda programacao com IA hibrida — plugin OpenCode + portal web

[![npm version](https://img.shields.io/npm/v/openstudy)](https://www.npmjs.com/package/openstudy)
[![npm downloads](https://img.shields.io/npm/dm/openstudy)](https://www.npmjs.com/package/openstudy)
[![license](https://img.shields.io/npm/l/openstudy)](./LICENSE)
[![Vercel](https://img.shields.io/badge/portal-openstudy-blue)](https://web-kappa-eight-19.vercel.app)

---

### 🌐 Portal web → [web-kappa-eight-19.vercel.app](https://web-kappa-eight-19.vercel.app)

| Seção | Conteúdo |
|---|---|
| **Skills** | Catálogo interativo de 9 tecnologias com search e filtros |
| **Blog** | Artigos sobre IA, DeepSeek R1 e metodologia de estudo |
| **Como funciona** | Arquitetura híbrida cloud+local explicada em 3 passos |

---

## Plugin OpenCode Plugin de estudo para [OpenCode](https://opencode.ai). Transforma código em aula.

```
Cloud (GPT/Claude) decide O QUE explicar
         ↓
Local (DeepSeek R1) gera CONTEÚDO BRUTO
         ↓
Você recebe: explicação + SOLID + analogia com vestibular
```

## Tecnologias ensinadas

O plugin vem pré-configurado para ensinar **Go**, **C#**, **TypeScript** e
**NestJS** com referências técnicas atualizadas (versões e boas práticas de
Julho/2026). Cada arquivo de referência cobre:

| Arquivo | Versão | Conteúdo |
|---|---|---|
| `go.md` | Go 1.26 | Project layout canônico, idioms, concorrência, erros, interfaces |
| `csharp.md` | .NET 10 / C# 14 | DI, async, EF Core, HybridCache, paralelos TS↔C# |
| `typescript.md` | TS 5.8 | Discriminated unions, Zod-first, nodenext, tsconfig |
| `nestjs.md` | NestJS 11 | Feature-based modules, debug erros, guards, breaking v11 |
| `design-patterns.md` | GoF + SOLID | Diagnóstico SOLID→Pattern, 23 padrões, analogias |

## Como funciona

### Filosofia de interação

O plugin injeta automaticamente regras de comportamento em toda sessão:

- Explicar, não testar — respostas diretas, nunca "como você acha que funciona?"
- Código explicado linha a linha — o que faz, por que está ali, como se conecta
- Múltiplas perspectivas — técnica + analogia + comparativa
- Ritmo do usuário — você escolhe o caminho, a IA oferece opções
- Erro é informação — explica o mecanismo, não julga

### Arquitetura híbrida

```
┌──────────────────────────────────────┐
│          MODELO CLOUD                 │
│  "O estrategista"                     │
│  Decide o que merece explicação,      │
│  escolhe a analogia, avalia qualidade │
├──────────────────────────────────────┤
│         MODELO LOCAL                  │
│  "O redator"                          │
│  DeepSeek R1 (Ollama)                 │
│  Gera documentação, explicações,      │
│  analogias com assunto vinculado      │
│  Custo: ZERO de API                    │
└──────────────────────────────────────┘
```

### Ferramentas (tools)

| Tool | O que faz |
|---|---|
| `vincular_assunto` | Cadastra um assunto (Biologia, História, Física...) para analogias cruzadas |
| `explicar` | Gera explicação completa em 3 camadas usando modelo local |
| `diario` | Gera diário de aprendizado da sessão (Markdown) |
| `treinar` | Envia perfil para o DeepSeek R1 refinar entendimento do usuário |
| `alternar` | Ativa/desativa modo automático cloud↔local |

### Ciclo de aprendizado

```
Fase 1: Cloud decide, local escreve (atual)
Fase 2: Plugin acumula perfil do usuário (assuntos, padrões, histórico)
Fase 3: Local assume progressivamente com base no perfil
```

## Requisitos

- **OpenCode** instalado (`npm i -g opencode-ai` ou similar)
- **Ollama** rodando localmente com modelo `deepseek-r1:7b`
  ```bash
  ollama pull deepseek-r1:7b
  ollama serve
  ```
- **Node.js** 20+
- Um provedor cloud configurado no OpenCode (OpenAI, Anthropic, DeepSeek Cloud, etc.)

## Instalação

### npm (recomendado)

```bash
npm install -g openstudy
```

Depois, no seu `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["openstudy"]
}
```

O plugin já inclui a injeção da filosofia — não precisa de plugin separado.

### Ou clone o repositório

```bash
git clone https://github.com/Joao147258/OpenStudy.git
cd OpenStudy
npm install
```

Depois referencie pelo caminho absoluto no `opencode.jsonc`:

```jsonc
{
  "plugin": [
    "/caminho/para/OpenStudy/estudo/estudo.ts"
  ]
}
```

### Configure o provider Ollama

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/caminho/para/OpenStudy/filosofia.ts",
    "/caminho/para/OpenStudy/estudo/estudo.ts"
  ],
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": { "baseURL": "http://localhost:11434/v1" },
      "models": {
        "deepseek-r1:7b": {
          "name": "DeepSeek R1 7B",
          "capabilities": { "reasoning": true }
        }
      }
    }
  },
  "small_model": "ollama/deepseek-r1:7b"
}
```

### 3. Reinicie o OpenCode

O plugin carrega na inicialização. O DeepSeek R1 será usado automaticamente
para tarefas leves (small_model) e sob demanda via tool `explicar`.

## Uso

### Vincular assunto de estudo

No chat do OpenCode, diga para o agente:

```
vincular assunto Biologia - Genética
```

O plugin cadastra "Biologia - Genética" e usa como fonte de analogias.

### Explicar código

Peça para o agente explicar qualquer código:

```
explique este código
```

O agente cloud decide o contexto, monta o prompt com as referências técnicas
e o assunto vinculado, e envia para o DeepSeek R1 gerar a explicação completa.

### Gerar diário

No final da sessão:

```
gere o diário de hoje
```

O plugin salva um arquivo `estudo/aprendizado/YYYY-MM-DD.md` com tudo que foi
visto: arquivos, conceitos, assuntos, métricas.

### Treinar o modelo local

Periodicamente, para melhorar a personalização:

```
treine o modelo local
```

O plugin envia o perfil acumulado para o DeepSeek R1 processar e refinar seu
entendimento sobre você.

### Alternância automática

Quando quiser testar o modo autônomo:

```
ativar alternância automática
```

O plugin passa a decidir sozinho quando usar o modelo local vs cloud.

## Estrutura do projeto

```
OpenStudy/
├── filosofia.ts              # Plugin: injeta filosofia.md como system prompt
├── filosofia.md              # Regras de interação (mentor)
├── estudo/
│   ├── estudo.ts             # Plugin principal (852 linhas)
│   ├── perfil.json           # Perfil do usuário (template)
│   ├── aprendizado/          # Diários gerados (YYYY-MM-DD.md)
│   └── referencias/          # Boas práticas por tecnologia
│       ├── go.md             # Go 1.26 — project layout, idioms
│       ├── csharp.md         # .NET 10 / C# 14 — DI, async, EF Core
│       ├── typescript.md     # TS 5.8 — discriminated unions, Zod
│       ├── nestjs.md         # NestJS 11 — debug, guards, breaking
│       └── design-patterns.md # SOLID → Pattern, 23 GoF
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Personalização

### Mudar tecnologias ensinadas

Edite `estudo/perfil.json`:

```json
{
  "especialidades": ["Python", "Rust", "Go", "Kubernetes"],
  "assuntos": [],
  ...
}
```

Depois crie os arquivos de referência correspondentes em `estudo/referencias/`.

### Adicionar novos assuntos de analogia

Via chat: `vincular assunto Filosofia - Estoicismo`

Ou edite `estudo/perfil.json` diretamente:

```json
{
  "assuntos": ["Biologia - Genética", "História - Brasil Colônia"]
}
```

### Mudar o modelo local

Edite as constantes no início de `estudo/estudo.ts`:

```typescript
const MODELO_LOCAL = "qwen3-coder:30b"  // outro modelo Ollama
```

## Como contribuir

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-tool`)
3. Commit suas mudanças (`git commit -m 'Adiciona tool X'`)
4. Push (`git push origin feature/nova-tool`)
5. Abra um Pull Request

### Adicionando referência de nova tecnologia

1. Crie `estudo/referencias/nova-tec.md` com boas práticas
2. Adicione no `MAPA_REFERENCIAS` em `estudo/estudo.ts`
3. Adicione em `especialidades` no `perfil.json`

## Troubleshooting

| Sintoma | Causa | Solução |
|---|---|---|
| Plugin não carrega | Caminho errado no `opencode.jsonc` | Use caminho absoluto |
| `explicar` não funciona | Ollama offline | `ollama serve` |
| Modelo local não responde | Modelo não baixado | `ollama pull deepseek-r1:7b` |
| Erro de tipo no VS Code | `@opencode-ai/plugin` não instalado | `npm install` no diretório do plugin |
| Ferramentas não aparecem | OpenCode não reiniciou | Reinicie o OpenCode após adicionar plugin |
| DeepSeek R1 lento | Modelo 7B em CPU | Considere GPU ou modelo menor (qwen3-coder:3b) |

## Licença

MIT © Joao Dantas

## Portal web

- **Vercel:** [web-kappa-eight-19.vercel.app](https://web-kappa-eight-19.vercel.app)
