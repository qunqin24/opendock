# agent4science

[English](README.md) | **한국어**

연구 아이디어는 똑똑한 웹 챗봇에서 다듬고, 실제 실험은 코딩 에이전트가 돌리게 하세요.
agent4science가 그 둘을 이어줍니다. **OpenCode**, **Claude Code**, **Codex**에서 씁니다.

## 1분 설명

*무엇을* 연구할지 고민할 때 — 이 아이디어가 새로운가? 이 실험이 정말 그걸 검증하나? 제일 작게
해볼 버전은 뭘까? — 가장 쓸 만한 도구는 보통 당신이 접근할 수 있는 가장 똑똑한 모델과의 채팅,
예를 들어 GPT Pro나 Claude/Fable입니다. 그런데 이건 브라우저 안에 있죠. 코딩 에이전트로
붙일 수도 없고, 보고서를 API로 돌리자니 비싸고요.

그래서 agent4science는 일을 자연스럽게 나눕니다:

- **웹 챗봇은 사고를 맡습니다.** 거기서 아이디어를 짜고 허점을 찔러봅니다.
- **코딩 에이전트는 실행을 맡습니다.** 그 대화를 읽고, 코드를 짜고, 실험을 돌리고, 숫자를
  확인하고, 무슨 일이 있었는지 정리합니다.
- **그리고 다음 라운드용으로 웹에 붙여넣을 프롬프트**를 만들어 줍니다.

특정 제품에 묶이지 않습니다. 당신에게 제일 똑똑한 웹 모델을 쓰고, 이미 쓰던 코딩 에이전트를
그대로 쓰면 됩니다.

## 빠른 시작

먼저 CLI부터 (Claude Code와 Codex가 내부적으로 호출합니다):

```bash
npm install -g agent4science
```

그다음 코딩 에이전트에 등록합니다. **등록 후엔 에이전트를 재시작**해야 새 커맨드를 인식합니다.

**OpenCode** — 네이티브 플러그인 + `ai4science` 에이전트 + `/ai4s-*` 커맨드를 설치합니다:

```bash
agent4science install --global
# 등록 확인:  opencode agent list   ("ai4science (primary)"가 보여야 함)
```

그다음 OpenCode를 열고 **Tab**을 눌러 `ai4science` 에이전트로 전환합니다.

**Claude Code와 Codex** — 플러그인으로 설치합니다. `/ai4s-*` 커맨드, 서브에이전트, 그리고
연구 얘기를 꺼내면 에이전트가 알아서 발동하는 **agent4science 스킬**까지 등록됩니다. 양쪽 방식이
동일합니다:

```bash
# Claude Code
claude plugin marketplace add LeeBumSeok/agent4science
claude plugin install agent4science@agent4science

# Codex
codex plugin marketplace add LeeBumSeok/agent4science
codex plugin add agent4science@agent4science
```

(플러그인 대신 파일 복사가 좋다면 `agent4science install --global --target claude`,
`--target codex`가 커맨드·에이전트·스킬·프롬프트를 `~/.claude`, `~/.codex`에 직접 넣습니다.)

