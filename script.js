// ============================================================
// KENO-SHOPY — Especificación técnica — Tablero de trabajo
// ============================================================

const KANBAN = [
  {
    column: "Obtener en SAP",
    accent: "col-sap",
    cards: [
      {
        title: "Leer variantes del Modelo",
        tag: "Service Layer / SQL",
        summary: "OITM + ITM1 + OITW por U_ARGNS_MOD, con disponible ya calculado.",
        detail: {
          ref: "Sección 05 — Cómo se toma en SAP",
          body: `<p>Se lee el <strong>Modelo completo</strong>, nunca un ItemCode aislado — es lo único que permite aplicar las reglas de color en el siguiente paso.</p>`,
          code: `SELECT
    T0.ItemCode,
    T0.U_ARGNS_MOD   AS Modelo,
    T0.U_ARGNS_COL   AS CodigoColor,
    T0.U_argns_size  AS Talla,
    T0.U_ShopifyStatus,
    T1.Price         AS PrecioLista02,
    T2.OnHand        AS StockFisico,
    T2.IsCommited    AS StockComprometido,
    (T2.OnHand - T2.IsCommited) AS Disponible
FROM OITM T0
LEFT JOIN ITM1 T1 ON T1.ItemCode = T0.ItemCode AND T1.PriceList = 2
LEFT JOIN OITW T2 ON T2.ItemCode = T0.ItemCode AND T2.WhsCode = 'A01'
WHERE T0.U_ARGNS_MOD = @modelo`,
        },
      },
      {
        title: "Resolver nombre de color",
        tag: "@ARGNS_COLOR",
        summary: "Lookup en vivo, código exacto, primer registro si hay conflicto.",
        detail: {
          ref: "Secciones 01–03",
          body: `<p>El código <span class="mono">730</span> no es "Navy" — es <strong>"Café"</strong>. El código real de Navy es <span class="mono">500</span>. Si el código no tiene fila, la variante sigue sin opción Color (Regla 4).</p>
                 <p>3 códigos (760, 780, 790) tienen más de un nombre — se usa el primer registro por ID.</p>`,
          code: `SELECT TOP 1 Name FROM @ARGNS_COLOR
WHERE Code = {codigo_color}
ORDER BY {ID o campo de orden de inserción}`,
        },
      },
    ],
  },
  {
    column: "Transformar a Padre",
    accent: "col-transform",
    cards: [
      {
        title: "Calcular stock total por color",
        tag: "Regla 2",
        summary: "Si stock_total_color = 0 en todas las tallas, el color se descarta.",
        detail: {
          ref: "Sección 04 — Regla 2",
          body: `<p>Se suma el disponible de <strong>todas las tallas</strong> de un mismo color. Si el total es 0, el color se omite por completo del padre — no aparece ni como variante deshabilitada.</p>`,
          code: `Para cada color distinto en variantes:
    stock_total_color = SUMA(Disponible) de todas las tallas de ese color
    SI stock_total_color == 0:
        DESCARTAR este color por completo
        continuar con el siguiente color`,
        },
      },
      {
        title: "Armar combinaciones Color×Talla",
        tag: "Regla 3",
        summary: "Solo las combinaciones que existen y tienen stock — nunca el cartesiano completo.",
        detail: {
          ref: "Sección 04 — Regla 3",
          body: `<p>No todos los colores tienen las mismas tallas. El padre expone únicamente lo que realmente existe con <span class="mono">Disponible &gt; 0</span> — generar todas las combinaciones posibles produciría variantes fantasma sin stock real.</p>`,
        },
      },
      {
        title: "Resolver imagen por Modelo+Color",
        tag: "Regla 1 · S3",
        summary: "Cada color tiene su propia sesión de fotos — el prefijo nunca es solo Modelo.",
        detail: {
          ref: "Sección 04 — Regla 1",
          body: `<p>Agrupar la búsqueda solo por Modelo mostraría la imagen incorrecta en los colores que no son el principal del catálogo.</p>`,
          code: `prefijo_busqueda = Modelo + "-" + codigo_color
imagen = buscar en bucket S3 por prefijo_busqueda`,
        },
      },
      {
        title: "Reconciliar contra Shopify",
        tag: "Sección 06",
        summary: "Buscar por metafield custom.sap_modelo antes de decidir crear o actualizar.",
        detail: {
          ref: "Sección 06 — Reconciliación",
          body: `<p><strong>Recomendación técnica pendiente de validar:</strong> el Modelo se guarda como metafield en Shopify — nunca se busca por handle ni título, que pueden cambiar por edición manual sin que SAP se entere.</p>`,
          code: `resultado = buscar producto en Shopify
           por metafield custom.sap_modelo = {modelo}
SI resultado es vacío  → crear producto nuevo
SINO                   → actualizar producto existente`,
        },
      },
    ],
  },
  {
    column: "Enviar a Shopify",
    accent: "col-shopify",
    cards: [
      {
        title: "Crear producto padre completo",
        tag: "productSet",
        summary: "Título, opciones, variantes y metafield en una sola llamada idempotente.",
        detail: {
          ref: "Sección 07 — Creación",
          body: `<p>Se prefiere <span class="mono">productSet</span> sobre encadenar <span class="mono">productCreate</span> + <span class="mono">productVariantsBulkCreate</span> — reduce el riesgo de un producto creado sin variantes si la segunda llamada falla a mitad de camino.</p>`,
          code: `mutation {
  productSet(input: {
    title: "BF5CACC06 — Blazer Dress Solido"
    metafields: [{ namespace: "custom", key: "sap_modelo",
                    value: "BF5CACC06", type: "single_line_text_field" }]
    productOptions: [
      { name: "Color", values: [{ name: "Navy" }, { name: "Café" }] },
      { name: "Talla", values: [{ name: "S" }, { name: "M" }, { name: "L" }] }
    ]
    variants: [
      { sku: "BF5CACC06-500-S",
        optionValues: [{ optionName: "Color", name: "Navy" }, { optionName: "Talla", name: "S" }],
        price: "716.00",
        inventoryQuantities: [{ availableQuantity: 2, locationId: "..." }] }
      // ... una entrada por cada combinación sobreviviente
    ]
  }) { product { id } userErrors { field message } }
}`,
        },
      },
      {
        title: "Agregar variantes nuevas",
        tag: "productVariantsBulkCreate",
        summary: "Solo los SKU que SAP entrega y Shopify aún no tiene en ese producto.",
        detail: {
          ref: "Sección 07 — Actualización",
          body: `<p>No se reenvía el producto completo — solo las variantes que faltan, comparando el conjunto de SKU de SAP contra el conjunto que Shopify ya tiene.</p>`,
        },
      },
      {
        title: "Actualizar precio y stock",
        tag: "BulkUpdate + inventorySetQuantities",
        summary: "Dos mutaciones distintas — precio y stock no se actualizan en la misma llamada.",
        detail: {
          ref: "Sección 07/08",
          body: `<p>El cruce para encontrar la variante a actualizar es <strong>siempre por <span class="mono">sku = ItemCode</span> exacto</strong> — nunca por el nombre de Color/Talla, que puede ambigüarse (ver códigos 760/780/790).</p>`,
        },
      },
    ],
  },
  {
    column: "Logs de Control",
    accent: "col-logs",
    cards: [
      {
        title: "Confirmar sincronización en SAP",
        tag: "U_ShopifyStatus",
        summary: "Solo se marca como sincronizado si Shopify respondió sin userErrors.",
        detail: {
          ref: "Sección 09 — Paso 7",
          body: `<p>Si la respuesta de Shopify viene con <span class="mono">userErrors</span>, el ItemCode <strong>no</strong> se marca como sincronizado — queda pendiente para reintento en el siguiente ciclo.</p>`,
          code: `SI Pasos 6A/6B respondieron sin userErrors:
    actualizar U_ShopifyStatus de cada ItemCode procesado
SINO:
    registrar error para reintento — no marcar como sincronizado`,
        },
      },
      {
        title: "Validar integridad de SKU",
        tag: "Caso límite",
        summary: "Alertar (no autocorregir) si el conteo de variantes esperadas no coincide.",
        detail: {
          ref: "Sección 08 — Caso límite",
          body: `<p>Pendiente de definir con el equipo: si alguien edita el SKU manualmente en Shopify, el siguiente ciclo no encuentra coincidencia y puede crear una variante duplicada. Se recomienda una validación que <strong>alerte</strong>, no que corrija sola.</p>`,
        },
      },
      {
        title: "Registrar colores omitidos",
        tag: "Reglas 2 y 4",
        summary: "Log explícito de qué color se descartó y por cuál de las dos reglas.",
        detail: {
          ref: "Reglas 2 y 4 (sección 04)",
          body: `<p>Cada color que no llega a Shopify debe quedar trazado: por <strong>Regla 2</strong> (sin stock) o por <strong>Regla 4</strong> (sin traducción en @ARGNS_COLOR). Sin este log, una variante ausente en Shopify es indistinguible de un bug.</p>`,
        },
      },
    ],
  },
];

