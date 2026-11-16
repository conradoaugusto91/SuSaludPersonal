/* ==========================================================================
   Tu Salud — Prototipo interactivo
   Datos de demostración (100% simulados). No contiene información real.
   ========================================================================== */
window.TS = window.TS || {};

/* --------------------------------------------------------------------------
   Niveles del Sistema de Triaje Manchester (MTS) y su ruta en Tu Salud.
   Disposición = adaptación remota (Telephone Triage and Advice):
   Ahora / Pronto / Después / Consejo.
   -------------------------------------------------------------------------- */
TS.MTS = {
  rojo: {
    id: 'rojo', n: 1, name: 'Rojo', level: 'Atención inmediata', minutes: 0,
    disposition: 'Ahora', route: 'Urgencias · 911',
    routeLong: 'Emergencia: llamar al 911 o acudir de inmediato al hospital más cercano.',
    pathway: 'emergencia'
  },
  naranja: {
    id: 'naranja', n: 2, name: 'Naranja', level: 'Muy urgente', minutes: 10,
    disposition: 'Ahora', route: 'Urgencias hospitalarias',
    routeLong: 'Necesitas valoración médica en menos de 10 minutos: acude a urgencias o habla ya con un médico.',
    pathway: 'emergencia'
  },
  amarillo: {
    id: 'amarillo', n: 3, name: 'Amarillo', level: 'Urgente', minutes: 60,
    disposition: 'Pronto', route: 'Teleconsulta inmediata',
    routeLong: 'Un médico de la Red Nacional de Atención Médica Remota te atenderá en menos de 60 minutos.',
    pathway: 'remota'
  },
  verde: {
    id: 'verde', n: 4, name: 'Verde', level: 'Poco urgente', minutes: 120,
    disposition: 'Después', route: 'Teleconsulta o cita en primer nivel',
    routeLong: 'Requieres valoración médica, pero no es urgente: teleconsulta en las próximas horas o cita en tu unidad.',
    pathway: 'primer-nivel'
  },
  azul: {
    id: 'azul', n: 5, name: 'Azul', level: 'No urgente', minutes: 240,
    disposition: 'Consejo', route: 'Autocuidado guiado + seguimiento',
    routeLong: 'Puedes cuidarte en casa con indicaciones del asistente. Te daré seguimiento.',
    pathway: 'autocuidado'
  }
};
TS.MTS_ORDER = ['rojo', 'naranja', 'amarillo', 'verde', 'azul'];

/* --------------------------------------------------------------------------
   Discriminadores generales de riesgo vital (nivel ROJO) — lenguaje paciente.
   -------------------------------------------------------------------------- */
TS.RED_FLAGS = [
  { id: 'resp', q: 'Me ahogo, no puedo respirar o hablar', disc: 'Respiración inadecuada' },
  { id: 'cian', q: 'Labios o cara morados', disc: 'Compromiso de vía aérea / cianosis' },
  { id: 'hem', q: 'Sangrado abundante que no se detiene', disc: 'Hemorragia exanguinante' },
  { id: 'resp2', q: 'Alguien no responde o perdió el conocimiento', disc: 'No responde a estímulos' },
  { id: 'conv', q: 'Está convulsionando ahora', disc: 'Convulsión activa' },
  { id: 'shock', q: 'Piel fría, pálida y sudorosa con desmayo', disc: 'Signos de choque' }
];

/* --------------------------------------------------------------------------
   Personas de demostración (ficticias).
   -------------------------------------------------------------------------- */
TS.PERSONAS = [
  {
    id: 'jorge', nombre: 'Jorge', apellidos: 'Ramírez Luna', iniciales: 'JR',
    edad: 41, sexo: 'H', sexoLargo: 'Hombre',
    curp: 'RALJ8503XXHDFMNR0X', nss: '4512-85-XXXX-7', expediente: 'TS-0919-4471',
    derechohabiencia: 'IMSS', unidad: 'umf15', colonia: 'Toriello Guerra', alcaldia: 'Tlalpan',
    pos: { x: 168, y: 214 },
    sangre: 'O+',
    alergias: [{ label: 'Sulfonamidas (sulfas)', clase: 'sulfonamidas' }],
    cronicos: ['Rinitis alérgica'],
    meds: ['Loratadina 10 mg (cuando la necesita)'],
    embarazo: null, grupo: null,
    color: '#9b2247'
  },
  {
    id: 'maria', nombre: 'María Elena', apellidos: 'Hernández Soto', iniciales: 'MH',
    edad: 68, sexo: 'M', sexoLargo: 'Mujer',
    curp: 'HESM5711XXMDFRTR0X', nss: '—', expediente: 'TS-0457-1180',
    derechohabiencia: 'IMSS-Bienestar', unidad: 'cs-spm', colonia: 'San Pedro Mártir', alcaldia: 'Tlalpan',
    pos: { x: 120, y: 300 },
    sangre: 'A+',
    alergias: [{ label: 'Penicilina', clase: 'penicilinas' }],
    cronicos: ['Hipertensión arterial', 'Diabetes tipo 2'],
    meds: ['Losartán 50 mg cada 12 h', 'Metformina 850 mg cada 12 h'],
    embarazo: null, grupo: 'Adulto mayor · grupo prioritario 2027',
    color: '#1e5b4f'
  },
  {
    id: 'daniela', nombre: 'Daniela', apellidos: 'Ortiz Méndez', iniciales: 'DO',
    edad: 27, sexo: 'M', sexoLargo: 'Mujer',
    curp: 'OIMD9902XXMDFRNN0X', nss: '—', expediente: 'TS-1288-3302',
    derechohabiencia: 'ISSSTE', unidad: 'cmf-tlalpan', colonia: 'Villa Coapa', alcaldia: 'Tlalpan',
    pos: { x: 250, y: 150 },
    sangre: 'B+',
    alergias: [],
    cronicos: [],
    meds: ['Ácido fólico 0.4 mg diario', 'Sulfato ferroso 200 mg diario'],
    embarazo: { sdg: 24 }, grupo: 'Embarazo (24 SDG) · grupo prioritario 2027',
    color: '#a57f2c'
  }
];

/* --------------------------------------------------------------------------
   Unidades de salud (simuladas) — coordenadas sobre el mapa SVG (360 x 420).
   -------------------------------------------------------------------------- */
