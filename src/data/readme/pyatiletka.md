# pyatiletka

Fluxo de issues, marcos, PRs e CI para agentes (opencode), em Gitea e GitHub.

O plugin da ao agente 38 tools e tres hooks que resolvem o trabalho de manter
o quadro de issues em dia: vincular a sessao a uma issue, montar a fila de um
marco a partir das dependencias reais, esperar o CI depois de um `git push` e
recusar texto de prosa enrolada antes de gravar. A credencial vem de um `.env`,
de um login ja feito no `gh`/`tea` ou de um login manual que `auth_login`
orienta, sem configuracao previa.

Suporta Gitea e GitHub com paridade: issues, marcos, dependencias, PRs, reviews,
CI, runners e protecao de branch.

## Instalacao

O default export carrega os dois entrypoints: o v2 chama `setup`, o v1 chama
`server` (entrypoint objeto, opencode a partir de 1.18.29).

No `opencode.json` do v2 (campo `plugins`):

```json
{
  "plugins": ["pyatiletka"]
}
```

No v1 (campo `plugin`):

```json
{
  "plugin": ["pyatiletka"]
}
```

No v2 o plugin aceita opcoes, lidas como `ctx.options`:

```json
{
  "plugins": [{ "package": "pyatiletka", "options": { "org": "minha-org" } }]
}
```

## Configuracao

O plugin tenta achar a credencial sozinho, na ordem:

1. **Ambiente e `.env`**: `GITEA_TOKEN` ou `GITHUB_TOKEN`/`GH_TOKEN`. O ambiente
   real vence o arquivo.
2. **CLI ja logada**: o token de um `gh auth login` (GitHub) ou de um `tea login
   add` (Gitea).
3. **Login manual**: a tool `auth_login` diz o comando para rodar no terminal,
   `gh auth login --web` ou `tea login add`.

Sem credencial a carga nao falha, desde que o provider seja conhecido (um remote
no clone, `PYATILETKA_PROVIDER` ou um token no ambiente). A primeira chamada de
rede explica o que falta e `auth_status` mostra a origem do token. Sem provider
nenhum o plugin ainda carrega e `auth_login` mostra os dois caminhos, mas as
tools de rede recusam.

Os `.env` procurados, do global para o especifico, sendo o ultimo o que vence:
`~/.config/pyatiletka/env`, `~/.config/opencode/.env`, o `.env` do projeto e
`PYATILETKA_ENV_FILE`. O `.env` do projeto vive dentro do clone, entao ele so
fornece token. URL, provider, host e o resto vem do ambiente real ou dos
arquivos em `$HOME` e de `PYATILETKA_ENV_FILE`, que o repositorio nao alcanca.
Assim um repo nao consegue apontar uma credencial sua para outro host.

Os nomes de URL e de token sao os que os providers ja usam. O resto leva o
prefixo do pacote, que e o que evita colisao com variavel de outro programa
(`GITHUB_*`, por exemplo, ja vem populado dentro do GitHub Actions).

| Variavel | Para que serve |
|---|---|
| `GITEA_URL` | Base do Gitea, sem barra final. Ex.: `https://gitea.example.com` |
| `GITEA_TOKEN` | Token do Gitea |
| `GITHUB_TOKEN` | Token do GitHub |
| `GH_TOKEN` | Alternativa ao `GITHUB_TOKEN`, o nome que o `gh` usa |
| `GITHUB_API_URL` | Base da API. Default `https://api.github.com` |
| `PYATILETKA_AUTH` | `auto`, `env` ou `cli`. Forca a origem e ajuda a testar. Default `auto` |
| `PYATILETKA_ENV_FILE` | `.env` extra, lido por ultimo |
| `PYATILETKA_PROVIDER` | `gitea` ou `github`. Sem isso o remote do clone decide |
| `PYATILETKA_ORG` | Org usada em `repo` sem owner, na varredura de org e nos runners. Sem isso, o owner do remote |
| `PYATILETKA_DEFAULT_REPO` | Repo `owner/nome` para tools chamadas fora de um clone. Sem isso, o remote |
| `PYATILETKA_DEFAULT_BRANCH` | Branch usada por `ci_wait` e `ci_dispatch`. Sem isso, o clone ou a API |
| `PYATILETKA_LOGIN` | Seu login, para o filtro `mine` de `pr_list`. Sem isso, o usuario do token |
| `PYATILETKA_PROMOTE_ORDER` | Ordem de `branch_promote`. Default `staging,production` |
| `PYATILETKA_PROSE` | `off`, `warn` ou `block`. Default `block` |

