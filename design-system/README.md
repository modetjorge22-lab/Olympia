# Olympia · Sistema de diseño v1.6

> Constancia que se ve. Competición que se siente.

Olympia mide el tiempo que dedicas a moverte y lo convierte en algo que compartes. Su diseño es un lienzo tranquilo, con cifras exactas y movimiento que tiene peso físico.

| Archivo | Para qué |
|---|---|
| `index.html` | Guía viva: ábrela en el navegador (tiene conmutador Vino/Marfil y una hoja arrastrable) |
| `olympia-tokens.css` | Variables CSS listas para importar en cualquier proyecto web |
| `olympia-tokens.json` | Los mismos tokens para Figma, nativo, emails o scripts |
| `auditoria-2026-11.md` | Auditoría de la app contra el sistema: qué falta por armonizar, por prioridad |
| `auditoria-ux-2026-11.md` | Auditoría de experiencia (flujos, errores, movimiento): qué se ha corregido y qué queda, por prioridad |

La fuente de verdad es la app:
- `src/index.css` contiene todos los tokens de este documento.
- `src/components/ui/` tiene las piezas del sistema: `Sheet`, `SheetTitle`, `Button`, `IconButton`, `SectionTitle`, `Eyebrow`, `Chip`, `Segmented`, `StatusLine` y el aviso (`ToastProvider` / `useToast`).
- También cuentan `src/components/ActivityFilterButton.jsx`, `src/components/sheetDrag.js`, `src/lib/theme.js` y `src/utils/activityIcons.js`.

Lo nuevo se construye con esas piezas. Si cambias algo allí, actualiza también estos tokens.

---

## 1. Principios

1. **Un solo lienzo.** El fondo vino (o marfil) es continuo. Las secciones se separan con hairlines (`ink .12`) y aire, no con cajas de color.
2. **El beige es acento, no superficie.** Se usa en las cifras protagonistas, el botón primario y la familia fuerza. Nunca va como fondo de tarjeta.
3. **Sin negritas.** Todo es peso 400 (300 solo en titulares display). La jerarquía sale del tamaño, el tracking y la opacidad de la tinta.
4. **Las cifras van en mono.** Usa JetBrains Mono tabular para horas, fechas y marcas.
5. **El color significa algo.** Solo hay cinco familias de actividad y un rojo, que marca hoy. Excepciones: el resplandor esmeralda (`--diet-glow`) del día de alimentación cumplido, siempre fuera del borde y nunca como relleno, y la línea menta de **Descanso** (`--sleep-line`).
6. **Hecho vs. planificado.** Lo hecho es sólido, con halo; lo planificado es un marco discontinuo.
7. **El vidrio en todo lo que flota, y solo ahí.**
   - Header, nav, hojas, menús y controles superpuestos son vidrio. Cuanto más grande es la superficie, más grueso es el material (más desenfoque y más sombra).
   - El contenido que vive en el lienzo nunca va en vidrio.
   - Nunca se apila un vidrio claro sobre otro.
8. **Movimiento con física.** Usa muelles, inercia proyectada y gestos interrumpibles, y respeta la preferencia de reducir movimiento.
9. **Nada pasa en silencio y casi todo se puede deshacer.** Toda escritura (guardar, eliminar, planificar) termina en un aviso o en un error visible junto a lo que lo causa. Lo reversible no se pregunta: se hace y se ofrece deshacer.

## 2. Color

Toda la UI se escribe como `rgba(var(--ink), α)`, así el mismo código sirve para los dos temas.

| Token | Vino (dark) | Marfil (light) |
|---|---|---|
| `--bg` | `#2a121a` | `#fffdf5` |
| `--ink` | `245,237,224` | `42,18,26` |
| `--surface` (superficie sólida) | `#3a1c28` | `#ffffff` |
| `--sheet-bg` (vidrio de hoja y menú) | `rgba(58,28,40,.74)` | `rgba(255,255,255,.78)` |
| `--accent` | `#f0e4d0` | `#4a1626` |
| `--accent-over` | `#ffffff` | `#96203f` |
| `--on-accent` | `#2a121a` | `#f5ede0` |
| `--today` | `#e5484d` | `#e5484d` |

