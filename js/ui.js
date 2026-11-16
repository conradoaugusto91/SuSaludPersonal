/* ==========================================================================
   Utilidades de interfaz: íconos, formatos, QR de demostración y mapa SVG.
   ========================================================================== */
window.TS = window.TS || {};

TS.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Íconos (trazos simples, 24×24) ---------- */
TS.ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldPlus: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v6M9 11h6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  video: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  videoOff: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M1 1l22 22"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  micOff: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M2 2l20 20"/>',
  hangup: '<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3"/><path d="M22 2 2 22"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0M17 4a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7.4"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  steth: '<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  forward: '<path d="m13 19 9-7-9-7zM2 19l9-7-9-7z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  thermo: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  hospital: '<path d="M12 6v4M14 8h-4M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18M2 22h20M10 22v-4h4v4"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  split: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  skip: '<path d="m5 4 10 8-10 8zM19 5v14"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  arrowUR: '<path d="M7 17 17 7M7 7h10v10"/>',
  signature: '<path d="M3 17c3-4 5-9 7-9s-1 9 2 9 3-5 5-5 2 3 4 3"/><path d="M3 21h18"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  bot: '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 14h.01M16 14h.01"/><circle cx="12" cy="3" r="1"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11a4 4 0 0 1-2 8z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  ambulance: '<path d="M10 10H6M8 8v4"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M14 9h4l4 4v4a1 1 0 0 1-1 1h-2M9 18h6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  wave: '<path d="M2 12h2l2-6 4 12 4-14 4 12 2-4h2"/>'
};

TS.icon = (name, size, extra) => `<svg class="ic ${extra || ''}" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TS.ICONS[name] || ''}</svg>`;

/* ---------- Formatos (hora del centro de México) ---------- */
TS.fmt = {
  tz: 'America/Mexico_City',
  time(ms) {
    try { return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.tz }).format(new Date(ms)); }
    catch (e) { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  },
  date(ms) {
    try { return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: this.tz }).format(new Date(ms)); }
    catch (e) { return new Date(ms).toDateString(); }
  },
  dateLong(ms) {
    try { return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: this.tz }).format(new Date(ms)); }
    catch (e) { return new Date(ms).toDateString(); }
  },
  dateTime(ms) { return `${this.date(ms)} · ${this.time(ms)} h`; },
  mins(ms) { return Math.max(0, Math.floor(ms / 60000)); },
  dur(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
};

/* ---------- Píldora de prioridad Manchester ---------- */
TS.mtsPill = (color, opts) => {
  const m = TS.MTS[color];
  if (!m) return '';
  const o = opts || {};
  return `<span class="mts mts-${color} ${o.sm ? 'mts-sm' : ''}"><i></i>${o.short ? m.name : `${m.name} · ${m.level}`}</span>`;
};

/* ---------- QR de demostración (no codifica datos reales) ---------- */
TS.qr = function (seed, size) {
  const n = 25;
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const finder = (r, c) => {
    const inF = (r0, c0) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      if (inF(r0, c0)) {
        const rr = r - r0, cc = c - c0;
        return (rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4)) ? 1 : 0;
      }
    }
    return -1;
  };
  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const f = finder(r, c);
      const near = (r < 8 && (c < 8 || c >= n - 8)) || (r >= n - 8 && c < 8);
      const on = f === 1 || (f === -1 && !near && rnd() > 0.52);
      if (on) rects += `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>`;
    }
  }
  return `<svg class="qr" width="${size || 150}" height="${size || 150}" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><g fill="#161a1d">${rects}</g></svg>`;
};

/* ---------- Mapa simulado (Tlalpan, CDMX) ---------- */
TS.map = function (opts) {
  const o = opts || {};
  const persona = o.persona;
  const units = o.units || [];
  const sel = o.selected ? units.find(u => u.id === o.selected) : null;
  let streets = '';
  for (let y = 22; y < 420; y += 36) streets += `<path d="M0 ${y} L360 ${y + 8}" />`;
  for (let x = 18; x < 360; x += 40) streets += `<path d="M${x} 0 L${x - 10} 420" />`;
  const route = sel ? `<path class="map-route" d="M${persona.pos.x} ${persona.pos.y} L${persona.pos.x} ${(persona.pos.y + sel.y) / 2} L${sel.x} ${(persona.pos.y + sel.y) / 2} L${sel.x} ${sel.y}"/>` : '';
  const pins = units.map(u => {
    const isSel = sel && u.id === sel.id;
    const ic = u.urgencias ? 'hospital' : 'building';
    return `<g class="map-pin ${isSel ? 'sel' : ''} ${u.match ? 'match' : ''}" data-action="map-pin" data-id="${u.id}" transform="translate(${u.x} ${u.y})">
      <circle r="${isSel ? 17 : 14}"/><g transform="translate(-8 -8) scale(.67)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${TS.ICONS[ic]}</svg></g></g>`;
  }).join('');
  const vh = Math.round(360 * (o.aspect || 420 / 360));
  const cy = sel && persona ? (persona.pos.y + sel.y) / 2 : (persona ? persona.pos.y : 210);
  const y0 = Math.max(0, Math.min(420 - vh, Math.round(cy - vh / 2)));
  return `<svg class="map" viewBox="0 ${y0} 360 ${vh}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa simulado">
    <rect width="360" height="420" fill="#ebece6"/>
    <path d="M0 330 C40 300 70 340 110 360 C150 380 140 420 0 420 Z" fill="#d3e4cc"/>
    <path d="M250 20 C290 10 340 30 360 60 L360 120 C320 110 280 90 250 20 Z" fill="#d3e4cc"/>
    <g class="map-streets">${streets}</g>
    <path class="map-ave" d="M40 0 C90 140 200 260 330 420"/>
    <path class="map-ave" d="M0 286 C120 250 250 300 360 238"/>
    <text class="map-lbl" x="176" y="232" transform="rotate(48 176 232)">Calz. de Tlalpan</text>
    <text class="map-lbl" x="24" y="274" transform="rotate(-12 24 274)">Periférico Sur</text>
    ${route}
    ${pins}
    ${persona ? `<g class="map-me" transform="translate(${persona.pos.x} ${persona.pos.y})"><circle r="16" class="halo"/><circle r="7"/></g>` : ''}
  </svg>`;
};
