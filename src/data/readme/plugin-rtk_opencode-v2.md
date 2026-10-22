# plugin-rtk_opencode-v2

[![npm version](https://img.shields.io/npm/v/plugin-rtk_opencode-v2.svg)](https://www.npmjs.com/package/plugin-rtk_opencode-v2)
[![CI](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

**Português (Brasil)** | [English](README.en.md) | [Italiano](README.it.md) | [简体中文](README.zh.md)

Plugin para [OpenCode V2](https://opencode.ai) que reescreve comandos de shell
para equivalentes do [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk)
antes da execução, reduzindo o número de tokens que o agente lê.

```text
git status          ->  rtk git status
ls -la | head -5    ->  rtk ls -la | head -5
cat package.json    ->  rtk read package.json
echo hi             ->  echo hi
```

A reescrita é feita em melhor esforço e de forma silenciosa: se o RTK estiver
ausente, lento ou falhar, o comando original é executado sem alterações.

## Por que usar

Ferramentas de shell produzem saídas grandes. `git status`, `grep`, `tsc` e
suítes de teste podem despejar milhares de linhas no contexto do agente, e cada
linha consome tokens. O RTK é um proxy de CLI que filtra e resume essas saídas
antes que o modelo as leia, preservando a informação útil.

O plugin não reimplementa nada disso: ele apenas troca o comando antes da
execução e deixa o RTK fazer o trabalho.

```text
git status                    ->  rtk git status
rg "TODO" src                 ->  rtk rg "TODO" src
tsc --noEmit                  ->  rtk tsc --noEmit
```

Comandos que invocam `npm`, `pnpm`, `yarn` ou `bun` são mantidos intactos,
inclusive scripts como `pnpm lint`, porque o conteúdo desses scripts é definido
pelo projeto. Veja [Como funciona](#como-funciona).

O ganho varia conforme o projeto e o comando. O RTK mantém um histórico local de
economia; consulte com:

```bash
rtk gain
```

O plugin não coleta telemetria e não envia dados para lugar nenhum.

## Requisitos

- OpenCode V2 `>= 2.1.1` instalado e funcionando
- Node.js `>= 22.13`
- [RTK](https://github.com/rtk-ai/rtk) `>= 0.27` disponível no `PATH` (ou defina
  `rtkPath`)

Instale o RTK usando um dos métodos oficiais:

```bash
brew install rtk
```

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

```powershell
winget install rtk-ai.rtk
```

Verifique a instalação:

```bash
rtk --version
```

## Instalação

O plugin é um pacote npm publicado e carregado pelo OpenCode V2. A versão atual
é `0.1.1`:

```bash
npm view plugin-rtk_opencode-v2 version
# 0.1.1
```

Você **não precisa** executar `npm install` nem `pnpm add`: o OpenCode instala
os pacotes declarados na configuração no startup e guarda o cache em:

```text
~/.cache/opencode/npm/<pacote>@latest/<build>/node_modules/
```

> A versão `0.0.0-stage` é um placeholder da primeira publicação; o `latest`
> aponta para `0.1.1` e é essa versão que o OpenCode instala.

### Opção 1 — CLI (recomendado)

```bash
opencode plugin add plugin-rtk_opencode-v2
```

O comando instala o pacote e adiciona a entrada ao `opencode.jsonc` global.
Confirme com:

```bash
opencode plugin list
```

### Opção 2 — editar a configuração

Arquivos de configuração aceitos pelo OpenCode V2:

| Escopo  | Caminho                                                        |
| ------- | -------------------------------------------------------------- |
| Global  | `~/.config/opencode/opencode.jsonc` (ou `.json`)               |
| Projeto | `./opencode.jsonc` ou `./.opencode/opencode.jsonc`             |

Adicione `plugins` ao arquivo existente; não substitua o restante da
configuração. Exemplo de um arquivo novo:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["plugin-rtk_opencode-v2"]
}
```

Com opções, use a forma de objeto:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "plugin-rtk_opencode-v2",
      "options": {
        "rtkPath": "/home/me/.local/bin/rtk",
        "timeoutMs": 750
      }
    }
  ]
}
```

> A forma em string (`"plugin-rtk_opencode-v2"`) não aceita opções. Use a forma
> de objeto sempre que precisar configurar alguma coisa.

### Primeiro carregamento

Na primeira execução, o OpenCode baixa o pacote; é necessário acesso à rede.
Depois o pacote fica em cache e os próximos startups são rápidos.

O `opencode plugin add` instala o pacote, mas **não ativa o plugin em sessões já
abertas**. O carregamento acontece no startup do serviço/sessão. Se você acabou
de instalar, reinicie o serviço ou abra uma nova sessão:

```bash
opencode service restart
```

O OpenCode V2 também recarrega configurações observadas automaticamente e
instala pacotes faltantes em background, mas o hook do plugin só passa a valer
no próximo carregamento.

### Verificar se está funcionando

1. Confirme que o plugin está listado:

   ```bash
   opencode plugin list
   ```

2. Confirme que o RTK reescreve comandos no mesmo ambiente do OpenCode:

   ```bash
   rtk rewrite "git status"
   # rtk git status
   ```

3. Ative o modo de diagnóstico nas opções do plugin:

   ```jsonc
   {
     "plugins": [
       {
         "package": "plugin-rtk_opencode-v2",
         "options": { "debug": true }
       }
     ]
   }
   ```

   Com `debug`, mensagens como `rtk probe succeeded`, `rtk rewrite timed out` e
   `rtk rewrite produced stderr diagnostics` aparecem no stderr do OpenCode. O
   conteúdo dos comandos nunca é registrado.

4. Rode um comando pelo agente, como `git status`, e depois verifique se o
   histórico do RTK registrou a execução:

   ```bash
   rtk gain
   ```

### Atualizar e remover

```bash
opencode plugin check
opencode plugin update plugin-rtk_opencode-v2
opencode plugin remove plugin-rtk_opencode-v2
```

`plugin check` verifica se há versões novas; `plugin update` atualiza todos os
plugins desatualizados (ou apenas o informado). Para remover, você também pode
apagar a entrada `plugins` do arquivo de configuração.

### Instalação local ou via Git

Para testar uma versão do código-fonte:

```bash
pnpm install
pnpm build
```

Depois aponte a configuração para o diretório absoluto do pacote:

```jsonc
{
  "plugins": ["/home/me/dev/plugin-rtk_opencode-v2"]
}
```

Também é possível instalar direto do GitHub:

```bash
opencode plugin add github:brennoclins/plugin-rtk_opencode-v2
```

O script `prepare` compila o projeto automaticamente nesse tipo de instalação.

Para uso offline, gere o tarball, extraia e aponte `plugins` para a pasta
extraída (ela contém `package.json` e `dist/`):

```bash
pnpm pack
tar -xzf plugin-rtk_opencode-v2-0.1.1.tgz
```

## Como funciona

Por padrão, o plugin registra `ctx.tool.hook("execute.before")` e reescreve
comandos emitidos pelas tools `bash` e `shell`. Ele chama:

```text
rtk rewrite <command>
```

por meio de `execFile`, sem shell, portanto o comando é passado como um único
argumento e não pode injetar sintaxe de shell no processo do plugin. O plugin
também não executa o comando reescrito: ele apenas altera o comando que o
OpenCode vai executar.

Um comando é considerado reescrito com sucesso quando `rtk rewrite` imprime um
stdout não vazio. Atualmente o RTK sai com código `3` em caso de sucesso e `1`
quando não há equivalente, então o plugin ignora deliberadamente o código de
saída e verifica o stdout. Comandos que já invocam `rtk` (inclusive por caminho
absoluto, `command`, `env` ou `nohup`) são mantidos intactos.

A disponibilidade do RTK é verificada com `rtk --version` e armazenada em cache
por `probeTtlMs`. Cada reescrita é limitada por `timeoutMs`. `ENOENT`, timeouts e
saída vazia resultam em passthrough silencioso. Mensagens em stderr são tratadas
como diagnóstico: se houver stdout com uma reescrita, o resultado é usado mesmo
assim.

Comandos que envolvem elevação de privilégio (`sudo`, `doas`, `pkexec`, `runas`,
`gsudo`, `su`) nunca são reescritos, inclusive dentro de pipes e shells aninhados
como `bash -c 'sudo ...'`. A ideia é que o plugin opere sempre com as permissões
do usuário que executa o OpenCode.

Comandos que invocam `npm`, `pnpm`, `yarn` ou `bun` também nunca são reescritos,
inclusive em comandos compostos como `cd app && pnpm lint`. Isso inclui scripts
de package manager: o corpo deles é definido pelo projeto, e o RTK pode mapear,
por exemplo, `pnpm lint` para `rtk lint`, que executa ESLint. Em projetos que usam Biome,
oxlint ou outro linter, isso mudaria o comando e poderia quebrar a execução. Se
quiser o ganho do RTK, invoque a ferramenta diretamente (`tsc --noEmit`,
`eslint src`) em vez de passar pelo script do package manager.

### Hook de shell opcional

Defina `useShellHook: true` para também registrar
`ctx.shell.hook("create.before")`. Isso cobre todos os comandos de shell criados
pelo OpenCode, incluindo comandos de outras tools, plugins e subagentes. Fica
desativado por padrão porque pode reescrever comandos internos que não deveriam
mudar.

Quando os dois hooks estão habilitados, o mesmo comando pode passar duas vezes.
A segunda passagem é barata porque comandos que começam com `rtk` são ignorados,
e `rtk rewrite` é idempotente.

## Opções

| Opção              | Padrão   | Descrição                                                          |
| ------------------ | -------- | ------------------------------------------------------------------ |
| `enabled`          | `true`   | Ativa ou desativa o plugin.                                        |
| `rtkPath`          | `"rtk"`  | Nome ou caminho absoluto do binário RTK.                           |
| `timeoutMs`        | `500`    | Timeout de cada chamada `rtk rewrite`.                             |
| `probeTtlMs`       | `60000`  | Por quanto tempo a verificação do RTK fica em cache. `0` desativa. |
| `useShellHook`     | `false`  | Também reescreve via `ctx.shell.hook("create.before")`.            |
| `debug`            | `false`  | Grava diagnóstico em stderr. Comandos nunca são registrados.       |
| `maxCommandLength` | `8000`   | Comandos maiores que isso não são reescritos.                      |

As opções só podem ser definidas na forma de objeto mostrada acima; a forma em
string usa apenas os valores padrão. Valores inválidos voltam aos padrões em vez
de impedir a inicialização do plugin.

Exemplo com caminho personalizado do binário e o hook de shell habilitado:

```jsonc
{
  "plugins": [
    {
      "package": "plugin-rtk_opencode-v2",
      "options": {
        "rtkPath": "/home/me/.local/bin/rtk",
        "timeoutMs": 750,
        "useShellHook": true,
        "debug": true
      }
    }
  ]
}
```

## Solução de problemas

**O plugin não aparece em `opencode plugin list`.** Confirme que a chave é
`plugins` (plural, sintaxe do V2), que o arquivo está em um dos caminhos aceitos
e que você reiniciou o OpenCode. Rode `opencode plugin add` novamente para
verificar a instalação. Para conferir o download, o cache fica em
`~/.cache/opencode/npm/plugin-rtk_opencode-v2@latest/<build>/node_modules/`.

**Instalei, mas os comandos continuam iguais.** O `plugin add` não aplica o
plugin a uma sessão já aberta. Reinicie o serviço com `opencode service restart`
ou abra uma nova sessão e teste novamente. O log do OpenCode deve mostrar
`loading plugin id=plugin-rtk_opencode-v2` no startup.

**Erro 404 ou "package not found" ao instalar.** Confirme o nome exato e a
versão publicada com `npm view plugin-rtk_opencode-v2 version` (esperado:
`0.1.1`) e verifique se o registry npm está acessível. Se o problema persistir,
use a instalação local ou via Git descrita acima.

**Os comandos não são reescritos.** Confirme que `rtk rewrite "git status"`
imprime um comando reescrito no mesmo ambiente em que o OpenCode é executado.
Verifique se o comando ainda não tem o prefixo `rtk`, se não é maior que
`maxCommandLength` e se `enabled` não é `false`. Ative `debug: true` para ver o
diagnóstico do plugin.

**`pnpm lint`, `npm run lint` e outros scripts não são reescritos.** Isso é
intencional. O plugin não altera invocações de scripts de package manager porque
o corpo do script é definido pelo projeto e o RTK pode assumir ESLint quando o
projeto usa outro linter. Execute o script normalmente ou chame a ferramenta
diretamente.

**RTK não é encontrado.** Defina `rtkPath` com um caminho absoluto. Em sistemas
onde o processo do OpenCode tem um `PATH` diferente, o binário pode não ser
encontrado pelo nome.

**Timeouts em máquinas lentas.** Aumente `timeoutMs`. Um timeout é sempre
seguro: o comando original é executado sem alterações.

**O hook de shell reescreve demais.** Mantenha `useShellHook` desativado (o
padrão) para que apenas comandos `bash`/`shell` emitidos pelo agente sejam
alterados.

**Windows.** `execFile` é multiplataforma, mas o suporte ao Windows é
best-effort e ainda não é coberto pela matriz de CI.

## Desenvolvimento

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm pack
```

A suíte de testes usa um binário RTK falso em `test/fixtures/fake-rtk.mjs`; o
`rtk` real não é necessário para executar os testes. O script `prepare` executa
o build em instalações via Git.

As releases são publicadas automaticamente pelo workflow `release.yml` no GitHub
Actions a cada push na `main`: ele incrementa a versão, publica no npm com
provenance e cria a release no GitHub. A versão `0.1.1` e as seguintes ficam em
<https://github.com/brennoclins/plugin-rtk_opencode-v2/releases>. O fluxo atual
usa um token granular do npm; a migração para Trusted Publishing (OIDC) está
planejada para 2026-11-01. Consulte
[CONTRIBUTING.md](https://github.com/brennoclins/plugin-rtk_opencode-v2/blob/main/CONTRIBUTING.md).

## Compatibilidade

- OpenCode V2 `2.1.1` e posteriores (`@opencode/plugin@^2.1.1`), testado com
  `2.1.2`
- RTK `0.27` e posteriores, testado com `0.49.0`
- Node.js `22` e `24`

OpenCode V1 não é suportado. Use o plugin original
[`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk) para V1.

## Créditos

- **Aris Ripandi** — autor do plugin original
  [`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk), com licença MIT,
  cuja abordagem e comportamento inspiraram esta implementação V2.
- **Contribuidores do RTK** — [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk),
  usado como binário externo e não incluído neste plugin.
- **Contribuidores do plugin-rtk_opencode-v2** — consulte [AUTHORS.md](AUTHORS.md).

Os textos de licenças de terceiros estão em
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licença

Copyright (C) 2026 Brenno C. Lins.

Licenciado sob a GNU General Public License, versão 3 ou posterior
(`GPL-3.0-or-later`). Consulte [LICENSE](LICENSE).
