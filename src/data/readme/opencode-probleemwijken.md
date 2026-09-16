# opencode-probleemwijken

OpenCode plugin dat een willekeurig geluid afspeelt en push notificaties stuurt van de legendarische [Probleemwijken/Derkolk soundboard](https://www.derkolk.nl/probleemwijken/) wanneer een sessie klaar is.

Werkt op **OpenCode 2** én **OpenCode 1** (1.18.29 of nieuwer) — één package, beide versies.

## Installatie

### OpenCode 2

Let op: de config-key heet in v2 `plugins` (meervoud), niet `plugin`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-probleemwijken"]
}
```

Of via de CLI:

```sh
opencode plugin add opencode-probleemwijken
```

### OpenCode 1 (1.18.29+)

```json
{
  "plugin": ["opencode-probleemwijken@latest"]
}
```

Herstart OpenCode en je bent klaar!

### Specifieke versie

```json
{
  "plugins": ["opencode-probleemwijken@2.0.0"]
}
```

## Wat doet het?

Elke keer als OpenCode klaar is met een taak, om permissie vraagt, of een error krijgt:
- Speelt een willekeurig geluid af uit de collectie van 62 klassieke Derkolk soundboard fragmenten
- Stuurt een push notificatie naar je desktop

Welke events daarvoor gebruikt worden verschilt per OpenCode-versie:

| Trigger | OpenCode 1 | OpenCode 2 |
|---------|------------|------------|
| Sessie klaar | `session.idle` | `session.status` (idle) + `session.idle` |
| Error | `session.error` | `session.execution.failed` |
| Permissie | `permission.asked` | `permission.asked` |

In OpenCode 2 is `session.idle` afgeschaft ten gunste van `session.status`. De plugin luistert naar allebei en ontdubbelt intern, dus je hoort nooit twee geluiden voor dezelfde sessie.

## Geluiden

- "VLIEG!"
- "Half elf"
- "Boertje!?"
- "Geert is inmiddels dronken"
- "Broodje"
- "Koffie"
- "Pitbull"
- "Tetete"
- "Kakwijk"
- "Doei Henk"
- ... en nog 52 meer!

## Platform ondersteuning

| Platform | Audio | Notificaties |
|----------|-------|--------------|
| macOS | `afplay` (ingebouwd) | `osascript` (ingebouwd) |
| Linux | `mpv` of `ffplay` | `notify-send` |
| Windows | Windows Media Player | Windows Toast Notifications |

## Configuratie (optioneel)

Er zijn twee manieren om te configureren. Ze worden over elkaar heen gelegd, waarbij de laatste wint:

1. ingebouwde defaults
2. `~/.config/opencode/probleemwijken.json`
3. plugin-options in je `opencode.json` (alleen OpenCode 2)

### Via opencode.json (OpenCode 2)

Gebruik de object-vorm met `package` en `options`:

```json
{
  "plugins": [
    {
      "package": "opencode-probleemwijken",
      "options": {
        "messages": { "complete": "Hoppa!" },
        "events": { "subagent_complete": true }
      }
    }
  ]
}
```

De options accepteren exact dezelfde keys als het JSON-bestand hieronder. Wat je niet opgeeft valt terug op je `probleemwijken.json` en daarna op de defaults — je bestaande config blijft dus gewoon werken.

### Via probleemwijken.json (alle versies)

Maak `~/.config/opencode/probleemwijken.json`:

```json
{
  "enabled": true,
  "includeBundledSounds": true,
  "customSoundsDir": null,
  "disabledSounds": [],
  "notifications": {
    "enabled": true,
    "timeout": 5
  },
  "events": {
    "complete": { "sound": true, "notification": true },
    "subagent_complete": { "sound": false, "notification": false },
    "error": { "sound": true, "notification": true },
    "permission": { "sound": true, "notification": true }
  },
  "messages": {
    "complete": "Sessie voltooid!",
    "subagent_complete": "Subagent klaar",
    "error": "Er is een fout opgetreden",
    "permission": "Permissie nodig"
  }
}
```

### Opties

| Optie | Type | Default | Beschrijving |
|-------|------|---------|--------------|
| `enabled` | boolean | `true` | Plugin aan/uit |
| `includeBundledSounds` | boolean | `true` | Probleemwijken geluiden gebruiken |
| `customSoundsDir` | string | `null` | Pad naar folder met eigen geluiden |
| `disabledSounds` | string[] | `[]` | Specifieke geluiden uitschakelen op naam of pad |
| `notifications.enabled` | boolean | `true` | Notificaties aan/uit |
| `notifications.timeout` | number | `5` | Notificatie timeout in seconden (Linux) |

### Events

Per event kun je sound en notification apart aan/uit zetten:

```json
{
  "events": {
    "complete": { "sound": true, "notification": true },
    "error": { "sound": true, "notification": false }
  }
}
```

Of simpelweg een boolean voor beide:

```json
{
  "events": {
    "complete": true,
    "error": false
  }
}
```

### Berichten aanpassen

```json
{
  "messages": {
    "complete": "Klaar!",
    "error": "Oeps, er ging iets mis"
  }
}
```

### Eigen geluiden toevoegen

1. Maak een folder met je eigen MP3/WAV/OGG bestanden
2. Configureer het pad in `probleemwijken.json`:

```json
{
  "customSoundsDir": "/home/user/my-sounds"
}
```

De plugin kiest dan random uit zowel de Probleemwijken geluiden als je eigen geluiden.

### Specifieke geluiden uitschakelen

Je kunt specifieke geluiden uitschakelen op bestandsnaam of volledig pad:

```json
{
  "disabledSounds": [
    "koffie.mp3",
    "narcist.mp3",
    "/home/user/my-sounds/annoying.mp3"
  ]
}
```

Met alleen een bestandsnaam (bv. `"koffie.mp3"`) wordt het geluid overal uitgefilterd, zowel uit de bundled als custom sounds. Met een volledig pad filter je alleen dat specifieke bestand.

### Alleen eigen geluiden gebruiken

```json
{
  "includeBundledSounds": false,
  "customSoundsDir": "/home/user/my-sounds"
}
```

## Credits

- Geluiden van [derkolk.nl/probleemwijken](https://www.derkolk.nl/probleemwijken/)
- Gebaseerd op [opencode-notifier](https://github.com/mohak34/opencode-notifier) door mohak34

## Licentie

MIT