**Escala de tinta:**

| Opacidad | Uso |
|---|---|
| `.95` | Primaria |
| `.90` | Cuerpo |
| `.60` | Secundaria |
| `.45` | Metadatos y ejes |
| `.12` | Divisor |
| `.06` | Hairline |
| `.05` | Relleno |

### Familias de actividad

| Familia | Vino | Marfil | Incluye |
|---|---|---|---|
| Fuerza | `240,228,208` | `74,22,38` | pesas, calistenia, crossfit |
| Cardio | `242,206,92` | `226,178,32` | carrera, bici, natación |
| Deporte | `126,204,148` | `72,160,100` | pádel, fútbol, tenis |
| Movilidad | `140,190,240` | `92,156,220` | yoga, pilates |
| Otro | `170,160,155` | `120,110,105` | resto |

**Opacidades por uso:**

| Opacidad | Uso |
|---|---|
| `.42 → .06` | Halo |
| `.85` | Anillo |
| `.16` | Fondo de icono |
| `.38–.55` | Marco planificado |

**Mezcla:** cuando un elemento resume varias actividades (líneas de carrera, avatares), su color es la media de las familias ponderada por minutos (`utils/blendColors.js`).

## 3. Tipografía

| Rol | Fuente | Tamaño | Notas |
|---|---|---|---|
| Display | Mono | 22 | color `--accent` |
| Métrica | Mono | 17 | |
| Título | DM Sans | 15 | tracking `-0.01em` (`--tracking-title`) |
| Sección | DM Sans | 13 | tracking `.14em`, sin mayúsculas forzadas |
| Cuerpo | DM Sans | 12 | |
| Meta | Mono | 11 | tinta .45 |
| Caption | DM Sans | 10 | |
| Micro (L M X…) | Mono | 8.5 | `accent .55` |
| Logotipo | DM Sans | 13 | MAYÚSCULAS, tracking `.3em` + símbolo ∞ |

El símbolo ∞ tiene un bucle izquierdo fino (1.5, opacidad .55), que es la base, y uno derecho grueso (3.5), que es el empuje.

**Tracking según el tamaño:** el texto grande se cierra un poco (`-0.01em` en títulos) y el pequeño se abre (`.06em` en captions, `.14em` en secciones). No se usa un mismo valor para todos los tamaños. DM Sans se carga con eje óptico (`font-optical-sizing: auto`).

**Única excepción al peso 400:** las etiquetas pequeñas sobre vidrio (nav) pueden ir a 500. Sobre un fondo que cambia, un poco más de peso mantiene la legibilidad (vibrancia).

## 4. Materiales y forma

- **Vidrio:**
  - Fondo `--glass-bg` con `blur(24px) saturate(160%)`.
  - Borde `--glass-border` y sombra `--glass-shadow`.
  - Header de 52 px y nav de 60 px, con radio de h/2, flotando a 8–12 px del borde.
- **Hoja (sheet), pieza `Sheet`:** es una ventana flotante de cristal.
  - **Material:** fondo `--sheet-bg` con `--sheet-filter` (`blur(40px) saturate(180%)`). Lleva borde `--sheet-edge`, con canto superior iluminado, y sombra `--sheet-shadow`.
  - **Forma:** flota a `--sheet-inset` (8 px) de los lados y del borde inferior, igual que el header y la nav, con radio de 28 en las cuatro esquinas.
  - **Asa:** 36×4 a tinta .18. La cabecera es la zona de arrastre.
  - **Scrim:** `--scrim`, sin desenfoque. Atenúa el fondo para dar foco.
  - **Recorrido:** sube desde abajo y sale por el mismo camino.
  - **Menús desplegables:** usan el mismo material, con radio de 16.
