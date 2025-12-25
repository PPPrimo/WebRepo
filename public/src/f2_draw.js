// PNG rendering, layout, priority for Feature 2
import { setStyle, startHoverAnim, currentHoverScale, currentAnimProgress } from './f2_animation.js';
import { updateHoverInfo, updatePackInfo, updateVehicleInfo } from './f2_fetch.js';

const viewer = document.getElementById('viewer');
const canvas = document.getElementById('assemblyCanvas');
const ctx = canvas.getContext('2d');

function readStyleVars() {
  const s = getComputedStyle(viewer);
  return {
    padding: parseFloat(s.getPropertyValue('--viewer-padding')) || 10,
    hoverScale: parseFloat(s.getPropertyValue('--hover-scale')) || 1.2,
    hoverDuration: parseFloat(s.getPropertyValue('--hover-duration-ms')) || 500,
    dimSatFinal: parseFloat(s.getPropertyValue('--dim-sat-final')) || 55,
    dimBriFinal: parseFloat(s.getPropertyValue('--dim-bri-final')) || 88,
    alphaThreshold: parseFloat(s.getPropertyValue('--alpha-threshold')) || 10,
  };
}
let STYLE = readStyleVars();
setStyle(STYLE);

const BASE_DIR = 'Resources/PackAssembly/';
const EXCEL_CANDIDATES = ['Position.xlsx', 'positions.xlsx', 'Positions.xlsx'];
const POSITION_ANCHOR = 'topleft'; // 'center' | 'topleft'
let hoveredItem = null;
let animItem = null;
let lastLayout = { scale: 1, offsetX: 0, offsetY: 0 };
let rafPending = false;
function requestRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame((ts) => { rafPending = false; drawAssembly(cachedItems, ts); });
}

function parseIndexFromName(name) {
  const base = name.split('/').pop();
  const m = base && base.match(/^(\d+)_/);
  return m ? Number(m[1]) : null;
}

function isHoverEnabled(url) {
  const base = url.split('/').pop() || '';
  const name = base.replace(/\.[^.]+$/, '');
  const parts = name.split('_');
  return parts.length >= 2 && /^M/i.test(parts[1]);
}

function ensureHitSurface(it) {
  if (it._hitCtx) return;
  const w = it.img.naturalWidth || it.img.width;
  const h = it.img.naturalHeight || it.img.height;
  const off = document.createElement('canvas');
  off.width = Math.max(1, w);
  off.height = Math.max(1, h);
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.drawImage(it.img, 0, 0, off.width, off.height);
  it._hitCanvas = off;
  it._hitCtx = octx;
}

function pointHitsItem(it, px, py) {
  const rect = (hoveredItem === it && it._rectHover) ? it._rectHover : (it._rect || null);
  if (!rect) return false;
  if (px < rect.x || py < rect.y || px > rect.x + rect.w || py > rect.y + rect.h) return false;
  ensureHitSurface(it);
  if (!it._hitCtx) return false;
  const u = (px - rect.x) / rect.w;
  const v = (py - rect.y) / rect.h;
  const iw = it._hitCanvas.width;
  const ih = it._hitCanvas.height;
  const ix = Math.max(0, Math.min(iw - 1, Math.floor(u * iw)));
  const iy = Math.max(0, Math.min(ih - 1, Math.floor(v * ih)));
  const alpha = it._hitCtx.getImageData(ix, iy, 1, 1).data[3];
  return alpha >= (STYLE.alphaThreshold || 10);
}

