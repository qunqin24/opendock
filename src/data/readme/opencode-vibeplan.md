# Vibeplan (opencode) — Fikir → Detaylı Plan Dönüştürücü

[![npm version](https://img.shields.io/npm/v/opencode-vibeplan.svg)](https://www.npmjs.com/package/opencode-vibeplan)
[![license](https://img.shields.io/npm/l/opencode-vibeplan.svg)](./LICENSE)

> Kafandaki ham fikri opencode ile adım adım keşfederek detaylı proje planına,
> ürün gereksinimlerine ve teknik spesifikasyona dönüştüren planlama sistemi.
>
> Bu repo, [vibeplan](../vibeplan) projesinin **opencode-native** portudur.
> Skill, standart ve şablonlar aynıdır; orkestrasyon katmanı (komutlar,
> agent'lar, hook'lar) opencode'a taşınmıştır.

---

## Ne İşe Yarar?

Vibeplan, proje fikirlerini yapılandırılmış planlara dönüştürürken karşılaşılan temel sorunları çözer:

| Sorun | Çözüm |
|-------|-------|
| "Kafamdaki fikri nasıl anlatacağım?" | **`/vibe-idea`** — tek tek sorular sorar, fikrini keşfeder |
| "Plan yazmaya nereden başlayacağım?" | **Understanding Lock** — önce anlar, sonra yazar |
| "Her seferinde farklı formatta plan çıkıyor" | **Standartlar + Şablonlar** — tutarlı çıktı |
| "Tahminlerim hep tutmuyor" | **Range estimation** — her zaman iyimser/beklenen/kötümser |
| "Session kapandı, nerede kalmıştım?" | **HANDOFF.md** + **`/vibe-go`** ile otomatik devam |
| "Varsayımlar ortaya çıkınca plan çöküyor" | **Explicit assumptions** — varsayımlar açıkça işaretlenir |

---

## Nasıl Çalışır?

```
/vibe-idea "saas fiyatlama motoru"
  ↓  Keşif soruları (tek tek, çoktan seçmeli)
  ↓  Understanding Lock (özet → onay)
  ↓  concept.md oluşturulur

/vibe-plan saas-fiyatlama-motoru
  ↓  Milestone'lar, riskler, bağımlılıklar
  ↓  plan.md + milestones.md + risks.md

/vibe-prd fiyat-hesaplama
  ↓  User stories, gereksinimler, kullanıcı akışı
  ↓  prd.md

/vibe-tech-spec fiyat-hesaplama
  ↓  Mimari, veri modeli, API tasarımı
  ↓  tech-spec.md

/vibe-breakdown fiyat-hesaplama
  ↓  Görevler, tahminler, bağımlılık grafiği
  ↓  tasks.md
```

Her adım bir öncekinin üstüne inşa eder. Herhangi bir noktadan başlayabilirsin —
eksik doküman varsa keşif otomatik çalışır.

---

## Hızlı Başlangıç

### 1. Kur

**Herhangi bir projeye (önerilen — npm paketi):**

```bash
cd benim-projem
npx opencode-vibeplan setup
```

40 dosya kurulur (komutlar, agent'lar, skill'ler, standartlar, şablonlar,
kalite script'leri), `opencode.json` oluşturulur veya mevcut olanla birleştirilir.
Var olan dosyalara dokunulmaz (`--force` ile üzerine yazılır). Sonra opencode'u
restart et: `/vibe-go` veya `/vibe-idea` ile başla.

Lifecycle hook'ları (session state, değişiklik logu, standart kuralı,
compaction koruması) `opencode.json`'daki `"plugin": ["opencode-vibeplan"]`
satırıyla npm'den gelir — kurulum sonrası restart'ta otomatik devrededir.

**opencode içinden (bir komutla):**

```
/vibe-install
```

Kaynak vermezseniz npm paketinden kurar. GitHub URL'si de verebilirsiniz:
`/vibe-install https://github.com/user/vibeplan-opencode`.

**Bu repodan (geliştirme / dogfood):**

```bash
git clone <this-repo> ~/Dev/vibeplan-opencode
cd ~/Dev/vibeplan-opencode
npm install && npm run build
opencode
```

opencode proje kökündeki `opencode.json`'ı otomatik yükler: skill'ler
(`.vibeplan/skills/`), komutlar (`.opencode/command/`), agent'lar
(`.opencode/agent/`) ve plugin (`src/plugin.ts`, lokal TS plugin olarak)
devreye girer. Bu repo hem çalışır bir vibeplan kurulumu hem de npm paketinin
kaynağıdır — `npm run build:static` yayın snapshot'ını (`static/`) üretir.

### 2. Bir Fikir ile Başla

```
/vibe-idea e-ticaret sipariş yönetim sistemi
```

Agent sana sorular soracak (tek tek), fikrini anlayacak, onayını alacak, sonra `concept.md` oluşturacak.

### 3. Planla

```
/vibe-plan siparis-yonetimi
```

Concept üzerinden detaylı proje planı, milestone'lar ve risk kaydı oluşturulur.

### 4. Detaylandır

```
/vibe-prd siparis-takibi
/vibe-tech-spec siparis-takibi
/vibe-breakdown siparis-takibi
```

### 5. Tamamla

```
/vibe-done
```

Kalite kontrolü çalıştırır, CHANGELOG'u günceller, HANDOFF.md yazar ve plan dosyalarını commit eder.

---

## Komut Referansı

### Ana Akış

| Komut | Ne Yapar | Çıktı |
|-------|----------|-------|
| `/vibe-idea [fikir]` | Ham fikri keşif sorularıyla detaylandırır | `concept.md` |
| `/vibe-plan [proje]` | Detaylı proje planı oluşturur | `plan.md`, `milestones.md`, `risks.md`, `tech-direction.md` (yazılım) |
| `/vibe-prd [feature]` | Ürün gereksinimleri dokümanı yazar | `prd.md` |
| `/vibe-tech-spec [feature]` | Teknik spesifikasyon oluşturur | `tech-spec.md` |
| `/vibe-breakdown [epic]` | Görev listesine böler | `tasks.md` |

### Yardımcı Komutlar

| Komut | Ne Yapar |
|-------|----------|
| `/vibe-go [task]` | Önceki session'dan devam eder |
| `/vibe-done` | Kalite kontrolü + doküman güncelleme + HANDOFF.md |
| `/vibe-install [kaynak]` | vibeplan'ı bu projeye kur (npm veya GitHub URL'si) |
| `/vibe-review [dosya]` | Planlama dokümanının kalite incelemesi (bağımsız subagent) |
| `/vibe-research [konu]` | Pazar/rakip/teknoloji araştırması (opsiyonel) |
| `/vibe-compact` | State kaydeder, context temizler |
| `/vibe-status` | Session durumunu gösterir |

---

## Komutların Detaylı Açıklamaları

### /vibe-idea — Fikir Keşfi

En önemli komut. Kafandaki ham fikri alır, yapılandırılmış sorularla anlamaya çalışır.

**Süreç:**
1. Mevcut plan ve kısıtlamaları sessizce kontrol eder
2. **Keşif soruları** sorar — her mesajda tek soru, mümkünse çoktan seçmeli
   - Problem ve vizyon
   - Kullanıcılar
   - Kapsam ve kısıtlamalar
   - Teknik yön
3. **Understanding Lock** — öğrendiği her şeyi 5-7 madde halinde özetler
4. Onayından sonra `concept.md` oluşturur

**Neden önemli:** Plan yazmadan önce fikrin netleşmesi gerekiyor. Belirsiz fikirlerden
yazılan planlar her zaman değişir. Understanding Lock bu sorunu önler.

**Teknik yön belirsizse:** Kullanıcı tech stack'ten emin değilse, `tech-evaluator`
subagent'ı seçenekleri mandatory stack'e göre değerlendirir ve karşılaştırma tablosu
sunar — nihai seçim her zaman kullanıcıya bırakılır.

### /vibe-plan — Proje Planı

Concept dokümanı varsa onu temel alır, yoksa keşif sürecini kendi başlatır.

**Çıktılar:**
- `plan.md` — Ana plan: problem, hedefler, kapsam, kaynaklar, timeline
- `milestones.md` — Milestone bazlı görev kırılımı
- `risks.md` — Risk kaydı: olasılık, etki, azaltma stratejisi
- `tech-direction.md` — Teknik yön (yazılım projeleri için)

**Kurallar:**
- Tahminler her zaman range: `2d / 5d / 10d`
- Fazlar max 2 hafta
- Her bağımlılık açıkça belirtilir
- Onay bekler — otomatik devam etmez

### /vibe-prd — Ürün Gereksinimleri

NE yapılacağını tanımlar (NASIL değil).

**İçerik:**
- Problem tanımı
- Hedefler ve hedef-dışılar
- Kullanıcı hikayeleri → fonksiyonel gereksinimler
- Kullanıcı akışı (happy path + edge case + error)
- Başarı metrikleri (ölçülebilir, hedef değerli)
- Bağımlılıklar

**Kalite kuralı:** Her gereksinim test edilebilir olmalı. "Hızlı olsun" değil,
"sayfa 2 saniyede yüklenmeli."

### /vibe-tech-spec — Teknik Spesifikasyon

NASIL yapılacağını tanımlar. PRD veya concept gerektirir.

**İçerik:**
- Mimari diyagram (text-based)
- Veri modeli (tablo yapıları, ilişkiler)
- API tasarımı (endpoint, request/response)
- Tech stack kararları (neden + alternatifler)
- Uygulama planı (sıralı adımlar)
- Test stratejisi
- Deployment ve rollback planı
- Güvenlik ve performans

### /vibe-breakdown — Görev Kırılımı

Bir epic veya feature'ı uygulanabilir görevlere böler.

**Her görev için:**
- Tür (backend / frontend / infra / design / research)
- Tahmin: iyimser / beklenen / kötümser
- Gerçek (`**Gerçek:** 4d`) — görev tamamlanınca doldurulur, kalibrasyon döngüsüne girer
- Bağımlılıklar
- Kabul kriterleri (checklist)

**Ek çıktılar:**
- Bağımlılık grafiği
- Kritik yol analizi
- Paralel track'ler

### /vibe-research — Araştırma (Opsiyonel)

Her projenin araştırmaya ihtiyacı yok. Sadece gerektiğinde kullan:
- Pazar büyüklüğü ve trendleri
- Rakip analizi ve özellik karşılaştırma
- Teknoloji seçenekleri ve build vs buy analizi
- Düzenleyici gereksinimler

**Paralel subagent'lar:** Her araştırma alanı bağımsız bir `research-analyst`
subagent'ına devredilir (aynı anda çalışır), sonuçlar tek `research.md` dosyasında
sentezlenir. Böylece ana context şişmez ve her alan odaklı incelenir.

### /vibe-review — Kalite İnceleme

Planlama dokümanının bağımsız kalite değerlendirmesi.

**Süreç:**
1. Doküman türü belirlenir (concept / plan / prd / tech-spec / tasks / risks)
2. İlgili standart `.vibeplan/standards/` altından yüklenir
3. İnceleme `plan-reviewer` subagent'ına devredilir — proje bağlamını görmediği için **tarafsız** değerlendirme yapar
4. Rapor sunulur: completeness tablosu (✅/❌/⚠️), kalite seviyesi, sorunlar, öneriler
5. Kullanıcıya düzeltme teklif edilir — asla sessizce yeniden yazılmaz

**Neden subagent:** İnceleme yapan ajan projeyi ilk kez görür; doküman kendi başına
anlaşılır olmak zorundadır. Bu, "yazarın gözünden kaçan" sorunları yakalar.

### /vibe-go — Session Başlat/Devam Et

Oturum başlangıcında state, standartlar ve kısıtlamaları yükler.

**Süreç:**
1. **Load State** — HANDOFF.md varsa özetler, yoksa "fresh session" notu
2. **Load Standards** — göreve uyan standartları `.vibeplan/standards/` altından okur
3. **Load Constraints** — `docs/constraints/*.md` dosyalarını yükler
4. **Check Active Plans** — ilgili aktif planları tarar ve özetler
5. **Confirm Ready** — hazırlık raporu sunar, onaydan sonra işe başlar

### /vibe-done — Session Tamamla

Oturumu güvenli şekilde kapatır — atlanmaması gereken adımlar:

1. Bu oturumda oluşturulan/değiştirilen dokümanları özetler
2. Her yeni doküman için kalite incelemesi çalıştırır (standart + review checklist)
3. Tutarlılık kontrolü: tahminler, milestone tarihleri, bağımlılıklar
4. **Actuals & Index** — tamamlanan görevlerin `**Gerçek:**` değerlerini doldurur,
   `node scripts/estimate-calibration.cjs` ve `node scripts/plan-index.cjs` çalıştırır
5. CHANGELOG.md'yi günceller (istisnasız), gerekirse ADR ve constraint ekler
6. HANDOFF.md yazar (sonraki oturum buradan devam eder)
7. **Git commit** — `plans/` ve `docs/` altındaki değişiklikleri commit eder (plan koruması)

### /vibe-compact — Context Temizleme

Context dolmadan önce state'i güvenli şekilde kaydeder:

1. CHANGELOG'u bekleyen değişikliklerle günceller
2. HANDOFF.md'yi eksiksiz yazar (task, status, deliverables, decisions, next steps)
3. `plans/` ve `docs/` değişikliklerini commit eder
4. State kaydedildiğini doğrular ve HANDOFF.md içeriğini gösterir
5. Sonrasında compact güvenlidir

### /vibe-status — Session Durumu

Salt-okunur durum raporu (hiçbir dosya değiştirilmez):

- HANDOFF durumu (son değişiklik tarihi + özet)
- Aktif planlar ve mevcut dokümanlar
- Arşiv sayısı
- Yüklenen standartlar ve kısıtlamalar
- Context kullanım tahmini → öneri (devam / compact / yeni session)
- `plans/index.json` tazeliği (bayatsa `node scripts/plan-index.cjs` önerilir)

---

## Subagent'lar

Ağır işler ana context'i şişirmemek için odaklı subagent'lara devredilir
(tanımlar `.opencode/agent/` altındadır):

| Subagent | Görev | Ne zaman |
|----------|-------|----------|
| `research-analyst` | Tek araştırma alanını (market/rakip/tech/risk) web'den tarar, kaynaklı bulgular döndürür | `/vibe-research` — her alan paralel çalışır |
| `plan-reviewer` | Planlama dokümanını proje bağlamını görmeden inceler, tarafsız rapor verir | `/vibe-review` — bağımsız kalite değerlendirmesi |
| `tech-evaluator` | Tech stack seçeneklerini mandatory stack'e göre karşılaştırır, karar tablosu sunar | `/vibe-idea` — teknik yön belirsizken |

**Faydaları:**
- Ana context token bütçesi korunur (araştırma/inceleme subagent context'inde yapılır)
- Bağımsız değerlendirme: `plan-reviewer` önyargısız inceleme yapar
- Paralel çalışma: birden fazla araştırma alanı aynı anda taranır

---

## Dizin Yapısı

```
vibeplan-opencode/
├── AGENTS.md                        ← Ana yönetişim dosyası (opencode instructions)
├── opencode.json                    ← opencode yapılandırması (skills, permission, compaction)
├── .vibeplan/
│   ├── standards/                   ← Planlama standartları (8 dosya)
│   │   ├── discovery.md             ← Fikir keşif süreci
│   │   ├── planning.md              ← Genel planlama kuralları
│   │   ├── prd.md                   ← PRD yazım kuralları
│   │   ├── tech-spec.md             ← Teknik spec kuralları
│   │   ├── estimation.md            ← Tahmin yöntemleri (range-based)
│   │   ├── risks.md                 ← Risk değerlendirme
│   │   ├── review.md                ← Kalite kontrol checklist'i
│   │   └── documentation.md         ← Doküman standartları
│   ├── templates/                   ← Doküman şablonları (6 dosya)
│   │   ├── project-plan.md
│   │   ├── prd.md
│   │   ├── tech-spec.md
│   │   ├── task-breakdown.md
│   │   ├── risk-register.md
│   │   └── HANDOFF.md
│   ├── skills/                      ← AI skill'leri (7 — opencode on-demand yükler)
│   │   ├── brainstorming/           ← Fikir → konsept dönüştürücü
│   │   ├── prd-writing/             ← PRD yazımı
│   │   ├── tech-spec/               ← Teknik spesifikasyon
│   │   ├── estimation/              ← Range tahmin + kalibrasyon
│   │   ├── risk-assessment/         ← Risk matrisi ve kaydı
│   │   ├── plan-review/             ← Kalite inceleme
│   │   └── handoff-writing/         ← Session handoff
│   └── state/                       ← Plugin durumu (üretilen dosyalar)
├── .opencode/
│   ├── command/                     ← Slash komutları (12 dosya)
│   │   ├── vibe-idea.md             ← /vibe-idea — ham fikir keşfi
│   │   ├── vibe-plan.md             ← /vibe-plan — proje planı
│   │   ├── vibe-prd.md              ← /vibe-prd — ürün gereksinimleri
│   │   ├── vibe-tech-spec.md        ← /vibe-tech-spec — teknik spesifikasyon
│   │   ├── vibe-breakdown.md        ← /vibe-breakdown — görev kırılımı
│   │   ├── vibe-research.md         ← /vibe-research — araştırma (opsiyonel)
│   │   ├── vibe-review.md           ← /vibe-review — kalite inceleme
│   │   ├── vibe-go.md               ← /vibe-go — session devam
│   │   ├── vibe-done.md             ← /vibe-done — session tamamla
│   │   ├── vibe-compact.md          ← /vibe-compact — context temizle
│   │   └── vibe-status.md           ← /vibe-status — durum göster
│   ├── agent/                       ← Subagent'lar (3)
│   │   ├── research-analyst.md      ← Tek alan araştırması (paralel)
│   │   ├── plan-reviewer.md         ← Bağımsız kalite inceleme (fresh-eyes)
│   │   └── tech-evaluator.md        ← Tech stack değerlendirmesi
├── src/                             ← npm paketi kaynak kodu
│   ├── plugin.ts                    ← Lifecycle plugin'i (4 hook, tek dosya)
│   ├── setup.mjs                    ← `npx opencode-vibeplan setup` CLI'sı
│   └── opencode.template.json       ← Yeni kurulumlar için config şablonu
├── scripts/
│   ├── build-static.mjs             ← Yayın snapshot'ı üretimi (static/)
│   ├── plan-index.cjs                ← Plan doğrulama + plans/index.json üretimi
│   └── estimate-calibration.cjs      ← Tahmin vs gerçekleşen karşılaştırması
├── docs/
│   ├── constraints/                 ← Proje kısıtlamaları
│   ├── architecture/                ← Mimari kararlar
│   ├── CHANGELOG.md                 ← Değişiklik günlüğü
│   ├── commands.md                  ← Komut referansı
│   └── decisions.md                 ← Architecture Decision Records
├── plans/
│   ├── active/                      ← Aktif proje planları
│   │   └── {proje-adi}/             ← Her proje kendi klasöründe
│   │       ├── concept.md           ← Doğrulanmış konsept (/vibe-idea)
│   │       ├── research.md          ← Araştırma (/vibe-research, opsiyonel)
│   │       ├── plan.md              ← Proje planı (/vibe-plan)
│   │       ├── milestones.md        ← Milestone kırılımı (/vibe-plan)
│   │       ├── tech-direction.md    ← Teknik yön (/vibe-plan — yazılım projeleri)
│   │       ├── prd.md               ← Gereksinimler (/vibe-prd)
│   │       ├── tech-spec.md         ← Teknik spec (/vibe-tech-spec)
│   │       ├── tasks.md             ← Görev kırılımı (/vibe-breakdown)
│   │       └── risks.md             ← Risk kaydı
│   ├── index.json                   ← Makine-okunur plan kaydı (üretilen)
│   └── archive/                     ← Tamamlanan/arşivlenen planlar
├── .github/workflows/               ← CI: plan-quality.yml (validator + lint)
└── .gitignore
```

---

## Temel Kavramlar

### Understanding Lock

Vibeplan'ın en önemli mekanizması. Herhangi bir plan yazmadan önce:

1. Agent sana sorular sorar (tek tek)
2. Öğrendiklerini 5-7 madde halinde özetler
3. Varsayımları açıkça listeler
4. **Senin onayını bekler** — onay olmadan plan yazmaya başlamaz

Bu, "Agent beni yanlış anladı ve yanlış plan yazdı" sorununu kökünden çözer.

### Range Estimation

Tek sayı ile tahmin yasak. Her tahmin üç değerle:

```
Optimistic / Expected / Pessimistic
    2d     /    5d    /    10d
```

Neden: Tek sayı tahmini ya çok iyimser olur (çoğunlukla), ya da güven aralığı belirsiz kalır.

### Decision Log

Her planlama oturumunda alınan kararlar kaydedilir:

| Karar | Alternatifler | Neden |
|-------|-------------|-------|
| PostgreSQL kullan | MongoDB, DynamoDB | İlişkisel veri, ACID gerekli |

3 ay sonra "neden bu kararı aldık?" sorusunun cevabı her zaman erişilebilir.

### Explicit Assumptions

Emin olunmayan her şey **varsayım** olarak işaretlenir:

> **Varsayım:** İlk yıl max 10K kullanıcı bekleniyor.

Varsayımlar doğrulandığında plan güncellenir. Yanlış çıkarsa erken müdahale edilir.

---

## Plugin'ler

opencode'da lifecycle mantığı plugin'lerle çalışır. Bu repoda tek kaynak
`src/plugin.ts`'tir (npm paketi olarak `"plugin": ["opencode-vibeplan"]`
satırıyla yüklenir; repoda `opencode.json` → `"./src/plugin.ts"` lokal
bağlantısıyla dogfood edilir). Claude hook'larının opencode karşılıkları:

### session-guard.ts — Session State & Aktivite Kaydı

İki iş yapar:
- **session.idle event'i:** her yanıt sonunda oturum aktivitesini `.vibeplan/state/`
  altına kaydeder (son oturum zamanı + session id). Sessiz çalışır.
- **/vibe-go ve /vibe-status çağrıldığında:** canlı session state'ini konuşmaya
  enjekte eder — HANDOFF özeti, aktif planlar, son oturum ve commit edilmemiş
  plan uyarısı:

```
--- Planning Session State ---
HANDOFF: Sipariş yönetimi planlaması devam ediyor
LAST SESSION: 2026-08-16T20:45:00.000Z
PLANS: 3 active, 1 archived
ACTIVE: siparis-yonetimi, kullanici-auth, raporlama
⚠️  UNCOMMITTED PLANS: 2 dosya commit edilmemiş — /vibe-done ile commit edin.
---
```

### plan-changes-logger.ts — Plan Değişiklik Logu

`plans/` veya `docs/` altına yazılan/düzenlenen dosyaları
`.vibeplan/state/plan-changes.log`'a kaydeder (tekrar eden kayıtları atlar).
`/vibe-done` bu logu `docs/CHANGELOG.md` konsolidasyonunda kullanabilir.
CHANGELOG.md ve üretilen dosyalar loglanmaz.

### standards-enforcer.ts — Standart Kuralı

Claude'daki pre-tool-use advisory uyarısının opencode karşılığı: `write` ve
`edit` tool'larının tanımına (LLM'in her çağrıda gördüğü description) planlama
kuralı ekler — plans/ altına yazmadan önce ilgili standardı yükle, şablon
kullan. Bloklamaz, ama her tool çağrısında görünür garantidir.

### compaction-guard.ts — Compaction Koruması

Claude'daki mesaj-sayısı tahminli context monitor'ünün yerine gerçek tetikleme:
opencode'un native auto-compaction'ı (`opencode.json` → `compaction.auto`)
başladığında, compaction prompt'una planning-session context'i eklenir — özet
task/deliverables/open questions'ı korur ve `/vibe-compact` + `/vibe-done`
hatırlatması yapar.

---

## Skill'ler

Skill'ler görev başında on-demand yüklenir — AGENTS.md'de detay barındırmaz,
detaylı prosedür skill dosyasındadır. opencode, `.vibeplan/skills/` altını
`opencode.json` → `skills.paths` üzerinden tarar:

| Skill | Ne zaman kullanılır |
|-------|--------------------|
| `brainstorming` | Planlamadan önce — fikri doğrulanmış konsepte dönüştürür |
| `prd-writing` | PRD yazarken (/vibe-prd) |
| `tech-spec` | Teknik spesifikasyon yazarken (/vibe-tech-spec) |
| `estimation` | Görev tahmini oluştururken (/vibe-breakdown) |
| `risk-assessment` | Proje risklerini belirlerken/incelerken |
| `plan-review` | Planlama dokümanı incelerken (/vibe-review) |
| `handoff-writing` | Session bitirirken (/vibe-done, /vibe-compact) |

## Script'ler & Kalite Kapıları

Bağımlılıksız Node script'leri plan kalitesini otomatik doğrular; CI
(`.github/workflows/plan-quality.yml`) her push'ta `--check` modunda çalıştırır:

| Script | Ne yapar |
|--------|----------|
| `node scripts/plan-index.cjs` | Plan klasörlerini doğrular, `plans/index.json` üretir (makine-okunur kayıt) |
| `node scripts/plan-index.cjs --check` | CI modu: yapı hataları veya bayat index → exit 1 |
| `node scripts/estimate-calibration.cjs` | Gerçekleşen süreler vs tahminler raporu (bias) |
| `node scripts/estimate-calibration.cjs --check` | CI modu: tek-sayılı tahmin (anti-pattern) → exit 1 |

**Kalibrasyon döngüsü:** Görev tamamlanınca `tasks.md`'ye `**Gerçek:** 4d` yazılır;
`estimate-calibration.cjs` bias'ı hesaplar; tahminler buna göre güncellenir
(bkz. `.vibeplan/standards/estimation.md` → Calibration Loop).

---

## Standartlar

8 standart dosyası, her biri ilgili planlama alanı için kurallar ve checklist'ler içerir:

| Standart | İçerik |
|----------|--------|
| `discovery.md` | Keşif soruları framework'ü, Understanding Lock prosedürü |
| `planning.md` | Zorunlu bölümler, dosya organizasyonu, isimlendirme |
| `prd.md` | İyi/kötü PRD sinyalleri, anti-pattern'ler, JTBD framework |
| `tech-spec.md` | Mimari diyagram formatı, zorunlu bölümler |
| `estimation.md` | T-Shirt sizing, güven seviyeleri, tampon hesaplama, kalibrasyon döngüsü |
| `risks.md` | Risk matrisi (3x3), risk kaydı formatı, kategori listesi |
| `review.md` | Universal + dokümana özel kalite checklist'leri |
| `documentation.md` | CHANGELOG formatı, ADR formatı, güncelleme kuralları |

---

## Plan Güvenliği

1. **Plan dosyaları asla silinmez** — tamamlanan/iptal edilen projeler `plans/archive/` altına taşınır ve `ARCHIVE.md` ile belgelenir (tarih + sebep + son durum)
2. **`/vibe-done` planları otomatik commit eder** — oturum sonunda kayıp önlenir
3. **Oturum başlangıcında uncommitted plan uyarısı** — `session-guard.ts` plugin'i commit edilmemiş planları gösterir
4. **Üretilen dosyalar** (`plans/index.json`, `.vibeplan/state/`) script/plugin çıktısıdır — elden düzenlenmez, kaynak güncellenir

---

## Sık Karşılaşılan Durumlar

| Durum | Çözüm |
|-------|-------|
| Kafamda bir fikir var | `/vibe-idea benim-fikrim` |
| Plan yazmaya başladım ama fikir net değil | `/vibe-idea` ile keşfe dön |
| Session kapandı, nerede kalmıştım? | `/vibe-go devam-et` → HANDOFF.md yüklenir |
| Context doldu | `/vibe-compact` → state kaydedilir |
| Planın kalitesinden emin değilim | `/vibe-review plans/active/proje/plan.md` |
| Projeyi farklı birine devretmem gerekiyor | `/vibe-done` → HANDOFF.md her şeyi özetler |
| Bir feature için araştırma lazım | `/vibe-research konu` |
| Tamamlanan projeyi arşivlemek istiyorum | `plans/active/` → `plans/archive/` taşı + `ARCHIVE.md` ekle |
| Plan kaydını (index) yenilemek istiyorum | `node scripts/plan-index.cjs` |
| Tahminlerimin ne kadar tuttuğunu görmek istiyorum | `node scripts/estimate-calibration.cjs` |
| Birden fazla projede çalışıyorum | Her proje `plans/active/{proje-adi}/` altında izole |

---

## vibecode ile İlişki

Vibeplan, [vibecode](../vibecode) projesinin planlama odaklı kardeşidir. Aynı yapısal kalıpları kullanır:

| Kavram | vibecode (kodlama) | vibeplan (planlama) |
|--------|-------------------|---------------------|
| Standartlar | `.vibecode/standards/` | `.vibeplan/standards/` |
| Skill'ler | `.vibecode/skills/` | `.vibeplan/skills/` |
| Şablonlar | `.vibecode/templates/` | `.vibeplan/templates/` |
| Çıktı dizini | `backend/`, `frontend/` | `plans/active/`, `plans/archive/` |
| Başlatma | `/go [task]` | `/vibe-idea [fikir]` veya `/vibe-go [task]` |
| Tamamlama | `/done` (verify + commit) | `/vibe-done` (kalite kontrol + HANDOFF) |
| Context yönetimi | `/compact` + HANDOFF.md | `/vibe-compact` + HANDOFF.md |

**Tipik kullanım:**
1. **vibeplan** ile fikri detaylandır → plan, PRD, tech spec oluştur
2. Planları **vibecode** projesine taşı veya referans ver
3. **vibecode** ile kodlamaya başla

---

## İlham Kaynakları

| Kaynak | Alınan Pattern |
|--------|---------------|
| [superpowers](https://github.com/obra/superpowers) | Brainstorming skill, Understanding Lock, plan-writing formatı |
| [prd-skill](https://github.com/johnnychauvet/prd-skill) | JTBD framework ile konuşarak PRD üretme |
| [planning-with-files](https://github.com/OthmanAdi/planning-with-files) | Manus-style persistent markdown planlama |
| [Anthropic Claude Code Docs](https://code.claude.com/docs) | Subagent'lar, skill'ler, Understanding Lock pattern'leri (orijinal vibeplan) |
| [opencode Docs](https://opencode.ai/docs) | Plugin API, agent/command tanımları, skill keşfi, permission sistemi |
| [Tembo — Subagents 2026 Guide](https://www.tembo.io/blog/claude-code-subagents) | Paralel subagent delegasyonu ve context tasarrufu |
| vibecode | Dizin yapısı, hook sistemi, session lifecycle, HANDOFF.md |
