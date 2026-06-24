// ============================================================
// SIMULACIÓN INTERACTIVA — cómo funciona el addon, paso a paso
// Ejemplo real: BS6CACSXC (Camisa Oxford Casual Solida), verificado
// contra datos de Van Heusen el 23/06/2026.
// ============================================================

// Universo simplificado del modelo para la simulación (subconjunto real)
const SIM_ITEMS = [
  { sku: "BS6CACSXC-000-XLGE", color: "000", colorNombre: "(sin capturar)", talla: "XLGE", disponible: 0 },
  { sku: "BS6CACSXC-000-XXL",  color: "000", colorNombre: "(sin capturar)", talla: "XXL",  disponible: 0 },
  { sku: "BS6CACSXC-000-LGE",  color: "000", colorNombre: "Blanco",        talla: "LGE",  precio: "L 540.00", disponible: 6 },
  { sku: "BS6CACSXC-000-MED",  color: "000", colorNombre: "Blanco",        talla: "MED",  precio: "L 540.00", disponible: 4 },
  { sku: "BS6CACSXC-160-LGE",  color: "160", colorNombre: "Roja",          talla: "LGE",  precio: "L 540.00", disponible: 3 },
  { sku: "BS6CACSXC-160-MED",  color: "160", colorNombre: "Roja",          talla: "MED",  precio: "L 540.00", disponible: 0 },
  { sku: "BS6CACSXC-380-LGE",  color: "380", colorNombre: "Rosado Claro",  talla: "LGE",  precio: "L 540.00", disponible: 5 },
  { sku: "BS6CACSXC-380-XLGE", color: "380", colorNombre: "Rosado Claro",  talla: "XLGE", precio: "L 540.00", disponible: 2 },
  { sku: "BS6CACSXC-570-LGE",  color: "570", colorNombre: "Azul Claro",    talla: "LGE",  precio: "L 540.00", disponible: 0 },
  { sku: "BS6CACSXC-570-MED",  color: "570", colorNombre: "Azul Claro",    talla: "MED",  precio: "L 540.00", disponible: 0 },
];

function simColorGroups(items) {
  const groups = {};
  items.forEach((it) => {
    if (!groups[it.color]) groups[it.color] = { color: it.color, nombre: it.colorNombre, items: [] };
    groups[it.color].items.push(it);
  });
  return Object.values(groups);
}

function simColorTieneStock(group) {
  return group.items.some((it) => (it.disponible || 0) > 0);
}

