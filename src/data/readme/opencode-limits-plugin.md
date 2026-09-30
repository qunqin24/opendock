# opencode-go-usage

Plugin OpenCode (V2, CLI/TUI) pokazujący w bocznym panelu sesji wykorzystanie
subskrypcji **OpenCode Go** — trzy okna czasowe z paskami postępu i czasem
do wyzerowania limitu. Blok pojawia się **bezpośrednio pod blokiem `Context`**.

```
Context
6,623 tokens
1% used
OpenCode Go
5h      ░░░░░░░░░░  0%  za 4h 14m
tydzień ░░░░░░░░░░  3%  za 5d 2h
miesiąc ███████░░░ 67%  za 16d 21h
```

- `5h` — przewijające się okno 5-godzinne (API: `rolling`)
- `tydzień` — okno tygodniowe (`weekly`)
- `miesiąc` — okno miesięczne (`monthly`)

Kolor paska i procentu: **zielony** < 50 %, **żółty** 50–79 %, **czerwony** ≥ 80 %.
Gdy API zwróci status `rate-limited`, zamiast odliczania wyświetla się `limit`.
Odliczanie ma format `za 2h 14m`, `za 17d 3h` albo `teraz`.

---

## Wymagania

- OpenCode 2.x (pluginy V2 — `@opencode/plugin/tui`, sloty `sidebar.content`).
- Aktywna subskrypcja OpenCode Go, czyli klucz API zapisany przez `opencode login`.
- **Brak zależności do instalacji** — `@opencode/plugin/tui` i `solid-js`
  dostarcza runtime OpenCode, więc katalog pluginu nie potrzebuje `node_modules`.

## Instalacja

### 0. Z rejestru (najszybciej)

```bash
opencode plugin add opencode-limits-plugin                                # npm
opencode plugin add github:michalkulik/opencode-limits-plugin#v1.0.1      # git, przypięta wersja
```

`plugin add` instaluje pakiet w magazynie OpenCode i dopisuje go do globalnej
konfiguracji. Aktualizacja: `opencode plugin update opencode-limits-plugin`,
usunięcie: `opencode plugin remove opencode-limits-plugin`.

Poniższe warianty warto wybrać, gdy plugin ma być **katalogiem źródłowym**
(edycja na żywo, bez reinstalacji). Plik `index.ts`, `tui.tsx`, `usage.ts`
i `package.json` kopiujemy (lub linkujemy) do katalogu pluginu. Który wariant —
zależy od tego, gdzie ma być widoczny plugin.

### 1. Dla całego konta

```bash
mkdir -p ~/.config/opencode/plugins
ln -s /root/sources/opencode-limits-plugin ~/.config/opencode/plugins/go-usage
```

Zamiast linka można skopiować pliki:

```bash
cp -r /root/sources/opencode-limits-plugin ~/.config/opencode/plugins/go-usage
```

OpenCode sam wykrywa katalogi w `<katalog-globalny>/plugins/<nazwa>` — nic nie
trzeba dopisywać do konfiguracji. Na Linuxie katalog globalny to
`~/.config/opencode` (`opencode debug paths` pokazuje ścieżkę `config`).

### 2. Tylko dla jednego projektu

```bash
mkdir -p .opencode/plugins
cp -r /root/sources/opencode-limits-plugin .opencode/plugins/go-usage
```

Katalogi `.opencode/plugins/` w projekcie (i w katalogach nadrzędnych) są
wykrywane automatycznie.

### 3. Wpisem w `opencode.json(c)` — gdy potrzebne są opcje

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/root/sources/opencode-limits-plugin",
    { "package": "./plugins/go-usage", "options": { "apiKey": "oc_sk_..." } }
  ]
}
```

Wariant z `options` jest jedynym sposobem, by podać klucz API z konfiguracji
(zob. niżej). Obsługiwane są też ścieżki względne, `file://...` i paczki npm.

### 4. Połączony ze zdalnym serwerem (`cli.json`)

Gdy OpenCode łączy się z **zdalnym** serwerem, pluginy TUI muszą być wpisane
lokalnie w `~/.config/opencode/cli.json`, inaczej serwer ich nie zna:

```json
{
  "plugins": ["/root/sources/opencode-limits-plugin"]
}
```

## Skąd bierze się klucz API

Plugin nie wymaga konfiguracji — szuka klucza sam, po kolei:

1. `options.apiKey` z wpisu `plugins` w `opencode.json(c)` (np. `"{env:ZMIENNA}"` jest rozwijane),
2. zmienne środowiskowe `OPENCODE_API_KEY` albo `OPENCODE_GO_API_KEY`,
3. `providers["opencode-go"].settings.apiKey` (lub wariant v1
   `provider["opencode-go"].options.apiKey`) w plikach `opencode.json(c)` —
   projektu i katalogu globalnego,
