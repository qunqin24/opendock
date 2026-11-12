# Melete para Magpie

[English](README.md) | [简体中文](README.zh-CN.md) | Español

Revisa cómo trabajáis tú y la IA.

Elige DSH o Codex en Magpie e inicia una revisión. El agente elegido consulta su propio historial mediante herramientas restringidas; Melete presenta las observaciones en tarjetas y comprueba sus citas. No necesitas seleccionar sesiones individuales ni activar la grabación de conversaciones de Magpie.

Actualmente cada revisión usa una sola fuente, DSH o Codex. Está previsto añadir otros agentes y revisiones combinadas en futuras actualizaciones.

## Instalación y uso

Instala desde npm:

```sh
magpie plugin add magpie-plugin-melete
```

También puedes instalar una copia de desarrollo local con `magpie plugin add /ruta/a/magpie-plugin-melete`.

Abre **Melete Debrief** en la barra lateral de Magpie, elige un agente y un periodo, escribe una intención si quieres e inicia la revisión. Puedes salir de la página y volver mientras se ejecuta. Detener afecta únicamente a la revisión actual.

Debes tener instalados Magpie y el agente elegido. DSH usa la configuración de modelo de su perfil headless; Codex usa su configuración predeterminada. Melete no las modifica ni necesita una clave API propia. Si la autenticación o la cuota no están disponibles, restablece primero el uso normal del agente.

Se requiere Node.js 24 o posterior; el proceso de complementos de Magpie utiliza Bun. Probado en macOS con Magpie 0.1.3812 y 0.1.3838 y Codex CLI 0.167.0-alpha.3.2. No se han verificado otras plataformas, Magpie remoto ni el acceso desde móviles.

## Datos y tratamiento por el modelo

- Melete no opera servidores, no tiene cuentas y no recopila datos ni telemetría. Su servicio de interfaz solo escucha en `127.0.0.1` (puerto predeterminado 3497).
- Las revisiones consumen la cuota del modelo del agente elegido. El agente envía los fragmentos pertinentes al modelo que tenga configurado; el proveedor y la participación de Magpie dependen de esa configuración. La inferencia no es necesariamente sin conexión.
- Solo se considera la fuente elegida y el periodo solicitado. El agente de revisión no recibe herramientas de terminal, escritura de archivos, navegación web ni delegación; las instrucciones del historial se tratan como material.
- Se incluyen como máximo 24 sesiones recientes y 6.000 caracteres por mensaje. Se omiten archivos de más de 64 MiB y la revisión se detiene tras ocho minutos. El agente decide qué páginas leer. El resultado indica la cobertura, las omisiones y los recortes; no se garantiza cobertura completa.
- DSH lee registros JSONL o zstd de versiones 0/4; Codex lee los registros JSONL accesibles en `sessions` y `archived_sessions`. No se lee historial cifrado ni exclusivo de la nube. Los registros no compatibles se omiten y se indican.
- Las citas deben coincidir con registros realmente leídos. Se excluyen observaciones no verificadas. La explicación que da un agente sobre sí mismo es una lectura posible.

## Guardar, exportar y borrar

Los ajustes, las revisiones, el estado de las tareas, los archivos de ejecución y las exportaciones solicitadas se guardan en `~/.melete/magpie/`, separados de Melete para DSH; normalmente solo el usuario actual puede leerlos.

Desde la página de revisión puedes exportar tarjetas completas a HTML sin conexión o una imagen. Las exportaciones omiten identificadores internos, rutas y contexto completo; revisa el texto antes de compartirlo. Borrar una revisión no borra el historial original. «Borrar todas las revisiones y exportaciones» elimina las de este complemento, no el historial ni los registros de ejecución del agente. Los registros temporales están en `private/` y no se vuelven a leer como historial. Desinstalar no borra automáticamente los archivos del usuario; puedes eliminar la carpeta aparte.

## Interfaz, desarrollo y licencia

La interfaz de tarjetas admite temas claro y oscuro, chino simplificado e inglés. Presenta tu uso de la IA, la conducta de esta y el contexto social, con fuentes, posibles lecturas y una pregunta abierta. Los experimentos requieren una intención. Aún no están implementados la combinación de agentes, la biblioteca de métodos, las cartas privadas ni el uso de conversaciones guardadas de Magpie.

Ejecuta `npm test` para las pruebas automáticas. `node test/real-runtime.mjs dsh` y `node test/real-runtime.mjs codex` usan historiales ficticios, pero llaman a agentes y modelos reales y consumen cuota.

Código: Apache-2.0. El mapa de Melete incluido: CC BY 4.0; consulta [LICENSE](LICENSE) y [NOTICE](NOTICE). Es una versión inicial; la inclusión en la comunidad está pendiente.

## Otras versiones de Melete

- [Melete Skill](https://github.com/yancanny/melete-skill): para herramientas de IA compatibles con habilidades.
- [Melete DSH](https://github.com/yancanny/dsh-plugin-melete): complemento para DeepSeek Harness.