Do ambiente real todas valem. Do `.env` confiavel (em `$HOME` e
`PYATILETKA_ENV_FILE`) todas valem. Do `.env` do projeto so `GITEA_TOKEN`,
`GITHUB_TOKEN` e `GH_TOKEN` valem.

Provider: `PYATILETKA_PROVIDER` manda. Sem ele, o remote do clone decide, depois
o ambiente (`GITEA_URL` ou um token) e, por fim, a CLI que estiver logada.

O plugin le o ambiente do processo do opencode, entao a variavel precisa estar
exportada no shell que launched opencode. No v2, as chaves nao sensiveis tambem
podem vir de `options` no `opencode.json` (`provider`, `org`, `defaultRepo`,
`defaultBranch`, `login`, `promoteOrder`, `prose`), que sobrepoe o ambiente.
Token continua so no ambiente.

### Valores derivados

Fora a credencial, o plugin tambem descobre sozinho, sem rede, o que o clone ja
sabe. O valor explicito do ambiente sempre vence a derivacao:

| Valor | Derivado de |
|---|---|
| `org` | owner do remote do clone |
| repo padrao | `owner/nome` do remote |
| branch padrao | `origin/HEAD`, senao a branch atual |
| login do `mine` | usuario dono do token (`GET /user`) |
| provider e host | host do remote |

A branch padrao tambem cai na API (`GET /repos/{repo}`) quando `ci_wait` ou
`ci_dispatch` rodam fora de um clone, sem `PYATILETKA_DEFAULT_BRANCH`.

### Credencial

O jeito mais simples e deixar o `gh` ou o `tea` ja logados. O plugin pega o
token deles sem pedir nada:

```
gh auth login     # GitHub, uma vez
tea login add     # Gitea, uma vez
```

Se preferir variavel, o token pode ficar no `.env` do projeto:

```bash
# ./.env  (fora do controle de versao)
GITEA_TOKEN=...
```

A URL e a org vao no ambiente real ou num arquivo da maquina, nunca no clone:

```bash
# ~/.config/pyatiletka/env
GITEA_URL=https://gitea.example.com
PYATILETKA_ORG=minha-org
```

Com a credencial pronta, `auth_status` mostra de onde ela veio. Faltando, o
`auth_login` devolve o comando certo para o provider atual.

O token nunca entra no contexto do agente nem na saida das tools: aparece como
`***REDACTED***` em qualquer mensagem de erro.

### Uma tool por provider

| Tool | Gitea | GitHub |
|---|---|---|
| `ci_logs` | exige o binario `tea` no PATH | usa REST, o zip e o `fflate` |
| `ci_dispatch` | passa pelo `tea` | usa a REST |
| `pr_merge` com `style: fast-forward-only` | modo nativo | vira `rebase`, que e o mais proximo |
| `compare` de branch | so devolve `total_commits` e `commits` na 1.27 | devolve `ahead_by`, `behind_by` e `status` |

## Convencoes

O plugin e opinativo nestas quatro familias de label. A tool le, nao cria: os
nomes precisam existir no repo.

| Prefixo | Valores | Para que serve |
|---|---|---|
| `Status/` | `Todo`, `In Progress`, `Need More Info`, `Blocked` | estado logico da issue |
| `Priority/` | `Critical`, `High`, `Medium`, `Low` | ordem da fila e da proxima sugerida |
| `Kind/` | livre | tipo do trabalho |
| `Area/` | livre | onde o trabalho acontece |

`Status/Blocked` tem precedencia sobre `Status/In Progress`, e
`issue_update` trata a familia `Status/` como exclusiva: adicionar um `Status/`
novo substitui o anterior.

O GitHub tem consistencia eventual na listagem de issues: logo depois de
`issue_create`, um `milestone_view` pode mostrar a fila curta por alguns
segundos. Repita a chamada.

