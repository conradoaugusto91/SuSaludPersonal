/* ==========================================================================
   Inicio (hub de la demo) y Panel de operación de la Red Nacional.
   ========================================================================== */
window.TS = window.TS || {};

/* ---------- Escenarios guiados para presentar ---------- */
TS.SCENARIOS = [
  {
    id: 'gripa', color: 'azul', persona: 'jorge', title: 'Gripa estacional → autocuidado',
    desc: 'El asistente resuelve sin médico, da cuidados generales y programa seguimiento. A las 48 h el paciente reporta que empeoró y se escala.',
    steps: ['Triaje: gripa, 1–3 días, sin signos de alarma', 'Azul → plan de cuidados', 'Simular +48 h → “Peor” → teleconsulta'],
    answers: { red: [], text: 'tengo gripa, mucha tos y escurrimiento desde antier', flow: 'gripa', dur: '1-3', naranja: [], pain: 3, temp: 'sin', amarillo: [], verde: [], note: '' }
  },
  {
    id: 'espalda', color: 'verde', persona: 'daniela', path: 'cita', title: 'Lumbalgia en embarazo → cita en primer nivel',
    desc: 'Embarazada de 24 semanas (grupo prioritario 2027). El asistente revisa también datos de alarma obstétrica; como no hay, la ruta es una cita presencial en su clínica.',
    steps: ['Triaje: dolor de espalda que baja a la pierna, sin alarma obstétrica', 'Verde → cita presencial en primer nivel', 'Agenda por derechohabiencia (ISSSTE) y cercanía'],
    answers: { red: [], text: 'me duele la espalda baja y el dolor me baja por la pierna desde hace unos días', flow: 'espalda', dur: '4-7', naranja: [], pain: 3, temp: 'no', amarillo: [], verde: ['radicular'], note: '' }
  },
  {
    id: 'garganta', color: 'amarillo', persona: 'maria', title: 'Dolor de garganta con fiebre → teleconsulta',
    desc: 'Adulta mayor (grupo prioritario 2027). El copiloto clínico detecta que la amoxicilina choca con su alergia a penicilina antes de firmar.',
    steps: ['Triaje: fiebre 38.9 °C → Amarillo', 'Sala de espera → médico toma el caso', 'Copiloto: alerta de alergia → receta → surtido'],
    answers: { red: [], text: 'me duele mucho la garganta al tragar y tengo calentura', flow: 'garganta', dur: '1-3', rojo: [], naranja: [], pain: 4, temp: 38.9, amarillo: [], verde: ['placas', 'ganglios'], note: 'Me cuesta trabajo comer.' }
  },
  {
    id: 'toracico', color: 'naranja', persona: 'jorge', title: 'Dolor en el pecho → urgencias',
    desc: 'Dolor opresivo que se irradia: el asistente no espera, dirige a urgencias y envía prealerta con el resumen al hospital.',
    steps: ['Triaje: dolor de tipo cardiaco', 'Naranja → hospitales cercanos', 'Prealerta visible en la consola médica'],
    answers: { red: [], text: 'siento una opresión fuerte en el pecho que se va al brazo', flow: 'toracico', dur: 'hoy', naranja: ['cardiaco', 'vegetativo'], note: '' }
  }
];

