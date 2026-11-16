/* ==========================================================================
   Dictado por voz del paciente (español de México).
   Usa el reconocimiento de voz del navegador (Chrome / Edge). Si no está
   disponible, no hay permiso de micrófono o no hay conexión con el servicio
   de voz, cambia a un dictado simulado para que la demo no se detenga.
   ========================================================================== */
window.TS = window.TS || {};

TS.Voice = {
  Rec: window.SpeechRecognition || window.webkitSpeechRecognition || null,
  st: { active: false, target: null, final: '', interim: '', sim: false },
  rec: null,
  simTimer: null,
  cancelled: false,
  onSegment: null,
  onDone: null,
  simText: '',

  get supported() { return !!this.Rec; },
  isOn(target) { return this.st.active && this.st.target === target; },
  text() { return `${this.st.final} ${this.st.interim}`.trim(); },

  /* target: 'chat' | 'espera' | 'video'
     opts.onSegment(texto) se llama con cada frase final (para la consulta en vivo).
     opts.onDone(textoCompleto) se llama al terminar. */
  start(target, opts) {
    const o = opts || {};
    if (this.st.active) this.cancel();
    this.st = { active: true, target, final: '', interim: '', sim: false };
    this.cancelled = false;
    this.onSegment = o.onSegment || null;
    this.onDone = o.onDone || null;
    this.simText = o.simText || '';
    if (!this.Rec) return this.simulate();
    let r;
    try {
      r = new this.Rec();
      r.lang = 'es-MX';
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
    } catch (e) { return this.simulate(); }
    r.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const seg = t.trim();
          if (seg) {
            this.st.final = `${this.st.final} ${seg}`.trim();
            if (this.onSegment) this.onSegment(seg);
          }
        } else interim += t;
      }
      this.st.interim = interim.trim();
      TS.emit('voice', { target: this.st.target });
    };
    r.onerror = e => {
      const fatal = ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'];
      if (fatal.includes(e.error) && !this.st.final) {
        this.rec = null;
        try { r.abort(); } catch (err) { /* nada */ }
        TS.toast(e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Sin permiso de micrófono: uso dictado simulado.'
          : 'El servicio de voz del navegador no respondió: uso dictado simulado.', 'info');
        this.simulate();
      }
    };
    r.onend = () => { if (this.rec === r) this.finish(); };
    this.rec = r;
    try { r.start(); } catch (e) { this.rec = null; return this.simulate(); }
    TS.emit('voice', { target, started: true });
  },

  /* Dictado simulado: escribe la frase palabra por palabra. */
  simulate() {
    this.st.sim = true;
    this.st.active = true;
    const words = (this.simText || 'Quería comentarle algo más a la doctora.').split(/\s+/);
    let i = 0;
    clearInterval(this.simTimer);
    TS.emit('voice', { target: this.st.target, started: true });
    this.simTimer = setInterval(() => {
      if (!this.st.active) { clearInterval(this.simTimer); return; }
      i++;
      this.st.interim = words.slice(0, i).join(' ');
      TS.emit('voice', { target: this.st.target });
      if (i >= words.length) {
        clearInterval(this.simTimer);
        TS.later(450, () => this.stop());
      }
    }, 240);
  },

  stop() {
    if (!this.st.active) return;
    if (this.rec) {
      try { this.rec.stop(); } catch (e) { this.finish(); }
    } else {
      clearInterval(this.simTimer);
      this.finish();
    }
  },

  cancel() { this.cancelled = true; this.stop(); },

  finish() {
    if (!this.st.active) return;
    const leftover = this.st.interim.trim();
    if (!this.cancelled && leftover && this.onSegment) this.onSegment(leftover);
    const text = this.cancelled ? '' : `${this.st.final} ${leftover}`.trim();
    const target = this.st.target;
    const cb = this.onDone;
    this.st = { active: false, target: null, final: '', interim: '', sim: false };
    this.rec = null;
    this.onDone = null;
    this.onSegment = null;
    clearInterval(this.simTimer);
    TS.emit('voice', { target, ended: true });
    if (cb) cb(text);
  },

  /* Texto en vivo para mostrar (final + parcial en cursiva). */
  liveHtml() {
    const f = TS.esc(this.st.final), i = TS.esc(this.st.interim);
    if (!f && !i) return '<span class="ph">Habla ahora…</span>';
    return `${f}${i ? ` <i>${i}</i>` : ''}`;
  }
};
