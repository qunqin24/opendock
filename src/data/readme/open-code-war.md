<div align="center">

# ⚔️ Open Code War

**아무도 안 보는 당신의 열정을 광고해드립니다.**

Claude Code · Codex · OpenCode · pi 로 일한 매일을 기록한다: 시킨 횟수 · 쓴 글자 수 · 붙어 있은 날 수 (내용은 절대 수집 안 함).
광고비도, 프롬프트 내용도, 코드도 안 받는다 — 받는 건 열정뿐이다.

[English](README.en.md) · **한국어**

[![website](https://img.shields.io/badge/opencodewar.dev-1a1a1a?style=for-the-badge)](https://opencodewar.dev)
[![status](https://img.shields.io/badge/status-early%20development-e08a2e?style=for-the-badge)](#-로드맵)
[![agents](https://img.shields.io/badge/Claude%20Code%20·%20Codex%20·%20OpenCode%20·%20pi-supported-6c5ce7?style=for-the-badge)](#-플러그인-설치)
[![npm](https://img.shields.io/npm/v/open-code-war?style=for-the-badge&color=cb3837&logo=npm)](https://www.npmjs.com/package/open-code-war)

<sub>코드네임: <b>OCW</b> · 1차 타겟 🇰🇷 대한민국 → 최종: 전 세계 국가별 지구본 랭킹</sub>

</div>

---

## 🔒 프라이버시가 먼저

Open Code War는 **프롬프트 내용을 절대 수집하지 않습니다.** 제출 "횟수"와 "글자 수(숫자)"만 셉니다.

| ✅ 수집함 | ❌ 수집 안 함 |
|-----------|--------------|
| 익명 `userId` (기기에서 자동 발급, 되돌릴 수 없음) | 프롬프트 **내용** |
| 프롬프트 제출 **횟수** | 코드 · 파일 · 경로 |
| 프롬프트 **글자 수** (정수 하나) | 이메일 · 실명 등 개인정보 |
| 사용한 **에이전트 종류** (Claude Code·Codex 등, 라벨 하나) | IP 원문 저장 |
| (서버측) 접속 국가 `cf.country` | |

> 훅은 프롬프트 원문을 받더라도 **글자 수만 계산해서 보내고 원문은 전송하지 않습니다.** 네트워크가 실패해도 에이전트 사용을 방해하지 않도록 **fail-open**(짧은 타임아웃 + 백그라운드 fire-and-forget)으로 동작합니다.

---

## 🪞 설치하면 보이는 것

- **세션 브리핑** — 세션을 시작하면 터미널에 한 줄: 스트릭이 끊길 참인지, 다음 계급까지 몇 프롬프트 남았는지, 바로 위 경쟁자와 얼마 차이인지. 알릴 게 없으면 조용하다. (`/ocw brief off`로 끄기)
- **계급 & 스트릭** — 누적 프롬프트로 이등병 → 원수 12계급. 스트릭은 UTC 하루 기준 연속 기록.
- **프로젝트별 시간** — 그날그날 어느 프로젝트에 프롬프트를 썼는지(옵트인 폴더 링크, 이름 공개는 프로필 shipping 등록분만 — 나머지는 "기타").
- **개발자 명함** — 프로필 페이지(직함·소속·링크·만든 것) + 매일 갱신되는 공유 카드 이미지.
- **리더보드 & 국가전** — 겨루고 싶은 사람에게: 전체·데일리 보드, 우승 퍼레이드.

---

## 🧩 어떻게 동작하나

```
┌──────────────────────────────┐   POST /track      ┌───────────────────────────┐
│  코딩 에이전트 훅·어댑터      │ userId,chars,agent▶│  Cloudflare Worker         │
│  · 프롬프트 제출 = 1건 전송   │                    │  · cf.country 자동 판별    │
│  · /ocw 닉네임 슬래시커맨드   │  ─ POST /register ▶│  · events 기록 + 집계      │
│  · ~/.open-code-war/config    │                    │  · Cron 스냅샷(KV)         │
└──────────────────────────────┘                    └───────────┬───────────────┘
                                                                 │ D1 (SQLite)
                                    GET /leaderboard             ▼
┌──────────────────────────────┐   GET /countries    ┌───────────────────────────┐
│  리더보드 웹 (정적)           │  ◀──── JSON ─────── │  일간/주간/주말/국가별     │
│  일간·주간·주말 · 한반도→지구본│                    │  랭킹 스냅샷 읽기          │
└──────────────────────────────┘                    └───────────────────────────┘
```

- **수집** — 플러그인의 `UserPromptSubmit` 훅이 제출마다 Worker로 이벤트 전송(내용 제외).
- **저장/집계** — Worker가 요청 국가(`cf.country`)를 붙여 D1에 기록하고, KST(UTC+9) 일자별로 집계. 리더보드는 실시간이 아니라 **Cron 배치 스냅샷**(KV)을 읽어 D1 쓰기를 절감.
- **표시** — 정적 웹이 Worker의 읽기 API를 호출해 랭킹/지도 렌더.

---

## 📂 저장소 구조 (모노레포)

```
open-code-war/
├── plugin/            # Claude Code 플러그인 (수집 훅 + /ocw 커맨드)
├── adapters/          # 다른 에이전트용 어댑터 (Codex·OpenCode·pi)
│   ├── .claude-plugin/plugin.json
│   ├── hooks/hooks.json          # UserPromptSubmit → track.mjs (async·비차단)
│   ├── commands/ocw.md           # /ocw 슬래시 커맨드
│   └── scripts/                  # track.mjs, ocw-cli.mjs, lib/
├── backend/           # Cloudflare Worker + D1 API
│   ├── src/                      # Worker 소스
│   ├── migrations/               # D1 스키마
│   ├── seed/                     # 테스트 시드
│   └── wrangler.jsonc
├── web/               # 리더보드 정적 웹 (일간·주간·주말 + 지도)
├── mockups/           # 웹 디자인 시안
└── DESIGN.md          # 상세 설계 문서 (v0.1)
```

---

## 🚀 플러그인 설치

### 마켓플레이스에서 설치 (권장)

```
/plugin marketplace add dodohankim/opencodewar
/plugin install open-code-war@opencodewar
```

`/plugin` 메뉴의 **Installed** 탭에서 활성화·관리할 수 있습니다.

### 자동 업데이트 켜기 (권장)

플러그인은 **버전 고정 없이 최신 커밋을 따라가도록** 설정돼 있어, 한 번 자동 업데이트를 켜두면 새 릴리스가 나올 때마다 Claude Code 시작 시 자동 반영됩니다.

```
/plugin   →   Marketplaces 탭   →   opencodewar 선택   →   auto-update 활성화
```

수동으로 지금 즉시 최신화하려면:

```
/plugin marketplace update opencodewar
/reload-plugins
```

> ℹ️ 백엔드는 **배포되어 라이브(베타)** 이고 플러그인에 URL이 내장돼 있어 설치하면 바로 집계됩니다. (`/plugin marketplace add`는 이 레포가 GitHub에 push되어 있어야 동작합니다.)

### Codex

Codex 도 같은 플러그인·마켓플레이스 체계를 쓰기 때문에 **같은 플러그인을 그대로** 설치합니다.

```bash
codex plugin marketplace add dodohankim/opencodewar
codex plugin add open-code-war@opencodewar
```

설치 후 `codex` 를 실행하면 시작 화면에 **"Hooks need review"** 가 뜹니다.
여기서 **Trust all and continue** 를 선택해야 훅이 동작합니다 — 선택 전에는 아무 경고 없이
조용히 집계되지 않습니다. 최신화는 `codex plugin marketplace upgrade`.

### OpenCode · pi

둘 다 npm 패키지 `open-code-war` 하나로 설치합니다.

```bash
# pi
pi install npm:open-code-war
```

OpenCode 는 `opencode.json` 의 `plugin` 배열에 추가하면 시작 시 자동 설치됩니다.

```json
{ "plugin": ["open-code-war"] }
```

넷 다 같은 `userId` 로 합산되며, 에이전트별 내역은 프로필 그래프에서 따로 볼 수 있습니다.
자세한 동작 요건과 집계 기준은 [`adapters/README.md`](adapters/README.md) 참고.

### 개발용 (로컬 로드)

```bash
export OCW_API_URL="http://localhost:8787"   # 로컬 백엔드 (cd backend && npm run dev)
claude --plugin-dir ./plugin
```

닉네임 등록 / 상태 확인 / 수집 on-off:

```
/ocw nickname <이름>     # 리더보드 표시 이름 등록·변경
/ocw status              # 내 userId·닉네임·수집 상태 확인
/ocw brief on | off      # 세션 시작 브리핑(순위·계급·스트릭 한 줄) 켜기/끄기
/ocw enable | disable    # 수집 켜기/끄기
```

세션을 시작하면 터미널에 **한 줄 브리핑**이 뜹니다 — 지금 알릴 만한 것 하나만(스트릭이 끊길 참이거나,
다음 계급이 코앞이거나, 바로 위 경쟁자와 얼마 차이인지). 알릴 변화가 없으면 아무것도 표시하지 않습니다.

- 설정 파일: `~/.open-code-war/config.json` (userId · 닉네임 · on/off)
- ⚠️ `userId`는 **신원이자 비밀키**입니다. 공유하지 마세요.

---

## 🛠️ 로컬 개발

### 백엔드 (Cloudflare Worker + D1)

```bash
cd backend
npm install
npm run db:migrate:local     # 로컬 D1 스키마 적용
npm run db:seed:local        # 테스트 데이터 시드
npm run dev                  # wrangler dev (http://localhost:8787)
```

기타 스크립트: `npm run typecheck` · `npm run test`(vitest) · `npm run deploy`(배포).

### 웹

`web/index.html`을 정적 서버로 열면 됩니다. (백엔드 읽기 API에 연결)

---

## 🔌 API (Worker 엔드포인트)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/track` | 입력 이벤트 수집 (rate-limit, `cf.country` 부착) |
| `POST` | `/register` | 닉네임 등록/변경 (유일성·비속어 검사) |
| `GET`  | `/leaderboard?type=daily\|weekly\|weekend&metric=prompts\|chars&limit=100` | 랭킹 조회 (스냅샷 캐시) |
| `GET`  | `/countries?type=…` | 국가별 합계 (지구본용) |

집계 구간은 모두 **KST(UTC+9)** 기준이며, 주말 = 금·토·일.

---

## 🗺️ 로드맵

| 단계 | 내용 | 상태 |
|------|------|------|
| **M1** | 백엔드 스켈레톤 — Worker + D1 스키마 + `/track` `/leaderboard` | ✅ |
| **M2** | 수집 플러그인 — `UserPromptSubmit` 훅, 익명 ID, `/register` 닉네임 | ✅ |
| **M3** | 리더보드 웹을 실제 API에 연결 + KV 스냅샷 캐싱 | ✅ |
| **다음** | 마켓플레이스 배포 · 지구본 국가 랭킹 · 어뷰징 방어(rate-limit) 강화 | ⬜ |

자세한 설계·결정 사항은 [`DESIGN.md`](./DESIGN.md) 참고.

### 비목표 (v1 범위 밖)
- 프롬프트 **내용** 수집·저장 (프라이버시상 절대 안 함)
- 상금·현금성 보상 (어뷰징 검증 부담 — 별도 논의)
- 실시간 대전/멀티플레이 (v1은 배치 집계 기반 랭킹)

---

## 📄 라이선스

**Business Source License 1.1 (BSL)** — 전체 조건은 [`LICENSE`](./LICENSE) 참고.

- 소스는 **공개**되어 누구나 열람·감사(audit)할 수 있습니다. (프라이버시 주장 검증을 위해 중요)
- **개인·교육·내부 용도의 플러그인 사용과 비상업적 self-host는 자유**입니다.
- 단, 광고·후원 기반의 **상업적/경쟁 서비스로 제공**하거나 **광고·후원·출처표시 기능을 제거·우회**하는 것은 허용되지 않습니다.
- **Change Date(2030-07-09)** 에 **Apache License 2.0** 으로 자동 전환됩니다.

> BSL은 OSI 공인 오픈소스 라이선스가 아니라 'source-available'입니다. 이름·로고(Open Code War, opencodewar)와 도메인 상표는 라이선스와 별개로 보호됩니다.

<div align="center">
<sub>Made for the coding agent community · <a href="https://opencodewar.dev">opencodewar.dev</a></sub>
</div>
