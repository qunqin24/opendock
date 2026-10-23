# OpenCode Design System

[![Versione npm](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![Licenza MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**Un plugin collaborativo per OpenCode v2 per creare ed evolvere sistemi di design portabili e indipendenti dai framework, che gli agenti IA possano davvero seguire.**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **Avviso:** Questo è un progetto indipendente della community. Non è sviluppato dal team OpenCode e non è affiliato a OpenCode in alcun modo.

Il sistema di design diventa la memoria visiva duratura di un progetto: file strutturati in **Markdown e JSON** per token semantici, preferenze esplicite, decisioni di design, componenti, pattern e specifiche delle schermate. Da queste fonti viene generata un'anteprima HTML interattiva, che non è mai una seconda fonte di verità.

## Perché questo plugin?

- **Inizia con una conversazione, non con un questionario.** Chiarisci solo le decisioni importanti sull'identità visiva ancora incerte e mantieni esplicite le preferenze dell'utente.
- **Documenta ciò che esiste già.** Un'analisi limitata e in sola lettura aiuta a formalizzare un'interfaccia esistente senza riprogettarla di nascosto.
- **Fornisci agli agenti il contesto pertinente.** Il caricamento progressivo fornisce token, componenti, pattern e indicazioni rilevanti per l'attività UI, invece di inserire l'intero sistema in ogni prompt.
- **Fai evolvere il sistema in modo coerente.** Tieni traccia delle decisioni, delle dipendenze dei token semantici, dei componenti e pattern interessati, dello stato e delle versioni del sistema di design.
- **Evita di dipendere da un framework.** Il formato autorevole è Markdown e JSON, non React, Vue, Tailwind o un'anteprima generata.
- **Proteggi i file del progetto.** Analisi e controlli sono in sola lettura. La creazione non sostituisce una directory `design-system/` esistente e conserva i contenuti di `AGENTS.md` al di fuori del blocco gestito dal plugin.

## Requisiti

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 o versioni successive**

## Installazione

### Installa il pacchetto pubblicato su npm

Installalo globalmente con la CLI di OpenCode:

```sh
opencode plugin add opencode-design-system
```

Per fissare una versione specifica di npm, sostituisci `<version>` con la versione desiderata:

```sh
opencode plugin add opencode-design-system@<version>
```

In alternativa, configuralo per un progetto in `opencode.json` o `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode carica i plugin configurati all'avvio. Se il plugin non compare, riavvia OpenCode o il servizio OpenCode.

### Installa direttamente da GitHub

Per la versione più recente del branch predefinito:

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

Per fissare una release taggata di GitHub, sostituisci `<tag>` con il tag desiderato:

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
```

### Usa un checkout locale

Clona il repository, installa le dipendenze di sviluppo e compila il progetto:

```sh
npm install
npm run build
```

Poi indica a OpenCode la directory del checkout (adatta il percorso relativo al tuo progetto):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

Il repository include anche un entrypoint locale facoltativo per i test in `plugins/local/index.js`; non viene caricato automaticamente e non fa parte del pacchetto npm.

## Per iniziare

Crea un sistema partendo da una direzione visiva:

```text
/design-system Uno spazio di lavoro calmo e compatto, con verdi tenui, superfici nitide e senza gradienti.
```

Se il progetto ha già un'interfaccia, chiedi prima all'agente di analizzarla. Spiegherà cosa ha trovato e ti chiederà se vuoi documentare l'identità esistente o partire da zero prima di creare qualsiasi cosa:

```text
/design-system Analizza l'interfaccia di questa app e aiutami a documentare il suo linguaggio visivo attuale.
```

Per progettare una schermata senza chiedere al plugin di implementare il codice UI:

```text
/design-screen Gestione utenti con ricerca, filtri, inviti e stati vuoti.
```

Puoi anche chiedere una specifica di schermata in linguaggio naturale senza usare `/design-screen`. Quando esiste un manifest, il plugin indirizza l'agente verso `AGENTS.md` del progetto e le indicazioni pertinenti del sistema di design.

## Comandi

| Comando | Funzione |
| --- | --- |
| `/design-system [idea]` | Crea un sistema in collaborazione o discuti come documentare un'interfaccia esistente. |
| `/design-system/update [change]` | Applica una modifica semantica con versione e individua la documentazione dipendente. |
| `/design-system/preview` | Rigenera l'anteprima interattiva dai file strutturati. |
| `/design-system/review` | Apri uno spazio locale a due pannelli con anteprima, conversazione OpenCode corrente e selezione contestuale degli elementi. |
| `/design-system/check` | Esegui un controllo euristico in sola lettura per individuare possibili divergenze tra gli stili UI e i token documentati. |
| `/design-screen [screen]` | Salva una specifica di schermata pronta per l'implementazione senza scrivere codice UI dell'applicazione. |

Il plugin registra anche gli strumenti `design_system_create`, `design_system_read`, `design_system_analyze`, `design_system_update`, `design_system_preview`, `design_system_check` e `design_system_screen_spec`, utilizzabili dall'agente quando necessario.

## Come funziona

### Un flusso attento per i prodotti esistenti

Lo strumento `design_system_analyze` legge probabili sorgenti UI e di stile, configurazioni di framework riconosciute e dipendenze dichiarate. Riassume indizi come variabili CSS, colori, raggi, spaziature, breakpoint responsive e possibili componenti. L'analisi è limitata, esclude le directory di dipendenze e build, non segue collegamenti simbolici e non modifica i file letti. I risultati sono indizi, non prove che una differenza sia un errore.

L'agente spiega le incertezze e chiede prima di normalizzare decisioni visive importanti o ambigue. L'analisi non autorizza a riprogettare o modificare il codice dell'applicazione.

### Protezione dei file del progetto

La creazione scrive una nuova directory `design-system/` e aggiunge o aggiorna esclusivamente il blocco gestito dal plugin nell'`AGENTS.md` principale. Se `design-system/` contiene già file, la creazione rifiuta di sostituirli. Gli aggiornamenti scrivono intenzionalmente negli artefatti del sistema di design; gli strumenti integrati di analisi e controllo non modificano mai i file UI dell'applicazione.

Le istruzioni gestite in `AGENTS.md` sono portabili: spiegano a OpenCode e agli altri agenti di programmazione dove trovare le fonti indipendenti dai framework e come caricare solo ciò che serve per un'attività. Il plugin non copia agenti, comandi o skill nel progetto.

### Una fonte di verità portabile

La directory generata ha in genere questa struttura:

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # I contenuti esistenti restano al di fuori del blocco gestito.
```

Il manifest indicizza temi, versioni, file e riferimenti ai token dichiarati da ogni componente e pattern. I sistemi iniziano da `0.1.0` con la versione dello schema `1.0.0`; il loro stato di revisione è `draft`, `review` o `stable`.

I token usano percorsi semantici e possono definire più temi:

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

Il vocabolario può estendersi a tipografia, layout, elevazione, movimento, breakpoint, focus e stati. I componenti descrivono scopo, varianti, token, comportamento, accessibilità, adattamento responsive e relazioni. I pattern documentano composizioni utili come moduli, navigazione, filtri, tabelle e stati vuoti.

### Aggiornamenti significativi e versionati

`/design-system/update` legge il manifest e i documenti pertinenti prima di modificare il sistema. Per impostazione predefinita, l'aggiornamento di un token semantico applica quel percorso a tutti i temi; usa il prefisso `themes.<name>.` per modificare un solo tema. L'aggiornamento registra la motivazione, individua le dipendenze dichiarate, aggiorna la documentazione pertinente e rigenera l'anteprima.

L'impatto sulla versione del sistema di design segue queste regole:

- **PATCH** — correzioni compatibili o modifiche alla documentazione.
- **MINOR** — aggiunte compatibili, come un nuovo token, componente o pattern.
- **MAJOR** — modifiche che possono compromettere contratti di design esistenti.

Queste versioni appartengono al sistema di design generato nel progetto, non al pacchetto npm del plugin. Per impostazione predefinita, i sistemi aggiornati tornano a `draft` per consentire una revisione umana.

## Skill di design integrate

Il plugin registra internamente tre skill di design adattate tramite OpenCode v2. Vengono usate insieme quando si crea o aggiorna un Design System, si scelgono i token o si specificano schermate: direzione visiva, progettazione di interfacce di prodotto e decisioni sui token accessibili. Guidano l'agente senza sostituire la fonte di verità del progetto, indipendente dai framework e basata su Markdown e JSON; i loro file `SKILL.md` **non vengono scritti nei progetti degli utenti**.

### Personalizzare le skill

L'opzione `designSkills` consente di disattivare tutte le skill integrate o alcune di esse, oppure di consentire solo ID selezionati. In un oggetto, gli ID omessi restano attivi. Imposta `"designSkills": false` per disattivarle tutte e tre oppure passa un array per attivare solo gli ID elencati. Aggiungi una skill personale a livello globale in `~/.config/opencode/skills/<id-della-tua-skill>/SKILL.md`. Disattiva la skill integrata corrispondente se la tua deve sostituirla. Per modificare una skill integrata, modifica `skills/<cartella-della-skill>/SKILL.md` in un checkout locale o fork del plugin e carica quel checkout; conserva i crediti e la licenza della fonte. Avvisi completi: [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

### Crediti

- **Frontend Design** — Anthropic; autori originali Prithvi Rajasekaran e Alexander Bricken. [Fonte](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0.
- **Interface Design** — Dammyjay93 (Damola Akinleye). [Fonte](https://github.com/Dammyjay93/interface-design) · MIT.
- **Design System Auditor** — Community-Access; copyright © Taylor Arndt. [Fonte](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT.

## Anteprima interattiva

`design-system/preview/index.html` viene generato da manifest, token e specifiche di componenti e pattern. Include esempi di token e componenti, cambio di tema quando ce n'è più di uno ed esempi interattivi. Supporta il focus da tastiera visibile e `prefers-reduced-motion`.

Usa `/design-system/review` per aprire uno spazio di revisione locale con l'anteprima interattiva a sinistra e la stessa sessione OpenCode a destra. I messaggi inviati dal pannello destro arrivano a quella sessione; al termine di ogni turno viene aggiornata l'anteprima generata. Attiva **Seleziona elemento** per scegliere componenti, pattern o campioni di token semantici documentati e allegare fino a otto riferimenti verificati a un messaggio. I riferimenti usano nomi del manifest, percorsi sorgente e percorsi dei token — non selettori DOM — e vengono verificati di nuovo prima dell'invio, così una selezione obsoleta non può indirizzare silenziosamente un elemento diverso. L'HTML autonomo resta disponibile e funziona anche senza questo spazio. Il server di revisione si collega a una porta casuale su `127.0.0.1`, si arresta quando il plugin viene scaricato e non espone le credenziali OpenCode al browser. Per impostazione predefinita, il comando pubblica un link nella conversazione invece di aprire automaticamente un browser.

Per aprire automaticamente il browser di sistema quando esegui il comando di revisione, configura questa opzione del plugin:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

Rigenera l'anteprima in OpenCode con `/design-system/preview` oppure, senza il plugin, dalla directory principale del progetto:

```sh
node design-system/tools/generate-preview.mjs
```

Il renderer autonomo non ha dipendenze esterne. Per modificare il sistema, intervieni sui file strutturati in Markdown e JSON, non sull'HTML generato.

## Sviluppo e test

```sh
npm install
npm run typecheck
npm test
npm run build
```

I test coprono un flusso integrato in un progetto temporaneo: analisi in sola lettura, creazione e conservazione dei file utente, aggiornamenti del blocco gestito di `AGENTS.md`, specifiche di schermate, aggiornamenti dei token tra temi, anteprime, spazio di revisione locale autenticato e riferimenti verificati agli elementi, controlli e sicurezza dei percorsi.

## Pubblicare una release

Il workflow GitHub Actions `Publish to npm` pubblica quando viene inviato un tag `vX.Y.Z`, dopo il superamento dei controlli e la verifica che il tag corrisponda alla versione in `package.json`. Prima della prima pubblicazione, configura npm Trusted Publishing per il repository `BraveOtter/opencode-design-system` e il workflow `publish.yml`, e consenti l'azione diretta `npm publish`. Il workflow usa OIDC, quindi non è necessario salvare un token di pubblicazione npm in GitHub; npm genera automaticamente anche un'attestazione di provenienza per questo repository pubblico.

Per incrementare la versione del pacchetto e inviare commit e tag:

```sh
npm version patch # oppure minor / major
git push --follow-tags
```

## Documentazione

- [Guida ai plugin di OpenCode v2](https://opencode.ai/v2/docs/build/plugins)
- [Configurazione dei plugin OpenCode](https://opencode.ai/v2/docs/plugins)
- [Comandi OpenCode](https://opencode.ai/v2/docs/commands)
- [Istruzioni OpenCode e `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [Riferimento API dei plugin](https://opencode.ai/v2/docs/api)
- [Pacchetto npm](https://www.npmjs.com/package/opencode-design-system)
- [Segnala un problema](https://github.com/BraveOtter/opencode-design-system/issues)

## Licenza

Questo progetto è distribuito con la [licenza MIT](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE).
