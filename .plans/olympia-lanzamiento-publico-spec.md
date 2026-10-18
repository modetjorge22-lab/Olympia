# Olympia: lanzamiento público para usuarios individuales

*Spec generada en entrevista el 18 oct 2026. Autor: Jorge Modet.*
*Sustituye a `validacion-usuarios-individuales-plan.md` (15 oct) y, en lo que se solape, a `olympia-grupos-y-apertura-spec.md` (12 oct). Ver §11.*

## 1. Resumen

Abrir Olympia, hoy usada por menos de 10 personas de GoHub, a **usuarios individuales** que quieran llevar un registro
de su actividad física, entender cuánto y cómo entrenan, y sostener el ritmo.

Se lanza como **"Diario de un High Performer"**: todo tu ejercicio, no solo el cardio, en un sitio, y tu mes resumido en datos.

El proyecto se plantea como **posible negocio**. Primero hay que validar que existe interés.
- **Puerta 1:** conversión de la landing.
- **Puerta 2:** retención de las primeras tandas.

Solo si se pasan las dos se invierte en monetización, integraciones o IA.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Ambición | Posible negocio: si valida, se monetiza y se le dedica tiempo en serio |
| Señal decisiva (puerta 1) | Interés en la landing: **conversión visita → email ≥ 10 %** |
| Segunda puerta | Retención en la semana 4 de las tandas (§8.2) |
| Persona objetivo | **Profesional ocupado**: un high-performer con poco tiempo que quiere saber si de verdad entrena lo que cree |
| Diferencial | (1) Todo el ejercicio, no solo el que lleva GPS (fuerza, pádel, clases…). (2) Análisis: carga, carga muscular, ritmo estacional, marcas |
| Posicionamiento | "Diario de un High Performer". Mensaje único, sin probar ángulos |
| Mecanismo de disciplina | **El resumen o informe primero**. Objetivos, rachas y recordatorios llegan después, si hay tracción |
| Qué entra en el diario | Actividad física, más **RPE 1–10** y una nota por sesión (la nota ya existe como `description`) |
| Entrada de datos | Registro manual rápido. Strava aparece como "próximamente" en la landing y queda oculto para los usuarios públicos |
| Lo social | Grupos opcionales y de **autoservicio**. Sin grupo, Feed y Grupos quedan ocultos |
| Acceso | **Waitlist y tandas**. Se invita desde un botón de superadmin en Más |
| Aislamiento | Mismo proyecto Supabase, **RLS por grupo** (`shares_group()`). GoHub pasa a ser un grupo más |
| Red de seguridad | **Staging** (segundo proyecto Supabase) y **test automatizado de RLS** |
| Login | Google, y email con contraseña (los dos ya existen) |
| Día 1 en la app | La pestaña Tú entera, visible aunque esté vacía, con estados vacíos cuidados (sin revelado progresivo ni datos de demo) |
| Onboarding | Mínimo: consentimiento RGPD y deportes habituales |
| Legal | Consentimiento explícito, política de privacidad y aviso legal, **borrado de cuenta en Más**, banner de cookies mínimo para el píxel |
| Responsable del tratamiento | Jorge Modet como persona física |
| Marca | **Olympia**, como en el código. El dominio está pendiente (§10) |
| Mercado | España. ES es el idioma principal y EN el secundario |
| Canales | LinkedIn orgánico y Meta Ads, con banner y píxel |
| Presupuesto de anuncios | ≤ 300 € |
| Plazo | **1 mes** hasta tener la landing con anuncios en marcha |
| Landing | Estilo editorial premium (identidad marfil y vino). Capturas en móvil, el informe mensual como pieza central y mockups animados en código. **Sin precio** |
| Encuesta | Una sola pregunta: "¿Cómo registras hoy tu ejercicio?" |
| GoHub | Nada visible cambia, salvo que ganan el RPE y el informe |
| Orden de trabajo | **Primero el aislamiento y lo legal, y la landing. El resto, solo si hay go** |

## 3. Fases

| Fase | Contenido | Cuándo |
|---|---|---|
| **0. Aislamiento** | Staging, modelo de grupos, RLS y test de RLS. Registro cerrado a quien no esté invitado | Semanas 1–2, antes de cualquier anuncio |
| **1. Landing y validación** | Nueva landing, waitlist con UTM y encuesta, analítica, banner y píxel, páginas legales. Anuncios en marcha | Semanas 2–4 de construcción, después 3–4 semanas de anuncios |
| **Puerta 1** | Go o kill según la conversión (§8.1) | Al final de los anuncios |
| **2. Producto público** | RPE, informe mensual, onboarding, grupos de autoservicio, tandas, borrado de cuenta | Solo tras el go |
| **Puerta 2** | Retención en la semana 4 (§8.2) | 4 semanas después de la primera tanda |
| **3. Negocio** | Cobro, Strava público, objetivos y recordatorios, IA | Solo tras pasar la puerta 2. Fuera de esta spec |