const IMPL_GANTT = {
  title: "Implementación · 11 días hábiles",
  totalDays: 11,
  tracks: [
    {
      label: "SAP Business One",
      tasks: [
        { name: "UDF Descripción Padre", start: 1, duration: 2 },
        { name: "Validar y exponer UDT de colores existente", start: 1, duration: 1 },
      ],
    },
    {
      label: "Addon / Shopify",
      tasks: [
        { name: "Lectura SAP por Modelo (sección 05)", start: 1, duration: 2 },
        { name: "Reglas 1-4 de transformación (sección 04)", start: 2, duration: 3 },
        { name: "Reconciliación contra Shopify (sección 06)", start: 4, duration: 2 },
        { name: "Creación/actualización en Shopify (sección 07)", start: 5, duration: 3 },
        { name: "Logs de control + validación de SKU (sección 08-09)", start: 8, duration: 2 },
        { name: "Pruebas de extremo a extremo (sección 10)", start: 9, duration: 3 },
      ],
    },
  ],
};

// ------------------------------------------------------------
// Render: Kanban
// ------------------------------------------------------------
function renderKanban() {
  const mount = document.getElementById("kanban");
  const detail = document.getElementById("kanban-detail");
  if (!mount) return;

  mount.innerHTML = KANBAN.map(
    (col) => `
      <div class="kanban-col">
        <div class="kanban-col-head ${col.accent}">
          <span>${col.column}</span>
          <span class="kanban-col-count">${col.cards.length}</span>
        </div>
        <div class="kanban-cards">
          ${col.cards
            .map(
              (card, i) => `
            <button type="button" class="kanban-card ${col.accent}" data-col="${col.column}" data-idx="${i}">
              <span class="kanban-card-tag">${card.tag}</span>
              <h4>${card.title}</h4>
              <p>${card.summary}</p>
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `
  ).join("");

  mount.querySelectorAll(".kanban-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const colName = btn.dataset.col;
      const idx = Number(btn.dataset.idx);
      const col = KANBAN.find((c) => c.column === colName);
      const card = col.cards[idx];

      const isAlreadyOpen = btn.classList.contains("is-open");
      mount.querySelectorAll(".kanban-card").forEach((b) => b.classList.remove("is-open"));

      if (isAlreadyOpen) {
        detail.hidden = true;
        detail.innerHTML = "";
        return;
      }

      btn.classList.add("is-open");
      detail.hidden = false;
      detail.innerHTML = `
        <div class="kanban-detail-head">
          <div>
            <span class="kanban-detail-ref">${card.detail.ref}</span>
            <h4>${card.title}</h4>
          </div>
          <button type="button" class="kanban-detail-close" aria-label="Cerrar">×</button>
        </div>
        <div class="kanban-detail-body">${card.detail.body}</div>
        ${card.detail.code ? `<pre class="code-block kanban-detail-code">${card.detail.code}</pre>` : ""}
      `;
      detail.querySelector(".kanban-detail-close").addEventListener("click", () => {
        btn.classList.remove("is-open");
        detail.hidden = true;
        detail.innerHTML = "";
      });
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

// ------------------------------------------------------------
// Render: Gantt de implementación
// ------------------------------------------------------------
function renderImplGantt() {
  const mount = document.getElementById("impl-gantt");
  if (!mount) return;

  const plan = IMPL_GANTT;
  const scaleSpans = Array.from({ length: plan.totalDays }, (_, i) => `<span>D${i + 1}</span>`).join("");

  const tracksHtml = plan.tracks
    .map((track) => {
      const rows = track.tasks
        .map((task) => {
          const leftPct = ((task.start - 1) / plan.totalDays) * 100;
          const widthPct = (task.duration / plan.totalDays) * 100;
          return `
            <div class="gantt-row">
              <span class="gantt-row-label">${task.name}</span>
              <div class="gantt-bar-track">
                <div class="gantt-bar" style="left:${leftPct}%; width:${widthPct}%;">${task.duration}d</div>
              </div>
            </div>
          `;
        })
        .join("");
      return `<div class="gantt-track-group"><div class="gantt-track-label">${track.label}</div>${rows}</div>`;
    })
    .join("");

  mount.innerHTML = `
    <div class="gantt-scale" style="grid-template-columns: repeat(${plan.totalDays}, 1fr);">${scaleSpans}</div>
    ${tracksHtml}
  `;
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderKanban();
  renderImplGantt();
});
