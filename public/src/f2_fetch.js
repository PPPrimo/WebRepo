// Info panel updates for Feature 2

export function updateHoverInfo(it) {
  const panel = document.getElementById('hoverInfo');
  if (!panel) return;
  if (!it) { panel.hidden = true; return; }
  const base = it.url.split('/').pop() || '';
  const name = base.replace(/\.[^.]+$/, '');

  const volts = ['3.86','3.84','3.85'];
  const temps = ['24.1','24.7','23.9','25.3'];
  const soc = ['74','75','73'];
  const current = '42.3';

  const voltsEl = panel.querySelector('#hv-volts');
  const tempsEl = panel.querySelector('#hv-temps');
  const socEl = panel.querySelector('#hv-soc');
  const currEl = panel.querySelector('#hv-current');

  if (voltsEl) {
    voltsEl.className = 'val-list';
    voltsEl.replaceChildren(...volts.map(v => {
      const e = document.createElement('span');
      e.className = 'val-item';
      e.textContent = v + ' V';
      return e;
    }));
  }
  if (tempsEl) {
    tempsEl.className = 'val-list';
    tempsEl.replaceChildren(...temps.map(t => {
      const e = document.createElement('span');
      e.className = 'val-item';
      e.textContent = t + ' °C';
      return e;
    }));
  }
  if (socEl) {
    socEl.className = 'val-list';
    socEl.replaceChildren(...soc.map(s => {
      const e = document.createElement('span');
      e.className = 'val-item';
      e.textContent = s + ' %';
      return e;
    }));
  }
  if (currEl) {
    currEl.className = 'val-list';
    const e = document.createElement('span');
    e.className = 'val-item';
    e.textContent = current + ' A';
    currEl.replaceChildren(e);
  }
  const itemLine = panel.querySelector('#hv-item');
  if (itemLine) itemLine.textContent = `Item: #${it.index} ${name}`;
  panel.hidden = false;
}

export function updatePackInfo(data) {
    const panel = document.getElementById('packInfo');
    if (!panel) return;
    const rows = panel.querySelectorAll('.row');
    const d = data || {
        volts: ['392.1'],
        temps: ['25.1'],
        soc: ['74'],
        current: '42.3'
    };

  applyRightCellText(rows[0], d.volts, 'V');
  applyRightCellText(rows[1], d.temps, '°C');
  applyRightCellText(rows[2], d.soc, '%');
  applyRightCellText(rows[3], d.current, 'A');
}

export function updateVehicleInfo(data) {
  const panel = document.getElementById('vehicleInfo');
  if (!panel) return;
  const rows = panel.querySelectorAll('.row');
  const d = data || {
    driving: ['Park'],
    hvil: ['Closed'],
    iso: ['OK'],
    ready: ['Yes']
  };
  applyRightCellText(rows[0], d.driving);
  applyRightCellText(rows[1], d.hvil);
  applyRightCellText(rows[2], d.iso);
  applyRightCellText(rows[3], d.ready);
}



function applyRightCellText(rowEl, values, unit = '') {
    if (!rowEl) return;
    const right = rowEl.querySelector('span:last-child');
    if (right) {
        right.className = 'val-list';
        const e = document.createElement('span');
        e.className = 'val-item';
        e.textContent = values + unit;
        right.replaceChildren(e);
    }
};
    
