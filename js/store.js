/* ==========================================================================
   Estado global, acciones y simulación de la red (sin backend).
   ========================================================================== */
window.TS = window.TS || {};

TS.LOADED_AT = Date.now();

TS.initialState = function () {
  return {
    view: 'inicio',
    personaId: 'jorge',
    loggedIn: false,
    phone: { screen: 'login', history: [], params: {} },
    chat: null,
    encounters: [],
    activeEncId: null,
    doctor: { screen: 'bandeja', caseId: null, filter: 'todos', tab: 'soap', followTab: 'activos' },
    consult: null,
    followups: [],
    notifications: [],
    appointments: [],
    prescriptions: [],
    prealerts: [],
    clockOffsetH: 0,
    scenario: null,
    seq: 1
  };
};

TS.S = TS.initialState();
TS._subs = [];
TS._timers = [];

TS.on = fn => TS._subs.push(fn);
TS.emit = (topic = 'all', data) => TS._subs.forEach(fn => { try { fn(topic, data); } catch (e) { console.error(e); } });

TS.now = () => Date.now() + TS.S.clockOffsetH * 3600000;
TS.persona = () => TS.PERSONAS.find(p => p.id === TS.S.personaId);
TS.enc = id => TS.S.encounters.find(e => e.id === (id || TS.S.activeEncId));
TS.isAuto = () => TS.S.view === 'paciente';               // médico simulado
TS.patientVisible = () => ['paciente', 'recorrido'].includes(TS.S.view);
TS.later = (ms, fn) => { const t = setTimeout(fn, ms); TS._timers.push(t); return t; };
TS.rand4 = () => String(1000 + Math.floor(Math.random() * 9000));
TS.id = p => `${p}${TS.S.seq++}`;

TS.distance = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 14) / 1000; // km (escala simulada)

TS.unitsFor = function (persona, filterFn) {
  return TS.UNITS.filter(filterFn || (() => true)).map(u => {
    const km = TS.distance(persona.pos, u);
    const match = u.inst === persona.derechohabiencia;
    return { ...u, km, match, mins: Math.max(4, Math.round(km * 4.5)) };
  }).sort((a, b) => (b.match - a.match) || (a.km - b.km));
};

TS.notify = function (n) {
  TS.S.notifications.unshift({ id: TS.id('n'), at: TS.now(), read: false, ...n });
};

TS.toast = function (text, kind) { TS.emit('toast', { text, kind }); };

/* ==========================================================================
   Acciones
   ========================================================================== */