- **Radios:** 16 en tiles de métrica, 24 en tarjetas, 28 en hojas y píldora (∞) en chips y botones.
- **Espaciado:** base 4 (4 · 8 · 12 · 16 · 20 · 24 · 32). Los márgenes laterales de página son de 16–20.

## 5. El día (DayCell)

Es la unidad básica de Olympia y siempre es un círculo. El número va en mono 7 px arriba y los iconos de 10 px debajo.

| Estado | Tratamiento |
|---|---|
| Hecho | halo radial de la familia + anillo interior `.85` |
| Planificado | `DashedFrame` (esquinas abiertas, inset 22 %) en el color de la familia |
| Dos sesiones | dos halos (izquierda y derecha) + hairline central, un icono por mitad |
| Hoy (semana) | línea roja de 1.25×13 px bajo la letra del día; el número va en tinta normal |
| Hoy (mes) | solo el número en rojo |
| PR | trofeo en acento |

## 6. Componentes

- **Botón primario:**
  - Píldora llena de `--accent` con texto `--on-accent`.
  - Solo uno por pantalla.
  - Al pulsar, escala a `.96` en 100 ms (clase `.o-press`), con respuesta en el pointer-down.
  - Pieza: `<Button>`.
- **Botón secundario:** fondo `ink .06` con texto `ink .75`. Pieza: `<Button variant="secondary">`.
- **Botón de icono:** 32 px, fondo `ink .07` y `aria-label` obligatorio. Se ve de 32 pero se acierta como uno de 44 (clase `.o-hit`, incluida en la pieza). Dos acciones de icono contiguas van separadas 12 px. Pieza: `<IconButton icon={X} label="Cerrar">`.
- **Título de sección:** `<SectionTitle>`. Para etiquetas de grupo pequeñas, en lugar de micro-mayúsculas, se usa `<Eyebrow>`.
- **Chip:** fondo `accent .1` con texto `--accent`, a 10 px. Pieza: `<Chip>`.
- **Selector segmentado:** contenedor `ink .06` con píldora activa `ink .1`, que se desliza. Pieza: `<Segmented>` (`role="radiogroup"`). Se usa en el tema de Más y en Hecha / Planificada.
- **Filtro:**
  - Botón arriba a la derecha de la sección. Afecta a todo lo que hay debajo (semana, calendario, tendencia, ritmo).
  - Hay una sola pieza, `ActivityFilterButton`. Su menú es de vidrio, nace del botón (`transform-origin` arriba a la derecha) con un muelle sin rebote y se cierra con Escape o tocando fuera.
  - Si el usuario tiene alimentación, el menú empieza con la **vista** (Entrenamiento y alimentación / Solo entrenamiento / Solo alimentación), separada de los tipos por un hairline. Sigue siendo un único filtro. El título de la sección cambia con la vista: «Tu semana», «Entrenamiento» o «Alimentación».
- **Alimentación** (disciplina alimentaria):
  - **Opcional:** se activa abajo del todo en Tú, en una fila con botón secundario (Activar / Desactivar), como las integraciones de Más. Desactivada, no aparece nada.
  - Estándares opcionales en **etiquetas** (hasta 6): se escriben y se añaden con Enter o «Añadir» (que no quita el foco); chip `accent .1` con aspa para quitar. Un sí/no por día.
  - **Casi invisible:** bajo la semana no hay nada. Solo se ve en las celdas de los días (semana y calendario).
  - **Día cumplido:** resplandor esmeralda muy difuminado fuera del borde, `0 0 7px 1px rgba(var(--diet-glow), .38)`. No cumplido o sin responder: nada. No se confunde con Deporte porque las familias van dentro (halo) y esto va fuera.
  - **Vista Solo alimentación:** el mismo resplandor + check a tinta `.85` (cumplido) o aspa a tinta `.4` (no cumplido), sobre el marco vacío.
  - **Pregunta del día:** siempre sobre **ayer** (pasada la medianoche el día está cerrado). Al entrar en la app, si ayer sigue sin responder, sale una **hoja** (meta «Alimentación · {día}», pregunta en DM Sans 17, etiquetas de solo lectura, dos botones secundarios Sí / No y X «Ahora no»), una vez por visita y nunca encima de otra hoja; como los comunicados, tocar el scrim no la cierra. Respondida, no vuelve hasta el día siguiente. Es el único sitio donde se pregunta. Tras «No», chips opcionales con los estándares para marcar en cuál se falló.
  - **Racha:** solo en el pop-up («llevas N días seguidos») y, para el grupo, en la ficha de miembro.
  - Los días pasados se corrigen desde el detalle del día. El grupo solo ve la racha (en la ficha de miembro); los estándares y los fallos son privados.
