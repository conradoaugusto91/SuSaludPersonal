/* ==========================================================================
   Consola del médico — Red Nacional de Atención Médica Remota
   Copiloto clínico (asiste al médico) + Copiloto administrativo (SOAP,
   seguimiento, citas). Regla de oro: el copiloto clínico nunca interactúa
   con el paciente.
   ========================================================================== */
window.TS = window.TS || {};

TS.Doctor = {
  el: null,

  onlineDocs() { return 1018; },

  /* Filas de la bandeja: pacientes reales de la demo + simulados. */
  /* Estados del paciente de la app, tal como los ve el médico. */
  STATUS: {
    triaje: 'Triaje completado', en_espera: 'En espera', llamando: 'Llamando…', en_consulta: 'En consulta',
    atendido: 'Atendido', autocuidado: 'Autocuidado', urgencias: 'En urgencias', cita: 'Cita 1er nivel'
  },
  ACTIVE: ['triaje', 'en_espera', 'llamando', 'en_consulta'],

  queue() {
    const S = TS.S;
    const live = S.encounters.filter(e => e.status !== 'cancelado').map(e => {
      const p = TS.PERSONAS.find(x => x.id === e.personaId);
      const f = TS.Triage.flow(e.ans.flow);
      return {
        id: e.id, live: true, active: this.ACTIVE.includes(e.status), raw: e.status,
        nombre: `${p.nombre} ${p.apellidos}`, edad: p.edad, sexo: p.sexo, inst: p.derechohabiencia,
        color: e.result.color, flowLabel: f.label, disc: e.result.disc, motivo: e.result.disc,
        since: e.waitingSince || e.createdAt, closedAt: e.closedAt || e.createdAt, real: false,
        status: this.STATUS[e.status] || e.status, folio: e.folio, reconsulta: !!e.parentId, grupo: p.grupo,
        voice: (e.ans.voice || []).length, voiceNew: !!e.voiceNew
      };
    });
    const seeds = TS.QUEUE_SEED.map(q => ({
      ...q, live: false, active: true, flowLabel: TS.Triage.flow(q.flow).label, since: TS.LOADED_AT - q.waitMin * 60000, real: true, status: q.estado
    }));
    const act = live.filter(r => r.active).concat(seeds)
      .sort((a, b) => (TS.Triage.rank(a.color) - TS.Triage.rank(b.color)) || (a.since - b.since));
    const closed = live.filter(r => !r.active).sort((a, b) => b.closedAt - a.closedAt);
    return act.concat(closed);
  },

  /* Datos del caso (real o simulado) en un formato común. */
  caseData(id) {
    const enc = TS.enc(id);
    if (enc) return { enc, persona: TS.PERSONAS.find(p => p.id === enc.personaId), live: true };
    const q = TS.QUEUE_SEED.find(x => x.id === id);
    if (!q) return null;
    const persona = {
      id: q.id, nombre: q.nombre.split(' ')[0], apellidos: q.nombre.split(' ').slice(1).join(' '), iniciales: q.nombre.split(' ').map(w => w[0]).slice(0, 2).join(''),
      edad: q.edad, sexo: q.sexo, derechohabiencia: q.inst, alergias: [], cronicos: q.flow === 'disnea' ? ['EPOC'] : q.flow === 'espalda' ? ['Obesidad grado I'] : [],
      meds: q.flow === 'disnea' ? ['Salbutamol inhalado'] : [], sangre: '—', expediente: `TS-${q.folio.slice(-4)}-0000`, embarazo: null, color: '#5b6770'
    };
    const mts = TS.MTS[q.color];
    const fenc = {
      id: q.id, folio: q.folio, createdAt: TS.LOADED_AT - q.waitMin * 60000, personaId: q.id, ans: { flow: q.flow },
      result: { color: q.color, mts, disc: q.disc, positives: [{ color: q.color, disc: q.disc, src: 'Diagrama' }], negatives: [] },
      status: 'en_espera', seedText: q.motivo
    };
    return { enc: fenc, persona, live: false };
  },

  mount() {
    const el = document.createElement('div');
    el.className = 'dc';
    this.el = el;
    el.addEventListener('click', e => this.onClick(e));
    el.addEventListener('input', e => this.onInput(e));
    el.addEventListener('change', e => this.onChange(e));
    TS.on((topic, data) => {
      if (topic === 'transcript') return this.onTranscript(data);
      if (topic === 'voice') return this.onVoice(data);
      if (topic === 'toast' || topic === 'tick' || topic === 'chat' || topic === 'narr') return;
      this.render();
    });
    this.render();
    return el;
  },

  render() {
    const S = TS.S;
    const main = this.el.querySelector('[data-dc-main]');
    const keep = main ? main.scrollTop : 0;
    const prev = this.el.dataset.screen;
    const tr = this.el.querySelector('[data-transcript]');
    const trTop = tr ? tr.scrollTop : null;
    const scr = S.doctor.screen === 'consulta' && !S.consult ? 'bandeja' : S.doctor.screen;
    this.el.dataset.screen = scr;
    const q = this.queue();
    const waiting = q.filter(r => r.status === 'En espera').length;
    const fuAct = S.followups.filter(f => ['programado', 'enviado'].includes(f.status)).length + 3;
    const nav = [
      ['bandeja', 'inbox', 'Bandeja del día', waiting],
      ['consulta', 'video', 'Consulta remota', S.consult ? '●' : ''],
      ['seguimientos', 'activity', 'Seguimientos', fuAct],
      ['recetas', 'pill', 'Recetas firmadas', S.prescriptions.length || '']
    ];
    this.el.innerHTML = `
      <aside class="dc-side">
        <div class="dc-brand">${TS.brand('dark')}<small>Red Nacional de Atención Médica Remota</small></div>
        <div class="dc-sec">Agenda</div>
        ${nav.slice(0, 2).map(n => this.navItem(n, scr)).join('')}
        <div class="dc-sec">Clínico</div>
        ${nav.slice(2).map(n => this.navItem(n, scr)).join('')}
        <div class="dc-net">${TS.icon('globe', 15)}<span><b>${this.onlineDocs()}</b> médicos en línea<small>Central · Estatal · Descentralizada</small></span></div>
        <div class="dc-doc"><span class="av" style="background:#1e5b4f">${TS.DOCTOR.iniciales}</span><span><b>${TS.DOCTOR.nombre}</b><small>${TS.DOCTOR.especialidad} · Céd. ${TS.DOCTOR.cedula}</small><em><i></i>En línea · ${TS.DOCTOR.turno}</em></span></div>
      </aside>
      <main class="dc-main" data-dc-main>${this.screens[scr].call(this)}</main>`;
    const m2 = this.el.querySelector('[data-dc-main]');
    if (m2 && prev === scr) m2.scrollTop = keep;
    const tr2 = this.el.querySelector('[data-transcript]');
    if (tr2) tr2.scrollTop = tr2.scrollHeight;
    if (TS.Main && TS.Main.tick) TS.Main.tick();
  },

  navItem(n, scr) {
    const [id, ic, label, badge] = n;
    const disabled = id === 'consulta' && !TS.S.consult;
    return `<button class="dc-nav ${scr === id ? 'on' : ''} ${disabled ? 'dis' : ''}" data-action="nav" data-id="${id}">${TS.icon(ic, 17)}<span>${label}</span>${badge !== '' && badge != null ? `<em class="${badge === '●' ? 'live' : ''}">${badge}</em>` : ''}</button>`;
  },

  head(crumb, title, sub, right) {
    return `<div class="dc-head"><div><div class="crumb">${crumb}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right || ''}</div>`;
  },

  clock() {
    return `<div class="clock-card"><small>Hora local · CDMX</small><b data-clock-s>--:--:--</b><span class="live-pill"><i></i>EN VIVO</span></div>`;
  },

  /* Lo que el paciente va diciendo por micrófono aparece en vivo en la transcripción. */
  onVoice(d) {
    if (!d || d.target !== 'video') return;
    const box = this.el.querySelector('[data-transcript]');
    if (!box) return;
    let live = box.querySelector('[data-tr-live]');
    if (d.ended) { if (live) live.remove(); return; }
    if (!live) {
      box.insertAdjacentHTML('beforeend', `<div class="tr-line pt live" data-tr-live><span class="tr-who">Paciente</span><span class="tr-t"></span><span class="tr-time">${TS.icon('mic', 11)} en vivo</span></div>`);
      live = box.querySelector('[data-tr-live]');
      const empty = box.querySelector('.tr-empty'); if (empty) empty.remove();
    }
    live.querySelector('.tr-t').innerHTML = TS.Voice.text() ? TS.Voice.liveHtml() : '<span class="ph">hablando…</span>';
    box.appendChild(live);
    box.scrollTop = box.scrollHeight;
  },

  onTranscript(ln) {
    const box = this.el.querySelector('[data-transcript]');
    if (box && ln && ln.t) {
      box.insertAdjacentHTML('beforeend', this.lineHtml(ln, true));
      const lv = box.querySelector('[data-tr-live]'); if (lv) box.appendChild(lv);
      box.scrollTop = box.scrollHeight;
      const empty = box.querySelector('.tr-empty'); if (empty) empty.remove();
    }
    if (ln && ln.copilot) {
      const cp = this.el.querySelector('[data-cp-live]');
      if (cp) { cp.insertAdjacentHTML('afterbegin', this.cpCard(ln.copilot, true)); }
    }
    if (ln && ln.done) this.render();
  },

  lineHtml(ln, anim) {
    return `<div class="tr-line ${ln.who} ${ln.voice ? 'voice' : ''} ${anim ? 'enter' : ''}"><span class="tr-who">${ln.who === 'dr' ? TS.DOCTOR.corto : 'Paciente'}</span><span class="tr-t">${ln.voice ? `<em class="vbadge dc">${TS.icon('mic', 10)} voz del paciente</em>` : ''}${TS.esc(ln.t)}</span><span class="tr-time">${TS.fmt.time(ln.at)}</span></div>`;
  },

  cpCard(cp, anim) {
    const ic = { q: 'chat', dx: 'sparkles', alert: 'alert' }[cp.kind] || 'sparkles';
    const ttl = { q: 'Pregunta sugerida', dx: 'Hipótesis actualizada', alert: 'Alerta de seguridad' }[cp.kind];
    return `<div class="cp-card cp-${cp.kind} ${anim ? 'enter' : ''}"><span class="cp-ic">${TS.icon(ic, 15)}</span><span><b>${ttl}</b><small>${TS.esc(cp.text)}</small></span></div>`;
  },

  onInput(e) {
    const t = e.target;
    const c = TS.S.consult;
    if (t.matches('[data-soap]') && c) c.soap[t.dataset.soap] = t.value;
  },

  onChange(e) {
    const t = e.target;
    const c = TS.S.consult;
    if (t.matches('[data-addmed]') && c && t.value) {
      const m = TS.MEDS.find(x => x.id === t.value);
      if (m && !c.rx.some(x => x.id === m.id)) c.rx.push({ ...m, ai: false });
      c.signed = false; c.rxFolio = null;
      this.render();
    }
    if (t.matches('[data-dxsel]') && c) {
      const [code, ...rest] = t.value.split('|');
      c.dx = { code, label: rest.join('|') };
      this.render();
    }
  },

  onClick(e) {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action, id = b.dataset.id;
    const S = TS.S, c = S.consult;
    switch (a) {
      case 'nav':
        if (id === 'consulta' && !c) return TS.toast('No hay una consulta activa. Toma un caso de la bandeja.', 'info');
        if (id === 'consulta') { S.doctor.caseId = c.encId; }
        return TS.act.doctorScreen(id);
      case 'filter': S.doctor.filter = id; return this.render();
      case 'open': { const e0 = TS.enc(id); if (e0) e0.voiceNew = false; return TS.act.openCase(id); }
      case 'back-bandeja': return TS.act.doctorScreen('bandeja');
      case 'start': {
        const cd = this.caseData(id);
        if (!cd || !cd.live) return TS.toast('En la demo, la videoconsulta completa está disponible para pacientes que entran desde la app Tu Salud.', 'info');
        if (c && c.encId !== id) return TS.toast('Ya tienes una consulta activa.', 'info');
        if (c) return TS.act.doctorScreen('consulta');
        if (['atendido', 'urgencias'].includes(cd.enc.status)) return TS.toast('Este caso ya está cerrado.', 'info');
        return TS.act.startConsult(id);
      }
      case 'derivar': return TS.toast('Se enviaría prealerta al hospital receptor con el resumen clínico (demo).', 'info');
      case 'fhir': return this.downloadFhir(id);
      case 'tab': if (c) { c.tab = id; this.render(); } return;
      case 'rm-med': if (c) { c.rx = c.rx.filter(m => m.id !== id); c.signed = false; c.rxFolio = null; this.render(); } return;
      case 'sign': return TS.act.signRx();
      case 'fu-h': if (c) { c.followH = +id || 0; this.render(); } return;
      case 'ref': if (c) { c.referral = c.referral === id ? null : id; this.render(); } return;
      case 'complete': return TS.act.completeConsult(false);
      case 'advance': return TS.act.advanceTime(+id);
      case 'dc-toggle': b.classList.toggle('off'); return;
      case 'use-dx': if (c) { c.dx = { code: b.dataset.code, label: b.dataset.label }; TS.toast(`Diagnóstico seleccionado: ${b.dataset.code}`, 'ok'); this.render(); } return;
    }
  },

  downloadFhir(id) {
    const cd = this.caseData(id);
    if (!cd || !cd.live) return TS.toast('FHIR disponible para pacientes de la app (demo).', 'info');
    const json = JSON.stringify(TS.Clinical.fhir(cd.enc, cd.persona), null, 2);
    try {
      const blob = new Blob([json], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `fhir-${cd.enc.folio}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      TS.toast('Bundle HL7 FHIR R4 descargado (datos simulados)', 'ok');
    } catch (err) { TS.toast('No se pudo descargar el archivo.', 'info'); }
  },

  /* ==========================================================================
     Pantallas
     ========================================================================== */
  screens: {
    bandeja() {
      const S = TS.S;
      const all = this.queue();
      const f = S.doctor.filter;
      const rows = all.filter(r => f === 'todos' || r.color === f);
      const counts = c => all.filter(r => r.color === c).length;
      const urg = all.filter(r => r.active && ['rojo', 'naranja', 'amarillo'].includes(r.color)).length;
      const wait = all.filter(r => r.status === 'En espera').length;
      const pas = S.prealerts;
      return `${this.head(`AGENDA / <b>BANDEJA DEL DÍA</b>`, `Bandeja del día — ${TS.fmt.dateLong(TS.now())}`,
        `${all.length} pacientes · ${wait} en espera · ${urg} urgentes · prioridad asignada por triaje IA (metodología Manchester)`, this.clock())}
        ${pas.length ? pas.slice(0, 1).map(pa => { const p = TS.PERSONAS.find(x => x.id === pa.persona); return `<div class="banner red">${TS.icon('ambulance', 18)}<span><b>Prealerta hospitalaria:</b> ${p.nombre} ${p.apellidos} derivado(a) a urgencias · ${pa.unit.nombre} recibió el resumen clínico.</span><em>${TS.fmt.time(pa.at)}</em></div>`; }).join('') : ''}
        <div class="dc-tabs"><button class="on">${TS.icon('video', 15)} Remotas <em>${all.length}</em></button><button>${TS.icon('user', 15)} Presenciales <em>0</em></button><button>${TS.icon('clock', 15)} Historial</button></div>
        <div class="dc-toolbar">
          <div class="search">${TS.icon('search', 16)}<span>Buscar por nombre, NSS, CURP o folio…</span></div>
          <div class="fchips">
            <button class="fchip ${f === 'todos' ? 'on' : ''}" data-action="filter" data-id="todos">Todos <b>${all.length}</b></button>
            ${['naranja', 'amarillo', 'verde', 'azul'].map(c => `<button class="fchip ${f === c ? 'on' : ''}" data-action="filter" data-id="${c}"><span class="mts-dot mts-${c}"></span>${TS.MTS[c].name} <b>${counts(c)}</b></button>`).join('')}
          </div>
        </div>
        <div class="table">
          <div class="tr th"><span>Prioridad</span><span>Paciente</span><span>Motivo · triaje</span><span>Espera / objetivo</span><span>Estado</span><span></span></div>
          ${rows.map(r => `<button class="tr row ${r.live ? 'live' : ''} ${r.active ? '' : 'closed'}" data-action="open" data-id="${r.id}">
            <span>${TS.mtsPill(r.color, { sm: true, short: true })}</span>
            <span class="pt"><b>${TS.esc(r.nombre)}</b><small>${r.edad} a · ${r.sexo} · ${r.inst}</small>${r.live ? `<em class="new">${r.reconsulta ? 'RE-CONSULTA' : 'NUEVO · APP'}</em>` : ''}${r.grupo ? `<em class="grp">${r.grupo.split(' · ')[0]}</em>` : ''}${r.voice ? `<em class="vchip ${r.voiceNew ? 'new' : ''}">${TS.icon('mic', 10)} ${r.voiceNew ? 'Nueva nota de voz' : `Relato por voz (${r.voice})`}</em>` : ''}</span>
            <span class="mo"><b>${TS.esc(r.flowLabel)}</b><small>${TS.esc(r.live ? 'Discriminador: ' + r.disc : r.motivo)}</small></span>
            ${r.active && r.raw !== 'triaje' ? `<span class="wt" data-wait="${r.since}" data-target="${TS.MTS[r.color].minutes}" ${r.real ? 'data-real="1"' : ''}>—</span>`
              : `<span class="wt done">${this.closedCell(r)}</span>`}
            <span><em class="st st-${r.raw || 'seed'} ${['En consulta', 'Llamando…'].includes(r.status) ? 'in' : ''}">${r.status}</em><small class="fol">${r.folio}</small></span>
            <span class="go">${TS.icon('chevR', 18)}</span>
          </button>`).join('')}
        </div>
        <p class="dc-foot">${TS.icon('info', 14)} Orden: color Manchester y, dentro de cada color, tiempo de espera. El tiempo objetivo depende del nivel (Naranja 10 min · Amarillo 60 · Verde 120 · Azul 240).</p>`;
    },

    caso() {
      const S = TS.S;
      const cd = this.caseData(S.doctor.caseId);
      if (!cd) return this.screens.bandeja.call(this);
      const { enc, persona, live } = cd;
      const r = enc.result;
      const summary = live ? TS.Clinical.summary(enc, persona) : `${persona.sexo === 'H' ? 'Paciente masculino' : 'Paciente femenina'} de ${persona.edad} años, ${persona.derechohabiencia}. ${enc.seedText} Triaje Manchester: ${r.mts.name.toUpperCase()} por “${r.disc}”.`;
      const hyps = TS.Clinical.hypotheses(enc, persona);
      const mgmt = TS.Clinical.management(enc, live && !enc.parentId);
      const parent = live && enc.parentId ? TS.enc(enc.parentId) : null;
      const inConsult = S.consult && S.consult.encId === enc.id;
      return `${this.head(`<button class="crumb-btn" data-action="back-bandeja">${TS.icon('chevL', 14)} BANDEJA</button> / <b>RESUMEN CLÍNICO</b>`, '', '', '')}
        <div class="pt-head">
          <div><h2>${TS.esc(persona.nombre)} ${TS.esc(persona.apellidos)}</h2><small>${persona.edad} AÑOS · ${persona.sexo} · ${persona.derechohabiencia} · EXP. ${persona.expediente}</small>
          <div class="pt-tags"><span class="tag">${TS.icon('video', 13)} VIDEOLLAMADA</span><span class="tag ghost">${TS.icon('lock', 12)} Videoconsulta segura</span>${persona.grupo ? `<span class="tag gold">${persona.grupo}</span>` : ''}${parent ? `<span class="tag red">RE-CONSULTA · ${parent.folio}</span>` : ''}</div></div>
          <div class="pt-right">${TS.mtsPill(r.color)}<small class="fol">${enc.folio}</small></div>
        </div>
        <div class="case-grid">
          <section class="panel cp">
            <div class="panel-h"><span>${TS.icon('sparkles', 15)} DETERMINACIÓN MÉDICA · COPILOTO CLÍNICO</span><button class="btn-sm" data-action="fhir" data-id="${enc.id}">${TS.icon('download', 14)} Descargar FHIR</button></div>
            ${live && enc.status === 'atendido' ? this.closedNote(enc, persona) : ''}
            ${live && enc.status === 'urgencias' ? (() => { const pa = TS.S.prealerts.find(x => x.encId === enc.id); return `<div class="closed-note red">${TS.icon('ambulance', 18)}<span><b>Derivado a urgencias</b><small>Prealerta con resumen clínico enviada a ${pa ? pa.unit.nombre : 'hospital receptor'} · ${pa ? TS.fmt.time(pa.at) + ' h' : ''}</small></span></div>`; })() : ''}
            ${live && enc.status === 'autocuidado' ? (() => { const fu = TS.S.followups.find(x => x.id === enc.followupId); return `<div class="closed-note blue">${TS.icon('heart', 18)}<span><b>Resuelto por el asistente virtual (autocuidado)</b><small>${fu ? `Seguimiento ${fu.status === 'programado' ? 'programado para ' + TS.fmt.dateTime(fu.dueAt) : fu.status}` : ''} · el médico puede llamar al paciente si lo considera necesario.</small></span></div>`; })() : ''}
            <div class="cp-sec"><h4>1. Resumen clínico estructurado</h4><p>${TS.esc(summary)}</p></div>
            ${live && (enc.ans.voice || []).length ? `<div class="cp-sec"><h4>${TS.icon('mic', 13)} Relato del paciente por voz · transcripción automática (es-MX)</h4>${this.voiceList(enc)}</div>` : ''}
            ${parent ? `<div class="cp-sec"><h4>Antecedente inmediato</h4><p>Atendido el ${TS.fmt.dateTime(parent.closedAt || parent.createdAt)} por ${TS.esc(parent.doctor || 'la Red')}: <b>${parent.dx ? TS.esc(parent.dx.label) + ' (' + parent.dx.code + ')' : 'sin diagnóstico'}</b>. Tratamiento: ${parent.rx.length ? parent.rx.map(m => TS.esc(m.nombre)).join(', ') : 'medidas generales'}. Seguimiento: sin mejoría.</p></div>` : ''}
            <div class="cp-sec"><h4>2. Signos de alarma evaluados (red flags)</h4>
              <div class="flags">${r.positives.map(p => `<span class="flag pos"><span class="mts-dot mts-${p.color}"></span>${TS.esc(p.disc)}</span>`).join('')}
              ${r.negatives.slice(0, 8).map(n => `<span class="flag neg">${TS.icon('x', 12)} ${TS.esc(n)}</span>`).join('')}</div></div>
            <div class="cp-sec"><h4>3. Hipótesis diagnósticas (pre-diagnóstico)</h4>
              ${hyps.map(h => `<div class="hyp ${h.conf === 'Descartar' ? 'rule' : ''}"><span class="hyp-code">${h.code}</span><span class="hyp-l">${TS.esc(h.label)}</span><span class="hyp-c">${h.conf === 'Descartar' ? '<em>Descartar</em>' : `<i style="width:${h.pct}%"></i><b>${h.conf}</b>`}</span></div>`).join('')}
              <p class="ai-note">${TS.icon('alert', 13)} Sugerencia de IA · requiere validación médica. Basado en el triaje, el expediente y Guías de Práctica Clínica.</p></div>
            <div class="cp-sec"><h4>4. Manejo sugerido y precauciones</h4><ul class="list-dot">${mgmt.map(m => `<li>${TS.esc(m)}</li>`).join('')}</ul></div>
          </section>
          <aside class="case-side">
            <div class="panel">
              <div class="panel-h"><span>ACCIONES</span></div>
              ${live ? `<div class="st-line">${TS.icon('activity', 15)} Estado: <em class="st st-${enc.status}">${this.STATUS[enc.status] || enc.status}</em></div>` : ''}
              ${['atendido', 'urgencias'].includes(enc.status)
                ? `<button class="btn btn-ghost btn-block" disabled>${TS.icon('checkCircle', 17)} ${enc.status === 'atendido' ? 'Consulta cerrada' : 'Derivado a urgencias'}</button>`
                : `<button class="btn btn-primary btn-block" data-action="start" data-id="${enc.id}">${TS.icon('video', 17)} ${inConsult ? 'Volver a la consulta' : enc.status === 'en_espera' || !live ? 'Iniciar videoconsulta' : 'Llamar al paciente'}</button>`}
              <button class="btn btn-ghost btn-block" data-action="derivar">${TS.icon('ambulance', 17)} Derivar a urgencias</button>
              <button class="btn btn-ghost btn-block" data-action="back-bandeja">${TS.icon('x', 16)} Regresar a bandeja</button>
            </div>
            <div class="panel">
              <div class="panel-h"><span>EXPEDIENTE · ${persona.expediente}</span></div>
              ${this.keyData(persona)}
            </div>
            <div class="panel"><div class="panel-h"><span>TRIAJE DEL ASISTENTE</span></div>
              <div class="kv"><small>Prioridad</small>${TS.mtsPill(r.color, { sm: true })}</div>
              <div class="kv"><small>Discriminador</small><b>${TS.esc(r.disc)}</b></div>
              <div class="kv"><small>Tiempo objetivo</small><b>${r.mts.minutes} min</b></div>
              <div class="kv"><small>Motivo</small><b>${TS.Triage.flow(enc.ans.flow).label}</b><small>Diagrama MTS: ${TS.Triage.flow(enc.ans.flow).mts}</small></div>
            </div>
          </aside>
        </div>`;
    },

    consulta() {
      const S = TS.S, c = S.consult;
      const cd = this.caseData(c.encId);
      const { enc, persona } = cd;
      const f = TS.Triage.flow(enc.ans.flow);
      const hyps = TS.Clinical.hypotheses(enc, persona);
      const cps = c.lines.filter(l => l.copilot).map(l => this.cpCard(l.copilot)).reverse().join('');
      return `<div class="cs-head">
          <div><h2>${TS.esc(persona.nombre)} ${TS.esc(persona.apellidos)} ${TS.mtsPill(enc.result.color, { sm: true })}</h2>
          <small>${persona.edad} años · ${persona.sexo} · ${persona.derechohabiencia} · ${enc.folio}${enc.parentId ? ' · <b class="red">RE-CONSULTA</b>' : ''}</small></div>
          <div class="cs-status">${c.joined ? `<span class="live-pill green"><i></i>Paciente conectado</span><b data-since="${c.startedAt}">00:00</b>` : '<span class="live-pill amber"><i></i>Esperando al paciente…</span>'}</div>
        </div>
        <div class="kd-strip">
          <span><small>Sangre</small><b>${persona.sangre}</b></span>
          <span class="${persona.alergias.length ? 'alert' : ''}"><small>Alergias</small><b>${persona.alergias.length ? persona.alergias.map(a => a.label).join(', ') : 'Ninguna'}</b></span>
          <span><small>Crónicos</small><b>${persona.cronicos.join(', ') || 'Ninguno'}</b></span>
          <span><small>Medicamentos</small><b>${persona.meds.join('; ') || 'Ninguno'}</b></span>
          ${persona.embarazo ? `<span class="gold"><small>Embarazo</small><b>${persona.embarazo.sdg} SDG</b></span>` : ''}
        </div>
        <div class="cs-grid">
          <div class="cs-left">
            <div class="video">
              <div class="v-name"><span class="av sm" style="background:${persona.color}">${persona.iniciales}</span>${TS.esc(persona.nombre)} ${TS.esc(persona.apellidos.split(' ')[0])}</div>
              <div class="v-ai"><i></i>Copiloto escuchando</div>
              <div class="v-center">${c.joined ? `<span class="v-av" style="background:${persona.color}">${persona.iniciales}</span><span class="vc-wave">${'<i></i>'.repeat(5)}</span>` : `<span class="v-wait">${TS.icon('clock', 26)}<small>El paciente recibió la notificación<br>“¡Es tu turno!”</small></span>`}</div>
              <div class="v-self">${TS.DOCTOR.iniciales}</div>
              <div class="v-ctrl"><button data-action="dc-toggle">${TS.icon('mic', 18)}</button><button data-action="dc-toggle">${TS.icon('video', 18)}</button></div>
            </div>
            <div class="panel tr-panel">
              <div class="panel-h"><span>${TS.icon('wave', 15)} TRANSCRIPCIÓN EN VIVO</span><small>Copiloto administrativo</small></div>
              <div class="tr-box" data-transcript>${c.lines.length ? c.lines.map(l => this.lineHtml(l)).join('') : '<div class="tr-empty">La transcripción aparecerá cuando el paciente ingrese.</div>'}</div>
            </div>
          </div>
          <div class="cs-right">
            <div class="panel cp-live">
              <div class="panel-h"><span>${TS.icon('sparkles', 15)} COPILOTO CLÍNICO</span><small>Solo visible para el médico</small></div>
              ${(enc.ans.voice || []).length ? `<div class="cp-voice"><b>${TS.icon('mic', 13)} Lo que dijo por voz antes de la consulta</b>${this.voiceList(enc)}</div>` : ''}
              <div data-cp-live>${cps || ''}</div>
              <div class="hyps-mini">${hyps.map(h => `<button class="hm ${h.conf === 'Descartar' ? 'rule' : ''}" data-action="use-dx" data-code="${h.code}" data-label="${TS.esc(h.label)}"><b>${h.code}</b><span>${TS.esc(h.label)}</span><em>${h.conf}</em></button>`).join('')}</div>
            </div>
            <div class="panel tabs-panel">
              <div class="ptabs">${[['soap', 'clipboard', 'SOAP'], ['receta', 'pill', 'Receta'], ['seguimiento', 'activity', 'Seguimiento'], ['referencia', 'arrowUR', 'Referencia']].map(t => `<button class="${c.tab === t[0] ? 'on' : ''}" data-action="tab" data-id="${t[0]}">${TS.icon(t[1], 15)} ${t[2]}${t[0] === 'receta' && c.rx.length ? ` <em>${c.rx.length}</em>` : ''}${t[0] === 'referencia' && c.referral ? ' <em>1</em>' : ''}</button>`).join('')}</div>
              <div class="ptab-body">${this.tab[c.tab].call(this, c, enc, persona, f)}</div>
            </div>
            ${this.completeBtn(c)}
          </div>
        </div>`;
    },

    seguimientos() {
      const S = TS.S;
      const seeds = [
        { nombre: 'Ana Karen Morales', motivo: 'Faringitis aguda', by: 'Dr. R. Salinas', next: 'Hoy 19:00', st: 'Programado', resp: '—' },
        { nombre: 'José Luis Treviño', motivo: 'Lumbago', by: 'Dra. A. Torres', next: 'Mañana 10:00', st: 'Programado', resp: '—' },
        { nombre: 'Patricia Nava', motivo: 'Gastroenteritis', by: 'Asistente virtual', next: '—', st: 'Cerrado', resp: 'Mejor' }
      ];
      const live = S.followups.map(fu => {
        const e = TS.enc(fu.encId); const p = TS.PERSONAS.find(x => x.id === fu.personaId);
        return { nombre: `${p.nombre} ${p.apellidos}`, motivo: e.dx ? e.dx.label : TS.Triage.flow(e.ans.flow).label, by: fu.by, next: fu.status === 'programado' ? TS.fmt.dateTime(fu.dueAt) : '—',
          st: { programado: 'Programado', enviado: 'Enviado', cerrado: 'Cerrado', escalado: 'Escalado' }[fu.status], resp: fu.response ? { mejor: 'Mejor', igual: 'Igual', peor: 'Peor' }[fu.response] : '—', live: true };
      });
      const rows = live.concat(seeds);
      return `${this.head('CLÍNICO / <b>SEGUIMIENTOS</b>', 'Seguimiento entre consultas', 'El médico define la ruta clínica y delega el seguimiento al asistente virtual (copiloto administrativo).',
        `<div class="adv"><button class="btn btn-ghost" data-action="advance" data-id="24">${TS.icon('forward', 16)} Simular +24 h</button><button class="btn btn-primary" data-action="advance" data-id="48">${TS.icon('forward', 16)} Simular +48 h</button></div>`)}
        <div class="kpis sm">
          <div class="kpi"><small>Seguimientos activos</small><b>${rows.filter(r => ['Programado', 'Enviado'].includes(r.st)).length}</b></div>
          <div class="kpi"><small>Respondidos</small><b>${rows.filter(r => r.resp !== '—').length}</b></div>
          <div class="kpi"><small>Escalados a médico</small><b>${rows.filter(r => r.st === 'Escalado').length}</b></div>
          <div class="kpi"><small>Adherencia estimada</small><b>87%</b></div>
        </div>
        <div class="table t-fu">
          <div class="tr th"><span>Paciente</span><span>Motivo / diagnóstico</span><span>Programado por</span><span>Próximo contacto</span><span>Estado</span><span>Respuesta</span></div>
          ${rows.map(r => `<div class="tr ${r.live ? 'live' : ''}"><span class="pt"><b>${TS.esc(r.nombre)}</b>${r.live ? '<em class="new">APP</em>' : ''}</span><span>${TS.esc(r.motivo)}</span><span>${TS.esc(r.by)}</span><span>${r.next}</span><span><em class="st st-${r.st.toLowerCase()}">${r.st}</em></span><span>${r.resp}</span></div>`).join('')}
        </div>`;
    },

    recetas() {
      const list = TS.S.prescriptions;
      return `${this.head('CLÍNICO / <b>RECETAS FIRMADAS</b>', 'Recetas electrónicas firmadas', 'Firmadas con e.firma · disponibles para el paciente en la app y para la unidad que surte.')}
        <div class="table t-rx">
          <div class="tr th"><span>Folio</span><span>Paciente</span><span>Diagnóstico</span><span>Medicamentos</span><span>Firmada</span></div>
          ${list.length ? list.map(r => { const p = TS.PERSONAS.find(x => x.id === r.personaId); return `<div class="tr"><span><b>${r.folio}</b></span><span>${p.nombre} ${p.apellidos}</span><span>${r.dx ? `${r.dx.code} · ${TS.esc(r.dx.label)}` : '—'}</span><span>${r.meds.map(m => TS.esc(m.nombre)).join(', ')}</span><span>${TS.fmt.time(r.at)} h</span></div>`; }).join('')
            : `<div class="tr empty-row"><span>Aún no hay recetas firmadas en este turno.</span></div>`}
        </div>`;
    }
  },

  /* Celda de tiempo/estado para casos que no están en espera. */
  closedCell(r) {
    if (r.raw === 'triaje') return `<b>Eligiendo ruta</b><small>desde ${TS.fmt.time(r.since)} h</small>`;
    if (r.raw === 'cita') {
      const ap = TS.S.appointments.find(a => a.encId === r.id);
      return `<b>Cita ${ap ? TS.fmt.date(ap.when) + ' ' + TS.fmt.time(ap.when) : ''}</b><small>primer nivel · ${ap ? TS.UNITS.find(u => u.id === ap.unitId).nombre.split(' · ')[0] : ''}</small>`;
    }
    if (r.raw === 'autocuidado') return `<b>Autocuidado</b><small>seguimiento del asistente</small>`;
    if (r.raw === 'urgencias') return `<b class="red">En urgencias</b><small>prealerta ${TS.fmt.time(r.closedAt)} h</small>`;
    return `<b>Atendido ${TS.fmt.time(r.closedAt)} h</b><small>receta y seguimiento</small>`;
  },

  voiceList(enc) {
    const lbl = { motivo: 'Motivo de consulta (triaje)', nota: 'Comentario para el médico (triaje)', espera: 'Nota de voz desde la sala de espera' };
    return (enc.ans.voice || []).map(v => `<div class="vnote ${v.step === 'espera' ? 'esp' : ''}"><span class="vn-ic">${TS.icon('mic', 15)}</span><span><small>${lbl[v.step] || 'Voz'} · ${TS.fmt.time(v.at)} h</small><p>“${TS.esc(v.text)}”</p></span></div>`).join('');
  },

  closedNote(enc, persona) {
    const rx = TS.S.prescriptions.find(x => x.encId === enc.id);
    const fu = TS.S.followups.find(x => x.id === enc.followupId);
    const ap = TS.S.appointments.find(x => x.encId === enc.id);
    const so = enc.soap || {};
    return `<div class="closed-box">
      <div class="cb-h">${TS.icon('checkCircle', 17)} <b>Consulta cerrada · ${TS.fmt.dateTime(enc.closedAt)}</b><small>${TS.esc(enc.doctor || TS.DOCTOR.nombre)}</small></div>
      ${enc.dx ? `<div class="cb-dx"><span class="hyp-code">${enc.dx.code}</span> ${TS.esc(enc.dx.label)}</div>` : ''}
      <div class="cb-soap">${['s', 'o', 'a', 'p'].map(k => so[k] ? `<div><b>${k.toUpperCase()}</b><span>${TS.esc(so[k])}</span></div>` : '').join('')}</div>
      <div class="cb-row">
        ${rx ? `<div class="cb-card">${TS.icon('pill', 16)}<span><b>Receta ${rx.folio}</b><small>${rx.meds.map(m => TS.esc(m.nombre)).join(', ')} · firmada ${TS.fmt.time(rx.signedAt || rx.at)} h</small></span></div>` : ''}
        ${fu ? `<div class="cb-card">${TS.icon('bell', 16)}<span><b>Seguimiento ${fu.hours} h</b><small>${{ programado: 'Programado · ' + TS.fmt.dateTime(fu.dueAt), enviado: 'Enviado al paciente', cerrado: 'Cerrado · ' + (fu.response || ''), escalado: 'Escalado a re-consulta' }[fu.status]}</small></span></div>` : ''}
        ${ap ? `<div class="cb-card">${TS.icon('calendar', 16)}<span><b>${ap.tipo}</b><small>${TS.UNITS.find(u => u.id === ap.unitId).nombre} · ${TS.fmt.dateTime(ap.when)}</small></span></div>` : ''}
      </div>
    </div>`;
  },

  keyData(persona) {
    return `<div class="keydata dc one">
      <div><small>Tipo de sangre</small><b>${persona.sangre}</b></div>
      <div class="${persona.alergias.length ? 'alert' : ''}"><small>Alergias</small><b>${persona.alergias.length ? persona.alergias.map(a => a.label).join(', ') : 'Ninguna conocida'}</b></div>
      <div><small>Padecimientos crónicos</small><b>${persona.cronicos.join(', ') || 'Ninguno'}</b></div>
      <div><small>Medicamentos actuales</small><b>${persona.meds.join('; ') || 'Ninguno'}</b></div>
      ${persona.embarazo ? `<div class="gold"><small>Embarazo</small><b>${persona.embarazo.sdg} semanas de gestación</b></div>` : ''}
    </div>`;
  },

  completeBtn(c) {
    const blocked = c.rx.length && !c.signed && c.rx.some(m => TS.Clinical.checkMed(m, TS.PERSONAS.find(p => p.id === TS.enc(c.encId).personaId) || TS.persona()).some(a => a.level === 'block'));
    const label = !c.joined ? 'Esperando al paciente…' : blocked ? 'Corrige la receta para completar' : (c.signed ? 'Completar consulta' : 'Firmar receta y completar consulta');
    return `<button class="btn btn-green btn-block btn-lg" data-action="complete" ${!c.joined || blocked ? 'disabled' : ''}>${TS.icon('checkCircle', 18)} ${label}</button>`;
  },

  tab: {
    soap(c) {
      const pending = !c.done;
      const fld = (k, l, rows) => `<label class="soap"><span><b>${k.toUpperCase()}</b> ${l}</span><textarea data-soap="${k}" rows="${rows}" ${pending && k !== 's' && !c.soap[k] ? 'placeholder="El copiloto administrativo redactará esta sección a partir de la transcripción…"' : ''}>${TS.esc(c.soap[k])}</textarea></label>`;
      return `<div class="ai-badge">${TS.icon('sparkles', 13)} Borrador del copiloto administrativo · editable por el médico</div>
        ${fld('s', 'Subjetivo', 4)}${fld('o', 'Objetivo', 2)}${fld('a', 'Análisis', 2)}${fld('p', 'Plan', 3)}`;
    },

    receta(c, enc, persona) {
      const hyps = TS.Clinical.hypotheses(enc, persona);
      const dxOpts = hyps.concat(c.dx && !hyps.some(h => h.code === c.dx.code) ? [{ ...c.dx }] : []);
      const anyBlock = c.rx.some(m => TS.Clinical.checkMed(m, persona).some(a => a.level === 'block'));
      return `<label class="fld"><span>Diagnóstico (CIE-10)</span><select data-dxsel>${dxOpts.map(h => `<option value="${h.code}|${TS.esc(h.label)}" ${c.dx && c.dx.code === h.code ? 'selected' : ''}>${h.code} · ${TS.esc(h.label)}</option>`).join('')}${!c.dx ? '<option selected disabled>Selecciona…</option>' : ''}</select></label>
        <div class="rx-list">${c.rx.length ? c.rx.map(m => {
          const al = TS.Clinical.checkMed(m, persona);
          return `<div class="rx-item ${al.some(a => a.level === 'block') ? 'block' : al.length ? 'warn' : ''}">
            <div class="rx-top"><b>${TS.esc(m.nombre)}</b><small>${TS.esc(m.pres)}</small>${m.ai ? '<em class="ai">Sugerencia IA</em>' : ''}<button class="x" data-action="rm-med" data-id="${m.id}" aria-label="Quitar">${TS.icon('trash', 14)}</button></div>
            <div class="rx-dose">${TS.esc(m.dosis)} · ${TS.esc(m.freq)} · ${m.dias} días</div>
            ${al.map(a => `<div class="rx-al ${a.level}">${TS.icon('alert', 13)} ${TS.esc(a.text)}</div>`).join('')}
          </div>`;
        }).join('') : '<div class="rx-empty">Sin medicamentos. Agrega uno del cuadro básico o completa sin receta.</div>'}</div>
        <label class="fld"><span>Agregar del cuadro básico</span><select data-addmed><option value="">Buscar medicamento…</option>${TS.MEDS.filter(m => !c.rx.some(x => x.id === m.id)).map(m => `<option value="${m.id}">${m.nombre} · ${m.pres}</option>`).join('')}</select></label>
        ${c.signed ? `<div class="signed">${TS.icon('checkCircle', 18)}<span><b>Firmada digitalmente por ${TS.DOCTOR.nombre}</b><small>Cédula ${TS.DOCTOR.cedula} · ${TS.fmt.time(c.signedAt)} h · Folio <b>${c.rxFolio}</b></small><small class="mono">Sello: ${(c.rxFolio + 'e.firma').split('').map(ch => ch.charCodeAt(0).toString(16)).join('').slice(0, 32)}…</small></span></div>`
          : `<button class="btn btn-primary btn-block" data-action="sign" ${!c.rx.length || anyBlock ? 'disabled' : ''}>${TS.icon('signature', 17)} ${anyBlock ? 'Corrige las contraindicaciones para firmar' : 'Firmar receta con e.firma'}</button>`}`;
    },

    seguimiento(c, enc, persona, f) {
      const opts = [[24, '24 h'], [48, '48 h'], [72, '72 h'], [0, 'Sin seguimiento']];
      return `<p class="tab-intro">Defines la ruta clínica; el <b>copiloto administrativo</b> la ejecuta: pregunta al paciente cómo sigue, recuerda tomas y escala si empeora.</p>
        <div class="fld"><span>Primer contacto de seguimiento</span><div class="seg">${opts.map(o => `<button class="${c.followH === o[0] ? 'on' : ''}" data-action="fu-h" data-id="${o[0]}">${o[1]}</button>`).join('')}</div></div>
        <div class="fld"><span>Signos de alarma que vigilará el asistente</span><div class="warn-list">${(f.warn || []).map(w => `<span class="wl">${TS.icon('check', 12)} ${TS.esc(w)}</span>`).join('')}</div></div>
        <div class="fld"><span>Vista previa de la notificación al paciente</span>
          <div class="notif-prev"><span class="np-ic">${TS.icon('shieldPlus', 16)}</span><span><b>Tu Salud</b><small>Hola, ${persona.nombre}. ${c.followH ? `En ${c.followH} h te preguntaré cómo sigues.` : ''} Recuerda tu tratamiento y vigila: ${(f.warn || []).slice(0, 2).map(w => w.toLowerCase()).join(', ')}.</small></span></div></div>`;
    },

    referencia(c, enc, persona) {
      const us = TS.unitsFor(persona, u => !u.urgencias).slice(0, 4);
      const parent = enc.parentId ? TS.enc(enc.parentId) : null;
      return `${parent ? `<div class="cp-card cp-alert">${TS.icon('sparkles', 15)}<span><b>Sugerencia del copiloto</b><small>Sin mejoría tras tratamiento ambulatorio: considerar referencia a primer nivel para valoración presencial.</small></span></div>` : ''}
        <p class="tab-intro">Unidades ordenadas por derechohabiencia (${persona.derechohabiencia}) y cercanía al paciente. Se agenda automáticamente y el paciente la recibe en su app.</p>
        ${us.map(u => `<button class="ref ${c.referral === u.id ? 'on' : ''}" data-action="ref" data-id="${u.id}"><span class="u-ic">${TS.icon('building', 16)}</span><span><b>${u.nombre}</b><small>${u.inst} · ${u.km.toFixed(1)} km${u.match ? ' · derechohabiencia' : ''}</small></span><span class="rd">${c.referral === u.id ? TS.icon('checkCircle', 18) : ''}</span></button>`).join('')}`;
    }
  }
};
