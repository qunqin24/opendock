# opencode-ms-teams

OpenCode 세션과 Microsoft Teams 채팅을 양방향으로 잇는 npm 플러그인.
루트 세션이 idle 이 되면 마지막 assistant 응답을 Microsoft Teams 로 보내고, Microsoft Teams 답신을
동일 세션에 프롬프트로 재주입해 연속 대화를 만든다.

- 대상 환경: **OpenCode v1.4.17+** (Rocky Linux 8.10 WSL2, glibc 2.28)
- 런타임 의존성: **제로** — Bun 내장 `fetch` 와 `node:` 빌트인만 사용
- 상세 설계: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

> **경로 표기**: 이 문서에서 `$OPENCODE_CONFIG` 는 OpenCode 설정 디렉토리를 나타낸다.
> 결정 순서: `OPENCODE_CONFIG_DIR` 환경변수 → `$XDG_CONFIG_HOME/opencode` → `~/.config/opencode` (기본값)

## 사용 가이드

### 1단계: 최초 연동 — 토큰 발급

OpenCode 세션에서 `/connect-teams` 스킬을 호출한다.

```
/connect-teams
```

스킬을 처음 실행하면 assistant 응답 하단에 Azure device code 안내가 append 된다.

```
> 🔐 **Microsoft Teams 로그인 필요**
>
> 1. 브라우저에서 https://microsoft.com/devicelogin 를 여세요
> 2. 코드 `USERCODE1` 를 입력
> 3. 회사 계정으로 로그인 완료 시 다음 응답에 완료 알림이 표시됩니다
```

브라우저에서 인증을 완료하면 다음 응답에 `✅ Microsoft Teams 로그인 완료` 안내가 붙으며 토큰이 저장된다.
이후 OpenCode 를 재시작해도 저장된 토큰으로 자동 로그인되므로 이 단계는 최초 1회만 수행한다.

> **사전 조건**: `$OPENCODE_CONFIG/opencode-ms-teams/opencode-ms-teams.json` 의
> `azure.tenantId` / `clientId` / `scopes` 를 미리 채워야 한다 (설정 파일 섹션 참고).

### 2단계: 채팅방 선택

토큰 발급이 완료되면 같은 세션에서 다시 `/connect-teams` 를 호출하거나, 로그인이 이미 완료된 상태에서 첫 호출 시 채팅방 선택 안내가 바로 나타난다.

```
> 🔗 Microsoft Teams 채팅방 선택 필요
>
> 이 세션에서 사용할 채팅방의 chatId 를 다음 프롬프트에 입력해 주세요.
>
> 1. Alice - 안녕 · 2026-08-01 10:23
>    `19:xxxxxxxxxxxx@thread.v2`
>
> 2. Bob - 프로젝트 · 2026-07-20 05:00
>    `19:yyyyyyyyyyyy@thread.v2`
```

목록에서 원하는 채팅방의 `19:...` 문자열을 복사해 다음 프롬프트에 그대로 붙여넣는다.
채팅방 연동이 완료되면 우측 상단 toast(`Microsoft Teams 채팅방 연동 완료: {이름}`)가 표시되고, 이후 idle 시점부터 해당 채팅방으로 응답이 발신된다.

채팅 ID 는 세션 메모리에만 보관되므로 **OpenCode 재시작 시 재선택이 필요**하다.

### 3단계: Teams 에서 OpenCode 에 질문하기 — 키워드 트리거

채팅방이 연동된 이후, Teams 에서 보낸 메시지가 자동으로 OpenCode 세션에 주입되지는 않는다.
**메시지 선두에 지정 키워드를 붙인 경우에만** 세션에 전달된다.

### 4단계: Teams 답장으로 권한·질문에 대신 응답하기

OpenCode 세션이 사용자 승인(permission) 또는 질문(question) 을 기다릴 때, Teams 채팅으로 발송되는 알림 메시지 하단에 답장 명령 예시가 포함된다. **OpenCode TUI 로 돌아가지 않고 Teams 답장만으로 응답 가능**.

각 알림에는 짧은 코드 (`p......` = permission, `q......` = question) 가 부여되며, 답장 명령은 이 코드를 인용한다. 답장 verb 는 **최상위 keyword** (`#allow`, `#reject`, `#answer`, `#skip`) 로 동작한다.

| 명령 | 설명 |
|---|---|
| `#allow <code>` | permission 을 이번 한 번만 승인 (`once`) |
| `#reject <code>` | permission 거부 |
| `#answer <code> <label>[, <label2>...]` | 단일 질문에 label 응답 (multiple 은 comma 로 여러 label) |
| `#answer <code>-<n> <label>` | 여러 질문이 있는 경우 sub-code (`{code}-1`, `{code}-2`) 로 개별 응답 |
| `#answer <code> text: <자유 텍스트>` | question 에 자유 텍스트로 응답 (`custom=true` 인 질문만) |
| `#skip <code>` | question 전체 skip (reject) |

#### 시나리오별 예시

##### 시나리오 1: Bash 실행 permission 승인 (가장 흔한 케이스)

