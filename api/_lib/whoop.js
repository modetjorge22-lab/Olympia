// Núcleo de la integración con WHOOP (API v2). Lo usan whoop-callback,
// whoop-sync y whoop-webhook. Todo corre en el servidor con service role.

export const WHOOP_API = 'https://api.prod.whoop.com/developer';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_REDIRECT_URI = 'https://olympia-navy.vercel.app/api/whoop-callback';
export const WHOOP_SCOPES = 'offline read:profile read:workout read:sleep read:recovery read:cycles';

const MIN_WORKOUT_MINUTES = 10;

// Caminar no cuenta como actividad en Olympia: se ignora del todo (ni se
// crea ni se enlaza). La "activity" genérica que WHOOP detecta sola no crea
// actividad; solo se enlaza si ya existe una sesión registrada que coincida.
const IGNORED_SPORTS = new Set(['walking']);
const PASSIVE_SPORTS = new Set(['activity']);
const MATCH_TOLERANCE_MINUTES = 15;

const TYPE_LABELS = {
  running: 'Running', cycling: 'Ciclismo', swimming: 'Natación',
  hiking: 'Senderismo', strength_training: 'Fuerza', yoga: 'Yoga', pilates: 'Pilates',
  tennis: 'Tenis', padel: 'Pádel', football: 'Fútbol',
  martial_arts: 'Artes marciales', golf: 'Golf', other: 'Otro',
};

// WHOOP no documenta la lista de sport_name; se casan por palabras clave.
// El orden importa: "padel tennis" tiene que caer en pádel antes que en tenis.
const SPORT_RULES = [
  [/padel|pádel/, 'padel'],
  [/tennis|squash|pickleball|badminton/, 'tennis'],
  [/soccer|football|futbol/, 'football'],
  [/run|track/, 'running'],
  [/cycl|bik|spin|peloton/, 'cycling'],
  [/swim/, 'swimming'],
  [/walk|hik|ruck/, 'hiking'],
  [/weight|lift|strength|functional|crossfit|hiit|calisthenic|f45|barry/, 'strength_training'],
  [/pilates/, 'pilates'],
  [/yoga|stretch|mobility/, 'yoga'],
  [/box|martial|jiu|judo|mma|muay|karate|wrestl/, 'martial_arts'],
  [/golf/, 'golf'],
];

export function mapSport(sportName) {
  const s = String(sportName || '').toLowerCase();
  for (const [re, type] of SPORT_RULES) if (re.test(s)) return type;
  return 'other';
}

// Fecha local (YYYY-MM-DD) de un instante UTC con el offset que da WHOOP ("+01:00").
export function localDate(iso, offset) {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset || '');
  const mins = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(new Date(iso).getTime() + mins * 60000).toISOString().slice(0, 10);
}

// ── Tokens ──

export async function exchangeCode(code) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: WHOOP_REDIRECT_URI,
  });
}

