# @vasilvestre/opencode-hashline-edit 1#VQ
 2#MS
LINE#ID edit tool for OpenCode v2 — safe, hash-validated line-based file editing. 3#HV
 4#ZJ
## Features 5#BQ
 6#NB
- **LINE#ID addressing**: Each line identified by `line#hash` (e.g., `42#ZP`), configurable 2-4 chars 7#QY
- **Context-aware hash validation**: Hash includes neighbor lines — prevents stale edits even with identical content 8#RQ
- **Four operations**: `replace` (single/range), `append`, `prepend`, `replace_text` (exact substring) 9#ZM
- **Atomic batching**: Multiple edits sorted bottom-up, applied atomically 10#YJ
- **Safety**: Overlap detection, no-op detection (3-strike loop guard), deduplication 11#JK
- **Chained edits**: Fresh anchors returned after successful edit — no re-read needed 12#TP
- **Formatters**: Auto-runs configured formatters after write 13#WQ
- **OpenCode v2 native**: Uses `/api/fs/read` and `/api/experimental/fs/write` 14#XV
 15#QW
## Installation 16#BZ
 17#QZ
```bash 18#YT
npm install @vasilvestre/opencode-hashline-edit 19#HZ
``` 20#PJ
 21#TT
## Usage 22#JX
 23#WK
### As an OpenCode plugin (recommended — direct use) 24#PZ
 25#JV
Add it to your OpenCode config, the `hashline_edit` tool becomes available to the AI automatically: 26#ZB
 27#KQ
```jsonc 28#MR
// opencode.jsonc (project) or ~/.config/opencode/opencode.jsonc (global) 29#SJ
{ 30#BJ
  "$schema": "https://opencode.ai/config.json", 31#QQ
  "plugins": ["@vasilvestre/opencode-hashline-edit"] 32#XM
} 33#KB
``` 34#PQ
 35#TT
The AI will read files with `LINE#ID` anchors and call the tool on its own. 36#BH
 37#ZP
--- 38#VQ
 39#PB
### As a library (embed in your own plugin) 40#ZW
 41#XT
If you're writing **your own OpenCode plugin** and want to include this tool: 42#QP
 43#WH
```typescript 44#PX
import { createHashlineEditTool } from "@vasilvestre/opencode-hashline-edit" 45#PW
import { definePlugin } from "@opencode/plugin" 46#SB
 47#BV
export default definePlugin({ 48#NM
  name: "my-plugin", 49#ZX
  tools: { 50#HS
    hashline_edit: createHashlineEditTool(), 51#VY
  }, 52#XX
}) 53#MS
``` 54#WM
 55#TT
## LINE#ID Format 56#YQ
 57#HB
When you read a file, each line shows its LINE#ID: 58#PX
``` 59#MS
const x = 1          1#ZP 60#ZS
function foo() {     2#AB 61#QH
  return x + 1       3#CD 62#SX
}                    4#EF 63#QZ
``` 64#WQ
 65#TT
## Edit Examples 66#YK
 67#ZX
### Replace single line 68#PK
```json 69#WP
{ "op": "replace", "pos": "2#AB", "lines": "function bar() {" } 70#NP
``` 71#PK
 72#TT
### Replace range 73#VT
```json 74#PM
{ "op": "replace", "pos": "2#AB", "end": "3#CD", "lines": ["function bar() {", "  return 42", "}"] } 75#VY
``` 76#TM
 77#TT
### Append after line 78#SS
```json 79#QH
{ "op": "append", "pos": "4#EF", "lines": "// new comment" } 80#SR
``` 81#VK
 82#TT
### Prepend before line 83#PJ
```json 84#WV
{ "op": "prepend", "pos": "1#ZP", "lines": "// header comment" } 85#MY
``` 86#NM
 87#TT
### Replace exact text (no anchors needed) 88#QJ
```json 89#XZ
{ "op": "replace_text", "oldText": "function foo()", "newText": "function bar()" } 90#NX
``` 91#BH
 92#TT
### Delete file 93#NT
```json 94#BM
{ "delete": true, "edits": [] } 95#HJ
``` 96#PV
 97#TT
### Configure hash length (2-4 chars) 98#KM
```json 99#RT
{ "hashLength": 3, "edits": [...] } 100#PV
``` 101#MJ
 102#TT
## Safety Features 103#KR
 104#RH
- **Context-aware hash validation**: Hash includes prev/next lines — identical lines in different contexts get different hashes 105#TN
- **Overlap detection**: Rejects overlapping ranges 106#KZ
- **Deduplication**: Removes duplicate edits automatically 107#VN
- **No-op detection**: Reports edits that produce no changes; 3 consecutive no-ops throws error 108#VQ
- **Bottom-up application**: Line numbers stay valid during batch edits 109#YT
- **Strict patch content**: Rejects diff markers or display prefixes 110#VR
 111#TM
## Chained Edits 112#XQ
 113#NP
After a successful edit, the result includes fresh LINE#ID anchors for the changed region: 114#QM
``` 115#XY
Updated src/file.ts 116#PS
--- Fresh Anchors --- 117#QB
function bar() { 118#ZP
  return 42 119#KT
} 120#WS
``` 121#PQ
Use these fresh anchors directly in the next edit call without re-reading. 122#SH
 123#RR
## API 124#JV
 125#PZ
### `createHashlineEditTool(pluginCtx?)` 126#SP
Creates the tool definition for OpenCode plugin system. 127#VV
 128#JQ
```typescript 129#PX
import { createHashlineEditTool } from "@vasilvestre/opencode-hashline-edit" 130#PW
 131#RK
const tool = createHashlineEditTool({ 132#BS
  client: opencodeApiClient, // for formatters 133#KN
}) 134#TS
``` 135#WM
 136#TT
### Types 137#HM
```typescript 138#BS
import type { RawHashlineEdit, HashlineEdit, HashlineApplyReport } from "@vasilvestre/opencode-hashline-edit" 139#MV
``` 140#RH
 141#TT
### Configuration Options (via args) 142#WR
- `hashLength`: 2-4 (default: 2) — characters per line hash 143#HJ
 144#HH
## License 145#YX
 146#JK
MIT License 147#YY