async function fetchDirectoryPngs(dirUrl) {
  // Prefer backend API that lists PNGs; fall back to directory HTML (if enabled)
  try {
    const api = await fetch('/api/pack_assembly/pngs');
    if (api.ok) {
      const arr = await api.json();
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (_e) {}
  const res = await fetch(dirUrl);
  if (!res.ok) throw new Error(`Failed to list directory: ${dirUrl} (${res.status})`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const links = Array.from(doc.querySelectorAll('a'));
  return links
    .map(a => a.getAttribute('href'))
    .filter(href => href && href.toLowerCase().endsWith('.png'))
    .map(href => (href.startsWith('http') ? href : dirUrl.replace(/\/$/, '/') + href));
}

async function fetchExcelPositions(xlsxUrl) {
  const res = await fetch(xlsxUrl);
  if (!res.ok) throw new Error(`Positions file not found: ${xlsxUrl} (${res.status})`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: ['A','B','C','D','E'], range: 1, defval: '' });
  const map = new Map();
  rows.forEach(r => {
    const index = Number(r.A);
    const width = Number(r.B);
    const height = Number(r.C);
    const x = Number(r.D);
    const y = Number(r.E);
    if (!Number.isFinite(index)) return;
    map.set(index, { index, width, height, x, y });
  });
  return map;
}

async function loadImagesWithPositions() {
  const pngUrls = await fetchDirectoryPngs(BASE_DIR);
  let posMap = null;
  let lastErr = null;
  for (const name of EXCEL_CANDIDATES) {
    try {
      posMap = await fetchExcelPositions('/api/pack_assembly/file/' + name);
      break;
    } catch (e) { lastErr = e; }
  }
  if (!posMap) throw lastErr || new Error('Positions Excel file not found in PackAssembly');

  const items = [];
  for (const url of pngUrls) {
    const idx = parseIndexFromName(url);
    if (idx == null) continue;
    const pos = posMap.get(idx);
    if (!pos) continue;
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    items.push({ url, index: idx, img, hoverEnabled: isHoverEnabled(url), ...pos });
  }
  return items;
}

function computeBounds(items) {
  let maxX = 0, maxY = 0;
  for (const it of items) {
    const right = (POSITION_ANCHOR === 'center') ? (it.x + it.width / 2) : (it.x + it.width);
    const bottom = (POSITION_ANCHOR === 'center') ? (it.y + it.height / 2) : (it.y + it.height);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }
  return { minX: 0, minY: 0, maxX, maxY };
}

function drawAssembly(items, nowTs = performance.now()) {
  const vw = viewer.clientWidth;
  const vh = viewer.clientHeight;
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width = Math.floor(vw * dpr);
  canvas.height = Math.floor(vh * dpr);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { maxX, maxY } = computeBounds(items);
  const sceneW = Math.max(1, maxX - 0);
  const sceneH = Math.max(1, maxY - 0);
  const padding = STYLE.padding;
  const scale = Math.min((vw - padding * 2) / sceneW, (vh - padding * 2) / sceneH);
  const offsetX = padding;
  const offsetY = padding;
  lastLayout = { scale, offsetX, offsetY };

  items.sort((a, b) => b.index - a.index);

  let shadeProgress = 0;
  if (hoveredItem) {
    shadeProgress = currentAnimProgress(nowTs);
  } else if (animItem) {
    shadeProgress = 1 - currentAnimProgress(nowTs);
  } else {
    shadeProgress = 0;
  }
  const satLevel = 100 - shadeProgress * (100 - STYLE.dimSatFinal);
  const briLevel = 100 - shadeProgress * (100 - STYLE.dimBriFinal);

  for (const it of items) {
    if (hoveredItem && it === hoveredItem) continue;
    let drawX, drawY;
    if (POSITION_ANCHOR === 'center') {
      drawX = offsetX + (it.x - it.width / 2) * scale;
      drawY = offsetY + (it.y - it.height / 2) * scale;
    } else {
      drawX = offsetX + it.x * scale;
      drawY = offsetY + it.y * scale;
    }
    const dx = Math.round(drawX);
    const dy = Math.round(drawY);
    const baseW = Math.max(1, Math.round(it.width * scale));
    const baseH = Math.max(1, Math.round(it.height * scale));
    it._rect = { x: dx, y: dy, w: baseW, h: baseH };

    if (!hoveredItem && animItem && it === animItem) {
      const cx = dx + baseW / 2;
      const cy = dy + baseH / 2;
      const s = currentHoverScale(nowTs);
      const dw = Math.max(1, Math.round(baseW * s));
      const dh = Math.max(1, Math.round(baseH * s));
      const ax = Math.round(cx - dw / 2);
      const ay = Math.round(cy - dh / 2);
      ctx.filter = 'none';
      ctx.drawImage(it.img, ax, ay, dw, dh);
      it._rectHover = { x: ax, y: ay, w: dw, h: dh };
      if (s !== (hoveredItem ? STYLE.hoverScale : 1.0)) {
        requestRender();
      } else if (!hoveredItem && s === 1.0) {
        animItem = null;
      }
      continue;
    }
    if (shadeProgress > 0) {
      ctx.filter = `saturate(${satLevel}%) brightness(${briLevel}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(it.img, dx, dy, baseW, baseH);
  }
  ctx.filter = 'none';

  if (hoveredItem) {
    const it = hoveredItem;
    const baseX = (POSITION_ANCHOR === 'center') ? (offsetX + (it.x - it.width / 2) * scale) : (offsetX + it.x * scale);
    const baseY = (POSITION_ANCHOR === 'center') ? (offsetY + (it.y - it.height / 2) * scale) : (offsetY + it.y * scale);
    const baseW = Math.max(1, Math.round(it.width * scale));
    const baseH = Math.max(1, Math.round(it.height * scale));
    const r0 = { x: Math.round(baseX), y: Math.round(baseY), w: baseW, h: baseH };
    it._rect = r0;
    const cx = r0.x + r0.w / 2;
    const cy = r0.y + r0.h / 2;
    const s = currentHoverScale(nowTs);
    const dw = Math.max(1, Math.round(r0.w * s));
    const dh = Math.max(1, Math.round(r0.h * s));
    const dx = Math.round(cx - dw / 2);
    const dy = Math.round(cy - dh / 2);
    ctx.drawImage(it.img, dx, dy, dw, dh);
    it._rectHover = { x: dx, y: dy, w: dw, h: dh };
    if (s !== (hoveredItem ? STYLE.hoverScale : 1.0)) requestRender();
  }
}

let cachedItems = [];
async function bootFeature2() {
  try {
    cachedItems = await loadImagesWithPositions();
    drawAssembly(cachedItems);
    window.addEventListener('resize', () => { STYLE = readStyleVars(); setStyle(STYLE); drawAssembly(cachedItems); });

    canvas.addEventListener('click', onClickActivate);

    // Populate static panels once (dummy for now)
    updatePackInfo();
    updateVehicleInfo();
  } catch (err) {
    console.error(err);
  }
}

function getHitItem(px, py) {
  const drawOrder = [...cachedItems].sort((a, b) => a.index - b.index);
  if (hoveredItem) drawOrder.unshift(hoveredItem);
  for (const it of drawOrder) {
    if (!it.hoverEnabled) continue;
    if (!it._rect) {
      const dx = Math.round(lastLayout.offsetX + it.x * lastLayout.scale);
      const dy = Math.round(lastLayout.offsetY + it.y * lastLayout.scale);
      const dw = Math.round(it.width * lastLayout.scale);
      const dh = Math.round(it.height * lastLayout.scale);
      it._rect = { x: dx, y: dy, w: dw, h: dh };
    }
    if (pointHitsItem(it, px, py)) return it;
  }
  return null;
}

function onClickActivate(e) {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  if (hoveredItem) { setHover(null); return; }
  const hit = getHitItem(px, py);
  if (hit) { setHover(hit); }
}

function setHover(it) {
  if (it === hoveredItem) return;
  if (!it && hoveredItem) {
    animItem = hoveredItem;
  } else {
    animItem = it;
  }
  hoveredItem = it;
  updateHoverInfo(hoveredItem);
  const now = performance.now();
  const current = currentHoverScale(now);
  startHoverAnim(hoveredItem ? STYLE.hoverScale : 1.0, current);
  requestRender();
}

bootFeature2();
