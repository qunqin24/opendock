# nabiz

<img src="assets/nabiz-mark.svg" width="96" alt="nabız logo">

[English](README.md) | **Türkçe**

Uzun işlerin nabzını tutar: build takibi, background task, bildirimler.
Agent sahnede çalışırken ağır işler arkada yürür, bitince haber gelir.

## Düzen

- `extensions/hbmon.ts` — uzun build takibi: `hbmon_watch` / `hbmon_wait` / `hbmon_status`
  (motor `nabiz-core`'dan gelir; pi sarmalayıcıları kalır)
- `extensions/bg-hbmon.ts` — background task'lar: `bg_run` / `bg_status` / `bg_logs` / `bg_kill`
  + `/bg` + `/bg-status`. hbmon daemon backend'lidir; pi restart'larını atlatır.
  `bg_logs` cursor (`offset`/`next_offset`) ve bloklayan okuma (`wait_ms`, cap 30000)
  destekler; task registry `~/.pi/bg-hbmon-registry.json`'da durur.
- `.mcp.json` — MCP sunucuları (codegraph, nabiz, bm), lazy-load.
- `assets/nabiz-mark.svg` — proje simgesi.
- `docs/port-notes.md` — iç teknik notlar (opencode → pi portu + Faz 3).
- `docs/migration-plan.md` — opencode-plugins → monorepo göç planı (Faz 1–3
  + 5–9 bitti, Faz 4 kısmi — bkz. `docs/decisions.md`).
- `docs/decisions.md` — karar kaydı (Faz 4'te opencode-plugins'tan taşındı).
- `tasks/` — extension katmanı iş tahtası (NABIZ-001…010 bitti).
- `scripts/check-symlink.mjs` — Windows symlink ön-kontrolü (kurulumdan önce).
- `.github/workflows/ci.yml` — ubuntu + windows derleme/test (NABIZ-006).
- `packages/core/` — paylaşılan host-bağımsız motor (`nabiz-core`: hbmon
  istemcisi, bg-tasks, prune, progress, notice/disclosure metinleri). Host importu yok.
- `packages/harness-opencode/` — opencode adaptörü (`nabiz-opencode`:
  `plugin/` bundle paketiyle 6 plugin (id `nabiz`) + MCP nabiz-tools
  (`nabiz_safe`/`nabiz_raw`) + scripts/tests). Kurulum:
  `node packages/harness-opencode/scripts/setup.mjs --yes`.

## Kullanım

```bash
# hızlı test (kopyalamadan yükler)
pi -e /root/nabiz/extensions/hbmon.ts -p "hbmon_watch ile ['sleep','5'] çalıştır, hbmon_wait ile bekle, özeti raporla"

# kalıcı kurulum (package manifestli)
pi install /root/nabiz

# settings.json extensions listesi:
# ["/root/nabiz/extensions/hbmon.ts", "/root/nabiz/extensions/bg-hbmon.ts"]

# workspaceler: linkler + paylaşılan motorun derlenmesi
npm install && npm run build
# Windows: npm install'da EPERM/symlink -> terminali yönetici aç ya da
# Geliştirici Modu'nu etkinleştir (Ayarlar -> Gizlilik ve Güvenlik).
# Ön-kontrol (kurulumdan önce): node scripts/check-symlink.mjs
```

## Paketler

npm registry'de yayında (registry kurulumu doğrulandı, git gerekmez):

- [`nabiz-core`](https://www.npmjs.com/package/nabiz-core) — paylaşılan
  host-bağımsız motor (hbmon istemcisi, bg-tasks, prune, progress,
  notice/disclosure metinleri). `npm install nabiz-core`
- [`nabiz-opencode`](https://www.npmjs.com/package/nabiz-opencode) — opencode
  adaptörü (`plugin/` bundle ile 6 plugin + MCP `nabiz_safe`/`nabiz_raw`).
  `npm install nabiz-opencode`

## Gereksinim

- `hbmon` ikiliği (`~/.cargo/bin/hbmon` veya `PATH`'te). Bulunamazsa extension'lar
  kurulum ipucuyla döner: `cargo install hbmon`.

## Doğrulama

Gerçek `cargo build` üzerinde `watch → wait → status` akışı:
aynı handshake, aynı `woke_on` özetleri, aynı exit eşlemesi
(0 done / 1 failed / 2 dep-missing / 124 timeout / 137 oom / 3 internal).
`extensions/` için `tsc --noEmit` temiz (`nabiz-core` kaynaklarına karşı);
`bg_*` için canlı daemon smoke (cursor / registry / `wait_ms`).

Kapılar: `npm run lint` (oxlint, tüm repo), `npm run typecheck:ext` +
`npm run check:pi` (pi 1.x uyumluluğu), `packages/harness-opencode` içinden
`npm test` (kökten düşük bellekli koşum: `npm run test:lowmem`).
