# Olympia: validar el interés de usuarios individuales

*Plan del 15 oct 2026. Sustituye en parte a `olympia-grupos-y-apertura-spec.md` (ver §8).*

## 1. La pregunta

> ¿Hay gente, fuera de mi entorno, que use Olympia para **registrar a mano y con disciplina** el tiempo que dedica al
> ejercicio, sin que nadie se lo pida?

Esto encierra dos hipótesis distintas, y se validan en este orden:

| # | Hipótesis | Cómo se mide | Coste de equivocarse |
|---|---|---|---|
| H1 | La propuesta despierta interés en desconocidos | Landing con anuncios: coste por email y respuesta a la encuesta | Bajo (anuncios) |
| H2 | Quien entra mantiene el hábito de registrar a mano | Retención por cohortes en la app | Alto (semanas de desarrollo) |

H1 es barata y rápida, así que va primero. Pero el interés no demuestra el uso: H2 es la que de verdad importa.

## 2. Supuestos de partida (pendientes de confirmar)

| Supuesto | Valor por defecto | Si cambia… |
|---|---|---|
| Presupuesto de Meta Ads | ≤ 300 € en la fase A | Con más presupuesto se pueden comparar audiencias, no solo mensajes |
| Disposición a pagar | Señal ligera: una pregunta en la encuesta | Si se quiere preventa, hace falta Stripe y otra landing |
| Crear grupos | Autoservicio: quien lo crea es admin e invita por enlace | Si solo lo controla Jorge, sobra la UI de crear grupo |
| Plazo | Landing con anuncios en 2–3 semanas | — |
| Mercado | España, landing en ES (EN se mantiene) | — |

Decisiones ya tomadas por Jorge:
- Validación en dos fases.
- Acceso mediante waitlist, abriendo por tandas.
- Tráfico desde Meta Ads y LinkedIn.
- Modo individual = pestaña "Tú" simplificada, con Grupos como opción.

## 3. Criterios de go / kill

Son propuestas: hay que fijarlas **antes** de lanzar para no moverlas a posteriori.

**Fase A: landing (H1)**

| Métrica | Go | Kill |
|---|---|---|
| Coste por email (Meta) | ≤ 2 € | > 5 € después de probar 3 mensajes |
| Conversión visita → email | ≥ 8 % | < 3 % |
| Encuesta completada (sobre los emails) | ≥ 40 % | — |
| Emails en total | ≥ 150 en 3–4 semanas | < 50 |

**Fase B: app por tandas (H2)**

| Métrica | Go | Kill |
|---|---|---|
| Activación: ≥ 1 actividad en las primeras 48 h | ≥ 60 % de los invitados que se registran | < 30 % |
| Disciplina en la semana 4: registra ≥ 3 días/semana | ≥ 40 % de los activados | < 20 % |
| Lo usan sin grupo (retención de los que no tienen grupo) | ≥ 25 % en la semana 4 | — |

Con un resultado intermedio: entrevistar a 5 personas que siguen y a 5 que abandonaron antes de decidir nada.

## 4. Paso 0: cerrar el acceso (bloqueante, antes de cualquier anuncio)

Hoy `/login` permite crear una cuenta a cualquiera, y la RLS `USING (true)` deja ver las actividades, metas y perfiles de
todos los usuarios. Con anuncios, un desconocido vería los datos del equipo de GoHub.

- **Lista de acceso:** tabla `access_allowlist(email)`, o bien columna `waitlist.status` (`pending | invited | joined`).
  El registro solo prospera si el email está invitado.
  - Se controla con un *Before User Created* auth hook de Supabase.
  - Si no se usa el hook: RLS que exige una fila en `profiles` con `approved = true`.
- **Visibilidad mínima inmediata:** que las políticas `SELECT` exijan compartir grupo (`shares_group()`, ver §6.1).
  Mientras no exista el modelo de grupos, como parche: solo se ven los usuarios con `approved`.
- **Probarlo:** con una cuenta nueva no invitada, desde la consola, no se puede leer nada de GoHub.

## 5. Fase A: landing de validación

### 5.1 Mensaje

La landing actual habla de "high-performers" y "competición". Para H1 el mensaje tiene que nombrar el trabajo concreto:
**saber cuánto tiempo dedicas de verdad al ejercicio y sostener el hábito**.

Se prueban 3 ángulos, uno por cada conjunto de anuncios:

