# opencode-warp-retry

Rotaciona automaticamente o IP do **Cloudflare WARP** e tenta novamente quando o **OpenCode** atinge o limite gratuito.

Quando um modelo gratuito retorna `provider.free-limit`, o plugin desconecta o WARP, reconecta para obter um novo IP de saída, espera o proxy voltar e pede ao OpenCode para tentar de novo — repetindo a cada falha dentro do limite de tentativas do OpenCode.

> Não é afiliado ao OpenCode nem à Cloudflare. Use por sua conta e risco.

## Como funciona

1. Registra um hook `retry` no servidor do OpenCode.
2. Detecta `provider.free-limit` (e erros `provider.quota` cuja mensagem contenha "free usage limit").
3. Executa:
   - `warp-cli disconnect`
   - espera 0,8 s
   - `warp-cli connect`
   - consulta `https://www.cloudflare.com/cdn-cgi/trace` até aparecer `warp=on`
4. Se o WARP voltar com o **mesmo IP**, rotaciona de novo (até `maxRotations`).
5. Espera 1 s e define `{ retry: true, delay: 1000 }` no evento de retry.
6. Repete na próxima falha, até a troca de IP funcionar ou o OpenCode atingir o limite interno de ~10 tentativas por requisição.

O plugin só ativa quando o **processo do servidor** do OpenCode tem `HTTPS_PROXY`, `HTTP_PROXY` ou `ALL_PROXY` apontando para o proxy do WARP. Ele não altera o proxy do Windows inteiro.

## Requisitos

- **OpenCode v2** (testado com `2.2.6`).
- **Cloudflare WARP** instalado, logado e em **modo proxy**.
- `curl` disponível (Windows 10+ já tem; macOS e a maioria das distribuições Linux também).
- O servidor do OpenCode precisa herdar as variáveis de proxy.

Coloque o WARP em modo proxy uma vez:

```sh
warp-cli mode proxy
warp-cli connect
```

O proxy padrão é `http://127.0.0.1:40000`. Se o seu for diferente, configure `proxyUrl`.

## Instalação

### Pelo npm

```sh
opencode plugin add opencode-warp-retry
```

### Pelo GitHub

```sh
opencode plugin add github:lipey1/opencode-warp-retry
```

Troque `lipey1` pelo dono do repositório se você fez fork.

### Windows em um comando (cópia baixada)

Se você baixou o repositório (ZIP ou clone) e não quer usar a CLI:

```powershell
powershell -ExecutionPolicy Bypass -File .\launcher\windows\Install.ps1
```

Isso copia o plugin para `%USERPROFILE%\.config\opencode\plugins\warp-retry\index.ts` (salvando um `.bak` do arquivo anterior, se existir) e cria o atalho **OpenCode (WARP)**. Use `-Force` para substituir um atalho existente sem perguntar; o atalho anterior é salvo como `.lnk.bak`.

> Use apenas um método de instalação. Se o plugin já foi instalado com `opencode plugin add`, não copie o `src/index.ts` manualmente também.

### Manual

Copie `src/index.ts` para um destes caminhos (o OpenCode descobre plugins automaticamente):

- Windows: `%USERPROFILE%\.config\opencode\plugins\warp-retry\index.ts`
- macOS/Linux: `~/.config/opencode/plugins/warp-retry/index.ts`

