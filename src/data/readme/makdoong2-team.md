# makdoong2-team

> Jira 이슈 하나를 **3 phase · 9 substage** 로 쪼개 역할별 막둥이(전문 에이전트)에게 위임하는 self-contained opencode 플러그인.

```
1_planning        jira → requirements → scope      planner
                          ↓ worktree 자동 생성
2_implementation  analysis → dev → test            analyzer, engineer
3_delivery        commit → pr → review             publisher
```

부장님(`makdoong2-team-leader`)이 각 단계 진입을 **셸 게이트**로 검증하고, 통과한 단계만 격리된 서브세션의 막둥이에게 넘긴다. 막둥이가 끝나면 `makdoong2-verifier` 가 산출물을 2차 검증한다.

---

## 1. 설치

공개 npm 패키지 [`makdoong2-team`](https://www.npmjs.com/package/makdoong2-team) 이다. 별도 registry 설정이나 인증이 필요 없다.

```bash
npm install -g makdoong2-team    # 모듈 설치
makdoong2-team install           # opencode 에 배포
makdoong2-team doctor            # 설치 진단
```

| 명령 | 하는 일 |
|---|---|
| `install` | agents / skills / config seed 를 `~/.config/opencode/` 에 복사하고 `opencode.json` 을 패치 |
| `uninstall` | 위에서 복사한 파일 제거 |
| `doctor` | 설치 상태·설정 오류·state.json 오염 진단 |
| `validate` | `makdoong2-team.json` 의 모델 정책 위반 사전 검증 |

**요구 환경**: opencode ≥ 1.18.0, Node ≥ 20, tmux ≥ 3.0.

**설치되는 것과 안 되는 것**

- 복사됨 — `agents/*.md`, 리서치 skill, 최초 1회 `makdoong2-team.json` (재설치 시 보존, `--force` 로 덮어쓰기)
- 복사 안 됨 — `dist`, `gates`, `stages`, `scripts`. npm 모듈 안에서 직접 로드된다.
- `install` 은 `~/.cache/opencode/packages/makdoong2-team@latest/` 를 전역 모듈로 심볼릭 링크한다. opencode 가 registry 에서 다시 받지 않고 방금 설치한 버전을 쓰게 만드는 장치다.

로컬 개발 설치는 `npm pack` 후 tgz 를 `npm install -g` 한다.

---

## 2. 에이전트와 단계

에이전트 **7개**. 권한이 좁을수록 사고 반경이 좁다는 원칙으로 나눴다.

| 에이전트 | 담당 | 권한 |
|---|---|---|
| `makdoong2-team-leader` | 라우팅 (부장님) | **git 전면 deny**, 파일 편집 불가 — 위임만 |
| `makdoong2-planner` | 1_planning 3단계 | 읽기 전용 + 리서치 MCP |
| `makdoong2-analyzer` | 2_implementation.analysis | 읽기 + 분석 산출물 write |
| `makdoong2-engineer` | dev / test | edit·write 허용, commit/push deny |
| `makdoong2-publisher` | 3_delivery 3단계 | **git add/commit/push 직접 실행** + bitbucket MCP |
| `makdoong2-verifier` | 메타 검증 | 읽기 전용 |
| `makdoong2-researcher` | 리서치 fan-out 워커 | 읽기 전용 + 리서치 MCP — 소스 1개 전담 |

> **Publisher 는 직접 실행자다.** commit·pr·review 모두 publisher 가 worktree 에서 직접 git 명령과 MCP 를 호출한다. 부장님은 git 권한이 아예 없고 dispatch 와 verdict 수신만 한다. (구버전의 "spec 계산 → 부장님 실행" 하이브리드 모델은 폐기됐다.)

### Substage → agent → spec 매핑

| Substage | Agent | Stage spec | 게이트 |
|---|---|---|---|
| `1_planning.jira` | planner | `stages/01-planning.md` | `verify.sh` |
| `1_planning.requirements` | planner | `stages/02-requirements.md` | `stage2-requirements-verify.sh` |
| `1_planning.scope` | planner | `stages/03-scope.md` | `stage3-scope-verify.sh` |
| `2_implementation.analysis` | analyzer | `stages/04-analysis.md` | `stage-analysis-verify.sh` |
| `2_implementation.dev` | engineer | `stages/05-worktree-dev.md` | `stage4-dev-verify.sh` |
| `2_implementation.test` | engineer | `stages/06-test.md` | `stage5-test-verify.sh` + coverage |
| `3_delivery.commit` | publisher | `stages/07-commit.md` | `stage6-commit-verify.sh` |
| `3_delivery.pr` | publisher | `stages/08-pr.md` | `stage7-pr-verify.sh` |
| `3_delivery.review` | publisher | `stages/09-review-comments.md` | `stage8-review-verify.sh` |

매핑 원본은 `src/agent-stage-config.ts` (`STAGE_SPEC_FILES`, `agentForStage()`).

**통합 Planning**: `1_planning.jira` 를 dispatch 하면 `01-planning.md` 명세에 따라 **한 planner 세션이 jira → requirements → scope 를 연속 처리**한다. requirements / scope 단독 dispatch 는 planner 가 중간에 실패했을 때의 폴백 경로다.

### 작업 범주화

`1_planning.requirements` 가 작업을 `.policy.category` (`minor` | `major`) 로 분류한다. `1_planning.scope` 는 minor → major 상향만 허용한다.

**두 범주 모두 기본은 무인 진행**이다. 실제 승인 여부는 `.policy.auto_approve.<substage>` 마커가 결정하고 기본값이 전 substage `true` 이기 때문이다. `category` 는 위험도 라벨이자 향후 opt-in 훅의 스위치로 남겨둔 값이다. HITL 이 필요하면 planner 가 특정 substage 를 `false` 로 내리고, 그때만 `change-report.md` + 사용자 승인이 요구된다.

게이트는 이 마커를 **결정론적으로만** 검사한다 (LLM 호출 0).

### 다출처 병렬 조사

`1_planning.requirements` 의 교차 조사는 `dispatch_research` 툴 **1회 호출**로 Jira · Confluence · Bitbucket (필요 시 GitHub OSS) 을 **동시에** 조사한다. 플러그인이 소스마다 별도 세션을 띄우므로:

- 대기 시간이 **가장 느린 소스 하나**로 수렴한다 (직렬 합이 아니다)
- 각 소스의 원자료가 planner 컨텍스트를 잠식하지 않는다
- 한 소스가 실패해도 나머지 결과는 그대로 남는다 (부분 성공이 정상)

결과는 `.makdoong2-team/<이슈>/research-findings.json` 으로 병합된다. 상세: ARCHITECTURE.md §3.6

---

## 3. 설정 — `makdoong2-team.json` 한 파일

모든 설정은 `~/.config/opencode/makdoong2-team.json` 하나로 제어한다. 플러그인(`src/config.ts`)과 셸 게이트(`scripts/config.sh`)가 같은 파일을 읽는다. **환경변수는 쓰지 않는다.**

| 블록 | 용도 |
|---|---|
| `agents` | 에이전트별 모델 오버라이드 (`model`, `variant`, `fallback_models`) |
| `model_policy.allowed_primaries` | 빌트인 primary 허용 목록 **확장** (추가 전용 — 빈 배열은 "제한 없음" 이 아니라 "추가 없음") |
| `coverage.threshold` | 커버리지 게이트 최소치 (%, 기본 95) |
| `timeout.substage_minutes` | 서브에이전트 1회 실행 상한 (기본 30분) |
| `timeout.per_agent` | 에이전트별 상한 override (기본 seed: engineer 60분) |
| `timeout.stall_escalate_threshold` | substage 누적 hang 상한 (기본 5). 초과 시 dispatch 차단 후 사용자 에스컬레이션 |
| `research.max_parallel` | 동시 리서치 세션 수 (기본 3, 상한 6) |
| `research.timeout_minutes` | 리서치 소스 1개당 상한 (기본 10분) |
| `tmux` | 막둥이 pane 모니터. 코드 기본값은 off, seed 되는 설정 파일은 `enabled: true` |
| `worktree.extra_exclude` | worktree 동기화 추가 제외 패턴 |
| `logging` | `level` / `mode` / `path` / `max_bytes` |
| `paths` | 비표준 설치 경로 오버라이드 |
| `hosts` | 리서치 MCP 온프레미스 endpoint (`JIRA_HOST`, `CONFLUENCE_HOST`, `BITBUCKET_API_BASE_PATH`, `BAMBOO_URL`) |
| `secrets` | 리서치 MCP 토큰 (Jira / Confluence / Bitbucket / Bamboo) |

전체 스키마는 `assets/makdoong2-team.schema.json`.

### 모델 정책

체인 하나는 `primary` 1개와 **tier 가 더 낮은** `fallbacks` 로 이뤄진다. 7개 에이전트 전부 아래 빌트인 기본값을 쓴다.

```jsonc
// src/model-fallback-policy.ts 의 POLICIES — 7개 에이전트가 모두 동일하다
"makdoong2-engineer": {
  "primary":   { "id": "github-copilot/gpt-5.6-luna",     "variant": "xhigh", "tier": "medium" },
  "fallbacks": [{ "id": "github-copilot/claude-haiku-4.5",                    "tier": "low"    }]
}
```

| 필드 | 의미 | 설정 키 |
|---|---|---|
| `id` | `provider/model`. primary 는 허용 목록 안이어야 한다 — 빌트인 `github-copilot/*` · `local/*` 40개 (`DEFAULT_ALLOWED_PRIMARIES`) + `allowed_primaries` 확장분 | `agents.<agent>.model`, `fallback_models[].id` |
| `variant` | 추론 강도 `low` · `medium` · `high` · `xhigh` · `max`. **primary 에만** 쓰이고 opencode agent 설정으로 그대로 주입된다 | `agents.<agent>.variant` |
| `tier` | 폴백 순서 invariant 전용 등급 (`low < medium < high < max`). fallback 은 **항상 primary 보다 낮아야** 한다 | `fallback_models[].tier` |

primary 의 `tier` 는 설정으로 바꿀 수 없다 — 빌트인 값이 유지되고, 빌트인에 없는 새 에이전트는 `medium` 이 된다.

오버라이드 예시:

```jsonc
{
  "model_policy": {
    // 빌트인 허용 목록에 없는 primary 를 쓸 때만 필요하다 (추가 전용 — 빈 배열은 "추가 없음")
    "allowed_primaries": ["custom-provider/custom-model"]
  },
  "agents": {
    // primary · variant · fallback 을 모두 지정
    "makdoong2-engineer": {
      "model": "github-copilot/claude-opus-4.8",
      "variant": "high",
      "fallback_models": [
        { "id": "github-copilot/claude-haiku-4.5", "tier": "low" }
      ]
    },

    // model 만 적으면 variant 와 fallback 체인은 빌트인 값을 승계한다
    "makdoong2-planner": { "model": "github-copilot/gpt-5.6-sol" },

    // variant 만 낮추고 싶어도 model 은 반드시 함께 적는다 — model 없는 항목은 통째로 무시된다
    "makdoong2-verifier": { "model": "github-copilot/gpt-5.6-luna", "variant": "medium" }
  }
}
```

`makdoong2-team validate` 로 위반 여부와 최종 체인을 미리 확인할 수 있다. 위 설정의 실제 출력이다.

```console
$ makdoong2-team validate
[makdoong2-team] validate — ~/.config/opencode/makdoong2-team.json
  ✓ JSON parses
  ✓ policy invariants pass (primary allow-list + fallback tier ordering)
  ✓ overrides applied for: makdoong2-engineer, makdoong2-planner, makdoong2-verifier
  ✓ extra allowed primaries: custom-provider/custom-model

Resolved chain (primary → fallbacks):
  makdoong2-team-leader      github-copilot/gpt-5.6-luna (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-analyzer         github-copilot/gpt-5.6-luna (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-researcher       github-copilot/gpt-5.6-luna (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-planner          github-copilot/gpt-5.6-sol (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-engineer         github-copilot/claude-opus-4.8 (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-publisher        github-copilot/gpt-5.6-luna (medium) → github-copilot/claude-haiku-4.5 (low)
  makdoong2-verifier         github-copilot/gpt-5.6-luna (medium) → github-copilot/claude-haiku-4.5 (low)

[makdoong2-team] validate: OK ✓
```

위반 시 플러그인은 defaults 로 롤백하고 stderr 에 경고만 남긴다 — 설정 오류로 워크플로우가 죽지 않는다.

### 로깅

`level` 은 임계값이다. `error` 는 error 만, `debug` 는 error/warn/info/debug 까지 출력한다. 기본값 `error` 는 BLOCKED 같은 중요 이벤트만 노출한다. **변경 후 opencode 재시작이 필요하다** (설정은 플러그인 초기화 시 1회만 로드된다).

`mode="file"` 로그는 **append 전용**이다. 한 호스트의 모든 opencode 프로세스(메인 TUI, 막둥이 pane, `npm test`)가 같은 파일을 공유하므로 truncate 하면 남의 기록이 사라진다. 프로세스 구분은 각 라인의 `[pid=N]` 태그로, 크기는 `max_bytes` 회전으로 관리한다. → ARCHITECTURE.md §11

### tmux 막둥이 창

- `placement: "window"` (기본) — 막둥이마다 별도 detached window. 부장님 화면이 **전혀 흔들리지 않는다.**
- `placement: "pane"` (legacy) — 부장님 window 를 분할. spawn/kill 마다 리사이즈가 발생한다. `layout` · `main_pane_size` · `agent_pane_min_width` · `split_direction` 은 이 모드에서만 유효하다.

막둥이 창은 **포커스할 때 실제 TUI 로 붙는다.** spawn 직후에는 배너만 띄운 placeholder 이고, 그 창을 선택하는 순간 `opencode attach` 로 교체된다. 한 번 붙으면 계속 유지되므로 관찰에 제약은 없다. 즉시 attach 하는 모드는 제공하지 않는다 — 부장님 프롬프트에 `/0c0c/0c0c…` 가 타이핑되는 터미널 팔레트 질의 누출을 재현하기 때문이다. → ARCHITECTURE.md §9

---

## 4. 단계별 프롬프트 확장

프롬프트는 세 계층으로 조립되어 서브에이전트에 주입된다. **어느 계층에 쓸지부터 정한다.**

| 계층 | 파일 | 적용 범위 | 재빌드 |
|---|---|---|---|
| ① Agent persona | `agents/makdoong2-<role>.md` | 그 role 의 **모든 substage** | 불필요 |
| ② Stage spec | `stages/NN-<name>.md` | **단일 substage** 절차·게이트·마커 | 불필요 |
| ③ Dispatch header | `src/opencode-plugin.ts` `promptText` | **모든 stage** 공통 헤더 | 필요 |

- **① 페르소나** — 역할, 권한 요약, 금지사항, 공통 절차. YAML frontmatter(`tools`, `permission`) 아래 본문이 시스템 프롬프트가 된다.
- **② Stage spec** — 그 substage 전용 절차와 state.json 마커 예시. dispatch 프롬프트에 `Stage spec: read <경로> and follow it strictly.` 로 참조 지시가 자동 삽입된다.
- **③ Dispatch header** — `Working directory` / `Scripts directory` / `Issue` 같은 전역 강제 라인. 거의 건드릴 일이 없고, 고치면 `npm run build` + 재배포가 필요하다.

**반영 방법**: ①·② 만 고쳤으면 `makdoong2-team install --force` 로 재배포하면 끝. ③ 또는 `src/**` 를 고쳤으면 빌드 후 배포 절차를 밟는다.

### 새 substage 추가 (드문 경우)

기존 substage 에 내용을 **추가**만 하려면 ① 또는 ② 편집으로 끝난다. **새 substage 자체**를 만들려면 5곳을 함께 고친다.

1. `src/agent-stage-config.ts` — `Stage` union + `STAGE_SPEC_FILES` + 필요 시 `agentForStage()`
2. `src/opencode-plugin.ts` — `STAGE_ORDER` 배열에 삽입
3. `stages/NN-<name>.md` — 신규 spec 작성
4. `agents/makdoong2-<role>.md` + `gates/verify.sh` (+ 전용 `stage*-verify.sh`)
5. README 매핑표 · `CLAUDE.md` sealed workflow 규약 갱신

이후 `makdoong2-team validate` → `npm test` 로 회귀를 확인한다.

---

## 5. 테스트

```bash
npm test               # 전체
npm run test:install   # 설치 라이브러리만
```

`npm test` 는 각 단계를 순차 실행하되 **실패해도 멈추지 않고** 끝까지 돌린 뒤 실패 목록을 모아 보고한다. macOS 등 비-Linux 호스트에서는 같은 스위트를 Ubuntu 컨테이너에서 한 번 더 돌려 플랫폼 차이로 갈리는 회귀까지 잡는다 (docker 가 없으면 안내 후 건너뛴다).

`.husky/pre-push` 도 같은 `npm test` 를 부르므로 push 마다 docker 가 기동됐다 종료된다. 건너뛰려면:

```bash
MAKDOONG2_SKIP_LINUX_CHECK=1 git push   # 그 push 는 Linux 검증 없이 나간다
```

---

## 6. 배포 (Maintainer)

두 경로 모두 **승인 게이트 2회**를 통과해야 배포된다.

**경로 A — `npm run release:*` (권장)**

```bash
npm run release:patch   # 1.3.1 → 1.3.2  (버그 수정)
npm run release:minor   # 1.3.1 → 1.4.0  (기능 추가)
npm run release:major   # 1.3.1 → 2.0.0  (breaking)
```

`scripts/release.sh` 가 9단계를 순차 실행한다 — pre-flight → `npm test` → 버전 미리보기 → **승인 #1** → `npm version` → `publish --dry-run` → **승인 #2** → `npm publish` → `git push --follow-tags`. publish 이전에 실패하면 자동 롤백된다. CI 는 `--yes` 로 대화형을 우회한다 (대화형 셸에서는 금지).

**경로 B — git push 자동 배포**

`package.json` 의 `version` 을 올린 커밋을 push 하면 `.husky/pre-push` 가 감지해 같은 2회 승인 후 publish 한다. 이미 registry 에 있는 버전은 skip.

**인증**: `npm login` 또는 `~/.npmrc` 의 `//registry.npmjs.org/:_authToken=<token>` (chmod 600). 설치하는 쪽은 인증이 필요 없다.

---

## 7. 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **어떻게 동작하는가** — 모듈, 툴 API, state 스키마, 훅, 런타임 방어, 실패 모드 |
| [DESIGN.md](./DESIGN.md) | **왜 이렇게 만들었는가** — 하네스 4기둥 (Constrain / Inform / Verify / Correct) 과 트레이드오프 |
| [CLAUDE.md](./CLAUDE.md) | **개발 규약** — git commit, npm 배포, sealed workflow, state.sh 하드룰 |

## 라이선스

MIT — [`LICENSE`](./LICENSE)
