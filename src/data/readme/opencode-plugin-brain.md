# opencode-plugin-brain

**AI 에이전트에게 "기억"을 부여하는 OpenCode 플러그인**

> 사람의 뇌처럼 단기 기억 → 장기 기억 정리, 과거 맥락 자동 회상, 파일 변경 추적을 자동으로 수행합니다.
> [Obsidian](https://obsidian.md/) 볼트를 저장소로 사용하여, 사람이 직접 열어서 확인할 수도 있습니다.

---

## 목차

1. [이 플러그인이 뭔가요?](#이-플러그인이-뭔가요)
2. [왜 필요한가요?](#왜-필요한가요)
3. [어떤 원리로 동작하나요?](#어떤-원리로-동작하나요)
4. [설치 방법](#설치-방법)
5. [사용법](#사용법)
6. [AI 에이전트가 쓸 수 있는 도구](#ai-에이전트가-쓸-수-있는-도구)
7. [CEO 업무 도구 7가지](#ceo-업무-도구-7가지)
8. [프로액티브 AI (먼저 말하는 AI)](#프로액티브-ai-먼저-말하는-ai)
9. [다관점 토론 시스템](#다관점-토론-시스템)
10. [감사 가능한 기억 정리](#감사-가능한-기억-정리)
11. [자동으로 일어나는 일들](#자동으로-일어나는-일들)
12. [폴더 구조 설명](#폴더-구조-설명)
13. [설정 (선택사항)](#설정-선택사항)
14. [개발자를 위한 아키텍처 상세](#개발자를-위한-아키텍처-상세)
15. [자주 묻는 질문](#자주-묻는-질문)

---

## 이 플러그인이 뭔가요?

AI 코딩 에이전트(예: Claude)는 대화가 길어지면 이전 맥락을 잊어버립니다. 어제 무슨 작업을 했는지, 왜 그런 결정을 내렸는지 기억하지 못합니다.

**opencode-plugin-brain**은 AI 에이전트에게 **뇌**를 달아줍니다:

- 파일을 수정하면 자동으로 **기록**합니다 (누가 언제 뭘 바꿨는지)
- 하루가 끝나면 자동으로 **일일 요약**을 만듭니다
- 다음 날 대화를 시작하면 **어제 맥락을 자동으로 주입**합니다
- 과거 기록을 **검색**할 수 있습니다

---

## 왜 필요한가요?

### 플러그인 없이 (기존 방식)
```
유저: "어제 하던 리팩토링 이어서 해줘"
AI:   "죄송합니다, 어제 어떤 작업을 하셨는지 알 수 없습니다. 
       어떤 파일의 리팩토링인지 알려주시겠어요?"
```

### 플러그인 설치 후
```
유저: "어제 하던 리팩토링 이어서 해줘"
AI:   "어제 auth 모듈에서 JWT→session 전환 작업하셨고,
       middleware 테스트가 남아있었죠. 바로 이어서 할게요!"
```

**AI가 "기억"을 갖게 되는 겁니다.**

---

## 어떤 원리로 동작하나요?

사람의 뇌 구조를 본떠서 핵심 시스템으로 구성됩니다:

```
┌──────────────────────────────────────────────────────┐
│                    사람의 뇌 vs 플러그인                │
├──────────────────────────────────────────────────────┤
│  감각 기관 (눈, 귀)     →  Thalamus (파일 감시기)      │
│  해마 (단기 기억)        →  Akashic Record (이벤트 로그)│
│  대뇌 피질 (장기 기억)   →  Daily/Weekly/Monthly 요약   │
│  전두엽 (의식적 판단)    →  Brain Tools (17가지 도구)   │
│  꿈 (기억 정리)          →  Sleep Consolidator (수면 정리)│
│  직감 (자동 연상)        →  Heartbeat (자동 맥락 주입)   │
│  예지 (미래 예측)        →  Proactive Engine (선제적 알림)│
│  토론 (내적 논쟁)        →  Debate System (다관점 토론)  │
│  감사관 (기억 검증)      →  Audit Trail (정보 손실 추적) │
└──────────────────────────────────────────────────────┘
```

### 1단계: 감지 (Thalamus)

파일을 수정하면 **Thalamus**라는 감시기가 변경을 감지합니다.

```
src/auth/login.ts 수정됨!
  → 변경 유형: file.modified
  → 중요도: 65/100 (auth 관련이라 높음)
  → 시간: 2026-02-20T14:30:00Z
```

이것은 마치 사람의 눈이 무언가를 보고, 뇌의 시상(Thalamus)이 "이건 중요한 정보야"라고 판단하는 것과 같습니다.

### 2단계: 기록 (Akashic Record)

감지된 모든 이벤트는 **Akashic Record**에 기록됩니다. 이것은 하루 단위의 일지(JSONL 파일)입니다.

```
_brain/akashic/daily/2026-02-20.jsonl
───────────────────────────────────────
{"id":"01HXYZ...","type":"file.modified","source":"src/auth/login.ts","priority":65,...}
{"id":"01HXYZ...","type":"file.created","source":"src/auth/session.ts","priority":72,...}
{"id":"01HXYZ...","type":"file.modified","source":"tests/auth.test.ts","priority":40,...}
```

모든 사건이 **시간순으로** 빠짐없이 기록됩니다. 마치 블랙박스처럼.

### 3단계: 단기 기억 (Working Memory)

현재 세션에서 일어나는 일들을 정리합니다:
- 어떤 파일을 건드렸는지
- 어떤 결정을 내렸는지
- 메모해둔 것들

```json
{
  "session_id": "ses_abc123",
  "context_summary": "auth 모듈 리팩토링 중. JWT→session 전환.",
  "active_files": ["src/auth/login.ts", "src/auth/session.ts"],
  "decisions": [
    { "decision": "Redis 대신 in-memory session 사용", "reasoning": "MVP 단계라 단순하게" }
  ]
}
```

### 4단계: 장기 기억 (Sleep Consolidation)

하루가 끝나면 (다음 날 첫 세션 시작 시), **Sleep Consolidator**가 자동으로 하루를 정리합니다:

```markdown
# Daily Summary: 2026-02-20

## Summary
2026-02-20: 5 files changed, 2 decisions made. auth, session.

## Key Decisions
1. JWT 대신 session 사용 — 보안 강화 목적
2. Redis 대신 in-memory — MVP 단계

## Open Questions
- 프로덕션에서 Redis 필요한가?

## Continuation Notes
middleware 테스트 작성 필요
```

그리고 시간이 지나면:
- **일일 요약** → **주간 요약**으로 압축 (감사 추적 포함)
- **주간 요약** → **월간 요약**으로 압축 (감사 추적 포함)

이것은 사람이 자면서 뇌가 기억을 정리하는 것과 같은 원리입니다.

### 5단계: 회상 (Heartbeat)

다음 날 대화를 시작하면, **Heartbeat**가 자동으로 어제의 맥락을 AI의 시스템 프롬프트에 주입합니다:

```
시스템 프롬프트에 자동 추가:
─────────────────────────
어제: auth 모듈 리팩토링, 5개 파일 수정, JWT→session 전환 결정
이어서 할 것: middleware 테스트 작성
미해결: Redis session store 필요 여부
```

AI는 이 정보를 보고 자연스럽게 맥락을 이어갑니다. **유저가 아무것도 안 해도!**

---

## 설치 방법

### For Humans (추천)

아래 프롬프트를 AI 에이전트에 그대로 붙여 넣으세요:

```text
다음 설치 가이드를 읽고 내 환경에 맞게 opencode-plugin-brain 설치/설정까지 끝내줘.
https://raw.githubusercontent.com/SL-IT-AMAZING/opencode-biz-plugin/refs/heads/main/docs/guide/installation.md
```

직접 보려면 `docs/guide/installation.md`를 참고하세요.

### For LLM Agents

```bash
curl -s https://raw.githubusercontent.com/SL-IT-AMAZING/opencode-biz-plugin/refs/heads/main/docs/guide/installation.md
```

### 사전 준비물

1. **[Bun](https://bun.sh/)** 설치 (Node.js 대체 런타임)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **[OpenCode](https://opencode.ai/)** 설치
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```

3. **[Obsidian](https://obsidian.md/)** 설치 (선택사항이지만 권장)
   - Obsidian vault를 프로젝트 폴더 안이나 근처에 만들어두면 자동 감지됩니다

### 플러그인 설치

현재 패키지는 npm에 배포되어 있지 않아서, **로컬 파일 플러그인 방식**이 기준입니다.

1. 플러그인 저장소를 클론하고 의존성 설치:
   ```bash
   git clone https://github.com/SL-IT-AMAZING/opencode-biz-plugin.git
   cd opencode-biz-plugin
   bun install
   ```

2. `opencode.json` 파일에 플러그인 등록 (절대경로 사용):
   ```json
   {
     "plugin": ["file:///ABSOLUTE/PATH/TO/opencode-biz-plugin/src/opencode-plugin-brain.ts"]
   }
   ```

   예시:
   ```json
   {
     "plugin": ["file:///Users/cosmos/Documents/opensource/opencode-plugin-brain/src/opencode-plugin-brain.ts"]
   }
   ```

   `oh-my-opencode`와 함께 쓸 때:
   ```json
   {
     "plugin": [
       "oh-my-opencode",
       "file:///Users/cosmos/Documents/opensource/opencode-plugin-brain/src/opencode-plugin-brain.ts"
     ]
   }
   ```

3. OpenCode 실행:
   ```bash
   opencode
   ```

4. 끝! 플러그인이 자동으로:
   - Obsidian vault를 감지하고
   - `_brain/` 폴더를 생성하고
   - 파일 감시를 시작합니다

### Vault가 없는 경우

Obsidian vault가 없으면 `.opencode/opencode-plugin-brain.json`에서 직접 경로를 지정할 수 있습니다:

```json
{
  "vault_path": "./my-notes"
}
```

### `oh-my-opencode`와 함께 쓰기

OpenCode는 `plugin` 배열의 여러 플러그인을 순차 로드/실행하므로, 아래처럼 함께 설정하면 공존 가능합니다.

```json
{
  "plugin": ["oh-my-opencode", "opencode-plugin-brain"]
}
```

참고: 안정화 초기에는 `.opencode/opencode-plugin-brain.json`의 `proactive.enabled`를 `false`로 두고 점진적으로 켜는 것을 권장합니다.

### npm 배포 이후 설치 방식

`opencode-plugin-brain`이 npm에 배포된 이후에는 아래 방식도 사용할 수 있습니다.

```bash
bun add opencode-plugin-brain
```

```json
{
  "plugin": ["opencode-plugin-brain"]
}
```

---

## 사용법

### 아무것도 안 해도 되는 것 (자동)

| 기능 | 설명 | 언제 |
|------|------|------|
| 파일 변경 추적 | 파일 수정/생성/삭제 자동 기록 | 파일 저장할 때마다 |
| 인덱싱 | 마크다운 파일 전문 검색 인덱스 갱신 | 파일 변경 시 |
| 단기 기억 정리 | 세션 내 working memory 자동 정리 | 이벤트 20개 쌓일 때 |
| 일일 요약 생성 | 어제 하루를 자동 정리 | 다음 날 첫 세션 시작 시 |
| 맥락 주입 | 어제 요약/결정/질문을 AI에게 자동 전달 | 모든 AI 호출 시 |

### 직접 할 수 있는 것 (선택)

자연어로 AI에게 요청하면 됩니다:

```
"지난주에 데이터베이스 관련해서 논의한 거 찾아줘"
→ AI가 brain_search 도구를 사용해서 검색

"이 결정 기록해둬: PostgreSQL 대신 SQLite 사용하기로 함"
→ AI가 brain_write 도구를 사용해서 기록

"어제 뭐 했는지 보여줘"
→ AI가 brain_get type:daily key:2026-02-19 로 조회

"전체 메모리 정리해줘"
→ AI가 brain_consolidate scope:full 실행
```

---

## AI 에이전트가 쓸 수 있는 도구

### 1. `brain_search` — 기억 검색

과거의 모든 기록에서 관련 내용을 찾습니다.

```
brain_search query:"인증 구현 방법" limit:5
```

**동작 원리:**
- **전문 검색 (FTS5)**: 키워드 매칭 (BM25 알고리즘)
- **벡터 검색** (선택): 의미적 유사도 검색 (임베딩 사용)
- **하이브리드 퓨전**: 두 결과를 RRF로 합치고
- **시간 감쇠**: 오래된 결과는 점수 낮춤
- **MMR 다양성**: 비슷한 결과끼리 중복 제거

결과적으로 **가장 관련 있고, 최신이고, 다양한** 결과를 돌려줍니다.

### 2. `brain_get` — 특정 기억 조회

```
brain_get type:"daily" key:"2026-02-20"    # 특정 날짜의 일일 요약
brain_get type:"soul"                       # 프로젝트 정체성/선호도
brain_get type:"working"                    # 현재 세션의 작업 기억
brain_get type:"file" key:"src/auth/login.ts"  # 특정 파일 내용
```

### 3. `brain_write` — 기억 기록

```
brain_write type:"decision" content:"PostgreSQL 사용" reasoning:"확장성 고려"
brain_write type:"scratch" content:"나중에 캐싱 레이어 추가 고려"
brain_write type:"working" content:"CONTEXT: 현재 인증 모듈 작업 중"
```

- **decision**: 결정 사항 (이유와 확신도 포함)
- **scratch**: 임시 메모
- **working**: 현재 세션 맥락 업데이트

### 4. `brain_recall` — 이벤트 이력 조회

과거 일어난 일들을 시간순으로 조회합니다.

```
brain_recall query:"auth" from:"2026-02-15" to:"2026-02-20"
```

Akashic Record에서 해당 기간의 이벤트를 검색합니다.

### 5. `brain_consolidate` — 수동 기억 정리

```
brain_consolidate scope:"working"   # 현재 세션 정리
brain_consolidate scope:"daily"     # 오늘의 일일 요약 생성
brain_consolidate scope:"full"      # 전체 정리 (백필 + 주간/월간 + 감사 추적)
```

- **working**: 지금까지의 이벤트를 working memory로 정리
- **daily**: 오늘 하루를 DailyMemory로 요약
- **full**: 빠진 일일 요약 백필 + 주간 아카이브 + 월간 아카이브 생성 (정보 손실 노트, 신뢰도, 출처 경로 포함)

---

## CEO 업무 도구 7가지

스타트업 대표의 업무 흐름을 지원하는 전용 도구들입니다. 자연어로 AI에게 요청하면 됩니다.

### 1. `brain_log_meeting` — 회의록 기록

회의를 기록하면 자동으로 참석자 프로필 생성, 약속 추적, 이벤트 로깅이 함께 실행됩니다.

```
"오늘 투자자 미팅 정리해줘. 참석자는 김대표, 박투자자.
 논의 내용: 시리즈 A 일정 협의.
 결정: 3월 펀딩 시작.
 액션: 김대표가 피칭 덱 3월 15일까지 준비"
```

**자동으로 일어나는 일:**
- 📝 Obsidian vault에 마크다운 회의록 생성
- 👤 새 참석자 자동으로 인물 프로필 생성
- ✅ 액션 아이템을 약속(commitment)으로 자동 추적
- 📼 Akashic Record에 이벤트 기록

### 2. `brain_log_decision` — 의사결정 기록

```
"가격을 월 99,000원으로 결정했어.
 이유: 경쟁사 분석 결과 최적 가격대.
 참여자: 마케팅팀장, 나"
```

### 3. `brain_decision_history` — 의사결정 이력 조회

```
"지난달 가격 관련 결정 뭐 있었지?"
"박투자자랑 한 결정들 보여줘"
```

키워드 검색, 참여자 필터, 날짜 범위, 주제 필터를 지원합니다.

### 4. `brain_people_lookup` — 인물 조회

```
"투자자 연락처 보여줘"          → relationship: "investor" 필터
"테크스타트업 사람들 누가 있지?"  → company 필터
"김철수 정보 알려줘"            → name 검색
```

이름, 역할, 회사, 관계 유형(team/investor/advisor/partner 등)으로 검색할 수 있습니다.

### 5. `brain_relationship_map` — 관계도 조회

```
"김대표 관계도 보여줘"
```

특정 인물을 중심으로 공동 의사결정에 참여한 사람들의 네트워크를 보여줍니다.

### 6. `brain_track_commitment` — 약속 추적

```
"재무 모델 업데이트를 이사업개발이 3월 1일까지 해야 해"
```

### 7. `brain_check_commitments` — 약속 확인

```
"밀린 약속 뭐 있어?"           → overdue_only: true
"김대표 약속 상태 보여줘"       → person: "김대표"
"완료된 약속만"                → status: "done"
```

상태(pending/in_progress/done), 기한 초과 여부, 담당자별 필터를 지원합니다.

---

### CEO 도구 폴더 구조

```
_brain/
├── ceo/                             # 🏢 CEO 업무 데이터
│   ├── meetings/                    # 회의록 마크다운 파일
│   │   ├── 2026-02-20-weekly-sync.md
│   │   └── 2026-02-21-investor-update.md
│   ├── decisions/                   # 의사결정 기록 + JSONL 스토어
│   │   ├── 2026-02-20-pricing.md
│   │   └── decisions.jsonl
│   ├── people/                      # 인물 프로필 JSONL 스토어
│   │   └── people.jsonl
│   ├── commitments/                 # 약속 추적 JSONL 스토어
│   │   └── commitments.jsonl
│   └── debates/                     # 토론 액션 메모
│       └── 2026-02-21-pricing-debate.md
```

---

## 프로액티브 AI (먼저 말하는 AI)

기존 AI는 질문을 받아야만 답합니다. **Proactive Engine**은 반대로, AI가 먼저 중요한 것을 알려줍니다.

### 어떤 상황에서 먼저 알려주나요?

- **밀린 약속**: 기한이 지났는데 완료되지 않은 약속
- **번복 의심 결정**: 과거 결정과 모순되는 새 결정이 감지될 때
- **반복 주제**: 7일간 3회 이상 같은 주제가 등장할 때 (해결되지 않은 문제 신호)

### 아침 브리핑

매일 아침, 어제 요약과 밀린 약속을 한 번에 정리해줍니다. 하루를 시작하기 전에 상태를 파악할 수 있습니다.

### 수용성 학습

AI가 알림을 너무 자주 보내면 귀찮아집니다. **피드백 기반 수용성 학습**으로 알림 빈도를 자동 조절합니다. "이런 알림은 필요 없어"라고 말하면 다음부터 줄어듭니다.

### 사용 예시

```
"지금 뭐 알려줄 거 있어?"
→ brain_proactive_check 실행
→ 밀린 약속 3개, 번복 의심 결정 1개 알림

"오늘 아침 브리핑 보여줘"
→ brain_morning_brief 실행
→ 어제 요약 + 오늘 처리해야 할 것들 정리

"이 알림은 너무 자주 와"
→ brain_proactive_feedback 실행
→ 해당 유형 알림 빈도 조절
```

### 프로액티브 도구 3가지

| 도구 | 설명 |
|------|------|
| `brain_proactive_check` | 지금 알려야 할 것 확인 (밀린 약속, 번복 의심 결정, 반복 주제) |
| `brain_morning_brief` | 아침 브리핑 생성 (어제 요약 + 밀린 약속) |
| `brain_proactive_feedback` | 프로액티브 알림에 대한 피드백 (수용성 학습) |

---

## 다관점 토론 시스템

중요한 결정을 내리기 전에, AI가 혼자 "맞아요!"라고 동의하는 게 아니라 **반대 의견**까지 제시합니다.

### 왜 필요한가요?

AI는 사용자의 의견에 동의하는 방향으로 편향되는 경향이 있습니다(아첨 경향, sycophancy). 중요한 결정에서 이 편향은 위험합니다. **Debate System**은 이를 구조적으로 막습니다.

### 어떻게 동작하나요?

1. **Evidence Pack 수집**: 과거 관련 결정, 데이터, 회의록을 자동으로 모읍니다
2. **다관점 분석**: 찬성/반대/리스크/대안을 각각 분리해서 검토합니다
3. **Devil's Advocate (반대 심사역)**: 의도적으로 반대 입장에서 논거를 찾습니다
4. **반-아첨 메커니즘**: 사용자 선호가 명확해도 무조건 동의하지 않습니다

### 사후 재평가

결정을 내린 뒤 시간이 지나면, **brain_review_decision**으로 그 결정이 옳았는지 다시 평가할 수 있습니다. 증거 팩 기반으로 실제 결과와 당시 예측을 비교합니다.

### 사용 예시

```
"React vs Vue 결정 토론해줘"
→ brain_debate 실행
→ 찬반 논거, 리스크, 팀 역량 고려한 다관점 분석

"지난달 가격 결정 재평가해줘"
→ brain_review_decision 실행
→ 당시 근거 vs 현재 결과 비교 분석
```

### 토론 도구 2가지

| 도구 | 설명 |
|------|------|
| `brain_debate` | 중요한 결정에 대해 찬반 다관점 토론 시작 (반대 심사역 포함) |
| `brain_review_decision` | 기존 결정을 사후 재평가 (증거 팩 기반) |

---

## 감사 가능한 기억 정리

기억을 요약할 때, **무엇이 빠졌는지**도 함께 기록합니다.

### 왜 중요한가요?

주간/월간 요약은 필연적으로 정보를 압축합니다. 무엇이 압축 과정에서 사라졌는지 알 수 없으면, 나중에 "그때 왜 그 결정을 했지?"라는 질문에 답할 수 없습니다.

### Audit Trail이 포함하는 것

- **출처 추적** (`source_daily_paths`, `source_event_ids`): 이 요약이 어떤 일일 파일과 이벤트에서 왔는지
- **정보 손실 노트** (`information_loss_notes`): 요약 과정에서 빠진 내용이 무엇인지
- **신뢰도 점수** (`confidence`): 원본 데이터 완성도 기반 (0.0~1.0)

### 패턴 트리거 정밀도

| 패턴 | 정밀도 | 거짓 양성 |
|------|--------|----------|
| 밀린 약속 감지 | ≥ 95% | < 5% |
| 의사결정 번복 감지 | ≥ 95% | < 5% |
| 반복 주제 감지 (7일간 3회 이상) | ≥ 90% | < 10% |

### 평가 하네스

패턴 트리거 정밀도/재현율을 측정하는 전용 평가 시스템이 포함됩니다:
- 24개 약속 fixture (정상/밀린 약속 혼합)
- 11개 의사결정 번복 테스트 케이스
- `src/brain/proactive/evaluation-harness.ts`에서 직접 실행 가능

---

## 자동으로 일어나는 일들

### 매 순간 (파일 변경 시)
```
파일 수정 → Thalamus 감지 → Akashic Record 기록 → FTS 인덱스 갱신
```

### 매 도구 호출 시
```
brain_* 도구 호출 → shouldConsolidate() 체크 → 필요시 Micro-Consolidation
                  → shouldAutoConsolidate() 체크 → 어제 요약 없으면 자동 생성
```

### 매 AI 호출 시
```
LLM 호출 전 → Heartbeat가 시스템 프롬프트에 메모리 주입
            → 캐시 있으면 즉시 반환 (30분 TTL)
            → 없으면 계산: soul + 어제 요약 + 최근 결정 + 미해결 질문
```

### 세션 컨텍스트가 너무 길어질 때 (Compaction)
```
컨텍스트 압축 → Brain Hook이 Working Memory 저장 → 압축 후에도 기억 유지
```

---

## 폴더 구조 설명

플러그인이 Obsidian vault 안에 만드는 `_brain/` 폴더:

```
_brain/
├── soul.md                          # 프로젝트 정체성/선호도 (직접 작성)
├── config.md                        # 설정 파일
├── README.md                        # 사용법 안내
│
├── akashic/                         # 📼 이벤트 로그 (블랙박스)
│   └── daily/
│       ├── 2026-02-19.jsonl         # 2월 19일에 일어난 모든 일
│       └── 2026-02-20.jsonl         # 2월 20일에 일어난 모든 일
│
├── working/                         # 🧠 단기 기억 (현재 세션)
│   ├── session.json                 # 현재 세션의 메모/결정
│   └── *.working_memory.json        # 세션별 스냅샷
│
├── memory/                          # 📅 일일 기억
│   └── daily/
│       ├── 2026-02-19.json          # JSON (기계용)
│       ├── 2026-02-19.md            # Markdown (사람용, Obsidian에서 열람)
│       ├── 2026-02-20.json
│       └── 2026-02-20.md
│
├── archive/                         # 📚 장기 기억
│   ├── weekly/
│   │   ├── 2026-W07.json
│   │   └── 2026-W07.md              # 7주차 주간 요약 (감사 추적 포함)
│   └── monthly/
│       ├── 2026-01.json
│       └── 2026-01.md               # 1월 월간 요약 (감사 추적 포함)
│
├── ceo/                             # 🏢 CEO 업무 데이터
│   ├── meetings/
│   ├── decisions/
│   ├── people/
│   ├── commitments/
│   └── debates/                     # 토론 액션 메모
│       └── 2026-02-21-pricing-debate.md
│
├── index/                           # 🔍 검색 인덱스
│   ├── brain.sqlite                 # SQLite FTS5 데이터베이스
│   └── state.json                   # 인덱싱 상태
│
└── locks/                           # 🔒 동시 접근 방지
    └── writer.lock
```

**핵심 포인트:**
- `.md` 파일은 Obsidian에서 직접 열어서 읽을 수 있음
- `.json` 파일은 프로그램이 정확하게 읽기 위한 것
- `.jsonl` 파일은 한 줄에 하나의 이벤트 (시간순)
- `soul.md`는 유저가 직접 작성 가능 ("이 프로젝트는 ~~이고, 나는 ~~ 스타일을 선호해")

---

## 설정 (선택사항)

기본값으로도 잘 동작하지만, 브레인 전용 설정 파일에서 커스터마이즈할 수 있습니다:

- 프로젝트: `.opencode/opencode-plugin-brain.json`
- 글로벌: `~/.config/opencode/opencode-plugin-brain.json`

```jsonc
{
  // Obsidian vault 경로 (자동 감지 안 될 때)
  "vault_path": "/path/to/my/vault",

  // 파일 감시 설정
  "watch": {
    "patterns": ["**/*.md", "**/*.ts", "**/*.js"],  // 감시할 파일 패턴
    "debounce_ms": 1000                              // 변경 감지 딜레이 (ms)
  },

  // 제외할 경로
  "exclude_paths": ["node_modules", "dist", ".git"],

  // 기억 정리 설정
  "consolidation": {
    "micro_interval_minutes": 30,    // Micro-consolidation 간격
    "decay_half_life_days": 30,      // 검색 시 시간 감쇠 반감기
    "evergreen_tags": ["evergreen", "permanent", "core"]  // 감쇠 면제 태그
  },

  // 임베딩 설정 (벡터 검색용, 선택)
  "embedding": {
    "provider": "openai",            // "openai" | "voyage" | "local" | "null"
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },

  // 검색 설정
  "search": {
    "rrf_k": 60,                     // RRF 퓨전 상수
    "mmr_lambda": 0.7,              // MMR 다양성 파라미터 (0=다양, 1=관련성)
    "temporal_decay_enabled": true   // 시간 감쇠 활성화
  }
}
```

대부분의 경우 이렇게만 하면 충분합니다:

```json
{
  "plugin": ["opencode-plugin-brain"]
}
```

---

## 개발자를 위한 아키텍처 상세

### 전체 시스템 다이어그램

```
                    ┌─────────────┐
                    │  Obsidian   │
                    │   Vault     │
                    └──────┬──────┘
                           │ 파일 변경
                    ┌──────▼──────┐
                    │  Thalamus   │ ← chokidar v5 파일 감시
                    │  (감시기)    │   변경 중요도 0-100 점수
                    └──────┬──────┘
                           │ 이벤트
                    ┌──────▼──────┐
                    │  Akashic    │ ← JSONL 일별 파일
                    │  Record     │   ULID 정렬 가능 ID
                    │  (이벤트로그)│   버퍼링 후 일괄 기록
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
       │  SQLite     │ │ Micro   │ │  Sleep      │
       │  FTS5       │ │ Consol. │ │  Consol.    │
       │  (검색)     │ │ (단기)  │ │  (장기)     │
       └──────┬──────┘ └──┬──────┘ └──┬──────────┘
              │           │           │
              │      Working       Daily/Weekly
              │      Memory        Monthly Archive
              │           │        (감사 추적 포함)
              │           │           │
       ┌──────▼───────────▼───────────▼──────┐
        │          Brain Tools (17개)          │
        │  기존 5개 + CEO 7개 + 프로액티브 3개 │
        │           + 토론 2개                 │
        │                                      │
       └──────────────┬──────────────────────┘
                      │
              ┌───────▼───────┐
              │   Heartbeat   │ ← 세션별 캐시 (30분 TTL)
              │  (자동 주입)   │   시스템 프롬프트에 메모리 추가
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │   AI Agent    │ ← 기억을 가진 AI
              │  (Claude 등)  │
              └───────────────┘
```

### 핵심 모듈 설명

| 모듈 | 파일 | 역할 |
|------|------|------|
| **Thalamus** | `src/brain/thalamus/` | chokidar v5로 파일 감시, 변경 중요도 점수화 (0-100) |
| **Akashic** | `src/brain/akashic/` | JSONL 이벤트 로그, ULID ID, 날짜별 파일, 범위 쿼리 |
| **Search** | `src/brain/search/` | SQLite FTS5 + 벡터 검색 + RRF 퓨전 + 시간 감쇠 + MMR |
| **Consolidation** | `src/brain/consolidation/` | Micro(세션 내) + Daily + Weekly + Monthly 정리 |
| **Heartbeat** | `src/brain/heartbeat/` | 시스템 프롬프트에 자동 메모리 주입, 세션별 캐시 |
| **Proactive** | `src/brain/proactive/` | 트리거 엔진, 스코어링, 수용성 학습, 아침 브리핑 |
| **Decision** | `src/brain/decision/` | 다관점 토론, 반대 심사역, 증거 팩 오케스트레이터 |
| **Evaluation** | `src/brain/proactive/evaluation-harness.ts` | 패턴 트리거 정밀도/재현율 평가 |
| **Tools** | `src/tools/` | 17개 brain_* 도구 정의 (기존 5 + CEO 7 + 프로액티브 3 + 토론 2) |
| **Hooks** | `src/hooks/` | OpenCode 플러그인 훅 (compaction, system transform) |

### 검색 파이프라인 상세

```
쿼리: "인증 구현"
    │
    ├── FTS5 검색 (BM25) ──────────┐
    │   키워드 매칭                  │
    │                               ▼
    ├── 벡터 검색 (cosine) ───→  RRF 퓨전 (k=60)
    │   의미적 유사도               │
    │                               ▼
    │                          시간 감쇠 적용
    │                          score × e^(-λ × ageDays)
    │                               │
    │                               ▼
    │                          MMR 다양성 필터
    │                          중복 제거 (λ=0.7)
    │                               │
    │                               ▼
    │                          Top-K 결과 반환
```

- **RRF (Reciprocal Rank Fusion)**: FTS와 벡터 검색 결과를 공정하게 합치는 방법
- **시간 감쇠**: 오래된 문서는 점수가 낮아짐 (반감기 30일)
- **MMR (Maximal Marginal Relevance)**: 비슷한 결과끼리 중복 제거

### 기억 정리 파이프라인

```
[매 도구 호출]
    │
    ├── notifyActivity()
    ├── shouldConsolidate()? ──→ Micro-Consolidation
    │   (이벤트 20개 이상이면)     (Working Memory 갱신)
    │
    └── shouldAutoConsolidate()? ──→ Sleep Consolidation
        (어제 요약 없으면)            (Daily Memory 생성)

[brain_consolidate scope:"full"]
    │
    ├── 1. 백필: 지난 31일 중 빠진 일일 요약 생성
    ├── 2. 주간: 완료된 주의 주간 아카이브 생성 (감사 추적 포함)
    ├── 3. 월간: 완료된 월의 월간 아카이브 생성 (감사 추적 포함)
    └── 4. 감사: 정보 손실 노트, 신뢰도, 출처 경로 기록
```

---

## 자주 묻는 질문

### Q: Obsidian이 꼭 필요한가요?
**A:** 아니요. Obsidian 없이도 동작합니다. `vault_path`를 아무 폴더로 지정하면 됩니다. 다만 Obsidian이 있으면 `_brain/` 폴더의 마크다운 파일을 직접 열어서 읽을 수 있어 편합니다.

### Q: 데이터는 어디에 저장되나요?
**A:** 모두 **로컬 파일**에 저장됩니다. 클라우드로 전송되지 않습니다. `_brain/` 폴더 안에 JSONL, JSON, Markdown, SQLite 파일로 저장됩니다.

### Q: 벡터 검색(임베딩)은 꼭 설정해야 하나요?
**A:** 아니요. 임베딩 설정이 없으면 자동으로 **FTS(전문 검색) 전용 모드**로 동작합니다. 충분히 잘 작동합니다. 임베딩을 추가하면 "의미적으로 비슷한" 결과도 찾을 수 있어 더 좋아집니다.

### Q: 성능에 영향은 없나요?
**A:** 거의 없습니다.
- 파일 감시: chokidar의 OS 네이티브 감시 (CPU 사용 0%)
- 검색 인덱스: SQLite FTS5 (매우 빠름)
- Heartbeat: 세션당 30분 캐시 (대부분 즉시 반환)
- 정리 작업: 필요할 때만 실행 (lazy trigger)

### Q: `soul.md`는 뭔가요? 꼭 만들어야 하나요?
**A:** `_brain/soul.md`는 프로젝트의 "정체성" 파일입니다. 선택사항이지만, 만들면 AI가 프로젝트 맥락을 더 잘 이해합니다.

예시:
```markdown
# Soul

이 프로젝트는 스타트업의 MVP 백엔드입니다.
기술 스택: TypeScript, Bun, Hono, SQLite
코딩 스타일: 함수형 선호, 간결하게, 테스트 필수
중요 원칙: 단순함 > 확장성 (MVP 단계)
```

### Q: 다른 AI 에이전트에서도 쓸 수 있나요?
**A:** OpenCode 플러그인 시스템을 지원하는 모든 환경에서 사용할 수 있습니다. `@opencode-ai/plugin` SDK 기반입니다.

### Q: 프로액티브 알림이 너무 자주 오면 어떻게 하나요?
**A:** `brain_proactive_feedback` 도구로 피드백을 주면 됩니다. AI가 수용성을 학습해서 알림 빈도를 줄입니다. "이런 종류의 알림은 필요 없어"라고 말해도 됩니다.

### Q: 토론 기능은 모든 결정에 쓰나요?
**A:** 중요한 결정에만 쓰는 것을 권장합니다. 일상적인 기술 선택보다는 가격 정책, 채용, 주요 파트너십 같은 결정에서 효과가 큽니다.

---

## 기술 스택

- **Runtime**: [Bun](https://bun.sh/)
- **Language**: TypeScript (ESNext, strict)
- **Storage**: SQLite (FTS5, WAL mode), JSONL, JSON, Markdown
- **File Watching**: [chokidar](https://github.com/paulmillr/chokidar) v5
- **ID Generation**: [ULID](https://github.com/ulid/spec)
- **Schema Validation**: [Zod](https://zod.dev/) v4
- **Plugin SDK**: [@opencode-ai/plugin](https://www.npmjs.com/package/@opencode-ai/plugin)

## 테스트

```bash
# 전체 테스트 실행
bun test

# 특정 모듈만
bun test src/brain/search/
bun test src/brain/consolidation/
bun test src/brain/heartbeat/
bun test src/brain/proactive/
bun test src/brain/decision/

# 패턴 트리거 정밀도 평가
bun run src/brain/proactive/evaluation-harness.ts

# 타입 체크
bun run tsc --noEmit
```

**현재: 650 tests, 0 failures**

## 릴리즈

`oh-my-opencode` 방식과 동일하게, 릴리즈는 로컬 수동 publish가 아니라 **GitHub Actions workflow_dispatch**로 진행합니다.

- 금지: 로컬에서 버전 수동 bump, `bun publish`, `npm publish`
- 표준: `publish` 워크플로우로 버전 계산/중복 체크/빌드/배포/태그/릴리즈 생성

```bash
# patch 릴리즈
gh workflow run publish.yml -R SL-IT-AMAZING/opencode-biz-plugin -f bump=patch

# 버전 직접 지정 (pre-release 포함 가능)
gh workflow run publish.yml -R SL-IT-AMAZING/opencode-biz-plugin -f version=0.2.0-beta.1
```

워크플로우:
- `.github/workflows/ci.yml`: push/PR 검증 (typecheck, test, build)
- `.github/workflows/publish.yml`: 수동 릴리즈 (버전/태그/배포/릴리즈 노트)

## 라이선스

SUL-1.0
