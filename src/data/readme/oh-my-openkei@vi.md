[🇺🇸 English](README.md)

# oh-my-openkei

**Open Multi Agent Suite** · Kết hợp bất kỳ model nào · Tự động phân công tác vụ

bởi **Kei** · dựa trên [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim)

---

## Plugin Này Là Gì

oh-my-openkei là một plugin điều phối agent (agent orchestration) cho OpenCode. Nó bao gồm một đội ngũ agent chuyên biệt được tích hợp sẵn, có nhiệm vụ thám thính mã nguồn, tra cứu tài liệu, đánh giá kiến trúc, xử lý công việc giao diện, và thực thi các tác vụ triển khai dưới sự chỉ đạo của một bộ điều phối duy nhất.

Thay vì bắt một model duy nhất làm mọi thứ, plugin này định tuyến từng phần công việc đến agent phù hợp nhất, cân bằng giữa **chất lượng, tốc độ và chi phí**.

Để khám phá các agent, xem **[Meet the Pantheon](#meet-the-pantheon)**. Để biết danh sách đầy đủ tính năng, xem **[Tính năng & Quy trình](#features-and-workflows)**.

---

### Bắt Đầu Nhanh

Bạn phải download opencode trước để có thể sử dụng plugin này.  
- https://opencode.ai/download

Package đã xuất bản:

- https://www.npmjs.com/package/oh-my-openkei

Sao chép và dán dòng nhắc này cho agent LLM của bạn:

```
Install and configure oh-my-openkei by following:
https://www.npmjs.com/package/oh-my-openkei
```

### Cài Đặt

```bash
bunx oh-my-openkei@latest install
```

### Cài Đặt Không Tương Tác

```bash
bunx oh-my-openkei@latest install --no-tui --skills=yes
```

### Bắt Đầu

1. **Đăng nhập vào các nhà cung cấp**:
   ```bash
   opencode auth login
   ```
2. **Làm mới danh sách model khả dụng**:
   ```bash
   opencode models --refresh
   ```
3. **Xem lại cấu hình plugin đã tạo** tại `~/.config/opencode/oh-my-openkei.json`
4. **Điều chỉnh model, kỹ năng hoặc quyền truy cập MCP cho từng agent nếu cần**
5. **Khởi động OpenCode**:
   ```bash
   opencode
   ```
6. **Xác minh các agent đang phản hồi**:
   ```text
   ping all agents
   ```

> [!TIP]
> Bạn muốn hiểu cách thức phân công tự động hoạt động trong thực tế? Hãy xem **[Orchestrator prompt](src/agents/orchestrator.ts)** — nó chứa các quy tắc định tuyến, logic chọn chuyên gia và model vận hành ưu tiên phân công cho primary agent.

Cấu hình mặc định được tạo ra:

```jsonc
{
  "$schema": "https://unpkg.com/oh-my-openkei@latest/oh-my-openkei.schema.json",
  "preset": "default",
  "presets": {
    "default": {
      "orchestrator": {
        "model": "openai/gpt-5.4-fast",
        "variant": "high",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "planner": {
        "model": "openai/gpt-5.5-fast",
        "variant": "xhigh",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "sprinter": {
        "model": "openai/gpt-5.3-codex",
        "variant": "low",
        "skills": ["*"],
        "mcps": ["*", "!context7"]
      },
      "business-analyst": {
        "model": "openai/gpt-5.5-fast",
        "variant": "high",
        "skills": ["business-analyst"],
        "mcps": ["*", "!context7"]
      },
      "oracle": {
        "model": "openai/gpt-5.5-fast",
        "variant": "high",
        "skills": ["simplify", "requesting-code-review"],
        "mcps": []
      },
      "debugger": {
        "model": "openai/gpt-5.3-codex",
        "variant": "high",
        "skills": [],
        "mcps": []
      },
      "librarian": {
        "model": "minimax-coding-plan/MiniMax-M2.7",
        "skills": [],
        "mcps": ["websearch", "context7", "grep_app"]
      },
      "explorer": {
        "model": "minimax-coding-plan/MiniMax-M2.7",
        "skills": [],
        "mcps": ["serena"]
      },
      "designer": {
        "model": "opencode-go/kimi-k2.6",
        "skills": ["agent-browser"],
        "mcps": ["figma"]
      },
      "frontend-developer": {
        "model": "opencode-go/deepseek-v4-flash",
        "skills": ["vercel-react-best-practices", "karpathy-guidelines"],
        "mcps": []
      },
      "backend-developer": {
        "model": "opencode-go/deepseek-v4-flash",
        "skills": ["backend-developer", "karpathy-guidelines"],
        "mcps": []
      }
    }
  }
}
```

`frontend-developer`, `backend-developer` và `business-analyst` coi các kỹ năng khả dụng của họ như những hướng dẫn bắt buộc: khi kỹ năng được cấu hình cho họ, họ được nhắc tải các kỹ năng đó qua công cụ `skill` trước khi thực hiện công việc chính.

Quản lý phiên (session management) được bật theo mặc định dù không được hiển thị trong cấu hình khởi đầu. Mỗi phiên agent con đã chạy được gán một bí danh ngắn (`exp-1`, `ora-1`); agent tiếp tục phiên đó bằng cách truyền `task_id` cùng specialist, còn bỏ trống `task_id` thì tạo phiên con mới. Xem **[Session Management](docs/session-management.md)** để biết quy tắc tái sử dụng và cách tùy chỉnh số lượng phiên agent con có thể tiếp tục được ghi nhớ.

### Dành Cho Các Nhà Cung Cấp Khác

Để sử dụng Kimi, GitHub Copilot, ZAI Coding Plan hoặc một thiết lập đa nhà cung cấp khác, hãy dùng **[Configuration](docs/configuration.md)** để tham khảo đầy đủ. Để xem ví dụ thiết lập đa nhà cung cấp giá rẻ hơn, hãy xem **[$30 Preset](docs/thirty-dollars-preset.md)**.

Hướng dẫn cấu hình cũng bao gồm các agent con tùy chỉnh thông qua `agents.<name>`, nơi bạn có thể định nghĩa cả khối `prompt` thông thường và `orchestratorPrompt` cho việc phân công.

Bạn cũng có thể kết hợp bất kỳ model nào cho mỗi agent. Để có gợi ý về model, hãy xem **Recommended Models** được liệt kê dưới mỗi agent bên dưới.

### ✅ Xác Minh Thiết Lập Của Bạn

Sau khi cài đặt và xác thực, hãy xác minh tất cả các agent đã được cấu hình và đang phản hồi:

```bash
opencode
```

Sau đó chạy:

```
ping all agents
```

Nếu bất kỳ agent nào không phản hồi, hãy kiểm tra xác thực nhà cung cấp và tệp cấu hình của bạn.

> [!NOTE]
> Khối JSON ở trên hiển thị preset do trình cài đặt tạo ra. Các giá trị "Default Model" theo từng agent bên dưới mô tả các mặc định an toàn khi chạy, được sử dụng khi không có cấu hình model rõ ràng nào được cung cấp.

---

<a id="meet-the-pantheon"></a>

## 🏛️ Meet the Pantheon

### Primary Agents

**Orchestrator**, **Planner**, **Sprinter** và **Business Analyst** là các primary agent. Hãy chọn một agent dựa trên cách bạn muốn làm việc.

- **Orchestrator** (mặc định): Điều phối viên ưu tiên phân công cho việc lập kế hoạch, định tuyến và tích hợp kết quả.
- **Planner**: Người lập kế hoạch theo phong cách phỏng vấn, đặt câu hỏi làm rõ và trả về đầu ra có cấu trúc `<planner-plan>`.
- **Sprinter**: Agent tự thực thi nhanh cho các câu hỏi đáp nhanh và tác vụ trực tiếp.
- **Business Analyst**: Chuyên gia phân tích cho nghiên cứu thị trường, phân tích cạnh tranh, thu thập yêu cầu và lập kế hoạch chiến lược.

#### Luồng Định Tuyến

- **Orchestrator** có thể phân công cho `debugger`, `explorer`, `librarian`, `oracle`, `designer`, `frontend-developer`, `backend-developer` và `observer`.
- **Planner** chỉ lập kế hoạch và chỉ có thể phân công cho `explorer`, `librarian`, `oracle` và `designer`.
- **Sprinter** tự thực thi và không phân công.
- **Business Analyst** có thể phân công nghiên cứu cho `explorer`, `librarian` và `oracle`.
- **Specialists** là những người thực thi lá cây: sau khi được phân công, họ thực hiện công việc có giới hạn và trả kết quả về.
- **Observer** bị vô hiệu hóa theo mặc định cho đến khi bạn bật nó một cách rõ ràng trong cấu hình.

#### Orchestrator

**Vai trò:** Điều phối viên ưu tiên phân công  
**Prompt:** [orchestrator.ts](src/agents/orchestrator.ts)  
**Mô hình mặc định:** `openai/gpt-5.4-fast` (`high`)  
**Mô hình đề xuất:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Lựa chọn tốt nhất:** `openai/gpt-5.5-fast` với variant `high` — đây là cấu hình đơn lẻ mạnh nhất cho vai trò điều phối, mang lại sự cân bằng tốt nhất giữa tốc độ suy luận và độ chính xác định tuyến.  
**Hướng dẫn chọn model:** Chọn model điều phối mạnh nhất của bạn. Orchestrator cần xuất sắc trong việc định tuyến, kỷ luật phân công, phán đoán và tuân theo hướng dẫn đáng tin cậy. Orchestrator phân công TẤT CẢ công việc quan trọng cho các chuyên gia và chỉ hành động trực tiếp khi quy tắc "Don't delegate when" của agent con được áp dụng rõ ràng, hoặc cho các nhiệm vụ tích hợp/xác minh.

#### Planner

**Vai trò:** Người lập kế hoạch theo phong cách phỏng vấn, đặt câu hỏi làm rõ và trả về đầu ra có cấu trúc `<planner-plan>`  
**Prompt:** [planner.ts](src/agents/planner.ts)  
**Mô hình mặc định:** `openai/gpt-5.5-fast` (`xhigh`)  
**Mô hình đề xuất:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Hướng dẫn chọn model:** Chọn model lập trình toàn diện mạnh nhất của bạn. Planner điều khiển việc lập kế hoạch và phân công, vì vậy nó cần phán đoán xuất sắc, tư duy có cấu trúc và khả năng tuân theo hướng dẫn đáng tin cậy. Planner phân công tất cả việc khám phá và nghiên cứu cho các chuyên gia và chỉ hành động trực tiếp để tổng hợp, phỏng vấn và tạo kế hoạch.

#### Sprinter

**Vai trò:** Agent tự thực thi nhanh cho các câu hỏi đáp nhanh và tác vụ trực tiếp  
**Prompt:** [sprinter.ts](src/agents/sprinter.ts)  
**Mô hình mặc định:** `openai/gpt-5.3-codex` (`low`)  
**Mô hình đề xuất:** `openai/gpt-5.3-codex`, `github-copilot/grok-code-fast-1`, `kimi-for-coding/k2p5`  
**Hướng dẫn chọn model:** Chọn một model nhanh, độ trễ thấp. Sprinter xử lý mọi thứ trực tiếp và không phân công — sử dụng nó khi bạn muốn câu trả lời trực tiếp và thực thi nhanh thay vì lập kế hoạch hoặc phân công nặng nề.

#### Business Analyst

**Vai trò:** Chuyên gia nghiên cứu thị trường, phân tích cạnh tranh, thu thập yêu cầu và lập kế hoạch chiến lược  
**Prompt:** [business-analyst.ts](src/agents/business-analyst.ts)  
**Mô hình mặc định:** `openai/gpt-5.5-fast` (`high`)  
**Mô hình đề xuất:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`  
**Hướng dẫn chọn model:** Chọn một model suy luận mạnh cho việc phân tích có cấu trúc, tổng hợp nghiên cứu và tạo tài liệu. Business Analyst phân công nghiên cứu cho `@explorer`, `@librarian` và `@oracle`, sau đó tổng hợp các phát hiện thành các kế hoạch hành động và tài liệu yêu cầu.

> **Hành vi tự động lưu:** Business Analyst luôn lưu toàn bộ đầu ra phân tích của mình dưới dạng tệp `.md` trong thư mục `.business-analyst/` và chỉ trả về một xác nhận ngắn gọn trong chat. Điều này khác với Planner, chỉ lưu vào tệp khi được yêu cầu một cách rõ ràng.

---

### Subagents

Các agent sau đây được phân công bởi các primary agent dựa trên loại tác vụ.

#### Oracle

**Vai trò:** Cố vấn chiến lược và điểm leo thang cho các quyết định quan trọng, lỗi chưa được giải quyết và đánh giá mã nguồn  
**Prompt:** [oracle.ts](src/agents/oracle.ts)  
**Mô hình mặc định:** `openai/gpt-5.5-fast` (`high`)  
**Mô hình đề xuất:** `openai/gpt-5.5` (high), `google/gemini-3.1-pro-preview` (high)  
**Hướng dẫn chọn model:** Chọn model suy luận cao mạnh nhất của bạn cho việc đánh giá kiến trúc, gỡ lỗi leo thang, đánh đổi và đánh giá mã nguồn. Điều tra lỗi ban đầu nên được chuyển cho `@debugger` — chỉ chuyển đến Oracle khi lỗi vẫn tồn tại sau khi điều tra ban đầu hoặc có tác động đến kiến trúc.

#### Debugger

**Vai trò:** Chuyên gia điều tra lỗi — tìm nguyên nhân gốc rễ mà không triển khai sửa chữa  
**Prompt:** [debugger.ts](src/agents/debugger.ts)  
**Mô hình mặc định:** `openai/gpt-5.3-codex` (`high`)  
**Mô hình đề xuất:** `openai/gpt-5.4-mini`, `minimax-coding-plan/MiniMax-M2.7`  
**Hướng dẫn chọn model:** Chọn một model lập trình có năng lực cho việc gỡ lỗi có hệ thống. Debugger ở chế độ chỉ đọc và tập trung vào điều tra — nó truy vết đường dẫn lỗi, phân tích nguyên nhân gốc rễ và báo cáo kết quả cho các agent triển khai hành động. Nó KHÔNG triển khai sửa lỗi.

#### Explorer

**Vai trò:** Trinh sát mã nguồn  
**Prompt:** [explorer.ts](src/agents/explorer.ts)  
**Mô hình mặc định:** `minimax-coding-plan/MiniMax-M2.7`  
**Mô hình đề xuất:** `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Hướng dẫn chọn model:** Chọn một model nhanh, chi phí thấp. Explorer xử lý công việc trinh sát rộng, vì vậy tốc độ và hiệu quả thường quan trọng hơn việc sử dụng model suy luận mạnh nhất của bạn.

#### Librarian

**Vai trò:** Truy xuất kiến thức bên ngoài  
**Prompt:** [librarian.ts](src/agents/librarian.ts)  
**Mô hình mặc định:** `minimax-coding-plan/MiniMax-M2.7`  
**Mô hình đề xuất:** `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Hướng dẫn chọn model:** Chọn một model nhanh, chi phí thấp. Librarian xử lý việc nghiên cứu và tra cứu tài liệu, vì vậy tốc độ và hiệu quả thường quan trọng hơn việc sử dụng model suy luận mạnh nhất của bạn.

#### Designer

**Vai trò:** Định hướng UI/UX, quyết định bố cục/tương tác, trau chuốt hình ảnh và đánh giá khả năng tiếp cận  
**Prompt:** [designer.ts](src/agents/designer.ts)  
**Mô hình mặc định:** `opencode-go/kimi-k2.6`  
**Mô hình đề xuất:** `google/gemini-3.1-pro-preview`, `kimi-for-coding/k2p5`  
**Hướng dẫn chọn model:** Chọn một model mạnh về định hướng UI/UX, phán đoán bố cục/tương tác, trau chuốt hình ảnh và ra quyết định thiết kế. Designer đóng vai trò là cơ quan ra spec/quyết định; công việc triển khai với hướng dẫn rõ ràng sẽ được chuyển cho `@frontend-developer`.

#### Frontend Developer

**Vai trò:** Triển khai phía client và kiểm thử frontend — thực thi những gì @designer quyết định  
**Prompt:** [frontend-developer.ts](src/agents/frontend-developer.ts)  
**Mô hình mặc định:** `opencode-go/deepseek-v4-flash` (`high`)  
**Mô hình đề xuất:** `google/gemini-3.1-pro-preview`, `kimi-for-coding/k2p5`  
**Hướng dẫn chọn model:** Chọn một model mạnh về triển khai phía client, kiến trúc component và thực thi kiểu dáng. Nhận các tác vụ frontend có giới hạn từ Orchestrator sau khi định hướng thiết kế đã được thiết lập.

#### Backend Developer

**Vai trò:** Chuyên gia triển khai backend  
**Prompt:** [backend-developer.ts](src/agents/backend-developer.ts)  
**Mô hình mặc định:** `opencode-go/deepseek-v4-flash` (`high`)  
**Mô hình đề xuất:** `cerebras/zai-glm-4.7`, `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo`, `openai/gpt-5.4-mini`  
**Hướng dẫn chọn model:** Chọn một model lập trình nhanh, đáng tin cậy cho các tác vụ backend thông thường. Nhận các tác vụ phía máy chủ có giới hạn từ Orchestrator như triển khai API, công việc cơ sở dữ liệu và thay đổi logic dịch vụ.

#### Observer

> [!NOTE] > **Tại sao lại là một agent riêng?** Nếu model Orchestrator của bạn không phải là đa phương thức, hãy bật Observer để xử lý hình ảnh, ảnh chụp màn hình, PDF và các tệp trực quan khác. Observer bị vô hiệu hóa theo mặc định và cung cấp cho Orchestrator một trình đọc đa phương thức chuyên dụng mà không buộc bạn phải thay đổi model suy luận chính. Đặt `disabled_agents: []` và một model `observer` trong cấu hình của bạn.

**Vai trò:** Phân tích trực quan chỉ đọc — diễn giải hình ảnh, ảnh chụp màn hình, PDF và sơ đồ. Trả về các quan sát có cấu trúc cho bộ điều phối mà không tải byte tệp thô vào cửa sổ ngữ cảnh chính.

- Hình ảnh, ảnh chụp màn hình, sơ đồ → công cụ `read` (hỗ trợ hình ảnh gốc)
- PDF và tài liệu nhị phân → công cụ `read` (trích xuất văn bản + cấu trúc)
- **Bị vô hiệu hóa theo mặc định** — bật bằng `"disabled_agents": []` và cấu hình một model có khả năng thị giác

**Prompt:** [observer.ts](src/agents/observer.ts)  
**Mô hình mặc định:** `openai/gpt-5.4-mini` — cấu hình một model có khả năng thị giác để bật  
**Hướng dẫn chọn model:** Chọn một model có khả năng thị giác nếu bạn muốn agent đọc ảnh chụp màn hình, hình ảnh, PDF và các tệp trực quan khác.

---

<a id="features-and-workflows"></a>

## 📚 Tài Liệu

Sử dụng phần này như một bản đồ: bắt đầu với cài đặt, sau đó chuyển đến các tính năng, cấu hình hoặc preset ví dụ tùy theo nhu cầu của bạn.

### 🚀 Bắt Đầu Tại Đây

| Tài liệu                                       | Nội dung bao gồm                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| **[Installation Guide](docs/installation.md)** | Cài đặt plugin, sử dụng cờ CLI, đặt lại cấu hình và khắc phục sự cố      |
| **[Quick Reference](docs/quick-reference.md)** | Bảng tra cứu nhanh về cài đặt, cấu hình, kỹ năng, MCP, công cụ và preset |

### ✨ Tính Năng & Quy Trình

| Tài liệu                                             | Nội dung bao gồm                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| **[Session Management](docs/session-management.md)** | Tái sử dụng phiên agent con một cách tường minh bằng `task_id`/bí danh, hoặc tạo phiên mới khi bỏ trống `task_id` |
| **[Codemap](docs/codemap.md)**                       | Tạo bản đồ phân cấp codemap để hiểu cơ sở mã nguồn lớn nhanh hơn               |

### ⚙️ Cấu Hình & Tham Khảo

| Tài liệu                                   | Nội dung bao gồm                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **[Configuration](docs/configuration.md)** | Vị trí tệp cấu hình, hỗ trợ JSONC, ghi đè prompt và tham khảo tùy chọn đầy đủ                      |
| **[Skills](docs/skills.md)**               | Các kỹ năng được tích hợp sẵn và đề xuất như `simplify`, `agent-browser` và `codemap`              |
| **[MCPs](docs/mcps.md)**                   | `websearch`, `context7`, `grep_app`, `figma`, `serena` và cách quyền MCP hoạt động theo từng agent |
| **[Tools](docs/tools.md)**                 | Các khả năng công cụ tích hợp sẵn như `webfetch`, công cụ LSP, tìm kiếm mã và định dạng            |

### 💡 Preset Ví Dụ

| Tài liệu                                        | Nội dung bao gồm                                     |
| ----------------------------------------------- | ---------------------------------------------------- |
| **[$30 Preset](docs/thirty-dollars-preset.md)** | Thiết lập đa nhà cung cấp tiết kiệm khoảng $30/tháng |

---

## 📄 Giấy Phép

MIT

---
