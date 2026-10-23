# opencode-usage-total 🧠

Seguimiento de modelos y costos por agente en la barra lateral de OpenCode.

[![version](https://img.shields.io/badge/version-0.3.0-muted)](https://www.npmjs.com/package/opencode-usage-total)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Plugin de TUI para [OpenCode](https://opencode.ai) que muestra cada modelo usado por el agente principal y sus sub-agentes, con el costo acumulado por modelo y un total de sesión que incluye el trabajo de los sub-agentes.

> [!NOTE]
> English: [README.md](README.md)

## Características

- **Desglose por agente** — lista el agente principal y cada sub-agente con el modelo y el costo acumulado de cada uno
- **Total del árbol** — el encabezado suma la sesión raíz y todos los sub-agentes, para ver el costo real de la sesión
- **Colapsable** — alterna la sección con `Alt+M`; el estado persiste entre reinicios
- **Acumulación por sesión** — los costos se acumulan durante toda la sesión
- **Atribución al padre** — los modelos de sub-agentes se atribuyen a su sesión padre
- **Persistencia vía KV** — sobrevive reinicios y cambios de sesión

> [!WARNING]
> El conteo de tokens está oculto hasta que la métrica sea exacta. La barra lateral actualmente muestra solo el **costo**; los datos de tokens se siguen recolectando internamente (en KV) y se mostrarán cuando puedan contarse de forma confiable.

## Instalación

```bash
opencode plugin -g opencode-usage-total
```

El comando registra tanto la entrada del server como la de la barra lateral del TUI en su configuración global. Reinicie opencode después.

## Actualización

```bash
rm -rf ~/.cache/opencode/packages/opencode-usage-total@latest
opencode plugin -g opencode-usage-total
```

## Uso

Inicia una sesión en OpenCode y abre la barra lateral: la sección **🧠 Models** lista cada modelo usado en la sesión actual, con el costo acumulado por modelo y un total que incluye el trabajo de los sub-agentes.

Presiona `Alt+M` para colapsar o expandir la lista.

![sidebar](https://github.com/AlonsoSG0/opencode-usage-total/raw/main/image.png)

## Requisitos

- OpenCode con soporte de TUI (API de plugins ≥ 1.14.50)

## Desarrollo

```bash
npm install
npm run build   # bundle con tsup
npm test        # suite de vitest
```

MIT