Si la puerta 1 da kill, lo construido (fase 0 y landing) no se pierde: el aislamiento hacía falta de todos modos.

## 4. Fase 0: aislamiento y seguridad (bloqueante)

**Situación actual:**
- Las políticas `SELECT` de `team_members`, `activities`, `goals`, `pr_achievements` y `objectives` son `USING (true)`.
- `/login` permite que cualquiera cree una cuenta.

Con anuncios, un desconocido vería los datos de GoHub.

### 4.1 Staging
- Segundo proyecto Supabase.
- Variables `VITE_SUPABASE_*` de preview en Vercel apuntando a staging.
- Cada script de `db/` se aplica primero en staging y después en producción.
- Actualizar `supabase-schema.sql` para que refleje el estado real; hoy está desfasado respecto a `db/`.

### 4.2 Modelo de datos

```sql
groups        (id uuid pk, name text not null, invite_code text unique not null,
               created_by uuid references auth.users, created_at timestamptz default now())
group_members (group_id uuid references groups on delete cascade,
               user_id  uuid references auth.users on delete cascade,
               role text check (role in ('admin','member')) default 'member',
               joined_at timestamptz default now(),
               primary key (group_id, user_id))
```

- `team_members` pasa a ser el **perfil global**. Se le añaden:
  - `is_superadmin boolean default false`
  - `privacy_accepted_at timestamptz`
  - `onboarded_at timestamptz`
  - `preferred_types text[]`
  - `cohort text`, `utm_source text`, `utm_campaign text`
- `team_members.group_id` y `role` dejan de usarse; los sustituye `group_members`.
- **Migración:**
  - Grupo "GoHub" con todos los `team_members` actuales.
  - Jorge queda como admin del grupo y como superadmin.

### 4.3 RLS

- Función `shares_group(other uuid)`, `security definer`: devuelve `true` si `other = auth.uid()` o si los dos usuarios comparten algún grupo.
- **Lectura:** `SELECT USING (shares_group(user_id))` en `team_members`, `activities`, `goals`, `objectives` y `pr_achievements`.
- **Escritura:** solo el propio usuario.
- **`groups`:** se ven los grupos de los que soy miembro.
- **`group_members`:**
  - Se ven los miembros de mis grupos.
  - El admin del grupo puede expulsar.
  - Cada usuario puede salir.
- **RPC `security definer`:**
  - `create_group(name)` crea el grupo y mete al creador como admin.
  - `join_group(code)` une al usuario por código.
  - `regenerate_invite(group_id)`, solo para admins.
  - El cliente nunca puede listar los grupos ni sus códigos.
- **Funciones de `api/`:** revisar que ninguna devuelva datos de otros usuarios. Todas usan la service key.

### 4.4 Registro cerrado
- La waitlist pasa a tener `status` (`pending | invited | joined`), `invited_at`, `cohort`, `utm_source`, `utm_campaign`, `survey jsonb`.
- Solo se puede registrar quien tenga su email con estado `invited` en la waitlist, o un miembro de GoHub que ya exista.
- **Cómo se impone:**
  - Opción preferida: un hook *Before User Created* de Supabase Auth.
  - Alternativa: un trigger que bloquee la creación del perfil más RLS que exija `privacy_accepted_at`.
- Google OAuth pasa por el mismo control.

### 4.5 Test de RLS (criterio de hecho de la fase 0)
Script en `scripts/` (Node, `@supabase/supabase-js`) que se ejecuta contra staging:
1. Crea o usa una cuenta de prueba invitada que no pertenece a ningún grupo.
2. Intenta leer `activities`, `team_members`, `goals`, `objectives`, `pr_achievements`, `groups` y `group_members`.
   **No debe obtener ninguna fila de otros usuarios.**
3. Intenta `join_group` con un código inventado: debe fallar.
4. Comprueba que una cuenta de GoHub sigue viendo a todo GoHub.

Se ejecuta tras cada migración que toque RLS.

## 5. Fase 1: landing y validación