TS.act = {
  setView(v) {
    TS.S.view = v;
    TS.emit('view');
    // Si se entra a la vista del médico y hay un paciente llamado, se une solo.
    const c = TS.S.consult;
    if (c && !c.joined && !TS.patientVisible()) TS.later(1800, () => TS.act.patientJoin());
  },

  reset(keepView) {
    TS._timers.forEach(clearTimeout); TS._timers = [];
    const view = TS.S.view;
    TS.S = TS.initialState();
    if (keepView) TS.S.view = view;
    TS.emit('all');
  },

  login(personaId) {
    TS.S.personaId = personaId;
    TS.S.loggedIn = true;
    TS.S.phone = { screen: 'home', history: [], params: {} };
    TS.emit('all');
  },

  logout() {
    TS.S.loggedIn = false;
    TS.S.phone = { screen: 'login', history: [], params: {} };
    TS.emit('phone');
  },

  go(screen, params, replace) {
    const p = TS.S.phone;
    if (!replace && p.screen !== screen) p.history.push({ screen: p.screen, params: p.params });
    p.screen = screen; p.params = params || {};
    TS.emit('phone');
  },

  back() {
    const p = TS.S.phone;
    const prev = p.history.pop();
    if (prev) { p.screen = prev.screen; p.params = prev.params; } else { p.screen = 'home'; p.params = {}; }
    TS.emit('phone');
  },

  home() { TS.S.phone.history = []; TS.S.phone.screen = 'home'; TS.S.phone.params = {}; TS.emit('phone'); },

  /* ---------- Triaje ---------- */
  createEncounter(ans, kind, parentId) {
    const persona = TS.persona();
    const result = kind === 'seguimiento-peor'
      ? (() => { const r = TS.Triage.evaluate(ans, persona); return TS.Triage.rank(r.color) > 2 ? { ...r, color: 'amarillo', disc: 'Empeoramiento durante el seguimiento', src: 'Copiloto administrativo', mts: TS.MTS.amarillo } : r; })()
      : TS.Triage.evaluate(ans, persona);
    const enc = {
      id: TS.id('enc'), folio: `CAD-2026-${TS.rand4()}`, createdAt: TS.now(), personaId: persona.id,
      ans, result, status: 'triaje', path: null, kind: kind || 'triaje', parentId: parentId || null,
      dx: null, rx: [], soap: null, rxFolio: null, followupId: null, referral: null
    };
    TS.S.encounters.unshift(enc);
    TS.S.activeEncId = enc.id;
    return enc;
  },

  choosePath(path, encId) {
    const enc = TS.enc(encId);
    if (!enc) return;
    const persona = TS.persona();
    enc.path = path;
    if (path === 'remota') {
      enc.status = 'en_espera';
      enc.waitingSince = TS.now();
      TS.act.go('espera', { encId: enc.id });
      TS.emit('queue');
      if (TS.isAuto()) TS.later(5000, () => { if (enc.status === 'en_espera') TS.act.startConsult(enc.id); });
    } else if (path === 'urgencias') {
      enc.status = 'urgencias';
      const h = TS.unitsFor(persona, u => u.urgencias)[0];
      TS.S.prealerts.unshift({ id: TS.id('pa'), encId: enc.id, at: TS.now(), unit: h, persona: persona.id });
      TS.act.go('urgencias', { encId: enc.id });
      TS.emit('queue');
    } else if (path === 'autocuidado') {
      enc.status = 'autocuidado';
      const f = TS.Triage.flow(enc.ans.flow);
      TS.act.scheduleFollowup(enc, (f && f.recheckH) || 48, 'Asistente virtual');
      TS.act.go('autocuidado', { encId: enc.id });
    } else if (path === 'cita') {
      TS.act.go('agenda', { encId: enc.id });
    }
  },

  scheduleFollowup(enc, hours, by) {
    const fu = { id: TS.id('fu'), encId: enc.id, personaId: enc.personaId, createdAt: TS.now(), dueAt: TS.now() + hours * 3600000, hours, status: 'programado', by: by || 'Copiloto administrativo', response: null };
    TS.S.followups.unshift(fu);
    enc.followupId = fu.id;
    return fu;
  },

  bookAppointment(unitId, when, encId, tipo) {
    const enc = TS.enc(encId);
    const ap = { id: TS.id('ap'), unitId, when, encId: enc ? enc.id : null, tipo: tipo || 'Consulta presencial · primer nivel', folio: `CIT-${TS.rand4()}`, motivo: enc ? TS.Triage.flow(enc.ans.flow).label : 'Consulta' };
    TS.S.appointments.unshift(ap);
    if (enc && !enc.referral) { enc.status = 'cita'; }
    TS.notify({ title: 'Cita confirmada', text: `${TS.UNITS.find(u => u.id === unitId).nombre} · ${TS.fmt.dateTime(when)}`, icon: 'calendar' });
    return ap;
  },

  /* ---------- Red Nacional de Atención Médica Remota ---------- */
  openCase(id) {
    TS.S.doctor.caseId = id;
    TS.S.doctor.screen = 'caso';
    TS.emit('doctor');
  },

  doctorScreen(screen) {
    TS.S.doctor.screen = screen;
    TS.emit('doctor');
  },

  startConsult(encId) {
    const enc = TS.enc(encId);
    if (!enc) return;
    const persona = TS.PERSONAS.find(p => p.id === enc.personaId);
    const f = TS.Triage.flow(enc.ans.flow);
    if (!enc.path || enc.path !== 'remota') { enc.path = 'remota'; enc.waitingSince = enc.waitingSince || TS.now(); }
    enc.status = 'llamando';
    const parent = enc.parentId ? TS.enc(enc.parentId) : null;
    const rxIds = parent ? [] : ((f.consult && f.consult.rx) || []);
    TS.S.consult = {
      encId: enc.id, joined: false, startedAt: null, lines: [], done: false,
      soap: {
        s: TS.Clinical.summary(enc, persona),
        o: '', a: '', p: ''
      },
      dx: parent ? null : (f.consult ? { ...f.consult.dx } : null),
      rx: rxIds.map(id => ({ ...TS.MEDS.find(m => m.id === id), ai: true })),
      signed: false, rxFolio: null,
      followH: (f && f.recheckH) || 48,
      referral: null,
      tab: 'soap'
    };
    TS.S.doctor.caseId = enc.id;
    TS.S.doctor.screen = 'consulta';
    if (['espera', 'resultado', 'autocuidado', 'home', 'citaok', 'urgencias'].includes(TS.S.phone.screen)) TS.act.go('turno', { encId: enc.id }, TS.S.phone.screen === 'espera');
    TS.notify({ title: '¡Es tu turno!', text: `${TS.DOCTOR.corto} ya ingresó a tu consulta.`, icon: 'video' });
    TS.emit('all');
    if (!TS.patientVisible()) TS.later(1800, () => TS.act.patientJoin());
    if (TS.isAuto()) TS.later(4500, () => { const c = TS.S.consult; if (c && !c.joined && c.encId === enc.id) TS.act.patientJoin(); });
  },

  patientJoin() {
    const c = TS.S.consult;
    if (!c || c.joined) return;
    const enc = TS.enc(c.encId);
    c.joined = true;
    c.startedAt = TS.now();
    enc.status = 'en_consulta';
    if (TS.S.phone.screen === 'turno' || TS.S.phone.screen === 'espera') TS.act.go('video', { encId: enc.id }, true);
    TS.emit('all');
    TS.Sim.runTranscript(enc);
  },

  signRx() {
    const c = TS.S.consult;
    if (!c) return;
    c.signed = true;
    c.rxFolio = `RX-2026-${TS.rand4()}`;
    c.signedAt = TS.now();
    TS.emit('doctor');
  },

  completeConsult(auto) {
    const c = TS.S.consult;
    if (!c) return;
    const enc = TS.enc(c.encId);
    const persona = TS.PERSONAS.find(p => p.id === enc.personaId);
    if (auto) {
      const before = c.rx.length;
      c.rx = c.rx.filter(m => !TS.Clinical.checkMed(m, persona).some(a => a.level === 'block'));
      // El médico sustituye el antibiótico contraindicado (p. ej. alergia a penicilina).
      if (c.rx.length < before && enc.ans.flow === 'garganta') c.rx.unshift({ ...TS.MEDS.find(m => m.id === 'azitromicina') });
      if (c.rx.length && !c.signed) { c.signed = true; c.rxFolio = `RX-2026-${TS.rand4()}`; c.signedAt = TS.now(); }
      if (!c.o) TS.Sim.fillSoap(enc);
      if (enc.parentId && !c.referral) c.referral = TS.unitsFor(persona, u => !u.urgencias)[0].id;
    }
    // Siempre se genera una receta demo al cerrar la consulta: si el médico no
    // agregó medicamentos, se usan los sugeridos por el copiloto que no estén contraindicados.
    if (!c.rx.length) {
      const f = TS.Triage.flow(enc.ans.flow);
      const ids = (f.consult && f.consult.rx && f.consult.rx.length) ? f.consult.rx : ['paracetamol'];
      c.rx = ids.map(id => ({ ...TS.MEDS.find(m => m.id === id) })).filter(m => !TS.Clinical.checkMed(m, persona).some(a => a.level === 'block'));
      if (!c.rx.length) c.rx = [{ ...TS.MEDS.find(m => m.id === 'paracetamol') }];
      c.signed = false;
    }
    if (!c.signed) { c.signed = true; c.rxFolio = `RX-2026-${TS.rand4()}`; c.signedAt = TS.now(); }
    if (!c.dx) { const h = TS.Clinical.hypotheses(enc, persona)[0]; c.dx = h ? { code: h.code, label: h.label } : null; }
    // El plan de la nota SOAP refleja la receta final que firmó el médico.
    {
      const tx = ` Tratamiento: ${c.rx.map(m => `${m.nombre} ${m.dosis} ${m.freq} por ${m.dias} días`).join('; ')}.`;
      let pl = (c.soap.p || '').replace(/ ?Tratamiento:[\s\S]*?\.(?= Seguimiento|$)/, '');
      pl = / Seguimiento/.test(pl) ? pl.replace(' Seguimiento', `${tx} Seguimiento`) : pl + tx;
      c.soap.p = pl.trim();
    }
    enc.status = 'atendido';
    enc.dx = c.dx;
    enc.rx = c.rx.map(m => ({ ...m }));
    enc.soap = { ...c.soap };
    enc.rxFolio = c.rx.length ? c.rxFolio : null;
    enc.doctor = TS.DOCTOR.nombre;
    enc.closedAt = TS.now();
    if (enc.rxFolio) {
      TS.S.prescriptions.unshift({ id: TS.id('rx'), folio: enc.rxFolio, encId: enc.id, at: TS.now(), meds: enc.rx, dx: enc.dx, doctor: TS.DOCTOR.nombre, cedula: TS.DOCTOR.cedula, personaId: persona.id, plan: (c.soap.p || '').replace(/ Tratamiento:.*?\.(?= |$)/, ''), signedAt: c.signedAt || TS.now() });
      TS.notify({ title: 'Receta electrónica disponible', text: `Folio ${enc.rxFolio} · firmada por ${TS.DOCTOR.corto}`, icon: 'pill' });
    }
    if (c.referral) {
      enc.referral = c.referral;
      const when = TS.nextSlot(1, 9, 30);
      TS.act.bookAppointment(c.referral, when, enc.id, 'Referencia a unidad médica');
      enc.status = 'atendido';
    }
    if (c.followH) {
      const fu = TS.act.scheduleFollowup(enc, c.followH, 'Copiloto administrativo');
      TS.notify({ title: 'Seguimiento programado', text: `Te escribiré en ${c.followH} h para saber cómo sigues.`, icon: 'bell' });
      fu.plan = c.soap.p;
    }
    TS.S.consult = null;
    TS.S.doctor.screen = 'bandeja';
    TS.S.doctor.caseId = null;
    if (['video', 'turno', 'espera'].includes(TS.S.phone.screen)) TS.act.go('atendido', { encId: enc.id }, true);
    TS.emit('all');
    TS.toast('Consulta completada · nota SOAP y receta guardadas en el expediente (NOM-024)', 'ok');
  },

  /* Nota de voz enviada desde la sala de espera (transcrita en el teléfono). */
  addVoiceNote(encId, text) {
    const enc = TS.enc(encId);
    if (!enc) return;
    enc.ans.voice = enc.ans.voice || [];
    enc.ans.voice.push({ text, at: TS.now(), step: 'espera' });
    enc.voiceNew = true;
    TS.emit('all');
    TS.toast('Nota de voz transcrita y enviada a la médica', 'ok');
  },

  /* Lo que el paciente dice por micrófono durante la consulta llega a la transcripción del médico. */
  patientSays(text) {
    const c = TS.S.consult;
    if (!c || !text) return;
    const ln = { who: 'pt', t: text, at: TS.now(), voice: true };
    c.lines.push(ln);
    c.soap.s = `${c.soap.s || ''} Durante la consulta refiere: “${text}”.`.trim();
    TS.emit('transcript', ln);
  },

  cancelWait(encId) {
    if (TS.Voice) TS.Voice.cancel();
    const enc = TS.enc(encId);
    if (enc) enc.status = 'cancelado';
    TS.act.home();
    TS.emit('queue');
  },

  /* ---------- Copiloto administrativo: seguimiento ---------- */
  advanceTime(hours) {
    TS.S.clockOffsetH += hours;
    const due = TS.S.followups.filter(f => f.status === 'programado' && f.dueAt <= TS.now());
    due.forEach(f => {
      f.status = 'enviado';
      f.sentAt = TS.now();
      TS.notify({ title: '¿Cómo sigues?', text: 'Tu asistente quiere saber cómo te sientes.', icon: 'heart', followupId: f.id });
    });
    if (due.length && TS.S.loggedIn) TS.act.go('checkin', { followupId: due[0].id });
    TS.emit('all');
    TS.toast(due.length ? `Avanzamos ${hours} h · ${due.length} seguimiento(s) enviado(s) por el copiloto administrativo` : `Avanzamos ${hours} h · sin seguimientos pendientes`, 'info');
  },

  answerCheckin(followupId, status, warnIds) {
    const fu = TS.S.followups.find(f => f.id === followupId);
    if (!fu) return;
    const enc = TS.enc(fu.encId);
    fu.response = status; fu.respondedAt = TS.now(); fu.warn = warnIds || [];
    if (status === 'mejor') { fu.status = 'cerrado'; TS.emit('all'); return { outcome: 'cerrado' }; }
    if (status === 'igual' && !(warnIds || []).length) {
      fu.status = 'cerrado';
      const nfu = TS.act.scheduleFollowup(enc, 24, 'Copiloto administrativo');
      TS.emit('all');
      return { outcome: 'reprogramado', fu: nfu };
    }
    fu.status = 'escalado';
    const ans = { ...enc.ans, red: [], asked: {}, note: `Seguimiento: ${status === 'peor' ? 'refiere empeoramiento' : 'sin mejoría'}${(warnIds || []).length ? ' con signos de alarma: ' + warnIds.join(', ') : ''}.` };
    const nenc = TS.act.createEncounter(ans, 'seguimiento-peor', enc.id);
    nenc.result.positives.unshift({ color: nenc.result.color, disc: nenc.result.disc, src: 'Seguimiento' });
    TS.emit('all');
    return { outcome: 'escalado', enc: nenc };
  }
};