const SIM_STEPS = [
  {
    title: "1 · Así vive en SAP",
    caption: "ItemCode planos en OITM — sin jerarquía, cada talla y color es una fila suelta.",
    render: () => `
      <div class="sim-flat-grid">
        ${SIM_ITEMS.map(
          (it) => `
          <div class="sim-flat-item">
            <span class="sim-flat-sku">${it.sku}</span>
            <span class="sim-flat-meta">Color ${it.color} · Talla ${it.talla}</span>
          </div>`
        ).join("")}
      </div>
      <p class="sim-note">10 ItemCode reales del modelo <span class="mono">BS6CACSXC</span>. SAP no sabe que estos pertenecen al mismo "producto" — para SAP son artículos independientes.</p>
    `,
  },
  {
    title: "2 · El addon los agrupa por Modelo",
    caption: "U_ARGNS_MOD = BS6CACSXC es la clave — todos estos ItemCode son el mismo Modelo.",
    render: () => `
      <div class="sim-model-box">
        <span class="sim-model-label">Modelo</span>
        <span class="sim-model-name mono">BS6CACSXC</span>
        <div class="sim-flat-grid sim-flat-grid-grouped">
          ${SIM_ITEMS.map(
            (it) => `<div class="sim-flat-item sim-flat-item-grouped"><span class="sim-flat-sku">${it.sku}</span></div>`
          ).join("")}
        </div>
      </div>
      <p class="sim-note">El addon lee TODO el modelo de una sola vez — nunca un ItemCode aislado. Esto es lo que permite decidir, en el siguiente paso, qué sobrevive y qué no.</p>
    `,
  },
  {
    title: "3 · Se descarta lo que no tiene stock",
    caption: "Si un color no tiene disponible en ninguna talla, ese color desaparece del producto.",
    render: () => {
      const groups = simColorGroups(SIM_ITEMS);
      return `
        <div class="sim-color-groups">
          ${groups
            .map((g) => {
              const vivo = simColorTieneStock(g);
              return `
              <div class="sim-color-group ${vivo ? "" : "sim-color-group-dead"}">
                <div class="sim-color-group-head">
                  <span class="sim-color-swatch" style="background:${simSwatchColor(g.color)}"></span>
                  <span>${g.nombre}</span>
                  <span class="sim-color-status">${vivo ? "✓ se conserva" : "✕ se descarta — sin stock"}</span>
                </div>
                <div class="sim-color-group-items">
                  ${g.items
                    .map((it) => `<span class="sim-chip ${it.disponible > 0 ? "" : "sim-chip-zero"}">${it.talla}: ${it.disponible ?? "—"}</span>`)
                    .join("")}
                </div>
              </div>`;
            })
            .join("")}
        </div>
        <p class="sim-note">Azul Claro (570) se descarta completo — sus 2 tallas están en 0. Roja (160) se conserva porque al menos una talla (LGE) sí tiene stock, aunque MED esté en 0.</p>
      `;
    },
  },
  {
    title: "4 · Nace el producto padre",
    caption: "Un producto en Shopify, con los colores sobrevivientes como variantes.",
    render: () => {
      const groups = simColorGroups(SIM_ITEMS).filter(simColorTieneStock);
      return `
        <div class="sim-product-card">
          <div class="sim-product-head">
            <span class="sim-product-label">Producto Shopify</span>
            <h4>BS6CACSXC — Camisa Oxford Casual Solida</h4>
          </div>
          <div class="sim-product-options">
            <span class="sim-option-label">Color</span>
            <div class="sim-option-values">
              ${groups.map((g) => `<span class="sim-swatch-pill"><span class="sim-color-swatch" style="background:${simSwatchColor(g.color)}"></span>${g.nombre}</span>`).join("")}
            </div>
          </div>
        </div>
        <p class="sim-note">El Modelo completo <span class="mono">BS6CACSXC</span> es UN producto en Shopify. Sin esta agrupación, cada color aparecería como una ficha separada — el problema original que motivó este rediseño.</p>
      `;
    },
  },
  {
    title: "5 · Cada hijo lleva su propio precio y stock",
    caption: "El SKU de la variante es el ItemCode exacto — toca una para ver su detalle.",
    render: () => {
      const vivos = SIM_ITEMS.filter((it) => (it.disponible || 0) > 0);
      return `
        <div class="sim-variant-grid">
          ${vivos
            .map(
              (it, i) => `
            <button type="button" class="sim-variant-card" data-idx="${i}">
              <span class="sim-variant-sku mono">${it.sku}</span>
              <span class="sim-variant-row"><span>Color</span><strong>${it.colorNombre}</strong></span>
              <span class="sim-variant-row"><span>Talla</span><strong>${it.talla}</strong></span>
              <span class="sim-variant-row"><span>Precio</span><strong>${it.precio}</strong></span>
              <span class="sim-variant-row"><span>Stock</span><strong>${it.disponible}</strong></span>
            </button>`
            )
            .join("")}
        </div>
        <p class="sim-note">Cada tarjeta es independiente: su propio precio, su propio stock. Si Blanco-LGE se agota, solo esa tarjeta cambia — el resto del producto sigue intacto.</p>
      `;
    },
  },
  {
    title: "6 · Así lo ve el cliente final",
    caption: "Una sola ficha de producto, con selector de color y talla.",
    render: () => `
      <div class="sim-storefront">
        <div class="sim-storefront-card">
          <div class="sim-storefront-image">📦</div>
          <div class="sim-storefront-info">
            <h4>Camisa Oxford Casual Solida</h4>
            <p class="sim-storefront-price">L 540.00</p>
            <div class="sim-storefront-group">
              <span class="sim-storefront-label">Color</span>
              <div class="sim-storefront-swatches">
                <span class="sim-swatch-pill is-selected"><span class="sim-color-swatch" style="background:${simSwatchColor("000")}"></span>Blanco</span>
                <span class="sim-swatch-pill"><span class="sim-color-swatch" style="background:${simSwatchColor("160")}"></span>Roja</span>
                <span class="sim-swatch-pill"><span class="sim-color-swatch" style="background:${simSwatchColor("380")}"></span>Rosado Claro</span>
              </div>
            </div>
            <div class="sim-storefront-group">
              <span class="sim-storefront-label">Talla</span>
              <div class="sim-storefront-swatches">
                <span class="sim-size-pill is-selected">LGE</span>
                <span class="sim-size-pill">MED</span>
              </div>
            </div>
            <button type="button" class="sim-storefront-btn">Agregar al carrito</button>
          </div>
        </div>
      </div>
      <p class="sim-note">Una sola ficha. El cliente elige color y talla sin saber que detrás hay 10 ItemCode distintos en SAP — eso es exactamente lo que el addon resuelve por él.</p>
    `,
  },
];