- **Estado en línea:** los resultados (sincronizado, error) van en una línea de 11 px junto a lo que los causa, con icono y color `--success`/`--danger`, sin cajas de color. Pieza: `<StatusLine>`. Un guardado que falla deja la hoja abierta, muestra la línea sobre el botón y el botón pasa a «Reintentar».
- **Aviso** (confirmación breve tras una acción):
  - **Sitio:** ocupa exactamente el header (misma píldora de 52 px, mismo inset): «habla el header». Así no tapa la nav, ni el botón primario de una hoja, ni el teclado.
  - **Material:** `--toast-bg` (casi opaco, porque cubre el vidrio del header) con `--sheet-filter`, borde `--sheet-edge` y sombra `--glass-shadow`.
  - **Contenido:** icono de 15 px (`--success` o `--danger`), mensaje en DM Sans 12 a tinta .95 y, si hay, una sola acción en píldora `accent .1` de 40 px de alto.
  - **Vida:** 4 s; 6 s si lleva acción. Se descarta deslizándolo hacia arriba. Solo hay uno: el nuevo sustituye al anterior en el sitio.
  - **Deshacer en lugar de preguntar:** eliminar una actividad o quitar un plan se hace al instante y el aviso ofrece «Deshacer». El borrado real espera esos 6 s (o a que la app pase a segundo plano). Si falla, lo eliminado vuelve y se avisa. No hay diálogos de confirmación para lo reversible.
  - **Voz:** el hecho, sin adornos: «Actividad guardada», «Plan quitado», «Actividad eliminada».
  - Pieza: `useToast()` → `toast({ message, action: { label, onClick }, tone })`.
- **Hoja con cambios sin guardar:** en cuanto se toca el formulario, tocar el scrim deja de cerrarla (se pasa `dismissOnScrim={false}`). La X y el arrastre siguen cerrando: son gestos deliberados.
- **Repetir:** el registro empieza con las 3 últimas sesiones de tipos distintos (icono, nombre y duración en mono, píldora de 40 px). Un toque rellena tipo y duración; nada se guarda hasta pulsar el botón.
- **Hecha no admite futuro:** elegir un día futuro pasa el registro a «Planificada»; volver a «Hecha» trae la fecha a hoy. La duración va de 1 min a 24 h.
- **Carga en frío:** mientras llegan los datos se muestran bloques `.o-skeleton` con la forma de lo que viene, nunca un estado vacío («no hay actividades») que luego se desmiente.
- **Nada que parezca pulsable sin hacer nada:** si una fila o botón aún no tiene destino, no se muestra.
- **Anillo de ritmo:**
  - Primera vuelta en `--accent` y segunda en `--accent-over`.
  - Un punto marca el objetivo cumplido.
- **Progreso de objetivo:**
  - Barra en el color de la familia, con una marca vertical para el tiempo transcurrido del periodo.
  - Estados: *Conseguido* / *A buen ritmo* / *Te faltan…*.
- **Carga muscular:** una barra de acento sobre el rango óptimo rayado (`135°`, 1 px cada 4 px) entre dos marcas (crónica × 0.8 y × 1.3).
- **Marca personal:**
  - Cifra display con sparkline sin ejes.
  - La mejora tiene en cuenta el sentido (en tiempos, menos es mejor) y se acompaña de la insignia «nueva».