TS.Hub = {
  el: null,
  mount() {
    const el = document.createElement('div');
    el.className = 'hub';
    this.el = el;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-action]');
      if (!b) return;
      if (b.dataset.action === 'scenario') TS.Main.startScenario(b.dataset.id);
      if (b.dataset.action === 'view') TS.act.setView(b.dataset.id);
    });
    this.render();
    return el;
  },
  render() {
    const rows = TS.MTS_ORDER.map(c => TS.MTS[c]);
    const who = { rojo: 'Urgencias / 911', naranja: 'Urgencias hospitalarias', amarillo: 'Médico de la Red Nacional', verde: 'Médico remoto o unidad de primer nivel', azul: 'Asistente virtual (autónomo)' };
    this.el.innerHTML = `
      <section class="hero">
        <div class="hero-t">
          <span class="eyebrow">Prototipo interactivo · Propuesta</span>
          <h1>Tu Salud: un asistente médico con IA para cada persona en México</h1>
          <p>A partir de 2027, a través de la app Tu Salud, cada persona tendrá una herramienta de inteligencia artificial para acceder a atención médica, dar seguimiento a su tratamiento y agendar citas, sin necesidad de trasladarse a una unidad.</p>
          <div class="hero-b">
            <button class="btn btn-primary btn-lg" data-action="view" data-id="recorrido">${TS.icon('split', 18)} Ver recorrido paciente + médico</button>
            <button class="btn btn-ghost btn-lg" data-action="view" data-id="paciente">${TS.icon('smartphone', 18)} Probar la app del paciente</button>
          </div>
        </div>
        <div class="hero-c">
          ${[['bot', 'Asistente Médico Virtual', 'Triaje Manchester, orientación, autocuidado y seguimiento 24/7.'],
             ['steth', 'Copiloto clínico', 'Resumen, hipótesis y validación de receta para el médico.'],
             ['clipboard', 'Copiloto administrativo', 'Nota SOAP, citas, referencias y seguimiento entre consultas.'],
             ['users', 'Red Nacional de Atención Médica Remota', '~1,000 médicos · 15–22 millones de consultas virtuales al año.']]
            .map(x => `<div class="pillar"><span class="pl-ic">${TS.icon(x[0], 20)}</span><span><b>${x[1]}</b><small>${x[2]}</small></span></div>`).join('')}
        </div>
      </section>

      <section class="sec">
        <div class="sec-h"><h2>Escenarios para la demostración</h2><p>Cada escenario prepara un perfil y un guion. En la barra superior, <b>“Siguiente paso”</b> (o la tecla →) contesta y avanza por ti; también puedes contestar a mano.</p></div>
        <div class="scen-grid">
          ${TS.SCENARIOS.map(s => { const p = TS.PERSONAS.find(x => x.id === s.persona); return `<article class="scen">
            <div class="scen-top">${TS.mtsPill(s.color)}<span class="scen-p"><span class="av sm" style="background:${p.color}">${p.iniciales}</span>${p.nombre}, ${p.edad}</span></div>
            <h3>${s.title}</h3><p>${s.desc}</p>
            <ol>${s.steps.map(x => `<li>${x}</li>`).join('')}</ol>
            <button class="btn btn-primary btn-block" data-action="scenario" data-id="${s.id}">${TS.icon('play', 15)} Iniciar escenario</button>
          </article>`; }).join('')}
        </div>
      </section>

      <section class="sec">
        <div class="sec-h"><h2>Triaje Manchester → rutas de atención</h2><p>El asistente aplica la metodología Manchester adaptada a la atención remota: descarta riesgo vital, identifica el motivo de consulta y evalúa discriminadores de mayor a menor prioridad. El primero que es positivo define el color y la ruta.</p></div>
        <div class="mts-table">
          <div class="mt-row th"><span>Prioridad</span><span>Tiempo objetivo</span><span>Disposición remota</span><span>Ruta en Tu Salud</span><span>Quién atiende</span></div>
          ${rows.map(m => `<div class="mt-row"><span>${TS.mtsPill(m.id)}</span><span><b>${m.minutes === 0 ? 'Inmediato' : m.minutes + ' min'}</b></span><span>${m.disposition}</span><span>${m.route}</span><span>${who[m.id]}</span></div>`).join('')}
        </div>
        <p class="fine left">El uso productivo del Sistema de Triaje Manchester requiere licencia del Manchester Triage Group y validación clínica local. Los discriminadores de este prototipo son ilustrativos.</p>
      </section>

      <section class="sec">
        <div class="sec-h"><h2>Arquitectura de la propuesta</h2><p>La app es la puerta de entrada al sistema: quien controla la app controla el recorrido del paciente y los datos.</p></div>
        <div class="arch">
          <div class="arch-b a1"><span class="ab-ic">${TS.icon('sparkles', 20)}</span><b>Agentes de IA · Anthropic</b><small>Asistente virtual, copiloto clínico y copiloto administrativo.</small></div>
          <div class="arch-b a2"><span class="ab-ic">${TS.icon('database', 20)}</span><b>Plataforma clínica · TCA Assist</b><small>Expediente clínico electrónico (NOM-024, SIRES), telemedicina y receta electrónica.</small></div>
          <div class="arch-b a3"><span class="ab-ic">${TS.icon('cloud', 20)}</span><b>Nube · AWS</b><small>Hospedaje de la información y los servicios.</small></div>
          <div class="arch-b a4"><span class="ab-ic">${TS.icon('shield', 20)}</span><b>Integración y operación · Deloitte</b><small>App Tu Salud, gobierno de datos, operación y responsabilidad ante el cliente.</small></div>
          <div class="arch-foot">${TS.icon('globe', 15)} Interoperabilidad HL7 FHIR entre IMSS, ISSSTE, IMSS-Bienestar, SEDENA, SEMAR, Pemex y sistemas estatales · base para la facturación cruzada del sistema universal.</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-h"><h2>Despliegue escalonado</h2></div>
        <div class="phases">
          <div class="ph"><b>2027</b><span>Adultos de 65 años o más</span><span>Mujeres embarazadas</span></div>
          <div class="ph"><b>2028</b><span>Pacientes con enfermedades crónicas de todas las edades</span></div>
          <div class="ph"><b>2029</b><span>Población general</span><span>Implementación nacional</span></div>
        </div>
      </section>
      <footer class="hub-foot">Prototipo con datos simulados para fines de propuesta. No es un servicio oficial ni ofrece atención médica real.</footer>`;
  }
};