### 5.1 Mensaje
- **Titular:** "Diario de un High Performer".
- **Línea de apoyo** (borrador): "Todo tu ejercicio, no solo el cardio, en un sitio. Y tu mes, en datos."
- **Persona:** el profesional ocupado. El texto habla de tiempo real dedicado, de constancia y de entender tu propio rendimiento.
- La landing actual habla de "high-performers" y de "competición". La competición deja de ser protagonista: se menciona como opcional al final.

### 5.2 Estructura (una página, móvil primero, editorial premium)
Mantiene la identidad actual: fondo marfil `#fffdf5`, tinta y acento vino `#26070f`, `InfinityMark`, siempre en claro.

1. **Hero:** titular, línea de apoyo, CTA "Solicitar acceso" y un mockup de móvil animado en código (registro rápido → semana).
2. **"Todo tu ejercicio":** fuerza, pádel, correr, clases… Calendario y carga muscular en capturas reales con datos ficticios.
3. **"Tu mes, en datos":** el informe mensual como pieza central (§6.2), animado.
4. **Cómo funciona, en 3 pasos:**
   - Apuntas en segundos, con esfuerzo y nota.
   - Ves tu semana y tu constancia.
   - Recibes tu informe del mes.
5. **Próximamente:** Strava. Grupos con amigos, como opción.
6. CTA repetido.
7. **Pie:** privacidad, aviso legal, contacto y selector ES/EN.

- **Sin precio** en ninguna parte.
- Los mockups son componentes React con framer-motion y datos ficticios. No hay vídeo ni datos de compañeros.
- Para los anuncios se puede grabar la animación del hero como creatividad.

### 5.3 Captura
- **Email → `waitlist`**, con:
  - `utm_source`, `utm_campaign` y `utm_content` leídos de la URL
  - `referrer` y `created_at`
- Se mantiene el flujo actual de `email_is_registered`: si el email ya tiene cuenta, lleva al login.
- **Encuesta tras el email** (saltable), guardada en `waitlist.survey`:
  - Pregunta única: "¿Cómo registras hoy tu ejercicio?"
  - Respuestas: Nada / Strava o Garmin / Apple Salud o reloj / Notas o Excel / Otra app.
- **Pantalla final:** "Te avisaremos cuando abramos tu tanda."

### 5.4 Medición
- **Analítica sin cookies** (Vercel Web Analytics) para visitas, origen y conversión.
- **Banner de consentimiento mínimo** con dos botones iguales: Aceptar y Rechazar.
  - El **píxel de Meta solo se carga si se acepta**.
  - El evento `Lead` se envía al guardar el email.
- La conversión oficial se calcula como emails ÷ visitas únicas, con los dos datos tomados de Vercel Analytics y de la base de datos. No depende del píxel.
- **Panel:** `db/consultas-validacion.sql`, con emails por día y por origen, la distribución de la encuesta y la conversión por campaña. El coste se introduce a mano.

### 5.5 Legal mínimo para la landing
- **Página de privacidad:**
  - Responsable: Jorge Modet, persona física.
  - Finalidad.
  - Base legal: consentimiento explícito para los datos de salud (art. 9.2.a del RGPD).
  - Encargados: Supabase, Vercel y Meta.
  - Derechos y email de contacto.
- **Aviso legal (LSSI)**.
- **Política de cookies** enlazada desde el banner.

### 5.6 Ejecución de anuncios
- **Meta:**
  - Un mensaje, 2–3 creatividades (hero animado, informe mensual, captura de calendario).
  - Optimización por `Lead`.
  - Audiencia: España, 28–50 años, intereses en fitness, running, pádel y gimnasio, y en emprendimiento o negocios.
- **LinkedIn orgánico:** publicaciones de Jorge contando que lo construye, con UTM propio. Se mide aparte.
- **Presupuesto y duración:** ≤ 300 € en 3–4 semanas.
- **Revisión semanal:** se apaga la creatividad con peor coste por email.

## 6. Fase 2: producto público (solo tras el go)

### 6.1 RPE por sesión
- **Base de datos:** columna `activities.rpe smallint check (rpe between 1 and 10)`, que admite nulos.
- **Interfaz:** en `LogActivityDialog`, un selector de 1 a 10, opcional, con etiquetas en los extremos ("muy suave" y "máximo"). La nota existente se mantiene.
- Strava no trae RPE, así que queda nulo y se puede editar.
- **Carga de sesión** = RPE × minutos. Se usa en el informe y, si encaja, en la tarjeta de carga actual.

