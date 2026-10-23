# opencode-dashscope-imagegen

[English](README.md) | **Русский**

> Генерация изображений по текстовому описанию для [OpenCode](https://opencode.ai) через **Alibaba DashScope** —
> модели `qwen-image-2.0`, `qwen-image-3.0` и `wan2.7-image` доступны кодинг-агенту
> как инструмент `image_generate`.

[![npm version](https://img.shields.io/npm/v/opencode-dashscope-imagegen)](https://www.npmjs.com/package/opencode-dashscope-imagegen)
[![npm downloads](https://img.shields.io/npm/dm/opencode-dashscope-imagegen)](https://www.npmjs.com/package/opencode-dashscope-imagegen)
[![license](https://img.shields.io/npm/l/opencode-dashscope-imagegen)](LICENSE)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-4f46e5)](https://opencode.ai/docs/plugins/)

![Example output: generated with qwen-image-2.0](docs/example.png)

## Возможности

- Добавляет любой OpenCode-агенту один инструмент `image_generate` — без дополнительного сервера, без настройки MCP.
- Использует нативный мультимодальный endpoint DashScope (OpenAI-совместимый
  маршрут `/v1/images/generations` DashScope не отдаёт).
- Сохраняет PNG на диск и возвращает абсолютный путь, поэтому vision-модели
  (`qwen3-vl-plus`, `kimi-k3`, …) могут разобрать результат обычными image-вложениями.
- Работает с любой text-to-image моделью DashScope, включая серию Wan (`wan2.7-image`).

## Поддерживаемые модели

| Модель                     | Примечание                           |
| -------------------------- | ------------------------------------ |
| `qwen-image-2.0` (default) | быстрая универсальная генерация      |
| `qwen-image-3.0`           | новое поколение Qwen-Image            |
| `wan2.7-image`             | модели Wan (Tongyi Wanxiang)         |

## Требования

- Установленный [OpenCode](https://opencode.ai).
- API-ключ DashScope из [Alibaba Cloud Model Studio](https://dashscope.console.aliyun.com/)
  (консоль Bailian). Порядок поиска ключа:
  1. переменная окружения `DASHSCOPE_IMAGEGEN_API_KEY`
  2. переменная окружения `DASHSCOPE_API_KEY`
  3. `apiKey` любого провайдера `dashscope*` в вашем `opencode.json`

## Установка

Добавьте имя npm-пакета в ваш `opencode.json` — OpenCode установит его при следующем запуске:

```json
{
  "plugin": ["opencode-dashscope-imagegen"]
}
```

### Локальная разработка

Чтобы запускать плагин из локального клона вместо npm, укажите путь к директории
плагина и один раз установите его зависимости
(`@opencode-ai/plugin` должен резолвиться из собственной директории плагина):

```json
{
  "plugin": ["file:///path/to/opencode-dashscope-imagegen"]
}
```

```bash
npm install
npm run build   # tsc → dist/ (js + d.ts)
```

## Использование

### Example (replace with a real one)

```bash
npm start
```


### Example (replace with a real one)

```bash
npm start
```


Просто попросите агента: _"сгенерируй изображение маяка на закате"_ — он вызовет инструмент:

| Аргумент      | По умолчанию     | Описание                                                  |
| ------------- | ---------------- | --------------------------------------------------------- |
| `prompt`      | обязателен       | описание изображения                                      |
| `model`       | `qwen-image-2.0` | любая text-to-image модель DashScope                      |
| `size`        | `1024*1024`      | `W*H` со звёздочкой, например `1280*720`                  |
| `output_path` | авто             | абсолютный путь; по умолчанию `<config>/gen-images/gen-<ts>.png` |

Переопределение выходной директории: переменная окружения `DASHSCOPE_IMAGEGEN_DIR`.

## Устранение проблем

- **`InvalidApiKey` / 401** — ключ не найден; проверьте порядок поиска выше.
- **Инструмент не появляется** — перезапустите OpenCode после правки `opencode.json`; плагины загружаются на старте.
- **`size` отклоняется** — используйте формат `W*H` со `*` (звёздочкой), а не `x`: `1024*1024`.
- **Модель не поддерживается** — аккаунт владельца ключа должен иметь включённую модель в Model Studio.

## Связанные ссылки

- [Документация плагинов OpenCode](https://opencode.ai/docs/plugins/)
- [Экосистема OpenCode](https://opencode.ai/docs/ecosystem/)
- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)

## Лицензия

[MIT](LICENSE)

## Кому это нужно

<!-- TODO: who is this for? -->

## Сценарии использования

<!-- TODO: 3-7 concrete use cases -->

## Почему этот вариант

<!-- TODO: 2-4 differentiators, with numbers -->