Dependencias vao pela secao de dependencias da API, a mesma da UI, via
`issue_depend`. `milestone_view` le essa secao para montar a fila. Escrever
dependencia como texto no corpo nao cria aresta.

## Template de issue

A UI so injeta o template quando a issue nasce por ela. Como aqui toda
issue nasce por `issue_create`, o plugin le o mesmo arquivo do repo. Os dois
caminhos valem:

- `.gitea/issue_template/<nome>.md`
- `.github/ISSUE_TEMPLATE/<nome>.md`

O frontmatter e o que a UI usa:

```markdown
---
title: "[Task] "
about: Tarefa com criterio de aceite
labels: [Kind/Task, Priority/Medium]
---

## Objetivo

## Criterio de aceite

## Contexto

## Depende de
```

`issue_template_list` mostra o que existe. `issue_create` com `template` monta
o corpo a partir de `objetivo`, `criterios` e `contexto`, aplica o prefixo do
titulo e as labels do frontmatter.

## Checagem de prosa

Todo texto que o agente grava passa por `assertProse` (`src/prose`). No modo
`block`, o texto nao e gravado e a tool explica o que recusou.

Duas camadas:

- **Regras de casa e frases sem uso literal possivel. Bloqueiam.** Travessao em
  prosa, ponto e virgula, ponto medio como separador, e as formulas de
  "vale notar" a "em conclusao", em pt-BR e em ingles.
- **Termo de julgamento. Vira aviso.** A lista canonica da skill unsloppify
  (MIT, ver `THIRD_PARTY_LICENSES/unsloppify-LICENSE`) esta embutida em
  `src/prose/phrases.json`. Sao avisos porque a palavra pode ser o termo exato
  do caso.

Trechos em code span, bloco de codigo, URL e aspas ficam de fora: material
citado e identificador literal nao sao reescritos. Nome existente com
travessao continua citavel dentro de crase.

**Titulos nao passam pelo gate.** A convencao de travessao em titulo de marco e
titulo de issue vale, entao o titulo vai como veio.

Para desligar ou deixar so avisar:

```
export PYATILETKA_PROSE=warn
export PYATILETKA_PROSE=off
```

## Tools

### Issue e marco

| Tool | O que faz |
|---|---|
| `issue_bind` | vincula a sessao a uma issue. O contexto entra em todo turno |
| `issue_unbind` | desvincula |
| `issue_binding` | mostra a issue vinculada |
| `issue_view` | issue, dependencias e todos os comentarios |
| `issue_list` | lista com filtro de marco, estado logico, autor, assignee e datas |
| `issue_template_list` | templates de issue do repo |
| `issue_create` | cria a issue, com template ou corpo literal |
| `issue_depend` | gerencia as dependencias nativas |
| `issue_comment` | comenta, com o gate de prosa |
| `issue_update` | titulo, corpo e labels, com transicao de status |
| `issue_close` | fecha, com comentario opcional |
| `issue_reopen` | reabre |
| `milestone_view` | estado do marco em uma chamada: contagem, BLOQUEIOS e proxima sugerida |
| `milestone_list` | marcos com contagem e progresso |
| `milestone_create` | cria marco, com o gate na descricao |
| `milestone_update` | muda titulo, descricao ou estado |

### Pull request

| Tool | O que faz |
|---|---|
| `pr_list` | PRs com o CI de cada um, em um repo ou na org |
| `pr_view` | detalhe, CI do head, conversa, reviews e comentarios inline |
| `pr_checks` | so o estado de CI do head |
| `pr_files` | arquivos alterados com adicoes e delecoes |
| `pr_diff` | diff cru, com filtro por caminho ou linha |
| `pr_comment` | comenta, com o gate de prosa |
| `pr_create` | abre PR |
| `pr_merge` | mergeia, com porta de CI verde |
| `pr_batch` | a mesma branch em varios repos, com sha e CI de cada um |

`pr_merge` recusa quando ha check em falha ou pendente, a nao ser que
`force: true`. Conflito de merge nao e contornavel por `force`: a porta existe
para o CI, nao para passar por cima de conflito.

### CI

