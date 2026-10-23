# OpenCode Memory Context

OpenCode를 위한 개인용, Git 기반 개발자 메모리 플러그인입니다.

이 플러그인은 OpenCode 세션 기록을 **사용자가 소유한 비공개 GitHub 저장소**에 수집하고, 하루에 한 번 증분 분석한 뒤, 이후 모델 요청에 프로젝트 인식 컨텍스트 블록을 추가합니다. 파일과 Git만 사용합니다. 데이터베이스 서버, 호스팅 메모리 서비스, 수집·예약 분석 단계의 모델 호출은 없습니다.

[English](README.md) | **한국어**

- **패키지:** `opencode-memory-context`
- **플러그인 ID:** `opencode-memory.context`
- **도구:** `opencode_memory`
- **명령어:** `/memory-setup`, `/memory-status`, `/memory-doctor`, `/memory-sync`, `/memory-analyze`, `/memory-profile`, `/memory-deep-analyze`

## 주요 기능

1. **수집:** 공식 OpenCode V2 플러그인 API로 세션 메타데이터, 사용자 프롬프트, 어시스턴트 텍스트, 도구 호출, 셸 명령, 컴팩션, 스킬을 수집합니다.
2. **로컬 큐 우선:** 먼저 로컬 큐에 기록한 뒤, 비공개 Git 저장소에 append-only JSONL 세그먼트로 씁니다. 동기화되지 않은 기록은 재시작과 오프라인 상태에서도 유지됩니다.
3. **안전한 동기화:** fetch → rebase → push 순서로 동기화합니다. force-push는 하지 않으며, 해결되지 않은 충돌은 버리지 않고 보존합니다.
4. **증분 분석:** 하루 한 번 분석합니다. 체크포인트로 중복 작업을 막고, 오래된 분석이 최신 프로필을 덮어쓰지 못하게 합니다. 예약 분석기는 결정론적 휴리스틱이며 LLM을 호출하지 않습니다. 사용자가 명시적으로 실행할 때만 선택적 심층 분석이 모델을 호출합니다.
5. **결과 확인:** `/memory-profile`로 전역/프로젝트 프로필, 신뢰도, 근거, 명시적 선호, 선택적 심층 프로필을 확인합니다.
6. **컨텍스트 적용 순서:** 프로젝트 규칙 → 프로젝트 공유 컨텍스트 → 프로젝트 프로필 → 명시적 선호 → 선택적 심층 프로필 → 전역 선호. 컨텍스트는 중복 제거되고 `context_max_chars`로 제한됩니다.
7. **장애 격리:** 설정, 네트워크, GitHub, Git이 실패해도 OpenCode는 계속 사용할 수 있습니다. 오류는 상태와 로컬 로그에 남고, 수집은 큐로 계속됩니다.

## 요구 사항

- OpenCode V2 (`opencode v2.0.32`에서 테스트)
- `PATH`에 `git`
- 개발 및 테스트용 Node.js 22+ (OpenCode 런타임은 자체 TypeScript 로더를 제공)
- 사용자가 읽고 쓸 수 있는 **비공개** GitHub 저장소
- `gh auth login`, Git credential helper, SSH 키, 또는 프로세스 환경 변수 토큰 중 하나로 인증

## 설치

### npm에서 설치

```bash
opencode plugin add opencode-memory-context
```

OpenCode를 재시작한 뒤 확인합니다.

```bash
opencode plugin check
```

### 소스 또는 로컬 체크아웃에서 설치

```bash
git clone https://github.com/navergirugi/opencode-memory.git
cd opencode-memory
npm install
```

