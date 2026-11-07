# Auditoría de la app contra el sistema de diseño v1.1

**Fecha:** 2026-11-07. **Base:** `main` en 6b18868.

**Método:**
- Revisión del código, regla por regla, de `design-system/README.md` sobre todo `src/`.
- Comparación de tokens entre `olympia-tokens.css` y `src/index.css`.
- Detección de componentes que no se usan.

**Límite:** no se han revisado las pantallas en vivo, porque están detrás del login. Los hallazgos salen del código y conviene confirmarlos visualmente al corregirlos.

---

## Resumen

La app cumple el sistema en lo que depende de la configuración global:
- accesibilidad (reducir movimiento, transparencia y contraste);
- valores de color;
- vidrio en header y nav;
- sin leyendas, sin `layoutId` y sin sombras de texto.

Falla en los componentes, por una causa de fondo: **el sistema vive en documentos, pero no en el código**. Cada componente reescribe a mano colores, tamaños, radios y pesos. Por eso las pantallas anteriores a octubre (Más, Planificador) siguen como estaban, y las nuevas pueden copiarlas sin darse cuenta, como pasó con el comunicado.

| Regla | Ficheros que la rompen | Peor caso |
|---|---|---|
| Sin negritas | 10 | `Mas.jsx` (23), `WeeklyPlanner.jsx` (19) |
| Radios 16 / 24 / 28 / píldora | 11 | `Mas.jsx` (19), `WeeklyPlanner.jsx` (18) |
| Sin mayúsculas forzadas | 11 | `WeeklyPlanner.jsx` (9), `Grupos.jsx` (4) |
| Detalle en hojas, no en ventanas centradas | 2 | `WeeklyPlanner.jsx` (2), `OfficialAnnouncement.jsx` |
| El color significa algo | 2 | puntos de la carrera en `Grupos.jsx` |
| Iconos del sistema, no emojis | 3 | `Grupos.jsx`, `Actividad.jsx`, `WeeklyPlanner.jsx` |
| Colores por token, no fijos | 6 | rojo de hoy fijo en `TrainingCalendar.jsx` y `Grupos.jsx` |

---

## P0. Causa de fondo: el sistema no está en el código

1. **La app no carga 38 de los tokens del sistema.**
   - `olympia-tokens.css` define, entre otros:
     - `--today`;
     - la escala de tinta (`--ink-primary` … `--ink-hairline`);
     - tipografía (`--fs-display` … `--fs-micro`, `--tracking-section`);
     - radios (`--r-tile`, `--r-card`, `--r-sheet`, `--r-chip`);
     - duraciones (`--dur-press`, `--dur-scrim`…).
   - `src/index.css` solo tiene colores. Los valores que comparten coinciden, así que no hay desajustes; simplemente faltan.
   - **Arreglo:** pasar esos tokens a `index.css`.
2. **No hay piezas reutilizables.**
   - Cada hoja, botón y título de sección se escribe a mano. Por ejemplo, `Grupos.jsx` define su propio `SECTION_TITLE` y su propio `glassBar`.
   - **Arreglo:** crear `src/components/ui/` con:
     - `Sheet`: scrim, asa, muelle y arrastre;
     - `Button` primario y secundario;
     - `IconButton`;
     - `SectionTitle`;
     - `Chip`.

     Así, lo nuevo nace dentro del sistema y una corrección se aplica en todas partes a la vez.

Sin esto, la auditoría tendrá que repetirse cada pocos meses. Con esto, los P1 se corrigen sustituyendo código a mano por estas piezas.

## P1. Lo que más se nota

3. **Más (`src/pages/Mas.jsx`) está entera sin migrar al sistema.**
   - 23 negritas, 19 radios de 8–12 px, títulos de sección en mayúsculas (por ejemplo, «Apariencia») y avatar cuadrado con `rounded-xl`.
   - Los colores de Strava (`#fc4c02`) y Whoop (`#2dd4bf`) son aceptables solo en sus logotipos. Como fondo de botón chocan con «un solo primario por pantalla».
