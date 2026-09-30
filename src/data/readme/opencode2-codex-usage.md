# Codex usage cho OpenCode 2

Theo dõi quota subscription của **mọi account OpenAI đã lưu qua `/connect` trên server OpenCode hiện tại**, bao gồm account không active. API key được liệt kê là không hỗ trợ quota subscription. Không cần copy token hay đọc SQLite thủ công.

## Cài qua npm trong OpenCode

Yêu cầu OpenCode **V2**; plugin đối chiếu/typecheck với SDK **2.0.19**. Không dùng cho V1; chưa xác nhận các bản V2 khác.

Sau khi package được publish, thêm vào `~/.config/opencode/opencode.jsonc` (hoặc `opencode.jsonc` của project), giữ nguyên các cấu hình khác:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-codex-usage@0.1.7"]
}
```

OpenCode tự cài package npm và load server entrypoint (`index.ts`) cùng export `./tui` (`tui.js` đã biên dịch sẵn); không cần `npm install -g`. Nếu đang dùng bản local, đóng OpenCode và di chuyển thư mục `plugins/codex-usage` ra ngoài thư mục discovery `plugins/` để tránh load trùng. Không cài cùng plugin ở cả global và project.

Restart service bằng `opencode service restart`, mở lại TUI rồi chạy `/codex-usage`.

`@opencode/plugin@2.0.19` là runtime dependency. OpenTUI và Solid là peer dependencies, đồng thời nằm trong devDependencies phục vụ kiểm tra. Giữ Solid **1.9.12** để khớp `@opentui/solid@0.5.12`.

`tui.tsx` được biên dịch sẵn thành `tui.js` bằng Babel (`@babel/preset-typescript` + `babel-preset-solid` với `moduleName: "@opentui/solid"`, `generate: "universal"`). Loader TUI của OpenCode chỉ áp dụng OpenTUI Solid transform cho file **ngoài** `node_modules`, nên nếu phát hành JSX thô, Bun sẽ rơi về transform kiểu React và báo `Cannot find package 'react'` khi load plugin.

## Phát hành tự động trên GitHub

Workflow có sẵn tại `.github/workflows/publish.yml`. Push **tag** `v*.*.*` (không phải branch) sẽ:

1. Kiểm tra tag là `vX.Y.Z` và khớp version trong `package.json`.
2. Cài bằng lockfile, chạy tests, typecheck và biên dịch `tui.tsx` thành `tui.js` (`npm run build`), rồi đóng gói `.tgz`.
3. Cài `.tgz` vào thư mục tạm, smoke-test **cả** server entrypoint và TUI entrypoint đã biên dịch (test loader transpile TS vì Node không strip TS trong `node_modules`), đồng thời kiểm tra source/exports và `tui.js` không còn tham chiếu React.
4. Lưu `.tgz` trong Actions artifacts và publish chính gói đã kiểm tra lên npm.

`npm run build` gồm `typecheck` và `build:tui`; `prepack` chạy build nên `tui.js` luôn được tạo trước khi `npm pack`. Workflow chạy Node 26.4.0 và npm 11.5.1 (hỗ trợ OIDC). Repository metadata được lấy từ repository GitHub đang chạy, không cần sửa placeholder URL. Artifact không phải GitHub Release.

### Thiết lập một lần

1. Tạo repository GitHub **public**, push source và bật GitHub Actions. Đặt thư mục này ở root của repo. `.gitignore` loại `node_modules`, `.tgz`, `.env` và `.npmrc` khỏi commit.
2. Tạo tài khoản npm, bật 2FA, kiểm tra quyền sở hữu/tên package bằng `npm view opencode2-codex-usage`. Nếu tên thuộc người khác, đổi `name` rồi chạy `npm install --package-lock-only --ignore-scripts` và sửa tên trong hướng dẫn cài.
3. Publish **lần đầu tại local**. Thay `YOUR_USER/YOUR_REPO` bằng repo thật, commit metadata và lockfile cùng source:

```sh
npm pkg set repository.type=git repository.url="git+https://github.com/YOUR_USER/YOUR_REPO.git"
npm install --package-lock-only --ignore-scripts
npm login
npm publish --access public
```

   Lệnh publish chạy build/typecheck và tests trước khi phát hành. Làm theo yêu cầu OTP/2FA của npm. Không push tag `v0.1.6` sau đó vì npm không cho publish lại version đã tồn tại.
4. Trong repo GitHub → **Settings → Environments → New environment**, tạo environment tên chính xác **npm**. Không cần thêm secrets. Nếu cấu hình deployment rules, cho phép tag `v*.*.*`. Không thêm required reviewers nếu muốn publish hoàn toàn tự động.
5. Sau khi publish đầu thành công, vào npm → package **opencode2-codex-usage → Settings → Trusted Publisher**, chọn **GitHub Actions**:
   - Organization/user: GitHub owner của repo.
   - Repository: tên repo, không kèm owner.
   - Workflow filename: **publish.yml** (không phải đường dẫn đầy đủ).
   - Environment name: **npm** (khớp `environment: npm` trong workflow).
   - Allowed actions: bật **npm publish** để cho phép publish trực tiếp, không chỉ staged publishing.
6. Các tag sau dùng OIDC, không cần npm token. Nếu đã tạo secret `NPM_TOKEN` từ hướng dẫn cũ, xóa secret và thu hồi token trên npm. Có thể bật **Require two-factor authentication and disallow tokens** trong Publishing access.

**Chỉ tạo environment trên GitHub chưa đủ để xác thực npm**: phải thiết lập Trusted Publisher trên npm với owner, repository, workflow và environment khớp chính xác.

### Các lần cập nhật sau

Tăng version và lockfile trước khi commit. Ví dụ từ 0.1.6 lên 0.1.7:

```sh
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: release 0.1.7"
git push origin HEAD
git tag v0.1.7
git push origin v0.1.7
```

Commit cả thay đổi source liên quan trước khi tag. Người dùng pin version cần cập nhật config. Không tái sử dụng version đã publish. Theo dõi tab **Actions → Publish npm package**; `.tgz` nằm ở mục **Artifacts**. Nếu lỗi OIDC, kiểm tra owner/repo, filename `publish.yml`, environment `npm`, quyền `npm publish` và `id-token: write`.

## Hiển thị và refresh

- Sidebar: tất cả saved accounts; dấu `●` chỉ account active.
- `/codex-usage`: mở bản chi tiết; `/codex-usage-refresh`: yêu cầu cập nhật.
- Server lấy usage mỗi **60 giây**; TUI đọc cache mỗi 5 giây, không gọi OpenAI mỗi 5 giây.
- Khi TUI nhận `session.execution.succeeded` hoặc `session.execution.failed`, refresh sau 1,5 giây. Thay đổi credential cũng kích hoạt refresh.
- Server gộp request trùng nhau, cách nhau tối thiểu 5 giây. Account lỗi có backoff tối thiểu 60 giây; HTTP 429 tôn trọng `Retry-After` tối đa 1 giờ.
- Xanh: bình thường; vàng: từ 70% used hoặc lỗi/stale; đỏ: từ 90% used.
- Mỗi account: header `● label [plan]`; mỗi window hai dòng `weekly · 3d 22h 07:30` và `[████░░░░░░░░] 5% used`; cuối danh sách là `Updated HH:MM` (giờ local 24h). `[status]` chỉ hiện khi khác `ok`.
- Thời lượng ghi gọn 1–2 đơn vị (`5d 4h`, `5h 15m`, `34m`); window 7 ngày hiển thị là `weekly`.
- Window lấy duration thực tế từ API, kể cả additional rate limits; không mặc định luôn có 5h + weekly. Reset countdown không đồng nghĩa quota đã reset: phải chờ dữ liệu mới.
- Dialog là snapshot lúc mở; mở lại để cập nhật. Sidebar tự cập nhật.

Đây là **quota account-wide**, có thể bao gồm usage từ Codex CLI/app/công cụ khác dùng cùng subscription. Không phải số token tiêu thụ riêng trong OpenCode, không phải hóa đơn API, không phải bảng lịch sử lâu dài. Không cộng quota giữa các account vì quota độc lập.

## Giới hạn và xử lý lỗi

- `no-quota-data`: API chưa trả window hợp lệ; không suy diễn thành 0%.
- `stale`: lần refresh mới thất bại, vẫn hiển thị snapshot thành công gần nhất; dialog ghi thời điểm thành công.
- `HTTP 401/403`: kiểm tra account bằng `/connect`; reconnect nếu cần. Plugin giao việc refresh OAuth cho resolver của OpenCode, không tự xoay refresh token.
- `Usage plugin unavailable`: server entrypoint chưa load, cấu hình sai location hoặc SDK không tương thích.
- HTTP 500 "rpc.invalid_output": snapshot trả về chứa giá trị không hợp lệ JSON (key mang `undefined`). Snapshot được lọc ở biên RPC và không còn tạo key `undefined`.
- `Keymap.Provider is missing`: layer keymap chỉ đăng ký được trong render scope (component), không đăng ký được trong `setup()`. Bản này đăng ký qua slot `app`.
- Remote server: cài server plugin trên remote server và bảo đảm terminal load TUI entrypoint. Chỉ cài local CLI plugin sẽ không đọc được accounts trên remote.
- Chỉ bao phủ native saved connections thuộc integration `openai`. Account chỉ nằm trong pool riêng của plugin multi-auth bên thứ ba hoặc trong Codex CLI nhưng chưa connect vào OpenCode sẽ không xuất hiện.
- Native resolver xử lý token refresh; có thể phát sinh cập nhật credential bình thường của OpenCode. Plugin không activate/switch/logout account và không sửa SQLite trực tiếp.
- Backend usage endpoint là endpoint nội bộ được Codex dùng, có thể đổi hoặc từ chối truy cập. Plugin này không đảm bảo availability của endpoint.
- Polling tuần tự tránh burst; có nhiều account hoặc mạng chậm thì một lượt refresh có thể lâu hơn 60 giây. Một request usage timeout sau 12 giây; native credential resolution do OpenCode quản lý.
- Nhiều project/server instance có thể polling riêng. Không có global cross-process deduplication.

## Credential và dữ liệu

Access token chỉ dùng ở server để GET `https://chatgpt.com/backend-api/wham/usage`, kèm `ChatGPT-Account-Id`. Không theo redirect, không có URL tùy chỉnh để gửi token nơi khác. RPC/UI/cache của plugin chỉ chứa label, credential ID, trạng thái và quota đã chọn lọc; không chứa access/refresh token hay raw error body. Không ghi lịch sử quota ra đĩa và không gửi prompt/model request để đo usage.

