# opencode-resolve — OpenCode용 가벼운 해결사 플러그인

**[English](./README.md) | [한국어](./README.ko.md) | [문서 사이트](https://jshsakura.github.io/opencode-resolve/)**

[![npm version](https://img.shields.io/npm/v/opencode-resolve.svg)](https://www.npmjs.com/package/opencode-resolve)
[![CI](https://github.com/jshsakura/opencode-resolve/actions/workflows/publish.yml/badge.svg)](https://github.com/jshsakura/opencode-resolve/actions/workflows/publish.yml)
[![GitHub Pages](https://img.shields.io/badge/docs-live-blue?logo=github)](https://jshsakura.github.io/opencode-resolve/)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`opencode-resolve`는 [OpenCode](https://opencode.ai)에 작은 고정 역할 해결 루프를 추가하는 플러그인입니다.

- `resolver`는 계획, 디스패치, 검증, 반복을 담당합니다.
- `coder`는 작은 구현 패치와 대상 검증을 담당합니다.
- `explorer`, `reviewer`, `deep-reviewer`, `planner`는 필요할 때 resolver가 부르는 내부 서브에이전트입니다.

독립 실행형 앱, 모델 프로바이더, API 키 관리자, `opencode.json` 대체물이 아닙니다.

```sh
npm install -g opencode-resolve@latest
opencode-resolve setup
```

## 목차

- [무엇을 추가하나](#무엇을-추가하나)
- [설치](#설치)
- [추천 스킬](#추천-스킬)
- [설정](#설정)
- [모델 설정](#모델-설정)
- [에이전트](#에이전트)
- [권한](#권한)
- [프로젝트 컨텍스트](#프로젝트-컨텍스트)
- [로깅](#로깅)
- [업그레이드](#업그레이드)
- [개발](#개발)
- [릴리스](#릴리스)

## 무엇을 추가하나

- 작은 패치와 검증 증거를 중시하는 `resolver -> coder` 루프
- 코드베이스 탐색과 리뷰 갭 점검을 위한 읽기 전용 서브에이전트
- 선택적 명령어: `/resolve`, `/resolve-code`, `/resolve-review`
- 엄격한 설정 검증: 알 수 없는 키, 잘못된 모드, 잘못된 에이전트 이름, 잘못된 타입은 즉시 실패
- 보수적 마이그레이션: 기존 값은 동의 없이 덮어쓰지 않음

기본 활성 에이전트:

```json
["coder", "resolver", "explorer", "reviewer", "deep-reviewer", "planner"]
```

## 설치

### 한 줄 설치 (권장)

```sh
npm install -g opencode-resolve@latest
opencode-resolve setup
```

`opencode-resolve setup`이 `opencode.json`의 provider/model을 자동 감지하고, 합리적인 기본값으로 짧은 Q&A를 거친 뒤(엔터로 모두 통과 가능) `resolve.json`을 작성하고 OpenCode 플러그인 캐시를 새로고침합니다. 모델 핀을 보존한 채 언제든 다시 실행해 재설정할 수 있습니다.

### 요구 사항

- OpenCode 실행 가능: `opencode --version`
- Node.js 20 이상: `node --version`
- `~/.config/opencode/opencode.json`에 최소 하나의 OpenCode 모델 프로바이더 설정

### 설치

```sh
npm install -g opencode-resolve
opencode plugin opencode-resolve --global --force
opencode
```

npm `postinstall`이 `~/.config/opencode/opencode.json`에 플러그인을 등록하고, 없을 때만 `~/.config/opencode/resolve.json`을 만들고, 기존 설정을 보존하며 (`--reset`으로 명시 시 완전 초기화), `~/.cache/opencode/packages/` 의 OpenCode 플러그인 캐시를 새로고침합니다.

### 다시 셋업하기

설치 이후 언제든 `opencode-resolve setup` CLI로 다시 실행할 수 있습니다.

| 명령 | 언제 사용 |
| --- | --- |
| `opencode-resolve setup --reset` | `resolve.json`을 백업 후 완전히 지우고(모델 핀 포함) 재생성. 별칭: `--fresh`, `--reset-config`, `--nuke`. |
| `opencode-resolve setup --update` | `resolve.json`을 유지하고 빠진 기본값만 추가. |
| `opencode-resolve setup --models` | 모델 핀만 다시 감지 |
| `opencode-resolve setup --force-cache` | OpenCode 플러그인 캐시만 새로고침 |

자동 설정을 건너뛰려면:

```sh
OPENCODE_RESOLVE_SKIP_POSTINSTALL=1 npm install -g opencode-resolve
```

### 수동 설정

`~/.config/opencode/opencode.json`에 플러그인을 추가합니다.

```json
{
  "plugin": ["opencode-resolve"]
}
```

`~/.config/opencode/resolve.json`을 만듭니다.

```json
{
  "enabled": ["coder", "resolver", "explorer", "reviewer", "deep-reviewer", "planner"],
  "preserveNative": true,
  "commands": false,
  "models": {},
  "agents": {
    "coder": { "enabled": true, "mode": "subagent" },
    "resolver": { "enabled": true },
    "explorer": { "enabled": true, "mode": "subagent" },
    "reviewer": { "enabled": true, "mode": "subagent" },
    "deep-reviewer": { "enabled": true, "mode": "subagent" },
    "planner": { "enabled": true, "mode": "subagent" }
  }
}
```

캐시를 새로고침하고 OpenCode를 재시작합니다.

```sh
opencode plugin opencode-resolve --global --force
opencode
```

OpenCode가 계속 오래된 플러그인을 로드하면:

```sh
export OPENCODE_CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/opencode"
rm -rf "$OPENCODE_CACHE_ROOT/packages/opencode-resolve" \
       "$OPENCODE_CACHE_ROOT/packages/opencode-resolve@latest"
opencode plugin opencode-resolve --global --force
```

OpenCode는 플러그인 spec 문자열마다 별도 캐시 디렉터리를 만듭니다. 그래서
`opencode-resolve`와 `opencode-resolve@latest`가 동시에 존재할 수 있고, 하나만
지우면 나머지가 옛 버전에 고정된 채 남습니다. 실제로 로드된 빌드는 `resolve_version`
도구로 확인하세요(또는 `OPENCODE_RESOLVE_DEBUG=1`로 OpenCode를 실행하면 로드 배너가
출력됩니다).

## 추천 스킬

더 넓은 OpenCode 환경을 원하면 [awesome-opencode-skills](https://github.com/jshsakura/awesome-opencode-skills)를 같이 사용해 보세요. 개발, 인프라, 보안, 데이터, 문서화 등 특화 작업용 OpenCode Skills 컬렉션을 설치합니다.

macOS / Linux:

```sh
curl -sL https://raw.githubusercontent.com/jshsakura/awesome-opencode-skills/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/jshsakura/awesome-opencode-skills/main/install.ps1 | iex
```

## 설정

플러그인은 아래 파일 중 첫 번째로 발견한 설정을 읽습니다.

1. `.opencode/resolve.json`
2. `opencode-resolve.json`
3. `~/.config/opencode/resolve.json`
4. `~/.config/opencode/opencode-resolve.json`

`opencode.json`의 인라인 플러그인 옵션은 파일 설정보다 우선합니다. 사용자 지정 경로도 가능합니다.

```json
{
  "plugin": [
    [
      "opencode-resolve",
      { "config": ".opencode/resolve.json" }
    ]
  ]
}
```

우선순위:

```text
내장 기본값 -> 처음 발견한 설정 파일 -> 인라인 플러그인 옵션
```

전체 주석 설정 예시: [opencode-resolve.reference.jsonc](./opencode-resolve.reference.jsonc)

### 최상위 옵션

| 키 | 타입 | 기본값 | 용도 |
| --- | --- | --- | --- |
| `tier` | `bronze` / `silver` / `gold` | 미설정 | 설정된 tier preset 활성화. |
| `enabled` | 에이전트 이름 배열 | 기본 에이전트 | 주입할 resolve 에이전트. |
| `models` | object | `{}` | 모델 별칭과 역할별 모델 핀. |
| `agents` | object | `{}` | 에이전트별 override. |
| `preserveNative` | boolean | `true` | 명시 override가 없으면 OpenCode 기본 에이전트 보존. |
| `commands` | boolean | `false` | `/resolve`, `/resolve-code`, `/resolve-review` 추가. |
| `autoApprove` | boolean | `true` | `true`이면 위험 검사를 통과했지만 안전 목록에 없는 명령을 프롬프트 없이 자동 허용합니다. 위험/금지 명령은 여전히 거부됩니다. 알 수 없는 명령을 대화형으로 묻고 싶으면 `false`로 설정. |
| `autoUpdate` | boolean | (no-op) | **사용 중단.** 하위 호환을 위해 필드는 받되 무시합니다. 기존 auto-update는 `hooks.config()` 호출마다 `opencode plugin`을 spawn했고, 여러 OpenCode 인스턴스가 동시에 플러그인을 로드하면 수백 건의 병렬 설치로 폭주했습니다. 업데이트는 `npm i -g opencode-resolve`로 수동 실행하세요. |
| `language` | `auto` / `en` / `ko` | `auto` | 프롬프트 언어 선호. |
| `maxParallelSubagents` | positive integer | 미설정 | 동시 coder 디스패치에 대한 선택적 프롬프트 수준 soft limit. |
| `singleAgentMode` | boolean | `false` | `true`면 resolver가 `coder` 서브에이전트를 디스패치하지 않고 모든 편집을 직접 수행합니다. 단순 작업에서 지연과 토큰 비용을 절약합니다. 정보/진단용 서브에이전트(explorer/debugger)는 여전히 사용 가능합니다. |
| `permissions` | object | `{}` | 옵트인 롤백 권한. 아래 참조. |

### 롤백 권한

`git reset --hard` 와 `git clean -f` 는 기본적으로 차단됩니다. 커밋하지 않은 작업을 보호하지만, 동시에 디버깅 도중 작업트리가 꼬인 에이전트가 깨끗한 상태로 되돌아갈 방법이 없다는 뜻이기도 합니다 — 그대로 고립됩니다. 두 개의 옵트인 플래그가 이를 풀어주며, resolve 에이전트에만 적용됩니다.

```json
{
  "permissions": {
    "allowGitReset": true,
    "allowGitClean": true
  }
}
```

두 명령이 실행되기 전에, 플러그인은 **작업트리 전체** — 추적 중인 수정과 추적되지 않은 파일 모두 — 를 `refs/resolve-checkpoint/<timestamp>-<reset|clean>` 이라는 git ref 로 스냅샷합니다. 스냅샷은 임시 인덱스를 통해 기록되므로 실제 인덱스, 작업트리, 브랜치, `HEAD` 는 전혀 건드리지 않습니다. 스테이징도 커밋도 일어나지 않습니다. 스냅샷을 남기지 못하면 파괴적 명령은 무방비로 실행되는 대신 차단됩니다.

되돌린 것을 후회할 때 복구하려면:

```sh
git for-each-ref refs/resolve-checkpoint    # 체크포인트 목록
git restore --source=<ref> -- .             # 전부 복원
```

`git clean -x` 와 `-X` 는 이 플래그와 무관하게 계속 차단됩니다. gitignore 대상 파일을 삭제하는데, 체크포인트는 `.gitignore` 를 존중하는 `git add -A` 로 스냅샷하기 때문입니다 — 즉 `-x` clean 은 체크포인트가 되살릴 수 없는 파일(`.env`, 로컬 시크릿)을 파괴합니다.

체크포인트는 resolve 에이전트가 해당 명령을 실행할 때마다 생성됩니다 — 두 플래그를 `false` 로 둔 채 권한 프롬프트에서 직접 승인한 경우에도 마찬가지입니다. OpenCode 기본 에이전트(`build`/`plan`/chat)는 무조건 차단이 유지되며 이 플래그의 영향을 받지 않습니다.

### 에이전트 override

각 `agents.<name>` 항목은 다음 키를 받을 수 있습니다.

| 키 | 값 |
| --- | --- |
| `enabled` | boolean |
| `model` | 모델 id 또는 별칭 |
| `mode` | `subagent`, `primary`, `all` |
| `description` | string |
| `prompt` | string |
| `color` | string |
| `maxSteps` | positive integer |
| `tools` | tool boolean object |
| `permission` | `edit`, `bash`, `webfetch`, `doom_loop`, `external_directory` |

권한 값은 `ask`, `allow`, `deny`입니다. `permission.bash`는 명령 패턴별 맵도 받을 수 있습니다.

## 모델 설정

기본적으로 `models`는 비어 있고 resolve 에이전트는 OpenCode 최상위 `model`을 상속합니다. 비용, 속도, reasoning depth를 나눌 필요가 있을 때만 역할별 모델을 핀닝하세요.

각 에이전트의 모델 해석 순서:

1. `agents.<name>.model`
2. `models.<name>`
3. OpenCode 최상위 `model`
4. OpenCode 자체 fallback

3-tier 예시:

```json
{
  "models": {
    "bronze": "zai-coding-plan/glm-5.2",
    "silver": "zai-coding-plan/glm-5.2",
    "gold": "zai-coding-plan/glm-5.2",
    "explorer": "bronze",
    "coder": "silver",
    "resolver": "gold",
    "reviewer": "gold",
    "deep-reviewer": "gold",
    "planner": "gold"
  }
}
```

지원 모델 별칭:

```text
fast, strong, mini, quick, deep,
bronze, silver, gold,
모든 지원 에이전트 이름
```

## 에이전트

| 에이전트 | 기본 | 모드 | Edit | Bash | Web | 역할 |
| --- | --- | --- | --- | --- | --- | --- |
| `resolver` | yes | `all` | allow | ask | allow | 기본 오케스트레이터. |
| `coder` | yes | `subagent` | allow | ask | allow | 집중 구현과 검증. |
| `explorer` | yes | `subagent` | deny | deny | allow | 빠른 읽기 전용 코드베이스 탐색. |
| `reviewer` | yes | `subagent` | deny | deny | allow | 읽기 전용 검증 갭 리뷰. |
| `deep-reviewer` | yes | `subagent` | deny | deny | allow | 위험/고영향 변경 리뷰. |
| `planner` | yes | `subagent` | deny | deny | allow | 필요할 때만 읽기 전용 계획. |
| `architect` | yes | `subagent` | deny | deny | allow | 설계/분해 보조. |
| `debugger` | yes | `subagent` | allow | ask | allow | 재현/root-cause 보조. |
| `researcher` | no | `subagent` | deny | deny | allow | 코드베이스/문서 리서치 보조. |

## 권한

resolve 에이전트의 bash는 기본적으로 `ask`입니다. 플러그인의 권한 훅은 흔한 읽기/테스트 명령은 자동 허용하고, force push, shell eval injection, remote script pipe 같은 위험 패턴은 거부합니다.

`autoApprove` (기본 `true`)는 알 수 없는 명령의 대화형 프롬프트를 생략합니다 — 위험 검사는 통과했지만 안전 목록에 없는 명령(`git add <file>`, `git commit -m`, 커스텀 스크립트 등)을 자동 허용합니다. 알 수 없는 명령을 계속 묻고 싶으면 `"autoApprove": false`로 설정하세요. 금지/위험 명령은 이 설정과 무관하게 항상 거부됩니다.

`git reset --hard` 와 `git clean -f` 는 옵트인하지 않으면 차단됩니다 — [롤백 권한](#롤백-권한) 참조. 허용된 경우 플러그인이 먼저 작업트리를 체크포인트합니다.

신뢰할 수 없는 저장소에서는 샌드박스나 VM을 사용하세요.

## 병렬 서브에이전트

`maxParallelSubagents`는 선택 사항입니다. 생략하면 resolver는 soft guidance를 사용합니다. 진짜 독립적인 작업에만 coder를 분산하고, rate limit이 보이면 backoff합니다.

값을 설정하면 resolver 프롬프트에 삽입됩니다. 런타임 semaphore는 아닙니다. 변경 후 OpenCode를 재시작하세요. `agents.resolver.prompt`를 직접 지정하면 템플릿된 규칙은 대체됩니다.

## 프로젝트 컨텍스트

플러그인은 repo 전체를 프롬프트에 밀어 넣지 않고, 커밋된 프로젝트 컨텍스트 위치만 노출합니다. 감지 대상:

- `HARNESS.md`
- `AGENTS.md`
- `.opencode/context`
- `.claude/context`
- `context/`
- `thoughts/`
- package manager와 흔한 검증 명령
- TypeScript 프로젝트 여부

resolver는 관련 있는 컨텍스트 문서만 읽도록 지시받습니다.

## 로깅

플러그인은 배경에서 꽤 많은 일을 합니다 — 디스패치 라이프사이클 추적, 편집 핫스팟 감지, 실패 패턴, LSP 진단 수집, Ralph-Loop 에스컬레이션. 하지만 화면 재그리기와 충돌을 막으려 TUI 내부 나레이션 채널을 no-op으로 둬서 **아무것도** 실시간으로 보이지 않았습니다. 이제 매 세션이 구조화 로그 파일을 남겨서 플러그인이 뭘 하고 있는지 드디어 확인할 수 있습니다 — 루프의 핵심인 resolver→coder 역할 인계까지:

```sh
tail -f .opencode/resolve.log
```

파일은 첫 기록 시점에 프로젝트 디렉토리 아래에 지연 생성됩니다. 이벤트당 한 줄, ISO 타임스탬프:

```
2026-08-06T12:34:56.789Z INFO  plugin.loaded   {"version":"0.3.9","directory":"/repo"}
2026-08-06T12:34:57.000Z INFO  config.loaded   {"locale":"ko","verifyCommands":["npm test"],"hasTypeScript":true}
2026-08-06T12:35:10.111Z INFO  dispatch.start  {"agent":"coder","goal":"fix the parser bug"}
2026-08-06T12:35:10.112Z INFO  narrate.narration.dispatch.coder — [resolver] 코더를 출동시킵니다…
2026-08-06T12:35:40.000Z INFO  dispatch.end    {"agent":"coder","success":true}
2026-08-06T12:36:01.000Z WARN  dispatch.failed {"agent":"coder","consecutive":2}
2026-08-06T12:36:02.000Z WARN  permission.denied {"cmd":"rm -rf /"}
```

> 이제 루프가 진짜인 이유: resolver의 `edit` 권한이 기본적으로 **거부(deny)**됩니다. 그래서 harness가 직접 편집을 물리적으로 막고 coder 디스패치를 강제합니다. resolver가 직접 편집하는 싼 단일 에이전트 모드를 원하면 `resolve.json`에 `"singleAgentMode": true`를 설정하세요 — 자동으로 `edit`이 다시 허용됩니다.

환경변수 (모두 선택):

| 변수 | 효과 |
|---|---|
| `OPENCODE_RESOLVE_LOG=0` | 파일 로깅을 완전히 끕니다. |
| `OPENCODE_RESOLVE_LOG_FILE=path` | `.opencode/resolve.log` 대신 커스텀 경로에 기록합니다. |
| `OPENCODE_RESOLVE_DEBUG=1` | 파일 레벨을 `debug`로 낮추고 `info` 이상을 stderr에도 출력합니다. opencode가 플러그인 stderr를 TUI에 렌더링하므로 opt-in으로만 둡니다. |
| `OPENCODE_RESOLVE_QUIET=1` | stderr 미러만 억제합니다 (파일 로깅은 영향 없음). |

파일은 2 MB를 넘기면 `.1`로 회전합니다(백업 1개 보관). 기록은 best-effort이며 절대 throw하지 않습니다 — 로깅 실패가 resolve 루프를 망가뜨리지 않습니다. 이 로그는 로컬 진단 보조 수단이며 gitignore되고 어디에도 전송되지 않습니다.

## 업그레이드

```sh
npm install -g opencode-resolve@latest
opencode plugin opencode-resolve@latest --global --force
```

특정 버전을 `opencode.json`에서 고정하고 해당 버전 캐시를 새로고침합니다.

```json
{ "plugin": ["opencode-resolve@<version>"] }
```

```sh
opencode plugin opencode-resolve@<version> --global --force
```

## 개발

```sh
npm install
npm run build
npm test
npm run coverage
```

이 checkout을 로컬 설치:

```sh
npm run install:local
```

Git hook:

```sh
npm run hooks:install
```

테스트는 에이전트 주입, 설정 로딩, 모델 별칭, 권한, 선택적 명령어, 네이티브 에이전트 보존, postinstall 동작을 검증합니다.

## 릴리스

1. `package.json` 버전을 올립니다.
2. `npm run prepush`를 실행합니다.
3. 커밋하고 태그를 푸시합니다.

```sh
git add package.json package-lock.json README.md README.ko.md
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

publish workflow가 테스트 후 npm에 배포합니다.

## 설계 규칙

- OpenCode 네이티브 에이전트를 기본적으로 대체하지 않습니다.
- 기본 설정은 작게 유지합니다.
- bash 권한은 보수적으로 유지합니다.
- 마이그레이션은 추가적으로만 수행합니다.
- 명확한 이점이 없으면 런타임 의존성을 늘리지 않습니다.

## 라이선스

MIT