/* ---------- Panel de operación (datos simulados) ---------- */
TS.Ops = {
  el: null,
  mount() {
    const el = document.createElement('div');
    el.className = 'ops';
    this.el = el;
    el.addEventListener('mousemove', e => this.hover(e));
    el.addEventListener('mouseleave', () => this.hideTip());
    TS.on(t => { if (t === 'all' || t === 'queue' || t === 'view') this.render(); });
    this.render();
    return el;
  },

  data() {
    const S = TS.S;
    const live = S.encounters.length;
    const dist = { rojo: 2.1, naranja: 6.4, amarillo: 21.8, verde: 28.5, azul: 41.2 };
    const total = 286412 + live;
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    const perHour = [6.1, 11.4, 19.8, 24.6, 26.2, 25.1, 23.4, 21.7, 20.9, 21.8, 22.6, 21.2, 18.4, 15.9, 12.7, 9.1];
    const waits = { naranja: [6, 10], amarillo: [24, 60], verde: [71, 120], azul: [0, 240] };
    const routes = [['Autocuidado guiado (asistente)', 41.2], ['Teleconsulta con médico', 37.6], ['Cita en primer nivel', 15.1], ['Urgencias / 911', 6.1]];
    const states = [
      ['Ciudad de México', 38210, 43, 19], ['Estado de México', 41180, 39, 27], ['Jalisco', 19870, 42, 21], ['Nuevo León', 16420, 45, 17],
      ['Puebla', 14930, 38, 29], ['Veracruz', 17260, 36, 33], ['Guanajuato', 12540, 41, 22], ['Chiapas', 9870, 34, 38]
    ];
    return { total, dist, hours, perHour, waits, routes, states, live };
  },

  render() {
    const d = this.data();
    const maxH = Math.max(...d.perHour);
    const W = 640, H = 200, padL = 34, padB = 26, padT = 12;
    const x = i => padL + i * (W - padL - 12) / (d.hours.length - 1);
    const y = v => padT + (H - padT - padB) * (1 - v / 30);
    const pts = d.perHour.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const grid = [0, 10, 20, 30].map(v => `<line x1="${padL}" x2="${W - 12}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${padL - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}k</text>`).join('');
    const xl = d.hours.filter((h, i) => i % 3 === 0).map(h => { const i = d.hours.indexOf(h); return `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">${h}:00</text>`; }).join('');
    const hits = d.hours.map((h, i) => `<rect class="hit" x="${x(i) - 18}" y="${padT}" width="36" height="${H - padT - padB}" data-tip="${h}:00 h · ${Math.round(d.perHour[i] * 1000).toLocaleString('es-MX')} consultas" data-cx="${x(i)}" data-cy="${y(d.perHour[i])}"/>`).join('');
    const peak = d.perHour.indexOf(maxH);
    this.el.innerHTML = `
      <div class="ops-head"><div><span class="eyebrow">Panel de operación · datos simulados</span><h1>Red Nacional de Atención Médica Remota</h1><p>${TS.fmt.dateLong(TS.now())} · corte ${TS.fmt.time(TS.now())} h (CDMX)</p></div>
        <div class="ops-badge">${TS.icon('activity', 16)} En esta demo: <b>${d.live}</b> triaje(s) en vivo</div></div>
      <div class="kpis">
        <div class="kpi kpi-hero"><small>Atenciones hoy</small><b>${d.total.toLocaleString('es-MX')}</b><em class="up">≈ 3× la capacidad de consulta previa</em></div>
        <div class="kpi"><small>Resueltas por el asistente</small><b>41.2%</b><em>sin necesidad de médico</em></div>
        <div class="kpi"><small>Médicos en línea</small><b>${TS.Doctor.onlineDocs().toLocaleString('es-MX')}</b><em>Central 312 · Estatal 451 · Desc. 255</em></div>
        <div class="kpi"><small>Espera media · Amarillo</small><b>24 min</b><em class="ok">objetivo ≤ 60 min</em></div>
      </div>
      <div class="ops-grid">
        <section class="panel chart">
          <div class="panel-h"><span>CONSULTAS POR HORA (MILES)</span><small>Pico ${d.hours[peak]}:00 h · ${Math.round(maxH * 1000).toLocaleString('es-MX')}</small></div>
          <div class="line-wrap"><svg viewBox="0 0 ${W} ${H}" class="line-svg" role="img" aria-label="Consultas por hora">${grid}${xl}
            <polyline points="${pts}" class="ln"/><line class="xh" x1="0" x2="0" y1="${padT}" y2="${H - padB}" style="display:none"/><circle class="xh-dot" r="5" style="display:none"/>
            <text x="${x(peak) + 8}" y="${y(maxH) - 6}" class="lbl">${Math.round(maxH * 1000).toLocaleString('es-MX')}</text>${hits}</svg></div>
        </section>
        <section class="panel chart">
          <div class="panel-h"><span>DISTRIBUCIÓN POR PRIORIDAD MANCHESTER</span><small>% de triajes del día</small></div>
          <div class="hbars">${TS.MTS_ORDER.map(c => `<div class="hb" data-tip="${TS.MTS[c].name} · ${TS.MTS[c].level}: ${d.dist[c]}% · ${Math.round(d.total * d.dist[c] / 100).toLocaleString('es-MX')} triajes">
            <span class="hb-l"><span class="mts-num mts-${c}">${TS.MTS[c].n}</span>${TS.MTS[c].name}</span><span class="hb-t"><i class="mts-bg-${c}" style="width:${d.dist[c] / 45 * 100}%"></i></span><span class="hb-v">${d.dist[c]}%</span></div>`).join('')}</div>
        </section>
        <section class="panel chart">
          <div class="panel-h"><span>ESPERA MEDIA VS. TIEMPO OBJETIVO</span><small>minutos · la marca vertical es el objetivo</small></div>
          <div class="hbars wait">${['naranja', 'amarillo', 'verde'].map(c => { const [w, t] = d.waits[c]; return `<div class="hb" data-tip="${TS.MTS[c].name}: espera media ${w} min · objetivo ${t} min">
            <span class="hb-l"><span class="mts-num mts-${c}">${TS.MTS[c].n}</span>${TS.MTS[c].name}</span><span class="hb-t"><i class="ink" style="width:${w / 130 * 100}%"></i><b class="tgt" style="left:${t / 130 * 100}%"></b></span><span class="hb-v">${w} / ${t}</span></div>`; }).join('')}
            <div class="hb muted-row"><span class="hb-l"><span class="mts-num mts-azul">5</span>Azul</span><span class="hb-t na">Resuelto por el asistente · sin espera</span><span class="hb-v">—</span></div></div>
        </section>
        <section class="panel chart">
          <div class="panel-h"><span>RESOLUCIÓN POR RUTA DE ATENCIÓN</span><small>% de atenciones</small></div>
          <div class="hbars">${d.routes.map(r => `<div class="hb" data-tip="${r[0]}: ${r[1]}%"><span class="hb-l wide">${r[0]}</span><span class="hb-t"><i class="ink" style="width:${r[1] / 45 * 100}%"></i></span><span class="hb-v">${r[1]}%</span></div>`).join('')}</div>
        </section>
        <section class="panel span2">
          <div class="panel-h"><span>POR ENTIDAD FEDERATIVA</span><small>principales 8</small></div>
          <div class="table t-st"><div class="tr th"><span>Entidad</span><span>Atenciones hoy</span><span>% autocuidado</span><span>Espera media (min)</span></div>
          ${d.states.map(s => `<div class="tr"><span><b>${s[0]}</b></span><span>${s[1].toLocaleString('es-MX')}</span><span>${s[2]}%</span><span>${s[3]}</span></div>`).join('')}</div>
        </section>
      </div>
      <div class="tip" data-tip-el></div>`;
  },

  hover(e) {
    const t = e.target.closest('[data-tip]');
    const tip = this.el.querySelector('[data-tip-el]');
    const svg = this.el.querySelector('.line-svg');
    if (!t) { this.hideTip(); return; }
    tip.textContent = t.dataset.tip;
    tip.style.display = 'block';
    const r = this.el.getBoundingClientRect();
    tip.style.left = `${e.clientX - r.left + 14}px`;
    tip.style.top = `${e.clientY - r.top + this.el.scrollTop + 14}px`;
    if (svg && t.dataset.cx) {
      const xh = svg.querySelector('.xh'), dot = svg.querySelector('.xh-dot');
      xh.setAttribute('x1', t.dataset.cx); xh.setAttribute('x2', t.dataset.cx); xh.style.display = '';
      dot.setAttribute('cx', t.dataset.cx); dot.setAttribute('cy', t.dataset.cy); dot.style.display = '';
    }
  },
  hideTip() {
    const tip = this.el && this.el.querySelector('[data-tip-el]');
    if (tip) tip.style.display = 'none';
    const svg = this.el && this.el.querySelector('.line-svg');
    if (svg) { svg.querySelector('.xh').style.display = 'none'; svg.querySelector('.xh-dot').style.display = 'none'; }
  }
};