- **Fila de miembro:** avatar `.img-outline`, insignias ◎ objetivos / ✦ marcas, los 7 últimos días terminando hoy y el anillo de ritmo. No lleva horas.
- **Carrera:**
  - Líneas acumuladas con gradiente por día (mezcla de familias), sin rejilla vertical y con ejes a `.18`.
  - El replay dura 7 s, a 1× o 2×, y se abre en una hoja.
- **Comunicado** (mensaje oficial a todos los usuarios, una sola vez):
  - Es una **hoja** (ver §4): `<Sheet dismissOnScrim={false}>` con `<SheetTitle>`. No es una ventana centrada ni lleva cabecera de color o degradado.
  - **Cabecera:**
    - Meta en mono 11 a tinta .45 con «Comunicado · {mes año}», sin mayúsculas forzadas.
    - Título en DM Sans 17 a tinta .95.
    - Botón de icono X de 32 px a la derecha.
  - **Cuerpo:**
    - DM Sans 12 a tinta .90, en párrafos cortos separados con aire.
    - Los nombres propios o datos clave van a tinta .95, nunca en negrita.
    - Cifras en mono.
  - **Varias novedades:** cada una con su título en estilo Sección (DM Sans 13, tracking `.14em`, tinta .95), separadas por un hairline `ink .12` y aire.
  - **Firma:** «— La cúpula de Olympia» en DM Sans 11 a tinta .45.
  - **Cierre:**
    - Un único botón primario («Entendido»). También se cierra con la X o arrastrando hacia abajo.
    - Tocar el scrim **no** lo cierra, para que no se descarte sin leerlo.
  - **Una vez por usuario:**
    - Clave `olympia_comunicado_{aaaa_mm}_v{n}` en localStorage (con try/catch).
    - Aparece 800 ms después de cargar.
    - Solo hay un comunicado activo a la vez, montado en `AppLayout`.
  - **Voz:** la de §9, con un tono algo más institucional. Una exclamación o un guiño final solo si el mensaje lo pide.

## 7. Movimiento

| Qué | Valor |
|---|---|
| Hoja (entrada / vuelta) | spring `damping 34 · stiffness 380 · mass .9` (amortiguamiento ≈ .92, respuesta ≈ .31 s) |
| Hoja (salida) | spring crítico `stiffness 440 · damping 42`, que **hereda la velocidad del dedo** al cerrar con un tirón |
| Menú desplegable | spring crítico `stiffness 520 · damping 46`, escala `.92 → 1` desde el botón; sale en 120 ms |
| Píldora de pestaña / segmentado | CSS `transform 420ms cubic-bezier(.32,.72,0,1)` (compositor, sin `layoutId`) |
| Rendimiento | `backdrop-filter` solo en superficies flotantes (header, nav, hojas, menús, login); nunca en controles dentro del scroll ni en scrims; nada de estado React ligado al scroll |
| Arrastre de hoja | solo desde la cabecera; elasticidad arriba `.06`, abajo `.8` |
| Cierre | `offset + proyección(velocidad) > 140 px` |
| Proyección | `(v/1000) · 0.998 / (1 − 0.998)` |
| Pulsar | escala `.96`, 100 ms (`.o-press`); un control desactivado no escala |
| Aviso | spring crítico `stiffness 520 · damping 46` desde arriba; sale por arriba en 150 ms |
| Pestaña activa | tocarla de nuevo vuelve arriba con scroll suave (instantáneo con movimiento reducido) |
| Cambio de pestaña | solo un fundido de 150 ms (interacción frecuente) |
| Scrim | 200 ms ease-out |
| Cambio de tema | 250 ms |

**Regla del rebote:** sin rebote por defecto. Solo puede rebotar lo que el usuario ha lanzado con un gesto.

```jsx
import { AnimatePresence } from 'framer-motion';
import { Sheet, SheetTitle } from '@/components/ui';

<AnimatePresence>
  {open && (
    <Sheet onClose={close} label="Detalle"
      header={<SheetTitle title="Título" subtitle="meta" onClose={close} />}>
      <div className="overflow-y-auto overscroll-contain px-5 pb-6">…</div>
    </Sheet>
  )}
</AnimatePresence>
```