4. **baza SQLite OpenCode** (`credential`, tabela odczytywana wyłącznie do
   odczytu) — czyli klucz zapisany przez `opencode login`.

Punkt 4 sprawia, że po zwykłym zalogowaniu do OpenCode nic już nie trzeba
ustawiać.

## Jak to działa

- Dane pochodzą z publicznego API OpenCode:
  `GET https://opencode.ai/zen/go/v1/usage` z nagłówkiem `Authorization: Bearer <klucz>`.
  OpenCode **nie** wystawia limitów w swoim HTTP API, dlatego plugin woła ten
  endpoint bezpośrednio.
- Odświeżanie: co **60 s**; odliczanie odświeża się co **15 s**.
- Blok rejestruje się w slocie `append: "sidebar.content"`. Slot porządkuje
  wkłady według kolejności włączenia pluginów, a pluginy wbudowane (`Context`,
  `MCP`) włączają się pierwsze — dlatego nasz blok ląduje pod nimi. Jeśli
  w projekcie są skonfigurowane serwery MCP, między `Context` a `OpenCode Go`
  pojawi się jeszcze blok `MCP`.
- Zmiana plików pluginu przeładowuje go automatycznie (OpenCode podgląda katalog).

### Stany błędów

| Stan | Znaczenie |
| --- | --- |
| `Brak klucza API` | nie znaleziono klucza w żadnym z 4 źródeł |
| `Odrzucono klucz (401)` | klucz nieprawidłowy |
| `Brak subskrypcji Go` | API zwróciło 403 (`EntitlementError`) — brak aktywnej subskrypcji |
| `Błąd pobierania limitów` | problem z siecią / odpowiedzią API (treść błędu na drugiej linii) |

## Pliki

| Plik | Rola |
| --- | --- |
| `tui.tsx` | interfejs: slot `sidebar.content`, paski, odliczanie, stany błędów |
| `usage.ts` | pobieranie danych z API + wyszukiwanie klucza |
| `index.ts` | wymagany wpis po stronie serwera (pusty — plugin jest tylko TUI) |
| `package.json` | metadane i eksporty (potrzebne przy publikacji jako paczka npm) |
| `tsconfig.json` | ustawienia edytora (JSX: `@opentui/solid`) |

## Rozwijanie

Dwie zasady, bez których plugin nie wstanie po instalacji z rejestru:

1. **`tui.tsx` musi zaczynać się od pragmy w pierwszej linii:**

   ```tsx
   /** @jsxImportSource @opentui/solid */
   ```

   Transform JSX OpenTUI celowo pomija ścieżki z `node_modules`, więc plik
   instalowany z npm/Gita jest transpilowany domyślny loaderem Buna
   (`react/jsx-runtime`) i loadery padają z `Cannot find package 'react'`.
   Wariant katalogowy (symlink/kopia) działa też bez pragmy — błąd wychodzi
   dopiero przy instalacji z paczki.

2. **`index.ts` nic nie importuje** — lokalny katalog pluginu nie ma
   `node_modules`, a loader serwera nie wstrzykuje mu `@opencode/plugin`.
   Wystarczy zwykły obiekt `{ id, setup }`.

Po zmianach: `npm publish`, a na maszynach użytkowników
`opencode plugin update opencode-limits-plugin`.

## Sprawdzanie instalacji

```bash
# czy katalog pluginu jest widziany (wersja "local"):
opencode plugin list

# czy plugin się załadował i ma funkcję TUI:
opencode api get /api/plugin          # szukaj: "id": "opencode-go-usage", "status": "active"
                                       # oraz "features": {"server": true, "tui": true}

# logi (błędy ładowania pluginów):
tail -f ~/.local/share/opencode/log/opencode.log | grep -i plugin
```

## Odinstalowanie

```bash
rm ~/.config/opencode/plugins/go-usage        # albo .opencode/plugins/go-usage w projekcie
# i usuń wpis z tablicy "plugins" w opencode.json(c) / cli.json, jeśli był dodany
```

## Wydanie nowej wersji

`package.json` ma eksporty `.` i `./tui`, więc wydanie to:

```bash
# 1. podnieś "version" w package.json
git commit -am "chore: vX.Y.Z" && git push
git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z
gh release create vX.Y.Z --notes "..."

# 2. npm (token w ~/.npmrc albo przez --//registry.npmjs.org/:_authToken=...)
npm publish

# 3. instalacja przez użytkowników
opencode plugin add opencode-limits-plugin
```
