# Nakamura Voice — STT + TTS para OpenCode

**Português** · [English](README.md)

Dite mensagens direto no composer e ouça as respostas em voz alta. Sem
configuração para falar: vozes gratuitas do Microsoft Edge, sem chave de API.
Opcionalmente, use o Kitsune-TTS local para vozes de anime offline.

## Instalar (2 minutos)

### Peça ao seu agente

Cole isto no OpenCode:

> Instale o plugin de voz `opencode-plugin-voice` e configure a leitura em voz alta em pt-BR.

O agente roda o comando por você.

### Ou faça você mesmo

```bash
opencode plugin add opencode-plugin-voice
```

Enquanto a versão do npm não sai, instale direto do GitHub:

```bash
opencode plugin add github:NakamuraIA/opencode-plugin-voice
```

Depois abra **Settings → Voice**, escolha uma voz (ex.: `pt-BR-FranciscaNeural`)
e clique em **Play sample**.

A leitura em voz alta funciona **sem chave de API**. O ditado precisa de uma
chave OpenRouter/Groq ou de um servidor Whisper local.

## O que ele faz

- **Ditado (STT)** — botão de microfone no composer; a transcrição entra no
  prompt.
  - **OpenRouter** — 30+ modelos de transcrição.
  - **Groq** — `whisper-large-v3-turbo` / `whisper-large-v3`.
  - **Local** — qualquer servidor compatível com OpenAI
    (`faster-whisper-server`, `whisper.cpp`, …).
- **Leitura em voz alta (TTS)** — botão no cabeçalho lê a última resposta,
  com opção de **leitura automática** quando a sessão fica ociosa.
- **Streaming** — um fluxo contínuo por resposta, sem limite de caracteres; as
  primeiras palavras tocam enquanto o resto é sintetizado.
- **Kitsune-TTS local (opcional)** — 5 vozes de anime, offline, sem chave.
- **Página de configurações** — teste de microfone ao vivo, amostra de voz,
  provedor/modelo/voz.

## Requisitos

- **OpenCode Desktop 2.x** (a parte visual usa a API experimental de GUI).
- Leitura em voz alta: internet; o Edge TTS não precisa de chave.
- Ditado: chave OpenRouter, chave Groq ou um servidor Whisper local compatível
  com OpenAI.
- Pacote Kitsune opcional: Windows 10/11, Python 3.10+, eSpeak NG.

## Configurações

| Seção | Campo | Observações |
|---|---|---|
| TTS | Engine | `edge` (padrão), `kitsune` (local), `openai` (VoiceBox/compatível) |
| TTS | Voice | nome da voz Edge, ex.: `pt-BR-FranciscaNeural` |
| TTS | Rate | `0.5`–`2.0` |
| TTS | Auto read-aloud | lê cada resposta terminada |
| TTS | Kitsune URL/voz/script | servidor local customizado (avançado) |
| TTS | API URL/modelo/voz | gateway compatível com OpenAI |
| STT | Provider | `openrouter`, `groq`, `local` |
| STT | Modelo/idioma/prompt | opções de transcrição |
| STT | Chaves de API | salvas localmente no storage do plugin |

## Kitsune-TTS local (opcional)

O Kitsune-TTS oficial (GPL-3.0) é um servidor local com 5 vozes. O pacote de
1 clique fica em `tools/kitsune-local/`.

```powershell
powershell -ExecutionPolicy Bypass -File tools/kitsune-local/setup.ps1
```

Inicie com:

```text
%LOCALAPPDATA%\KitsuneTTS\start_server.bat
```

Depois, em **Settings → Voice**, escolha o engine **OpenAI / VoiceBox**:

- URL: `http://127.0.0.1:8092`
- Model: `kitsune`
- Voice: `frieren` (ou `emilia`, `zerotwo`, `violet`, `hiro`)

Se o servidor local não estiver rodando, o plugin **cai automaticamente para o
Edge**. Detalhes em `tools/kitsune-local/README.md`.

### Nyra & Hana (beta)

Um fine-tune do Kitsune-TTS com duas vozes PT-BR (Nyra e Hana) está publicado em
[huggingface.co/Nakamuraa/kitsune-tts-nyra-hana-beta](https://huggingface.co/Nakamuraa/kitsune-tts-nyra-hana-beta)
(GPL-3.0, beta). Usa o mesmo servidor local na porta 8091; siga o model card para
instalar. Demo no navegador:
[nakamuraa-kitsune-tts-nyra-hana-demo.static.hf.space](https://nakamuraa-kitsune-tts-nyra-hana-demo.static.hf.space).

## Comandos

- `Dictate a message` — inicia/para a gravação (padrão: Ctrl+Shift+D).
- `Read the last reply aloud` — lê frase por frase.
- `Pause or resume read-aloud`.
- `Toggle auto read-aloud`.

Aperte **Esc** em qualquer lugar para cancelar a gravação ou parar a leitura.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| Leitura em voz alta muda (Edge) | `opencode plugin update` — o Edge troca o token interno; atualizar o plugin resolve. |
| Ditado reclama de chave | Settings → Voice → STT: configure a chave OpenRouter/Groq ou a URL local. |
| Kitsune mudo | Verifique `http://127.0.0.1:8091/health` (custom) ou `:8092` (pacote oficial). O plugin cai para o Edge. |
| Plugin não aparece | `opencode plugin list`; reinicie o app após a primeira instalação. |
| Settings → Voice não aparece | A parte visual só carrega quando a parte servidor carrega; reinicie o app. |

## Privacidade

- O microfone só grava enquanto você dita; o áudio vai apenas para o provedor
  de STT escolhido.
- O texto da leitura vai para o Microsoft Edge, a menos que você use o Kitsune
  local ou um servidor compatível com OpenAI.
- Sem telemetria. Chaves e configurações ficam no storage local do plugin.

## Desenvolvimento

```bash
npm install
npm run build        # dist/gui-experimental.cjs
npm run typecheck
npm test             # splitForSpeech / cleanForSpeech
npx --yes tsx tests/smoke.mjs
```

Veja `tests/README.md`.

## Licença

MIT — veja [LICENSE](LICENSE).

O Kitsune-TTS (pacote opcional) é GPL-3.0 de Heitorkk2, Everteson e Nakamura; o
pacote baixa o modelo das fontes oficiais. Edge TTS via `msedge-tts` (MIT).
