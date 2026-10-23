[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Bilde die stärkste Party mit KI an deiner Seite.**

**Menschen sind nicht die Einzigen, die Arbeit in Auftrag geben können.**

Guilduo ist eine **Human × AI Work Platform**, auf der Menschen und KI-Agents im selben Workspace Arbeit in Auftrag geben, übernehmen, übergeben und prüfen können. Die Plattform behandelt echte Arbeit als Quests und bringt sie mit gemeinsam genutzten Relays, Evidence und Decisions voran.

## Öffentliche Links

### Hier starten neue Nutzer

- Guilduo kennenlernen: [Offizielle Website](https://guilduo.com/)
- In Guilduo arbeiten: [Guilduo / Relay Forge](https://app.guilduo.com/)
- Einen KI-Client verbinden: `https://mcp.guilduo.com/mcp`

| Einstieg | Link | Zweck |
|---|---|---|
| Offizielle LP | [Guilduo Landing Page](https://guilduo.com/) | Prinzipien, Funktionen und Arbeitsablauf von Guilduo kennenlernen |
| Offizielle Web App | [Guilduo / Relay Forge](https://app.guilduo.com/) | Den öffentlichen Command- und Quest-Arbeitsbereich der Beta öffnen |

`/next/relay-forge/` ist ein Deployment-Pfad innerhalb einer Appwrite Site und nicht die offizielle Web-App-URL. Von Appwrite Sites generierte Deployment-URLs und die alte `workers.dev`-URL bleiben für Validierung, Kompatibilität und Rollback erhalten. Der kanonische Einstieg für neue Nutzer ist die oben genannte Guilduo-Domain. Der aktuell bereitgestellte Kandidat ist `0.6.0-beta.8` und wird getrennt von getaggten Releases verwaltet.

### Zweck der öffentlichen URLs

| Rolle | Kanonische URL | Status |
|---|---|---|
| Offizielle Website / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Kanonischer Remote-HTTP-MCP-Endpunkt |
| Appwrite API | `https://api.guilduo.com/v1` | Offizieller Appwrite-API-Endpunkt (Origin: `https://api.guilduo.com`) |
| Dokumentation (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | Statische Docs; veröffentlicht |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` ist für Weiterleitungen zu `https://guilduo.com` reserviert. Die alte `workers.dev`-URL bleibt für kompatible Verbindungen und Rollback erhalten. `api.guilduo.com` ist für die Appwrite API bestimmt und wird vom Appwrite-Browserclient sowie vom `APPWRITE_ENDPOINT` des Workers verwendet; es ist nicht der öffentliche Origin für die REST-Route `/v1` oder die MCP-Route `/mcp` des Workers.

Die freigegebene Markensprache und Ausdrucksweise steht in [BRAND.md](BRAND.md).

Guilduo ist ein unabhängiges Projekt und nicht mit Habitica verbunden, von Habitica unterstützt oder als Ersatz dafür gedacht. Produktnamen und Marken gehören ihren jeweiligen Eigentümern.

## Umfang der öffentlichen Beta

| Bereich | Status |
|---|---|
| Web / PWA | Kern der öffentlichen Beta |
| Appwrite-Google-Anmeldung und Gast-Speicher auf dem Gerät | Verfügbar (Authentifizierung konfiguriert) |
| Quest-CRUD, Archivierung, Quest Tree und MP-Kampf | Verfügbar |
| Agent Registry, MCP-Client-Verknüpfung und Handoff | Verfügbar |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Öffentliche Beta der offiziellen Web App (Desktop / Mobile). Der interne Pfad `/next/relay-forge/` dient Deployment und Kompatibilität |
| 9 Sprachen | In der Haupt-UI verfügbar; die Beta-UI unterstützt die primäre Navigation |
| Google Calendar, Google Tasks, Notion und Toggl | **Early Access / OAuth-Vorbereitung** |
| Unity Battle Lab, natives Android/iOS und autonome Agent-Ausführung | Ausstehend |

Die App-Version ist der Kandidat `0.6.0-beta.8`, REST/MCP ist `2.7.0` und das Daten-Schema ist `7`. Externes Provider-OAuth ist standardmäßig deaktiviert, während die Sicherheit der öffentlichen Beta und die Vorbereitung der Prüfung Vorrang haben. Konten und Nutzerstatus werden zu Appwrite migriert.

## Designprinzipien

1. **Menschen bestimmen Ziel und endgültige Entscheidung**: KI-Vorschläge bleiben überprüfbar und werden niemals ohne Freigabe abgeschlossen oder veröffentlicht.
2. **Arbeit und Belohnungen trennen**: Verdiene MP durch Quests und entscheide dann selbst, wann du kämpfst und welchen Befehl du nutzt.
3. **Lesen, Vorschau, Ausführen**: Für Schreibvorgänge, Massenänderungen und Handoffs ist dry-run der Standard.
4. **Vor dem Löschen archivieren**: Bewahre Verlauf, Belohnungen und externe Links auf; archiviere nicht mehr benötigte Quests.
5. **Menschen und KI in dieselbe Party setzen**: Astra ist eine Begleiterfigur, Agents stehen für Rollen und Nutzer bleiben als Konten getrennt.
6. **Daten nicht einsperren**: REST, MCP, CLI und Web UI verwenden denselben Worker und dieselbe Domänenlogik.

## Ansichten und Daten

- `/`: Die aktuelle UI. Vor der Anmeldung werden Daten auf dem Gerät gespeichert; danach werden sie über den Worker mit Appwrite synchronisiert.
- `/lp/` und `/lp/en/`: Die offizielle Guilduo-Landing-Page auf Japanisch und Englisch. CTA-URLs kommen aus der Runtime Config und werden sicher deaktiviert, wenn sie nicht gesetzt sind.
- `/interaction-lab/`: Die Next-Quellroute für lokale Entwicklung und Captures.
- `/next/` und `/next/relay-forge/`: Implementierungs- und Kompatibilitätsrouten auf Appwrite Sites. Der offizielle Einstieg für neue Nutzer ist `https://app.guilduo.com/`, der über ein hostbasiertes Rewrite intern zum Relay-Forge-Einstieg weiterleitet. Auf dem Desktop scrollt nur die zentrale Today/Tree-Liste; auf Mobilgeräten scrollt die gesamte Seite.
- `https://guilduo.com/` führt auf dem gleichen Appwrite Site zu `/lp/`, während `https://app.guilduo.com/` zu `/next/relay-forge/` führt. Die tatsächliche DNS- und Rewrite-Konfiguration steht in [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md).
- Die visuelle Quelle der Wahrheit ist [`DESIGN.md`](DESIGN.md), die technische Quelle der Wahrheit ist [`PROJECT_SPEC.md`](PROJECT_SPEC.md), und das Next-spezifische Delta-Design steht in [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). Numerische Tokens stehen in [`design/TOKENS.json`](design/TOKENS.json), Komponenten in [`design/COMPONENTS.md`](design/COMPONENTS.md) und die Bildschirmkomposition in [`design/SCREENS.md`](design/SCREENS.md).
- Beim Wiederverbinden wird der Appwrite-Auth-Status wiederhergestellt; zuvor synchronisierte Daten bleiben, sofern vorhanden, schreibgeschützt verfügbar. Quest-Listen werden während der Wiederverbindung nicht gelöscht; die UI zeigt ein Skeleton, eine Schaltfläche zum Wiederverbinden und eine Schreibsperre.
- Der Quest-Abschlussstatus und der Agent-Handoff-Status werden getrennt verwaltet. Einmalige To-Dos werden nach dem Abschluss archiviert; tägliche Aufgaben, Gewohnheiten und wiederkehrende To-Dos erscheinen bei ihrem nächsten Termin erneut.
- Öffentliche Profile zeigen nur Anzeigename, `@handle`, Bio, Avatar und Level. Quest-Inhalte, Notizen, UID und OAuth-Informationen bleiben privat.

## Appwrite-/Worker-Architektur

| Ebene | Verantwortung |
|---|---|
| Appwrite Sites | Bereitstellung von Web/PWA |
| Appwrite Auth / TablesDB | Google-Anmeldung sowie Quest- und Charakterstatus pro Nutzer |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks und Erweiterungsgrenze |
| Cloudflare D1 | Agent Registry, MCP-Verbindungen, Profile und Integrationsmetadaten |
| Cloudflare KV | OAuth-Status, kurzlebiger Status und MCP-Clients |

Tokens, API-Schlüssel und Secrets werden niemals in öffentlichen Appwrite-Zeilen oder im Local Storage des Browsers gespeichert. Appwrite API Keys liegen ausschließlich in Worker Secrets. Auch die Agent Registry speichert keine Modell-API-Keys, Passwörter oder Ausführungs-URLs.

## MCP

Der stabile Verbindungsendpunkt ist:

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` stellt 54 Tools für Quests, Archivierung, Quest Tree, Agent Handoff, Agent Registry, Profile, Partys, Kämpfe und den Toggl-Focus-Vertrag bereit. `/mcp-next` ist eine Validierungsschiene für das neue SDK und ergänzt Resources und Workflow Prompts. Verwende für den normalen Betrieb weiterhin `/mcp`, um die Kompatibilität mit bestehenden Clients zu erhalten.

Während der Migration bleibt das alte `/mcp` von `workers.dev` aus Kompatibilitätsgründen verfügbar. Neue Registrierungen und Wiederverbindungen sollten jedoch `mcp.guilduo.com/mcp` verwenden.

### Eine neue MCP-Verbindung mit OAuth registrieren

Dieses Verfahren gilt für Clients wie ChatGPT, Codex, Claude und OpenClaw, die Remote HTTP MCP und OAuth unterstützen. Folge bei einer ersten Verbindung den Schritten 1–6 in dieser Reihenfolge. Wenn du nur eine bestehende Verbindung prüfen möchtest, beginne mit Schritt 7.

1. Wenn noch eine Guilduo-/QuestForge-Verbindung aus der Zeit vor der Migration im Client vorhanden ist, trenne oder entferne sie zuerst. Alte OAuth Grants und Tokens können nicht wiederverwendet werden.
2. Öffne die MCP- oder Connector-Einstellungen des Clients und registriere eine Verbindung namens `Guilduo` mit dem Typ Remote HTTP MCP.
3. Setze die URL auf `https://mcp.guilduo.com/mcp`. Verwende `/mcp-next` nicht für normale Verbindungstests.
4. Wenn der Client eine Authentifizierungsauswahl anbietet, wähle `OAuth`. Gib keinen API Key, Bearer Token oder Client Secret ein.
5. Wenn der Browser „Connect to Guilduo“ anzeigt, melde dich mit demselben Appwrite-Konto wie in der Webversion von Guilduo an, prüfe die angeforderten Berechtigungen und bestätige sie.
6. Kehre zum MCP-Client zurück und bestätige, dass die Verbindung als verbunden oder verfügbar angezeigt wird. OAuth ist damit abgeschlossen, aber möglicherweise ist noch kein Agent verknüpft.
7. Öffne Connections in [Guilduo / Relay Forge](https://app.guilduo.com/) und verknüpfe den verbundenen Client mit dem gewünschten Agent. Falls kein Agent existiert, erstelle ihn unter Party > „Register Agent“.
8. Starte den MCP-Client neu oder lade ihn neu und führe den folgenden Verbindungstest aus.

Für Clients, die Remote MCP über eine Konfigurationsdatei hinzufügen, kannst du dieses Beispiel verwenden:

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

MCP-Clients erkennen OAuth-Metadaten automatisch. Verwende die folgenden URLs nur, wenn eine manuelle Prüfung erforderlich ist.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Agent Context im Verbindungstest prüfen

Prüfe im Client die folgende Reihenfolge:

1. Die MCP-Initialisierung ist erfolgreich.
2. `tools/list` gibt 54 Tools zurück.
3. `list_registered_agents` gibt nur deinen eigenen Agent zurück.
4. Rufe `get_current_agent_context` auf.

Vor der Verknüpfung eines Agents lautet die normale Antwort `linked: false` mit `agent: null`. Nach der Verknüpfung in Connections wird sie zu `linked: true` und liefert `agent` sowie `effectiveScopes`. Damit ist bestätigt, dass OAuth-Authentifizierung, UID-Trennung und Agent-Verknüpfung über dieselbe Verbindung funktionieren.

Beispiel für eine Testanfrage:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### 401-Fehler und nicht verknüpfte Agents beheben

| Zustand | Lösung |
|---|---|
| Direkt nach der Verbindung 401 | Alte OAuth-Informationen sind noch vorhanden. Lösche die Verbindung, registriere dieselbe `/mcp`-URL erneut und autorisiere sie wieder. |
| Rückkehr vom OAuth-Bildschirm nicht möglich | Bestätige, dass du mit demselben Appwrite-Konto wie in der Webversion von Guilduo angemeldet bist. Prüfe außerdem Erweiterungen, die den Callback zurück zum Client blockieren könnten. |
| `linked: false` | OAuth war erfolgreich. Verknüpfe den Client in Relay Forge Connections mit einem Agent. |
| Berechtigungsfehler `agents:read` | Autorisiere die Verbindung erneut und prüfe die Leseberechtigung für Agents auf dem Zustimmungsbildschirm. Agent-Einstellungen können keine OAuth-Berechtigungen hinzufügen. |
| Die Agent-Verknüpfung erscheint nicht | Lade den MCP-Client neu und führe `get_current_agent_context` erneut aus. |

Füge keine Tokens, API Keys oder vollständigen UIDs in Verbindungseinstellungen oder Logs ein. Nach der OAuth-Autorisierung werden Tokens vom MCP-Client und Cloudflare KV verwaltet.

### KI-Clients

- ChatGPT / Codex: Registriere die obige Produktions-URL `/mcp` in Remote MCP App oder im Entwicklermodus.
- Claude: Füge OAuth Remote MCP unter Settings > Connectors hinzu.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: Verwende dasselbe Remote HTTP MCP in der kommenden Verbindungsanleitung.

Erstelle oder bearbeite Agents nach der Registrierung in **Party** von Relay Forge und verknüpfe autorisierte MCP-Clients in **Connections** mit einem Agent. Ein Agent kann die Berechtigungen eines MCP-Clients nicht erweitern.

## CLI

Die CLI hat eine eigene Rolle neben MCP. MCP dient der Entdeckung und Freigabe von KI-Tools; die CLI dient REST/JSON-Operationen durch Menschen und CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

Schreibvorgänge liefern ohne `--execute` nur einen dry-run oder einen Ausführungsplan. Die Authentifizierung verwendet `QUESTFORGE_TOKEN` oder `--token-stdin`; Tokens werden nie in Logs geschrieben. Allgemeine Produktionsnutzer verwenden OAuth statt eines festen API-Schlüssels.

## Skill / OpenAI Plugin / MCP App

- Offizielles Skill: [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- Vorbereitungspaket für das OpenAI Plugin: [`plugins/questforge/`](plugins/questforge/)
- Vorlage für die MCP-App-Registrierung: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Einreichungs-Checkliste: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

Das Skill vermittelt der KI die Reihenfolge Lesen, dry-run, Bestätigen, Ausführen und Review zurückgeben. Die offizielle OpenAI-Prüfung wird nicht automatisch abgeschlossen. Nach der Prüfung der Akzeptanz mit echten Konten, des Datenschutzes und der Kontolöschpfade in der öffentlichen Beta reicht ein Betreiber den Antrag über das Dashboard ein.

## 9 Sprachen

Guilduo unterstützt Japanisch, Englisch, Spanisch, brasilianisches Portugiesisch, Französisch, Deutsch, Koreanisch, vereinfachtes Chinesisch und Russisch. Spracheinstellungen werden pro Gerät gespeichert und nicht mit der Cloud synchronisiert. Datumsangaben, Zahlen und Sortierreihenfolge verwenden die Intl API.

## Roadmap für externe Dienste

Der aktuelle Schwerpunkt liegt auf Verträgen und sicherer Darstellung; Provider-OAuth bleibt als Early Access vorerst pausiert.

1. Google Calendar: schreibgeschützte Verfügbarkeitsfenster
2. Google Tasks: bidirektionale Synchronisierung ohne Löschung
3. Toggl Track: Zeiterfassung, Schätzungen und MP-Umwandlung
4. Notion: Export täglicher Logs
5. Todoist, Discord / Slack: Synchronisierung und Benachrichtigungen
6. OpenClaw, Hermes Agent: Verbindungsrezepte und Wiederverwendung von Skills

Die erste Synchronisierung erfordert eine Vorschau, und Guilduo löscht externe Daten niemals automatisch. Provider Secrets liegen ausschließlich in Worker Secrets.

## Performance und Telemetrie

Die Ziele basieren auf einem Gerät der Pixel-9-Klasse: LCP höchstens 2,5 Sekunden, INP höchstens 200 ms, CLS höchstens 0,1 und anfängliches komprimiertes JavaScript höchstens 250 KB. Anonyme Telemetrie gilt nur für Nutzer mit ausdrücklicher Zustimmung; Quest-Inhalte, Notizen, E-Mail, UID, Tokens und externe Inhalte werden nicht gesendet. Erlaubte implementierte Events sind Web Vitals, JavaScript-Fehler, Synchronisierungsergebnisse, der erste Quest-Abschluss, MCP-Verbindung und Agent-Zuweisung. Nach Ablehnung oder Widerruf der Telemetrie wird nichts gesendet. Vor der öffentlichen Veröffentlichung muss ein Administrator `TELEMETRY_ENDPOINT` und die D1-Migration 0006 konfigurieren.

## Lokale Entwicklung

Voraussetzungen sind Node.js 22+ und Wrangler. Verwalte Appwrite-Ressourcen über die Appwrite Console oder MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Verwende `Copy-Item` in PowerShell. Die wichtigsten Befehle sind:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

Während der TypeScript-Entwicklung werden die Worker-Runtime-Typen aus der Wrangler-Konfiguration erzeugt. `npm run typecheck` kombiniert die Typgenerierung, Konsistenzprüfungen der generierten Ausgabe, Prüfungen auf explizites `any` und `@ts-nocheck` sowie strikte Typprüfungen für Browser, Worker, Node und den Battle-Prototyp. Vite-Transformation und Typprüfung sind getrennt, während API-/MCP-Verträge durch eigene Tests erhalten bleiben.

Der Workflow für `v*`-Tags gleicht Paketversion, Release Notes und die Zugehörigkeit des getaggten Commits zur Vorgeschichte von `main` ab und veröffentlicht nach bestandenen CI-, Typprüfungs-, Test-, Build- und Preview-Gates ein GitHub-Quellcode-Release. Er verwendet keine Deployment-Secrets und führt weder automatische Produktionsmigrationen noch Site- oder Worker-Deployments aus. Produktionsdeployments erfolgen separat über die bestehenden manuellen Workflows `.github/workflows/deploy-appwrite-site.yml` und `.github/workflows/deploy-appwrite-worker.yml`; der Schutz der `production`-Umgebung und die Gates für beibehaltene Caches bleiben erhalten. Die Produktionsruntime des Workers enthält weiterhin direkt bereitgestellte Korrekturen, die noch nicht in den öffentlichen Quellcode integriert sind; daher den allgemeinen Worker-Deployment-Workflow nicht zuerst ausführen. Das Quellcode-Release des Kernprodukts `v0.6.0-beta.8` und Host-Erweiterungen `beta.12` werden separat versioniert; Guilduo bleibt in der öffentlichen Beta. Siehe [`RELEASE_SETUP.md`](RELEASE_SETUP.md).

## Dokumentation

- [Quelle der Wahrheit für visuelles Design](DESIGN.md)
- [Technische Spezifikation](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Komponentenspezifikation](design/COMPONENTS.md)
- [Bildschirm-Blueprints](design/SCREENS.md)
- [Asset-Manifest](design/ASSET_MANIFEST.md)
- [Golden references](design/reference/README.md)
- [Roadmap der öffentlichen Beta](ROADMAP.md)
- [Leitfaden für öffentliche URLs](docs/public-urls.md)
- [API-/MCP-/OAuth-Konfiguration](API_MCP_SETUP.md)
- [Konfiguration getaggter Releases](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Datenschutz](PRIVACY.md)
- [Bedingungen](TERMS.md)
- [Sicherheit](SECURITY.md)
- [Mitwirken](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [Lizenz](LICENSE)

## Lizenz

Guilduo wird unter GNU AGPL-3.0-only veröffentlicht. Wenn du eine modifizierte Version über ein Netzwerk bereitstellst, halte die Anforderungen dieser Lizenz zur Bereitstellung des Quellcodes ein.