function simSwatchColor(code) {
  const map = { "000": "#F2F0EA", "160": "#C0392B", "380": "#F0B8C8", "570": "#5E9BD6" };
  return map[code] || "#888";
}

let simCurrentStep = 0;

function renderSimStep() {
  const stage = document.getElementById("sim-stage");
  const progress = document.getElementById("sim-progress");
  const prevBtn = document.getElementById("sim-prev");
  const nextBtn = document.getElementById("sim-next");
  if (!stage) return;

  const step = SIM_STEPS[simCurrentStep];
  stage.innerHTML = `
    <div class="sim-step-head">
      <h3>${step.title}</h3>
      <p>${step.caption}</p>
    </div>
    <div class="sim-step-body">${step.render()}</div>
  `;

  progress.innerHTML = SIM_STEPS.map((_, i) => `<span class="sim-dot ${i === simCurrentStep ? "is-active" : ""} ${i < simCurrentStep ? "is-done" : ""}"></span>`).join("");

  prevBtn.disabled = simCurrentStep === 0;
  nextBtn.textContent = simCurrentStep === SIM_STEPS.length - 1 ? "Reiniciar ↺" : "Siguiente paso →";

  // tarjetas de variante interactivas (paso 5)
  stage.querySelectorAll(".sim-variant-card").forEach((card) => {
    card.addEventListener("click", () => card.classList.toggle("is-flipped"));
  });
}

function initSimulacion() {
  const prevBtn = document.getElementById("sim-prev");
  const nextBtn = document.getElementById("sim-next");
  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", () => {
    if (simCurrentStep > 0) {
      simCurrentStep -= 1;
      renderSimStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (simCurrentStep < SIM_STEPS.length - 1) {
      simCurrentStep += 1;
    } else {
      simCurrentStep = 0;
    }
    renderSimStep();
  });

  renderSimStep();
}



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
        title: "Detectar si el modelo lleva Color",
        tag: "Regla 5",
        summary: "Si U_ARGNS_COL viene vacío en todo el modelo, las opciones son solo Talla.",
        detail: {
          ref: "Sección 04 — Regla 5",
          body: `<p>Confirmado con Van Heusen: existen modelos solo-Talla (ej. accesorios) junto a modelos Talla+Color. No hay campo nuevo — se infiere de <span class="mono">U_ARGNS_COL</span> vacío.</p>
                 <p><strong>Verificado con datos reales:</strong> 17 modelos tienen mezcla con/sin color. En el caso inspeccionado (BS6CACSXC), el "sin color" resultó ser el mismo color sin capturar, con stock 0 — la Regla 2 lo descarta antes de generar ambigüedad. Pendiente confirmar si existe algún caso con stock real en ambos lados (TC-09).</p>`,
          code: `SI todos los U_ARGNS_COL del modelo vienen vacíos:
    productOptions = [Talla]
SINO:
    productOptions = [Color, Talla]`,
        },
      },
      {
        title: "Resolver categoría (U_Traductor)",
        tag: "Categoría",
        summary: "U_Traductor se lee junto con Color y Talla — no requiere consulta aparte.",
        detail: {
          ref: "Sección 07 — Categoría",
          body: `<p><span class="mono">U_Traductor</span> en SAP resuelve la categoría del producto en Shopify. Pendiente confirmar si se mapea al campo <span class="mono">category</span> de la taxonomía estándar o a una collection.</p>`,
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
  initSimulacion();
  renderKanban();
  renderImplGantt();
});