| Tool | O que faz |
|---|---|
| `ci_runs` | execucoes de um repo, de varios ou da org |
| `ci_run` | detalhe de uma execucao, com o CI do commit |
| `ci_wait` | bloqueia ate o run terminar ou ate o timeout, e traz as linhas de erro |
| `ci_logs` | log do run, com `step`, `grep` e `tail` |
| `ci_config` | variaveis, nomes dos secrets e workflows disponiveis |
| `ci_dispatch` | dispara um workflow |
| `ci_runners` | runners da org, com estado e labels |

`ci_wait` sem `run` e sem `branch` cai na branch padrao do repo: a do clone
(`origin/HEAD`), senao a da API. So recusa quando nenhuma das duas responde.

### Branch

| Tool | O que faz |
|---|---|
| `branch_protections` | branches e as regras do servidor em cada uma |
| `branch_compare` | se uma branch e ancestral da outra, quantos commits, e se ha PR aberto |
| `branch_promote` | promove `from` para as branches depois dele na ordem, sem force |
| `commit_list` | commits do clone local, com filtro de autor e datas |

`branch_promote` e `commit_list` usam o git local e precisam do clone no
workspace. As outras duas falam com a API e funcionam sem clone.

`branch_promote` cria a branch de destino quando ela ainda nao existe, e
`branch_compare` recusa com o nome da branch que falta. Nos dois o compare 404
quando uma ref nao existe, e a API nao diz qual delas.

A ordem de promocao vem de `PYATILETKA_PROMOTE_ORDER` e o padrao e
`staging,production`:

```
export PYATILETKA_PROMOTE_ORDER=develop,staging,production
```

Numa ordem, cada branch so sobe para as que vem depois dela. `branch_promote`
recusa promover para tras: para isso e PR.

## Hooks

**Contexto da issue vinculada.** A cada turno, o plugin injeta o titulo, o
estado, as labels, o corpo e todos os comentarios da issue vinculada, mais as
regras de trabalho enquanto o vinculo estiver ativo. Falha ao ler a issue vira
aviso no contexto, nao quebra o turno.

**Compaction.** O vinculo sobrevive a uma compactacao de sessao.

**Espera do push.** Depois de um `git push` de verdade, o hook espera o run do
CI terminar e devolve o veredito no mesmo turno, com as linhas de erro quando
falha. Push de teste (`--dry-run`) e com force ficam de fora, e repo sem
workflow configurado nao espera nada.

No v1 os hooks sao `experimental.chat.system.transform`,
`experimental.session.compacting` e `tool.execute.after`. No v2 equivalem a
`ctx.session.hook("context")`, `ctx.session.hook("compaction")` e
`ctx.tool.hook("execute.after")`.

## Como o repo e resolvido

1. o argumento `repo` da tool
2. o repo da issue vinculada a sessao
3. `PYATILETKA_DEFAULT_REPO`
4. o remote do clone

Aceita `repo`, `owner/repo` e `repo` prefixado com `PYATILETKA_ORG`. `repos` com
lista ou glob (`api-*`) varre varios repos em uma chamada.

## Estado e notificacao

No v1 o vinculo de sessao fica em
`<worktree>/.opencode/.state/issue-sessions/<sessionID>.json`, dentro do que o
opencode ja ignora. No v2 o mesmo vinculo vai para o `ctx.storage` do plugin. Nao
ha outro estado local.

No v2 o `notify` e no-op: toast passou a ser coisa de plugin de CLI no opencode
v2, e este pacote registra so o plugin de servidor.

## Desenvolvimento

```
mise run setup      # instala as dependencias
mise run test       # bun test
mise run lint       # eslint
mise run typecheck  # tsc --noEmit
mise run build      # bun build
mise run format     # prettier
```

O contrato `GitHost`, em `src/providers/types.ts`, e a unica fronteira entre as
tools e as APIs. As tools nunca chamam HTTP direto: o que diverge entre Gitea e
GitHub (id contra number de marco, nome contra id de label, paginacao, formato
de log, corpo de dependencia) fica no provider.

`src/testing/fake-git-host.ts` implementa `GitHost` em memoria, para as tools serem
testadas sem rede. Nao entra no pacote.

## Licenca

MIT. Ver [LICENSE](LICENSE) e `THIRD_PARTY_LICENSES/` para a lista de phrases
da skill unsloppify, tambem MIT.