Não precisa adicionar nada no `opencode.jsonc`. Para passar opções, referencie o pacote explicitamente:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-warp-retry",
      "options": {
        "proxyUrl": "http://127.0.0.1:40000",
        "retryDelayMs": 1000,
        "maxRotations": 3
      }
    }
  ]
}
```

## Abrir o OpenCode com o proxy do WARP

O plugin não consegue mudar a rede de um processo que já está rodando. O **serviço em segundo plano** do OpenCode precisa iniciar com as variáveis de proxy.

### Windows (launcher incluído)

O `Install.ps1` acima já instala o plugin e cria este atalho. Para criar ou atualizar apenas o atalho:

```powershell
powershell -ExecutionPolicy Bypass -File .\launcher\windows\Install-Shortcut.ps1
```

Isso cria o atalho **OpenCode (WARP)** na Área de Trabalho. Ele pergunta antes de sobrescrever um atalho existente e salva o anterior como `.lnk.bak`. O launcher:

- avisa se o OpenCode já estiver aberto (feche completamente antes);
- para o serviço antigo para ele renascer com o proxy;
- testa o proxy do WARP e tenta conectar o WARP se necessário;
- abre o OpenCode com `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` e `NO_PROXY`;
- se o proxy não responder, abre sem WARP e avisa.

### Manual (qualquer sistema)

```sh
opencode service stop
export HTTPS_PROXY=http://127.0.0.1:40000
export HTTP_PROXY=http://127.0.0.1:40000
export ALL_PROXY=http://127.0.0.1:40000
export NO_PROXY=localhost,127.0.0.1,::1
opencode
```

No OpenCode Desktop, use o launcher (ou reinicie o serviço depois de definir as variáveis) para o serviço herdar o proxy.

## Configuração

As opções podem ir no `opencode.json(c)` ou em variáveis de ambiente. Opções têm prioridade sobre variáveis.

| Opção | Variável | Padrão | Descrição |
|---|---|---|---|
| `proxyUrl` | `WARP_RETRY_PROXY` | `http://127.0.0.1:40000` | URL do proxy do WARP |
| `warpCli` | `WARP_RETRY_WARP_CLI` | auto | Caminho do `warp-cli` |
| `curl` | `WARP_RETRY_CURL` | auto | Caminho do `curl` |
| `logFile` | `WARP_RETRY_LOG` | padrão do sistema | Arquivo de log |
| `retryDelayMs` | `WARP_RETRY_DELAY_MS` | `1000` | Espera antes do retry (0–60000) |
| `maxRotations` | `WARP_RETRY_MAX_ROTATIONS` | `3` | Rotações por falha quando o IP não muda (1–10) |
| `requireProxyEnv` | `WARP_RETRY_REQUIRE_PROXY` | `true` | Com `false`, ativa mesmo sem variável de proxy correspondente |

Detecção automática do `warpCli`:

- Windows: `C:\Program Files\Cloudflare\Cloudflare WARP\warp-cli.exe`; senão `warp-cli` do `PATH`.
- macOS/Linux: `warp-cli` do `PATH`.

## Logs

- Windows: `%LOCALAPPDATA%\opencode-warp-retry\warp-retry.log`
- macOS/Linux: `~/.local/share/opencode-warp-retry/warp-retry.log`

Exemplo:

```text
plugin loaded; automatic free-limit retry enabled (proxy: http://127.0.0.1:40000)
free usage limit on attempt 2; starting a WARP rotation
free usage limit reached: disconnecting WARP (rotation 1/3)
disconnect: ok=true code=0 Success
reconnecting WARP
connect: ok=true code=0 Success
WARP ready after 500ms; IP 2a09:bac5:... -> 2a09:bac1:...; settling for 1000ms
WARP reconnected; retrying in 1000ms (attempt 2)
```

Se o plugin carregar mas as variáveis de proxy não baterem:

```text
plugin loaded but no proxy environment matches http://127.0.0.1:40000; automatic retry disabled.
```

## Comportamento e limitações

- O OpenCode v2 limita a aproximadamente **10 tentativas físicas por requisição**. O plugin rotaciona dentro desse teto; ao atingir o limite, o erro original aparece.
- Se trocar o IP não resolver depois de várias rotações, o limite provavelmente é **por conta**, não por IP. Só resta esperar o reset da cota ou usar um modelo pago.
- Rotacionar o WARP interrompe brevemente outro tráfego que use WARP na mesma máquina.
- O plugin não altera o proxy do sistema e não funciona se o OpenCode for aberto sem as variáveis de proxy (por design).
- Falhas simultâneas compartilham um único ciclo do WARP; uma rotação recente é reaproveitada para a mesma leva de falhas.

## Solução de problemas

| Sintoma | O que fazer |
|---|---|
| `plugin loaded but no proxy environment matches ...` | Abra pelo atalho do WARP ou defina `HTTPS_PROXY`. |
| `warp-cli connect failed` | Configure `warpCli` com o caminho completo e confirme que o WARP está logado. |
| `WARP proxy did not return within 10s` | Rode `warp-cli mode proxy` e `warp-cli connect`; confira a porta 40000. |
| O plugin nunca dispara | Veja o log. O erro precisa ser `provider.free-limit`. |
| O OpenCode abre sem WARP | O launcher não alcançou o proxy; ele abre sem WARP e avisa. |
| Continua limitado após rotações | Provável cota por conta; trocar IP não resolve. |

## Desenvolvimento

```text
src/index.ts                  código do plugin
launcher/windows/             launcher do Windows + instalador em um comando
examples/opencode.jsonc       exemplo de configuração
```

É TypeScript puro com módulos nativos do Node e o SDK `@opencode/plugin`. Não precisa de build; o OpenCode carrega `src/index.ts` diretamente.

Para testar um checkout local, adicione o caminho absoluto no `opencode.json(c)`:

```jsonc
{
  "plugins": ["D:/caminho/para/opencode-warp-retry"]
}
```

Depois abra o OpenCode com as variáveis de proxy.

## Licença

MIT — veja [LICENSE](LICENSE).

English: [README.md](README.md)
