# Tu Salud · Prototipo interactivo

Mockup navegable de la app **Tu Salud** para la propuesta de la plataforma de IA del Sistema Universal de Salud. Cubre las tres vistas acordadas:

- **Paciente**: Asistente Médico Virtual con triaje Manchester, las 4 rutas de atención, receta, surtido y seguimiento.
- **Médico**: bandeja priorizada, resumen del copiloto clínico, videoconsulta y receta con validación de alergias.
- **Copiloto administrativo**: nota SOAP, seguimiento entre consultas, citas y referencias.

> Todos los datos son simulados. No es un servicio oficial ni ofrece atención médica real.

## Cómo abrirlo

**Opción 1, sin instalar nada:** abre `index.html` con doble clic en Chrome o Edge.

**Opción 2, servidor local** (recomendado para presentar):

```bash
cd tu-salud-mockup
python -m http.server 8080
# abrir http://localhost:8080
```

No hay dependencias ni compilación: es HTML, CSS y JavaScript. La tipografía Noto Sans se carga de Google Fonts. Si no hay internet, se usa la fuente del sistema.

## Cómo presentarlo

| Vista (barra superior) | Para qué sirve |
|---|---|
| **Inicio** | Contexto de la propuesta, tabla Manchester → rutas, arquitectura, despliegue 2027–2029 y los 4 escenarios |
| **Paciente + Médico** | Vista principal: el teléfono y la consola médica lado a lado y sincronizados |
| **App del paciente** | Teléfono al centro con narración para el presentador. El médico se simula solo |
| **Consola médica** | Consola a pantalla completa |
| **Operación** | Panel de la Red Nacional (KPI, prioridades, esperas). Datos simulados |

**Escenarios guiados** (desde Inicio):

1. **Gripa estacional → Azul.** Autocuidado sin médico. Con **+48 h** el paciente reporta que empeoró, se escala a teleconsulta y el médico lo refiere a su UMF.
2. **Lumbalgia en embarazo → Verde** (embarazada de 24 semanas, grupo 2027). El asistente revisa también datos de alarma obstétrica; como no hay, la ruta es una **cita presencial en su clínica** (ruta 4, primer nivel), elegida por derechohabiencia y cercanía.
3. **Dolor de garganta con fiebre → Amarillo** (adulta mayor, grupo 2027). Sala de espera y teleconsulta. El copiloto bloquea la amoxicilina por alergia a penicilina. Después vienen la receta firmada y el surtido con mapa.
4. **Dolor en el pecho → Naranja.** Urgencias, con prealerta visible en la consola médica.

- **Siguiente paso** (o la tecla **→**) contesta el paso actual con el guion y avanza el recorrido. También se puede contestar a mano; las opciones del guion se ven marcadas como “guion”.
- **+48 h** simula el paso del tiempo para disparar los seguimientos del copiloto administrativo.
- **Reiniciar** limpia la demo.

## Dictado por voz (paciente → médico)

- En el chat de triaje, el paciente puede **escribir o tocar el micrófono y hablar**. La transcripción en español (es-MX) aparece en vivo y se envía como mensaje marcado “Mensaje de voz · transcrito”.
- En la **sala de espera** puede grabar una **nota de voz para la médica**. En la bandeja aparece “Nueva nota de voz” y en el caso se ve el relato transcrito.
- En la **videoconsulta**, el micrófono transcribe lo que dice el paciente y la médica lo ve **en vivo** en su panel de transcripción. Cada frase se agrega a la nota SOAP (Subjetivo).
- Usa el reconocimiento de voz del navegador: **Chrome o Edge, con internet y permiso de micrófono**. Abierto con doble clic (`file://`), Chrome puede pedir el permiso cada vez; con `python -m http.server` lo pide una sola vez.
- Si no hay permiso, servicio de voz o navegador compatible, entra un **dictado simulado** para que la demo no se detenga.

## Triaje Manchester (cómo está implementado)

- `js/manchester.js` contiene el motor. Evalúa de mayor a menor prioridad y **el primer discriminador positivo define el color**, como en los diagramas MTS. Si ya hay un discriminador de igual o mayor prioridad, no se pregunta ese nivel.
- Orden de la entrevista:
  1. Riesgo vital (rojo).
  2. Motivo de consulta, en texto libre o con botones.
  3. Evolución.
  4. Discriminadores del diagrama (naranja → amarillo → verde).
  5. Discriminadores generales: dolor 0–10 y temperatura.