TS.UNITS = [
  { id: 'umf15', tipo: 'UMF', nombre: 'UMF 15 · Tlalpan Centro', inst: 'IMSS', x: 140, y: 250,
    dir: 'Calz. de Tlalpan 4500 (simulada), Tlalpan, CDMX', horario: '7:00 a 20:00 h', farmacia: true, urgencias: false },
  { id: 'umf07', tipo: 'UMF', nombre: 'UMF 7 · Coapa', inst: 'IMSS', x: 262, y: 118,
    dir: 'Av. Acoxpa 610 (simulada), Coapa, CDMX', horario: '7:00 a 20:00 h', farmacia: true, urgencias: false },
  { id: 'cs-spm', tipo: 'Centro de Salud', nombre: 'Centro de Salud T-III · San Pedro Mártir', inst: 'IMSS-Bienestar', x: 96, y: 330,
    dir: 'Carr. Federal a Cuernavaca km 18 (simulada), Tlalpan, CDMX', horario: '8:00 a 18:00 h', farmacia: true, urgencias: false },
  { id: 'cmf-tlalpan', tipo: 'Clínica', nombre: 'Clínica de Medicina Familiar · Tlalpan', inst: 'ISSSTE', x: 214, y: 196,
    dir: 'Av. San Fernando 120 (simulada), Tlalpan, CDMX', horario: '7:00 a 19:30 h', farmacia: true, urgencias: false },
  { id: 'hgr-sur', tipo: 'Hospital', nombre: 'Hospital General Regional Sur', inst: 'IMSS', x: 300, y: 250,
    dir: 'Periférico Sur 4100 (simulada), CDMX', horario: 'Urgencias 24 h', farmacia: true, urgencias: true },
  { id: 'hg-tlalpan', tipo: 'Hospital', nombre: 'Hospital General Tlalpan', inst: 'IMSS-Bienestar', x: 70, y: 168,
    dir: 'Av. Insurgentes Sur 3700 (simulada), CDMX', horario: 'Urgencias 24 h', farmacia: true, urgencias: true },
  { id: 'hr-issste', tipo: 'Hospital', nombre: 'Hospital Regional ISSSTE Sur', inst: 'ISSSTE', x: 236, y: 360,
    dir: 'Av. División del Norte 3300 (simulada), CDMX', horario: 'Urgencias 24 h', farmacia: true, urgencias: true }
];

/* --------------------------------------------------------------------------
   Médico de la Red Nacional de Atención Médica Remota (ficticio).
   -------------------------------------------------------------------------- */
TS.DOCTOR = {
  nombre: 'Dra. Ana Lucía Torres Vega', corto: 'Dra. Torres', iniciales: 'AT',
  especialidad: 'Medicina Familiar', cedula: '7845123',
  nodo: 'Nodo Central CDMX · Red Nacional de Atención Médica Remota', turno: 'Turno vespertino'
};

/* --------------------------------------------------------------------------
   Catálogo de medicamentos (cuadro básico — simulado).
   -------------------------------------------------------------------------- */
TS.MEDS = [
  { id: 'paracetamol', nombre: 'Paracetamol', pres: 'Tableta 500 mg', clase: 'analgesico', dosis: '500 mg', freq: 'cada 8 horas si hay dolor o fiebre', dias: 5 },
  { id: 'ibuprofeno', nombre: 'Ibuprofeno', pres: 'Tableta 400 mg', clase: 'aine', dosis: '400 mg', freq: 'cada 8 horas con alimentos', dias: 5 },
  { id: 'naproxeno', nombre: 'Naproxeno', pres: 'Tableta 250 mg', clase: 'aine', dosis: '250 mg', freq: 'cada 12 horas con alimentos', dias: 5 },
  { id: 'amoxicilina', nombre: 'Amoxicilina', pres: 'Cápsula 500 mg', clase: 'penicilinas', dosis: '500 mg', freq: 'cada 8 horas', dias: 10 },
  { id: 'azitromicina', nombre: 'Azitromicina', pres: 'Tableta 500 mg', clase: 'macrolidos', dosis: '500 mg', freq: 'cada 24 horas', dias: 3 },
  { id: 'tmpsmx', nombre: 'Trimetoprima / Sulfametoxazol', pres: 'Tableta 160/800 mg', clase: 'sulfonamidas', dosis: '1 tableta', freq: 'cada 12 horas', dias: 7 },
  { id: 'loratadina', nombre: 'Loratadina', pres: 'Tableta 10 mg', clase: 'antihistaminico', dosis: '10 mg', freq: 'cada 24 horas', dias: 7 },
  { id: 'vso', nombre: 'Electrolitos orales (Vida Suero Oral)', pres: 'Sobre polvo', clase: 'rehidratacion', dosis: '1 sobre en 1 L de agua', freq: 'a libre demanda, en sorbos', dias: 3 },
  { id: 'butilhioscina', nombre: 'Butilhioscina', pres: 'Gragea 10 mg', clase: 'antiespasmodico', dosis: '10 mg', freq: 'cada 8 horas si hay cólico', dias: 3 },
  { id: 'omeprazol', nombre: 'Omeprazol', pres: 'Cápsula 20 mg', clase: 'ibp', dosis: '20 mg', freq: 'cada 24 horas en ayuno', dias: 14 },
  { id: 'ambroxol', nombre: 'Ambroxol', pres: 'Solución 30 mg/5 mL', clase: 'mucolitico', dosis: '5 mL', freq: 'cada 8 horas', dias: 5 },
  { id: 'nitrofurantoina', nombre: 'Nitrofurantoína', pres: 'Cápsula 100 mg', clase: 'nitrofuranos', dosis: '100 mg', freq: 'cada 12 horas', dias: 5 }
];

/* --------------------------------------------------------------------------
   Diagramas de presentación (motivos de consulta) — adaptación remota
   inspirada en la metodología Manchester. Los textos de los discriminadores
   son propios del prototipo y deben validarse clínicamente.
   -------------------------------------------------------------------------- */
