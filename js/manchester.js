/* ==========================================================================
   Motor de triaje basado en la metodología Manchester (MTS) — adaptación
   para triaje remoto. Evalúa de mayor a menor prioridad: el primer
   discriminador positivo determina el color (como en los diagramas MTS).

   IMPORTANTE: prototipo de demostración. El uso productivo del MTS requiere
   licencia del Manchester Triage Group y validación clínica local.
   ========================================================================== */
window.TS = window.TS || {};

TS.Triage = {
  rank(c) { return TS.MTS_ORDER.indexOf(c); },

  flow(id) { return TS.FLOWS.find(f => f.id === id); },

  /* Discriminadores de un nivel que aplican a la persona (p. ej. embarazo). */
  list(flow, level, persona) {
    return (flow && flow[level] || []).filter(d => {
      if (!d.when) return true;
      if (d.when === 'embarazo') return !!(persona && persona.embarazo);
      return true;
    });
  },

  flowsFor(persona) {
    return TS.FLOWS.filter(f => !f.sexo || (persona && persona.sexo === f.sexo));
  },

  /* Discriminador general: dolor (escala 0–10). */
  painDisc(p) {
    if (p == null) return null;
    if (p >= 8) return { color: 'naranja', disc: 'Dolor intenso (8–10)' };
    if (p >= 5) return { color: 'amarillo', disc: 'Dolor moderado (5–7)' };
    return null;
  },

  /* Discriminador general: temperatura (°C). */
  tempDisc(t) {
    if (typeof t !== 'number') return null;
    if (t >= 41) return { color: 'naranja', disc: 'Temperatura muy elevada (≥ 41 °C)' };
    if (t >= 38.5) return { color: 'amarillo', disc: 'Fiebre (≥ 38.5 °C)' };
    if (t >= 37.5) return { color: 'verde', disc: 'Febrícula (37.5–38.4 °C)' };
    return null;
  },

  /* Evalúa las respuestas y regresa color, discriminador y trazabilidad. */
  evaluate(ans, persona) {
    const flow = this.flow(ans.flow);
    const positives = [];
    const negatives = [];
    const pick = (level, ids, src) => {
      const items = level === 'red' ? TS.RED_FLAGS : this.list(flow, level, persona);
      items.forEach(d => {
        if ((ids || []).includes(d.id)) positives.push({ disc: d.disc, color: level === 'red' ? 'rojo' : level, src });
        else if (ans.asked && ans.asked[level]) negatives.push(d.disc);
      });
    };
    if (flow) {
      pick('rojo', ans.rojo, flow.label);
      pick('naranja', ans.naranja, flow.label);
      pick('amarillo', ans.amarillo, flow.label);
      pick('verde', ans.verde, flow.label);
    }
    pick('red', ans.red, 'Riesgo vital');
    const pd = this.painDisc(ans.pain);
    if (pd) positives.push({ ...pd, src: 'General' });
    const td = this.tempDisc(ans.temp);
    if (td) positives.push({ ...td, src: 'General' });
    if (ans.dur === '7+') positives.push({ color: 'verde', disc: 'Síntomas persistentes (> 7 días)', src: 'General' });
    if (flow && flow.minColor === 'verde') positives.push({ color: 'verde', disc: 'Motivo que siempre requiere valoración médica', src: 'Regla de seguridad' });

    // Ordenar de mayor a menor prioridad y tomar el primero.
    positives.sort((a, b) => this.rank(a.color) - this.rank(b.color));
    const top = positives[0];
    const color = top ? top.color : 'azul';
    const core = positives.find(p => p.src !== 'Regla de seguridad');
    return {
      color,
      colorCore: core ? core.color : 'azul',
      disc: top ? top.disc : 'Sin discriminadores positivos',
      src: top ? top.src : 'General',
      positives,
      negatives,
      mts: TS.MTS[color]
    };
  },

  /* ¿Ya está determinado el nivel? (para cortar preguntas como en MTS) */
  partialColor(ans, persona) {
    return this.evaluate(ans, persona).color;
  },

  /* Detección simple de motivo desde texto libre (simulación de NLU). */
  detectFlow(text, persona) {
    const t = (text || '').toLowerCase();
    let best = null, bestScore = 0;
    this.flowsFor(persona).forEach(f => {
      let s = 0;
      f.kw.forEach(k => { if (t.includes(k)) s += k.length > 5 ? 2 : 1; });
      if (s > bestScore) { best = f; bestScore = s; }
    });
    return best;
  },

  /* Señales de alarma en texto libre que obligan a revisar riesgo vital. */
  detectRedText(text) {
    const t = (text || '').toLowerCase();
    return ['no puedo respirar', 'me ahogo', 'inconsciente', 'convulsi', 'no respira', 'mucha sangre'].some(k => t.includes(k));
  }
};