## 8. Accesibilidad

- `font-variant-numeric: tabular-nums` en todo el body.
- `prefers-reduced-transparency`: el vidrio y las hojas pasan a sólido (97–98 %) sin desenfoque.
- `prefers-contrast: more`: el borde del vidrio y de las hojas sube a `.45`.
- `touch-action: manipulation` en botones y enlaces, para que no haya espera por doble toque.
- Las hojas llevan `role="dialog"` y los menús, `role="menu"`; el segmentado, `role="radiogroup"`.
- **Foco en las hojas:** al abrir, el foco entra en la hoja; Tab no sale de ella; Escape la cierra; al cerrar, el foco vuelve a quien la abrió. El nombre accesible de la hoja es su título visible.
- **Zona de toque mínima de 44 px** en toda acción (`.o-hit` amplía la de los iconos de 32).
- El aviso es `role="status"` con `aria-live="polite"`; los errores en línea, `role="alert"`.
- Las opciones seleccionables llevan `aria-pressed`; los campos, su `<label>` o `aria-label`.
- `prefers-reduced-motion`: las transiciones son instantáneas y se aplica `MotionConfig reducedMotion="user"`. Las animaciones en bucle se quedan en una sola vuelta y las barras no se recogen al hacer scroll.
- Los avatares llevan un contorno neutro al 10 % (`.img-outline`).

## 9. Voz

Olympia habla en español, de tú, breve y en positivo: «¿a por ella?», «¡meta lograda!», «Te faltan 2 sesiones». Las cifras van primero y los adjetivos, después. No hay exclamaciones salvo para celebrar.

## 10. Sí / No

| Sí | No |
|---|---|
| Separar con hairlines y aire | Tarjetas beige o fondos de marca |
| Títulos discretos con tracking ancho | Negritas, mayúsculas forzadas, sombras de texto |
| Un filtro arriba a la derecha | Leyendas (si hace falta leyenda, el código visual falla) |
| Hojas para detalle y edición | Rojo para algo que no sea hoy o un error |
| Pocas cifras, grandes y en mono | Zoom, podios o adornos que compitan con los datos |

## 11. Contraste con el enfoque de Apple (nov 2026)

Contraste con los principios de diseño fluido de Apple (*Designing Fluid Interfaces* y los principios de diseño de las WWDC), traducidos a la web.

| Principio de Apple | Olympia | Decisión |
|---|---|---|
| Responder en el pointer-down, sin latencia | La pulsación duraba 150 ms y algunos botones no tenían feedback | **Adoptado:** `.o-press` a 100 ms en todas las piezas; `touch-action: manipulation` |
| Interrumpible, con muelles en lugar de duraciones | Hojas con muelle y arrastre interrumpible | Ya lo cumplíamos |
| Proyección de momentum (`0.998`) | Misma fórmula en `sheetDrag.js` | Ya lo cumplíamos |
| Traspaso de velocidad entre gesto y animación | La salida era un tween de 200 ms: había costura al soltar | **Adoptado:** la salida hereda la velocidad del dedo |
| Rubber-band en los límites | Elasticidad `.06` hacia arriba | Ya lo cumplíamos |
| Consistencia espacial: nacer del origen | Menús que aparecían sin más; dos copias del mismo filtro | **Adoptado:** un solo filtro con menú que nace del botón |
| Materiales: superficies grandes, material más grueso; atenuar para dar foco | Hojas opacas; vidrio solo en header y nav | **Adoptado:** hojas y menús de cristal grueso y flotantes; el scrim atenúa |
| Familiaridad: lo que parece igual se comporta igual | Ventanas centradas mezcladas con hojas; botones de Más que no hacían nada | **Adoptado:** todo detalle va en `Sheet`; se eliminan los botones sin destino |
| Tracking según el tamaño | Un tracking fijo por rol | **Adoptado:** `--tracking-title` negativo y óptico de DM Sans |
| Jerarquía con peso | Olympia no usa negritas | **Descartado** como norma: la sobriedad es parte de la identidad. Solo se adopta la vibrancia (500) en etiquetas sobre vidrio |
| Respetar el tamaño de texto del usuario | El viewport tiene `user-scalable=no` | **Pendiente:** quitarlo afecta al zoom al enfocar campos en iOS. Hay que decidirlo |
| Hápticos y sonido con causalidad | Safari en iOS no ofrece vibración desde la web | **Adoptado con reservas (v1.6):** `lib/haptics.js` da un toque al guardar y al deshacer. En Android usa la Vibration API; en iOS, el tic de un `<input switch>` (Safari 17.4+, no estándar). Si no está disponible, no pasa nada |
| Perdón antes que permiso: deshacer en vez de confirmar | Eliminar era un toque sin vuelta atrás | **Adoptado (v1.6):** aviso con «Deshacer» y borrado diferido |

