let productsData = { products: [] };
let cfg = {
  maxZoomColumns: 1,
  minZoomColumns: 5,
  hoverScale: 1.06,
  overlayOpacity: 0.95
};

async function loadConfig() {
  try {
    const res = await fetch('/assets/feature1.config.json');
    if (!res.ok) return;
    const data = await res.json();
    cfg = { ...cfg, ...data };
  } catch (e) {
    console.warn('Feature1: failed to load config, using defaults', e);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/assets/products.json');
    if (!res.ok) return;
    const data = await res.json();
    productsData = data || { products: [] };
  } catch (e) {
    console.warn('Feature1: failed to load products.json', e);
  }
}

function columnsForZoom(zoom) {
  // Map zoom (0.5..2.0 typical) to columns within [maxZoomColumns..minZoomColumns]
  const z = Math.max(0.5, Math.min(2.0, zoom));
  const t = (z - 0.5) / (2.0 - 0.5);
  const cols = Math.round(cfg.maxZoomColumns + t * (cfg.minZoomColumns - cfg.maxZoomColumns));
  return Math.max(cfg.maxZoomColumns, Math.min(cfg.minZoomColumns, cols));
}

function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  const cols = columnsForZoom(window.devicePixelRatio || 1);
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(180px, 1fr))`;
  grid.innerHTML = '';
  if (!products || products.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'product-empty';
    empty.textContent = 'No products yet. Use the toolbar to upload or add products.';
    grid.appendChild(empty);
    return;
  }
  for (const p of products) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const firstImg = (p.images || [])[0]?.url || '';
    const imgEl = document.createElement('img');
    imgEl.alt = p.name;
    imgEl.src = firstImg;
    imgEl.onerror = () => {
      imgEl.src = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    };
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = p.name;
    card.appendChild(imgEl);
    card.appendChild(nameEl);
    // Hover overlay
    card.addEventListener('mouseenter', () => showHoverOverlay(firstImg));
    card.addEventListener('mouseleave', hideHoverOverlay);
    // Click to detail
    card.addEventListener('click', () => openDetail(p));
    grid.appendChild(card);
  }
}

function showHoverOverlay(url) {
  const overlay = document.getElementById('hoverOverlay');
  const img = document.getElementById('hoverImage');
  img.src = url;
  overlay.style.display = 'block';
  overlay.style.opacity = String(cfg.overlayOpacity);
}
function hideHoverOverlay() {
  const overlay = document.getElementById('hoverOverlay');
  overlay.style.display = 'none';
}

function sortImages(images) {
  // Priority: explicit priority desc, then those with description first, then others
  return [...(images || [])].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    const da = a.description ? 1 : 0;
    const db = b.description ? 1 : 0;
    if (da !== db) return db - da;
    return 0;
  });
}

function openDetail(p) {
  const modal = document.getElementById('detailModal');
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailPrice').textContent = `$${p.price.toFixed(2)}`;
  document.getElementById('detailDesc').textContent = p.description || '';
  const imagesWrap = document.getElementById('detailImages');
  imagesWrap.innerHTML = '';
  for (const img of sortImages(p.images)) {
    const fig = document.createElement('figure');
    fig.innerHTML = `
      <img src="${img.url}" alt="${img.description || p.name}">
      ${img.description ? `<figcaption>${img.description}</figcaption>` : ''}
    `;
    imagesWrap.appendChild(fig);
  }
  modal.style.display = 'flex';
}

function closeDetail() {
  const modal = document.getElementById('detailModal');
  modal.style.display = 'none';
}

function wireModalClose() {
  document.getElementById('modalClose').addEventListener('click', closeDetail);
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetail();
  });
}

async function boot() {
  await loadConfig();
  await loadProducts();
  wireModalClose();
  renderGrid(productsData.products || []);
  // Re-render grid on zoom level change (window resize can proxy changes)
  window.addEventListener('resize', () => renderGrid(productsData.products || []));
  // Toolbar placeholders
  document.getElementById('uploadProductsBtn')?.addEventListener('click', () => alert('Upload workflow to be implemented.'));
  document.getElementById('addProductBtn')?.addEventListener('click', () => alert('Admin add-product UI to be implemented.'));
}

boot();