Assistant 가 `npm test` 를 실행하려 함 → opencode core 가 permission 확인 → 세션이 blocking 됨.

**Teams 채팅에 도착하는 알림**:
```
[⚠️ Microsoft Teams: 권한 요청 · 3ab7f0e2] · pa7k9m
Type: bash
Title: npm test
Workspace: /home/user/my-project

Teams 답장으로도 응답 가능:
• #allow pa7k9m
• #reject pa7k9m
```

**사용자 답장**:
```
#allow pa7k9m
```

**결과**: OpenCode 세션이 즉시 unblock → `npm test` 실행 → 결과가 Teams 로 다시 발신. Teams 에 확인 메시지 도착:
```
✅ 반영됨 · pa7k9m allow
```

##### 시나리오 2: Workspace 외부 파일 접근 거부

Assistant 가 `/etc/passwd` 를 read 하려 함.

**Teams 알림 (외부 경로 강조)**:
```
[⚠️ Microsoft Teams: 권한 요청 · 3ab7f0e2] · p9r2t8
Type: read
Title: read /etc/passwd
Workspace: /home/user/my-project

⚠️ Workspace 외부 경로 (Teams 승인 시 주의):
• /etc/passwd

Teams 답장으로도 응답 가능:
• #allow p9r2t8
• #reject p9r2t8
```

**사용자 답장 — 거부**:
```
#reject p9r2t8
```

**결과**: opencode 세션이 해당 read 요청을 실패로 처리. Teams:
```
✅ 반영됨 · p9r2t8 reject
```

##### 시나리오 3: 단일 질문 · 단일 선택

Assistant 가 배포 확인용 `question` tool 호출 (options: `yes`, `no`, `multiple=false`).

**Teams 알림**:
```
[❓ Microsoft Teams: 세션 질문 · 3ab7f0e2] · q3x9m2

배포 승인 · q3x9m2
production 에 배포할까요?
• yes — 지금 배포
• no  — 취소

Teams 답장으로도 응답 가능:
• #answer q3x9m2 <label>[, <label2>]
• #answer q3x9m2 text: <자유 텍스트>
• #skip q3x9m2
```

**사용자 답장**:
```
#answer q3x9m2 yes
```

**결과**: opencode 세션이 `["yes"]` 응답을 받고 assistant 가 계속 진행. Teams:
```
✅ 반영됨 · q3x9m2 answer
```

##### 시나리오 4: 복수 선택 질문 (`multiple=true`)

**Teams 알림**:
```
[❓ Microsoft Teams: 세션 질문 · 3ab7f0e2] · qk5m8n

배포 대상 (복수 선택) · qk5m8n
어느 환경에 배포할까요? (복수 선택 가능)
• prod    — production
• staging — staging
• dev     — development

Teams 답장으로도 응답 가능:
• #answer qk5m8n <label>[, <label2>]
• #answer qk5m8n text: <자유 텍스트>
• #skip qk5m8n
```

**사용자 답장 (comma 로 여러 label 지정)**:
```
#answer qk5m8n staging, dev
```

**결과**: opencode 세션이 `["staging", "dev"]` 를 선택된 것으로 처리. Teams:
```
✅ 반영됨 · qk5m8n answer
```

##### 시나리오 5: 자유 텍스트 답변 (`custom=true`)

Assistant 가 커밋 메시지 생성용 자유 텍스트 질문.

**Teams 알림**:
```
[❓ Microsoft Teams: 세션 질문 · 3ab7f0e2] · q7bnp3

커밋 메시지 · q7bnp3
이 변경의 커밋 메시지를 입력해주세요
• auto — AI 가 생성

Teams 답장으로도 응답 가능:
• #answer q7bnp3 <label>[, <label2>]
• #answer q7bnp3 text: <자유 텍스트>
• #skip q7bnp3
```

**사용자 답장 — `text:` 뒤는 greedy tail (comma·개행·특수문자 모두 그대로 전달됨)**:
```
#answer q7bnp3 text: Feat: 알림 큐 기능 비활성화

기존 알림 큐를 disable 하고 새 파이프라인으로 이관.
```

**결과**: opencode 서버로 아래 payload POST:
```json
{"answers":[["Feat: 알림 큐 기능 비활성화\n\n기존 알림 큐를 disable 하고 새 파이프라인으로 이관."]]}
```

Teams:
```
✅ 반영됨 · q7bnp3 answer
```

##### 시나리오 6: 복수 질문 한 번에 (sub-code 답변)

Interview agent 가 한 번에 두 질문 (환경, 브랜치).

**Teams 알림** — 각 질문에 sub-code (`{root}-1`, `{root}-2`) 부여:
```
[❓ Microsoft Teams: 세션 질문 · 3ab7f0e2] · qa9m2k

환경 · qa9m2k-1
어느 환경?
• prod
• staging
------------------
브랜치 · qa9m2k-2
어느 브랜치?
• main
• develop

Teams 답장으로도 응답 가능:
• #answer qa9m2k-1 <label>
• #answer qa9m2k-2 <label>
• #skip qa9m2k
```

