# opencode-prompt-search

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat-square&logo=github)](https://github.com/aiev/opencode-prompt-search)
[![npm](https://img.shields.io/npm/v/opencode-prompt-search?style=flat-square)](https://www.npmjs.com/package/opencode-prompt-search)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

Plugin de TUI para o OpenCode que adiciona uma busca incremental no histórico de prompts — no estilo do `Ctrl+R` do terminal, mas em um diálogo.

**Atalho:** `Ctrl+Shift+R`

## O que faz

1. Abre um diálogo com os prompts já enviados no projeto atual.
2. Filtra a lista a cada tecla digitada (busca por substring e por subsequência, com suporte a várias palavras).
3. Ao selecionar um item com Enter, insere o texto de volta no composer, pronto para editar e enviar.
4. Também está disponível na paleta de comandos (`Ctrl+P`) e como slash command:
   - `/prompt-history` / `/ph` — histórico do projeto atual
   - `/prompt-history-all` / `/pha` — histórico de todas as sessões/projetos

O histórico é atualizado em tempo real quando um novo prompt é enfileirado. A primeira abertura busca até 60 sessões recentes (100 prompts por sessão); depois usa cache por 20 segundos.

## Instalação

Como é um plugin TUI-only, ele é carregado pelo `cli.json`.

Pelo pacote npm:

```json
{
  "plugins": [
    "opencode-prompt-search"
  ]
}
```

Ou por um checkout local (rode `pnpm install && pnpm build` antes):

```json
{
  "plugins": [
    "/home/tiago/Projects/opencode-prompt-search"
  ]
}
```

Depois reinicie o OpenCode para o TUI carregar o plugin.

## Atalho

O padrão é `ctrl+shift+r`. Para trocar, use o ID do comando no `cli.json`:

```json
{
  "keybinds": {
    "prompt-history.search": "ctrl+shift+r"
  }
}
```

O comando `prompt-history.search-all` não tem atalho por padrão; pode ser usado pela paleta ou receber um no `cli.json`.

> Em terminais que não reportam a tecla Shift separadamente, `Ctrl+Shift+R` pode chegar como `Ctrl+R` (que por padrão renomeia a sessão). Nesse caso, use a paleta ou o slash command.

## Desenvolvimento

```bash
pnpm install
pnpm build     # typecheck + bundle em dist/tui.js
pnpm test      # testes unitários de busca/histórico
```

O OpenCode 2.0.x resolve o entrypoint TUI pelo arquivo `tui.js` na raiz do pacote; versões mais novas também leem `exports["./tui"]` do `package.json`. O plugin inclui os dois caminhos.

## Publicação

O repositório tem dois workflows em `.github/workflows`:

- `ci.yml`: typecheck, build e testes em Node 20 e 22 para pushes e PRs.
- `publish.yml`: publica no npm quando uma tag `v*` é enviada (ou via `workflow_dispatch`), usando trusted publishing/OIDC (`id-token: write`), sem token no repositório.

O trusted publishing do npm exige que o pacote já exista. Na primeira vez, publique manualmente:

```bash
pnpm build
npm login
npm publish --access public
```

Depois, no npmjs.com, em **Settings → Trusted Publishing** do pacote, cadastre o publisher do GitHub Actions:

- Owner: `aiev`
- Repository: `opencode-prompt-search`
- Workflow: `publish.yml`

A partir daí, cada tag publica automaticamente:

```bash
pnpm version patch
git push --follow-tags
```

## Limitações

- É um diálogo de busca, não o reverse-search inline dentro do composer (a API pública de plugins do OpenCode não expõe o buffer do prompt).
- O histórico é limitado às 60 sessões raiz mais recentes e aos 100 prompts mais recentes por sessão.
- O texto é inserido na posição do cursor. Se o composer já tiver conteúdo, o prompt escolhido é adicionado a ele; não substitui o conteúdo existente.
