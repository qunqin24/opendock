# opencode-dpsk-search

Removes OpenCode's built-in `websearch` tool and adds a `dpsksearch` tool backed by DeepSeek's server-side web search.

## Install

```bash
opencode plugin add @liyang8246/opencode-dpsk-search
# or from GitHub:
opencode plugin add github:liyang8246/opencode-dpsk-search
```

## Usage

Set `DEEPSEEK_API_KEY` in your environment.

The model calls `dpsksearch` with a `question`:

```text
dpsksearch {"question": "深圳今天天气怎么样"}
```

Pass a full natural-language sentence, not keyword lists.

## Cost

DeepSeek bills web search by tokens only — no per-search fee; one search is one model turn on `deepseek-flash`. Measured 2026-10-09 at off-peak rates, 5 runs per query, cheapest dropped:

| Query | Avg searches | Cost per call |
| --- | --- | --- |
| 深圳今天天气 | 1.0 | ¥0.008 |
| 2026 诺贝尔物理学奖得主 | 1.8 | ¥0.011 |
| Python 最新稳定版本 | 1.8 | ¥0.020 |
| 败犬女主所有主要声优的出生年月 | 7.0 | ¥0.032 |
| 各省中 GDP 倒数第一的地级市 | 5.2 | ¥0.039 |
| Minecraft 每个亡灵生物加入游戏的版本时间 | 4.0 | ¥0.072 |

Typical: **¥0.01–0.07 per call** (~$0.0015–0.010); heavy fan-out queries (7–8 searches) reach ~¥0.09. Complex queries cost more because the model fans out into multiple searches (avg 4.4, up to 8 observed). Peak hours (Beijing Mon–Fri 9:00–12:00, 14:00–18:00) are 2×.

## License

MIT
