# opencode-probleemwijken

OpenCode plugin dat een willekeurig geluid afspeelt en push notificaties stuurt van de legendarische [Probleemwijken/Derkolk soundboard](https://www.derkolk.nl/probleemwijken/) wanneer een sessie klaar is.

## Installatie

Voeg de plugin toe aan je `opencode.json`:

```json
{
  "plugin": ["opencode-probleemwijken@latest"]
}
```

Herstart OpenCode en je bent klaar!

### Specifieke versie

```json
{
  "plugin": ["opencode-probleemwijken@1.0.0"]
}
```

## Wat doet het?

Elke keer als OpenCode klaar is met een taak (`session.idle`) of een error krijgt (`session.error`):
- Speelt een willekeurig geluid af uit de collectie van 36 klassieke Derkolk soundboard fragmenten
- Stuurt een push notificatie naar je desktop

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
- ... en nog 26 meer!

## Platform ondersteuning

| Platform | Audio | Notificaties |
|----------|-------|--------------|
| macOS | `afplay` (ingebouwd) | `osascript` (ingebouwd) |
| Linux | `mpv` of `ffplay` | `notify-send` |
| Windows | Windows Media Player | Windows Toast Notifications |

## Configuratie (optioneel)

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
