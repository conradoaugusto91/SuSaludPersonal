/* ==========================================================================
   Shell de la demo: vistas, controles del presentador, avisos y reloj.
   ========================================================================== */
window.TS = window.TS || {};

TS.Main = {
  views: [
    ['inicio', 'grid', 'Inicio'],
    ['recorrido', 'split', 'Paciente + Médico'],
    ['paciente', 'smartphone', 'App del paciente'],
    ['medico', 'monitor', 'Consola médica'],
    ['operacion', 'chart', 'Operación']
  ],

  init() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <header class="top">
        <div class="top-l"><span class="app-mark sm">${TS.icon('shieldPlus', 17)}</span><b>Tu Salud</b><span class="top-sub">Prototipo interactivo</span><span class="demo-tag">DEMO · datos simulados</span></div>
        <nav class="top-nav">${this.views.map(v => `<button data-view="${v[0]}">${TS.icon(v[1], 16)}<span>${v[2]}</span></button>`).join('')}</nav>
        <div class="top-r">
          <span class="scen-name" data-scen-name></span>
          <button class="tbtn primary" data-top="next" title="Responder o avanzar el paso actual (tecla →)">${TS.icon('skip', 15)}<span>Siguiente paso</span></button>
          <button class="tbtn" data-top="advance" title="Simular el paso del tiempo para disparar seguimientos">${TS.icon('forward', 15)}<span>+48 h</span></button>
          <button class="tbtn" data-top="reset" title="Reiniciar la demostración">${TS.icon('refresh', 15)}<span>Reiniciar</span></button>
        </div>
      </header>
      <div class="views">
        <section class="view" data-v="inicio"></section>
        <section class="view" data-v="recorrido"><div class="split"><div class="phone-slot" data-slot="phone-recorrido"></div><div class="doc-slot" data-slot="doc-recorrido"></div></div></section>
        <section class="view" data-v="paciente"><div class="solo">
          <aside class="narr" data-narr></aside>
          <div class="phone-slot" data-slot="phone-paciente"></div>
          <aside class="narr-r" data-narr-r></aside></div></section>
        <section class="view" data-v="medico"><div class="doc-slot full" data-slot="doc-medico"></div></section>
        <section class="view" data-v="operacion"></section>
      </div>
      <div class="toasts" data-toasts></div>`;

    this.phoneWrap = document.createElement('div');
    this.phoneWrap.className = 'phone-fit';
    this.phoneWrap.appendChild(TS.Patient.mount());
    this.docEl = TS.Doctor.mount();
    app.querySelector('[data-v="inicio"]').appendChild(TS.Hub.mount());
    app.querySelector('[data-v="operacion"]').appendChild(TS.Ops.mount());

    app.querySelector('.top-nav').addEventListener('click', e => {
      const b = e.target.closest('[data-view]'); if (b) TS.act.setView(b.dataset.view);
    });
    app.querySelector('.top-r').addEventListener('click', e => {
      const b = e.target.closest('[data-top]'); if (!b) return;
      if (b.dataset.top === 'next') this.next();
      if (b.dataset.top === 'advance') TS.act.advanceTime(48);
      if (b.dataset.top === 'reset') { TS.act.reset(true); TS.toast('Demostración reiniciada', 'info'); }
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      this.next();
    });
    app.querySelector('[data-v="paciente"]').addEventListener('click', e => {
      const b = e.target.closest('[data-narr-act]'); if (!b) return;
      if (b.dataset.narrAct === 'scenario') this.startScenario(b.dataset.id);
    });

    TS.on((topic, data) => {
      if (topic === 'toast') return this.showToast(data);
      if (topic === 'narr') return this.renderNarr(data);
      if (topic === 'view' || topic === 'all') this.layout();
      this.updateTop();
      if (topic !== 'tick') setTimeout(() => this.tick(), 0);
    });
    // Precarga del imagotipo oficial (si se colocó en assets/logos/).
    ['light', 'dark'].forEach(v => {
      const img = new Image();
      img.onload = () => { TS.LOGO[v] = true; TS.emit('all'); };
      img.onerror = () => { TS.LOGO[v] = false; };
      img.src = `assets/logos/gobierno-salud-${v}.png`;
    });
    window.addEventListener('resize', () => this.fit());
    setInterval(() => this.tick(), 1000);
    const hashView = (location.hash || '').replace('#', '');
    if (this.views.some(v => v[0] === hashView)) TS.S.view = hashView;
    this.layout();
    this.tick();
  },

  layout() {
    const v = TS.S.view;
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.dataset.v === v));
    document.querySelectorAll('.top-nav [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    const ps = document.querySelector(`[data-slot="phone-${v}"]`);
    if (ps && this.phoneWrap.parentNode !== ps) ps.appendChild(this.phoneWrap);
    const ds = document.querySelector(`[data-slot="doc-${v}"]`);
    if (ds && this.docEl.parentNode !== ds) ds.appendChild(this.docEl);
    try { history.replaceState(null, '', `#${v}`); } catch (e) { /* file:// sin historial */ }
    this.fit();
    this.updateTop();
    if (v === 'paciente') this.renderNarr(TS.S.loggedIn ? TS.S.phone.screen : 'login');
  },

  /* Escala el teléfono para que quepa en la altura disponible. */
  fit() {
    const slot = this.phoneWrap.parentNode;
    if (!slot) return;
    const h = slot.clientHeight || (window.innerHeight - 64);
    const s = Math.min(1, Math.max(0.6, (h - 24) / 860));
    this.phoneWrap.style.setProperty('--s', s.toFixed(3));
    this.phoneWrap.style.width = `${Math.round(408 * s)}px`;
    this.phoneWrap.style.height = `${Math.round(860 * s)}px`;
  },

  updateTop() {
    const sc = TS.S.scenario;
    const el = document.querySelector('[data-scen-name]');
    if (el) el.innerHTML = sc ? `${TS.mtsPill(sc.color, { short: true, sm: true })} ${sc.title.split(' → ')[0]}` : '';
    const nb = document.querySelector('[data-top="next"]');
    if (nb) nb.style.display = ['inicio', 'operacion'].includes(TS.S.view) ? 'none' : '';
    const ab = document.querySelector('[data-top="advance"]');
    if (ab) ab.style.display = TS.S.view === 'inicio' ? 'none' : '';
  },

  startScenario(id) {
    const sc = TS.SCENARIOS.find(s => s.id === id);
    if (!sc) return;
    TS.act.reset();
    TS.S.scenario = sc;
    TS.S.view = 'recorrido';
    TS.act.login(sc.persona);
    TS.act.setView('recorrido');
    TS.toast(`Escenario listo: ${sc.title}. Usa “Siguiente paso” o contesta a mano.`, 'ok');
  },

  /* Avanza el recorrido un paso, según la pantalla actual. */
  next() {
    const S = TS.S;
    if (['inicio', 'operacion'].includes(S.view)) return;
    if (!S.loggedIn) { TS.act.login(S.scenario ? S.scenario.persona : 'jorge'); return; }
    const scr = S.phone.screen;
    const c = S.chat;
    const sc = S.scenario;
    if (scr === 'chat' && c && c.finished) {
      if (c.encId) return TS.act.go('resultado', { encId: c.encId });
      return;
    }
    if (scr === 'chat' && c && !c.finished) {
      if (c.typing) return;
      if (!sc) { TS.toast('Elige un escenario en Inicio para que “Siguiente paso” conteste por ti.', 'info'); return; }
      TS.Chat.auto();
      return;
    }
    const enc = TS.enc(S.phone.params.encId) || TS.enc();
    switch (scr) {
      case 'home': case 'login': return TS.Chat.start();
      case 'resultado': {
        const path = (sc && sc.path && !enc.parentId) ? sc.path : { rojo: 'urgencias', naranja: 'urgencias', amarillo: 'remota', verde: 'remota', azul: 'autocuidado' }[enc.result.color];
        return TS.act.choosePath(path, enc.id);
      }
      case 'espera': return TS.act.startConsult(enc.id);
      case 'turno': return TS.act.patientJoin();
      case 'video':
        if (S.consult && S.consult.done) return TS.act.completeConsult(true);
        return TS.toast('La consulta está en curso; espera a que termine la transcripción.', 'info');
      case 'atendido': return TS.act.go('surtir');
      case 'autocuidado': return TS.act.advanceTime(48);
      case 'urgencias': return TS.act.setView('medico');
      case 'agenda': {
        const pr = S.phone.params;
        if (!pr.slot) {
          const b = document.querySelector('.phone .slot:not([disabled])');
          if (b) { pr.slot = b.dataset.id; TS.Patient.render(); }
          return;
        }
        const [h, m] = pr.slot.split(':').map(Number);
        const ap = TS.act.bookAppointment(pr.unit, TS.nextSlot(pr.day || 0, h, m), pr.encId);
        return TS.act.go('citaok', { apId: ap.id }, true);
      }
      case 'citaok': return TS.act.home();
      case 'checkin': {
        const pr = S.phone.params;
        const want = sc && sc.id === 'gripa' ? 'peor' : 'mejor';
        if (!pr.stage || pr.stage === 'q') {
          if (want === 'mejor') { const r = TS.act.answerCheckin(pr.followupId, 'mejor'); pr.stage = 'done'; pr.outcome = r.outcome; pr.status = 'mejor'; return TS.Patient.render(); }
          pr.status = want; pr.stage = 'warn'; pr.warnSel = []; return TS.Patient.render();
        }
        if (pr.stage === 'warn') { const r = TS.act.answerCheckin(pr.followupId, pr.status, []); pr.stage = 'done'; pr.outcome = r.outcome; if (r.enc) pr.newEnc = r.enc.id; return TS.Patient.render(); }
        if (pr.stage === 'done' && pr.newEnc) return TS.act.go('resultado', { encId: pr.newEnc });
        return TS.act.home();
      }
      default: return TS.act.home();
    }
  },

  renderNarr(screen) {
    if (TS.S.view !== 'paciente') return;
    const n = TS.NARR[screen] || TS.NARR.home;
    const left = document.querySelector('[data-narr]');
    const right = document.querySelector('[data-narr-r]');
    if (!left) return;
    const enc = TS.enc(TS.S.phone.params && TS.S.phone.params.encId);
    left.innerHTML = `<span class="eyebrow">Qué está pasando</span><h2>${n.t}</h2><p>${n.d}</p>
      <div class="ntags">${n.tags.map(t => `<span>${t}</span>`).join('')}</div>
      ${enc && enc.result ? `<div class="n-tri"><small>Triaje de esta atención</small>${TS.mtsPill(enc.result.color)}<p><b>Discriminador:</b> ${TS.esc(enc.result.disc)}</p><p><b>Disposición:</b> ${enc.result.mts.disposition} · ${enc.result.mts.route}</p></div>` : ''}
      <div class="n-auto">${TS.icon('info', 14)}<span>En esta vista el médico se simula automáticamente. Para operar ambos lados, usa <b>Paciente + Médico</b>.</span></div>`;
    const sc = TS.S.scenario;
    right.innerHTML = sc
      ? `<span class="eyebrow">Guion del escenario</span><h3>${sc.title}</h3><ol class="n-steps">${sc.steps.map(s => `<li>${s}</li>`).join('')}</ol>
         <p class="small muted">Las opciones del guion aparecen marcadas en el chat. “Siguiente paso” (o la tecla →) las contesta por ti.</p>`
      : `<span class="eyebrow">Escenarios</span><h3>Elige un guion</h3>${TS.SCENARIOS.map(s => `<button class="n-scen" data-narr-act="scenario" data-id="${s.id}">${TS.mtsPill(s.color, { short: true, sm: true })}<span>${s.title}</span></button>`).join('')}`;
  },

  showToast(d) {
    const box = document.querySelector('[data-toasts]');
    if (!box || !d) return;
    const t = document.createElement('div');
    t.className = `toast ${d.kind || 'info'}`;
    t.innerHTML = `${TS.icon(d.kind === 'ok' ? 'checkCircle' : 'info', 16)}<span>${TS.esc(d.text)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4300);
  },

  tick() {
    const now = TS.now();
    document.querySelectorAll('[data-clock]').forEach(e => { e.textContent = TS.fmt.time(now); });
    document.querySelectorAll('[data-clock-s]').forEach(e => {
      try { e.textContent = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: TS.fmt.tz }).format(new Date(now)); }
      catch (err) { e.textContent = new Date(now).toLocaleTimeString(); }
    });
    document.querySelectorAll('[data-since]').forEach(e => { const s = +e.dataset.since; if (s) e.textContent = TS.fmt.dur(now - s); });
    document.querySelectorAll('[data-wait]').forEach(e => {
      const base = e.dataset.real ? Date.now() : now;
      const m = TS.fmt.mins(base - +e.dataset.wait);
      const tgt = +e.dataset.target;
      e.innerHTML = `<b>${m} min</b><small>objetivo ${tgt} min</small><span class="wbar"><i style="width:${Math.min(100, m / tgt * 100)}%"></i></span>`;
      e.classList.toggle('over', m > tgt);
      e.classList.toggle('near', m <= tgt && m > tgt * 0.75);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    const missing = ['Triage', 'Voice', 'Patient', 'Doctor', 'Hub', 'Ops'].filter(k => !TS[k]);
    if (missing.length) throw new Error(`Faltan módulos: ${missing.join(', ')}. Revisa que la carpeta js/ esté completa y que index.html sea la versión más reciente.`);
    TS.Main.init();
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:auto 20px 20px 20px;z-index:9999;background:#fdecea;border:1px solid #f0a29a;color:#912018;padding:14px 16px;border-radius:12px;font:14px/1.4 system-ui,sans-serif"><b>No se pudo iniciar el prototipo.</b> ${String(e.message || e).replace(/</g, '&lt;')}<br><small>Recarga con Ctrl+Shift+R. Si sigue, abre la consola (F12) y comparte el error.</small></div>`);
  }
});
