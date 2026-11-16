/* ==========================================================================
   App del paciente — "Tu Salud"
   ========================================================================== */
window.TS = window.TS || {};

/* Bloque de marca: intenta cargar el imagotipo oficial (proporcionado por la
   Dirección de Imagen) y, si no existe, muestra un texto neutro. */
TS.LOGO = { light: null, dark: null };
TS.brand = function (variant) {
  const v = variant || 'light';
  return `<div class="brand brand-${v}">${TS.LOGO[v]
    ? `<img class="brand-logo" src="assets/logos/gobierno-salud-${v}.png" alt="Gobierno de México · Salud">`
    : '<span class="brand-fallback"><b>Gobierno de México</b><i></i><span>Salud</span></span>'}</div>`;
};

/* ==========================================================================
   Conversación de triaje (Asistente Médico Virtual)
   ========================================================================== */
TS.Chat = {
  plan() {
    const c = TS.S.chat;
    const f = c && c.ans.flow ? TS.Triage.flow(c.ans.flow) : null;
    const persona = TS.persona();
    const steps = ['red', 'motivo', 'dur'];
    if (f) {
      if (TS.Triage.list(f, 'rojo', persona).length) steps.push('rojo');
      steps.push('naranja');
      if (f.pain) steps.push('dolor');
      if (f.fever) steps.push('temp');
      steps.push('amarillo', 'verde', 'nota');
    } else steps.push('naranja', 'dolor', 'temp', 'amarillo', 'verde', 'nota');
    return steps;
  },

  start() {
    TS.S.chat = {
      ans: { asked: {}, red: [], rojo: [], naranja: [], amarillo: [], verde: [], pain: null, temp: null, dur: null, flow: null, note: '', freeText: '', voice: [] },
      msgs: [], step: null, typing: false, sel: [], pain: 3, temp: 37.8, tempMode: null, flowGuess: null, finished: false
    };
    TS.act.go('chat');
    const p = TS.persona();
    this.bot(`Hola, ${TS.esc(p.nombre)}. Soy tu <b>Asistente Médico Virtual</b>. Te haré algunas preguntas para saber qué tipo de atención necesitas.`, 500)
      .then(() => this.bot('No sustituyo a un médico: si lo necesitas, te conecto con uno de la Red Nacional en minutos.', 700))
      .then(() => this.ask('red'));
  },

  bot(html, delay) {
    const c = TS.S.chat;
    return new Promise(res => {
      c.typing = true; TS.emit('chat');
      TS.later(delay == null ? 650 : delay, () => {
        if (TS.S.chat !== c) return;
        c.typing = false;
        c.msgs.push({ from: 'bot', html });
        TS.emit('chat');
        res();
      });
    });
  },

  user(text, voice) {
    TS.S.chat.msgs.push({ from: 'user', html: TS.esc(text), voice: !!voice });
  },

  ask(step) {
    const c = TS.S.chat;
    const p = TS.persona();
    const f = c.ans.flow ? TS.Triage.flow(c.ans.flow) : null;
    c.sel = [];
    const q = {
      red: 'Primero, lo más importante. <b>¿En este momento</b> te pasa alguno de estos?',
      motivo: 'Gracias. Ahora cuéntame con tus palabras qué te pasa, o elige tu molestia principal.',
      dur: '¿Desde cuándo tienes esta molestia?',
      rojo: 'Antes de seguir, ¿tienes alguno de estos?',
      naranja: '¿Tienes alguno de estos síntomas?',
      dolor: f && f.painLabel ? f.painLabel : '¿Qué tanto te duele o te molesta?',
      temp: '¿Te has tomado la temperatura?',
      amarillo: 'Unas preguntas más. ¿Tienes alguno de estos?',
      verde: '¿Y alguno de estos?',
      nota: '¿Algo más que quieras agregar para el médico? <span class="muted">(opcional)</span>'
    }[step];
    return this.bot(q, step === 'red' ? 500 : 650).then(() => { c.step = step; TS.emit('chat'); });
  },

  next(from) {
    const c = TS.S.chat;
    const ev = TS.Triage.evaluate(c.ans, TS.persona());
    if (ev.color === 'rojo' || ev.color === 'naranja') return this.finish();
    const plan = this.plan();
    let idx = plan.indexOf(from);
    for (;;) {
      const nxt = plan[++idx];
      if (!nxt) return this.finish();
      // Como en MTS: si ya hay un discriminador positivo de igual o mayor prioridad, no se pregunta ese nivel.
      if (['amarillo', 'verde'].includes(nxt) && TS.Triage.rank(ev.colorCore) <= TS.Triage.rank(nxt)) continue;
      return this.ask(nxt);
    }
  },

  /* ---------- Respuestas ---------- */
  toggle(id) {
    const c = TS.S.chat;
    c.sel = c.sel.includes(id) ? c.sel.filter(x => x !== id) : c.sel.concat(id);
    TS.emit('chat');
  },

  submitChecklist(none) {
    const c = TS.S.chat;
    const step = c.step;
    const p = TS.persona();
    const items = step === 'red' ? TS.RED_FLAGS : TS.Triage.list(TS.Triage.flow(c.ans.flow), step, p);
    const ids = none ? [] : c.sel.slice();
    c.ans.asked[step] = true;
    if (step === 'red') c.ans.red = ids; else c.ans[step] = ids;
    this.user(ids.length ? items.filter(i => ids.includes(i.id)).map(i => i.q).join(' · ') : 'Ninguno de estos');
    c.step = null; c.sel = [];
    TS.emit('chat');
    if (step === 'red' && ids.length) return this.finish();
    if (step === 'red') return this.ask('motivo');
    return this.next(step);
  },

  sendText(text, opts) {
    const c = TS.S.chat;
    const t = (text || '').trim();
    if (!t) return;
    const p = TS.persona();
    const voice = !!(opts && opts.voice);
    if (voice) c.ans.voice.push({ text: t, at: TS.now(), step: c.step === 'nota' ? 'nota' : 'motivo' });
    if (c.step === 'nota') {
      c.ans.note = t; this.user(t, voice); c.step = null; TS.emit('chat');
      return this.finish();
    }
    if (c.step !== 'motivo' && c.step !== 'confirm') return;
    this.user(t, voice); c.ans.freeText = t; c.step = null; TS.emit('chat');
    if (TS.Triage.detectRedText(t)) {
      return this.bot('Lo que describes podría ser una <b>emergencia</b>. ¿Confirmas que en este momento no puedes respirar o alguien no responde?', 700)
        .then(() => { c.step = 'redconfirm'; TS.emit('chat'); });
    }
    const f = TS.Triage.detectFlow(t, p);
    if (f) {
      c.flowGuess = f.id;
      return this.bot(`Entiendo. Por lo que me cuentas, lo principal parece ser <b>${TS.esc(f.label.toLowerCase())}</b>. ¿Es correcto?`, 900)
        .then(() => { c.step = 'confirm'; TS.emit('chat'); });
    }
    return this.bot('No logré identificarlo con certeza. Elige la opción que más se parezca a lo que sientes:', 800)
      .then(() => { c.step = 'motivo'; c.noText = true; TS.emit('chat'); });
  },

  chooseFlow(id) {
    const c = TS.S.chat;
    const f = TS.Triage.flow(id);
    c.ans.flow = id;
    this.user(f.label); c.step = null; TS.emit('chat');
    this.ask('dur');
  },

  confirmFlow(ok) {
    const c = TS.S.chat;
    if (ok) {
      c.ans.flow = c.flowGuess;
      this.user('Sí, es correcto'); c.step = null; TS.emit('chat');
      return this.ask('dur');
    }
    this.user('Quiero elegir otra'); c.step = null; c.noText = true; TS.emit('chat');
    return this.bot('Claro. Elige la molestia principal:', 500).then(() => { c.step = 'motivo'; TS.emit('chat'); });
  },

  redConfirm(yes) {
    const c = TS.S.chat;
    this.user(yes ? 'Sí, es así' : 'No, me expresé mal');
    c.step = null; TS.emit('chat');
    if (yes) { c.ans.red = ['resp']; c.ans.asked.red = true; return this.finish(); }
    const f = TS.Triage.detectFlow(c.ans.freeText, TS.persona());
    if (f) { c.flowGuess = f.id; return this.confirmFlow(true); }
    return this.bot('Entendido. Elige la molestia principal:', 500).then(() => { c.step = 'motivo'; c.noText = true; TS.emit('chat'); });
  },

  chooseDur(id) {
    const c = TS.S.chat;
    c.ans.dur = id;
    this.user(TS.DURATIONS.find(d => d.id === id).label); c.step = null; TS.emit('chat');
    this.next('dur');
  },

  setPain(v) { TS.S.chat.pain = +v; const el = document.querySelectorAll('[data-pain-out]'); el.forEach(e => { e.textContent = v; }); const lb = document.querySelectorAll('[data-pain-lbl]'); lb.forEach(e => { e.textContent = TS.Chat.painLabel(+v); e.dataset.lvl = TS.Chat.painLvl(+v); }); },
  painLabel(v) { return v === 0 ? 'Sin dolor' : v <= 4 ? 'Leve' : v <= 7 ? 'Moderado' : 'Intenso'; },
  painLvl(v) { return v === 0 ? 'none' : v <= 4 ? 'low' : v <= 7 ? 'mid' : 'high'; },

  submitPain() {
    const c = TS.S.chat;
    c.ans.pain = c.pain;
    this.user(`${c.pain} de 10 · ${this.painLabel(c.pain)}`); c.step = null; TS.emit('chat');
    this.next('dolor');
  },

  tempMode(mode) {
    const c = TS.S.chat;
    if (mode === 'medir') { c.tempMode = 'medir'; TS.emit('chat'); return; }
    c.ans.temp = mode; // 'sin' | 'no'
    this.user(mode === 'sin' ? 'No tengo termómetro' : 'No tengo fiebre');
    c.step = null; c.tempMode = null; TS.emit('chat');
    this.next('temp');
  },

  stepTemp(d) { const c = TS.S.chat; c.temp = Math.round(Math.min(42.5, Math.max(35, c.temp + d)) * 10) / 10; TS.emit('chat'); },
  setTemp(v) { TS.S.chat.temp = +v; TS.emit('chat'); },

  submitTemp() {
    const c = TS.S.chat;
    c.ans.temp = c.temp;
    this.user(`${c.temp.toFixed(1)} °C`); c.step = null; c.tempMode = null; TS.emit('chat');
    this.next('temp');
  },

  skipNote() {
    const c = TS.S.chat;
    this.user('Nada más, gracias'); c.step = null; TS.emit('chat');
    this.finish();
  },

  finish() {
    const c = TS.S.chat;
    if (c.finished) return;
    c.finished = true;
    c.step = null;
    const p = TS.persona();
    const isRed = c.ans.red && c.ans.red.length;
    const pre = isRed ? 'Esto es una <b>emergencia</b>. Te indico qué hacer de inmediato.' : `Gracias, ${TS.esc(p.nombre)}. Estoy analizando tus respuestas con el protocolo de triaje Manchester…`;
    this.bot(pre, isRed ? 300 : 500).then(() => {
      const enc = TS.act.createEncounter(c.ans);
      c.encId = enc.id;
      const m = enc.result.mts;
      return this.bot(`Tu prioridad es <span class="mts mts-${m.id} mts-inline"><i></i>${m.name} · ${m.level}</span>. ${TS.esc(m.routeLong)}`, isRed ? 400 : 1500)
        .then(() => TS.later(900, () => { if (TS.S.phone.screen === 'chat') TS.act.go('resultado', { encId: enc.id }); }));
    });
  },

  /* ---------- Modo presentador: responder el paso actual con el guion ---------- */
  auto() {
    const c = TS.S.chat;
    const sc = TS.S.scenario;
    if (!c || !sc || c.typing) return false;
    const a = sc.answers;
    switch (c.step) {
      case 'red': c.sel = (a.red || []).slice(); this.submitChecklist(!c.sel.length); return true;
      case 'motivo': if (a.text && !c.noText) this.sendText(a.text); else this.chooseFlow(a.flow); return true;
      case 'confirm': this.confirmFlow(c.flowGuess === a.flow); return true;
      case 'dur': this.chooseDur(a.dur || '1-3'); return true;
      case 'rojo': case 'naranja': case 'amarillo': case 'verde':
        c.sel = (a[c.step] || []).slice(); this.submitChecklist(!c.sel.length); return true;
      case 'dolor': c.pain = a.pain != null ? a.pain : 3; this.submitPain(); return true;
      case 'temp':
        if (typeof a.temp === 'number') { c.temp = a.temp; this.submitTemp(); } else this.tempMode(a.temp || 'sin');
        return true;
      case 'nota': if (a.note) this.sendText(a.note); else this.skipNote(); return true;
      case 'redconfirm': this.redConfirm(false); return true;
    }
    return false;
  },

  hint(step, value) {
    const sc = TS.S.scenario;
    if (!sc) return false;
    const a = sc.answers;
    if (step === 'flow') return a.flow === value;
    if (step === 'dur') return a.dur === value;
    if (['red', 'rojo', 'naranja', 'amarillo', 'verde'].includes(step)) return (a[step] || []).includes(value);
    if (step === 'tempmode') return (typeof a.temp === 'number' && value === 'medir') || a.temp === value;
    return false;
  }
};

