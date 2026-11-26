# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어** · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md)

> 이 문서는 번역본입니다. 기준 문서는 [영어 README](../../README.md)이며, 내용이 서로 다르면 영어 문서가 옳습니다.

하나의 [opencode](https://opencode.ai) 세션에 속한 서브에이전트끼리 직접 주고받는 메시지입니다. 덕분에 리드 에이전트가 모든 정보를 한 서브에이전트에서 다음 서브에이전트로 일일이 전달하지 않아도 됩니다.

![두 개의 백그라운드 서브에이전트: coder가 crew_send로 메시지를 보내고, researcher는 다음 단계에서 그것을 읽으며, 리드도 알림을 받습니다](../media/demo.gif)

*격리된 `opencode serve`에서 실제 플러그인을 대상으로 스크립트로 실행한 모습입니다.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

동시에 작업하는 두 서브에이전트는 서로에게서 사실 하나가 필요한 경우가 많습니다. 한쪽이 방금 만든 인터페이스의 이름, 다른 쪽이 건드리면 안 되는 파일, 상대의 다음 단계를 바꾸는 발견 같은 것들입니다. 이 플러그인이 없으면 그 사실은 보고서에 담기고, 리드가 그것을 읽은 뒤 그 내용을 가지고 다른 서브에이전트를 시작하거나 이어서 실행합니다. 느리고, 리드의 컨텍스트도 채워집니다. 이 플러그인이 있으면 coder가 tester에게 직접 알려 줍니다.

## 추가되는 기능

세션 트리의 모든 에이전트가 쓸 수 있는 도구 두 개:

| 도구 | 하는 일 |
|---|---|
| `crew_list` | 팀 목록을 보여 줍니다: 리드와 리드가 시작한 서브에이전트, 각각의 짧은 이름(`coder`, `coder-2`, `tester`...), 맡은 작업, 아직 실행 중인지 여부. |
| `crew_send` | `{ to, text }`: 한 멤버(`to` = 짧은 이름, 세션 id, `lead`)의 받은편지함, 또는 팀에서 실행 중인 모든 서브에이전트(`to` = `all`)의 받은편지함에 메시지를 넣습니다. |

받는 쪽은 **다음 단계**에서 메시지를 합성 메시지(synthetic message)로 받습니다. 실행 중인 에이전트는 절대 중단되지 않고, 아무도 답을 기다리지 않으므로 두 에이전트가 서로를 막을 수 없습니다. 메시지는 감싸서 전달되므로, 모델은 누가 썼는지, 그리고 그것이 사용자가 아니라 다른 에이전트에게서 왔다는 것을 알 수 있습니다:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

규칙:

- **끝난** 서브에이전트는 메시지를 받지 않습니다. 메시지가 그 에이전트를 다시 시작시키고, 보고서를 리드에게 한 번 더 보내게 되기 때문입니다. 보내는 쪽에는 `lead`에게 쓰거나 자신의 보고서에 넣으라는 안내가 돌아갑니다.
- **유휴 상태**인 리드(예: 백그라운드 서브에이전트를 기다리는 중)에게 보낸 메시지는 받은편지함에서 기다렸다가, 리드가 다음에 실행될 때 읽힙니다. 보통 다음 보고서가 리드를 깨울 때입니다. 바로 시작시키려면 `wakeLead`를 설정하세요.
- 메시지는 하나의 트리 안에서만 오갑니다: 리드와 그 직속 서브에이전트. 같은 컴퓨터의 다른 세션에는 닿을 수 없습니다.

## 설치

opencode의 플러그인 관리자로 설치합니다(npm에서, 또는 GitHub에서 바로):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

또는 직접 설치: `crew-mail.js`를 opencode 설정의 플러그인 폴더에 복사하고 opencode를 다시 시작합니다.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

그런 다음 에이전트들에게 이 기능을 알려 주세요. 모든 서브에이전트는 이미 도구 설명을 보고 있지만, 리드의 프롬프트에 한 줄을 넣어 두면 리드가 서브에이전트에게 작업을 지시할 때 도움이 됩니다. 예를 들면:

> 동시에 실행되는 서브에이전트는 `crew_send`로 서로에게 메시지를 쓸 수 있습니다(`crew_list` 참고). 작업 지시에서 어떤 다른 서브에이전트가 동시에 어떤 작업을 하는지 알려 주세요.

이 도구는 동시에 실행되는 서브에이전트와 함께 쓸 때 가장 유용합니다: 한 메시지 안의 여러 `subagent` 호출, 또는 백그라운드 서브에이전트(`background: true`).

사용 중인 다른 플러그인이 알 수 없는 도구를 거부한다면(허용 목록), 거기에 `crew_list`와 `crew_send`를 추가하세요. [opencode-win-guard](https://github.com/retretor/opencode-win-guard)의 경우 `extraTools` 설정이 그것입니다. 특정 에이전트가 이 도구를 쓰지 못하게 하려면 그 에이전트 파일에서 일반적인 권한 설정(예: `{ action: crew_send, resource: "*", effect: deny }`)을 사용하거나, 아래의 `agents` 설정을 사용하세요.

## 설정

`opencode.json` 옆에 두는 선택 파일 `crew-mail.json`([crew-mail.example.json](../../crew-mail.example.json) 참고). 플러그인이 로드될 때 읽힙니다.

| 키 | 기본값 | 의미 |
|---|---|---|
| `maxChars` | 4000 | 메시지의 최대 길이. 더 긴 메시지는 거부되며, 파일로 써서 그 경로를 보내라는 힌트가 함께 돌아갑니다. |
| `maxPerSession` | 40 | 한 세션이 보낼 수 있는 메시지의 총 개수. |
| `maxPerPair` | 6 | `pairWindowMinutes` 동안 두 세션 사이에 오갈 수 있는 메시지 수(양방향 합계). 핑퐁을 막습니다. |
| `pairWindowMinutes` | 10 | `maxPerPair`의 시간 창(분). |
| `wakeLead` | false | `true`: 유휴 상태인 리드에게 메시지가 오면 리드를 시작시킵니다. |
| `copyToLead` | false | `true`: 서브에이전트 사이의 모든 메시지에 대한 한 줄 사본을 리드가 받습니다(리드의 컨텍스트를 소모합니다). |
| `agents` | null | `null`: 모든 에이전트가 도구를 쓸 수 있습니다. 또는 에이전트 이름 목록. |
| `logText` | true | `false`: 로그에 보낸 쪽, 받는 쪽, 길이만 남깁니다. |

모든 메시지와 모든 거부는 `<data dir>/opencode/log/crew-mail.log`(기본값은 `~/.local/share/opencode/log/`)에 JSON 한 줄로 기록됩니다. 플러그인은 네트워크 연결을 전혀 하지 않습니다.

## 안전

- 메시지는 모델의 출력입니다. 악의적인 것(웹 페이지, 파일)을 읽은 에이전트는 다른 에이전트에게 지시를 전달할 수 있습니다. 봉투는 받는 쪽에게 이 메시지가 사용자에게서 온 것이 아니며 작업을 바꾸지 않는다고 알려 주지만, 이는 모델에게 주는 힌트일 뿐 장벽이 아닙니다. 다른 보호 장치(권한, 샌드박스)는 리드뿐 아니라 모든 에이전트에 유지하세요.
- `copyToLead`가 켜져 있지 않으면 리드는 서브에이전트 사이의 메시지를 보지 못합니다. 로그에는 남습니다. 어쨌든 에이전트에게는 중요한 내용을 보고서에 넣으라고 안내합니다.

## 호환성

- opencode 2.2 이상(V2 플러그인 API: `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Windows 10, Node 24에서 opencode 2.2.3으로 테스트했습니다.
- 의존성도, 빌드 단계도 없습니다. `crew-mail.js`의 기본 내보내기(default export)만 플러그인입니다.

## 테스트

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

엔드투엔드 테스트는 임시 폴더에서 스크립트로 동작하는 가짜 모델(프로바이더, 계정, 네트워크 불필요)과 함께 실제 `opencode serve`를 시작하고, 실행 중인 서브에이전트가 형제 에이전트의 메시지를 다음 단계에서 읽는지, 끝난 서브에이전트가 깨어나지 않는지, 리드가 다음 실행 때 메시지를 받는지 확인합니다. 사용자의 opencode 설정과 세션은 건드리지 않습니다. Windows PowerShell에서는 `$env:CREW_MAIL_E2E = "1"`로 변수를 설정하세요.

## 관련 프로젝트

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): 같은 작성자가 만든, Windows에서 무인으로 작업하는 에이전트를 위한 쓰기 샌드박스와 비상 정지 기능. 이 플러그인과 함께 동작합니다.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): 리드에서 실행 중인 서브에이전트로 가는 제어 채널(메시지, 상태, 중단)과 서브에이전트가 호출자에게 보내는 질문. 서브에이전트끼리는 서로 메시지를 쓸 수 없습니다.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): 다른 폴더에서 실행되며 호출자에게 결과를 보고하는 서브에이전트.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): opencode 자체를 수정하는 방식으로 구현한 "팀원" 사이의 피어 메시징. task 도구로 시작한 서브에이전트는 제외됩니다.

## 기여

버그 보고, 아이디어, 풀 리퀘스트를 환영합니다: [CONTRIBUTING.md](../../CONTRIBUTING.md)를 참고하세요. 보안 문제: [SECURITY.md](../../SECURITY.md).

## 라이선스

[MIT](../../LICENSE)
