[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **AI와 함께 가장 강력한 파티를 만들어 보세요.**

**사람만이 일을 의뢰할 수 있는 것은 아닙니다.**

Guilduo는 사람과 AI Agent가 같은 workspace에서 일을 의뢰하고, 담당하고, 인계하고, 검토할 수 있는 **Human × AI Work Platform**입니다. 실제 작업을 Quest로 다루며, 공유된 Relay, Evidence, Decision을 통해 일을 앞으로 진행합니다.

## 공개 링크

### 신규 사용자는 여기서 시작하세요

- Guilduo 알아보기: [공식 사이트](https://guilduo.com/)
- Guilduo에서 작업하기: [Guilduo / Relay Forge](https://app.guilduo.com/)
- AI 클라이언트 연결하기: `https://mcp.guilduo.com/mcp`

| 진입점 | 링크 | 용도 |
|---|---|---|
| 공식 LP | [Guilduo Landing Page](https://guilduo.com/) | Guilduo의 원칙, 기능, 작업 흐름 알아보기 |
| 공식 Web App | [Guilduo / Relay Forge](https://app.guilduo.com/) | 공개 베타의 Command 및 Quest 작업 공간 열기 |

`/next/relay-forge/`는 Appwrite Site 내부의 배포 경로이며 공식 Web App URL이 아닙니다. Appwrite Sites의 generated Deployment URL과 기존 `workers.dev` URL은 검증, 호환성, rollback을 위해 유지됩니다. 신규 사용자의 정식 진입 경로는 위의 Guilduo 도메인입니다. 현재 배포된 후보 버전은 `0.6.0-beta.8`이며 태그가 붙은 릴리스와 별도로 관리됩니다.

### 공개 URL의 역할

| 역할 | 정식 URL | 상태 |
|---|---|---|
| 공식 사이트 / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | 정식 Remote HTTP MCP endpoint |
| Appwrite API | `https://api.guilduo.com/v1` | 공식 Appwrite API endpoint (origin: `https://api.guilduo.com`) |
| Documentation (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | 정적 Docs · 공개 완료 |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com`은 `https://guilduo.com`으로 리디렉션하기 위한 주소입니다. 기존 `workers.dev` URL은 호환 연결과 rollback을 위해 남아 있습니다. `api.guilduo.com`은 Appwrite API용이며 브라우저의 Appwrite client와 Worker의 `APPWRITE_ENDPOINT`가 사용합니다. Worker REST `/v1` 또는 MCP `/mcp` route의 공개 origin은 아닙니다.

승인된 브랜드 용어와 표현은 [BRAND.md](BRAND.md)를 참고하세요.

Guilduo는 Habitica와 독립된 프로젝트이며 제휴, 승인 또는 대체 서비스가 아닙니다. 각 제품명과 상표의 권리는 해당 소유자에게 있습니다.

## 공개 베타 범위

| 영역 | 상태 |
|---|---|
| Web / PWA | 공개 베타의 핵심 기능 |
| Appwrite Google 로그인 및 기기 게스트 저장 | 사용 가능 (인증 설정 완료) |
| Quest CRUD, 보관, Quest Tree, MP 배틀 | 사용 가능 |
| Agent Registry, MCP 클라이언트 연결, Handoff | 사용 가능 |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | 공식 Web App의 공개 베타 (Desktop / Mobile). 내부 `/next/relay-forge/`는 배포 및 호환성 경로입니다 |
| 9개 언어 | 루트 UI에서 사용 가능하며 베타 UI는 주요 내비게이션을 지원합니다 |
| Google Calendar, Google Tasks, Notion, Toggl | **Early Access / OAuth 준비 중** |
| Unity Battle Lab, 네이티브 Android/iOS, Agent 자동 실행 | 보류 중 |

앱 버전은 `0.6.0-beta.8` 후보이며 REST/MCP는 `2.7.0`, 데이터 Schema는 `7`입니다. 공개 베타의 안전성과 검토 준비를 우선하기 위해 외부 Provider OAuth는 기본적으로 비활성화되어 있습니다. 계정과 사용자 상태는 Appwrite로 마이그레이션 중입니다.

## 디자인 원칙

1. **사람이 목표와 최종 결정을 갖습니다**: AI의 제안은 검토할 수 있어야 하며 승인 없이 완료되거나 공개되지 않습니다.
2. **작업과 보상을 분리합니다**: Quest로 MP를 얻고, 언제 전투할지와 어떤 명령을 사용할지 직접 선택합니다.
3. **읽기, 미리 보기, 실행**: 쓰기, 일괄 업데이트, Handoff에서는 dry-run을 기본으로 합니다.
4. **삭제보다 보관**: 기록, 보상, 외부 링크를 남기고 더 이상 필요하지 않은 Quest는 보관합니다.
5. **사람과 AI를 같은 파티에 배치**: Astra는 동료 캐릭터, Agent는 담당 역할, 사용자는 계정으로 분리됩니다.
6. **데이터를 가두지 않기**: REST, MCP, CLI, Web UI는 같은 Worker와 도메인 로직을 사용합니다.

## 화면과 데이터

- `/`: 현재 UI입니다. 로그인 전에는 기기에 데이터를 저장하고, 로그인 후에는 Worker를 통해 Appwrite와 동기화합니다.
- `/lp/` 및 `/lp/en/`: 일본어와 영어로 제공되는 Guilduo 공식 Landing Page입니다. CTA URL은 Runtime Config에서 공급되며 설정되지 않은 경우 안전하게 비활성화됩니다.
- `/interaction-lab/`: 로컬 개발과 캡처를 위한 Next 소스 route입니다.
- `/next/` 및 `/next/relay-forge/`: Appwrite Sites의 구현 및 호환 route입니다. 신규 사용자의 공식 진입점은 `https://app.guilduo.com/`이며 host-based rewrite를 통해 Relay Forge entry로 내부 전달됩니다. Desktop에서는 중앙 Today/Tree 목록만 스크롤하고, Mobile에서는 전체 페이지를 스크롤합니다.
- `https://guilduo.com/`은 같은 Appwrite Site의 `/lp/`로, `https://app.guilduo.com/`은 `/next/relay-forge/`로 routing됩니다. 실제 DNS 및 Rewrite 설정은 [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md)를 참고하세요.
- 시각적 source of truth는 [`DESIGN.md`](DESIGN.md), 기술적 source of truth는 [`PROJECT_SPEC.md`](PROJECT_SPEC.md), Next 전용 차이 설계는 [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md)입니다. 숫자 token은 [`design/TOKENS.json`](design/TOKENS.json), component는 [`design/COMPONENTS.md`](design/COMPONENTS.md), 화면 구성은 [`design/SCREENS.md`](design/SCREENS.md)를 참고하세요.
- 재연결할 때 Appwrite Auth 상태를 복원하고, 이전에 동기화된 데이터가 있으면 읽기 전용으로 유지합니다. 재연결 중에도 Quest 목록을 삭제하지 않으며 UI에는 skeleton, 재연결 버튼, 쓰기 잠금이 표시됩니다.
- Quest 완료 상태와 Agent Handoff 상태는 별도로 관리합니다. 일회성 To Do는 완료 시 보관하고, 일일 작업·습관·반복 To Do는 다음 발생 시점에 다시 표시합니다.
- 공개 프로필에는 표시 이름, `@handle`, bio, avatar, level만 노출합니다. Quest 내용, 메모, UID, OAuth 정보는 비공개입니다.

## Appwrite / Worker 아키텍처

| 계층 | 역할 |
|---|---|
| Appwrite Sites | Web/PWA 제공 |
| Appwrite Auth / TablesDB | Google 로그인과 사용자별 Quest·캐릭터 상태 |
| Cloudflare Worker | REST, OAuth, MCP, Webhook, 확장 기능 경계 |
| Cloudflare D1 | Agent Registry, MCP 연결, 프로필, 연동 메타데이터 |
| Cloudflare KV | OAuth state, 단기 state, MCP client |

Token, API key, secret은 Appwrite 공개 row나 브라우저 Local Storage에 저장하지 않습니다. Appwrite API Key는 Worker Secret에만 저장합니다. Agent Registry에도 model API key, password, 실행 URL을 저장하지 않습니다.

## MCP

안정적인 연결 endpoint는 다음과 같습니다.

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0`은 Quest, 보관, Quest Tree, Agent Handoff, Agent Registry, 프로필, 파티, 배틀, Toggl Focus contract를 포함하는 54개 tool을 제공합니다. `/mcp-next`는 새 SDK를 위한 검증 lane이며 Resources와 Workflow Prompts를 추가합니다. 기존 client와의 호환성을 위해 일반 사용에서는 `/mcp`를 계속 사용하세요.

마이그레이션 중에는 기존 `workers.dev`의 `/mcp`도 호환용으로 유지하지만, 새 등록과 재연결에는 위의 `mcp.guilduo.com/mcp`를 사용해야 합니다.

### OAuth로 새로운 MCP 연결 등록

이 절차는 Remote HTTP MCP와 OAuth를 지원하는 ChatGPT, Codex, Claude, OpenClaw 등의 client를 위한 것입니다. 처음 연결할 때는 1~6단계를 순서대로 진행하세요. 기존 연결만 확인하려면 7단계부터 시작하면 됩니다.

1. 마이그레이션 전 Guilduo / QuestForge 연결이 client에 남아 있다면 먼저 연결을 해제하거나 삭제합니다. 기존 OAuth Grant와 Token은 재사용할 수 없습니다.
2. client의 MCP 또는 Connector 설정을 열고 `Guilduo`라는 이름과 Remote HTTP MCP type으로 연결을 등록합니다.
3. URL에는 안정 버전인 `https://mcp.guilduo.com/mcp`를 지정합니다. 일반 연결 테스트에서는 `/mcp-next`를 사용하지 않습니다.
4. 인증 방식을 선택할 수 있다면 `OAuth`를 선택합니다. API Key, Bearer Token, Client Secret은 입력하지 않습니다.
5. 브라우저에 “Connect to Guilduo”가 표시되면 Web 버전 Guilduo에서 사용하는 것과 같은 Appwrite 계정으로 로그인하고 요청된 권한을 확인한 뒤 승인합니다.
6. MCP client로 돌아가 연결 상태가 connected 또는 available로 표시되는지 확인합니다. 이 시점에는 OAuth 연결만 완료되었으며 Agent가 아직 연결되지 않았을 수 있습니다.
7. [Guilduo / Relay Forge](https://app.guilduo.com/)의 Connections를 열고 연결된 Client를 원하는 Agent에 연결합니다. Agent가 없다면 Party > “Register Agent”에서 먼저 만듭니다.
8. MCP client를 재시작하거나 새로고침한 뒤 아래 연결 테스트를 실행합니다.

설정 파일로 Remote MCP를 추가하는 client에서는 다음 예시를 사용하세요.

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

MCP client는 OAuth metadata를 자동으로 검색합니다. 수동 확인이 필요할 때만 다음 URL을 사용하세요.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### 연결 테스트에서 Agent Context 확인

Client에서 다음 순서를 확인하세요.

1. MCP 초기화가 성공합니다.
2. `tools/list`가 54개 tool을 반환합니다.
3. `list_registered_agents`가 자신의 Agent만 반환합니다.
4. `get_current_agent_context`를 호출합니다.

Agent를 연결하기 전 정상 응답은 `linked: false`와 `agent: null`입니다. Connections에서 연결한 뒤에는 `linked: true`가 되고 `agent`와 `effectiveScopes`를 반환합니다. 이를 통해 OAuth 인증, UID 분리, Agent 연결이 같은 연결에서 동작하는지 확인할 수 있습니다.

테스트 요청 예시:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### 401 오류와 연결되지 않은 Agent 문제 해결

| 상태 | 대응 |
|---|---|
| 연결 직후 401 | 오래된 OAuth 정보가 남아 있습니다. 연결을 삭제하고 같은 `/mcp` URL을 다시 등록한 뒤 재인증합니다. |
| OAuth 화면에서 돌아올 수 없음 | Web 버전 Guilduo와 같은 Appwrite 계정으로 로그인했는지 확인합니다. Client로 돌아가는 callback을 차단할 수 있는 확장 기능도 확인하세요. |
| `linked: false` | OAuth는 성공했습니다. Relay Forge Connections에서 Client를 Agent에 연결합니다. |
| `agents:read` 권한 오류 | 연결을 다시 인증하고 동의 화면에서 Agent 읽기 권한을 확인합니다. Agent 쪽에서 OAuth 권한을 추가할 수는 없습니다. |
| Agent 연결이 표시되지 않음 | MCP client를 새로고침하고 `get_current_agent_context`를 다시 실행합니다. |

연결 설정이나 log에 Token, API Key, 전체 UID를 붙여 넣지 마세요. OAuth 인증 후 Token은 MCP client와 Cloudflare KV가 관리합니다.

### AI client

- ChatGPT / Codex: 위의 production `/mcp` URL을 Remote MCP App 또는 developer mode에 등록합니다.
- Claude: Settings > Connectors에서 OAuth Remote MCP를 추가합니다.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: 추후 연결 recipe에서 같은 Remote HTTP MCP를 사용합니다.

등록 후 Relay Forge의 **Party**에서 Agent를 만들거나 편집하고, **Connections**에서 인증된 MCP client를 Agent에 연결합니다. Agent가 MCP client의 권한을 늘릴 수는 없습니다.

## CLI

CLI는 MCP와 역할이 분리되어 있습니다. MCP는 AI tool의 검색과 승인을 위한 것이고, CLI는 사람과 CI의 REST/JSON 작업을 위한 것입니다.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

`--execute`가 없으면 쓰기 작업은 dry-run 또는 실행 계획만 반환합니다. 인증에는 `QUESTFORGE_TOKEN` 또는 `--token-stdin`을 사용하며 Token을 log에 기록하지 않습니다. 일반 production 사용자는 고정 API Key가 아니라 OAuth를 사용합니다.

## Skill / OpenAI Plugin / MCP App

- 공식 Skill: [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- OpenAI Plugin 준비 패키지: [`plugins/questforge/`](plugins/questforge/)
- MCP App 등록 template: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- 제출 checklist: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

Skill은 읽기, dry-run, 확인, 실행, review 반환의 순서를 AI에게 가르칩니다. OpenAI 공식 review는 자동으로 완료되지 않습니다. 공개 베타에서 실제 계정 수락, privacy, account 삭제 경로를 확인한 후 운영자가 Dashboard에서 신청합니다.

## 9개 언어

Guilduo는 일본어, 영어, 스페인어, 브라질 포르투갈어, 프랑스어, 독일어, 한국어, 중국어 간체, 러시아어를 지원합니다. 언어 설정은 기기별로 저장되며 cloud sync에는 포함되지 않습니다. 날짜, 숫자, 정렬 순서는 Intl API를 사용합니다.

## 외부 서비스 로드맵

현재는 contract와 안전한 표시를 먼저 마련하고 있으며 Provider OAuth는 Early Access로 보류 중입니다.

1. Google Calendar: 읽기 전용 availability window
2. Google Tasks: 삭제 없는 양방향 동기화
3. Toggl Track: 시간 기록, 추정, MP 변환
4. Notion: 일일 log export
5. Todoist, Discord / Slack: 동기화와 알림
6. OpenClaw, Hermes Agent: 연결 recipe와 Skill 재사용

초기 동기화에는 preview가 필요하며 Guilduo는 외부 데이터를 자동으로 삭제하지 않습니다. Provider Secret은 Worker Secret에만 저장합니다.

## 성능 및 telemetry

목표 기준은 Pixel 9급 기기입니다: LCP 2.5초 이하, INP 200ms 이하, CLS 0.1 이하, 초기 압축 JavaScript 250KB 이하. 익명 telemetry는 명시적으로 동의한 사용자에게만 적용되며 Quest 내용, 메모, 이메일, UID, Token, 외부 내용은 전송하지 않습니다. 허용된 구현 event는 Web Vitals, JavaScript 오류, 동기화 결과, 첫 Quest 완료, MCP 연결, Agent 할당입니다. telemetry를 거부하거나 철회한 뒤에는 아무것도 전송하지 않습니다. 공개 전 관리자가 `TELEMETRY_ENDPOINT`와 D1 migration 0006을 설정해야 합니다.

## 로컬 개발

필요한 환경은 Node.js 22+와 Wrangler입니다. Appwrite resource는 Appwrite Console 또는 MCP로 관리합니다.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

PowerShell에서는 `Copy-Item`을 사용하세요. 주요 command는 다음과 같습니다.

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

TypeScript 개발 중에는 Wrangler 설정에서 Worker runtime type을 자동 생성합니다. `npm run typecheck`는 type 생성, 생성 결과의 일관성 검사, 명시적 `any` 및 `@ts-nocheck` 검사, browser·Worker·Node·battle prototype의 strict type check를 함께 수행합니다. Vite 변환과 type check는 분리하며 API/MCP contract는 별도 test로 유지합니다.

`v*` 태그 workflow는 package version, 태그 commit이 `main`의 조상인지 여부, 릴리스 노트를 대조하고 CI·타입 검사·테스트·빌드·preview gate를 통과한 뒤 GitHub 소스 Release를 공개합니다. 배포용 secret을 사용하지 않으며 production migration이나 Site·Worker 자동 배포를 수행하지 않습니다. production 배포는 기존 수동 workflow `.github/workflows/deploy-appwrite-site.yml` / `.github/workflows/deploy-appwrite-worker.yml`에서 별도로 수행하며 `production` 환경 보호와 보존 캐시 gate를 유지합니다. production Worker runtime에는 공개 소스에 아직 통합되지 않은 직접 배포 수정 사항이 남아 있으므로 범용 Worker 배포를 먼저 실행하지 마세요. 본체 소스 Release `v0.6.0-beta.8`과 host extensions `beta.12`는 별도 버전으로 관리하며 Guilduo는 공개 베타를 유지합니다. 자세한 내용은 [`RELEASE_SETUP.md`](RELEASE_SETUP.md)를 참고하세요.

## 문서

- [시각 디자인 source of truth](DESIGN.md)
- [기술 사양](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Component specification](design/COMPONENTS.md)
- [Screen blueprints](design/SCREENS.md)
- [Asset manifest](design/ASSET_MANIFEST.md)
- [Golden references](design/reference/README.md)
- [공개 베타 roadmap](ROADMAP.md)
- [공개 URL guide](docs/public-urls.md)
- [API / MCP / OAuth setup](API_MCP_SETUP.md)
- [Tagged release setup](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Privacy](PRIVACY.md)
- [Terms](TERMS.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [License](LICENSE)

## 라이선스

Guilduo는 GNU AGPL-3.0-only로 배포됩니다. 네트워크를 통해 수정 버전을 제공하는 경우 해당 라이선스의 소스 코드 제공 요건을 따라야 합니다.