| Ángulo | Titular de trabajo | A quién apela |
|---|---|---|
| Disciplina | "Cada hora cuenta. Apúntala." | Gente constante a la que le gusta medir |
| Visión completa | "Gimnasio, pádel, correr: todo tu ejercicio en un sitio" | Quien hace varios deportes y Strava se le queda corto |
| Social | "Compite en constancia con tus amigos" | Grupos de amigos o de trabajo |

Cada ángulo lleva a la misma landing con `?a=disciplina|vision|social`. La landing adapta el titular a ese parámetro.

### 5.2 Estructura de la landing (una sola página, móvil primero)

1. Titular según el ángulo, una línea de apoyo y el CTA "Solicitar acceso".
2. Tres capturas reales de la app: semana, calendario y carrera, con datos de ejemplo, nunca de compañeros.
3. Cómo funciona en 3 pasos: apuntas en 10 segundos, ves tu semana y tu constancia, y opcionalmente compites con tu grupo.
4. CTA repetido.
5. Pie: privacidad, contacto y selector ES/EN.

### 5.3 Captura de datos y encuesta

- El email entra en `waitlist`, como ahora, y además se guardan `utm_source`, `utm_campaign`, `angle` y `created_at`.
- Justo después del email, una encuesta de 3 preguntas, saltable, guardada en `waitlist.survey jsonb`:
  1. ¿Cómo registras hoy tu ejercicio? (Nada / Strava o Garmin / Notas o Excel / Otra app)
  2. ¿Qué haces sobre todo? (Gimnasio / Correr o bici / Pádel o raqueta / Varios)
  3. ¿Pagarías 3 €/mes por esto? (Sí / Quizá / No): es la señal ligera de precio.
- Además, opcionalmente: "¿Te unirías con un grupo? Escribe el nombre" para detectar grupos que llegan juntos.

### 5.4 Medición

- **Analítica sin cookies:** Vercel Web Analytics o Plausible, para visitas, origen y conversión. No necesita banner.
- **Píxel de Meta:** imprescindible para optimizar los anuncios por conversión.
  - En España exige **consentimiento previo** (AEPD): hace falta un banner mínimo y el píxel solo se carga si se acepta.
  - El evento `Lead` se envía al guardar el email.
  - Sin consentimiento se pierde parte de la atribución. Lo compensan los UTM guardados en la base de datos.
- **Panel:** una consulta SQL en `db/` que agrupe por ángulo y origen: emails, encuestas, coste (se introduce a mano).

### 5.5 Ejecución

- 3 conjuntos de anuncios × 1 creatividad cada uno, con unos 100 € por ángulo.
- Optimización por `Lead`. Audiencia: España, 25–45 años, intereses en fitness, running y pádel.
- LinkedIn: 2 publicaciones orgánicas de Jorge contando que lo construye, con UTM propio. Se mide aparte de Meta.
- Duración: 2–3 semanas. Revisión semanal: se apaga el ángulo con el peor coste por email.

## 6. Fase B: la app por tandas

### 6.1 Modelo de datos

Basado en `olympia-grupos-y-apertura-spec.md` §4.1, con dos cambios: los grupos son de autoservicio y el usuario puede no tener grupo.

```sql
profiles            -- sustituye a team_members como perfil global
  user_id pk, email, full_name, nickname, avatar_url,
  approved boolean, onboarded_at, weekly_target_hours numeric,
  global_ranking_opt_in boolean default false, privacy_accepted_at

groups              (id, name, invite_code unique, created_by, created_at)
group_members       (group_id, user_id, role admin|member, joined_at)
```

- `shares_group(other)` es `true` si `other = auth.uid()` o si los dos comparten algún grupo.
  Se aplica a `activities`, `goals`, `objectives`, `pr_achievements` y `profiles`.
- RPC `create_group(name)` crea el grupo y mete al creador como admin.
- RPC `join_group(code)` une al usuario por código. El cliente nunca puede listar los grupos ni sus códigos.
- Migración: el grupo "GoHub" con todos los miembros actuales; Jorge como admin.

### 6.2 Abrir por tandas

- Tandas de 20–30 personas, una por semana. En cada tanda se mezclan los 3 ángulos, para comparar su retención.
- Invitar: un script SQL o un botón de superadmin en "Más" que marca a N personas de `waitlist` como `invited` y les
  envía un magic link de Supabase (invitación por email).
- A cada tanda, un email de bienvenida personal de Jorge. Las respuestas a ese email son research.

### 6.3 Modo individual (pestaña "Tú" simplificada)

Objetivo: que alguien solo, sin grupo, registre en 10 segundos y vea su constancia.

- **Onboarding** (3 pantallas, una vez):
  1. Nombre.
  2. ¿Qué deportes haces? (preselecciona los tipos de actividad).
  3. Objetivo semanal en horas, que crea un `objective` de horas por semana.