TS.FLOWS = [
  {
    id: 'gripa', label: 'Gripa, tos o fiebre', mts: 'Adulto con malestar general',
    kw: ['gripa', 'gripe', 'resfri', 'tos', 'moco', 'congesti', 'estornud', 'fiebre', 'calentura', 'cuerpo cortado', 'escurr', 'flema'],
    pain: true, fever: true, painLabel: '¿Qué tanto malestar o dolor de cuerpo tienes?',
    naranja: [
      { id: 'disrep', q: 'Me falta el aire aunque esté en reposo', disc: 'Dificultad respiratoria en reposo' },
      { id: 'concien', q: 'Mucha somnolencia o confusión', disc: 'Alteración del estado de conciencia' },
      { id: 'petequias', q: 'Manchas en la piel que no se borran al presionarlas', disc: 'Exantema purpúrico' }
    ],
    amarillo: [
      { id: 'pleur', q: 'Dolor en el pecho al respirar o toser', disc: 'Dolor pleurítico' },
      { id: 'deshid', q: 'Casi no puedo tomar líquidos o casi no orino', disc: 'Datos de deshidratación' },
      { id: 'hemopt', q: 'Tos con flemas con sangre', disc: 'Hemoptisis' }
    ],
    verde: [
      { id: 'otalgia', q: 'Dolor de oído', disc: 'Otalgia' },
      { id: 'sinus', q: 'Dolor en la cara o frente con moco espeso', disc: 'Dolor facial / sinusal' }
    ],
    advice: [
      { t: 'Hidrátate', d: 'Toma agua, caldos o tés a lo largo del día. Si orinas claro, vas bien.' },
      { t: 'Lavados nasales', d: 'Limpia tu nariz con agua tibia con sal o solución salina 3 a 4 veces al día.' },
      { t: 'Descansa', d: 'Duerme bien y evita esfuerzos intensos mientras te sientes mal.' },
      { t: 'Gárgaras y vapor', d: 'Haz gárgaras con agua tibia con sal y respira vapor de una regadera caliente.' },
      { t: 'Cuida a los demás', d: 'Usa cubrebocas, lávate las manos seguido y ventila tu casa.' },
      { t: 'Mide tu temperatura', d: 'Tómala cada 8 horas y anótala; te la preguntaré en tu seguimiento.' }
    ],
    warn: ['Falta de aire o respiración rápida', 'Fiebre de 38.5 °C o más por más de 48 horas', 'Dolor en el pecho', 'Labios o uñas morados', 'Confusión o mucha somnolencia'],
    recheckH: 48,
    dx: [
      { code: 'J00', label: 'Rinofaringitis aguda (resfriado común)', base: 'azul' },
      { code: 'J11.1', label: 'Influenza con manifestaciones respiratorias, virus no identificado', base: 'verde' },
      { code: 'U07.1', label: 'COVID-19, virus identificado (descartar con prueba)', base: 'verde' },
      { code: 'J18.9', label: 'Neumonía, no especificada (descartar)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Sigo con escurrimiento y tos, y ahora siento el cuerpo más cortado.',
      q2: '¿Has tenido dificultad para respirar o dolor en el pecho?',
      p2: 'No, eso no. Solo la tos que no me deja dormir.',
      exam: 'Facies de cansancio, sin dificultad respiratoria aparente en video, habla frases completas. Faringe levemente hiperémica a la inspección guiada.',
      dx: { code: 'J11.1', label: 'Influenza con manifestaciones respiratorias, virus no identificado' },
      rx: ['paracetamol'],
      plan: 'Manejo sintomático, hidratación, aislamiento domiciliario 5 días, vigilar signos de alarma respiratoria.'
    }
  },
  {
    id: 'garganta', label: 'Dolor de garganta', mts: 'Dolor de garganta',
    kw: ['garganta', 'anginas', 'amigdal', 'amígdal', 'tragar', 'faringe', 'ronquera'],
    pain: true, fever: true, painLabel: '¿Qué tanto te duele la garganta?',
    rojo: [
      { id: 'estridor', q: 'Ruido agudo (silbido) al respirar', disc: 'Estridor' }
    ],
    naranja: [
      { id: 'babeo', q: 'No puedo tragar ni mi propia saliva', disc: 'Babeo / incapacidad para deglutir' },
      { id: 'cuello', q: 'Hinchazón grande en el cuello', disc: 'Aumento de volumen cervical' }
    ],
    amarillo: [
      { id: 'trismus', q: 'No puedo abrir bien la boca', disc: 'Trismus' },
      { id: 'vozpapa', q: 'Voz apagada, como con una papa en la boca', disc: 'Voz de "papa caliente"' }
    ],
    verde: [
      { id: 'placas', q: 'Placas blancas o pus en las anginas', disc: 'Exudado amigdalino' },
      { id: 'ganglios', q: 'Bolitas inflamadas y dolorosas en el cuello', disc: 'Adenopatía cervical dolorosa' }
    ],
    advice: [
      { t: 'Gárgaras', d: 'Haz gárgaras con agua tibia con sal 3 a 4 veces al día.' },
      { t: 'Líquidos tibios', d: 'Toma té tibio con miel (no en menores de 1 año) y mucha agua.' },
      { t: 'Descansa tu voz', d: 'Habla poco y evita gritar mientras sientes molestia.' },
      { t: 'Evita irritantes', d: 'No fumes y evita el humo, lo muy frío o muy condimentado.' }
    ],
    warn: ['No poder tragar ni saliva', 'Dificultad para respirar o silbido al respirar', 'Fiebre de 38.5 °C o más', 'No poder abrir la boca'],
    recheckH: 48,
    dx: [
      { code: 'J02.9', label: 'Faringitis aguda, no especificada', base: 'azul' },
      { code: 'J03.0', label: 'Amigdalitis estreptocócica', base: 'verde' },
      { code: 'J03.9', label: 'Amigdalitis aguda, no especificada', base: 'verde' },
      { code: 'J36', label: 'Absceso periamigdalino (descartar)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Me duele mucho al tragar y anoche tuve escalofríos.',
      q2: '¿Puedes acercar la cámara y abrir la boca? Di "aaa".',
      p2: 'Sí, así… ¿se ven las anginas?',
      exam: 'Por video: amígdalas hipertróficas con exudado blanquecino bilateral, sin desviación de úvula. Refiere adenopatía cervical dolorosa. Sin estridor ni babeo.',
      dx: { code: 'J03.0', label: 'Amigdalitis estreptocócica (probable, Centor 4)' },
      rx: ['amoxicilina', 'paracetamol'],
      plan: 'Antibiótico 10 días, analgésico/antipirético, hidratación. Revalorar en 48 h si persiste fiebre.'
    }
  },
  {
    id: 'cefalea', label: 'Dolor de cabeza', mts: 'Cefalea',
    kw: ['cabeza', 'migra', 'jaqueca', 'cefale'],
    pain: true, fever: true, painLabel: '¿Qué tanto te duele la cabeza?',
    naranja: [
      { id: 'subito', q: 'Es el peor dolor de mi vida y empezó de golpe', disc: 'Cefalea de inicio súbito' },
      { id: 'focal', q: 'Debilidad, hormigueo o dificultad para hablar', disc: 'Déficit neurológico agudo' },
      { id: 'meningeo', q: 'Cuello rígido y fiebre', disc: 'Signos meníngeos' },
      { id: 'preecl', q: 'Visión borrosa, lucecitas o hinchazón de cara y manos', disc: 'Datos de alarma obstétrica (posible preeclampsia)', when: 'embarazo' }
    ],
    amarillo: [
      { id: 'trauma', q: 'Me golpeé la cabeza recientemente', disc: 'Antecedente de trauma craneal' },
      { id: 'vomito', q: 'Vómito que no se detiene', disc: 'Vómito persistente' },
      { id: 'vision', q: 'Veo doble o borroso', disc: 'Alteración visual aguda' }
    ],
    verde: [
      { id: 'recurrente', q: 'Es un dolor parecido a otros que he tenido', disc: 'Cefalea recurrente conocida' }
    ],
    advice: [
      { t: 'Descanso', d: 'Recuéstate en un lugar oscuro y silencioso durante 30 minutos.' },
      { t: 'Hidrátate', d: 'Toma agua; la deshidratación es un detonante frecuente.' },
      { t: 'Compresas', d: 'Coloca una compresa fría en la frente o tibia en la nuca.' },
      { t: 'Pausas', d: 'Descansa la vista de pantallas cada 30 minutos y relaja hombros y cuello.' }
    ],
    warn: ['Dolor súbito, el peor de tu vida', 'Debilidad, hormigueo o dificultad para hablar', 'Fiebre con cuello rígido', 'Vómito que no se detiene'],
    recheckH: 24,
    dx: [
      { code: 'G44.2', label: 'Cefalea tensional', base: 'azul' },
      { code: 'G43.9', label: 'Migraña, no especificada', base: 'verde' },
      { code: 'I10', label: 'Descontrol hipertensivo (si aplica)', base: 'amarillo' },
      { code: 'O14.9', label: 'Preeclampsia (descartar en embarazo)', base: 'naranja' }
    ],
    consult: {
      p1: 'Me duele toda la cabeza, como apretada, desde la mañana.',
      q2: '¿Tienes debilidad en brazos o piernas, o dificultad para hablar?',
      p2: 'No, nada de eso. Es como una banda que me aprieta.',
      exam: 'Por video: alerta, lenguaje fluido, sin asimetría facial, movimientos oculares conservados. Sin rigidez de nuca a maniobra guiada.',
      dx: { code: 'G44.2', label: 'Cefalea tensional' },
      rx: ['paracetamol'],
      plan: 'Analgesia simple, higiene de sueño, pausas activas. Signos de alarma explicados.'
    }
  },
  {
    id: 'toracico', label: 'Dolor en el pecho', mts: 'Dolor torácico',
    kw: ['pecho', 'torac', 'tórac', 'corazon', 'corazón', 'opresi', 'infarto'],
    pain: true, fever: false, minColor: 'verde', painLabel: '¿Qué tanto te duele el pecho?',
    naranja: [
      { id: 'cardiaco', q: 'Dolor opresivo, como un peso, que se va al brazo, cuello o mandíbula', disc: 'Dolor de tipo cardiaco' },
      { id: 'disnea', q: 'Me falta el aire', disc: 'Disnea aguda' },
      { id: 'vegetativo', q: 'Sudor frío, náusea o mareo junto con el dolor', disc: 'Síntomas vegetativos asociados' }
    ],
    amarillo: [
      { id: 'antecedente', q: 'He tenido infarto, angina o coágulos', disc: 'Antecedente cardiovascular' },
      { id: 'palpit', q: 'Siento el corazón muy rápido o irregular', disc: 'Palpitaciones' },
      { id: 'pleur', q: 'Duele más al respirar profundo', disc: 'Dolor pleurítico' }
    ],
    verde: [
      { id: 'pared', q: 'Duele al presionar el pecho o al mover el brazo', disc: 'Dolor de pared torácica' }
    ],
    advice: [],
    warn: ['Dolor opresivo que se extiende', 'Falta de aire', 'Sudor frío o desmayo'],
    recheckH: 24,
    dx: [
      { code: 'I21.9', label: 'Infarto agudo de miocardio (descartar)', base: 'naranja' },
      { code: 'I20.0', label: 'Angina inestable', base: 'naranja' },
      { code: 'I26.9', label: 'Tromboembolia pulmonar (descartar)', base: 'naranja' },
      { code: 'M94.0', label: 'Costocondritis', base: 'verde' }
    ],
    consult: {
      p1: 'Me molesta el pecho del lado izquierdo cuando me muevo.',
      q2: '¿El dolor cambia al presionar con tus dedos sobre esa zona?',
      p2: 'Sí, si aprieto aquí me duele más.',
      exam: 'Por video: sin dificultad respiratoria, coloración normal. Dolor reproducible a la digitopresión de unión condrocostal izquierda.',
      dx: { code: 'M94.0', label: 'Costocondritis' },
      rx: ['paracetamol'],
      plan: 'Analgesia, calor local. Acudir a urgencias si cambia la característica del dolor.'
    }
  },
  {
    id: 'disnea', label: 'Dificultad para respirar', mts: 'Disnea en adulto',
    kw: ['respirar', 'falta de aire', 'ahog', 'asma', 'silbido', 'agitad'],
    pain: false, fever: true, minColor: 'verde',
    rojo: [
      { id: 'frase', q: 'No puedo decir una frase completa sin parar a respirar', disc: 'Respiración inadecuada' }
    ],
    naranja: [
      { id: 'sat', q: 'Mi oxímetro marca menos de 92%', disc: 'Saturación de oxígeno baja' },
      { id: 'dolorpecho', q: 'Tengo dolor en el pecho', disc: 'Dolor torácico asociado' }
    ],
    amarillo: [
      { id: 'sibil', q: 'Silbido al respirar', disc: 'Sibilancias' },
      { id: 'crisis', q: 'Tengo asma o EPOC y estoy en crisis', disc: 'Exacerbación de enfermedad respiratoria crónica' }
    ],
    verde: [
      { id: 'esfuerzo', q: 'Solo me falta el aire al hacer esfuerzo', disc: 'Disnea de esfuerzo' }
    ],
    advice: [],
    warn: ['No poder hablar de corrido', 'Labios morados', 'Dolor en el pecho'],
    recheckH: 24,
    dx: [
      { code: 'J45.9', label: 'Asma, no especificada', base: 'amarillo' },
      { code: 'J44.1', label: 'EPOC con exacerbación aguda', base: 'amarillo' },
      { code: 'J18.9', label: 'Neumonía, no especificada', base: 'amarillo' },
      { code: 'I50.9', label: 'Insuficiencia cardiaca (descartar)', base: 'naranja' }
    ],
    consult: {
      p1: 'Me cuesta más trabajo respirar cuando subo escaleras.',
      q2: '¿Puedes contarme del 1 al 20 sin tomar aire?',
      p2: 'Uno, dos, tres… hasta el quince, más o menos.',
      exam: 'Por video: frecuencia respiratoria aparente 20/min, sin uso de músculos accesorios, habla frases completas.',
      dx: { code: 'J45.9', label: 'Asma, no especificada' },
      rx: [],
      plan: 'Valoración presencial en unidad de primer nivel para espirometría y ajuste de tratamiento.'
    }
  },
  {
    id: 'abdominal', label: 'Dolor de estómago', mts: 'Dolor abdominal en adulto',
    kw: ['estomago', 'estómago', 'panza', 'abdom', 'barriga', 'agrura', 'gastritis', 'colitis', 'vientre'],
    pain: true, fever: true, painLabel: '¿Qué tanto te duele el estómago?',
    naranja: [
      { id: 'hemdig', q: 'Vómito con sangre o como café molido, o heces negras', disc: 'Hemorragia digestiva' },
      { id: 'tabla', q: 'Abdomen duro como tabla', disc: 'Datos de irritación peritoneal' },
      { id: 'sangrado-emb', q: 'Dolor con sangrado vaginal', disc: 'Sangrado en el embarazo', when: 'embarazo' }
    ],
    amarillo: [
      { id: 'migratorio', q: 'El dolor empezó en el ombligo y bajó a la derecha', disc: 'Dolor migratorio a fosa iliaca derecha' },
      { id: 'vomito', q: 'Vómito que no se detiene', disc: 'Vómito persistente' }
    ],
    verde: [
      { id: 'agruras', q: 'Ardor o agruras después de comer', disc: 'Dispepsia' },
      { id: 'estrenim', q: 'Llevo varios días sin evacuar', disc: 'Estreñimiento' }
    ],
    advice: [
      { t: 'Dieta suave', d: 'Come porciones pequeñas: arroz, plátano, pan tostado, caldos. Evita grasa, picante y café.' },
      { t: 'Hidrátate', d: 'Toma agua en sorbos frecuentes durante el día.' },
      { t: 'Fibra y movimiento', d: 'Si hay estreñimiento: frutas, verduras, agua y caminar 20 minutos.' },
      { t: 'Observa', d: 'Anota si el dolor cambia de lugar o aumenta; te lo preguntaré.' }
    ],
    warn: ['Dolor que se vuelve intenso o se va abajo a la derecha', 'Vómito con sangre o heces negras', 'Abdomen duro', 'Fiebre'],
    recheckH: 24,
    dx: [
      { code: 'K29.7', label: 'Gastritis, no especificada', base: 'azul' },
      { code: 'K59.0', label: 'Estreñimiento', base: 'azul' },
      { code: 'R10.4', label: 'Otros dolores abdominales y los no especificados', base: 'verde' },
      { code: 'K35.8', label: 'Apendicitis aguda (descartar)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Me arde la boca del estómago, sobre todo después de comer.',
      q2: '¿El dolor se ha movido hacia abajo o a la derecha?',
      p2: 'No, siempre está arriba, como ardor.',
      exam: 'Por video: hidratado, sin facies de dolor. Autoexploración guiada: dolor leve en epigastrio, sin rebote referido.',
      dx: { code: 'K29.7', label: 'Gastritis, no especificada' },
      rx: ['omeprazol'],
      plan: 'Inhibidor de bomba 14 días, dieta, evitar AINE. Revalorar si persiste.'
    }
  },
  {
    id: 'diarrea', label: 'Diarrea o vómito', mts: 'Diarrea y vómitos',
    kw: ['diarrea', 'vomit', 'vómit', 'nausea', 'náusea', 'suelto', 'deposicion', 'evacua'],
    pain: true, fever: true, painLabel: '¿Qué tanto cólico o malestar tienes?',
    naranja: [
      { id: 'deshidgrave', q: 'No he orinado en más de 8 horas y me mareo al pararme', disc: 'Deshidratación grave' },
      { id: 'hematemesis', q: 'Vómito con sangre', disc: 'Hematemesis' }
    ],
    amarillo: [
      { id: 'disenteria', q: 'Sangre en las heces', disc: 'Diarrea con sangre' },
      { id: 'intoler', q: 'No tolero ni sorbos de agua', disc: 'Intolerancia a la vía oral' }
    ],
    verde: [
      { id: 'frecuente', q: 'Más de 6 evacuaciones al día', disc: 'Diarrea frecuente' }
    ],
    advice: [
      { t: 'Suero oral', d: 'Toma Vida Suero Oral en sorbos pequeños y frecuentes, sobre todo después de cada evacuación.' },
      { t: 'Come ligero', d: 'Arroz, plátano, manzana, pan tostado y caldos. Evita lácteos, grasa e irritantes.' },
      { t: 'Higiene', d: 'Lávate las manos después de ir al baño y antes de comer o preparar alimentos.' },
      { t: 'Vigila tu orina', d: 'Si orinas poco y oscuro, avísame de inmediato.' }
    ],
    warn: ['No orinar en 8 horas', 'Sangre en heces o vómito', 'Mareo al ponerte de pie', 'Fiebre alta'],
    recheckH: 24,
    dx: [
      { code: 'A08.4', label: 'Infección intestinal viral, sin otra especificación', base: 'azul' },
      { code: 'A09', label: 'Diarrea y gastroenteritis de presunto origen infeccioso', base: 'verde' },
      { code: 'E86', label: 'Depleción de volumen (deshidratación)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Desde ayer tengo diarrea, unas cinco veces, y algo de náusea.',
      q2: '¿Estás orinando de forma normal? ¿De qué color?',
      p2: 'Sí, aunque un poco menos que siempre, amarillo.',
      exam: 'Por video: mucosas aparentemente húmedas, alerta, sin datos de deshidratación grave.',
      dx: { code: 'A09', label: 'Gastroenteritis de presunto origen infeccioso' },
      rx: ['vso'],
      plan: 'Plan A de hidratación oral, dieta astringente, vigilar signos de deshidratación.'
    }
  },
  {
    id: 'espalda', label: 'Dolor de espalda', mts: 'Dolor de espalda',
    kw: ['espalda', 'lumbar', 'cintura', 'ciatic', 'ciátic', 'columna'],
    pain: true, fever: true, painLabel: '¿Qué tanto te duele la espalda?',
    naranja: [
      { id: 'caudaeq', q: 'Pérdida de fuerza en piernas o no controlo la orina', disc: 'Déficit neurológico (posible síndrome de cauda equina)' },
      { id: 'obst', q: 'Contracciones, sangrado vaginal o salida de líquido', disc: 'Datos de alarma obstétrica (posible amenaza de parto pretérmino)', when: 'embarazo' }
    ],
    amarillo: [
      { id: 'caida', q: 'El dolor empezó tras una caída o golpe fuerte', disc: 'Mecanismo de lesión significativo' },
      { id: 'fiebre-esp', q: 'Tengo fiebre y ardor al orinar', disc: 'Dolor lumbar con datos urinarios / fiebre' }
    ],
    verde: [
      { id: 'radicular', q: 'El dolor baja por la pierna', disc: 'Dolor radicular' }
    ],
    advice: [
      { t: 'Calor local', d: 'Aplica calor 20 minutos, 3 veces al día.' },
      { t: 'Mantente activo', d: 'Camina suave; el reposo total retrasa la recuperación.' },
      { t: 'Estiramientos', d: 'Ejercicio "gato-camello" y rodillas al pecho, 10 repeticiones, sin dolor.' },
      { t: 'Postura', d: 'Evita cargar peso y flexiona las rodillas al levantar objetos.' }
    ],
    warn: ['Pérdida de fuerza en piernas', 'No controlar orina o heces', 'Fiebre con dolor de espalda'],
    recheckH: 72,
    dx: [
      { code: 'M54.5', label: 'Lumbago no especificado', base: 'azul' },
      { code: 'M54.4', label: 'Lumbago con ciática', base: 'verde' },
      { code: 'N10', label: 'Pielonefritis aguda (si hay fiebre)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Me duele la parte baja de la espalda desde que cargué unas cajas.',
      q2: '¿Has sentido debilidad en las piernas o problemas para orinar?',
      p2: 'No, solo el dolor, sobre todo al agacharme.',
      exam: 'Por video: marcha conservada, flexión limitada por dolor, sin déficit referido.',
      dx: { code: 'M54.5', label: 'Lumbago no especificado' },
      rx: ['paracetamol'],
      plan: 'Analgesia, calor local, ejercicios guiados por la app. Revalorar en 72 h.'
    }
  },
  {
    id: 'piel', label: 'Ronchas, erupción o alergia', mts: 'Alergia / Erupciones cutáneas',
    kw: ['roncha', 'alergi', 'comezon', 'comezón', 'salpull', 'erupci', 'granit', 'urticar', 'sarpullido', 'piel'],
    pain: false, fever: true,
    rojo: [
      { id: 'anafilaxia', q: 'Se me hinchan la lengua, los labios o la garganta', disc: 'Compromiso de vía aérea (anafilaxia)' }
    ],
    naranja: [
      { id: 'sistemica', q: 'Ronchas en todo el cuerpo con mareo o desmayo', disc: 'Reacción alérgica sistémica' },
      { id: 'purpura', q: 'Manchas moradas que no se borran al presionarlas', disc: 'Exantema purpúrico' }
    ],
    amarillo: [
      { id: 'ampollas', q: 'Ampollas grandes o la piel se desprende', disc: 'Lesiones ampollosas extensas' }
    ],
    verde: [
      { id: 'prurito', q: 'La comezón no me deja dormir', disc: 'Prurito intenso' }
    ],
    advice: [
      { t: 'Compresas frías', d: 'Aplica compresas frías 10 minutos para calmar la comezón.' },
      { t: 'No rasques', d: 'Mantén las uñas cortas; rascar puede infectar la piel.' },
      { t: 'Ropa de algodón', d: 'Usa ropa holgada y baño con agua tibia, no caliente.' },
      { t: 'Detecta el detonante', d: 'Anota qué comiste, usaste o tocaste en las últimas 24 horas.' }
    ],
    warn: ['Hinchazón de labios, lengua o garganta', 'Dificultad para respirar', 'Mareo o desmayo', 'Ampollas o piel que se desprende'],
    recheckH: 24,
    dx: [
      { code: 'L50.9', label: 'Urticaria, no especificada', base: 'azul' },
      { code: 'L23.9', label: 'Dermatitis alérgica de contacto', base: 'verde' },
      { code: 'T78.4', label: 'Alergia no especificada', base: 'verde' },
      { code: 'T78.2', label: 'Choque anafiláctico (descartar)', base: 'rojo' }
    ],
    consult: {
      p1: 'Me salieron ronchas en los brazos después de comer mariscos.',
      q2: '¿Sientes hinchazón en labios o dificultad para respirar?',
      p2: 'No, solo mucha comezón.',
      exam: 'Por video: habones eritematosos en extremidades superiores, sin edema de labios ni lengua. Voz normal.',
      dx: { code: 'L50.9', label: 'Urticaria aguda' },
      rx: ['loratadina'],
      plan: 'Antihistamínico 7 días, evitar desencadenante. Acudir a urgencias si hay datos de anafilaxia.'
    }
  },
  {
    id: 'picadura', label: 'Picadura o mordedura', mts: 'Mordeduras y picaduras',
    kw: ['picadura', 'piquete', 'mordedura', 'mordio', 'mordió', 'mosquito', 'alacran', 'alacrán', 'abeja', 'avispa', 'arana', 'araña', 'perro', 'dengue', 'zancudo'],
    pain: true, fever: true, painLabel: '¿Qué tanto te duele la zona?',
    rojo: [
      { id: 'anafilaxia', q: 'Se me hinchan la lengua, los labios o la garganta', disc: 'Compromiso de vía aérea (anafilaxia)' }
    ],
    naranja: [
      { id: 'venenoso', q: 'Fue víbora, alacrán (con síntomas) o araña viuda negra', disc: 'Envenenamiento' }
    ],
    amarillo: [
      { id: 'dengue', q: 'Fiebre con dolor detrás de los ojos, músculos y articulaciones', disc: 'Signos sugestivos de dengue' },
      { id: 'mamifero', q: 'Me mordió un perro u otro animal', disc: 'Mordedura de mamífero (riesgo de rabia)' }
    ],
    verde: [
      { id: 'celulitis', q: 'El enrojecimiento crece alrededor de la picadura', disc: 'Celulitis local' }
    ],
    advice: [
      { t: 'Lava la zona', d: 'Lava con agua y jabón durante 5 minutos.' },
      { t: 'Frío y elevación', d: 'Aplica compresas frías y eleva la zona para bajar la hinchazón.' },
      { t: 'Repelente', d: 'Usa repelente y ropa de manga larga, sobre todo al atardecer.' },
      { t: 'Elimina criaderos', d: 'Voltea cubetas, tapa tinacos y tira agua estancada para prevenir dengue.' }
    ],
    warn: ['Hinchazón de cara o garganta', 'Fiebre alta con dolor de cuerpo', 'Sangrado de encías o nariz', 'Enrojecimiento que crece'],
    recheckH: 48,
    dx: [
      { code: 'T63.4', label: 'Efecto tóxico de veneno de artrópodos', base: 'azul' },
      { code: 'A90', label: 'Fiebre del dengue (descartar)', base: 'amarillo' },
      { code: 'L03.9', label: 'Celulitis, no especificada', base: 'verde' }
    ],
    consult: {
      p1: 'Me picaron varios mosquitos y ahora tengo fiebre y me duelen los huesos.',
      q2: '¿Has notado sangrado de encías, nariz o manchas en la piel?',
      p2: 'No, pero me duele detrás de los ojos.',
      exam: 'Por video: decaído, piel sin petequias visibles, sin sangrados referidos.',
      dx: { code: 'A90', label: 'Fiebre del dengue (probable, sin signos de alarma)' },
      rx: ['paracetamol', 'vso'],
      plan: 'Evitar AINE. Hidratación, prueba NS1 en unidad, vigilar signos de alarma de dengue.'
    }
  },
  {
    id: 'calor', label: 'Golpe de calor', mts: 'Exposición al calor (adaptación)',
    kw: ['calor', 'insolaci', 'sol ', 'golpe de calor', 'deshidrat', 'sofoc'],
    pain: false, fever: true,
    naranja: [
      { id: 'confusion', q: 'Piel caliente y seca con confusión', disc: 'Alteración de conciencia por calor' }
    ],
    amarillo: [
      { id: 'intolerancia', q: 'Vómito, no tolero líquidos', disc: 'Intolerancia a la vía oral' }
    ],
    verde: [
      { id: 'calambres', q: 'Calambres musculares', disc: 'Calambres por calor' }
    ],
    advice: [
      { t: 'Busca sombra', d: 'Ve a un lugar fresco y ventilado; afloja tu ropa.' },
      { t: 'Enfría tu cuerpo', d: 'Coloca paños húmedos en cuello, axilas e ingles.' },
      { t: 'Hidrátate', d: 'Toma agua o suero oral en sorbos pequeños y frecuentes.' },
      { t: 'Evita el sol', d: 'No te expongas entre 11:00 y 16:00 h los próximos días.' }
    ],
    warn: ['Confusión o desmayo', 'Piel caliente y seca sin sudor', 'Vómito persistente'],
    recheckH: 24,
    dx: [
      { code: 'T67.5', label: 'Agotamiento por calor', base: 'azul' },
      { code: 'T67.0', label: 'Golpe de calor e insolación', base: 'naranja' }
    ],
    consult: {
      p1: 'Estuve trabajando al sol y me sentí mareado.',
      q2: '¿Estás en un lugar fresco ahora? ¿Has tomado líquidos?',
      p2: 'Sí, ya estoy adentro y tomando agua.',
      exam: 'Por video: alerta, orientado, piel con sudoración, sin confusión.',
      dx: { code: 'T67.5', label: 'Agotamiento por calor' },
      rx: ['vso'],
      plan: 'Medidas físicas, rehidratación oral, reposo.'
    }
  },
  {
    id: 'menstrual', label: 'Dolor menstrual', mts: 'Problemas ginecológicos (adaptación)', sexo: 'M',
    kw: ['menstrua', 'regla', 'colico', 'cólico', 'periodo', 'período'],
    pain: true, fever: true, painLabel: '¿Qué tanto dolor tienes?',
    naranja: [
      { id: 'hemorragia', q: 'Sangrado muy abundante (empapo una toalla por hora) con mareo', disc: 'Hemorragia mayor' },
      { id: 'ectopico', q: 'Podría estar embarazada y tengo dolor fuerte de un lado', disc: 'Posible embarazo ectópico' }
    ],
    amarillo: [
      { id: 'epi', q: 'Fiebre con dolor pélvico y flujo con mal olor', disc: 'Datos de infección pélvica' }
    ],
    verde: [
      { id: 'nomejora', q: 'El dolor no mejora con lo que suelo hacer', disc: 'Dismenorrea refractaria a medidas habituales' }
    ],
    advice: [
      { t: 'Calor local', d: 'Coloca una bolsa de agua tibia en el bajo vientre.' },
      { t: 'Movimiento suave', d: 'Caminar o estiramientos suaves alivian el cólico.' },
      { t: 'Hidrátate', d: 'Toma agua y reduce sal y cafeína estos días.' },
      { t: 'Registra tu ciclo', d: 'Anota fechas, intensidad y duración; será útil para tu médico.' }
    ],
    warn: ['Sangrado que empapa una toalla por hora', 'Dolor intenso de un solo lado', 'Fiebre o flujo con mal olor'],
    recheckH: 48,
    dx: [
      { code: 'N94.6', label: 'Dismenorrea, no especificada', base: 'azul' },
      { code: 'N92.0', label: 'Menstruación excesiva y frecuente', base: 'amarillo' },
      { code: 'O00.9', label: 'Embarazo ectópico (descartar)', base: 'naranja' }
    ],
    consult: {
      p1: 'Tengo cólicos muy fuertes desde ayer, como cada mes.',
      q2: '¿Existe posibilidad de embarazo? ¿El sangrado es como siempre?',
      p2: 'No, y el sangrado es normal.',
      exam: 'Por video: tranquila, sin palidez aparente.',
      dx: { code: 'N94.6', label: 'Dismenorrea primaria' },
      rx: ['naproxeno'],
      plan: 'AINE con alimentos, calor local, registro de ciclo.'
    }
  },
  {
    id: 'herida', label: 'Herida o golpe', mts: 'Heridas / Lesiones de extremidades',
    kw: ['herida', 'cortad', 'corte', 'golpe', 'caida', 'caída', 'me cai', 'me caí', 'raspon', 'raspón', 'esguince', 'torc'],
    pain: true, fever: false, painLabel: '¿Qué tanto te duele?',
    naranja: [
      { id: 'deformidad', q: 'Hueso expuesto o deformidad evidente', disc: 'Deformidad grosera / fractura expuesta' },
      { id: 'tce', q: 'Me golpeé la cabeza y perdí el conocimiento', disc: 'Trauma craneal con pérdida de conciencia' }
    ],
    amarillo: [
      { id: 'profunda', q: 'Herida profunda o abierta (probablemente necesita puntos)', disc: 'Herida que requiere sutura' },
      { id: 'funcion', q: 'No puedo mover o apoyar la zona', disc: 'Pérdida de función' }
    ],
    verde: [
      { id: 'tetanos', q: 'Herida sucia y no tengo vacuna de tétanos vigente', disc: 'Riesgo de tétanos' }
    ],
    advice: [
      { t: 'Lava la herida', d: 'Lava con agua y jabón durante 5 minutos; retira la tierra con cuidado.' },
      { t: 'Presiona', d: 'Si sangra, presiona con una gasa o tela limpia por 10 minutos.' },
      { t: 'Cubre', d: 'Cubre con gasa limpia y cámbiala diario o si se moja.' },
      { t: 'Hielo y elevación', d: 'Para golpes: hielo envuelto 15 minutos y eleva la zona.' }
    ],
    warn: ['Sangrado que no se detiene', 'Enrojecimiento, calor o pus', 'No poder mover la zona', 'Fiebre'],
    recheckH: 48,
    dx: [
      { code: 'T14.1', label: 'Herida de región no especificada del cuerpo', base: 'azul' },
      { code: 'S93.4', label: 'Esguince de tobillo', base: 'verde' },
      { code: 'T14.2', label: 'Fractura de región no especificada (descartar)', base: 'amarillo' }
    ],
    consult: {
      p1: 'Me corté la mano con un vidrio, ya no sangra.',
      q2: '¿Puedes mostrarme la herida y mover todos los dedos?',
      p2: 'Sí, los muevo todos. Es como de un centímetro.',
      exam: 'Por video: herida lineal de ~1 cm en palma, bordes afrontados, sin sangrado activo, movilidad y sensibilidad referidas íntegras.',
      dx: { code: 'T14.1', label: 'Herida superficial de mano' },
      rx: ['paracetamol'],
      plan: 'Curación, cierre con cintas adhesivas en unidad, verificar esquema de tétanos.'
    }
  }
];

/* Duraciones posibles (discriminador de evolución). */
TS.DURATIONS = [
  { id: 'hoy', label: 'Empezó hoy', text: 'menos de 24 horas', days: 0 },
  { id: '1-3', label: '1 a 3 días', text: '1 a 3 días', days: 2 },
  { id: '4-7', label: '4 a 7 días', text: '4 a 7 días', days: 5 },
  { id: '7+', label: 'Más de una semana', text: 'más de una semana', days: 10 }
];

/* --------------------------------------------------------------------------
   Pacientes en la bandeja (simulados) para dar contexto a la consola médica.
   -------------------------------------------------------------------------- */
TS.QUEUE_SEED = [
  { id: 'q1', nombre: 'Rosa María Gutiérrez', edad: 72, sexo: 'M', inst: 'IMSS-Bienestar', color: 'amarillo', flow: 'disnea',
    motivo: 'Disnea de esfuerzo progresiva desde ayer, sibilancias, EPOC conocido. Sat referida 93%.', disc: 'Sibilancias', waitMin: 22, estado: 'En espera', folio: 'CAD-2026-8812' },
  { id: 'q2', nombre: 'Luis Fernando Castro', edad: 34, sexo: 'H', inst: 'IMSS', color: 'amarillo', flow: 'abdominal',
    motivo: 'Dolor abdominal migratorio a fosa iliaca derecha, 6/10, 14 h de evolución, náusea.', disc: 'Dolor migratorio a FID', waitMin: 38, estado: 'En espera', folio: 'CAD-2026-8807' },
  { id: 'q3', nombre: 'Carlos Méndez Ruiz', edad: 23, sexo: 'H', inst: 'IMSS-Bienestar', color: 'amarillo', flow: 'picadura',
    motivo: 'Fiebre 38.8 °C, dolor retroocular y artralgias tras picaduras de mosquito. Zona con casos de dengue.', disc: 'Signos sugestivos de dengue', waitMin: 9, estado: 'En espera', folio: 'CAD-2026-8819' },
  { id: 'q4', nombre: 'Guadalupe Ortiz Peña', edad: 51, sexo: 'M', inst: 'IMSS', color: 'verde', flow: 'espalda',
    motivo: 'Lumbalgia con irradiación a pierna izquierda, 4 días, sin déficit neurológico referido.', disc: 'Dolor radicular', waitMin: 47, estado: 'En espera', folio: 'CAD-2026-8798' },
  { id: 'q5', nombre: 'Miguel Ángel Rojas', edad: 58, sexo: 'H', inst: 'Pemex', color: 'verde', flow: 'abdominal',
    motivo: 'Pirosis posprandial de 2 semanas, sin datos de sangrado. Toma naproxeno por artrosis.', disc: 'Dispepsia', waitMin: 64, estado: 'En espera', folio: 'CAD-2026-8790' }
];