### 6.2 Informe mensual compartible
**Contenido:**
- Horas y sesiones del mes, frente al mes anterior.
- Reparto por deporte.
- Constancia: días activos, mapa de calor del mes y mejor semana.
- Esfuerzo: RPE medio y carga total.
- Marcas personales batidas en el mes.

**Cuándo:**
- El **día 1 de cada mes** aparece una tarjeta destacada en Tú: "Tu octubre en Olympia".
- Se puede descartar, y después queda accesible.
- También se puede consultar el mes en curso.

**Compartir:**
- Botón Compartir → **PNG en formato story 9:16** generado en el cliente (canvas o `html-to-image`), mediante la Web Share API.
- Si el navegador no la soporta, se descarga el archivo.
- Lleva la marca "Olympia" y la URL de la landing, que sirve como marketing.

**Privacidad:** la imagen solo contiene los datos propios. No hay enlace público.

### 6.3 Onboarding (una vez, usuarios nuevos)
1. Consentimiento explícito, obligatorio, con enlace a la política. Se guarda en `privacy_accepted_at`.
2. "¿Qué deportes haces?": preselecciona los tipos en el registro rápido y se guarda en `preferred_types`.

Después se entra directamente en Tú.

### 6.4 Pestaña Tú para usuarios públicos
- Se ven **todos los módulos** desde el día 1, cada uno con un **estado vacío cuidado**. Cada estado vacío dice qué mostrará el módulo y cuántos datos necesita.
- **Registro rápido:** tipo (preseleccionado), duración y hoy por defecto. RPE, nota y músculos son opcionales.
- **Sin grupo:**
  - Se ocultan Feed y Grupos en la navegación.
  - Aparece una tarjeta en Tú o en Más: "Entrena con amigos → crear grupo / unirme con código".

### 6.5 Grupos de autoservicio
- **Crear grupo:** nombre → enlace `/join/<code>` con botón de compartir nativo.
- **Unirse con el enlace:**
  - Sin sesión: se pasa por el login y, al volver, la unión es automática.
  - Con sesión: aparece una confirmación.
- **Con ≥ 1 grupo**, Feed y Grupos aparecen como hoy.
  - Con varios grupos, Grupos lleva un selector.
  - El Feed mezcla todos los grupos.
- **Admin:** regenerar el enlace y expulsar miembros.
- El enlace de grupo **no salta la waitlist**: solo funciona con usuarios ya invitados o registrados.
  - Pendiente de decidir: ¿un enlace de grupo debería servir también como invitación? (§10)

### 6.6 Tandas desde la waitlist
- **Panel de superadmin en Más** (visible solo con `is_superadmin`):
  - Lista de la waitlist con estado, origen y respuesta de la encuesta.
  - Seleccionar N y pulsar "Invitar".
- **"Invitar":**
  - Una función serverless con service key pone el estado `invited`, la `cohort` y `invited_at`.
  - Envía la invitación de Supabase Auth (`inviteUserByEmail`).
- Al registrarse, `cohort` y `utm_*` se copian de la waitlist al perfil.
- **Tandas** de 20–30 personas, una por semana.
- A cada tanda, un email personal de Jorge. Las respuestas son research.

### 6.7 Borrado de cuenta
- En Más → "Borrar mi cuenta".
- Se confirma escribiendo el email.
- Una función serverless con service key borra el usuario de `auth.users`. El `on delete cascade` arrastra actividades, metas, objetivos, tokens y pertenencias.
- Hay que comprobarlo en staging, incluido el avatar en Storage.

### 6.8 GoHub
- **No cambia nada visible:** siguen en su grupo y ganan el RPE y el informe.
- No pasan por el onboarding. Ver §10 sobre su consentimiento.

## 7. Fuera de alcance

- Cobro, precios y preventa.
- Strava para usuarios públicos (solo aparece como "próximamente").
- Apple Salud y Health Connect, app nativa, Whoop.
- Objetivo semanal con rachas, recordatorios por email o push, email semanal.
- Registro por texto libre con IA, coach con IA, MCP.
- Rankings entre grupos y ranking global.
- Exportar datos (portabilidad): se atiende por email si alguien lo pide.
- Check-in de sueño, energía o hábitos no deportivos.
- Revelado progresivo y datos de demo en la app.
- Login con Apple y magic link.

## 8. Criterios de go / kill

Se fijan **antes** de lanzar y no se mueven después.

### 8.1 Puerta 1: landing

| Métrica | Go | Kill |
|---|---|---|
| **Conversión visita → email** (métrica decisiva) | **≥ 10 %** | < 4 % |
| Volumen mínimo para que la conversión cuente | ≥ 500 visitas únicas | — |
| Coste por email en Meta (informativo) | ≤ 2,5 € | > 6 € |
| Encuesta respondida (sobre los emails) | ≥ 40 % (informativo) | — |

