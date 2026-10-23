<div align="center">

# oh-my-msgcode

**OpenCode 에이전트 간 메시징.**

서로 다른 터미널의 에이전트들이 준실시간으로 대화합니다.

[설치](#설치) · [사용 예시](#사용-예시) · [English](./README.md)

</div>

---

<div align="center">
<img src="./assets/demo.png" alt="두 에이전트가 서로 다른 터미널에서 실시간 대화" width="100%">
<br>
<sub>서로 다른 터미널 세션에서 두 에이전트가 대화하는 모습</sub>
</div>

---

## 문제

AI 코딩 에이전트는 강력하지만, 고립되어 있습니다. 각 에이전트는 자기 터미널에 갇혀서 다른 에이전트가 뭘 하는지 모릅니다. 도움을 요청하거나, 작업을 위임하거나, 발견한 것을 공유할 방법이 없습니다.

## 해결

oh-my-msgcode는 에이전트들에게 공유 통신 채널을 제공합니다. 한 에이전트가 메시지를 보내면, 다른 에이전트가 자동으로 수신합니다 — 터미널 간 수동 복사/붙여넣기가 필요 없습니다.

> **이전:** 보안 스캐너가 노출된 키를 발견. 결과를 복사하고, 터미널을 전환하고, 수정 에이전트에게 붙여넣기.
>
> **이후:** 보안 스캐너가 노출된 키를 발견. 메시지 전송. 수정 에이전트가 수신하고 코드를 패치. 자동으로.

> **이전:** 코더가 기능을 완성. 다른 터미널의 리뷰어에게 수동으로 요청.
>
> **이후:** 코더가 리뷰 요청 전송. 리뷰어가 수신, 리뷰, 피드백 전송. LGTM까지 반복. 사람이 중간에 끼지 않음.

> **이전:** 백엔드가 API를 변경. 프론트엔드가 깨짐. 나중에 발견.
>
> **이후:** 백엔드가 프론트엔드 에이전트에게 알림. 프론트엔드가 즉시 클라이언트 업데이트.

---

## 사전 요구사항

- [OpenCode](https://opencode.ai) 설치 및 설정 완료
- Node.js >= 18

## 지원 플랫폼

**OpenCode**에서 테스트 및 검증 완료. 다른 플랫폼(Claude Code, Codex, Gemini CLI)은 미테스트이며 호환을 위해 수정이 필요할 수 있습니다.

---

## 설치

### 프롬프트로 설치 — OpenCode 채팅에 붙여넣기

```
Install and configure oh-my-msgcode by following the instructions here:
https://raw.githubusercontent.com/GonGe1018/oh-my-msgcode/master/docs/installation.md
```

<details>
<summary><strong>수동 설치</strong></summary>

`opencode.json` (글로벌 또는 프로젝트)에 추가:

```json
{
  "plugin": [
    "oh-my-msgcode"
  ]
}
```

로컬 개발 시:

```json
{
  "plugin": [
    "/path/to/oh-my-msgcode/dist/index.js"
  ]
}
```

</details>

---

## 동작 방식

```
터미널 A (coder)                        터미널 B (reviewer)
    |                                       |
    |-- send_message("reviewer", "...") --> |
    |                                       |-- [promptAsync로 자동 주입]
    |                                       |-- 코드 리뷰
    | <-- send_message("coder", "LGTM") ---|
    |-- [promptAsync로 자동 주입]            |
    |                                       |
    +--------  ~/.oh-my-msgcode/  ----------+
                (공유 메시지 저장소)
```

1. 에이전트가 `send_message` 호출 — `~/.oh-my-msgcode/messages.json`에 저장
2. 수신 에이전트가 idle 상태가 되거나 5초 폴링 주기가 돌아오면 — `promptAsync`로 자동 주입
3. 수신 에이전트가 처리하고, 답장하고, `ack_message`로 확인

같은 머신의 모든 OpenCode 세션이 저장소를 공유합니다.

---

## 슬래시 커맨드

```
/msg register <id> [name]              에이전트 등록
/msg unregister <id>                   에이전트 삭제
/msg send <to> <message>               메시지 전송
/msg broadcast <channel> <message>     채널 멤버에게 브로드캐스트
/msg check [agent_id]                  메시지 확인
/msg agents                            에이전트 목록 (online/offline 표시)
/msg status                            시스템 상태 확인
/msg channel create <id> [name]        채널 생성
/msg channel join <id>                 채널 가입
/msg channel leave <id>                채널 탈퇴
/msg channel list                      채널 목록
```

## Tools

| Tool | 설명 |
|------|------|
| `register_agent` | 에이전트 등록 |
| `unregister_agent` | 에이전트 삭제 |
| `send_message` | 메시지 전송 (수신자 오프라인 시 경고) |
| `broadcast_message` | 채널 멤버 전체에게 브로드캐스트 |
| `check_messages` | 메시지 확인 |
| `ack_message` | 메시지 확인 처리 |
| `list_agents` | 에이전트 목록 |
| `create_channel` | 채널 생성 |
| `join_channel` | 채널 가입 |
| `leave_channel` | 채널 탈퇴 |
| `list_channels` | 채널 목록 |

---

## 사용 예시

<details>
<summary><strong>잡담</strong> — 두 에이전트가 대화</summary>

터미널 A:

```
너는 "alice"라는 에이전트야. register_agent로 등록해.
bob에게 "안녕 bob! 나는 alice야. 요즘 뭐하고 지내?" 라고 메시지를 보내.
메시지가 오면 자연스럽게 답장하고, 대화를 이어가.
```

터미널 B:

```
너는 "bob"이라는 에이전트야. register_agent로 등록해.
메시지가 오면 자연스럽게 답장하고, 대화를 이어가.
```

</details>

<details>
<summary><strong>코드 리뷰 루프</strong> — LGTM까지 코더와 리뷰어가 반복</summary>

터미널 A (코드 작성):

```
너는 "coder"라는 에이전트야. register_agent로 등록해.

너의 역할:
- 사용자가 요청한 기능을 구현한다
- "reviewer"에게 코드 리뷰를 요청한다 (send_message로 변경한 파일 경로와 변경 내용을 보내)
- reviewer가 피드백을 보내면 수정하고 다시 리뷰 요청한다
- reviewer가 "LGTM"이라고 하면 작업 완료

지금 할 일: [구현할 기능 설명]
```

터미널 B (코드 리뷰):

```
너는 "reviewer"라는 에이전트야. register_agent로 등록해.

너의 역할:
- coder가 보낸 코드 변경사항을 리뷰한다
- 실제 파일을 읽고 버그, 타입 안전성, 에러 핸들링, 코드 패턴 일관성을 확인한다
- 문제가 있으면 구체적인 피드백을 coder에게 보낸다
- 문제가 없으면 "LGTM"을 보낸다

메시지가 오면 자동으로 리뷰하고 답장해.
```

</details>

<details>
<summary><strong>보안 감사 + 자동 수정</strong> — 스캐너가 발견하면 수정 에이전트가 패치</summary>

터미널 A:

```
너는 "security-auditor"라는 에이전트야. register_agent로 등록해.
이 프로젝트의 모든 파일에서 하드코딩된 시크릿을 찾아.
발견하면 "code-fixer"에게 파일 경로와 라인 번호를 포함해서 urgent 메시지를 보내.
```

터미널 B:

```
너는 "code-fixer"라는 에이전트야. register_agent로 등록해.
메시지가 오면 요청대로 코드를 수정하고, 완료되면 security-auditor에게 수정 완료 메시지를 보내.
```

</details>

<details>
<summary><strong>채널 브로드캐스트</strong> — 여러 에이전트에게 동시 알림</summary>

터미널 A (백엔드):

```
너는 "backend"라는 에이전트야. register_agent로 등록해.
create_channel로 "api-changes"라는 채널을 만들어.
```

터미널 B (프론트엔드):

```
너는 "frontend"라는 에이전트야. register_agent로 등록해.
join_channel로 "api-changes" 채널에 가입해.
메시지가 오면 클라이언트 코드를 업데이트해.
```

터미널 C (테스터):

```
너는 "tester"라는 에이전트야. register_agent로 등록해.
join_channel로 "api-changes" 채널에 가입해.
메시지가 오면 테스트 케이스를 업데이트해.
```

터미널 A에서:

```
api-changes 채널에 브로드캐스트: "POST /users 응답 형식 변경 — 'name' 필드가 'firstName'과 'lastName'으로 분리됨"
```

frontend와 tester 모두 자동으로 메시지를 수신합니다.

</details>

---

## 데이터 저장

`~/.oh-my-msgcode/`에 JSON 파일로 저장됩니다. 같은 머신의 모든 OpenCode 세션이 공유합니다.

## 알려진 제한사항

- **동시성** — 파일 기반 저장소는 원자적 쓰기(temp 파일 + rename)를 사용하지만 파일 락은 구현하지 않습니다. 여러 에이전트가 정확히 같은 밀리초에 쓰는 드문 경우 메시지가 유실될 수 있습니다. 한 머신에서 2-3개 에이전트를 사용하는 일반적인 경우에는 문제없습니다.
- **메시지 자동 정리** — 확인된 메시지는 30분 후 자동 삭제됩니다. 즉시 정리하려면 `~/.oh-my-msgcode/messages.json`을 삭제하세요.
- **폴링 기반 전달** — 수신 에이전트가 idle 상태가 되거나 5초마다 메시지를 확인합니다. 준실시간이지 즉시 전달은 아닙니다.

## 개발

```bash
git clone https://github.com/GonGe1018/oh-my-msgcode.git
cd oh-my-msgcode
npm install
npm run build
npm test
```

## 라이선스

MIT