/* ==========================================================================
   Copiloto clínico — generación del resumen, hipótesis y FHIR (simulado).
   ========================================================================== */
TS.lc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;

TS.Clinical = {
  durText(id) { const d = TS.DURATIONS.find(x => x.id === id); return d ? d.text : 'tiempo no referido'; },

  summary(enc, persona) {
    const f = TS.Triage.flow(enc.ans.flow);
    const r = enc.result;
    const sexo = persona.sexo === 'H' ? 'Paciente masculino' : 'Paciente femenina';
    const ant = persona.cronicos.length ? `con antecedente de ${persona.cronicos.join(' y ').toLowerCase()}` : 'sin enfermedades crónicas referidas';
    const alg = persona.alergias.length ? `alergia a ${persona.alergias.map(a => a.label.toLowerCase()).join(', ')}` : 'sin alergias conocidas';
    const emb = persona.embarazo ? ` Cursa embarazo de ${persona.embarazo.sdg} semanas de gestación.` : '';
    const pain = enc.ans.pain != null ? ` Intensidad referida ${enc.ans.pain}/10.` : '';
    const temp = typeof enc.ans.temp === 'number' ? ` Temperatura autorreportada ${enc.ans.temp.toFixed(1)} °C.` :
      (enc.ans.temp === 'sin' ? ' No cuenta con termómetro.' : (enc.ans.temp === 'no' ? ' Niega fiebre.' : ''));
    const pos = r.positives.filter(p => p.src !== 'Regla de seguridad').map(p => TS.lc(p.disc));
    const posTxt = pos.length ? ` Refiere: ${pos.join('; ')}.` : '';
    const negTxt = r.negatives.length ? ` Niega: ${r.negatives.slice(0, 6).map(n => TS.lc(n)).join('; ')}.` : '';
    const note = enc.ans.note ? ` En sus palabras: “${enc.ans.note}”.` : (enc.ans.freeText ? ` En sus palabras: “${enc.ans.freeText}”.` : '');
    const vw = (enc.ans.voice || []).filter(v => v.step === 'espera').map(v => ` Nota de voz en sala de espera: “${v.text}”.`).join('');
    return `${sexo} de ${persona.edad} años, derechohabiente ${persona.derechohabiencia}, ${ant}, ${alg}.${emb} ` +
      `Consulta por ${f ? f.label.toLowerCase() : 'malestar'} de ${this.durText(enc.ans.dur)} de evolución.${pain}${temp}${posTxt}${negTxt}${note}${vw} ` +
      `Triaje Manchester (asistente virtual): ${r.mts.name.toUpperCase()} — ${r.mts.level}, por discriminador “${r.disc}”.`;
  },

  hypotheses(enc, persona) {
    const f = TS.Triage.flow(enc.ans.flow);
    if (!f) return [];
    const rc = TS.Triage.rank(enc.result.color);
    const hasHTA = persona.cronicos.some(c => /hipertensi/i.test(c));
    const all = f.dx
      .filter(d => !(d.code.startsWith('O') && !persona.embarazo))
      .filter(d => !(d.code === 'I10' && !hasHTA))
      .map(d => ({ ...d, diff: Math.abs(TS.Triage.rank(d.base) - rc), rule: /descartar/i.test(d.label) }));
    const probable = all.filter(d => !d.rule).sort((a, b) => a.diff - b.diff).slice(0, 3)
      .map((d, i) => ({ ...d, conf: i === 0 ? 'Alta' : i === 1 ? 'Media' : 'Baja', pct: i === 0 ? 78 : i === 1 ? 54 : 31 }));
    const ruleOut = all.filter(d => d.rule).sort((a, b) => TS.Triage.rank(a.base) - TS.Triage.rank(b.base)).slice(0, 2)
      .map(d => ({ ...d, conf: 'Descartar', pct: 0 }));
    return probable.concat(ruleOut);
  },

  management(enc, withPlan) {
    const c = enc.result.color;
    const f = TS.Triage.flow(enc.ans.flow);
    const base = {
      rojo: ['Activar protocolo de emergencia; no retrasar traslado.', 'Mantener comunicación con el paciente hasta contacto con 911.'],
      naranja: ['Valoración presencial inmediata en urgencias.', 'Si permanece en llamada: vigilar estado de conciencia y respiración.'],
      amarillo: ['Completar anamnesis dirigida y exploración guiada por video.', 'Definir si requiere estudios o valoración presencial.'],
      verde: ['Consulta resolutiva en primer nivel (remota o presencial).', 'Educación sobre signos de alarma.'],
      azul: ['Autocuidado guiado por el asistente.', 'Seguimiento automatizado por el copiloto administrativo.']
    }[c];
    return withPlan && f && f.consult ? base.concat([f.consult.plan]) : base;
  },

  /* Validación de medicamentos contra alergias y condiciones (simulada). */
  checkMed(med, persona) {
    const alerts = [];
    persona.alergias.forEach(a => {
      if (a.clase === med.clase) alerts.push({ level: 'block', text: `Contraindicado: alergia documentada a ${a.label.toLowerCase()}.` });
    });
    if (med.clase === 'aine') {
      if (persona.embarazo && persona.embarazo.sdg >= 20) alerts.push({ level: 'block', text: `Evitar AINE a partir de las 20 SDG (paciente con ${persona.embarazo.sdg} SDG).` });
      if (persona.cronicos.some(c => /hipertensi/i.test(c))) alerts.push({ level: 'warn', text: 'AINE puede elevar la presión arterial y reducir el efecto del losartán.' });
      if (persona.edad >= 65) alerts.push({ level: 'warn', text: 'Adulto mayor: usar AINE a la menor dosis y por el menor tiempo.' });
    }
    if (med.clase === 'sulfonamidas' && persona.embarazo) alerts.push({ level: 'warn', text: 'Sulfonamidas en embarazo: valorar riesgo/beneficio.' });
    return alerts;
  },

  fhir(enc, persona) {
    const now = new Date(enc.createdAt).toISOString();
    const entries = [
      { resource: { resourceType: 'Patient', id: persona.id, identifier: [{ system: 'urn:tusalud:expediente', value: persona.expediente }],
        name: [{ given: [persona.nombre], family: persona.apellidos }], gender: persona.sexo === 'H' ? 'male' : 'female' } },
      { resource: { resourceType: 'Encounter', id: enc.id, status: enc.status === 'atendido' ? 'finished' : 'in-progress',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'VR', display: 'virtual' },
        subject: { reference: `Patient/${persona.id}` }, period: { start: now },
        priority: { coding: [{ system: 'urn:tusalud:manchester', code: enc.result.color, display: `${enc.result.mts.name} · ${enc.result.mts.level}` }] } } },
      { resource: { resourceType: 'Observation', id: `${enc.id}-triage`, status: 'final',
        code: { text: 'Prioridad de triaje (metodología Manchester, adaptación remota)' },
        subject: { reference: `Patient/${persona.id}` }, effectiveDateTime: now,
        valueCodeableConcept: { coding: [{ system: 'urn:tusalud:manchester', code: enc.result.color }], text: enc.result.disc } } }
    ];
    persona.alergias.forEach((a, i) => entries.push({ resource: { resourceType: 'AllergyIntolerance', id: `${persona.id}-alg-${i}`,
      patient: { reference: `Patient/${persona.id}` }, code: { text: a.label } } }));
    if (enc.dx) entries.push({ resource: { resourceType: 'Condition', id: `${enc.id}-dx`, subject: { reference: `Patient/${persona.id}` },
      code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: enc.dx.code, display: enc.dx.label }] } } });
    (enc.rx || []).forEach((m, i) => entries.push({ resource: { resourceType: 'MedicationRequest', id: `${enc.id}-rx-${i}`, status: 'active', intent: 'order',
      subject: { reference: `Patient/${persona.id}` }, medicationCodeableConcept: { text: `${m.nombre} ${m.pres}` },
      dosageInstruction: [{ text: `${m.dosis} ${m.freq} por ${m.dias} días` }] } }));
    return { resourceType: 'Bundle', type: 'collection', timestamp: now, meta: { tag: [{ code: 'demo', display: 'Datos simulados' }] }, entry: entries };
  }
};