/* ==========================================================================
   Narración para el presentador (vista "Paciente")
   ========================================================================== */
TS.NARR = {
  login: { t: 'Acceso del paciente', d: 'En producción, el acceso será con la identidad digital del Gobierno de México. Aquí se elige un perfil ficticio para la demostración.', tags: ['App Tu Salud'] },
  home: { t: 'La puerta de entrada', d: 'La app es la "puerta giratoria" del sistema: el asistente conoce el expediente y la cobertura (derechohabiencia) del paciente desde el primer momento.', tags: ['App Tu Salud', 'Expediente clínico'] },
  chat: { t: 'Triaje con el Asistente Médico Virtual', d: 'Agente de IA que entrevista al paciente con la metodología Manchester: primero descarta riesgo vital, luego identifica el motivo de consulta y busca discriminadores de mayor a menor prioridad. El primer discriminador positivo define el color.', tags: ['Asistente virtual · IA de Anthropic', 'Triaje Manchester'] },
  resultado: { t: 'El color define la ruta', d: 'Rojo y naranja → urgencias. Amarillo → teleconsulta inmediata. Verde → teleconsulta o cita en primer nivel. Azul → autocuidado guiado. El resultado y su justificación quedan en el expediente.', tags: ['Triaje Manchester', 'Expediente clínico'] },
  urgencias: { t: 'Ruta de emergencia', d: 'Botón al 911 y hospitales con urgencias más cercanos. El resumen clínico viaja como prealerta al hospital receptor.', tags: ['Ruta 1 · Emergencias'] },
  autocuidado: { t: 'Atención 100% autónoma', d: 'Recomendaciones generales sin diagnóstico ni receta. Signos de alarma claros y seguimiento programado por el copiloto administrativo.', tags: ['Ruta 2 · Autocuidado', 'Copiloto administrativo'] },
  espera: { t: 'Sala de espera virtual', d: 'El caso entra a la bandeja de la Red Nacional de Atención Médica Remota, ordenado por prioridad Manchester. El médico ya tiene el resumen: no vuelve a empezar la consulta.', tags: ['Ruta 3 · Médico remoto', 'Red Nacional'] },
  turno: { t: 'El médico tomó el caso', d: 'Notificación al paciente para ingresar a la videoconsulta.', tags: ['Ruta 3 · Médico remoto'] },
  video: { t: 'Teleconsulta con doctor in the loop', d: 'El copiloto clínico asiste al médico en tiempo real. Regla de oro: el copiloto clínico nunca interactúa con el paciente.', tags: ['Copiloto clínico', 'Telemedicina (TCA Assist)'] },
  atendido: { t: 'Cierre y receta electrónica', d: 'Receta firmada con e.firma, folio y QR. La nota SOAP redactada por el copiloto administrativo queda en el expediente.', tags: ['Receta digital (TCA Assist)', 'Copiloto administrativo'] },
  receta: { t: 'Receta electrónica', d: 'Disponible siempre en la app; se presenta con QR en la unidad.', tags: ['Receta digital'] },
  surtir: { t: '¿Dónde surtir?', d: 'Georreferencia: prioriza las unidades de su derechohabiencia y la cercanía. En la primera etapa, el surtido es en establecimientos de salud.', tags: ['Surtido', 'Georreferencia'] },
  agenda: { t: 'Ruta 4 · Primer nivel', d: 'Cita presencial en la unidad más conveniente según derechohabiencia y distancia.', tags: ['Ruta 4 · Primer nivel'] },
  citaok: { t: 'Cita confirmada', d: 'El copiloto administrativo envía recordatorios y prepara el resumen para el médico de la unidad.', tags: ['Copiloto administrativo'] },
  checkin: { t: 'Seguimiento proactivo', d: 'El copiloto administrativo pregunta cómo sigue el paciente. Si empeora, se re-triaja y se escala a un médico o se refiere a una unidad.', tags: ['Copiloto administrativo', 'Monitoreo continuo'] },
  expediente: { t: 'Expediente clínico electrónico', d: 'Todo lo que el paciente comparte queda registrado y es interoperable (NOM-024, HL7 FHIR), visible en cualquier institución del sistema universal.', tags: ['Expediente (TCA Assist)', 'NOM-024 · FHIR'] },
  recetas: { t: 'Mis recetas', d: 'Historial de recetas electrónicas.', tags: ['Receta digital'] },
  citas: { t: 'Mis citas', d: 'Citas presenciales y referencias.', tags: ['Copiloto administrativo'] },
  notifs: { t: 'Notificaciones', d: 'Indicaciones médicas, recordatorios y seguimientos llegan como notificaciones.', tags: ['Copiloto administrativo'] }
};

/* ==========================================================================
   Render de la app
   ========================================================================== */