**사용자가 두 번에 나눠서 답장**.

**답장 A**:
```
#answer qa9m2k-1 prod
```

Teams 즉시 확인 (아직 opencode 서버로 POST 하지 않음):
```
📝 답변 기록됨 · qa9m2k-1 (남은 질문 1개)
```

**답장 B**:
```
#answer qa9m2k-2 main
```

**결과**: 모든 sub-answer 가 채워지면 한 번에 assemble → POST:
```json
{"answers":[["prod"],["main"]]}
```

Teams:
```
✅ 반영됨 · qa9m2k answer
```

> **핵심 규칙**: multi-question 은 반드시 sub-code (`-1`, `-2`, ...) 로 답변해야 한다. `#answer qa9m2k prod` (root code 만) 은 "sub-code 필요" 로 판단되어 조용히 무시.

##### 시나리오 7: 질문 전체 skip

**사용자 답장** (single/multi 모두 root code 로 skip):
```
#skip qa9m2k
```

**결과**: opencode 세션이 question 을 rejected 상태로 받아 assistant 에게 반환. Teams:
```
✅ 반영됨 · qa9m2k skip
```

##### 시나리오 8: Sub-session 의 permission (bubble-up + 배너)

Root 세션 `ses_parent...` 에서 Task tool 이 sub-agent 를 spawn 했고, sub-session 안의 assistant 가 `git push` 시도.

**Teams 알림** — sub-session 배너 prepend + root chat 으로 발신:
```
🌿 sub-session child · root parent
[⚠️ Microsoft Teams: 권한 요청 · ses_child] · pxm4kq
Type: bash
Title: git push origin main
Workspace: /home/user/my-project

Teams 답장으로도 응답 가능:
• #allow pxm4kq
• #reject pxm4kq
```

**사용자 답장**:
```
#allow pxm4kq
```

**결과**: Plugin 이 `pending.sid = "ses_child"` (root 아님, 원본 sub-session sid) 로 SDK 호출. sub-session 이 unblock 되어 `git push` 실행. Teams:
```
✅ 반영됨 · pxm4kq allow
```

##### 시나리오 9: Race — TUI 가 먼저 응답한 경우

사용자가 opencode TUI 로 돌아가서 `Allow once` 클릭 → opencode 가 `permission.replied` 이벤트 발화.

**Plugin 자동 정리**: `pendingPermissions.delete(code)` — 이후 Teams 답장은 "알 수 없는 code" 로 처리.

**사용자가 나중에 Teams 로도 답장 (모르고)**:
```
#allow pa7k9m
```

**결과**: 조용히 무시 (SDK 호출 없음, Teams 후속 메시지 없음). stale code 로 인한 중복 처리 방지.

##### 시나리오 10: 오타 / 만료 code

**사용자 답장 (오타)**:
```
#allow pXXXXX
```

**결과**: `pendingPermissions.get("pxxxxx")` → miss → 조용히 무시 (Teams 후속 메시지 없음 — attack surface 축소).

**24시간 만료**: `pollLoop` tick 마다 `sweepExpiredPending()` 이 만료된 code 자동 삭제. 만료 후 답장은 동일하게 무시.

##### 시나리오 11: HTTP 실패 (opencode 서버 이미 응답 완료)

opencode 서버가 이미 permission 을 처리했거나 sessionID/permissionID 가 유효하지 않음 (4xx).

**사용자 답장**:
```
#allow pa7k9m
```

**Plugin 결과**: SDK 호출 → error → pending 정리 + Teams 후속 발신:
```
❌ 적용 실패 · pa7k9m allow (opencode 세션이 이미 응답했거나 만료됨)
```

##### 시나리오 12: `#allow-always` (미지원)

**사용자 답장**:
```
#allow-always pa7k9m
```

**Plugin 결과**: `#allow` 뒤 `-` 는 후행 경계가 아니므로 `detectTrigger` 자체가 매칭 실패. SDK 호출 없음, promptAsync 주입 없음, Teams 후속 없음. 완전히 무시됨.

> 영구 권한 부여는 반드시 OpenCode TUI 의 `Allow always` 버튼으로만 가능. Teams 원격 답장으로 permanent grant 는 계정 탈취 시 위험이 크므로 의도적으로 차단.

#### 요약 치트시트

| 상황 | Teams 답장 |
|---|---|
| Permission 승인 (일회성) | `#allow <p_code>` |
| Permission 거부 | `#reject <p_code>` |
| Question 단일 답변 | `#answer <q_code> <label>` |
| Question 복수 답변 | `#answer <q_code> <label1>, <label2>` |
| Question 자유 텍스트 | `#answer <q_code> text: <내용>` |
| Question multi 각각 | `#answer <q_code>-1 <label>` / `-2` / ... |
| Question 전체 skip | `#skip <q_code>` |

**공통 규칙**:
- `<p_code>` = `p` + base36 5자 (예: `pa7k9m`) · `<q_code>` = `q` + base36 5자 (예: `q3x9m2`)
- 대소문자 무관 (`#ALLOW`, `#Allow` 모두 동일)
- TTL 24시간 · 오타·만료·이미 응답됨은 모두 조용히 무시

