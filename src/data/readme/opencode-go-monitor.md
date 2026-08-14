# opencode-go-monitor

Plugin para OpenCode que monitorea el consumo del plan Go en tiempo real.

Muestra barras de progreso, dólares usados/restantes y tiempo hasta el reinicio de la ventana de 5 horas. Incluye alertas automáticas al 70%, 90% y 100% de uso.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `/go-quota` | Muestra uso actual del plan Go (ventana 5h, semanal, mensual) |
| `/go-limits` | Muestra límites del plan y modelos incluidos |
| `/go-refresh` | Fuerza actualización de los datos |
| `/go-models` | Lista todos los modelos disponibles del plan Go |

## Instalación

### Requisitos

- [Bun](https://bun.sh) instalado
- OpenCode v1.14+ instalado

### Opción 1: npm (cuando esté publicado)

```json
{
  "plugin": ["opencode-go-monitor"]
}
```

### Opción 2: directo desde GitHub

```json
{
  "plugin": ["git+https://github.com/dccaceres/opencode-go-monitor.git"]
}
```

### Opción 3: local (desarrollo / clonado)

```bash
git clone https://github.com/dccaceres/opencode-go-monitor.git
cd opencode-go-monitor
bun install
```

```json
{
  "plugin": ["/ruta/completa/a/opencode-go-monitor"]
}
```

### Verificar que compila

```bash
bun typecheck
```

### Desarrollo

```bash
bun run dev
```

## Configuración

El plugin necesita dos variables de entorno para autenticarse contra la API de OpenCode:

```bash
export OPENCODE_GO_WORKSPACE_ID="tu-workspace-id"
export OPENCODE_GO_AUTH_COOKIE="tu-auth-cookie"
```

### Cómo obtener las credenciales

1. Andá a [opencode.ai](https://opencode.ai) e iniciá sesión
2. Abrí DevTools (F12) → Application → Cookies → `opencode.ai`
3. Copiá el valor de la cookie `auth`
4. El Workspace ID está en la URL: `https://opencode.ai/workspace/[ESTE_ID]/go`

## Uso

Con las credenciales configuradas y OpenCode corriendo:

```
/go-quota
```

El AI va a ejecutar la tool y mostrar algo como:

```
🟢 ██████░░░░ 60%  5h  $7.20 / $12  ·  2h 30m
🟡 ██████░░░░ 60%  Sem $18.00 / $30  ·  $12.00 libres
🔴 ███████░░░ 70%  Mes $42.00 / $60  ·  $18.00 libres
```

### Alertas automáticas

Cada 5 minutos el plugin verifica el consumo en background. Si se supera el 70%, 90% o 100% en alguna ventana, muestra un toast de notificación.

## Límites del plan Go

| Ventana | Límite | Período |
|---------|--------|---------|
| 5 horas | $12.00 | Cada 5 horas de uso |
| Semanal | $30.00 | 7 días corridos |
| Mensual | $60.00 | Mes calendario |

### Modelos incluidos

> ℹ️ Modelos disponibles hasta ahora. Pueden variar según el plan Go.

- MiniMax M2.7, M2.5
- Kimi K2.6, K2.5
- GLM 5.1, 5
- DeepSeek V4 Pro, V4 Flash
- Qwen 3.6 Plus, 3.5 Plus
- Mimo V2 Pro, V2 Omni, V2.5 Pro, V2.5
- Total: 14 modelos

> Usá `/go-models` en OpenCode para ver la lista actualizada en tiempo real.

## Estructura del proyecto

```
opencode-go-monitor/
├── src/
│   ├── index.ts      # Entry point, comandos, tools, monitoreo
│   ├── monitor.ts    # Fetch desde API + fallback HTML
│   ├── notifier.ts   # Alertas de thresholds
│   ├── commands.ts   # Helpers
│   └── types.ts      # Interfaces TypeScript
├── dev.ts            # Script de desarrollo
├── package.json
├── tsconfig.json
└── README.md
```

## Desarrollo

```bash
# Typecheck
bun typecheck

# Correr OpenCode con el plugin cargado
bun run dev
```

## API

El plugin obtiene los datos desde:

```
GET https://console.opencode.ai/zen/go/v1/usage
Cookie: auth=VALOR
```

Respuesta:
```json
{
  "rolling": { "status": "ok", "usagePercent": 45, "resetsInSeconds": 12345 },
  "weekly": { "status": "ok", "usagePercent": 30, "resetsInSeconds": 123456 },
  "monthly": { "status": "ok", "usagePercent": 15, "resetsInSeconds": 1234567 }
}
```

## Licencia

MIT
