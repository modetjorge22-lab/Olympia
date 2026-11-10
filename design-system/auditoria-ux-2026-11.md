# Auditoría de experiencia de Olympia

**Fecha:** 2026-11-10. **Base:** `main` en 591190a. **Sistema:** pasa de v1.5 a v1.6.

**Método:**
- Lectura completa del código (páginas, componentes, capa de datos y hooks), flujo por flujo.
- Recorrido de la app real en móvil con sesión iniciada (Tú, Feed, Grupos, Más y el registro).
- Contraste con los principios de fluidez y diseño de Apple, con reglas de pulido de interfaz y de animación, y con patrones de Strava, WHOOP, Apple Fitness, Material, Linear y NN/g.
- Las piezas nuevas se probaron en una página de prueba aislada (375 px, vino y marfil).

**Límite:** el borrado con deshacer y los avisos no se han probado contra la base de datos real, solo con datos de prueba. Conviene registrar y eliminar una actividad de prueba tras publicar.

---

## Diagnóstico

Olympia se ve mejor de lo que se comporta. El lienzo, la tipografía, las hojas y los muelles están al nivel de una app nativa cuidada. Lo que fallaba era lo que no se ve en una captura: **qué pasa cuando algo sale mal y qué pasa cuando te equivocas.**

La causa era una sola: no había una capa común para las escrituras. Cada guardado o borrado resolvía sus errores a su manera (unos lanzaban, otros devolvían `null`, otros solo escribían en la consola). El resultado era que casi cualquier fallo era invisible o parecía un éxito.

## Corregido en la v1.6

| # | Antes | Ahora |
|---|---|---|
| 1 | Guardar una actividad sin conexión: el spinner paraba y no pasaba nada | Línea de error sobre el botón, que pasa a «Reintentar». La hoja conserva lo escrito |
| 2 | Editar o planificar con error: la hoja se cerraba como si hubiera guardado | `updateActivity` y `addPlan` lanzan el error y la hoja lo muestra |
| 3 | Eliminar una actividad: un toque, sin vuelta atrás, en un icono de 30 px pegado a Editar. Si venía de WHOOP, no volvía nunca | Aviso «Actividad eliminada · Deshacer» durante 6 s, con borrado diferido. Iconos con zona de toque de 44 px y 12 px de separación |
| 4 | Quitar un plan: inmediato y silencioso | Mismo aviso con «Deshacer» |
| 5 | Se podían guardar actividades de 0 minutos o negativas | Duración de 1 min a 24 h; el botón «menos» se detiene en 5 |
| 6 | Se podía guardar una actividad «hecha» en el futuro | Un día futuro pasa a «Planificada»; «Hecha» trae la fecha a hoy |
| 7 | Tocar fuera de la hoja de registro borraba todo lo escrito | Con cambios, el scrim no cierra |
| 8 | Nada confirmaba que se había guardado | Aviso («Actividad guardada», «Cambios guardados», «Plan guardado») y un toque háptico |
| 9 | Al registrar sobre una sesión de WHOOP, se fusionaban sin decirlo | El aviso lo dice: «Guardada y enlazada con tu sesión de WHOOP» |
| 10 | Registrar lo de siempre exigía elegir tipo y duración cada vez | Fila «Repetir» con las 3 últimas sesiones distintas: un toque |
| 11 | Las hojas no tenían Escape, ni foco inicial, ni devolvían el foco | Las siete hojas lo heredan de `Sheet` |
| 12 | En el arranque en frío, Feed y Grupos mostraban «no hay actividades» un instante | Esqueleto de carga |
| 13 | Lo que hacían los demás no aparecía hasta recargar | Los datos se refrescan al volver a la app tras 1 min en segundo plano |
| 14 | El botón «+» no tenía nombre accesible ni respuesta al pulsar y se montaba sobre la nav en iPhone | `aria-label`, `.o-press` y posición con el área segura |
| 15 | Tres selectores segmentados distintos | Pieza `Segmented` (Más y registro) |
| 16 | Con movimiento reducido, la pantalla de carga parpadeaba y las barras seguían encogiéndose | Una sola vuelta de animación y barras quietas |
| 17 | Tocar la pestaña activa no hacía nada | Vuelve arriba |
| 18 | Dos botones primarios en la hoja del día | «Marcar como hecha» pasa a secundario de acento |

## Pendiente, por prioridad

### P1. Errores que siguen siendo posibles