이제 `/ai4s-*` 커맨드가 생겼고, Claude Code나 Codex에서는 그냥 *부탁*만 해도("이 아이디어를
agent4science로 실험으로 만들어줘") 알아서 진행합니다. 처음부터 끝까지 한 번 돌려보면 이렇습니다:

```
# 1. 프로젝트를 시작하고 뭘 연구할지 적습니다.
/ai4s-init  물리 기반 정규화가 작은 분자 데이터셋에서 GNN에 도움이 될까?

# 2. 연구 채팅을 시작할 프롬프트를 받아 GPT Pro나 Claude에 붙여넣습니다.
/ai4s-pro-prompt
#    → 브라우저에서 대화로 풀어갑니다: 질문을 날카롭게, 가설 하나 선택,
#      그 가설을 반증할 수 있는 가장 작은 실험 설계.

# 3. 그 대화를 공유하고(ChatGPT: 공유 → 링크 만들기 / Claude: 공유 → 링크 만들기)
#    링크를 넘겨줍니다:
/ai4s-import-conversation  https://chatgpt.com/share/....

# 4. 대화를 구체적인 계획으로 바꾸고, 만들고, 돌립니다.
/ai4s-validate     # 대화에서 구조화된 실험 명세를 뽑아냄
/ai4s-plan         # 저장소를 보고 최소 구현 계획 작성
/ai4s-implement    # 코드 + 스모크 테스트 작성
/ai4s-run          # 스모크 테스트 후 seed별로 실험 실행
/ai4s-analyze      # baseline과 정직하게 비교

# 5. 결과를 다음 라운드용으로 웹에 가져갈 요약 프롬프트를 받습니다.
/ai4s-pro-review
```

어디까지 했는지 헷갈리면 아무 때나 `/ai4s-status` — 지금 단계와 다음에 할 일을 알려줍니다.

## 커맨드

| 커맨드 | 하는 일 |
|---|---|
| `/ai4s-init <goal>` | 프로젝트 시작 (`.ai4science/` 폴더 생성). |
| `/ai4s-pro-prompt` | 웹 모델에서 연구 채팅을 시작할 프롬프트 작성. |
| `/ai4s-import-conversation <url>` | 공유된 ChatGPT/Claude 대화 전체를 가져오기. |
| `/ai4s-ingest` | 링크 대신 압축된 `AI4S-HANDOFF-V1` 블록을 붙여넣기. |
| `/ai4s-validate` | 대화를 구체적이고 검증 가능한 실험 명세로 변환. |
| `/ai4s-plan` | 저장소를 파악하고 최소 구현 계획 작성. |
| `/ai4s-implement` | 코드와 스모크 테스트 작성. |
| `/ai4s-run` | 스모크 테스트 후 seed별 실험 실행. |
| `/ai4s-analyze` | 계획 대비 결과 분석 후 정리. |
| `/ai4s-report` | 연구 리포트 작성. |
| `/ai4s-pro-review` | 웹 모델에 붙여넣을 다음 라운드 프롬프트 작성. |
| `/ai4s-status` | 현재 상태와 다음 단계 표시. |

OpenCode에서는 에이전트 전환기(Tab)에 이 전체를 몰아주는 **`ai4science`** 에이전트도 보입니다.
Claude Code와 Codex에서는 같은 커맨드가 CLI를 통해 돌아갑니다.

## 연구를 가져오는 두 가지 방법

**대화 전체 가져오기** (권장). 채팅을 공유하고 링크를 `/ai4s-import-conversation`에 주면 됩니다.
당신이 가리킨 그 공개 페이지 하나를 가져와 전체 트랜스크립트를 `.ai4science/pro_conversation.md`에
저장하고, `/ai4s-validate`가 거기서 실험 명세를 뽑아냅니다. 지원:

- **ChatGPT** — `chatgpt.com/share/...`
- **Claude** — `claude.ai/share/...`

(참고: ChatGPT *deep research* 결과 채팅이면 보고서가 공유에서 가려져서 프롬프트만 넘어옵니다.
그럴 땐 agent4science가 알려주니, 필요하면 보고서 본문을 직접 붙여넣으세요.)

**아니면 handoff 블록 붙여넣기.** 링크 공유가 싫다면 웹 모델에게 `AI4S-HANDOFF-V1` 블록을
만들게 해서 `/ai4s-ingest`에 붙여넣으세요. 조금 더 수동이지만 어떤 모델에서든 됩니다.

어느 쪽이든 이후 파이프라인은 동일합니다.

## 어떻게 안전하게 지키나

가져온 대화와 handoff는 **신뢰할 수 없는 입력**으로 다룹니다 — 외부에서 온 것이라 곧이곧대로
받아들이지 않습니다:

- **handoff가 그러라고 했다고 그냥 실행하지 않습니다.** 제안된 모든 명령을 먼저 검사합니다.
  위험한 것(재귀 삭제, `sudo`, 인터넷을 셸로 파이프, force push, 클라우드 CLI, 자격증명 읽기)은
  거부합니다. OpenCode에서는 handoff의 명령뿐 아니라 *모든* 셸 명령에 런타임으로 적용됩니다.
- **단계는 순서대로 돌고, 뭔가 몰래 바뀌지 않습니다.** 실패한 실행은 지우지 않고 보관합니다.
  합의한 가설·metric·성공 기준이 뒤에서 바뀌지 않습니다.
- **빠졌거나 잘못된 입력은 추측하지 않고 돌려보냅니다.** 웹 모델에 붙여넣을 짧은 수정 요청을
  받아서 다시 시도하면 됩니다.

고위험 주제는 파이프라인이 계속되기 전에 당신의 명시적 승인을 요구합니다.

## 내부 동작

궁금할 때만 보면 되는 세부 사항입니다 — 쓰는 데는 몰라도 됩니다.

**`.ai4science/` 폴더**가 프로젝트의 기억입니다: 현재 단계, 가져온 대화, 출처, 모든 실행 로그,
리포트. 파이프라인이 아는 건 전부 여기 있습니다.

**한 번에 한 단계씩** 움직이고, 건너뛰지 않습니다 — 각 단계는 이전 단계의 결과물이 디스크에
있어야 실행됩니다:

```
initialized → handoff_imported → validated → repo_mapped
  → implementation_planned → implemented → tested
  → experiment_ran → analyzed → pro_feedback_ready
```

**`AI4S-HANDOFF-V1` 블록**은 웹 채팅과 에이전트 사이의 작은 계약입니다 — 연구 질문, 가설,
실험(baseline, metric, 성공/실패 기준, seeds), 태스크, 안전 수준이 담긴 YAML. 대화를 가져오면
`/ai4s-validate`가 이걸 대신 만들어 줍니다. 전체 명세와 예시는
[`schema/ai4s-handoff-v1.md`](schema/ai4s-handoff-v1.md)에 있습니다.

**에이전트**(OpenCode·Claude Code): 기본 `ai4science` 에이전트가 전체를 몰고, 구체적인 일은
전문 서브에이전트에게 넘깁니다:

| 에이전트 | 역할 |
|---|---|
| `ai4science` | 파이프라인을 몲 (당신이 대화하는 에이전트). |
| `@ai4s-intake-validator` | handoff를 신뢰할 수 없는 입력으로 검증. |
| `@ai4s-repo-cartographer` | 실험이 놓일 위치를 저장소에서 찾음. |
| `@ai4s-experiment-planner` | 명세 + 저장소를 최소 계획으로 변환. |
| `@ai4s-implementation-engineer` | 코드와 스모크 테스트 작성. |
| `@ai4s-experiment-runner` | 승인된 명령 실행, 모든 실행 기록. |
| `@ai4s-result-analyst` | 결과 분석 후 리포트 작성. |
| `@ai4s-pro-feedback-composer` | 웹 모델용 다음 라운드 프롬프트 작성. |

## 개발

로직은 `src/core/` 아래 순수 JavaScript이고, Node 내장 러너로 테스트합니다 — 테스트에
OpenCode나 bun이 필요 없습니다:

```bash
npm test                             # 75개 테스트
npm run lint:frontmatter             # command/agent 파일 검증
node scripts/build-cross-agent.js    # Claude Code + Codex 자산 재생성
```

구성:

- `src/core/` — 실제 로직(`safety`, `state`, `handoff`, `conversation`, `ledger`, `prompts`,
  `fetch`, `actions`); 전부 순수·테스트 가능.
- `bin/agent4science.js` — CLI: 설치기 + Claude Code·Codex가 호출하는 서브커맨드.
- `opencode/` — OpenCode 플러그인, 커맨드, 에이전트.
- `claude/`, `codex/` — `src/`에서 빌드 스크립트로 생성되는 Claude Code·Codex 자산.
- `schema/`, `fixtures/`, `test/`, `install.sh`.

## 공유에 관한 주의

`/ai4s-import-conversation`은 **당신이 만들어 건네준 공개 페이지 하나**, 즉 공유 링크를
가져옵니다. 스크래핑도, 로그인 우회도, 브라우저 자동화도 아닙니다 — 공개 공유 페이지가 이미
보여주는 걸 읽을 뿐입니다. 아무것도 가져오는 게 싫다면 `/ai4s-ingest`로 handoff를 직접
붙여넣으세요. 어느 쪽이든 링크만, 연구 출처 기록으로 보관합니다.

한 가지 주의: 공유 링크는 공개됩니다. 링크가 있는 사람은 누구나 대화를 볼 수 있고 만료도 없으니,
민감한 내용은 공유하지 마세요.
