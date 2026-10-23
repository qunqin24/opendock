# plugin-rtk_opencode-v2

[![npm version](https://img.shields.io/npm/v/plugin-rtk_opencode-v2.svg)](https://www.npmjs.com/package/plugin-rtk_opencode-v2)
[![CI](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/brennoclins/plugin-rtk_opencode-v2/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

[Português (Brasil)](README.md) | [English](README.en.md) | **Italiano** | [简体中文](README.zh.md)

Plugin per [OpenCode V2](https://opencode.ai) che riscrive i comandi shell in
equivalenti [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) prima
dell'esecuzione, riducendo il numero di token letti dall'agente.

```text
git status          ->  rtk git status
ls -la | head -5    ->  rtk ls -la | head -5
cat package.json    ->  rtk read package.json
echo hi             ->  echo hi
```

La riscrittura è best-effort e silenziosa: se RTK manca, è lento o fallisce, il
comando originale viene eseguito invariato.

## Perché usarlo

Gli strumenti shell producono output di grandi dimensioni. `git status`, `grep`,
`tsc` e le suite di test possono riversare migliaia di righe nel contesto
dell'agente, e ogni riga costa token. RTK è un proxy CLI che filtra e riassume
questi output prima che il modello li legga, preservando le informazioni utili.

Il plugin non reimplementa nulla di tutto ciò: cambia solo il comando prima
dell'esecuzione e lascia che RTK faccia il lavoro.

```text
git status                    ->  rtk git status
rg "TODO" src                 ->  rtk rg "TODO" src
tsc --noEmit                  ->  rtk tsc --noEmit
```

I comandi che richiamano `npm`, `pnpm`, `yarn` o `bun` non vengono modificati,
compresi gli script come `pnpm lint`, perché il corpo dello script è definito dal
progetto. Vedi [Come funziona](#come-funziona).

Il guadagno dipende dal progetto e dal comando. RTK mantiene una cronologia
locale dei risparmi; consultala con:

```bash
rtk gain
```

Il plugin non raccoglie telemetria e non invia dati da nessuna parte.

## Requisiti

- OpenCode V2 `>= 2.1.1` installato e funzionante
- Node.js `>= 22.13`
- [RTK](https://github.com/rtk-ai/rtk) `>= 0.27` disponibile nel `PATH` (oppure
  imposta `rtkPath`)

Installa RTK usando uno dei metodi ufficiali:

```bash
brew install rtk
```

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

```powershell
winget install rtk-ai.rtk
```

Verifica l'installazione:

```bash
rtk --version
```

## Installazione

Il plugin è un pacchetto npm pubblicato e caricato da OpenCode V2. La versione
attuale è `0.1.1`:

```bash
npm view plugin-rtk_opencode-v2 version
# 0.1.1
```

**Non** è necessario eseguire `npm install` o `pnpm add`: OpenCode installa i
pacchetti dichiarati nella configurazione all'avvio e li memorizza nella cache
in:

```text
~/.cache/opencode/npm/<pacchetto>@latest/<build>/node_modules/
```

> La versione `0.0.0-stage` è un placeholder della prima pubblicazione; `latest`
> punta a `0.1.1`, la versione installata da OpenCode.

### Opzione 1 — CLI (consigliata)

```bash
opencode plugin add plugin-rtk_opencode-v2
```

Il comando installa il pacchetto e aggiunge la voce al file globale
`opencode.jsonc`. Conferma con:

```bash
opencode plugin list
```

### Opzione 2 — modificare la configurazione

File di configurazione accettati da OpenCode V2:

| Ambito  | Percorso                                                     |
| ------- | ------------------------------------------------------------ |
| Globale | `~/.config/opencode/opencode.jsonc` (o `.json`)              |
| Progetto | `./opencode.jsonc` oppure `./.opencode/opencode.jsonc`      |

Aggiungi `plugins` al file esistente; non sostituire il resto della
configurazione. Esempio di un file nuovo:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["plugin-rtk_opencode-v2"]
}
```

Quando servono opzioni, usa la forma a oggetto:

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

> La forma a stringa (`"plugin-rtk_opencode-v2"`) non accetta opzioni. Usa la
> forma a oggetto ogni volta che devi configurare qualcosa.

### Primo caricamento

Alla prima esecuzione OpenCode scarica il pacchetto; è necessario l'accesso alla
rete. Dopo, il pacchetto resta in cache e gli avvii successivi sono rapidi.

`opencode plugin add` installa il pacchetto, ma **non attiva il plugin nelle
sessioni già aperte**. Il caricamento avviene all'avvio del servizio/sessione. Se
lo hai appena installato, riavvia il servizio o apri una nuova sessione:

```bash
opencode service restart
```

OpenCode V2 ricarica automaticamente anche le configurazioni osservate e installa
i pacchetti mancanti in background, ma l'hook del plugin diventa effettivo solo
al caricamento successivo.

### Verificare che funzioni

1. Conferma che il plugin sia elencato:

   ```bash
   opencode plugin list
   ```

2. Conferma che RTK riscriva i comandi nello stesso ambiente di OpenCode:

   ```bash
   rtk rewrite "git status"
   # rtk git status
   ```

3. Attiva la modalità diagnostica nelle opzioni del plugin:

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

   Con `debug`, messaggi come `rtk probe succeeded`, `rtk rewrite timed out` e
   `rtk rewrite produced stderr diagnostics` compaiono nello stderr di OpenCode.
   Il contenuto dei comandi non viene mai registrato.

4. Esegui un comando tramite l'agente, ad esempio `git status`, e controlla se
   la cronologia di RTK ha registrato l'esecuzione:

   ```bash
   rtk gain
   ```

### Aggiornare e rimuovere

```bash
opencode plugin check
opencode plugin update plugin-rtk_opencode-v2
opencode plugin remove plugin-rtk_opencode-v2
```

`plugin check` cerca nuove versioni; `plugin update` aggiorna tutti i plugin
obsoleti (o solo quello indicato). Per rimuoverlo, puoi anche eliminare la voce
`plugins` dal file di configurazione.

### Installazione locale o via Git

Per provare un checkout del codice sorgente:

```bash
pnpm install
pnpm build
```

Poi punta la configurazione alla directory assoluta del pacchetto:

```jsonc
{
  "plugins": ["/home/me/dev/plugin-rtk_opencode-v2"]
}
```

Puoi anche installare direttamente da GitHub:

```bash
opencode plugin add github:brennoclins/plugin-rtk_opencode-v2
```

Lo script `prepare` compila automaticamente il progetto per questo tipo di
installazione.

Per l'uso offline, crea il tarball, estrailo e punta `plugins` alla directory
estratta (contiene `package.json` e `dist/`):

```bash
pnpm pack
tar -xzf plugin-rtk_opencode-v2-0.1.1.tgz
```

## Come funziona

Per impostazione predefinita il plugin registra
`ctx.tool.hook("execute.before")` e riscrive i comandi emessi tramite i tool
`bash` e `shell`. Chiama:

```text
rtk rewrite <command>
```

tramite `execFile`, senza shell, quindi il comando viene passato come un singolo
argomento e non può iniettare sintassi shell nel processo del plugin. Il plugin
inoltre non esegue il comando riscritto: cambia solo il comando che OpenCode
eseguirà.

Un comando è considerato riscritto con successo quando `rtk rewrite` stampa uno
stdout non vuoto. Attualmente RTK esce con codice `3` in caso di successo e `1`
quando non esiste un equivalente, quindi il plugin ignora deliberatamente il
codice di uscita e controlla lo stdout. I comandi che invocano già `rtk`
(inclusi percorso assoluto, `command`, `env` o `nohup`) vengono lasciati
invariati.

La disponibilità di RTK viene verificata con `rtk --version` e memorizzata nella
cache per `probeTtlMs`. Ogni riscrittura è limitata da `timeoutMs`. `ENOENT`,
timeout e output vuoto producono un passthrough silenzioso. Lo stderr è trattato
come diagnostica: se lo stdout contiene una riscrittura, viene comunque usata.

I comandi che comportano escalation di privilegi (`sudo`, `doas`, `pkexec`,
`runas`, `gsudo`, `su`) non vengono mai riscritti, anche dentro pipe e shell
annidate come `bash -c 'sudo ...'`. Il plugin deve operare con i permessi
dell'utente che esegue OpenCode.

Anche i comandi che richiamano `npm`, `pnpm`, `yarn` o `bun` non vengono mai
riscritti, compresi i comandi composti come `cd app && pnpm lint`. Questo vale
anche per gli script di package manager: il loro corpo è definito dal progetto e
RTK può mappare, per esempio, `pnpm lint` su `rtk lint`, che esegue ESLint. Nei progetti che usano Biome,
oxlint o un altro linter, questo cambierebbe il comando e potrebbe rompere
l'esecuzione. Per ottenere il risparmio di RTK, richiama direttamente lo
strumento (`tsc --noEmit`, `eslint src`) invece di passare dallo script del
package manager.

### Hook shell opzionale

Imposta `useShellHook: true` per registrare anche
`ctx.shell.hook("create.before")`. Questo copre ogni comando shell creato da
OpenCode, inclusi comandi di altri tool, plugin e subagenti. È disattivato per
impostazione predefinita perché potrebbe riscrivere comandi interni che non
dovrebbero cambiare.

Quando entrambi gli hook sono abilitati, lo stesso comando può passare due volte.
Il secondo passaggio è economico perché i comandi che iniziano con `rtk` vengono
saltati e `rtk rewrite` è idempotente.

## Opzioni

| Opzione            | Predefinito | Descrizione                                                             |
| ------------------ | ----------- | ----------------------------------------------------------------------- |
| `enabled`          | `true`      | Abilita o disabilita il plugin.                                         |
| `rtkPath`          | `"rtk"`     | Nome o percorso assoluto del binario RTK.                               |
| `timeoutMs`        | `500`       | Timeout per ogni chiamata `rtk rewrite`.                                |
| `probeTtlMs`       | `60000`     | Per quanto tempo viene memorizzata la verifica di RTK. `0` la disabilita. |
| `useShellHook`     | `false`     | Riscrive anche tramite `ctx.shell.hook("create.before")`.               |
| `debug`            | `false`     | Scrive messaggi diagnostici su stderr. I comandi non vengono mai registrati. |
| `maxCommandLength` | `8000`      | I comandi più lunghi di questo valore non vengono riscritti.            |

Le opzioni possono essere impostate solo nella forma a oggetto mostrata sopra;
la forma a stringa usa solo i valori predefiniti. Valori non validi tornano ai
valori predefiniti invece di impedire l'avvio del plugin.

Esempio con un percorso personalizzato del binario e l'hook shell abilitato:

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

## Risoluzione dei problemi

**Il plugin non compare in `opencode plugin list`.** Verifica che la chiave sia
`plugins` (plurale, sintassi V2), che il file sia in uno dei percorsi accettati e
che tu abbia riavviato OpenCode. Esegui di nuovo `opencode plugin add` per
controllare l'installazione. Per verificare il download, la cache si trova in
`~/.cache/opencode/npm/plugin-rtk_opencode-v2@latest/<build>/node_modules/`.

**Ho installato il plugin, ma i comandi non cambiano.** `plugin add` non applica
il plugin a una sessione già aperta. Riavvia il servizio con
`opencode service restart` o apri una nuova sessione e riprova. Nel log di
OpenCode deve comparire `loading plugin id=plugin-rtk_opencode-v2` all'avvio.

**Errore 404 o "package not found" durante l'installazione.** Verifica il nome
esatto e la versione pubblicata con `npm view plugin-rtk_opencode-v2 version`
(attesa: `0.1.1`) e controlla che il registry npm sia raggiungibile. Se il
problema persiste, usa l'installazione locale o via Git descritta sopra.

**I comandi non vengono riscritti.** Verifica che `rtk rewrite "git status"`
stampi un comando riscritto nello stesso ambiente in cui viene eseguito
OpenCode. Controlla che il comando non abbia già il prefisso `rtk`, non sia più
lungo di `maxCommandLength` e che `enabled` non sia `false`. Attiva
`debug: true` per vedere la diagnostica del plugin.

**`pnpm lint`, `npm run lint` e altri script non vengono riscritti.** È
intenzionale. Il plugin non modifica i richiami agli script di package manager
perché il corpo dello script è definito dal progetto e RTK può assumere ESLint
quando il progetto usa un altro linter. Esegui lo script normalmente o richiama
direttamente lo strumento.

**RTK non viene trovato.** Imposta `rtkPath` su un percorso assoluto. Sui sistemi
in cui il processo OpenCode ha un `PATH` diverso, il binario potrebbe non essere
individuabile per nome.

**Timeout su macchine lente.** Aumenta `timeoutMs`. Un timeout è sempre sicuro:
il comando originale viene eseguito invariato.

**L'hook shell riscrive troppo.** Mantieni `useShellHook` disattivato
(l'impostazione predefinita) in modo che vengano modificati solo i comandi
`bash`/`shell` emessi dall'agente.

**Windows.** `execFile` è multipiattaforma, ma il supporto Windows è best-effort
e non è ancora coperto dalla matrice CI.

## Sviluppo

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm pack
```

La suite di test usa un binario RTK finto in `test/fixtures/fake-rtk.mjs`; il
`rtk` reale non è necessario per eseguire i test. Lo script `prepare` esegue la
build per le installazioni via Git.

Le release sono pubblicate automaticamente dal workflow `release.yml` in GitHub
Actions a ogni push su `main`: incrementa la versione, pubblica su npm con
provenance e crea la release su GitHub. La versione `0.1.1` e le successive sono
elencate in <https://github.com/brennoclins/plugin-rtk_opencode-v2/releases>. Il
flusso attuale usa un token npm granulare; la migrazione a Trusted Publishing
(OIDC) è prevista per il 2026-11-01. Vedi
[CONTRIBUTING.md](https://github.com/brennoclins/plugin-rtk_opencode-v2/blob/main/CONTRIBUTING.md).

## Compatibilità

- OpenCode V2 `2.1.1` e successivi (`@opencode/plugin@^2.1.1`), testato con
  `2.1.2`
- RTK `0.27` e successivi, testato con `0.49.0`
- Node.js `22` e `24`

OpenCode V1 non è supportato. Usa il plugin originale
[`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk) per V1.

## Crediti

- **Aris Ripandi** — autore del plugin originale
  [`opencode-rtk`](https://www.npmjs.com/package/opencode-rtk) con licenza MIT,
  il cui approccio e comportamento hanno ispirato questa implementazione V2.
- **Contributori di RTK** — [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk),
  usato come binario esterno e non incluso in questo plugin.
- **Contributori di plugin-rtk_opencode-v2** — vedi [AUTHORS.md](AUTHORS.md).

I testi delle licenze di terze parti sono in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licenza

Copyright (C) 2026 Brenno C. Lins.

Concesso in licenza sotto la GNU General Public License, versione 3 o successiva
(`GPL-3.0-or-later`). Vedi [LICENSE](LICENSE).