- `js/data.js` define los 13 motivos de consulta (`TS.FLOWS`), con discriminadores por nivel, recomendaciones de autocuidado, signos de alarma, hipótesis CIE-10 y guion de consulta.

| Color | Tiempo | Disposición remota | Ruta en Tu Salud |
|---|---|---|---|
| Rojo | 0 min | Ahora | Urgencias · 911 |
| Naranja | 10 min | Ahora | Urgencias hospitalarias (u hablar ya con un médico) |
| Amarillo | 60 min | Pronto | Teleconsulta inmediata |
| Verde | 120 min | Después | Teleconsulta o cita en primer nivel |
| Azul | 240 min | Consejo | Autocuidado guiado + seguimiento |

**Adaptaciones para triaje remoto que conviene validar con el equipo clínico:**

- Si no hay ningún discriminador positivo, el resultado es autocuidado (azul).
- Los síntomas de más de 7 días suben a verde.
- *Dolor torácico* y *Dificultad para respirar* nunca terminan en autocuidado.

⚠️ El uso productivo del Sistema de Triaje Manchester requiere **licencia del Manchester Triage Group**. Su versión para atención a distancia es *Telephone Triage and Advice*. También requiere validación clínica local. Los textos de los discriminadores de este prototipo son ilustrativos.

## Identidad gráfica

- Paleta de la *Guía de Identidad Gráfica del Gobierno de México 2024-2030*:
  - guinda `#9b2247` / `#611232`
  - dorado `#a57f2c` / `#e6d194`
  - verde `#1e5b4f` / `#002f2a`
- Tipografía **Noto Sans**.
- **Logotipos:** la guía prohíbe crear imagotipos nuevos; los archivos los entrega la Dirección de Imagen. Coloca los oficiales en `assets/logos/` con estos nombres y la app los usa automáticamente:
  - `gobierno-salud-light.png`, para fondos claros (pantalla de acceso).
  - `gobierno-salud-dark.png`, para fondos oscuros (barra lateral de la consola médica).
- Mientras no existan, se muestra un texto neutro.

## Publicarlo con una liga

Es un sitio estático: basta con subir la carpeta tal cual.

- **GitHub Pages:** sube el repo y activa *Settings → Pages → Deploy from branch*. En cuentas gratuitas el repositorio debe ser público.
- **Netlify / Cloudflare Pages:** arrastra la carpeta. Permiten proteger el acceso con contraseña en algunos planes.
- La página incluye `noindex` para que no aparezca en buscadores. Como lleva identidad del gobierno, conviene compartir la liga solo con el cliente.

## Estructura

```text
index.html          Shell y carga de scripts (sin módulos, funciona con doble clic)
css/app.css         Estilos (tokens de la paleta institucional y colores Manchester)
js/data.js          Personas, unidades, medicamentos, diagramas de triaje, bandeja simulada
js/manchester.js    Motor de triaje + copiloto clínico (resumen, hipótesis, validación de receta, FHIR)
js/store.js         Estado, acciones y simulación (transcripción, SOAP, seguimientos)
js/ui.js            Íconos, formatos, QR de demostración y mapa
js/voice.js         Dictado por voz en español (Web Speech API) con respaldo simulado
js/patient.js       App del paciente y conversación de triaje
js/doctor.js        Consola médica, copiloto clínico y administrativo
js/ops.js           Inicio, escenarios y panel de operación
js/main.js          Navegación, controles del presentador, reloj y avisos
assets/logos/       Espacio para el imagotipo oficial
```

## Siguientes pasos sugeridos

- Conectar el Asistente Médico Virtual a un agente real de Claude mediante un backend ligero. La lógica Manchester serviría como guía y validación de la salida del modelo.
- Sustituir la simulación de expediente, telemedicina y receta por las APIs de TCA Assist (HL7 FHIR). `Descargar FHIR` en la consola ya muestra el *bundle* esperado.
- Validar los diagramas y textos con el equipo clínico y la licencia MTS.
