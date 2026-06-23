# Keno-Shopy — Especificación Técnica: Mapeo de Color (GitHub Pages)

Repositorio independiente, tercer sitio de la serie Keno-Shopy. Dirigido al equipo de desarrollo (Jefree Gómez / Gilberto Salguero), documenta el contrato exacto de implementación del lookup de color contra la tabla SAP `@ARGNS_COLOR`.

## Archivos

- `index.html` — sitio de especificación técnica (secciones 01-10 son contenido estático de lectura; la sección 11 es interactiva)
- `styles.css` — diseño (incluye `@font-face` para las fuentes locales — no depende de Google Fonts)
- `script.js` — datos y lógica del tablero Kanban interactivo y el Gantt de implementación (sección 11)
- `SpaceGrotesk.ttf`, `IBMPlexSans.ttf`, `IBMPlexMono-*.ttf` — fuentes embebidas, deben estar en la misma carpeta que `index.html` y `styles.css` (raíz del repo)

## Contenido

1. **Fuente de datos** — la consulta SQL real contra `@ARGNS_COLOR` y un resultado de ejemplo con datos verificados (no inventados) de Van Heusen.
2. **Regla de mapeo** — cómo se resuelve familia (por rango de código) y nombre comercial (por código exacto).
3. **Calidad de datos** — los 3 códigos con nombre en conflicto (760, 780, 790) y la regla de resolución por defecto.
4. **Arquitectura de armado del padre** — las 4 reglas de negocio: imágenes por Modelo+Color, omisión de color sin stock, tallas asimétricas por color, degradación sin traducción.
5. **Cómo se toma en SAP** — qué tablas y campos se leen (OITM, ITM1, OITW, @ARGNS_COLOR), con la consulta SQL completa de lectura por Modelo y por qué se lee el grupo completo en vez de variante por variante.
6. **Reconciliación contra Shopify** — cómo decidir si el producto padre ya existe (recomendación: metafield `custom.sap_modelo`, no handle ni título) y cómo diferenciar variantes nuevas vs. existentes.
7. **Cómo se arma para Shopify** — mecanismo de API recomendado (`productSet` para creación, `productVariantsBulkCreate`/`BulkUpdate` + `inventorySetQuantities` para actualización), con payload GraphQL de ejemplo completo.
8. **El control crítico: SKU = ItemCode** — por qué el SKU de Shopify debe ser idéntico al ItemCode de SAP, los riesgos de no garantizarlo, y el caso límite de edición manual en Shopify.
9. **Pseudocódigo** — el contrato completo paso a paso, desde la lectura en SAP hasta la confirmación de sincronización, en 7 pasos.
10. **Casos de prueba** — 6 casos concretos para validar antes de producción.
11. **Tablero de trabajo** — vista interactiva tipo Kanban con 4 columnas (Obtener en SAP, Transformar a Padre, Enviar a Shopify, Logs de Control). Cada tarjeta es clickeable y expande el query SQL, payload GraphQL o regla exacta correspondiente — sin salir de esta sección. Debajo, un Gantt de implementación con 2 pistas (SAP / Addon-Shopify) sobre los 11 días hábiles del Alcance B.

## Interactividad

Esta versión del sitio incluye JavaScript (`script.js`) — a diferencia de las secciones 01-10, que son contenido estático de lectura, la sección 11 (Tablero de trabajo) es interactiva:
- Clic en cualquier tarjeta del Kanban → despliega su detalle técnico (contexto, código/query, referencia a la sección del documento).
- Clic de nuevo en la misma tarjeta → cierra el detalle.
- El Gantt se renderiza dinámicamente a partir de los datos en `script.js` — para ajustar fechas o tareas, editar el objeto `IMPL_GANTT` ahí.

## Publicar en GitHub Pages

1. Sube todo el contenido de esta carpeta (incluyendo los `.ttf`) a un repositorio nuevo, todos en la raíz.
2. **Settings → Pages → Source** → rama `main`, carpeta `/ (root)`.
3. URL pública: `https://<usuario-u-org>.github.io/<repo>/`.

## Relación con los otros dos sitios Keno-Shopy

- **Sitio de análisis** (`Addons_price` original / primer repo): exploración interactiva del rediseño padre/variante, con selector de Alcance A/B.
- **Sitio de cotización**: propuesta comercial formal para Van Heusen/Lumo, con PDF descargable por opción.
- **Este sitio**: especificación técnica de un componente específico (el lookup de color) que solo aplica bajo el Alcance B de los otros dos documentos. No depende de ellos para funcionar, pero referencia sus decisiones.