#### 제약 및 안전장치

- **`#allow-always` 는 지원하지 않는다** — 영구 권한 부여는 반드시 OpenCode TUI 에서 진행. 원격 계정 탈취 시 permanent broad grant 가 되는 위험을 차단.
- **알 수 없는 code** (오타·만료·이미 응답됨) 는 조용히 무시. 잘못된 code 반복 시도로 인한 알림 폭탄 방지.
- **다른 채팅방에서 온 code** 는 무시 (rootSid 일치 검증).
- **TTL**: 코드는 24시간 후 자동 만료. OpenCode 세션이 TUI 로 먼저 응답한 경우에도 즉시 정리됨.
- **Workspace 외부 경로**: alert 본문에 `⚠️ Workspace 외부 경로` 로 강조 표시. 별도 verb 는 없으므로 반드시 alert 본문을 확인하고 승인.

> **v1.3.0 breaking change 안내**: 이전 문법 `#opencode allow <code>` 등은 더 이상 SDK 호출로 이어지지 않는다. `#opencode` keyword 는 기존대로 assistant 세션 주입 경로로 동작하므로, 옛 문법을 그대로 사용하면 assistant 에게 "allow pa7k9m" 라는 텍스트만 전달된다.

#### 지원 키워드

| 키워드 | 변형 예시 |
|---|---|
| `#agent` | `#Agent`, `#AGENT`, `＃agent` |
| `#ai` | `#AI`, `#Ai` |
| `#opencode` | `#OpenCode`, `#OPENCODE` |
| `#ask` | `#Ask`, `#ASK` |
| `#question` | `#Question` |
| `가재야` | — |
| `막둥아` | — |

키워드는 메시지 첫 줄 맨 앞에만 인식된다. 키워드 뒤의 본문만 세션에 전달되며, 키워드 원문은 노출되지 않는다.

#### 예시

| Teams 에서 보낸 메시지 | OpenCode 에 전달되는 내용 |
|---|---|
| `#ask 카산드라 compaction 전략 알려줘` | `카산드라 compaction 전략 알려줘` |
| `막둥아, 이 로그 좀 봐줘` | `이 로그 좀 봐줘` |
| `가재야!! 배포 상태?` | `배포 상태?` |
| `#AI\n다음 코드를 리뷰해줘` | `다음 코드를 리뷰해줘` |
| `그냥 잡담이야` | **전달 안 됨** |

### Teams 연동은 `/connect-teams` 스킬을 통해서만

플러그인은 **Lazy connect** 원칙을 따른다. OpenCode 가 시작되어 플러그인이 로드된 상태라도, `/connect-teams` 스킬을 명시적으로 호출하기 전까지는 어떠한 외부 통신(device flow · 채팅 폴링 · 응답 발신)도 발생하지 않는다.

연동을 활성화하는 경로는 다음 세 가지뿐이다:

1. `/connect-teams` 스킬 호출 (권장)
2. assistant 응답에 연동 marker(`<!-- microsoft-teams:connect-request v1 -->`) 포함
3. 사용자 입력이 `19:...` 형식의 chatId 로 시작 (implicit connect)

세션 간 연동 상태는 공유되지 않는다. 새 세션을 열거나 OpenCode 를 재시작하면 `/connect-teams` 를 다시 호출해야 한다.

---

## 동작 개요

- **Lazy connect**: 플러그인을 로드하고 `/connect-teams` 스킬을 명시적으로 호출한 이후에만 연동이 시작된다. 로드만 한 상태에서는 device flow · `/me/chats` fetch · 알림이 전혀 발생하지 않는다.
- 인증: device code flow 내장 — `/connect-teams` 호출 시 auth 상태 점검 시작, 안내는 스킬 응답 뒤에 append
- 채팅방 선택: `/connect-teams` 이후 세션마다 `/me/chats` 상위 10개를 응답에 append → 사용자가 chatId 붙여넣기
- 지속 세션 유지: 만료 5분 전 background timer 로 access token 을 self-scheduling 방식으로 refresh
- 답신 주입: 세션의 현재 **model/agent 를 자동 재사용**해 응답 일관성 유지
- **Interview Mode / Question / Permission 알림**: opencode core 가 사용자에게 무언가를 물으면 (질문·권한) Teams 로 대기 통지. 승인/응답은 opencode UI 에서 진행.
- 상태는 프로세스 메모리만 사용. OpenCode 재시작 시 대기 상태와 채팅방 선택 및 `connectRequested` 는 모두 소실 (재시작 시 다시 `/connect-teams` 필요)
- 폴링 백오프: 0–10분 → 5s, 10분–1시간 → 15s, 1시간+ → 30s
- 서브세션(Task tool 등 parent 로부터 spawn) 은 Teams 파이프라인에서 자동 제외
- oh-my-openagent v3.17.15 와 공존: 같은 event 를 병렬 관측하며, omo 의 hook / notification 채널과 간섭하지 않음 (omo 우선순위 존중)