Account label hiển thị nguyên dạng (loại control characters). Tránh chụp màn hình label chứa thông tin riêng tư nếu không muốn chia sẻ.

## Gỡ

Xóa entry `opencode2-codex-usage` khỏi mảng `plugins`, rồi restart OpenCode/server. Với bản local, di chuyển thư mục `plugins/codex-usage` ra ngoài `plugins/`. Các account và config khác giữ nguyên.

## Kiểm tra của bản phát hành

- Workflow kiểm tra package đã đóng gói qua clean install, import smoke test **server và TUI entrypoint**, và xác nhận `tui.js` không còn React, không chỉ workspace source.
- TypeScript strict typecheck với `@opencode/plugin@2.0.19`.
- 14 automated tests: parse quota, reset, account identity, HTTP/backoff, fixed destination, mọi account, API key, lỗi độc lập, stale data, account deletion, JSON-safe RPC, layout và không lộ token qua snapshot.
- Test server setup dùng mock integration API và mock HTTP. Packaged test import cả TUI entrypoint nên bắt được lỗi transform React, nhưng **chưa render end-to-end trong TUI thật hoặc với subscription của bạn.** Typecheck thành công không thay thế kiểm chứng runtime.
- OpenTUI yêu cầu Bun >=1.3 / Node >=26.4. CI dùng Node 26.4.0; smoke test chỉ import entrypoint, không render TUI thật.

Để kiểm tra lại tại thư mục plugin đã cài:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack
npm run test:package -- ./opencode2-codex-usage-0.1.7.tgz
```

## Nguồn đối chiếu (2026-09-29)

- https://opencode.ai/v2/docs/cli/providers — native multi-account + SQLite.
- https://opencode.ai/v2/docs/build/plugins/ — integration.get và connection.resolve.
- https://opencode.ai/v2/docs/build/plugins/cli/ — TUI, sidebar slot, slash command, lifecycle.
- https://opencode.ai/v2/docs/build/plugins/rpc/ — server/TUI RPC.
- https://opencode.ai/v2/docs/cli/plugins — discovery paths.
- npm @opencode/plugin 2.0.19 và dependency typings.
- https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client/rate_limit_resets.rs — passive GET usage.
- https://github.com/openai/codex/blob/main/codex-rs/app-server/tests/suite/v2/rate_limits.rs — quota response fixtures.