`opencode.json(c)`에서 체크아웃 경로를 지정합니다.

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-memory",
      "options": {}
    }
  ]
}
```

로컬 플러그인 디렉터리도 지원합니다. `.opencode/plugins/opencode-memory/index.ts`에서 패키지 엔트리포인트를 다시 내보내면 됩니다.

```ts
export { default } from "/absolute/path/to/opencode-memory/index.ts"
```

### 모든 프로젝트에서 사용

`opencode plugin add`는 OpenCode의 전역 플러그인 세트에 설치하므로 모든 프로젝트에서 사용할 수 있습니다. 로컬 체크아웃을 쓰는 경우, 프로젝트의 `.opencode/plugins/` 아래 래퍼는 해당 프로젝트에만 적용됩니다. 이 컴퓨터의 모든 프로젝트에 적용하려면 전역 플러그인 디렉터리에 래퍼를 둡니다.

```text
~/.config/opencode/plugins/opencode-memory/index.ts
```

```ts
export { default } from "/absolute/path/to/opencode-memory/index.ts"
```

OpenCode를 재시작하고 확인합니다.

```bash
opencode plugin list
```

로컬 래퍼의 예상 출력:

```text
ID                       VERSION  SOURCE
opencode-memory.context  local    /Users/you/.config/opencode/plugins/opencode-memory/index.ts
```

메모리 프로필은 세션의 프로젝트 ID별로 분리됩니다. 전역 로딩이 여러 프로젝트를 하나로 합치지는 않습니다.

npm 패키지의 로드 버전은 다음으로 확인합니다.

```bash
opencode plugin check
```

### 플러그인 옵션

옵션은 `ctx.options`에서 읽으며 플러그인 설정 파일에 저장할 수도 있습니다. 가장 중요한 옵션은 데이터 디렉터리입니다.

```jsonc
{
  "plugins": [
    {
      "package": "opencode-memory-context",
      "options": {
        "dataDir": "/custom/path/opencode-memory"
      }
    }
  ]
}
```

`OPENCODE_MEMORY_DATA_DIR` 환경 변수가 기본 데이터 디렉터리를 덮어씁니다.

## 최초 설정

추적할 프로젝트의 OpenCode 세션에서 실행합니다.

```text
/memory-setup https://github.com/you/your-private-memory.git alice "Alice" "Work MacBook" my-project
```

인자는 순서대로 저장소 URL, 개발자 ID, 선택적 표시 이름, 선택적 기기 이름, 선택적 프로젝트 ID입니다.

도구를 직접 호출할 수도 있습니다.

```json
{
  "action": "setup",
  "repo_url": "https://github.com/you/your-private-memory.git",
  "developer_id": "alice",
  "developer_name": "Alice",
  "device_name": "Work MacBook"
}
```

설정은 구성을 저장하기 전에 다음을 수행합니다.

- 저장소 URL 검증 (GitHub HTTPS 또는 SSH, 포함된 자격 증명은 거부)
- 개발자 ID, 기기 ID, 프로젝트 ID 검증
- 저장소 복제 또는 빈 저장소 초기화
- 저장소 스캐폴드와 레지스트리 파일 작성
- **쓰기** 권한을 확인하는 dry-run push 실행
- 데이터 디렉터리에 모드 `0600`으로 `config.json` 저장

그다음 확인합니다.

```text
/memory-doctor
/memory-status
```

`/memory-doctor`는 구성, 로컬 저장소, origin, 자격 증명, 읽기 권한, 쓰기 권한을 확인합니다.

## 명령어와 도구 액션

| 명령어 | 도구 액션 | 목적 |
| --- | --- | --- |
| `/memory-status` | `status` | 설정, ID, 큐, 동기화, 분석, 알려진 제한 |
| `/memory-doctor` | `doctor` | 저장소, 자격 증명, 읽기/쓰기 확인 |
| `/memory-sync` | `sync` | 큐 플러시, rebase, push |
| `/memory-analyze` | `analyze` | 증분 분석 강제 실행 |
| `/memory-profile` | `profile` | 전역/프로젝트 프로필, 명시적 선호, 심층 프로필 표시 |
| `/memory-deep-analyze` | `deep_analyze` | 선택적 LLM 프로필 생성. 압축된 요약을 모델로 전송 |
| `/memory-setup` | `setup` | 비공개 저장소 설정 |

도구는 `pause`, `resume`, `help`도 받습니다.

## 프로필과 심층 분석

`/memory-profile`은 읽기 전용입니다. 현재 전역 프로필, 현재 프로젝트의 프로젝트 프로필, `preferences.md`, 선택적 LLM 심층 프로필을 출력합니다. 추론된 선호에는 신뢰도와 짧은 근거 인용이 포함됩니다.

`/memory-deep-analyze`는 **예약 분석기에 포함되지 않습니다.** 사용자가 명시적으로 실행하는 선택적 액션으로, 다음을 수행합니다.

1. 명시적 선호, 전역 프로필, 프로젝트 프로필, 그리고 기본적으로 최근 사용자 메시지 30개의 압축 요약을 읽습니다.
2. `ctx.generate.text`로 현재 세션의 모델(또는 OpenCode 기본 모델)을 호출합니다. `--model provider/model`로 다른 모델을 선택할 수 있습니다.
3. 결과를 `developers/<developer>/deep-profile.md`에 쓰고 일반적인 안전 동기화 흐름으로 커밋·푸시합니다.
4. 이후 컨텍스트에 짧은 발췌를 주입합니다. 우선순위는 프로젝트 규칙과 명시적 선호보다 낮습니다.

예시:

```text
/memory-deep-analyze
/memory-deep-analyze --no-messages
/memory-deep-analyze --model openai/gpt-4o
```

`--no-messages`는 최근 사용자 프롬프트를 제외하고 프로필만 분석합니다. `opencode_memory` 도구는 기본적으로 `include_messages: false`이고, 슬래시 명령은 사용자가 직접 실행했으므로 기본적으로 메시지를 포함합니다.

**하루 한 번 제한:** `/memory-deep-analyze`는 하루에 한 번만 실행할 수 있습니다. 오늘 실행한 뒤 두 번째 시도는 다음 날까지 차단됩니다. 또한 이전 심층 분석 이후 새로 수집된 세션/메시지가 없으면 실행을 건너뜁니다.

**분석 범위:** 전체 대화가 아니라 기존 프로필(요약본)과 마지막 심층 분석 이후 추가된 사용자 메시지만 모델에 전달됩니다. 기존 성향에 최근 변화만 더하는 방식입니다.

**개인정보 주의:** 심층 분석 요청은 프로필 요약과, `--no-messages`를 쓰지 않은 경우 최근 사용자 프롬프트 30개(잘리고 마스킹됨)를 선택한 모델 제공자에게 전송합니다. 도구 출력이나 파일 내용은 전송하지 않습니다. 생성된 파일은 권위 있는 규칙이 아니라 힌트입니다. 잘못되었으면 직접 수정하거나 삭제하세요.

## 데이터 위치

| 플랫폼 | 기본 데이터 디렉터리 |
| --- | --- |
| macOS | `~/Library/Application Support/opencode-memory` |
| Linux | `$XDG_DATA_HOME/opencode-memory`, 없으면 `~/.local/share/opencode-memory` |
| Windows | `%APPDATA%\opencode-memory` |

데이터 디렉터리 내부:

```text
config.json             # ID와 저장소 URL, 모드 0600
repo/                   # 비공개 메모리 저장소의 클론
queue/                  # 저장소로 들어가기 전 append-only JSONL
state/runtime.json      # 동기화/분석 상태
state/locks/            # 프로세스 간 잠금
conflicts/<timestamp>/  # 보존된 충돌 스냅샷
logs/opencode-memory.log
```

저장소 레이아웃은 [docs/architecture.md](docs/architecture.md)에 문서화되어 있습니다.

## 개인정보와 보안

- **비공개 저장소만 사용합니다.** 설정은 GitHub URL을 검증하고 쓰기 권한을 확인합니다.
- **토큰을 저장하지 않습니다.** `config.json`, 메모리 저장소, 로그에 토큰을 저장하지 않습니다. 환경 변수에 토큰이 있으면 일시적인 자식 프로세스 credential helper를 통해서만 전달합니다.
- **최선의 마스킹:** API 키, GitHub 토큰, JWT, 개인 키, URL 자격 증명, 비밀 값 할당, 홈 디렉터리 경로를 기록 전에 마스킹합니다. 마스킹은 안전망이지 보장이 아니므로 커밋 내용을 검토하세요.
- **수집과 예약 분석은 모델을 호출하지 않습니다.** 휴리스틱 분석기는 로컬에서 결정론적으로 동작합니다. 명시적 `/memory-deep-analyze`만 설정된 모델을 호출합니다.
- **심층 분석은 선택적이며 범위가 제한됩니다.** 프로필 요약과, `--no-messages`를 쓰지 않은 경우 최근 사용자 프롬프트 30개(잘리고 마스킹됨)를 선택한 제공자에게 전송합니다. 도구 출력이나 파일 내용은 전송하지 않습니다. 생성 파일은 비공개 저장소에 저장됩니다.
- **개인 추론을 팀 규칙으로 승격하지 않습니다.** 후보 팀 규칙은 `shared-context.proposal.md`에만 작성되며, 분석기는 정식 프로젝트 파일을 절대 편집하지 않습니다.
- **비공개 데이터는 npm 패키지에 포함되지 않습니다.** 패키지는 소스, 문서, README, 라이선스만 포함합니다.

### 예상 토큰 사용량

- **컨텍스트 주입:** 매 모델 요청에는 자동으로 주입되는 컨텍스트 블록(프로젝트 규칙, 프로필 통계, 선호)이 포함됩니다. 약 **1,000~2,000 토큰**이 소모됩니다.
- **심층 분석:** `/memory-deep-analyze` 실행 시 프로필 요약과 최근 메시지를 포함하여 약 **4,000~6,000 토큰**이 사용됩니다. 이 작업은 사용자가 명시적으로 실행할 때만 발생합니다.

인증 선택지와 팀 온보딩은 [docs/setup.md](docs/setup.md)를 참고하세요.

## 컨텍스트 적용 방식

각 모델 요청마다 플러그인은 현재 프로젝트를 읽고 시스템 블록 하나를 주입합니다.

1. `projects/<project>/conventions.md` — 권위 있는 팀 규칙
2. `projects/<project>/shared-context.md` — 검토된 공유 컨텍스트
3. `projects/<project>/developers/<developer>/profile.json` — 추론된 프로젝트 프로필
4. `developers/<developer>/preferences.md` — 명시적 선호
5. `developers/<developer>/deep-profile.md` — 선택적 LLM 프로필 (힌트 전용)
6. `developers/<developer>/profile.json` — 추론된 전역 선호

프로젝트 규칙이 개인 선호보다 우선합니다. 중복 줄은 제거되고 블록은 `context_max_chars`(기본 `4000`)로 잘립니다. 다른 프로젝트의 세션에는 이 프로젝트의 컨텍스트가 주입되지 않습니다.

## 알려진 한계

- `ctx.session.context()`는 OpenCode 문서대로 **최신 컴팩션 이후 메시지만** 반환합니다. 실시간 프롬프트/도구 훅이 새 작업을 수집하지만, 컴팩션 이전에만 존재했던 대화 기록은 없을 수 있습니다.
- 이벤트 구독은 휘발성입니다. 연결이 끊긴 동안 놓친 이벤트는 재생되지 않으며, 주기적 세션 폴링이 컨텍스트 API가 노출하는 범위를 재조정합니다.
- 도구 이벤트 페이로드에는 도구 이름이 없으므로, 도구 이벤트는 의도적으로 무시됩니다. `"unknown"` 레코드가 더 풍부한 도구 훅이나 컨텍스트 레코드의 중복 제거를 이기는 것을 막기 위해서입니다.
- 분석은 휴리스틱입니다. 프로필은 근거와 신뢰도를 가진 힌트이지 사실이 아닙니다.
- 심층 프로필은 LLM이 생성하므로 틀리거나 오래되었거나 지나치게 일반적일 수 있습니다. 명시적 선호와 프로젝트 규칙보다 낮은 우선순위로 주입되며, 컨텍스트 예산에는 짧은 발췌만 들어갑니다.
- 심층 분석은 모델 요청 1회 비용이 들고 위에 설명한 요약을 전송합니다. 민감한 프롬프트에 사용하기 전에 제공자의 데이터 정책을 확인하세요.
- JSONL이 아닌 파일의 Git 충돌은 자동 해결되지 않고 보존됩니다. 비공개 저장소에서 해결한 뒤 다시 동기화하세요.
- 데이터 디렉터리당 메모리 저장소는 하나입니다. PC와 개발자마다 로컬 클론이 필요하며, 데이터 디렉터리를 파일 동기화 서비스로 공유하지 마세요.

## 개발

```bash
npm install
npm test           # 53개 테스트
npm run typecheck
```

테스트 스위트는 수집과 중복 제거, 마스킹, 설정/권한, 저장소 손상, 컨텍스트 우선순위(심층 프로필 포함), 증분 분석과 오래된 쓰기 방지, 오류 로그 필터링, 프로필 렌더링, 심층 분석 프롬프트 생성, 기기 간 Git union 병합, push 거부와 재시도, 충돌 보존, 오프라인 복구, 설정 검증, 엔드투엔드 런타임 흐름을 다룹니다.

검증 세부 사항과 API 참고 자료는 [docs/opencode-compatibility.md](docs/opencode-compatibility.md)에 있습니다. 추가 문서:

- [docs/setup.md](docs/setup.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/architecture.md](docs/architecture.md)

## 라이선스

MIT

## 상태

`0.1.1`은 `/memory-profile`, 오류 로그 필터링, 도구 레코드의 셸 명령 추출, 선택적 심층 분석을 추가합니다. `0.1.0`은 npm에 게시되었고 OpenCode `v2.0.32` 및 `@opencode/plugin` `2.1.2`에서 검증되었습니다. 플러그인이 전역으로 등록되었고, 명령어가 나타났으며, `/memory-status`가 합성 상태 메시지를 출력했습니다. 실제 GitHub 비공개 저장소 흐름은 설정 및 런타임 테스트로 검증됩니다.