- **Arriba de "Tú":**
  - Progreso de la semana frente al objetivo.
  - Racha de semanas cumplidas.
  - Botón grande de "Apuntar".
- **Registro rápido:** tipo, duración y hoy por defecto, en 3 toques. Los grupos musculares y los detalles son opcionales y van plegados.
- **Lo avanzado** (carga muscular, ritmo estacional, fuerza, gráficas reordenables) va en una sección "Más análisis"
  plegada, o aparece a partir de unas 2 semanas de datos. No se borra nada.
- **Navegación sin grupo:** se ocultan Feed y Grupos. En su lugar, una tarjeta en "Tú" con "Compite con tus amigos →
  crear grupo / unirme con código".

### 6.4 Grupos (opcional, autoservicio)

- Crear grupo: nombre. Al crearlo, enlace para compartir (`/join/<code>`), con botón de compartir nativo del móvil.
- Unirse: con el enlace, o con el código desde la tarjeta de "Tú".
- Al tener ≥ 1 grupo aparecen Feed y Grupos, como hoy.
- Con varios grupos, Grupos lleva selector y el Feed mezcla todos.
- Admin: regenerar el enlace y expulsar. Ranking entre grupos y ranking global: **fuera de esta fase**.

### 6.5 Instrumentación de la retención

No hace falta herramienta de producto: todo sale de `activities` y `profiles`.
- `db/consultas-validacion.sql` con:
  - Activación a 48 h por tanda y por ángulo.
  - Días activos por semana desde el alta (semanas 1–4).
  - Porcentaje con ≥ 3 días en la semana 4.
  - Porcentaje que creó un grupo o se unió a uno.
- Añadir `profiles.cohort` (tanda) y copiar `angle` y `utm_*` desde `waitlist` al registrarse.

### 6.6 Recordatorio (el riesgo principal de H2)

El registro manual muere por olvido, no por fricción.
- Mínimo: email semanal el domingo con "tu semana: X h de Y". Se envía con un cron de Vercel y Resend.
- Las notificaciones push en iOS solo funcionan con la PWA instalada en la pantalla de inicio. Por eso hay que pedir la
  instalación en el onboarding, pero no depender de ella.

### 6.7 Mínimos legales (datos de actividad física: categoría especial en el RGPD)

- Casilla de consentimiento en el registro, guardada en `privacy_accepted_at`.
- Página de privacidad (responsable, encargados: Supabase, Vercel, Meta, Resend).
- Borrar la cuenta desde "Más".

## 7. Calendario orientativo

| Semana | Trabajo | Resultado |
|---|---|---|
| S1 | Paso 0 (cerrar el acceso) y staging de Supabase | Nadie de fuera ve datos de GoHub |
| S1–S2 | Landing: ángulos, capturas, encuesta, UTM, analítica, banner y píxel | Landing lista |
| S3–S5 | **Fase A en marcha** (anuncios). En paralelo: modelo de grupos, RLS, onboarding, "Tú" simplificada | Datos de H1 |
| S5 | Go / kill de H1 | Decisión documentada |
| S6–S7 | Crear/unirse a grupo, email semanal, consultas de retención, privacidad y borrado | App lista para tandas |
| S7–S11 | **Fase B**: una tanda por semana, entrevistas | Datos de H2 |
| S11 | Go / kill de H2 (semana 4 de la primera tanda) | Decisión documentada |

Si H1 da kill, se para antes de construir §6.3–6.6. Lo único que se habrá hecho es el paso 0, que hace falta de todos modos.

## 8. Qué cambia respecto a la spec anterior

| Antes (`olympia-grupos-y-apertura-spec.md`) | Ahora |
|---|---|
| Siguiente usuario: otra empresa | Usuarios individuales que llegan por anuncios |
| Solo Jorge crea grupos | Autoservicio (supuesto, §2) |
| Grupo obligatorio implícito | El grupo es opcional; la app tiene que valer en solitario |
| Rankings entre grupos y global | Aplazados hasta después de H2 |
| MCP en enero | Sin cambios; tiene más sentido si H2 sale bien |

Se mantienen: el modelo `groups` / `group_members`, `shares_group()`, la invitación por enlace, staging y la limpieza de
tablas antiguas.

## 9. Fuera de alcance

- Cobro real.
- App nativa.
- Integración con Whoop.
- MCP.
- Rankings entre grupos y global.
- Antitrampas.
- Rediseño visual más allá de la landing y del modo individual.
