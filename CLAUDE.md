# Olympia: instrucciones del proyecto

App (React + Vite + Tailwind + Supabase, desplegada en Vercel desde `main`) para que un grupo de amigos registre y comparta su actividad deportiva.

## Diseño: leer siempre la última versión del sistema

Antes de diseñar, cambiar o implementar **cualquier cosa visible** (pantallas, componentes, pop-ups, comunicados, textos de interfaz):

1. Lee entero `design-system/README.md`, que es la versión vigente del sistema de diseño de Olympia, y aplícalo.
2. Parte de los tokens y patrones reales de la app:
   - `src/index.css`: variables de tema.
   - `src/lib/theme.js`.
   - `src/components/sheetDrag.js`: hojas y muelles.
   - El componente existente más parecido que cumpla el sistema.
   - No copies estilos de componentes antiguos sin comprobar antes que siguen el sistema: algunos son anteriores a él (por ejemplo, `FeatureAnnouncement.jsx`).
3. Si lo nuevo necesita un patrón que el sistema no recoge, o rompe una de sus reglas, **dilo antes de implementarlo**: es una decisión de diseño de Jorge.
4. Cuando se acuerde un patrón nuevo o un cambio, actualiza en el mismo commit:
   - `design-system/README.md`, subiendo la versión y añadiendo una línea al historial de cambios.
   - `design-system/olympia-tokens.css`/`.json`, si cambian tokens.
   - La guía `design-system/index.html`, si aplica.

   Así el sistema evoluciona con la app y la siguiente sesión parte de lo último.

## Comunicados

Los comunicados oficiales a usuarios siguen el patrón **Comunicado** de `design-system/README.md`. Se muestran una sola vez por usuario: para uno nuevo, sube la versión de su clave en localStorage. Solo debe haber un comunicado activo a la vez.

## Forma de trabajar

- Se trabaja directamente sobre `main`, sin PRs ni ramas aparte. Si la sesión está en un worktree o en una rama `claude/...`, avisa al empezar. Al terminar, publica con `git push origin HEAD:main`, comprobando antes que avanza sin conflictos.
- Antes de publicar, verifica que `vite build` pasa y comprueba visualmente los cambios de interfaz en viewport móvil.
- Idioma: español, de tú (ver "Voz" en el sistema de diseño).
