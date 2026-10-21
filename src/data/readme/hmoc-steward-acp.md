# hmoc-steward-acp

**Devin and Antigravity inside OpenCode.** · [English](#english) · [Tiếng Việt](#tiếng-việt)

## English

Give your OpenCode agent a colleague. This plugin opens a real Devin or Antigravity session in your TUI when you want to watch, and hands work to one in the background when you do not.

Install from npm, run setup once, then work normally.

### Install

```bash
opencode plugin add hmoc-steward-acp
```

Reload OpenCode afterwards. The plugin loads on startup, so a running session keeps the old code until you restart.

Project-only install: add the package to the `plugins` array of that project's `opencode.json` and skip the global command.

### Setup (once)

```text
/hivemind-setup
```

The agent checks your saved setup first. If it is already healthy it stops immediately — no questions, no writes, no session-start ritual. If something is missing it asks, one step at a time, using OpenCode's own `question` tool:

1. **Which harnesses to enable**, and their fallback order. Devin and Antigravity ship; others are rejected rather than silently ignored.
2. **Which model each harness uses.** Keep the foreign default, or pick `<model>` or `<model>#<variant>` from that harness's advertised catalog.

Answers are saved to OpenCode's plugin-scoped `config/delegate` document. Setup does not run again on later sessions unless you ask for a change:

```text
/hivemind-setup switch antigravity to the default model
```

That reissues only the affected step and keeps everything else.

### Daily use

| Do this | Get this |
|---|---|
| `/devin` or `/antigravity` | A real agent session opened in the TUI, with continuation, file mentions, slash commands, permissions and model/mode/thinking pickers. |
| Ask your agent to call `hivemind-delegate` | A task handed to a harness in a genuine child session. Foreground waits; background returns and reports later. |
| `/devin_delegate <task>` | The same handoff through a command instead of a tool call. |

Sessions, history and permissions stay in the foreign agent's own world. This plugin is the bridge, not a second agent.

### Check or repair

```text
/hivemind-setup health
```

One static read: `ready`, `action-required`, or `blocked`, plus the single next thing to do. No engine spawn.

`hivemind-doctor` goes further when you explicitly want contact: `initialize` handshake by default, `session` depth only with consent, and `install` / `sign-in` only after an approval prompt.

### Requirements

- **OpenCode V2** (`opencode` v2.x on PATH). A V1 host cannot load the TUI entry.
- **Devin:** the `devin` CLI on PATH, or `DEVIN_BIN` pointing at it, signed in with `devin auth login`.
- **Antigravity:** the official Antigravity ACP server. The plugin can install the pinned build after you approve it, and signs in through ACP `authenticate`.

The plugin checks these. It does not silently install or sign you in.

### If the plugin fails to load

OpenCode caches npm plugin installs under `~/.cache/opencode/npm/`. After upgrading, if the error still names an old version's files, delete that package's cache directory and restart. An old cached install keeps running old code regardless of what the registry serves.

To turn the plugin off without uninstalling, disable it by plugin id:

```json
{ "plugins": ["-hivemind-steward-oc-devin"] }
```

### Safety

- Configuration accepts no credentials. Do not paste tokens, keys or passwords into setup answers or plugin options.
- Permission prompts from the foreign agent are shown to you; `auto_approve` on a delegated session defaults to false.
- Delegated runs execute the foreign agent's own tools under its own policy. Review [SECURITY.md](SECURITY.md) before enabling auto-approval.

### Guides

- [Quickstart](docs/quickstart.md) — first session, step by step
- [Operations](docs/operations.md) — health, doctor, recovery
- [Support](docs/support.md) — supported harnesses, limits, known gaps
- [Hosted CLI reference](docs/hosted-cli.md) — capability comparison and prompt syntax

This package is distributed through npm. The GitHub repository is the project page and documentation source, not an installation channel.

### Support the project

The plugin is free to install and use. Nothing here unlocks features; these links are optional.

**Free credits and coding plans (referral links)**

- Freebuff — free coding agent with daily credits: [freebuff.com/?ref=…](https://freebuff.com/?ref=ref-6c980d54-a29a-4270-a160-35f13e62a2ff)
- Zap GLM — GLM coding subscription: [z.ai/subscribe?ic=…](https://z.ai/subscribe?ic=LTWUT4H2RS)

**Donate**

- Ko-fi: [ko-fi.com/shynlee04](https://ko-fi.com/shynlee04)
- Buy Me a Coffee: [buymeacoffee.com/shynlee04l](https://buymeacoffee.com/shynlee04l)

**Watch**

- Video: [youtu.be/tgTFweV7bLo](https://youtu.be/tgTFweV7bLo)
- Channel: [youtube.com/@Elecosys](https://www.youtube.com/@Elecosys)

Project page: [hivemind-portal.vercel.app](https://hivemind-portal.vercel.app/vi)

Referral links and donations never affect what the plugin does. Referral sign-ups benefit the author; the plugin works the same without them.

## Tiếng Việt

Cho agent OpenCode của bạn một đồng nghiệp. Plugin mở phiên Devin hoặc Antigravity thật ngay trong TUI khi bạn muốn xem, và giao việc chạy nền khi bạn không ngồi đó.

Cài từ npm, chạy thiết lập một lần, rồi làm việc bình thường.

### Cài đặt

```bash
opencode plugin add hmoc-steward-acp@0.2.1
```

Sau đó nạp lại OpenCode. Plugin chỉ nạp lúc khởi động, nên phiên đang chạy vẫn giữ code cũ cho tới khi bạn khởi động lại.

Chỉ dùng trong một dự án: thêm gói vào mảng `plugins` trong `opencode.json` của dự án đó, bỏ qua lệnh cài toàn cục.

### Thiết lập (một lần)

```text
/hivemind-setup
```

Agent kiểm tra thiết lập đã lưu trước. Nếu đã ổn nó dừng ngay — không hỏi, không ghi, không có nghi thức đầu phiên. Nếu còn thiếu, nó hỏi từng bước bằng công cụ `question` của OpenCode:

1. **Bật harness nào**, và thứ tự dự phòng. Devin và Antigravity có sẵn; harness khác bị từ chối chứ không âm thầm bỏ qua.
2. **Mỗi harness dùng model nào.** Giữ mặc định của harness, hoặc chọn `<model>` hay `<model>#<variant>` từ catalog mà harness công bố.

Câu trả lời được lưu vào tài liệu `config/delegate` theo phạm vi plugin của OpenCode. Các phiên sau không phải thiết lập lại, trừ khi bạn yêu cầu đổi:

```text
/hivemind-setup đổi antigravity sang model mặc định
```

Nó chỉ mở lại đúng bước liên quan và giữ nguyên phần còn lại.

### Dùng hằng ngày

| Làm thế này | Nhận được |
|---|---|
| `/devin` hoặc `/antigravity` | Phiên agent thật mở trong TUI, có tiếp tục phiên cũ, mention tệp, slash command, quyền, và bộ chọn model/mode/thinking. |
| Bảo agent gọi `hivemind-delegate` | Việc được giao cho harness trong một phiên con thật. Chế độ foreground chờ kết quả; background trả về ngay rồi báo sau. |
| `/devin_delegate <task>` | Cùng việc giao đó, qua lệnh thay vì gọi công cụ. |

Phiên, lịch sử và quyền nằm trong thế giới của agent gốc. Plugin này là cầu nối, không phải agent thứ hai.

### Kiểm tra hoặc sửa

```text
/hivemind-setup health
```

Một lần đọc tĩnh: `ready`, `action-required`, hoặc `blocked`, kèm đúng một việc cần làm tiếp. Không khởi động engine.

`hivemind-doctor` đi xa hơn khi bạn thật sự muốn liên hệ engine: mặc định chỉ bắt tay `initialize`, độ sâu `session` chỉ khi bạn đồng ý, và `install` / `sign-in` chỉ sau khi bạn duyệt.

### Yêu cầu

- **OpenCode V2** (`opencode` v2.x trên PATH). Host V1 không nạp được entry TUI.
- **Devin:** CLI `devin` trên PATH, hoặc `DEVIN_BIN` trỏ tới nó, đã đăng nhập bằng `devin auth login`.
- **Antigravity:** ACP server chính thức của Antigravity. Plugin có thể cài bản đã ghim sau khi bạn duyệt, và đăng nhập qua ACP `authenticate`.

Plugin chỉ kiểm tra. Nó không tự cài hay tự đăng nhập.

### Nếu plugin không nạp được

OpenCode cache bản cài plugin npm trong `~/.cache/opencode/npm/`. Sau khi nâng cấp, nếu lỗi vẫn nhắc tới tệp của phiên bản cũ, hãy xoá thư mục cache của gói đó rồi khởi động lại. Bản cache cũ vẫn chạy code cũ bất kể registry phục vụ gì.

Muốn tắt plugin mà không gỡ cài, tắt theo plugin id:

```json
{ "plugins": ["-hivemind-steward-oc-devin"] }
```

### An toàn

- Cấu hình không nhận credential. Đừng dán token, khoá hay mật khẩu vào câu trả lời thiết lập hoặc tuỳ chọn plugin.
- Prompt quyền từ agent gốc được hiển thị cho bạn; `auto_approve` trên phiên được giao mặc định là false.
- Phiên được giao chạy công cụ của agent gốc theo chính sách của nó. Đọc [SECURITY.md](SECURITY.md) trước khi bật tự động duyệt.

### Hướng dẫn

- [Bắt đầu nhanh](docs/quickstart.vi.md) — phiên đầu tiên, từng bước
- [Vận hành](docs/operations.vi.md) — health, doctor, khôi phục
- [Hỗ trợ](docs/support.vi.md) — harness hỗ trợ, giới hạn, khoảng trống đã biết
- [Tham chiếu Hosted CLI](docs/hosted-cli.md) — so sánh năng lực và cú pháp prompt

Gói này phát hành qua npm. Kho GitHub là trang dự án và nguồn tài liệu, không phải kênh cài đặt.

### Ủng hộ dự án

Plugin miễn phí để cài và dùng. Những link dưới đây là tuỳ chọn, không mở khoá tính năng nào.

**Ưu đãi và gói lập trình (link giới thiệu)**

- Freebuff — coding agent miễn phí kèm credit hằng ngày: [freebuff.com/?ref=…](https://freebuff.com/?ref=ref-6c980d54-a29a-4270-a160-35f13e62a2ff)
- Zap GLM — gói thuê bao GLM: [z.ai/subscribe?ic=…](https://z.ai/subscribe?ic=LTWUT4H2RS)

**Ủng hộ tác giả**

- Ko-fi: [ko-fi.com/shynlee04](https://ko-fi.com/shynlee04)
- Buy Me a Coffee: [buymeacoffee.com/shynlee04l](https://buymeacoffee.com/shynlee04l)

**Xem**

- Video: [youtu.be/tgTFweV7bLo](https://youtu.be/tgTFweV7bLo)
- Kênh: [youtube.com/@Elecosys](https://www.youtube.com/@Elecosys)

Trang dự án: [hivemind-portal.vercel.app](https://hivemind-portal.vercel.app/vi)

Link giới thiệu và ủng hộ không làm thay đổi cách plugin hoạt động. Đăng ký qua link giới thiệu mang lại lợi ích cho tác giả; plugin vẫn chạy y như vậy nếu không dùng.