- Con una conversión entre el 4 % y el 10 %: cambiar una vez el hero o la creatividad y repetir con el presupuesto que quede.
- Si sigue en esa franja, se decide a criterio, apoyado en lo que diga la encuesta.

### 8.2 Puerta 2: retención (primeras tandas)

| Métrica | Go | Kill |
|---|---|---|
| Activación: ≥ 1 actividad en 48 h | ≥ 60 % de los registrados | < 30 % |
| **Semana 4: registra ≥ 2 días a la semana** | **≥ 30 % de los activados** | < 15 % |
| Comparte al menos un informe mensual | Informativo | — |
| Crea un grupo o se une a uno | Informativo | — |

Las consultas por cohorte van en `db/consultas-validacion.sql`, calculadas a partir de `activities` y `team_members.cohort`.

## 9. Calendario orientativo

| Semana | Trabajo | Resultado |
|---|---|---|
| S1 | Staging, modelo de grupos, migración de GoHub | GoHub dentro de su grupo en staging |
| S2 | RLS, test de RLS, registro cerrado, revisión de `api/` → producción | Nadie de fuera ve datos de GoHub |
| S2–S3 | Landing: textos, mockups animados, informe de ejemplo, captura con UTM, encuesta | Landing en preview |
| S4 | Analítica, banner y píxel, páginas legales, creatividades, campaña configurada | **Anuncios en marcha** (al mes) |
| S5–S8 | Anuncios y revisión semanal | Datos de la puerta 1 |
| S8 | **Puerta 1** | Decisión documentada |
| S9–S11 | RPE, informe mensual, onboarding, grupos de autoservicio, panel de tandas, borrado | App lista para tandas |
| S11– | Una tanda por semana y entrevistas | Datos de la puerta 2 |
| S15 | **Puerta 2** (semana 4 de la primera tanda) | Decisión documentada |

## 10. Pendientes y riesgos

- **Consentimiento de GoHub:** se dijo "nada visible", pero sus datos de salud también necesitan consentimiento explícito.
  - Propuesta: un aviso único de una pantalla al abrir la app que guarde `privacy_accepted_at`.
  - Hay que confirmarlo.
- **Dominio:** "Olympia" puede chocar con marcas o dominios existentes. Antes de los anuncios:
  - Comprobar la OEPM/EUIPO en la clase 9/42.
  - Comprar un dominio (p.ej. `olympia-diario.com` o `getolympia.app`).
- **Enlaces de grupo y waitlist:** decidir si un enlace de grupo invita automáticamente a quien no tiene cuenta. Sería un canal viral, pero salta las tandas.
- **El interés no demuestra el uso:** la puerta 1 mide curiosidad. Por eso la puerta 2 es obligatoria antes de invertir en negocio.
- **Registro manual sin recordatorios:** es el mayor riesgo de abandono en la puerta 2. Si la activación va bien pero la semana 4 sale mal, lo primero que hay que probar es el email semanal.
- **Responsable persona física:** sirve para validar. Antes de cobrar, traspasarlo a una sociedad y actualizar la política.
- **Tú, de unas 1.270 líneas, con todo visible y vacío:** puede abrumar a un desconocido. Conviene vigilar la activación y revisarlo si queda por debajo del 60 %.

## 11. Qué cambia respecto al plan del 15 oct

| Antes | Ahora |
|---|---|
| Decide la retención (H2) | Decide el **interés en la landing**; la retención pasa a ser la puerta 2 |
| 3 ángulos con `?a=` | **Mensaje único**: "Diario de un High Performer" |
| Encuesta de 3 preguntas, con la de precio | **1 pregunta**; sin precio |
| Disciplina: objetivo semanal, racha, email semanal | **Informe mensual compartible** y RPE; el resto, más adelante |
| Onboarding con objetivo semanal | Consentimiento y deportes |
| "Tú" simplificada y análisis plegados | Todo visible, con estados vacíos |
| Persona sin definir | Profesional ocupado |
| Capturas estáticas | Mockups animados en código e informe como pieza central |
| Producto en paralelo a los anuncios | Producto **solo tras el go** |

Se mantienen:
- Waitlist y tandas.
- Grupos de autoservicio opcionales.
- `shares_group()` y staging.
- Meta Ads con LinkedIn orgánico.
- ≤ 300 €.
- España en ES.
- Borrado de cuenta.
