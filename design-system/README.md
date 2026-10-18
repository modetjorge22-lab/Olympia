# Olympia · Sistema de diseño v1.0

> Constancia que se ve. Competición que se siente.

Olympia mide el tiempo que dedicas a moverte y lo convierte en algo que compartes. Su diseño es un lienzo tranquilo, con cifras exactas y movimiento que tiene peso físico.

| Archivo | Para qué |
|---|---|
| `index.html` | Guía viva: ábrela en el navegador (tiene conmutador Vino/Marfil y una hoja arrastrable) |
| `olympia-tokens.css` | Variables CSS listas para importar en cualquier proyecto web |
| `olympia-tokens.json` | Los mismos tokens para Figma, nativo, emails o scripts |

La fuente de verdad sigue siendo la app: `src/index.css`, `src/lib/theme.js`, `src/components/sheetDrag.js` y `src/utils/activityIcons.js`. Si cambias algo allí, actualiza también estos tokens.

---

## 1. Principios

1. **Un solo lienzo.** El fondo vino (o marfil) es continuo. Las secciones se separan con hairlines (`ink .12`) y aire, no con cajas de color.
2. **El beige es acento, no superficie.** Se usa en las cifras protagonistas, el botón primario y la familia fuerza. Nunca va como fondo de tarjeta.
3. **Sin negritas.** Todo es peso 400 (300 solo en titulares display). La jerarquía sale del tamaño, el tracking y la opacidad de la tinta.
4. **Las cifras van en mono.** Usa JetBrains Mono tabular para horas, fechas y marcas.
5. **El color significa algo.** Solo hay cinco familias de actividad y un rojo, que marca hoy.
6. **Hecho vs. planificado.** Lo hecho es sólido, con halo; lo planificado es un marco discontinuo.
7. **El vidrio solo en lo que flota.** Se usa en el header, la nav y los controles superpuestos. El contenido nunca va en vidrio.
8. **Movimiento con física.** Usa muelles, inercia proyectada y gestos interrumpibles, y respeta la preferencia de reducir movimiento.

## 2. Color

Toda la UI se escribe como `rgba(var(--ink), α)`, así el mismo código sirve para los dos temas.

| Token | Vino (dark) | Marfil (light) |
|---|---|---|
| `--bg` | `#2a121a` | `#fffdf5` |
| `--ink` | `245,237,224` | `42,18,26` |
| `--surface` (hojas) | `#3a1c28` | `#ffffff` |
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
| Título | DM Sans | 15 | |
| Sección | DM Sans | 13 | tracking `.14em`, sin mayúsculas forzadas |
| Cuerpo | DM Sans | 12 | |
| Meta | Mono | 11 | tinta .45 |
| Caption | DM Sans | 10 | |
| Micro (L M X…) | Mono | 8.5 | `accent .55` |
| Logotipo | DM Sans | 13 | MAYÚSCULAS, tracking `.3em` + símbolo ∞ |

El símbolo ∞ tiene un bucle izquierdo fino (1.5, opacidad .55), que es la base, y uno derecho grueso (3.5), que es el empuje.

## 4. Materiales y forma

- **Vidrio:**
  - Fondo `--glass-bg` con `blur(24px) saturate(160%)`.
  - Borde `--glass-border` y sombra `--glass-shadow`.
  - Header de 52 px y nav de 60 px, con radio de h/2, flotando a 8–12 px del borde.
- **Hoja (sheet):**
  - Fondo `--surface` y radio superior de 28.
  - Asa de 36×4 a tinta .18.
  - Scrim `--scrim` con `blur(10px)`.
  - Sube desde abajo.
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
  - Al pulsar, escala a `.96` en 150 ms.
- **Botón secundario:** fondo `ink .06` con texto `ink .6`.
- **Botón de icono:** 32 px, fondo `ink .07` y `aria-label` obligatorio.
- **Chip:** fondo `accent .1` con texto `--accent`, a 10 px.
- **Selector segmentado:** contenedor `ink .06` con píldora activa `ink .1`, que se desliza con muelle.
- **Filtro:** botón arriba a la derecha de la sección. Afecta a todo lo que hay debajo (semana, calendario, tendencia, ritmo).
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

## 7. Movimiento

| Qué | Valor |
|---|---|
| Hoja | spring `damping 34 · stiffness 380 · mass .9` |
| Píldora de pestaña | CSS `transform 420ms cubic-bezier(.32,.72,0,1)` (compositor, sin `layoutId`) |
| Rendimiento | `backdrop-filter` solo en header/nav/login; nunca en controles dentro del scroll ni en scrims; nada de estado React ligado al scroll |
| Arrastre de hoja | solo desde la cabecera; elasticidad arriba `.06`, abajo `.8` |
| Cierre | `offset + proyección(velocidad) > 140 px` |
| Proyección | `(v/1000) · 0.998 / (1 − 0.998)` |
| Pulsar | escala `.96`, 150 ms |
| Cambio de pestaña | solo un fundido de 150 ms (interacción frecuente) |
| Scrim / salida de hoja | 200 ms ease-out |
| Cambio de tema | 250 ms |

```jsx
import { SHEET_SPRING, useSheetDrag } from '@/components/sheetDrag';
const sheet = useSheetDrag(onClose);
<motion.div transition={SHEET_SPRING} {...sheet.dragProps}>
  <header {...sheet.handleProps}>…</header>
</motion.div>
```

## 8. Accesibilidad

- `font-variant-numeric: tabular-nums` en todo el body.
- `prefers-reduced-transparency`: el vidrio pasa a sólido al 97 %.
- `prefers-contrast: more`: el borde del vidrio sube a `.45`.
- `prefers-reduced-motion`: las transiciones son instantáneas y se aplica `MotionConfig reducedMotion="user"`.
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