async function tokenRequest(params) {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`whoop_token_${res.status}: ${data.error || ''}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export class ReconnectRequired extends Error {
  constructor() { super('reconnect_required'); this.code = 'reconnect_required'; }
}

// WHOOP rota el refresh token en cada uso e invalida el anterior. Si dos
// procesos refrescan a la vez (webhook + sync), el segundo falla: entonces se
// relee la fila por si el otro ya dejó un token nuevo.
async function refreshAccess(sb, row) {
  try {
    const data = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
      scope: 'offline',
    });
    const update = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || row.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      updated_at: new Date().toISOString(),
    };
    await sb.from('whoop_tokens').update(update).eq('id', row.id);
    Object.assign(row, update);
    return row.access_token;
  } catch (err) {
    const { data: fresh } = await sb.from('whoop_tokens').select('*').eq('id', row.id).maybeSingle();
    if (fresh && fresh.refresh_token !== row.refresh_token && fresh.expires_at > nowSec() + 60) {
      Object.assign(row, fresh);
      return row.access_token;
    }
    console.error('[whoop] refresh failed for', row.user_email, err.message);
    throw new ReconnectRequired();
  }
}

const nowSec = () => Math.floor(Date.now() / 1000);

export async function accessTokenFor(sb, row) {
  if (row.expires_at > nowSec() + 60) return row.access_token;
  if (!row.refresh_token) throw new ReconnectRequired();
  return refreshAccess(sb, row);
}

// GET autenticado con un reintento tras refrescar si WHOOP responde 401.
export async function whoopGet(sb, row, path) {
  let token = await accessTokenFor(sb, row);
  let res = await fetch(`${WHOOP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 && row.refresh_token) {
    row.expires_at = 0;
    token = await refreshAccess(sb, row);
    res = await fetch(`${WHOOP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  if (res.status === 401) throw new ReconnectRequired();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`whoop_api_${res.status} ${path}`);
  return res.json();
}

async function collectAll(sb, row, path, startIso) {
  const out = [];
  let next = null;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ limit: '25', start: startIso });
    if (next) qs.set('nextToken', next);
    const data = await whoopGet(sb, row, `${path}?${qs}`);
    out.push(...(data?.records || []));
    next = data?.next_token;
    if (!next) break;
  }
  return out;
}

// ── Entrenos → actividades ──

export async function importWorkout(sb, row, w) {
  if (!w || w.score_state !== 'SCORED') return 'pending';
  const minutes = Math.round((new Date(w.end) - new Date(w.start)) / 60000);
  if (minutes < MIN_WORKOUT_MINUTES) return 'short';
  if (IGNORED_SPORTS.has(String(w.sport_name || '').toLowerCase())) {
    // Por si se importó antes de esta regla.
    await removeWorkout(sb, w.id);
    return 'ignored';
  }

  const type = mapSport(w.sport_name);
  const date = localDate(w.start, w.timezone_offset);
  const s = w.score || {};
  const whoopData = {
    sport_name: w.sport_name,
    start: w.start,
    end: w.end,
    strain: s.strain ?? null,
    avg_hr: s.average_heart_rate ?? null,
    max_hr: s.max_heart_rate ?? null,
    kilojoule: s.kilojoule ?? null,
    zones: s.zone_durations ?? null,
  };
  const numbers = {
    duration_minutes: minutes,
    calories_burned: s.kilojoule ? Math.round(s.kilojoule / 4.184) : null,
    distance_km: s.distance_meter ? +(s.distance_meter / 1000).toFixed(2) : null,
  };

  // 1. Ya importado: refresca métricas (las cifras solo si no lo editó el usuario).
  const { data: linked } = await sb.from('activities')
    .select('id, source, manually_edited').eq('whoop_id', w.id).maybeSingle();
  // El usuario la borró a propósito: no se vuelve a crear.
  if (!linked) {
    const { data: dismissed } = await sb.from('whoop_dismissed').select('whoop_id').eq('whoop_id', w.id).maybeSingle();
    if (dismissed) return 'dismissed';
  }

  if (linked) {
    const patch = { whoop_data: whoopData };
    if (linked.source === 'whoop' && !linked.manually_edited) Object.assign(patch, numbers, { type, title: TYPE_LABELS[type], date });
    await sb.from('activities').update(patch).eq('id', linked.id);
    return 'updated';
  }

  // 2. Misma sesión ya registrada (a mano o desde Strava): solo se enlaza.
  const { data: sameDay } = await sb.from('activities')
    .select('id, duration_minutes').eq('user_email', row.user_email)
    .eq('date', date).eq('type', type).is('whoop_id', null);
  const match = (sameDay || []).find(a => Math.abs((a.duration_minutes || 0) - minutes) <= MATCH_TOLERANCE_MINUTES);
  if (match) {
    await sb.from('activities').update({ whoop_id: w.id, whoop_data: whoopData }).eq('id', match.id);
    return 'linked';
  }

  if (PASSIVE_SPORTS.has(String(w.sport_name || '').toLowerCase())) return 'passive';

  // 3. Nueva. Si había un plan para ese día y tipo, se cumple y su nota da el nombre.
  const { data: plans } = await sb.from('weekly_plans')
    .select('id, notes').eq('user_email', row.user_email)
    .eq('date', date).eq('activity_type', type).limit(1);
  const plan = plans?.[0];

  const { error } = await sb.from('activities').insert({
    user_id: row.user_id,
    user_email: row.user_email,
    type,
    title: TYPE_LABELS[type],
    description: plan?.notes || null,
    date,
    ...numbers,
    source: 'whoop',
    whoop_id: w.id,
    whoop_data: whoopData,
    completed: true,
  });
  if (error) {
    // Carrera con otro proceso que ya lo insertó: no es un fallo.
    if (error.code === '23505') return 'updated';
    throw new Error(`insert_activity: ${error.message}`);
  }
  if (plan) await sb.from('weekly_plans').delete().eq('id', plan.id);
  return 'imported';
}

export async function removeWorkout(sb, whoopId) {
  // Si la creó WHOOP, se borra; si estaba enlazada a otra, solo se desenlaza.
  await sb.from('activities').delete().eq('whoop_id', whoopId).eq('source', 'whoop').or('manually_edited.is.null,manually_edited.eq.false');
  await sb.from('activities').update({ whoop_id: null, whoop_data: null }).eq('whoop_id', whoopId);
}

// ── Sueño + recuperación (privado: RLS solo deja verlo a su dueño) ──

export async function importSleep(sb, row, sleep, recovery) {
  if (!sleep || sleep.nap || sleep.score_state !== 'SCORED') return 'skipped';
  const st = sleep.score?.stage_summary || {};
  const asleep = (st.total_in_bed_time_milli || 0) - (st.total_awake_time_milli || 0) - (st.total_no_data_time_milli || 0);
  const min = ms => (ms ? Math.round(ms / 60000) : null);

  if (recovery === undefined && sleep.cycle_id) {
    recovery = await whoopGet(sb, row, `/v2/cycle/${sleep.cycle_id}/recovery`).catch(() => null);
  }
  const rs = recovery?.score_state === 'SCORED' ? recovery.score : null;

  const record = {
    user_id: row.user_id,
    user_email: row.user_email,
    whoop_sleep_id: sleep.id,
    cycle_id: sleep.cycle_id ?? null,
    date: localDate(sleep.end, sleep.timezone_offset),
    duration_minutes: min(asleep),
    efficiency: sleep.score?.sleep_efficiency_percentage ?? null,
    sleep_performance: sleep.score?.sleep_performance_percentage ?? null,
    respiratory_rate: sleep.score?.respiratory_rate ?? null,
    rem_minutes: min(st.total_rem_sleep_time_milli),
    deep_minutes: min(st.total_slow_wave_sleep_time_milli),
    light_minutes: min(st.total_light_sleep_time_milli),
    awake_minutes: min(st.total_awake_time_milli),
    score: rs?.recovery_score ?? null,
    recovery_score: rs?.recovery_score ?? null,
    hrv_ms: rs?.hrv_rmssd_milli ?? null,
    resting_hr: rs?.resting_heart_rate ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from('whoop_sleep').upsert(record, { onConflict: 'whoop_sleep_id' });
  if (error) throw new Error(`upsert_sleep: ${error.message}`);
  return 'imported';
}

// ── Sincronización completa (al conectar, al abrir la app y como red de seguridad) ──

// days: entrenos. sleepDays: sueño y recuperación (puede ir más atrás para
// alinear con las 16 semanas de actividad sin rellenar el historial con
// entrenos antiguos duplicados).
export async function fullSync(sb, row, days = 30, { sleepDays = days } = {}) {
  const iso = n => new Date(Date.now() - n * 86400000).toISOString();
  const [workouts, sleeps, recoveries] = await Promise.all([
    collectAll(sb, row, '/v2/activity/workout', iso(days)),
    collectAll(sb, row, '/v2/activity/sleep', iso(Math.max(days, sleepDays))),
    collectAll(sb, row, '/v2/recovery', iso(Math.max(days, sleepDays))),
  ]);

  const counts = { imported: 0, linked: 0, updated: 0, sleeps: 0 };
  // Del más antiguo al más reciente, para que los planes se consuman en orden.
  for (const w of workouts.reverse()) {
    const r = await importWorkout(sb, row, w);
    if (r in counts) counts[r]++;
  }
  const recBySleep = new Map(recoveries.map(r => [r.sleep_id, r]));
  for (const s of sleeps) {
    if ((await importSleep(sb, row, s, recBySleep.get(s.id) ?? null)) === 'imported') counts.sleeps++;
  }

  await sb.from('whoop_tokens').update({ updated_at: new Date().toISOString() }).eq('id', row.id);
  return counts;
}

export async function revokeAccess(sb, row) {
  try {
    const token = await accessTokenFor(sb, row);
    await fetch(`${WHOOP_API}/v2/user/access`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.warn('[whoop] revoke failed (se borra igualmente):', err.message);
  }
}