## 설치

### npm 글로벌 설치 (권장)

공개 npm 패키지 [`opencode-ms-teams`](https://www.npmjs.com/package/opencode-ms-teams) 이다.
별도 registry 설정이나 인증이 필요 없다.

```bash
npm install -g opencode-ms-teams
opencode-ms-teams doctor   # 설치 상태 확인
```

- 요구 환경: opencode ≥ 1.4.17, Node ≥ 20
- 검증된 플랫폼: macOS, Ubuntu 24.04, Rocky Linux 9 (`npm run test:linux` 로 재현 가능)
  - Rocky/RHEL 계열의 기본 `nodejs` 는 16 이므로 `sudo dnf module enable nodejs:22` 후 설치할 것
- 글로벌 설치 시 `postinstall.mjs` 가 다음을 자동 수행한다:
  1. `$OPENCODE_CONFIG/opencode.json` 의 `plugin` 배열에 `"opencode-ms-teams"` 등록
     (기존 파일은 `.bak.<timestamp>` 로 백업)
  2. `~/.cache/opencode/packages/opencode-ms-teams@latest/node_modules/opencode-ms-teams`
     에 npm 글로벌 설치 위치로 심볼릭 링크 생성 → 방금 설치한 버전으로 고정
  3. `$OPENCODE_CONFIG/opencode-ms-teams/opencode-ms-teams.json` 스캐폴딩 (없는 경우에만)
  4. `$OPENCODE_CONFIG/skills/connect-teams/SKILL.md` 스킬 설치 (플러그인 로드 시)
- 이후 `$OPENCODE_CONFIG/opencode-ms-teams/opencode-ms-teams.json` 을 열어
  `azure.tenantId` / `clientId` / `scopes` 를 채운 뒤 OpenCode TUI 재시작

**왜 캐시 심볼릭 링크가 필요한가**: opencode 는 플러그인을 자체 npm 클라이언트로
registry 에서 받아 `~/.cache/opencode/packages/` 에 보관한다. 링크가 없으면 `npm ls -g` 는
새 버전을 보고하는데 opencode 는 캐시에 남은 옛 버전을 계속 로드할 수 있다.
이 장치는 `install-lib.mjs` 의 `linkToOpencodeCache()` 에 격리되어 있다.

### 로컬 개발/검증

publish 전 로컬 검증은 npm 설치본 대신 이 저장소를 opencode 캐시에
심볼릭 링크로 물려서 확인한다:

```bash
# 1) 빌드
npm run build

# 2) opencode 캐시 폴더에 이 저장소를 심볼릭 링크
CACHE_DIR="$HOME/.cache/opencode/packages/opencode-ms-teams@latest/node_modules"
mkdir -p "$CACHE_DIR"
ln -sfn "$(pwd)" "$CACHE_DIR/opencode-ms-teams"

# 3) opencode.json 에 등록
node bin/cli.mjs install

# 4) opencode 재시작
```

### 리눅스 배포본 검증

배포 대상에 Ubuntu·Rocky 가 포함되므로, tarball 을 실제로 글로벌 설치해 동작을 확인한다.
소스 트리가 아니라 `npm pack` 산출물을 컨테이너에 넣어 사용자와 같은 경로를 밟는다 (docker 필요).

```bash
npm run test:linux     # Ubuntu 24.04 + Rocky Linux 9
npm run test:ubuntu    # 한 배포판만
npm run test:rocky
```

검증 항목: 글로벌 설치·postinstall, CLI 실행 비트/shebang, `opencode.json` 등록,
캐시 심볼릭 링크와 스텁 `package.json`, ESM 로드와 단일 export 계약,
`doctor` 진단, `XDG_CONFIG_HOME` 준수, HOME 미설정 uid 에서의 메시지, `uninstall` 원복.

## CLI

```
opencode-ms-teams install [--force]   opencode.json plugin 배열에 등록 + 캐시 링크 + 설정 스캐폴딩
opencode-ms-teams uninstall           등록 해제 + 캐시 링크 제거 (설정 파일은 유지)
opencode-ms-teams doctor              설치 상태·config·캐시 링크·설정·토큰·로그 진단
opencode-ms-teams help
```

`doctor` 는 다음 체크를 순서대로 실행하며 실패 항목이 있으면 exit code 1:

| 체크 | 의미 |
|---|---|
| `config-readable` | `$OPENCODE_CONFIG/opencode.json` 파싱 가능 |
| `plugin-registered` | 위 파일의 `plugin` 배열에 `opencode-ms-teams` 등록됨 |
| `cache-link` | opencode 캐시 심볼릭 링크 존재 |
| `settings-present` | `opencode-ms-teams.json` 존재 (없으면 최초 로드 시 자동 생성) |
| `tokens-present` | `tokens.json` 존재 (없으면 첫 응답 시 device flow 로 발급) |
| `log-present` | 로그 파일 존재 (`log.enabled=false` 상태에서는 미생성 정상) |

## 설정 파일

**단일 설정 소스**: `$OPENCODE_CONFIG/opencode-ms-teams/opencode-ms-teams.json`.
파일이 없으면 `opencode-ms-teams install` 또는 플러그인 최초 로드 시 default 값으로 자동 생성된다.
환경변수 오버라이드는 지원하지 않는다 (모든 설정은 파일에서 관리).

### 스키마

```jsonc
{
  "azure": {
    "tenantId": "",
    "clientId": "",
    "scopes": ""
  },
  "polling": {
    "intervalMs": 5000,
    "backoff1Ms": 600000,
    "backoff2Ms": 3600000
  },
  "log": {
    "file": "$OPENCODE_CONFIG/opencode-ms-teams/opencode-ms-teams.log",
    "enabled": false
  },
  "tokens": {
    "file": "$OPENCODE_CONFIG/opencode-ms-teams/tokens.json"
  }
}
```

| 섹션 | 필드 | 설명 |
|---|---|---|
| `azure` | `tenantId`, `clientId`, `scopes` | Azure AD 앱 설정. 최초 생성 시 빈 문자열로 초기화되며 **사용자가 반드시 채워야 한다**. `scopes` 에는 `offline_access` 를 반드시 포함 (refresh token 발급용) |
| `polling` | `intervalMs`, `backoff1Ms`, `backoff2Ms` | 기본 폴링 주기 및 백오프 임계값 (밀리초) |
| `log` | `file`, `enabled` | 로그 파일 경로 및 활성 여부. `enabled=false` (기본) 이면 파일 자체를 생성하지 않는다 |
| `tokens` | `file` | 토큰 저장 경로 (파일은 0600 권한으로 자동 저장) |

- `~` 는 홈디렉토리로 확장됨
- 로그 파일은 `enabled=true` 상태에서 플러그인 로드 시 **truncate 후 append** 모드로 열림 (프로세스 재시작마다 새 로그)
- **채팅 ID 는 config 에 저장되지 않는다** — 세션마다 사용자가 직접 선택 (아래 "채팅방 선택" 섹션 참고)
- Azure 값을 하드코딩 default 로 두지 않는 이유: 잘못된 tenant 로 device flow 를 시도하면 Azure 측 에러 메시지가 애매해져 원인 추적이 어렵다. 명시적 실패 → 사용자 안내 흐름을 채택.

Azure AD 앱 등록/권한 신청은 조직의 Azure 관리자 안내를 따른다.
플러그인에는 최소한 다음 delegated scope 가 필요하다:
`Chat.Create Chat.Read Chat.ReadBasic Chat.ReadWrite ChatMessage.Read ChatMessage.Send offline_access User.Read`

## 채팅방 선택 (세션별)

이 플러그인은 세션마다 사용할 Microsoft Teams 채팅방을 사용자에게 직접 선택받는다.
채팅 ID 는 config 파일에 저장하지 않고 **프로세스 메모리** 에만 보관 (세션 종료/OpenCode 재시작 시 재선택 필요).

### 흐름 (auth 안내와 동일한 append 방식)

1. 사용자가 `/connect-teams` 스킬 호출 → assistant 가 `CONNECT_TRIGGER_MARKER` + 안내 문구 출력 → 플러그인이 이를 감지하여 `activateConnect()` 실행 (auth.bootstrap + `GET /me/chats?$top=10`, 1800ms bounded wait)
2. 같은 응답 하단에 device code 안내 (미로그인) 또는 **채팅방 선택 안내** 가 append 됨
3. `experimental.text.complete` 훅이 assistant 응답 끝에 **채팅방 선택 안내** 를 append.
   각 항목은 `chatId` + `채팅방 이름` + `최근 활동 날짜` 를 blockquote 로 표시:

   ```
   ---
   > 🔗 Microsoft Teams 채팅방 선택 필요
   >
   > 이 세션에서 사용할 채팅방의 chatId 를 다음 프롬프트에 입력해 주세요.
   > (아래 목록에서 원하는 채팅의 19:... 문자열을 그대로 복사·붙여넣기)
   >
   > 1. Alice - 안녕 · 2026-08-01 10:23
   >    `19:xxxxxxxxxxxx@thread.v2`
   >
   > 2. Bob - 프로젝트 · 2026-07-20 05:00
   >    `19:yyyyyyyyyyyy@thread.v2`
   > …
   ```
4. 사용자가 다음 프롬프트에 **chatId 를 그대로 붙여넣어 전송** (prefix 없음).
   목록에 없는 chatId 도 직접 입력 가능 (`19:...@thread.v2` 또는 `19:...@unq.gbl.spaces` 패턴이면 감지)
5. `chat.message` 훅이 chatId 를 감지 → 세션 상태에 저장 → **우측 상단 toast** (`Microsoft Teams 채팅방 연동 완료: {이름}`) 표시 → 사용자 메시지의 chatId 부분은 LLM 이 혼동하지 않도록 안내 문구로 치환
6. 다음 idle 부터 정상적으로 Teams 발신 시작

### 세부 규칙

- 선택된 채팅은 **해당 세션 동안만 유효** — 다른 세션에서는 다시 목록이 뜨고 다시 선택해야 한다
- 이미 확정된 세션에서 chatId 를 다시 입력해도 무시됨 (세션당 채팅 1개 고정)
- 선택되지 않은 세션의 응답은 Teams 로 발신되지 않음 (로그: `skip.nochat`)
- chatId 패턴이 없는 일반 프롬프트는 chat.message 훅이 그대로 통과
- Group chat (`19:xxx@thread.v2`) 과 1:1 chat (`19:xxx@unq.gbl.spaces`) 모두 지원
- **Sub session (Task tool 등 parent 로부터 spawn 된 세션) 은 안내가 뜨지 않는다** — parent 만 Teams 로 발신하므로 sub session 의 `experimental.text.complete` / `chat.message` 훅은 채팅방 선택 안내와 chatId 파싱을 모두 skip 한다. `sessionParent` 캐시로 반복 API 호출 방지.

### `connect-teams` 스킬 (연동 활성화 진입점)

플러그인 로드 시 `$OPENCODE_CONFIG/skills/connect-teams/SKILL.md` 가 자동 설치된다.
사용자가 opencode 세션에서 `/connect-teams` 를 호출하면 assistant 가 두 줄을 응답 최상단에 출력한다:

```
<!-- microsoft-teams:connect-request v1 -->
**Microsoft Teams 연동을 시작합니다.**
```

플러그인은 `experimental.text.complete` 훅에서 첫 줄의 HTML 주석 marker 를 감지하여 lazy connect 를 활성화하고, 같은 응답 하단에 auth 안내 또는 채팅방 선택 안내를 append 한다.
스킬 파일에는 버전 마커가 포함되어 있어 (`<!-- skill-version: N -->`) 플러그인이 새 버전을 배포하면 자동으로 덮어쓴다.

**감지 경로 3종** (defense-in-depth):
1. assistant 응답에 `CONNECT_TRIGGER_MARKER` (HTML 주석) 포함
2. assistant 응답에 `"**Microsoft Teams 연동을 시작합니다.**"` 문구 포함 (모델이 marker 를 누락한 경우 대비)
3. 사용자 입력 첫 줄이 `/connect-teams` slash 로 시작 (스킬 실행 여부와 무관하게 즉시 activate)

또한 사용자가 처음부터 `19:...` 형식 chatId 를 붙여넣으면 **implicit connect** 로 취급하여 activate.

## 인증 흐름

`/connect-teams` 스킬 호출 이후에만 `auth.bootstrap()` 이 실행된다 (lazy).
저장된 토큰이 없거나 refresh 가 실패하면 device code flow 를 선제적으로 시작한다.

로그인 안내는 **스킬 호출 응답의 마지막에 자연스럽게 append** 된다.
별도의 시스템 메시지나 프롬프트가 세션에 삽입되지 않으므로 대화 흐름이 깨지지 않는다.

예시 (사용자가 "hello" 입력 시):

```
안녕하세요! 무엇을 도와드릴까요?

---

> 🔐 **Microsoft Teams 로그인 필요**
>
> 1. 브라우저에서 https://microsoft.com/devicelogin 를 여세요
> 2. 코드 `USERCODE1` 를 입력
> 3. 회사 계정으로 로그인 완료 시 다음 응답에 완료 알림이 표시됩니다
```

로그인 완료 시 다음 응답 하나에만 `✅ Microsoft Teams 로그인 완료` 안내가 붙는다.

Microsoft Teams 로 발신되는 응답에는 이 auth 안내가 포함되지 않는다 —
`stripAuthNotice()` 가 auth notice / chat-select marker 이후 텍스트를 제거하여 원본 assistant 응답만 발신된다.

## 지속 토큰 refresh

Access token 은 만료 5분 전 시점에 background timer 로 자동 refresh 된다.
- refresh 성공 → 새 만료 시점의 5분 전에 다시 self-scheduling 예약
- refresh 실패 (네트워크 등) → 30초 후 재시도
- `invalid_grant` → device code flow 로 자동 전환

이 덕분에 Microsoft Teams 응답 대기가 오래 지속되어도 access token 이 만료되어 재로그인이
유발되는 현상이 해소된다. Plugin dispose 시 예약된 timer 는 자동 취소된다.

## 답신 주입 model/agent 재사용

Microsoft Teams 답신을 세션에 재주입할 때, **직전 assistant 메시지의 model/mode 를 캡처하여
`promptAsync` body 에 `model` 과 `agent` 로 전달**한다. 세션에서 사용 중인 LLM 과
agent 가 그대로 유지되므로 답신 처리에 다른 모델이 끼어들지 않는다.

- 우선 순위: `AssistantMessage.modelID/providerID/mode` (실제 응답에 쓰인 값)
- 폴백: 마지막 `UserMessage.agent` (사용자가 명시 선택한 agent)
- 두 정보 모두 없으면 body 에서 필드를 생략 → opencode 기본값 사용

세션 busy 중 도착한 답신도 유실되지 않고 다음 idle 때 순서대로 주입된다 (커서 미전진 + fingerprint 가드).
25KB 초과 응답은 자동으로 절단되고 `…(생략)` 이 붙는다.

## 키워드 트리거 게이트

Teams 답신 중 **선두에 지정 키워드가 붙은 메시지만** 세션에 주입된다. 잡담·비지시 메시지가 세션에 무분별하게 흘러들어오는 것을 방지한다.

### 키워드 목록

| 정규 키워드 | 흡수되는 표기 |
|---|---|
| `#agent` | `#Agent`, `#AGENT`, `＃agent` (전각 `#` NFKC 흡수) |
| `#ai` | `#AI`, `#Ai`, `＃ai` |
| `#opencode` | `#OpenCode`, `#OPENCODE` |
| `#ask` | `#Ask`, `#ASK` |
| `#question` | `#Question` |
| `가재야` | — |
| `막둥아` | — |

- 매칭은 **정규화된 메시지의 offset 0** 에서만 수행. 두 번째 줄 이후 키워드는 무시.
- 키워드 직후에는 **후행 경계**(공백/개행/`,.!?~:;`/유니코드 문장부호/EOS) 가 필요. 예: `막둥아니야`, `#asking` 은 미탐지.
- 키워드 + 연속 후행 구분자를 소비한 뒤 나머지 본문만 `payload` 로 세션에 주입 (키워드 원문은 세션에 노출되지 않음).
- 정규화 단계: 제어문자 제거 → NFKC → CRLF 통일 → NBSP/전각공백을 공백으로 → trim.
- 미매칭 답신은 세션에 주입되지 않고 폴링 로그에만 `trigger.skip.nomatch` 로 기록된다 (`log.enabled=true` 시).

### 예시

| Teams 답신 | 결과 |
|---|---|
| `#ask 카산드라 compaction 전략 알려줘` | 세션 payload = `카산드라 compaction 전략 알려줘` |
| `막둥아, 이 로그 좀 봐줘` | payload = `이 로그 좀 봐줘` |
| `가재야!! 배포 상태?` | payload = `배포 상태?` |
| `#AI\n다음 코드를 리뷰해줘` | payload = `다음 코드를 리뷰해줘` |
| `그냥 잡담이야` | **주입 안 됨** |
| `#agent` (단독) | 매칭되지만 payload 가 비어 주입 안 됨 |
| `#ask #agent 질문` | payload = `#agent 질문` (재스캔 없음) |

## Microsoft Teams 렌더링 규칙

- **표** (`| col | col |` + `|---|---|`) → `<table>` + `<thead>`/`<tbody>` + `<th>`/`<td>`.
  구분자 `:---` / `---:` / `:---:` 로 좌/우/중앙 정렬 지원.
- **코드 블록** (```` ``` ````) → `<pre style="font-family:...; background:#f4f4f4; padding:8px; border-left:3px solid #ccc"><code>...</code></pre>`.
  Microsoft Teams 는 `white-space:pre` 만 붙은 `<div>` 내부의 개행을 collapsed 시키는 관찰 결과로, 표준 `<pre><code>` 요소로 회귀.
  Line number 회피를 위해 **`class="language-*"` 는 부착하지 않는다** (syntax highlight 를 요청하지 않으면 Teams 는 line number 도 붙이지 않음).
- **인라인 코드** → `<span style="font-family:...; background:#f4f4f4; padding:1px 4px; border-radius:3px">`.
- **볼드** (`**text**`) → `<b>`.
- **HTML 특수문자** 는 항상 이스케이프.

## 릴리스

```bash
npm run release:patch   # 0.6.1 → 0.6.2
npm run release:minor   # 0.6.1 → 0.7.0
npm run release:major   # 0.6.1 → 1.0.0
```

`scripts/release.sh` 가 다음을 자동화:
1. Pre-flight 체크 (git 상태, 브랜치, 원격 동기화, npm 로그인)
2. `bun test` + `tsc --noEmit` + `npm run build` + 리눅스 배포본 검증 (선택적 게이트)
3. **승인 게이트 #1** (버전 bump 확인)
4. `npm version <bump>` (커밋 + 태그)
5. `npm publish --dry-run` 검증
6. **승인 게이트 #2** (공개 npm 배포 확인, 돌이킬 수 없음)
7. `npm publish` → 공개 npm registry (registry.npmjs.org)
8. `git push --follow-tags`

**리눅스 검증 게이트 (STEP 2)**: docker 를 쓸 수 있으면 `scripts/test-linux.sh` 로
Ubuntu·Rocky 배포본 검증을 자동 수행한다. docker 가 없거나 데몬을 띄울 수단이 없으면
경고만 남기고 통과하며, 이 경우 승인 게이트 #2 에서 "미검증 상태" 를 다시 알린다.
반대로 docker 가 있는데 검증이 실패하면 릴리스를 중단한다.
`MS_TEAMS_SKIP_LINUX_TEST=1` 로 명시적으로 건너뛸 수 있다.

`--yes` 옵션은 CI 전용이며 대화형 세션에서는 사용 금지.