4. **Planificador semanal (`src/components/WeeklyPlanner.jsx`).**
   - El selector de día y el diálogo «completar plan» son **ventanas centradas**. Deberían ser hojas que suben desde abajo, como `DayDetailSheet` o `MemberSheet`.
   - Además: 19 negritas, 18 radios fuera de escala, 9 mayúsculas y emojis en lugar de iconos.
5. **Grupos (`src/pages/Grupos.jsx`), la pestaña de referencia, tiene restos antiguos.**
   - Los puntos de la carrera usan una paleta genérica de 6 colores (índigo, esmeralda, rojo…). Ese rojo choca con «el rojo solo para hoy». Las líneas ya usan la mezcla de familias; los puntos deberían usar la misma.
   - El desplegable de deporte lleva `font-medium`, radios de 8–12 y emojis.
   - Hay 4 etiquetas de 9–10 px en mayúsculas (`uppercase tracking-widest`), de las secciones de miembro y objetivos.
   - El tooltip del gráfico tiene radio 10.
6. **Comunicado de noviembre (`OfficialAnnouncement.jsx`).** Es anterior al patrón Comunicado y se deja como está, por decisión de Jorge. El próximo comunicado debe sustituirlo usando el patrón.

## P2. Limpieza

7. **Código que no se usa**, para borrar:
   - **`src/pages/Dashboard.jsx`:** no tiene ruta. Arrastra 24 colores de la paleta de Tailwind y vidrio sobre contenido.
   - **`src/components/FeatureAnnouncement.jsx`:** ya no se monta. Es el origen del estilo antiguo que se copió.
   - **`ACTIVITY_COLORS` en `src/pages/Actividad.jsx`:** una paleta antigua de 11 colores que solo aparece en su definición.
8. **Rojo de hoy fijo** (`#e5484d`) en `TrainingCalendar.jsx` y `Grupos.jsx`. Debería usar el token `--today`, que llegará con el P0.
9. **Actividad (`src/pages/Actividad.jsx`):**
   - El contador de sesiones del calendario usa `#fff` y `#1c2620` fijos, así que no se adapta al tema.
   - Hay 5 negritas y una etiqueta de 9 px en mayúsculas.
   - El trofeo de marca personal es un emoji 🏆; el sistema dice «trofeo en acento».
10. **Login, ResetPassword y Landing:** detalles menores (2 negritas, radios de 8–12 y una mayúscula). Aquí el vidrio está permitido.

## Lo que ya cumple

- `MotionConfig reducedMotion="user"` y las preferencias de transparencia reducida y de más contraste en `index.css`.
- Los valores de color de la app coinciden con los tokens del sistema.
- `backdrop-filter` solo en header, nav y login, más dos excepciones ya listadas: los comunicados y `Dashboard.jsx`, que no se usa.
- Sin `<Legend>`, sin `layoutId` y sin sombras de texto.
- `MemberSheet` y `DayDetailSheet` son el patrón de hoja correcto y sirven de modelo.

## Decisión pendiente (Jorge)

- **Cristal en ventanas de contenido.** La regla 7 dice «el vidrio solo en lo que flota». Si se quiere que hojas o ventanas flotantes de contenido sean de cristal, hay que definirlo como patrón en la v1.2 antes de aplicarlo. Falta la captura de referencia de Grupos.

## Orden propuesto

1. **P0:** pasar los tokens a la app y crear `src/components/ui/`. Es la base de todo lo demás.
2. **P2 punto 7:** borrar el código que no se usa. Es rápido y evita que alguien vuelva a copiarlo.
3. **Más**, una pantalla entera.
4. **Planificador:** pasar las dos ventanas a hojas.
5. **Grupos y Actividad:** detalles.

Cada paso se verifica con `vite build` y una revisión visual en móvil, y se apunta en el historial del README.