/* Próximo horario disponible (para citas y referencias). */
TS.nextSlot = function (daysAhead, h, m) {
  const d = new Date(TS.now());
  d.setDate(d.getDate() + daysAhead);
  d.setHours(h, m || 0, 0, 0);
  return d.getTime();
};

/* ==========================================================================
   Simulación (transcripción en vivo y redacción del copiloto administrativo)
   ========================================================================== */
TS.Sim = {
  script(enc) {
    const persona = TS.PERSONAS.find(p => p.id === enc.personaId);
    const f = TS.Triage.flow(enc.ans.flow);
    const k = f.consult;
    const dur = TS.Clinical.durText(enc.ans.dur);
    const alg = persona.alergias.length ? persona.alergias.map(a => a.label.toLowerCase()).join(', ') : null;
    const parent = enc.parentId ? TS.enc(enc.parentId) : null;
    const lines = [];
    if (parent) {
      lines.push({ who: 'dr', t: `Hola, ${persona.nombre}. Soy la ${TS.DOCTOR.corto}. Veo que ya te atendimos por ${f.label.toLowerCase()} y que en tu seguimiento reportaste que no has mejorado.` });
      lines.push({ who: 'pt', t: 'Sí, doctora. Sigo igual o un poco peor, aunque tomé todo lo que me indicaron.' });
      lines.push({ who: 'dr', t: '¿Apareció algún síntoma nuevo desde la última consulta?' });
      lines.push({ who: 'pt', t: 'La fiebre regresó anoche y me siento más cansado.' });
      lines.push({ who: 'dr', t: 'Entiendo. Como no hubo respuesta al tratamiento, te voy a referir a tu unidad para valoración presencial y estudios.' });
      lines.push({ who: 'pt', t: 'Está bien. ¿Me llega la cita a la app?' });
      lines.push({ who: 'dr', t: 'Sí, el asistente te enviará la cita y las indicaciones.' });
    } else {
      lines.push({ who: 'dr', t: `Hola, ${persona.nombre}. Soy la ${TS.DOCTOR.corto}, de la Red Nacional de Atención Médica Remota. Ya revisé lo que platicaste con el asistente: ${f.label.toLowerCase()} desde hace ${dur}. ¿Cómo te sientes ahora?` });
      lines.push({ who: 'pt', t: k.p1, copilot: { kind: 'q', text: k.q2 } });
      lines.push({ who: 'dr', t: k.q2 });
      lines.push({ who: 'pt', t: k.p2, copilot: { kind: 'dx', text: `${k.dx.label} (${k.dx.code})` } });
      lines.push({ who: 'dr', t: alg ? `En tu expediente aparece alergia a ${alg}. ¿Es correcto?` : '¿Tienes alguna alergia a medicamentos?' });
      lines.push({ who: 'pt', t: alg ? 'Sí, es correcto.' : 'No, ninguna que yo sepa.', copilot: alg ? { kind: 'alert', text: `Alergia a ${alg} confirmada por el paciente. La receta se validará contra ella.` } : null });
      lines.push({ who: 'dr', t: 'Muy bien. Te explico el tratamiento; la receta y las indicaciones te llegan a la app en un momento.' });
    }
    return lines;
  },

  runTranscript(enc) {
    const c = TS.S.consult;
    const lines = this.script(enc);
    let i = 0;
    const step = () => {
      const cc = TS.S.consult;
      if (!cc || cc.encId !== enc.id) return;
      if (i >= lines.length) {
        cc.done = true;
        TS.Sim.fillSoap(enc);
        TS.emit('doctor');
        TS.emit('transcript', { done: true });
        if (TS.isAuto()) TS.later(3500, () => { if (TS.S.consult && TS.S.consult.encId === enc.id) TS.act.completeConsult(true); });
        return;
      }
      const ln = { ...lines[i], at: TS.now() };
      cc.lines.push(ln);
      TS.emit('transcript', ln);
      i++;
      TS.later(i === 1 ? 2600 : 3000, step);
    };
    TS.later(1200, step);
  },

  fillSoap(enc) {
    const c = TS.S.consult;
    if (!c) return;
    const f = TS.Triage.flow(enc.ans.flow);
    const k = f.consult;
    const parent = enc.parentId ? TS.enc(enc.parentId) : null;
    if (parent) {
      c.soap.o = 'Teleconsulta por video. Paciente alerta y orientado, decaído. Sin dificultad respiratoria aparente. Refiere recurrencia de fiebre.';
      c.soap.a = `Falla al tratamiento ambulatorio de ${parent.dx ? parent.dx.label : f.label} (${parent.dx ? parent.dx.code : ''}). Requiere valoración presencial.`;
      c.soap.p = 'Referencia a unidad de primer nivel para exploración física completa y estudios. Continuar medidas generales. Signos de alarma explicados.';
      if (!c.referral) c.referral = TS.unitsFor(TS.PERSONAS.find(p => p.id === enc.personaId), u => !u.urgencias)[0].id;
      c.dx = parent.dx;
    } else {
      c.soap.o = `Teleconsulta por video. ${k.exam}`;
      c.soap.a = `${k.dx.label} (CIE-10 ${k.dx.code}). Triaje Manchester ${enc.result.mts.name.toLowerCase()}.`;
      c.soap.p = `${k.plan}${c.rx.length ? ' Tratamiento: ' + c.rx.map(m => `${m.nombre} ${m.dosis} ${m.freq} por ${m.dias} días`).join('; ') + '.' : ''} Seguimiento por el asistente virtual en ${c.followH} h.`;
    }
  }
};