TS.Patient = {
  el: null,

  mount() {
    const el = document.createElement('div');
    el.className = 'phone';
    el.innerHTML = `<div class="phone-btn b1"></div><div class="phone-btn b2"></div><div class="phone-btn b3"></div>
      <div class="phone-screen"><div class="status-bar"><span data-clock>--:--</span><span class="notch"></span><span class="sb-ic">
      <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="7" width="3" height="4" rx=".6"/><rect x="4.3" y="5" width="3" height="6" rx=".6"/><rect x="8.6" y="2.5" width="3" height="8.5" rx=".6"/><rect x="12.9" y="0" width="3" height="11" rx=".6"/></svg>
      <svg width="24" height="11" viewBox="0 0 24 11"><rect x=".5" y=".5" width="20" height="10" rx="3" fill="none" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1.6"/><rect x="21.5" y="3.5" width="1.6" height="4" rx=".8"/></svg></span></div>
      <div class="demo-ribbon">${TS.icon('info', 12)} DEMO · Datos simulados</div>
      <div class="ps" data-ps></div><div class="home-ind"></div></div>`;
    this.el = el;
    el.addEventListener('click', e => this.onClick(e));
    el.addEventListener('input', e => this.onInput(e));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('[data-composer]')) { e.preventDefault(); this.send(); }
    });
    TS.on((topic, data) => {
      if (topic === 'transcript') return this.onTranscript(data);
      if (topic === 'voice') return this.onVoice(data);
      if (topic === 'toast' || topic === 'tick' || topic === 'narr') return;
      this.render();
    });
    this.render();
    return el;
  },

  send() {
    const inp = this.el.querySelector('[data-composer]');
    if (!inp) return;
    const v = inp.value;
    inp.value = '';
    TS.Chat.sendText(v);
  },

  render() {
    const ps = this.el.querySelector('[data-ps]');
    const S = TS.S;
    const screen = S.loggedIn ? S.phone.screen : 'login';
    const vt = TS.Voice.st.target;
    if (TS.Voice.st.active && ((vt === 'chat' && screen !== 'chat') || (vt === 'espera' && screen !== 'espera') || (vt === 'video' && screen !== 'video'))) TS.Voice.cancel();
    const fn = this.screens[screen] || this.screens.home;
    // Preservar texto del compositor y scroll
    const comp = this.el.querySelector('[data-composer]');
    const compVal = comp ? comp.value : '';
    const hadFocus = comp && document.activeElement === comp;
    const scroller = ps.querySelector('[data-scroll]');
    const prevScreen = ps.dataset.screen;
    const keepTop = scroller && prevScreen === screen ? scroller.scrollTop : 0;
    ps.dataset.screen = screen;
    ps.className = `ps ps-${screen}`;
    ps.innerHTML = fn.call(this, S.phone.params || {});
    const comp2 = this.el.querySelector('[data-composer]');
    if (comp2) { comp2.value = compVal; if (hadFocus) comp2.focus(); }
    const sc2 = ps.querySelector('[data-scroll]');
    if (sc2) {
      if (screen === 'chat') sc2.scrollTop = sc2.scrollHeight;
      else sc2.scrollTop = keepTop;
    }
    TS.emit('narr', screen);
    if (TS.Main && TS.Main.tick) TS.Main.tick();
  },

  /* Actualiza la transcripción en vivo sin redibujar la pantalla. */
  onVoice(d) {
    if (!d || d.started || d.ended) return this.render();
    const live = this.el.querySelector('[data-voice-live]');
    if (live) { live.innerHTML = TS.Voice.liveHtml(); live.scrollTop = live.scrollHeight; }
    if (d.target === 'video') {
      const sub = this.el.querySelector('[data-pt-sub]');
      if (sub) { sub.classList.add('speaking'); sub.innerHTML = `<b>Tú (hablando):</b> ${TS.Voice.liveHtml()}`; }
    }
  },

  /* Inicia el dictado según la pantalla. */
  dictate(target) {
    const S = TS.S, sc = S.scenario, a = sc ? sc.answers : {};
    if (TS.Voice.isOn(target)) return TS.Voice.stop();
    if (target === 'chat') {
      const c = S.chat;
      const simText = c && c.step === 'nota' ? (a.note || 'Me cuesta trabajo tragar y casi no he comido.') : (a.text || 'Desde ayer me duele la garganta al tragar y tengo calentura');
      return TS.Voice.start('chat', {
        simText,
        onDone: text => {
          if (!text) return TS.toast('No te escuché. Intenta de nuevo o escribe tu mensaje.', 'info');
          TS.Chat.sendText(text, { voice: true });
        }
      });
    }
    if (target === 'espera') {
      const encId = S.phone.params.encId;
      return TS.Voice.start('espera', {
        simText: 'Doctora, también le quiero comentar que desde la mañana me duele un poco el oído.',
        onDone: text => {
          if (!text) return TS.toast('No te escuché. Intenta de nuevo.', 'info');
          TS.act.addVoiceNote(encId, text);
        }
      });
    }
    if (target === 'video') {
      return TS.Voice.start('video', {
        simText: 'También quería comentarle que en la noche casi no pude dormir por la tos.',
        onSegment: seg => TS.act.patientSays(seg)
      });
    }
  },

  /* Barra de grabación con transcripción en vivo. */
  recBar(target, label) {
    const sim = TS.Voice.st.sim;
    return `<div class="recbar">
      <div class="rb-top"><span class="rb-dot"></span><b>${sim ? 'Dictado simulado' : 'Escuchando…'}</b><small>${label || 'Español (México) · transcripción en vivo'}</small><button class="rb-x" data-action="mic-cancel" aria-label="Cancelar">${TS.icon('x', 15)}</button></div>
      <div class="rb-text" data-voice-live>${TS.Voice.liveHtml()}</div>
      <div class="rb-bot"><span class="rb-wave">${'<i></i>'.repeat(14)}</span><button class="rb-stop" data-action="mic-stop">${TS.icon('send', 15)} ${target === 'espera' ? 'Enviar a mi médica' : 'Listo, enviar'}</button></div>
    </div>`;
  },

  onTranscript(ln) {
    const sub = this.el.querySelector('[data-pt-sub]');
    if (sub && ln && ln.t) {
      sub.innerHTML = `<b>${ln.who === 'dr' ? TS.DOCTOR.corto : 'Tú'}:</b> ${TS.esc(ln.t)}`;
      sub.classList.remove('flash'); void sub.offsetWidth; sub.classList.add('flash');
    }
    if (ln && ln.done) this.render();
  },

  onInput(e) {
    const t = e.target;
    if (t.matches('[data-pain]')) TS.Chat.setPain(t.value);
  },

  onClick(e) {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action, id = b.dataset.id;
    const S = TS.S;
    switch (a) {
      case 'login': return TS.act.login(id);
      case 'logout': return TS.act.logout();
      case 'go': return TS.act.go(id, b.dataset.enc ? { encId: b.dataset.enc } : (b.dataset.rx ? { rxId: b.dataset.rx } : {}));
      case 'back': return TS.act.back();
      case 'home': return TS.act.home();
      case 'start-triage': return TS.Chat.start();
      case 'chk': return TS.Chat.toggle(id);
      case 'chk-none': return TS.Chat.submitChecklist(true);
      case 'chk-go': return TS.Chat.submitChecklist(false);
      case 'flow': return TS.Chat.chooseFlow(id);
      case 'confirm': return TS.Chat.confirmFlow(id === 'si');
      case 'redconfirm': return TS.Chat.redConfirm(id === 'si');
      case 'dur': return TS.Chat.chooseDur(id);
      case 'pain-go': return TS.Chat.submitPain();
      case 'temp-mode': return TS.Chat.tempMode(id);
      case 'temp-step': return TS.Chat.stepTemp(+id);
      case 'temp-set': return TS.Chat.setTemp(+id);
      case 'temp-go': return TS.Chat.submitTemp();
      case 'note-skip': return TS.Chat.skipNote();
      case 'send': return this.send();
      case 'path': return TS.act.choosePath(id, b.dataset.enc);
      case 'call911': return this.sheet('911');
      case 'sheet-close': return this.closeSheet();
      case 'cancel-wait': return TS.act.cancelWait(b.dataset.enc);
      case 'join': return TS.act.patientJoin();
      case 'hangup': {
        const c = S.consult;
        if (c && c.done && TS.isAuto()) return TS.act.completeConsult(true);
        return TS.toast(c && c.done ? 'El médico está firmando tu receta; en un momento termina la consulta.' : 'La consulta sigue en curso.', 'info');
      }
      case 'toggle-btn': b.classList.toggle('off'); return;
      case 'mic': return this.dictate(b.dataset.target);
      case 'mic-stop': return TS.Voice.stop();
      case 'mic-cancel': return TS.Voice.cancel();
      case 'map-pin': S.phone.params.unit = id; return this.render();
      case 'surtir-unit': S.phone.params.unit = id; return this.render();
      case 'navegar': return TS.toast('En producción abriría la navegación hacia la unidad.', 'info');
      case 'ag-unit': S.phone.params.unit = id; S.phone.params.slot = null; return this.render();
      case 'ag-day': S.phone.params.day = +id; S.phone.params.slot = null; return this.render();
      case 'ag-slot': S.phone.params.slot = id; return this.render();
      case 'ag-confirm': {
        const pr = S.phone.params;
        const [h, m] = pr.slot.split(':').map(Number);
        const ap = TS.act.bookAppointment(pr.unit, TS.nextSlot(pr.day || 0, h, m), pr.encId);
        return TS.act.go('citaok', { apId: ap.id }, true);
      }
      case 'checkin': {
        const pr = S.phone.params;
        if (id === 'mejor') { const r = TS.act.answerCheckin(pr.followupId, 'mejor'); pr.stage = 'done'; pr.outcome = r.outcome; pr.status = 'mejor'; return this.render(); }
        pr.status = id; pr.stage = 'warn'; pr.warnSel = []; return this.render();
      }
      case 'warn-chk': { const pr = S.phone.params; pr.warnSel = pr.warnSel.includes(id) ? pr.warnSel.filter(x => x !== id) : pr.warnSel.concat(id); return this.render(); }
      case 'warn-go': case 'warn-none': {
        const pr = S.phone.params;
        const r = TS.act.answerCheckin(pr.followupId, pr.status, a === 'warn-none' ? [] : pr.warnSel);
        if (r.outcome === 'escalado') { pr.stage = 'done'; pr.outcome = 'escalado'; pr.newEnc = r.enc.id; return this.render(); }
        pr.stage = 'done'; pr.outcome = r.outcome; return this.render();
      }
      case 'notif': {
        const n = S.notifications.find(x => x.id === id);
        if (n) n.read = true;
        if (n && n.followupId) { const fu = S.followups.find(f => f.id === n.followupId); if (fu && fu.status === 'enviado') return TS.act.go('checkin', { followupId: fu.id }); }
        return this.render();
      }
      case 'toast': return TS.toast(b.dataset.msg, 'info');
    }
  },

  sheet(kind) {
    const ps = this.el.querySelector('.phone-screen');
    let html = '';
    if (kind === '911') {
      html = `<div class="sheet-ic red">${TS.icon('phone', 28)}</div><h3>Llamada al 911</h3>
        <p>En la versión productiva, este botón marca al 911 y comparte tu ubicación y tu resumen clínico con el centro de atención de emergencias.</p>
        <p class="muted small">En esta demostración no se realiza ninguna llamada.</p>
        <button class="btn btn-primary btn-block" data-action="sheet-close">Entendido</button>`;
    }
    const div = document.createElement('div');
    div.className = 'sheet-wrap';
    div.innerHTML = `<div class="sheet-bg" data-action="sheet-close"></div><div class="sheet">${html}</div>`;
    ps.appendChild(div);
  },
  closeSheet() { const s = this.el.querySelector('.sheet-wrap'); if (s) s.remove(); },

  /* ---------- Piezas comunes ---------- */
  bar(title, opts) {
    const o = opts || {};
    return `<header class="appbar ${o.cls || ''}">
      ${o.noBack ? '<span class="ab-sp"></span>' : `<button class="ab-btn" data-action="${o.home ? 'home' : 'back'}" aria-label="Regresar">${TS.icon('chevL', 22)}</button>`}
      <div class="ab-title"><b>${title}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</div>
      ${o.right || '<span class="ab-sp"></span>'}
    </header>`;
  },

  /* ==========================================================================
     Pantallas
     ========================================================================== */
  screens: {
    login() {
      return `<div class="login" data-scroll>
        ${TS.brand('light')}
        <div class="login-hero">
          <div class="app-mark">${TS.icon('shieldPlus', 34)}</div>
          <h1>Tu Salud</h1>
          <p>Tu asistente médico, siempre contigo.</p>
        </div>
        <div class="login-card">
          <div class="lc-title">Elige un perfil de demostración</div>
          ${TS.PERSONAS.map(p => `<button class="persona" data-action="login" data-id="${p.id}">
            <span class="av" style="background:${p.color}">${p.iniciales}</span>
            <span class="pi"><b>${p.nombre} ${p.apellidos.split(' ')[0]}</b><small>${p.edad} años · ${p.derechohabiencia} · ${p.alcaldia}</small>
            ${p.grupo ? `<em>${p.grupo}</em>` : ''}</span>${TS.icon('chevR', 18)}</button>`).join('')}
        </div>
        <p class="login-foot">${TS.icon('lock', 13)} En producción: acceso con identidad digital del Gobierno de México.</p>
      </div>`;
    },

    home() {
      const S = TS.S, p = TS.persona();
      const unread = S.notifications.filter(n => !n.read).length;
      const enc = S.encounters.find(e => e.personaId === p.id && ['en_espera', 'llamando', 'en_consulta', 'urgencias'].includes(e.status));
      const fu = S.followups.find(f => f.personaId === p.id && ['programado', 'enviado'].includes(f.status));
      const unit = TS.UNITS.find(u => u.id === p.unidad);
      let active = '';
      if (enc && enc.status === 'urgencias') {
        const pa = S.prealerts.find(x => x.encId === enc.id);
        active = `<button class="active-card red" data-action="go" data-id="urgencias" data-enc="${enc.id}">${TS.icon('ambulance', 22)}<span><b>Prealerta enviada</b><small>${pa ? pa.unit.nombre : 'Hospital más cercano'}</small></span>${TS.icon('chevR', 18)}</button>`;
      } else if (enc) {
        const scr = enc.status === 'en_espera' ? 'espera' : enc.status === 'llamando' ? 'turno' : 'video';
        active = `<button class="active-card" data-action="go" data-id="${scr}" data-enc="${enc.id}">${TS.icon('video', 22)}<span><b>${enc.status === 'en_espera' ? 'Estás en la sala de espera' : enc.status === 'llamando' ? '¡Es tu turno! Ingresa a tu consulta' : 'Consulta en curso'}</b><small>${TS.mtsPill(enc.result.color, { short: true, sm: true })} ${TS.Triage.flow(enc.ans.flow).label}</small></span>${TS.icon('chevR', 18)}</button>`;
      } else if (fu) {
        const e2 = TS.enc(fu.encId);
        const hrs = Math.max(0, Math.round((fu.dueAt - TS.now()) / 3600000));
        active = fu.status === 'enviado'
          ? `<button class="active-card gold" data-action="go" data-id="checkin">${TS.icon('heart', 22)}<span><b>¿Cómo sigues?</b><small>Tu asistente espera tu respuesta</small></span>${TS.icon('chevR', 18)}</button>`
          : `<div class="active-card soft">${TS.icon('bell', 22)}<span><b>Seguimiento programado</b><small>${e2 ? TS.Triage.flow(e2.ans.flow).label : ''} · en ${hrs} h</small></span></div>`;
      }
      return `<div class="home" data-scroll>
        <div class="home-top">
          <div class="ht-brand"><span class="app-mark sm">${TS.icon('shieldPlus', 18)}</span><b>Tu Salud</b></div>
          <div class="ht-r">
            <button class="ab-btn" data-action="go" data-id="notifs" aria-label="Notificaciones">${TS.icon('bell', 21)}${unread ? `<span class="dot">${unread}</span>` : ''}</button>
            <button class="ab-btn" data-action="logout" aria-label="Cambiar perfil">${TS.icon('logout', 20)}</button>
          </div>
        </div>
        <div class="hello">
          <span class="av lg" style="background:${p.color}">${p.iniciales}</span>
          <div><h2>Hola, ${p.nombre}</h2>
          <div class="chips"><span class="chip">${TS.icon('shield', 13)} ${p.derechohabiencia}</span><span class="chip">${TS.icon('building', 13)} ${unit ? unit.nombre.split(' · ')[0] : ''}</span></div></div>
        </div>
        ${p.grupo ? `<div class="grupo">${TS.icon('sparkles', 14)} ${p.grupo}</div>` : ''}
        ${active}
        <button class="cta" data-action="start-triage">
          <span class="cta-ic">${TS.icon('chat', 26)}</span>
          <span class="cta-t"><small>¿Cómo te sientes hoy?</small><b>Inicia tu asistencia médica</b><em>Triaje con IA · en menos de 3 minutos</em></span>
          ${TS.icon('chevR', 22)}
        </button>
        <div class="tiles">
          <button class="tile" data-action="go" data-id="citas"><span class="t-ic">${TS.icon('calendar', 20)}</span><b>Mis citas</b><small>${S.appointments.length || 'Sin'} ${S.appointments.length === 1 ? 'cita' : 'citas'}</small></button>
          <button class="tile" data-action="go" data-id="expediente"><span class="t-ic">${TS.icon('file', 20)}</span><b>Mi expediente</b><small>${p.expediente}</small></button>
          <button class="tile" data-action="go" data-id="recetas"><span class="t-ic">${TS.icon('pill', 20)}</span><b>Mis recetas</b><small>${S.prescriptions.length || 'Sin'} ${S.prescriptions.length === 1 ? 'receta' : 'recetas'}</small></button>
          <button class="tile" data-action="go" data-id="notifs"><span class="t-ic">${TS.icon('bell', 20)}</span><b>Avisos</b><small>${unread ? unread + ' nuevos' : 'Al día'}</small></button>
        </div>
        <div class="sos">${TS.icon('phone', 16)}<span>¿Emergencia? Llama al <b>911</b></span><button class="link" data-action="call911">Llamar</button></div>
        <p class="fine">El asistente usa inteligencia artificial y no sustituye la valoración médica.</p>
      </div>`;
    },

    chat() {
      const c = TS.S.chat;
      if (!c) return this.screens.home.call(this);
      const p = TS.persona();
      const plan = TS.Chat.plan();
      const idx = Math.max(0, plan.indexOf(c.step === 'confirm' || c.step === 'redconfirm' ? 'motivo' : c.step));
      const pct = c.finished ? 100 : Math.round(((c.step ? idx : Math.max(0, plan.indexOf(c.lastStep || 'red'))) + 0.5) / plan.length * 100);
      const msgs = c.msgs.map((m, i) => `<div class="msg ${m.from}">${m.from === 'bot' ? `<span class="bot-av">${TS.icon('sparkles', 14)}</span>` : ''}<div class="bub">${m.voice ? `<span class="vbadge">${TS.icon('mic', 11)} Mensaje de voz · transcrito</span>` : ''}${m.html}</div></div>`).join('');
      const typing = c.typing ? `<div class="msg bot"><span class="bot-av">${TS.icon('sparkles', 14)}</span><div class="bub typing"><i></i><i></i><i></i></div></div>` : '';
      let actions = '';
      let composer = false;
      const f = c.ans.flow ? TS.Triage.flow(c.ans.flow) : null;
      const checklist = (items, step) => `<div class="qa"><div class="qa-list">${items.map(it => `<button class="opt ${c.sel.includes(it.id) ? 'on' : ''} ${TS.Chat.hint(step, it.id) ? 'hint' : ''}" data-action="chk" data-id="${it.id}"><span class="box">${TS.icon('check', 14)}</span>${TS.esc(it.q)}</button>`).join('')}</div>
        <div class="qa-row"><button class="btn btn-ghost ${TS.S.scenario && !(TS.S.scenario.answers[step] || []).length ? 'hint' : ''}" data-action="chk-none">Ninguno de estos</button><button class="btn btn-primary" data-action="chk-go" ${c.sel.length ? '' : 'disabled'}>Continuar</button></div></div>`;
      switch (c.step) {
        case 'red': actions = checklist(TS.RED_FLAGS, 'red'); break;
        case 'motivo':
          composer = !c.noText;
          actions = `<div class="qa"><div class="qa-chips">${TS.Triage.flowsFor(p).map(fl => `<button class="chipbtn ${TS.Chat.hint('flow', fl.id) ? 'hint' : ''}" data-action="flow" data-id="${fl.id}">${fl.label}</button>`).join('')}</div></div>`;
          break;
        case 'confirm': actions = `<div class="qa"><div class="qa-row"><button class="btn btn-ghost" data-action="confirm" data-id="no">Elegir otra</button><button class="btn btn-primary" data-action="confirm" data-id="si">Sí, es correcto</button></div></div>`; break;
        case 'redconfirm': actions = `<div class="qa"><div class="qa-row"><button class="btn btn-ghost" data-action="redconfirm" data-id="no">No, me expresé mal</button><button class="btn btn-danger" data-action="redconfirm" data-id="si">Sí, es así</button></div></div>`; break;
        case 'dur': actions = `<div class="qa"><div class="qa-grid">${TS.DURATIONS.map(d => `<button class="opt opt-c ${TS.Chat.hint('dur', d.id) ? 'hint' : ''}" data-action="dur" data-id="${d.id}">${TS.icon('clock', 15)} ${d.label}</button>`).join('')}</div></div>`; break;
        case 'rojo': case 'naranja': case 'amarillo': case 'verde': actions = checklist(TS.Triage.list(f, c.step, p), c.step); break;
        case 'dolor': {
          const v = c.pain;
          actions = `<div class="qa pain">
            <div class="pain-top"><span class="pain-num" data-pain-out>${v}</span><span class="pain-lbl" data-pain-lbl data-lvl="${TS.Chat.painLvl(v)}">${TS.Chat.painLabel(v)}</span></div>
            <input type="range" min="0" max="10" step="1" value="${v}" data-pain class="pain-range" aria-label="Intensidad del dolor">
            <div class="pain-scale"><span>0 Sin dolor</span><span>5</span><span>10 El peor</span></div>
            <button class="btn btn-primary btn-block" data-action="pain-go">Continuar</button></div>`;
          break;
        }
        case 'temp':
          if (c.tempMode === 'medir') {
            actions = `<div class="qa temp"><div class="temp-row"><button class="round" data-action="temp-step" data-id="-0.1">${TS.icon('minus', 18)}</button>
              <div class="temp-val ${c.temp >= 38.5 ? 'hot' : c.temp >= 37.5 ? 'warm' : ''}">${TS.icon('thermo', 20)}<b>${c.temp.toFixed(1)}</b><span>°C</span></div>
              <button class="round" data-action="temp-step" data-id="0.1">${TS.icon('plus', 18)}</button></div>
              <div class="qa-chips center">${[36.8, 37.8, 38.6, 39.4].map(t => `<button class="chipbtn sm" data-action="temp-set" data-id="${t}">${t.toFixed(1)}</button>`).join('')}</div>
              <button class="btn btn-primary btn-block" data-action="temp-go">Continuar</button></div>`;
          } else {
            actions = `<div class="qa"><div class="qa-grid one">
              <button class="opt opt-c ${TS.Chat.hint('tempmode', 'medir') ? 'hint' : ''}" data-action="temp-mode" data-id="medir">${TS.icon('thermo', 16)} Sí, la anoto</button>
              <button class="opt opt-c ${TS.Chat.hint('tempmode', 'sin') ? 'hint' : ''}" data-action="temp-mode" data-id="sin">No tengo termómetro</button>
              <button class="opt opt-c ${TS.Chat.hint('tempmode', 'no') ? 'hint' : ''}" data-action="temp-mode" data-id="no">No tengo fiebre</button></div></div>`;
          }
          break;
        case 'nota': composer = true; actions = `<div class="qa"><div class="qa-row"><button class="btn btn-ghost btn-block" data-action="note-skip">Omitir, no tengo comentarios</button></div></div>`; break;
      }
      if (TS.Voice.isOn('chat')) actions = '';
      if (c.step) c.lastStep = c.step;
      return `${TS.Patient.bar('Asistente Médico Virtual', { sub: `<span class="live-dot"></span> Triaje Manchester · ${c.finished ? 'completado' : `paso ${Math.min(idx + 1, plan.length)} de ${plan.length}`}`, right: `<span class="ab-badge" title="Agente de IA">${TS.icon('sparkles', 16)}</span>` })}
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="chat-log" data-scroll>${msgs}${typing}</div>
        <div class="chat-actions">${actions}
          ${composer ? (TS.Voice.isOn('chat') ? TS.Patient.recBar('chat')
            : `<div class="composer"><input data-composer type="text" placeholder="${c.step === 'nota' ? 'Escribe o dicta aquí…' : 'Escribe o toca el micrófono para hablar'}" autocomplete="off"><button class="mic" data-action="mic" data-target="chat" aria-label="Hablar">${TS.icon('mic', 18)}</button><button class="send" data-action="send" aria-label="Enviar">${TS.icon('send', 18)}</button></div>`) : ''}
        </div>`;
    },

    resultado(pr) {
      const enc = TS.enc(pr.encId);
      if (!enc) return this.screens.home.call(this);
      const r = enc.result, m = r.mts;
      const f = TS.Triage.flow(enc.ans.flow);
      const btns = {
        rojo: `<button class="btn btn-danger btn-block btn-lg" data-action="call911">${TS.icon('phone', 18)} Llamar al 911</button>
               <button class="btn btn-ghost btn-block" data-action="path" data-id="urgencias" data-enc="${enc.id}">${TS.icon('hospital', 18)} Ver hospitales cercanos</button>`,
        naranja: `<button class="btn btn-danger btn-block btn-lg" data-action="path" data-id="urgencias" data-enc="${enc.id}">${TS.icon('hospital', 18)} Ir a urgencias cercanas</button>
                  <button class="btn btn-ghost btn-block" data-action="path" data-id="remota" data-enc="${enc.id}">${TS.icon('video', 18)} Hablar ya con un médico</button>`,
        amarillo: `<button class="btn btn-primary btn-block btn-lg" data-action="path" data-id="remota" data-enc="${enc.id}">${TS.icon('video', 18)} Entrar a la sala de espera</button>
                   <p class="hint-line">Teleconsulta con un médico de la Red Nacional · menos de 60 min</p>`,
        verde: `<button class="btn btn-primary btn-block btn-lg" data-action="path" data-id="remota" data-enc="${enc.id}">${TS.icon('video', 18)} Teleconsulta en las próximas horas</button>
                <button class="btn btn-ghost btn-block" data-action="path" data-id="cita" data-enc="${enc.id}">${TS.icon('calendar', 18)} Cita presencial en mi unidad</button>`,
        azul: `<button class="btn btn-primary btn-block btn-lg" data-action="path" data-id="autocuidado" data-enc="${enc.id}">${TS.icon('heart', 18)} Ver mi plan de cuidados</button>
               <button class="btn btn-ghost btn-block" data-action="path" data-id="remota" data-enc="${enc.id}">Prefiero hablar con un médico</button>`
      }[m.id];
      const reasons = r.positives.filter(x => x.src !== 'Regla de seguridad' || r.positives.length === 1).slice(0, 3);
      return `${TS.Patient.bar('Resultado de tu valoración', { home: true })}
        <div class="scroll" data-scroll>
          <div class="res-card res-${m.id}">
            <div class="res-band"><span class="res-n">${m.n}</span><div><small>Prioridad Manchester</small><b>${m.name} · ${m.level}</b></div></div>
            <div class="res-body">
              <div class="res-time">${TS.icon('clock', 16)} ${m.minutes === 0 ? 'Atención inmediata' : `Atención en menos de ${m.minutes >= 60 ? (m.minutes / 60) + (m.minutes === 60 ? ' hora' : ' horas') : m.minutes + ' minutos'}`}</div>
              <p>${TS.esc(m.routeLong)}</p>
              ${btns}
            </div>
          </div>
          <div class="card">
            <div class="card-h">${TS.icon('info', 16)} ¿Por qué esta prioridad?</div>
            ${reasons.length ? reasons.map(x => `<div class="why"><span class="mts-dot mts-${x.color}"></span><span>${TS.esc(x.disc)}<small>${x.src === 'General' ? 'Discriminador general' : x.src === 'Riesgo vital' ? 'Riesgo vital' : `Diagrama: ${TS.esc(x.src)}`}</small></span></div>`).join('')
              : `<div class="why"><span class="mts-dot mts-azul"></span><span>No encontramos signos de alarma<small>Puedes cuidarte en casa con seguimiento</small></span></div>`}
          </div>
          <div class="card saved">${TS.icon('checkCircle', 18)}<span><b>Guardado en tu expediente</b><small>Folio ${enc.folio} · el médico verá este resumen</small></span></div>
          <p class="fine">Esta valoración no es un diagnóstico. Si tus síntomas empeoran, llama al 911.</p>
        </div>`;
    },

    urgencias(pr) {
      const enc = TS.enc(pr.encId);
      const p = TS.persona();
      const hs = TS.unitsFor(p, u => u.urgencias);
      const pa = TS.S.prealerts.find(x => x.encId === (enc && enc.id));
      return `${TS.Patient.bar('Atención de urgencia', { home: true, cls: 'bar-red' })}
        <div class="scroll" data-scroll>
          <button class="sos-big" data-action="call911">${TS.icon('phone', 26)}<span><b>Llamar al 911</b><small>Si empeoras o no puedes trasladarte</small></span></button>
          ${pa ? `<div class="card prealert">${TS.icon('ambulance', 20)}<span><b>Prealerta enviada</b><small>${pa.unit.nombre} recibió tu resumen clínico y tu prioridad ${TS.MTS[enc.result.color].name.toLowerCase()}.</small></span></div>` : ''}
          <div class="map-wrap sm">${TS.map({ persona: p, units: hs, selected: hs[0].id, aspect: 170 / 358 })}</div>
          <div class="sec-t">Hospitales con urgencias cercanos</div>
          ${hs.map((h, i) => `<div class="unit ${i === 0 ? 'first' : ''}"><span class="u-ic">${TS.icon('hospital', 18)}</span><span class="u-t"><b>${h.nombre}</b><small>${h.inst} · ${h.km.toFixed(1)} km · ${h.mins} min en auto</small></span><span class="u-r">${i === 0 ? '<em>Más cercano</em>' : ''}</span></div>`).join('')}
          <div class="note">${TS.icon('info', 15)} Con el Servicio Universal de Salud te atienden en el hospital más cercano, sin importar tu afiliación.</div>
          <div class="card warnbox"><div class="card-h">${TS.icon('alert', 16)} Mientras llegas</div>
          <ul class="list-dot"><li>No manejes; pide que alguien te lleve.</li><li>Lleva tu identificación y tus medicamentos.</li><li>Si pierdes el conocimiento o dejas de respirar bien, llama al 911.</li></ul></div>
        </div>`;
    },

    autocuidado(pr) {
      const enc = TS.enc(pr.encId);
      const f = TS.Triage.flow(enc.ans.flow);
      const fu = TS.S.followups.find(x => x.id === enc.followupId);
      return `${TS.Patient.bar('Tu plan de cuidados', { home: true })}
        <div class="scroll" data-scroll>
          <div class="care-hero"><span class="mts mts-azul"><i></i>Azul · No urgente</span><h3>Puedes cuidarte en casa</h3><p>Sigue estas recomendaciones para ${TS.esc(f.label.toLowerCase())}. No es un diagnóstico ni una receta.</p></div>
          <div class="care-list">${f.advice.map((a, i) => `<div class="care"><span class="care-n">${i + 1}</span><span><b>${TS.esc(a.t)}</b><small>${TS.esc(a.d)}</small></span></div>`).join('')}</div>
          <div class="card warnbox"><div class="card-h">${TS.icon('alert', 16)} Vuelve a escribirme de inmediato si tienes</div>
            <ul class="list-dot">${f.warn.map(w => `<li>${TS.esc(w)}</li>`).join('')}</ul></div>
          ${fu ? `<div class="card fu-card">${TS.icon('bell', 20)}<span><b>Te escribiré en ${fu.hours} horas</b><small>${TS.fmt.dateTime(fu.dueAt)} · para saber cómo sigues</small></span></div>` : ''}
          <button class="btn btn-primary btn-block" data-action="home">Entendido</button>
          <button class="btn btn-ghost btn-block" data-action="path" data-id="remota" data-enc="${enc.id}">Prefiero hablar con un médico</button>
        </div>`;
    },

    espera(pr) {
      const enc = TS.enc(pr.encId);
      if (!enc) return this.screens.home.call(this);
      const queue = TS.Doctor.queue().filter(q => q.status === 'En espera');
      const pos = Math.max(1, queue.findIndex(q => q.id === enc.id) + 1);
      const f = TS.Triage.flow(enc.ans.flow);
      return `${TS.Patient.bar('Sala de espera virtual', { home: true, right: TS.mtsPill(enc.result.color, { short: true, sm: true }) })}
        <div class="scroll center" data-scroll>
          <div class="wait-orb"><span class="ring"></span><span class="ring r2"></span><b>#${pos}</b><small>en la fila</small></div>
          <h3 class="wait-t">Un médico te atenderá pronto</h3>
          <p class="muted">Tiempo estimado: <b>${Math.max(2, pos * 3)} min</b> · objetivo ${enc.result.mts.minutes} min</p>
          <div class="wait-stats"><div>${TS.icon('clock', 16)}<b data-since="${enc.waitingSince}">00:00</b><small>esperando</small></div><div>${TS.icon('users', 16)}<b>${TS.Doctor.onlineDocs()}</b><small>médicos en línea</small></div></div>
          <div class="card saved">${TS.icon('checkCircle', 18)}<span><b>Tu médico ya tiene tu resumen</b><small>No tendrás que repetir lo que platicaste con el asistente.</small></span></div>
          <div class="card voice-card">
            <div class="card-h">${TS.icon('mic', 16)} ¿Algo más para tu médica?</div>
            <small class="muted">Habla y se transcribe en español; le llega a la Dra. al instante.</small>
            ${(enc.ans.voice || []).filter(v => v.step === 'espera').map(v => `<div class="vsent"><span>“${TS.esc(v.text)}”</span><small>${TS.icon('check', 11)} Enviada ${TS.fmt.time(v.at)} h</small></div>`).join('')}
            ${TS.Voice.isOn('espera') ? TS.Patient.recBar('espera') : `<button class="btn btn-ghost btn-block" data-action="mic" data-target="espera">${TS.icon('mic', 17)} Grabar nota de voz</button>`}
          </div>
          <div class="card warnbox"><div class="card-h">${TS.icon('alert', 16)} Si mientras esperas aparece</div>
            <ul class="list-dot">${(f.warn || []).slice(0, 3).map(w => `<li>${TS.esc(w)}</li>`).join('')}</ul><p class="small">…llama al 911.</p></div>
          <button class="btn btn-ghost btn-block" data-action="cancel-wait" data-enc="${enc.id}">Salir de la fila</button>
        </div>`;
    },

    turno(pr) {
      const enc = TS.enc(pr.encId);
      return `${TS.Patient.bar('Sala de espera virtual', { home: true, right: enc ? TS.mtsPill(enc.result.color, { short: true, sm: true }) : '' })}
        <div class="scroll center turn" data-scroll>
          <div class="turn-ic">${TS.icon('video', 34)}</div>
          <h2>¡Es tu turno!</h2>
          <p>${TS.persona().nombre}, ${TS.DOCTOR.corto} ya ingresó a la consulta.<br>Por favor ingresa ahora.</p>
          <button class="btn btn-primary btn-lg btn-block" data-action="join">${TS.icon('video', 18)} Ingresar a la consulta</button>
          <p class="fine">Se usará tu cámara y micrófono. En la demo no se activan.</p>
        </div>`;
    },

    video() {
      const c = TS.S.consult;
      const p = TS.persona();
      const last = c && c.lines.length ? c.lines[c.lines.length - 1] : null;
      return `<div class="vcall">
        <div class="vc-top"><span class="vc-rec"><i></i> ${c && c.done ? 'Finalizando…' : 'En consulta'}</span><b data-since="${c ? c.startedAt : TS.now()}">00:00</b><span class="vc-lock">${TS.icon('lock', 13)} Cifrada</span></div>
        <div class="vc-doc"><span class="vc-av">${TS.DOCTOR.iniciales}</span><b>${TS.DOCTOR.nombre}</b><small>${TS.DOCTOR.especialidad} · Céd. ${TS.DOCTOR.cedula}</small><span class="vc-wave">${'<i></i>'.repeat(5)}</span></div>
        <div class="vc-self"><span class="av" style="background:${p.color}">${p.iniciales}</span></div>
        <div class="vc-sub ${TS.Voice.isOn('video') ? 'speaking' : ''}" data-pt-sub>${TS.Voice.isOn('video') ? `<b>Tú (hablando):</b> ${TS.Voice.liveHtml()}` : last ? `<b>${last.who === 'dr' ? TS.DOCTOR.corto : 'Tú'}:</b> ${TS.esc(last.t)}` : 'Conectando…'}</div>
        <div class="vc-hint">${TS.Voice.isOn('video') ? `${TS.Voice.st.sim ? 'Dictado simulado' : 'Transcribiendo en español'} · la médica lo ve en vivo` : 'Toca el micrófono para hablar · se transcribe para tu médica'}</div>
        <div class="vc-ctrl"><button class="vc-b ${TS.Voice.isOn('video') ? 'rec' : ''}" data-action="mic" data-target="video" aria-label="Hablar">${TS.icon('mic', 22)}</button><button class="vc-b" data-action="toggle-btn">${TS.icon('video', 22)}</button><button class="vc-b end" data-action="hangup">${TS.icon('hangup', 22)}</button></div>
      </div>`;
    },

    atendido(pr) {
      const enc = TS.enc(pr.encId);
      if (!enc) return this.screens.home.call(this);
      const rx = TS.S.prescriptions.find(x => x.encId === enc.id);
      const fu = TS.S.followups.find(x => x.id === enc.followupId);
      const ap = TS.S.appointments.find(x => x.encId === enc.id);
      return `${TS.Patient.bar('Consulta terminada', { home: true })}
        <div class="scroll" data-scroll>
          <div class="done-hero"><span class="done-ic">${TS.icon('check', 30)}</span><h2>Fuiste atendido</h2><p>Tu consulta con ${TS.DOCTOR.corto} terminó.</p></div>
          <div class="card">
            <div class="card-h">${TS.icon('steth', 16)} Lo que indicó tu médico <span class="ok-pill">${TS.icon('check', 12)} Firmado</span></div>
            <div class="kv"><small>Diagnóstico</small><b>${enc.dx ? TS.esc(enc.dx.label) : 'Ver indicaciones'}</b></div>
            <div class="kv"><small>Indicaciones y plan</small><span>${TS.esc((enc.soap && enc.soap.p) || '').replace(/Tratamiento:.*?\.\s/, '')}</span></div>
          </div>
          ${rx ? `<div class="card rx-card"><div class="rx-h"><span><small>Folio de receta</small><b>${rx.folio}</b></span>${TS.icon('pill', 22)}</div>
            ${rx.meds.map(m => `<div class="rx-med"><b>${TS.esc(m.nombre)}</b><small>${TS.esc(m.pres)} · ${TS.esc(m.dosis)} ${TS.esc(m.freq)} · ${m.dias} días</small></div>`).join('')}
            <div class="qr-box">${TS.qr(rx.folio, 132)}<small>Muestra este código en la unidad</small></div>
            <button class="btn btn-ghost btn-block" data-action="go" data-id="receta" data-rx="${rx.id}">${TS.icon('file', 18)} Ver receta completa</button>
            <button class="btn btn-primary btn-block" data-action="go" data-id="surtir">${TS.icon('pin', 18)} ¿Dónde surtir mi receta?</button></div>` : ''}
          ${ap ? `<div class="card fu-card">${TS.icon('calendar', 20)}<span><b>${ap.tipo}</b><small>${TS.UNITS.find(u => u.id === ap.unitId).nombre} · ${TS.fmt.dateTime(ap.when)}</small></span></div>` : ''}
          ${fu ? `<div class="card fu-card">${TS.icon('bell', 20)}<span><b>Seguimiento en ${fu.hours} h</b><small>Tu asistente te preguntará cómo sigues.</small></span></div>` : ''}
          <button class="btn btn-ghost btn-block" data-action="home">Ir al inicio</button>
        </div>`;
    },

    receta(pr) {
      const rx = TS.S.prescriptions.find(x => x.id === pr.rxId) || TS.S.prescriptions[0];
      if (!rx) return this.screens.recetas.call(this);
      const p = TS.PERSONAS.find(x => x.id === rx.personaId) || TS.persona();
      const perDay = f => /cada 8/.test(f) ? 3 : /cada 12/.test(f) ? 2 : /cada 24/.test(f) ? 1 : 3;
      const unit = m => /Cápsula/.test(m.pres) ? 'cápsulas' : /Tableta/.test(m.pres) ? 'tabletas' : /Gragea/.test(m.pres) ? 'grageas' : /Sobre/.test(m.pres) ? 'sobres' : 'frasco';
      const qty = m => unit(m) === 'frasco' ? '1 frasco' : `${perDay(m.freq) * m.dias} ${unit(m)}`;
      const sello = (rx.folio + p.expediente + 'e.firma').split('').map(ch => ch.charCodeAt(0).toString(16)).join('').slice(0, 40);
      return `${TS.Patient.bar('Receta electrónica', { right: '<span class="ab-sp"></span>' })}
        <div class="scroll" data-scroll>
          <div class="rxdoc">
            <div class="rxdoc-wm">DEMOSTRACIÓN · SIN VALIDEZ OFICIAL</div>
            <div class="rxdoc-top"><span class="app-mark sm">${TS.icon('shieldPlus', 15)}</span><span><b>Receta médica electrónica</b><small>Tu Salud · Red Nacional de Atención Médica Remota</small></span></div>
            <div class="rxdoc-fol"><span><small>Folio</small><b>${rx.folio}</b></span><span><small>Fecha</small><b>${TS.fmt.date(rx.at)} · ${TS.fmt.time(rx.at)} h</b></span></div>
            <div class="rxdoc-sec"><h5>Médico</h5><b>${rx.doctor}</b><small>${TS.DOCTOR.especialidad} · Cédula profesional ${rx.cedula}</small><small>${TS.DOCTOR.nodo}</small></div>
            <div class="rxdoc-sec"><h5>Paciente</h5><b>${p.nombre} ${p.apellidos}</b><small>${p.edad} años · ${p.sexoLargo} · ${p.derechohabiencia} · Exp. ${p.expediente}</small>
              <small class="${p.alergias.length ? 'alg' : ''}">Alergias: ${p.alergias.length ? p.alergias.map(a => a.label).join(', ') : 'ninguna conocida'}</small></div>
            ${rx.dx ? `<div class="rxdoc-sec"><h5>Diagnóstico</h5><b>${TS.esc(rx.dx.label)}</b><small>CIE-10 ${rx.dx.code}</small></div>` : ''}
            <div class="rxdoc-sec"><h5>Rp.</h5>
              ${rx.meds.map((m, i) => `<div class="rxdoc-med"><span class="n">${i + 1}</span><span><b>${TS.esc(m.nombre)}</b><small>${TS.esc(m.pres)} · cantidad: ${qty(m)}</small><em>Tomar ${TS.esc(m.dosis)} ${TS.esc(m.freq)} durante ${m.dias} días.</em></span></div>`).join('')}
            </div>
            ${rx.plan ? `<div class="rxdoc-sec"><h5>Indicaciones generales</h5><small class="plan">${TS.esc(rx.plan)}</small></div>` : ''}
            <div class="rxdoc-sign">
              ${TS.qr(rx.folio, 104)}
              <span><h5>Firma electrónica avanzada</h5><b>${rx.doctor}</b><small>${TS.fmt.dateTime(rx.signedAt || rx.at)}</small><small class="mono">Sello: ${sello}…</small></span>
            </div>
            <div class="rxdoc-foot">Vigencia 30 días · Surtir en establecimientos de salud del sistema público · Documento generado para demostración con datos ficticios.</div>
          </div>
          <button class="btn btn-primary btn-block" data-action="go" data-id="surtir">${TS.icon('pin', 18)} ¿Dónde surtir mi receta?</button>
          <button class="btn btn-ghost btn-block" data-action="toast" data-msg="En producción se descargaría el PDF de la receta firmada (demo).">${TS.icon('download', 17)} Descargar PDF</button>
        </div>`;
    },

    surtir(pr) {
      const p = TS.persona();
      const rx = TS.S.prescriptions[0];
      const us = TS.unitsFor(p, u => u.farmacia);
      const sel = us.find(u => u.id === pr.unit) || us[0];
      const total = rx ? rx.meds.length : 2;
      const avail = sel.match ? total : Math.max(1, total - 1);
      return `${TS.Patient.bar('¿Dónde surtir mi receta?')}
        <div class="surtir">
          <div class="map-wrap">${TS.map({ persona: p, units: us, selected: sel.id, aspect: 272 / 392 })}</div>
          <div class="sheet-panel" data-scroll>
            <div class="note small">${TS.icon('info', 14)} Surte en establecimientos de salud del sistema público. Priorizamos tu derechohabiencia (${p.derechohabiencia}) y la cercanía.</div>
            <div class="unit-detail">
              <div class="ud-h"><span><small>${sel.tipo} · ${sel.inst}</small><b>${sel.nombre}</b></span>${sel.match ? '<em class="tag-ok">Tu derechohabiencia</em>' : ''}</div>
              <div class="ud-row">${TS.icon('pill', 15)} Medicamentos disponibles <b class="${avail === total ? 'ok' : 'warn'}">${avail} de ${total}</b></div>
              <div class="ud-row">${TS.icon('pin', 15)} ${sel.dir}</div>
              <div class="ud-row">${TS.icon('clock', 15)} ${sel.horario} · ${sel.km.toFixed(1)} km · ${sel.mins} min</div>
              <button class="btn btn-ghost btn-block" data-action="navegar">${TS.icon('route', 17)} Cómo llegar</button>
            </div>
            <div class="sec-t">Otras opciones</div>
            ${us.filter(u => u.id !== sel.id).map(u => `<button class="unit" data-action="surtir-unit" data-id="${u.id}"><span class="u-ic">${TS.icon(u.urgencias ? 'hospital' : 'building', 17)}</span><span class="u-t"><b>${u.nombre}</b><small>${u.inst} · ${u.km.toFixed(1)} km</small></span>${u.match ? '<em class="tag-ok sm">Tuya</em>' : ''}</button>`).join('')}
          </div>
        </div>`;
    },

    agenda(pr) {
      const p = TS.persona();
      const us = TS.unitsFor(p, u => !u.urgencias);
      const sel = us.find(u => u.id === pr.unit) || us[0];
      pr.unit = sel.id;
      const day = pr.day || 0;
      const days = [0, 1, 2, 3].map(d => { const t = TS.nextSlot(d, 9); return { d, label: d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : TS.fmt.date(t).split(' ')[0], num: new Date(t).getDate() }; });
      const slots = ['08:30', '09:15', '10:00', '11:30', '12:15', '16:00', '17:30'];
      const nowH = new Date(TS.now()).getHours();
      return `${TS.Patient.bar('Agenda tu cita')}
        <div class="scroll" data-scroll>
          <div class="sec-t">Unidad ${TS.icon('info', 13)} <small>derechohabiencia + cercanía</small></div>
          ${us.slice(0, 3).map(u => `<button class="unit ${u.id === sel.id ? 'on' : ''}" data-action="ag-unit" data-id="${u.id}"><span class="u-ic">${TS.icon('building', 17)}</span><span class="u-t"><b>${u.nombre}</b><small>${u.inst} · ${u.km.toFixed(1)} km</small></span>${u.match ? '<em class="tag-ok sm">Tuya</em>' : ''}</button>`).join('')}
          <div class="sec-t">Día</div>
          <div class="days">${days.map(d => `<button class="day ${d.d === day ? 'on' : ''}" data-action="ag-day" data-id="${d.d}"><small>${d.label}</small><b>${d.num}</b></button>`).join('')}</div>
          <div class="sec-t">Horario</div>
          <div class="slots">${slots.map((s, i) => { const dis = (day === 0 && +s.split(':')[0] <= nowH) || (i % 4 === 1 && day === 1); return `<button class="slot ${pr.slot === s ? 'on' : ''}" data-action="ag-slot" data-id="${s}" ${dis ? 'disabled' : ''}>${s}</button>`; }).join('')}</div>
          <button class="btn btn-primary btn-block btn-lg" data-action="ag-confirm" ${pr.slot ? '' : 'disabled'}>Confirmar cita</button>
        </div>`;
    },

    citaok(pr) {
      const ap = TS.S.appointments.find(a => a.id === pr.apId) || TS.S.appointments[0];
      const u = TS.UNITS.find(x => x.id === ap.unitId);
      return `${TS.Patient.bar('Cita confirmada', { home: true })}
        <div class="scroll center" data-scroll>
          <span class="done-ic">${TS.icon('calendar', 28)}</span>
          <h2>¡Listo! Tu cita está confirmada</h2>
          <div class="card left"><div class="kv"><small>Unidad</small><b>${u.nombre}</b><small>${u.dir}</small></div>
          <div class="kv"><small>Fecha y hora</small><b>${TS.fmt.dateLong(ap.when)} · ${TS.fmt.time(ap.when)} h</b></div>
          <div class="kv"><small>Folio</small><b>${ap.folio}</b></div></div>
          <div class="card saved">${TS.icon('checkCircle', 18)}<span><b>El médico de tu unidad verá tu triaje</b><small>Te enviaremos un recordatorio un día antes.</small></span></div>
          <button class="btn btn-ghost btn-block" data-action="home">Ir al inicio</button>
        </div>`;
    },

    checkin(pr) {
      const fu = TS.S.followups.find(f => f.id === pr.followupId) || TS.S.followups.find(f => f.status === 'enviado');
      if (!fu) return this.screens.home.call(this);
      pr.followupId = fu.id;
      const enc = TS.enc(fu.encId);
      const f = TS.Triage.flow(enc.ans.flow);
      const p = TS.persona();
      const stage = pr.stage || 'q';
      let body = `<div class="msg bot"><span class="bot-av">${TS.icon('sparkles', 14)}</span><div class="bub">Hola, ${p.nombre}. Han pasado <b>${fu.hours} horas</b> desde ${enc.status === 'atendido' ? 'tu consulta' : 'tu valoración'} por <b>${TS.esc(f.label.toLowerCase())}</b>. ¿Cómo sigues?</div></div>`;
      if (stage === 'q') {
        body += `<div class="mood"><button data-action="checkin" data-id="mejor"><span class="mf good">${TS.icon('heart', 22)}</span>Mejor</button><button data-action="checkin" data-id="igual"><span class="mf mid">${TS.icon('minus', 22)}</span>Igual</button><button data-action="checkin" data-id="peor"><span class="mf bad">${TS.icon('alert', 22)}</span>Peor</button></div>`;
      } else {
        body += `<div class="msg user"><div class="bub">${{ mejor: 'Mejor', igual: 'Igual', peor: 'Peor' }[pr.status]}</div></div>`;
        if (stage === 'warn') {
          body += `<div class="msg bot"><span class="bot-av">${TS.icon('sparkles', 14)}</span><div class="bub">¿Has notado alguno de estos signos?</div></div>
            <div class="qa"><div class="qa-list">${f.warn.map(w => `<button class="opt ${(pr.warnSel || []).includes(w) ? 'on' : ''}" data-action="warn-chk" data-id="${TS.esc(w)}"><span class="box">${TS.icon('check', 14)}</span>${TS.esc(w)}</button>`).join('')}</div>
            <div class="qa-row"><button class="btn btn-ghost" data-action="warn-none">Ninguno</button><button class="btn btn-primary" data-action="warn-go" ${(pr.warnSel || []).length ? '' : 'disabled'}>Continuar</button></div></div>`;
        } else if (stage === 'done') {
          const msg = pr.outcome === 'cerrado' ? '¡Qué gusto! Cierro tu seguimiento. Si algo cambia, escríbeme cuando quieras.'
            : pr.outcome === 'reprogramado' ? 'Gracias. Sigue con los cuidados indicados; te vuelvo a escribir en 24 horas.'
            : 'Como no has mejorado, es importante que te valore un médico. Ya actualicé tu expediente y te conecto con la Red Nacional.';
          body += `<div class="msg bot"><span class="bot-av">${TS.icon('sparkles', 14)}</span><div class="bub">${msg}</div></div>`;
          body += pr.outcome === 'escalado'
            ? `<div class="qa"><button class="btn btn-primary btn-block btn-lg" data-action="go" data-id="resultado" data-enc="${pr.newEnc}">Ver mi nueva valoración</button></div>`
            : `<div class="qa"><button class="btn btn-ghost btn-block" data-action="home">Ir al inicio</button></div>`;
        }
      }
      return `${TS.Patient.bar('Seguimiento', { home: true, sub: 'Copiloto administrativo' })}
        <div class="chat-log" data-scroll>${body}</div>`;
    },

    expediente() {
      const p = TS.persona();
      const encs = TS.S.encounters.filter(e => e.personaId === p.id);
      const hist = [
        { t: 'Consulta presencial · primer nivel', d: p.cronicos[0] || 'Revisión general', at: '12 mar 2026', c: null },
        { t: 'Vacunación', d: 'Influenza estacional 2025-2026', at: '18 oct 2025', c: null }
      ];
      return `${TS.Patient.bar('Mi expediente')}
        <div class="scroll" data-scroll>
          <div class="card id-card"><span class="av lg" style="background:${p.color}">${p.iniciales}</span><span><b>${p.nombre} ${p.apellidos}</b><small>${p.edad} años · ${p.sexoLargo} · ${p.derechohabiencia}</small><small>Expediente ${p.expediente}</small></span></div>
          <div class="sec-t">Datos clave</div>
          <div class="keydata">
            <div><small>Tipo de sangre</small><b>${p.sangre}</b></div>
            <div class="${p.alergias.length ? 'alert' : ''}"><small>Alergias</small><b>${p.alergias.length ? p.alergias.map(a => a.label).join(', ') : 'Ninguna conocida'}</b></div>
            <div><small>Padecimientos</small><b>${p.cronicos.length ? p.cronicos.join(', ') : 'Ninguno'}</b></div>
            <div><small>Medicamentos</small><b>${p.meds.length ? p.meds.join('; ') : 'Ninguno'}</b></div>
          </div>
          <div class="sec-t">Línea de tiempo</div>
          <div class="timeline">
            ${encs.map(e => `<div class="tl"><span class="mts-dot mts-${e.result.color}"></span><span><b>${e.kind === 'seguimiento-peor' ? 'Re-valoración por seguimiento' : 'Triaje con asistente virtual'} · ${TS.Triage.flow(e.ans.flow).label}</b><small>${TS.fmt.dateTime(e.createdAt)} · ${e.result.mts.name} · ${({ atendido: 'Atendido por ' + (e.doctor || 'médico'), autocuidado: 'Autocuidado', urgencias: 'Derivado a urgencias', cita: 'Cita en primer nivel', en_espera: 'En sala de espera', en_consulta: 'En consulta', llamando: 'En consulta', cancelado: 'Cancelado', triaje: 'Valoración' })[e.status] || e.status}</small>${e.dx ? `<em>${e.dx.code} · ${TS.esc(e.dx.label)}</em>` : ''}</span></div>`).join('')}
            ${hist.map(h => `<div class="tl"><span class="mts-dot gray"></span><span><b>${h.t}</b><small>${h.at}</small><em>${h.d}</em></span></div>`).join('')}
          </div>
          <div class="note small">${TS.icon('globe', 14)} Expediente interoperable (NOM-024-SSA3-2012 · HL7 FHIR). Visible en IMSS, ISSSTE, IMSS-Bienestar y demás instituciones del sistema universal.</div>
        </div>`;
    },

    recetas() {
      const list = TS.S.prescriptions;
      return `${TS.Patient.bar('Mis recetas')}
        <div class="scroll" data-scroll>
          ${list.length ? list.map(r => `<button class="unit" data-action="go" data-id="receta" data-rx="${r.id}"><span class="u-ic">${TS.icon('pill', 17)}</span><span class="u-t"><b>${r.folio}</b><small>${r.meds.map(m => m.nombre).join(', ')}</small><small>${TS.fmt.dateTime(r.at)}</small></span>${TS.icon('chevR', 16)}</button>`).join('')
            : `<div class="empty">${TS.icon('pill', 30)}<p>Aún no tienes recetas electrónicas.</p></div>`}
        </div>`;
    },

    citas() {
      const list = TS.S.appointments;
      return `${TS.Patient.bar('Mis citas')}
        <div class="scroll" data-scroll>
          ${list.length ? list.map(a => { const u = TS.UNITS.find(x => x.id === a.unitId); return `<div class="unit"><span class="u-ic">${TS.icon('calendar', 17)}</span><span class="u-t"><b>${TS.fmt.dateTime(a.when)}</b><small>${u.nombre}</small><small>${a.tipo} · ${a.folio}</small></span></div>`; }).join('')
            : `<div class="empty">${TS.icon('calendar', 30)}<p>No tienes citas programadas.</p></div>`}
        </div>`;
    },

    notifs() {
      const list = TS.S.notifications;
      return `${TS.Patient.bar('Avisos')}
        <div class="scroll" data-scroll>
          ${list.length ? list.map(n => `<button class="notif ${n.read ? '' : 'new'}" data-action="notif" data-id="${n.id}"><span class="u-ic">${TS.icon(n.icon || 'bell', 17)}</span><span class="u-t"><b>${TS.esc(n.title)}</b><small>${TS.esc(n.text)}</small><small>${TS.fmt.time(n.at)} h</small></span></button>`).join('')
            : `<div class="empty">${TS.icon('bell', 30)}<p>Sin avisos por ahora.</p></div>`}
        </div>`;
    }
  }
};