1. **Fusión con WHOOP por cualquier tipo** (`DataContext.jsx`, `createActivity`). Si apuntas 60 min de pádel un día con una carrera de WHOOP de 50 min, tu pádel sustituye a la carrera. Ahora se avisa, pero no se pregunta. Propuesta: fusionar solo si coincide el tipo y, si no, preguntar en la hoja («¿Es tu sesión de WHOOP de 50 min?»). **Es una regla de producto: decide Jorge.**
2. **Marcas y objetivos se eliminan con un toque** (`GoalsSection.jsx:143`, `ObjectivesPanel.jsx:51`, `Actividad.jsx` `deletePrAchievement`). Eliminar una marca borra también su historial. Les falta el mismo «Deshacer».
3. **Crear objetivo o marca admite doble toque** y cierra el formulario aunque falle (`GoalsSection.jsx:167`, `ObjectivesPanel.jsx:73`).
4. **Alimentación:** `saveStandards` no comprueba errores y la respuesta del día se revierte en silencio si falla (`useDiet.js`).
5. **Strava identifica al usuario por el email en la URL y en el cuerpo**, no por la sesión (`Mas.jsx:58`, `useStravaAutoSync.js`). WHOOP ya usa `apiPost`. Es un problema de privacidad y de seguridad, no solo de diseño.
6. **Desconectar Strava** ignora el error y no pide confirmación; es un enlace de 11 px.
7. **Landing sin «Ya tengo cuenta»:** quien cambia de móvil no tiene por dónde entrar (`Landing.jsx:23`).
8. **Los planes se ocultan si el día ya tiene actividad** (`Actividad.jsx`, hoja del día): no se pueden ver ni quitar.

### P2. Accesibilidad

9. **`user-scalable=no`** impide ampliar (WCAG 1.4.4). Quitarlo exige campos a 16 px para que iOS no haga zoom al enfocar.
10. **Las celdas del día no tienen nombre accesible:** VoiceOver lee solo «7».
11. **Zonas de toque de unos 22 px** en los selectores de periodo de Tú y Grupos, en 1×/2× del replay y en «Ver todos». Migrarlos a `Segmented`.
12. **Texto por debajo de tinta .45** en 12 sitios (Feed, Objetivos, Marcas, Login, Landing).
13. **Login y Reset:** etiquetas sin asociar y sin `autoComplete`.
14. **El replay de la carrera** se reproduce solo aunque haya movimiento reducido.

### P3. Movimiento y sistema

15. La barra de progreso de objetivos anima `width` en cada cambio de pestaña; debería animar `scaleX` y solo al cambiar el valor.
16. El ranking del replay anima `top`; debería ser `transform`.
17. La línea de descanso se dibuja en 1100 ms y el sistema dice 600 ms.
18. `MemberSheet` aún no usa `SheetTitle`; tooltips con radio 8; cajas de color en los errores de Login.
19. La guía viva `design-system/index.html` no refleja la v1.2 en adelante.

## Hacia dónde llevaría la experiencia

Ordenado por lo que más cambia el uso diario, no por esfuerzo.

1. **Reacciones en el Feed.** Hoy el Feed se mira pero no se toca. Un gesto de un toque por actividad (sin contador, con los nombres: sois pocos) es lo que convierte un registro en un grupo. Es el patrón con más efecto demostrado en este tipo de apps. Necesita una tabla nueva en Supabase.
2. **Tu semana, los lunes.** Una hoja con el patrón Comunicado: minutos, sesiones, posición en la carrera y quién ha entrenado más. Convierte datos que ya existen en un momento.
3. **Celebrar lo que importa, una vez.** Cumplir el objetivo semanal o batir una marca merece el único movimiento con rebote de toda la app. Nunca en cada registro.
4. **El «+» en el centro de la nav.** Registrar es la acción principal y hoy solo está en Tú. En la nav estaría a un toque desde cualquier pestaña.
5. **Rachas por semanas, no por días,** con una semana de margen al mes. Las rachas diarias generan ansiedad y abandono cuando se rompen.
6. **Aviso de sincronización.** «3 entrenos de WHOOP importados» en una línea bajo la semana, en vez de que aparezcan sin explicación.
7. **Recordar la posición de cada pestaña** al volver a ella, como hace iOS. Hoy cada cambio de pestaña vuelve arriba.

## Fuentes

- Apple, *Designing Fluid Interfaces* (WWDC 2018) y *Animate with springs* (WWDC 2023): https://developer.apple.com/videos/play/wwdc2023/10158/
- Apple HIG, hojas con cambios sin guardar: https://developer.apple.com/design/human-interface-guidelines/sheets
- Material, snackbar con una sola acción y «deshacer» como caso canónico: https://material.io/components/snackbars
- Aza Raskin, *Never Use a Warning When You Mean Undo*: https://alistapart.com/article/neveruseawarning
- NN/g, esqueletos de carga: https://www.nngroup.com/articles/skeleton-screens/ · validación en línea: https://www.nngroup.com/articles/errors-forms-design-guidelines/
- Apple Fitness, compartir actividad y competir: https://support.apple.com/guide/watch-ultra/share-activity-apd68a69f5c7/watchos
- WHOOP, evaluación semanal: https://whoop.com/thelocker/new-feature-weekly-performance-assessment
- Duolingo, rachas: https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- Háptico en la web (iOS sin Vibration API): https://w3c.github.io/vibration/reports/implementation.html