## 12. Historial

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-10-18 | Primera versión del sistema. |
| 1.1 | 2026-11-07 | Añade el patrón **Comunicado** (§6). Desde esta versión, toda sesión que toque la interfaz lee este documento primero (ver `CLAUDE.md`). Nota: `OfficialAnnouncement.jsx` (comunicado de noviembre de 2026) es anterior a este patrón y no lo sigue. |
| 1.2 | 2026-11-07 | El sistema pasa al código: `index.css` lleva todos los tokens y `src/components/ui/` las piezas (`Sheet`, `Button`, `IconButton`, `SectionTitle`, `Eyebrow`, `Chip`). Contraste con Apple (§11): **hojas de cristal flotantes** (regla 7 revisada), salida con traspaso de velocidad, pulsación a 100 ms, filtro único con menú anclado al botón y tracking según el tamaño. Más rediseñada con las piezas. Se elimina el código que no se usaba (Dashboard, Planificador semanal, pop-up de Metas, otras 12 funciones y 2 paletas antiguas). |
| 1.3 | 2026-11-08 | Patrón **Alimentación** (§6): marcas en tinta en la celda del día, pregunta del día y racha; la regla 5 aclara que lo que no es actividad va en tinta. El **filtro** gana la vista (entrenamiento, alimentación o ambos) sin dejar de ser uno. El **Comunicado** admite varias novedades separadas por hairline. |
| 1.4 | 2026-11-08 | La alimentación pasa a ser casi invisible: fuera el bloque bajo la semana y el día cumplido se marca con un resplandor esmeralda exterior (token `--diet-glow`), primera excepción a la regla 5 por decisión de Jorge. La pregunta diaria vive solo en el pop-up. |
| 1.6 | 2026-11-10 | **Experiencia sin errores silenciosos** (principio 9). Patrón **Aviso** en el sitio del header, con «Deshacer» para eliminar actividades y quitar planes (borrado diferido 6 s). Los fallos al guardar se ven en línea y el botón pasa a «Reintentar». Piezas nuevas: `Segmented`, `StatusLine`, `useToast`; token `--toast-bg`; utilidades `.o-hit` (zona de toque de 44) y `.o-skeleton`. Las hojas gestionan el foco, Escape y el título accesible; con cambios sin guardar, el scrim no cierra. Registro: fila **Repetir**, «Hecha» no admite futuro y duración de 1 min a 24 h. Tocar la pestaña activa vuelve arriba. Háptico al guardar y deshacer. Los datos se refrescan al volver a la app. Ver `auditoria-ux-2026-11.md`. |
| 1.5 | 2026-11-08 | **Descanso:** botón en «Últimas 16 semanas» que funde (600 ms, sin animación con movimiento reducido) una línea menta translúcida (`--sleep-line`, opacidad .6, 1.75 px, sin puntos) con el sueño medio por noche sobre la misma gráfica y el mismo eje en horas; el tooltip la nombra. Decisión de Jorge frente a la regla de no superponer: no hay segundo eje, ambas medidas van en horas. Tarjetas «Sueño y actividad» y «La noche después» (Días / Semanas) en Tus gráficas. |
