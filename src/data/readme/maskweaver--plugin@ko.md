# 🎭 Maskweaver: OpenCode를 위한 전문가 페르소나 프레임워크

<div align="center">

<img src="docs/images/hero.png" width="800" alt="Maskweaver Hero Image">

> **AI 페르소나를 위한 npm** — OpenCode 어시스턴트에게 독보적인 전문가 인격을 더하세요

[![GitHub Release](https://img.shields.io/github/v/release/ulgerang/maskweaver?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/ulgerang/maskweaver/releases)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/v/maskweaver?color=ff6b35&labelColor=black&style=flat-square)](https://www.npmjs.com/package/maskweaver)

[English](README.md) | [한국어](README.ko.md)

</div>

---

## 🔌 OpenCode 통합

**Maskweaver는 [OpenCode](https://github.com/sst/opencode) 생태계의 핵심 구성 요소입니다.**

본 프로젝트는 독립적인 라이브러리로도 사용 가능하지만, 기본적으로 OpenCode 에이전트들이 특정 분야의 전문 지식을 갖출 수 있도록 설계되었습니다:
- **전문가 페르소나 (Masks)**: 전설적인 개발자들의 철학을 담은 표준 YAML 프로필.
- **스마트 위임**: OpenCode에 최적화된 멀티 에이전트 워크플로우.
- **프로젝트 메모리**: 코드베이스 전체에 대한 하이브리드 의미론적 검색.
- **🆕 Weave 워크플로우**: AI 자체 검증이 포함된 Phase 기반 개발.
- **🔗 GDC 통합**: Graph-Driven Codebase 지원으로 리서치 품질 향상 및 설계 시점 검증 게이트 추가.

---

## 왜 Maskweaver인가요?

레이스 컨디션 버그로 고생 중이라면, **린 토발즈**가 코드를 봐준다면 얼마나 좋을까요?

```typescript
// 일반 AI 답변 대신...
"코드에 잠재적 레이스 컨디션이 있습니다."

// 린 토발즈 수준의 인사이트:
"이건 멍청한 코드야. 메모리 배리어도 안 썼잖아. 어셈블리 봐봐 - 
컴파일러가 로드 순서 바꿨어. smp_rmb() 쓰든지, 아예 이 멍청한 
락 없이 다시 설계해."
```

**Maskweaver가 이걸 가능하게 합니다.** AI 어시스턴트에 전문가 페르소나(가면)를 씌워 깊은 도메인 지식과 독특한 사고방식을 부여합니다.

---

## 설치

### 빠른 설치

```bash
# npm
npm install maskweaver

# bun
bun add maskweaver
```

### OpenCode 플러그인 설정

OpenCode 설정에 추가하면 끝!

**전역** (`~/.config/opencode/opencode.json`):
```json
{
  "plugin": ["maskweaver"]
}
```

**또는 프로젝트별** (프로젝트 루트의 `opencode.json`):
```json
{
  "plugin": ["maskweaver"]
}
```

> 참고: OpenCode는 npm 패키지를 이름으로 설치합니다. `maskweaver`를 사용하세요 (`maskweaver/plugin` 아님).

OpenCode가 시작 시 자동으로 `~/.cache/opencode/node_modules/`에 플러그인을 설치합니다.

**Windows:** `%USERPROFILE%\.config\opencode\opencode.json`

### 완료 알림 소리 (선택)

Maskweaver는 생성이 끝나서 세션이 idle 상태가 되면(`session.idle`) 알림 소리를 재생할 수 있습니다.

`.opencode/maskweaver.json`(프로젝트) 또는 `~/.config/opencode/maskweaver.json`(전역)에 설정하세요:

```jsonc
{
  "notifications": {
    "completionSound": {
      "enabled": true
    }
  }
}
```

끄려면:

```jsonc
{
  "notifications": {
    "completionSound": {
      "enabled": false
    }
  }
}
```

### 설치된 버전 확인

Maskweaver 버전을 확인하는 여러 방법:

```bash
# CLI (터미널)
maskweaver --version
# 또는
maskweaver -V

# npm
npm list maskweaver

# OpenCode 채팅 내에서
# maskweaver_status 도구를 사용하거나:
/weave-help
```

```typescript
// 프로그래밍 방식 (Node.js / TypeScript)
import { VERSION } from 'maskweaver';
console.log(VERSION); // "0.7.29"
```

---

## 빠른 시작

### 첫 사용

```bash
# AI 어시스턴트 채팅에서:
@maskweaver 린 토발즈 가면으로 이 C 코드 리뷰해줘

# 또는 더미인간에게 위임:
@dummy-human 린 토발즈 가면으로 멀티스레딩 코드 리뷰
@dummy-flash "unsafe" 들어간 파일 전부 찾아줘
@dummy-premium 이 모놀리스를 마이크로서비스로 설계해줘
```

---

## 기능

### 🎭 전문가 페르소나 (가면)

전설적인 개발자의 인격을 AI에 적용:

```yaml
# masks/software-engineering/linus-torvalds.yaml
profile:
  name: Linus Torvalds
  expertise:
    - 커널 수준 시스템 프로그래밍
    - 성능 최적화
    - 메모리 관리 및 동시성
  
  thinkingStyle: |
    상향식, 실용적 접근. 이론이 아닌 코드부터.
    복잡함을 무자비하게 제거.
```

**현재 가면:**
- 🐧 **린 토발즈** - 시스템, C, 리눅스, 성능
- 🏗️ **마틴 파울러** - 아키텍처, 리팩토링, 패턴
- 🧪 **켄트 벡** - TDD, XP, 테스팅
- 🧠 **앤드류 응** - ML/AI 시스템
- ⚛️ **댄 아브라모프** - React, 프론트엔드 아키텍처

### 🤖 더미인간 시스템

비용 효율적인 멀티 에이전트 워크플로우를 위한 스마트 서브에이전트:

| 에이전트 | 모델 등급 | 비용 | 최적 용도 |
|---------|----------|------|-----------|
| `@dummy-flash` | 빠름 | 💰 | 파일 검색, 요약, 간단한 작업 |
| `@dummy-human` | 균형 | 💰💰 | 코드 작성, 리뷰, 일반 작업 |
| `@dummy-premium` | 강력 | 💰💰💰 | 아키텍처, 복잡한 디버깅 |

### 🧵 Weave 워크플로우

**Phase 기반 개발** — "AI가 검증하고, 유저가 확인한다"

Weave는 Maskweaver의 핵심 워크플로우입니다. 작업을 테스트 가능한 Phase로 나누고, 전문가 마스크를 자동 선택하며, 유저 전달 전 구조화된 검증 단계를 제공합니다.

#### 명령어

| 명령어 | 설명 |
|--------|------|
| `/weave-init` | Weave 초기화 (프로젝트당 1회) |
| `/weave-prepare [docs]` | research + spec + plan을 한 번에 생성 (큰 계획은 자동 분할) |
| `/weave-refine-plan` | `tasks/plan-notes.md` 지시문을 active plan에 반영 |
| `/weave-approve` | 구현 전 사람이 계획 승인(게이트) |
| `/weave-craft [P#]` | Phase 실행 컨텍스트/가이드 생성 |
| `/build` | 자율 빌드 루프 (`action=run/status/stop/list/resume/sync`) |
| `/weave-verify` | 빌드/테스트 검증 실행 (자동 감지) |
| `/weave-worktree ...` | git worktree 기반 병렬 작업 관리 |
| `/weave-status` | 프로젝트 진행 상황 및 통계 확인 |
| `/weave-agents` | 에이전트 파일 동기화 또는 설정 초기화 (`sync=true` / `init=true`) |
| `/weave-troubleshoot` | 글로벌 지식 검색 (`record=true`로 솔루션 저장) |
| `/weave-archive` | 검증된 변경사항 아카이브 |
| `/weave-help` | 도움말 표시 |

> Tip: OpenCode 채팅에서는 `/weave-prepare`, `/build`처럼 실제로 보이는 slash command를 사용하고, 내부적으로는 `weave command=...` 도구 호출로 매핑됩니다.

#### 워크플로우

```
0. INIT (1회): /weave-init
       ↓
1. PLAN: /weave-prepare docs/
    - research + spec + phase plan을 한 번에 생성 (큰 계획은 자동 분할)
       ↓
2. REFINE (선택): /weave-refine-plan
    - tasks/plan-notes.md 기반 계획 정제
       ↓
3. APPROVAL GATE: /weave-approve
    - craft 실행 전 필수 승인
       ↓
4. CRAFT: /weave-craft
     - Phase 실행 계획과 다음 액션 안내 생성
     - 구현/검증 후 approve로 phase 완료 처리
     - `/weave-verify`로 빌드/테스트 검증 가능
       ↓
5. HANDOFF: 유저가 UX/의도 확인 후 다음 Phase로 진행
```

#### 다층 AI 검증 시스템

유저에게 전달하기 전, AI가 다음 검증 레이어를 실행합니다:

| 레이어 | 유형 | 도구 |
|--------|------|------|
| 1️⃣ TypeCheck | 빌드 | `tsc --noEmit` |
| 2️⃣ Lint | 빌드 | `eslint` |
| 3️⃣ Build | 빌드 | `npm run build` |
| 4️⃣ Unit Tests | 테스트 | `jest` / `vitest` |
| 5️⃣ E2E Tests | 테스트 | **Playwright** |
| 6️⃣ Screenshot | 시각 | Playwright / 브라우저 캡처 |
| 7️⃣ API Check | API | `fetch` 헬스 체크 |
| 8️⃣ A11y | 접근성 | `axe-core` |
| 0️⃣ GDC Check | 설계 | `gdc check --machine` |

#### GDC 통합 (Graph-Driven Codebase)

Weave는 [GDC](https://github.com/ulgerang/gdc)(Graph-Driven Codebase)와 통합되어 리서치 품질을 향상시키고 설계 시점 검증 게이트를 추가합니다:

**리서치 강화:**
- `.gdc` 워크스페이스 자동 감지
- GDC `stats`, `graph`, `check` 결과를 `tasks/research.md`에 포함
- 그래프 엣지 기반 의존성 영향 범위(Blast Radius) 분석
- 기능 키워드와 매칭된 재사용 후보 노드
- 새 보고서 섹션: `GDC Node Coverage`, `Dependency Blast Radius`, `Existing Spec vs Implementation Drift`, `Candidate Reuse Nodes`

**Pre-Verify 게이트:**
GDC가 감지되면 `weave verify`와 `weave flow`가 자동으로 실행:
1. `gdc sync --machine` - 스펙과 구현 동기화
2. `gdc check --machine` - 스펙/구현 일치성 검증

GDC check의 블로킹 에러는 검증을 중단시킵니다(`strictVerify` 모드로 설정 가능).

**설정** (`maskweaver.config.json`):
```json
{
  "gdc": {
    "enabled": "auto",
    "strictVerify": false,
    "autoSyncOnPrepare": true
  }
}
```

- `enabled`: `true` | `false` | `"auto"` (기본값: `.gdc` 디렉터리 자동 감지)
- `strictVerify`: `true`면 GDC check 실패 시 검증 차단; `false`면 경고 후 계속 진행
- `autoSyncOnPrepare`: `weave prepare` 시 `gdc sync` 실행

#### 마스크 자동 선택

AI가 각 작업에 가장 적합한 전문가를 자동으로 선택합니다:

| 작업 유형 | 자동 선택 마스크 |
|----------|-----------------|
| 아키텍처/설계 | 🏗️ 마틴 파울러 |
| 테스트/TDD | 🧪 켄트 벡 |
| React/프론트엔드 | ⚛️ 댄 아브라모프 |
| 성능/시스템 | 🐧 린 토발즈 |
| ML/AI | 🧠 앤드류 응 |

#### 글로벌 지식 베이스 (프로젝트 간 RAG)

트러블슈팅 솔루션이 전역으로 저장되어 모든 프로젝트에서 공유됩니다:

```
에러 발생 → ~/.maskweaver/knowledge.sqlite 검색
    ├── 발견 → 솔루션 적용 → 재시도
    └── 미발견 → 직접 해결 → 향후를 위해 솔루션 기록
```

### 🧠 메모리 시스템

과거 대화, 결정, 가면 효과를 기억:

```typescript
import { memory } from 'maskweaver';

// 프로젝트 지식 인덱싱
await memory.indexFile('./docs/architecture.md', embedFn);

// 여러 프로바이더로 의미론적 검색:
const results = await memory.hybridSearch(
  '인증은 어떻게 작동하나요?',
  embedding,
  { limit: 5, minScore: 0.7 }
);
```

**임베딩 프로바이더:**
- 🦙 **Ollama** - 로컬, 프라이빗 (bge-m3, nomic-embed)
- 🤖 **OpenAI** - text-embedding-3-large
- 🚀 **VoyageAI** - 코드 특화 임베딩!
- 🔀 **OpenRouter** - 여러 프로바이더 접근
- 📝 **Text-only** - 임베딩 없음, 순수 FTS5

### 🗂️ 컨텍스트 시스템

파일 연결로 장기 실행 기능 추적:

```bash
# 기능 시작
@context start name="oauth-login" goal="OAuth2 플로우 구현"

# 기능 컨텍스트에 파일 추가
@context add file="src/auth/oauth.ts"

# 상태 확인
@context status

# 완료 표시
@context done
```

### 🔄 회고 시스템

각 세션 후 가면 효과 평가:

```typescript
{
  "trigger": "session_end",
  "masksUsed": [
    {
      "name": "linus-torvalds",
      "task": "멀티스레딩 코드 리뷰",
      "effectiveness": 9.5
    }
  ],
  "wellDone": ["치명적 레이스 컨디션 3개 발견"],
  "lessons": ["린 토발즈 가면은 동시성 리뷰에 탁월"]
}
```

---

## 📦 패키지 구조

Maskweaver는 모듈식 exports를 가진 단일 npm 패키지입니다:

```typescript
// 기본 export - OpenCode 플러그인
import maskweaver from 'maskweaver';

// Named exports - 모듈 네임스페이스
import { core, memory, context, retrospect, verify, weave } from 'maskweaver';

// 서브경로 imports - 직접 모듈 접근
import { hybridSearch } from 'maskweaver/memory';
import { createFeature } from 'maskweaver/context';
import { MaskLoader } from 'maskweaver/core';
import { WeaveOrchestrator, GlobalKnowledge } from 'maskweaver/weave';
```

**모듈:**
- `maskweaver/core` - 가면 로딩, 검증 (YAML/JSON)
- `maskweaver/memory` - 임베딩 + 벡터 검색 (5개 프로바이더)
- `maskweaver/context` - 기능 기반 작업 추적
- `maskweaver/verify` - 교차 가면 코드 리뷰
- `maskweaver/retrospect` - 세션 효과 분석
- `maskweaver/weave` - Phase 기반 개발 워크플로우
- `maskweaver/gdc` - GDC(Graph-Driven Codebase) 통합 유틸리티
- `maskweaver/plugin` - OpenCode 플러그인 엔트리 포인트

---

## 🧵 Weave 사용 가이드

### 0단계: 초기화 (프로젝트당 1회)

```bash
/weave-init
```

### 1단계: 플랜 생성

research + spec + plan을 한 번에 생성:

```bash
/weave-prepare docs/
```

그 다음 계획을 승인합니다:

```bash
/weave-approve
```

AI가 수행하는 작업:
1. 경로 내 모든 문서 읽기
2. 유사한 과거 프로젝트를 메모리에서 검색
3. 필요시 명확화 질문
4. 승인을 위한 **Phase 계획서** 제시

출력 예시:
```markdown
## 📋 실행 계획서

### 비전
AI 인사이트가 포함된 현대적 감정 일기 앱 구축

### Phase 계획
| Phase | 이름 | 완료 조건 | 예상 시간 |
|-------|------|----------|----------|
| P1 | 감정 선택 UI | 유저가 감정을 선택할 수 있음 | 2-3시간 |
| P2 | 데이터 저장 | 감정이 스토리지에 저장됨 | 2-3시간 |
| P3 | 히스토리 뷰 | 유저가 과거 기록을 볼 수 있음 | 2-3시간 |

이 계획이 괜찮으세요? 변경이 필요하면 말씀해주세요.
```

### 2단계: 계획 승인(필수)

```bash
/weave-approve
```

### 3단계: Phase 실행 계획 생성 (Craft)

승인 후 실행 시작:

```bash
/weave-craft
```

`/weave-craft`는 phase 실행 컨텍스트를 생성합니다(phase 미지정 시 다음 phase 자동 선택). 구현 반영 후 같은 명령으로 계획을 다시 확인할 수 있습니다.

### 4단계: 구현 진행

```txt
weave command=craft phaseId="P1"
weave command=verify
```

자율 빌드 루프:

```txt
weave command=build action=run phaseIds="P1,P2"
```

### 5단계: Phase 완료 처리

```txt
weave command=verify
weave command=approve
```

### 6단계: 핸드오프 & 검증

모든 검증이 통과되면:

```markdown
## ✅ Phase P1 검증 완료!

### 🤖 AI 테스트 결과
| 테스트 | 결과 |
|--------|------|
| Build | ✅ 성공 |
| Unit Tests | ✅ 15/15 |
| Lint | ✅ 통과 |

### 🎭 사용된 마스크
- 켄트 벡 (테스트)
- 댄 아브라모프 (React 컴포넌트)

### 🔗 접속
http://localhost:5173

### 👤 사람만 판단 가능한 것
- [ ] 느낌이 의도대로인가요?
- [ ] 사용성이 좋은가요?
- [ ] 원하던 기능이 맞나요?

**[승인]** **[변경 요청]** **[나중에]**
```

### 6단계: 언제든지 상태 확인

```bash
/weave-status
```

출력:
```markdown
## 📊 Weave 진행 상황

**프로젝트**: 감정 일기 앱
**진행률**: 40%

[████████░░░░░░░░░░░░] 2/5

### Phases
✅ **P1**: 감정 선택 UI (2.5h) [kent-beck, dan-abramov]
🔄 **P2**: 데이터 저장
⏳ **P3**: 히스토리 뷰
⏳ **P4**: 통계
⏳ **P5**: 테마 설정

### 글로벌 지식 통계
- 총 트러블슈팅 기록: 47개
- 이 프로젝트에서 활용: 3개
- 새로 기록됨: 1개
```

---

## 🎭 가면 만들기

가면은 간단한 YAML 파일입니다:

```yaml
# masks/my-expert.yaml
metadata:
  id: my-expert
  version: '1.0'
  language: ko

profile:
  name: 에이다 러브레이스
  tagline: 컴퓨팅의 선구자 - 최초의 프로그래머
  
  expertise:
    - 알고리즘 설계
    - 수학적 사고
    - 해석 기관
  
  thinkingStyle: |
    수학적 엄밀함과 시적 상상력을 결합합니다.
    다른 사람들이 놓치는 패턴을 봅니다.

behavior:
  systemPrompt: |
    당신은 최초의 컴퓨터 프로그래머 에이다 러브레이스입니다.
    
    알고리즘을 시로 봅니다 - 우아하고, 정확하고, 아름답게.
    수학적 변환과 논리적 흐름의 관점에서 생각합니다.
  
  communicationStyle:
    tone: 사려깊은
    verbosity: 적당한
    technicalDepth: 전문가

usage:
  suitableFor:
    - 알고리즘 설계 및 최적화
    - 수학적 문제 해결
    - 코드의 패턴 인식
```

---

## 🌍 다국어

지원 준비 완료:
- 🇺🇸 영어
- 🇰🇷 한국어
- 🇨🇳 중국어 *(준비중)*
- 🇯🇵 일본어 *(준비중)*

가면은 여러 언어 버전을 가질 수 있습니다:
```
masks/
├── linus-torvalds.en.yaml
├── linus-torvalds.ko.yaml
└── linus-torvalds.zh.yaml
```

---

## 🤝 기여하기

도움이 필요합니다!

### 가면 추가

`masks/`에 YAML 파일을 만들고 PR을 제출하세요:
- ✅ 실제 전문성 (도메인 지식)
- ✅ 독특한 인격 (사고 방식)
- ✅ 명확한 사용 사례 (언제 사용할지)
- ✅ 예시 (예상 동작)

### 버그 리포트

다음 내용으로 이슈를 열어주세요:
1. 무엇을 시도했는지
2. 무슨 일이 일어났는지
3. 무엇을 예상했는지

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

---

## 📄 라이선스

MIT - [LICENSE](LICENSE) 참조

---

<p align="center">
  <sub>🎭와 함께 제작 by <a href="https://github.com/ulgerang">ULJI SOFT</a></sub>
</p>
