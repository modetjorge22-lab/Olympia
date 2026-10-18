// Test de aislamiento (RLS) de Olympia. Spec: .plans/olympia-lanzamiento-publico-spec.md §4.5
//
// Crea tres usuarios de prueba, comprueba que un usuario sin grupo no ve nada
// de otros, que los miembros de un grupo sí se ven entre ellos, que el registro
// está cerrado a la waitlist, y lo borra todo al terminar.
//
// Uso (contra STAGING, nunca producción):
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ANON_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/test-rls.mjs --staging
//
// Sale con código 1 si falla alguna comprobación.

import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}
if (!process.argv.includes('--staging')) {
  console.error(`Este script crea y borra usuarios en ${SUPABASE_URL}.`);
  console.error('Pásale --staging para confirmar que no es producción.');
  process.exit(2);
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, noSession);
const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, noSession);

const RUN = Date.now().toString(36);
const PASSWORD = `Rls-${RUN}-${Math.random().toString(36).slice(2)}!`;
const GROUP_NAME = `rls-test-${RUN}`;
const email = (who) => `rls-test-${RUN}-${who}@olympia-test.dev`;
const EMAILS = { a: email('a'), b: email('b'), c: email('c') };
const NOT_INVITED = email('noinvite');
const ANON_PENDING = email('pending');
const ANON_FORGED = email('forged');

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const DATA_TABLES = ['activities', 'team_members', 'goals', 'objectives', 'pr_achievements'];

async function setup() {
  console.log(`\nPreparando datos de prueba (${RUN})…`);
  await must(admin.from('waitlist').insert(
    Object.values(EMAILS).map(e => ({ email: e, status: 'invited', invited_at: new Date().toISOString(), cohort: 'rls-test' }))
  ), 'waitlist invited');

  const users = {};
  for (const [who, mail] of Object.entries(EMAILS)) {
    const created = await must(
      admin.auth.admin.createUser({ email: mail, password: PASSWORD, email_confirm: true }),
      `createUser ${who}`
    );
    const client = anon();
    await must(client.auth.signInWithPassword({ email: mail, password: PASSWORD }), `login ${who}`);
    users[who] = { id: created.user.id, email: mail, client };
    await must(client.from('team_members').insert({ user_id: created.user.id, email: mail, full_name: `RLS ${who}` }), `perfil ${who}`);
  }

  const a = users.a;
  await must(a.client.from('activities').insert({
    user_id: a.id, user_email: a.email, type: 'running', title: 'RLS test', date: new Date().toISOString().slice(0, 10), duration_minutes: 30,
  }), 'actividad A');
  const goal = await must(a.client.from('goals').insert({ user_id: a.id, user_email: a.email, title: 'RLS marca' }).select().single(), 'meta A');
  await must(a.client.from('objectives').insert({ user_id: a.id, user_email: a.email, metric: 'hours', period: 'week', target: 3 }), 'objetivo A');
  await must(a.client.from('pr_achievements').insert({
    user_id: a.id, user_email: a.email, goal_id: goal.id, goal_title: 'RLS marca', new_value: 1, unit: 'kg',
  }), 'PR A');

  const [group] = await must(a.client.rpc('create_group', { group_name: GROUP_NAME }), 'create_group');
  await must(users.c.client.rpc('join_group', { code: group.invite_code }), 'join_group C');
  return { users, group };
}

async function run({ users, group }) {
  const { a, b, c } = users;

  console.log('\nUsuario sin grupo (B) no ve datos de otros');
  for (const table of DATA_TABLES) {
    const { data, error } = await b.client.from(table).select('user_id');
    const foreign = (data || []).filter(r => r.user_id !== b.id);
    check(!error && foreign.length === 0, `${table}: 0 filas ajenas`, error?.message || `${foreign.length} filas ajenas`);
  }
  {
    const { data } = await b.client.from('groups').select('id');
    check((data || []).length === 0, 'groups: no ve ningún grupo');
    const { data: gm } = await b.client.from('group_members').select('user_id');
    check((gm || []).length === 0, 'group_members: no ve ningún miembro');
  }

  console.log('\nUsuario sin grupo (B) no puede colarse');
  {
    const { error } = await b.client.rpc('join_group', { code: 'codigo-falso' });
    check(Boolean(error), 'join_group con código inventado falla');
    const r1 = await b.client.rpc('my_group_invite', { gid: group.id });
    check(Boolean(r1.error), 'my_group_invite de un grupo ajeno falla');
    const r2 = await b.client.rpc('regenerate_invite', { gid: group.id });
    check(Boolean(r2.error), 'regenerate_invite de un grupo ajeno falla');
    const r3 = await b.client.rpc('remove_group_member', { gid: group.id, member: c.id });
    check(Boolean(r3.error), 'remove_group_member de un grupo ajeno falla');
    const r4 = await b.client.from('group_members').insert({ group_id: group.id, user_id: b.id });
    check(Boolean(r4.error), 'insertar directamente en group_members falla');
    const r5 = await b.client.from('activities').insert({
      user_id: a.id, user_email: a.email, type: 'running', title: 'falsa', date: '2026-01-01',
    });
    check(Boolean(r5.error), 'crear una actividad a nombre de otro falla');
    await b.client.from('team_members').update({ is_superadmin: true, cohort: 'hack' }).eq('user_id', b.id);
    const { data: me } = await admin.from('team_members').select('is_superadmin, cohort').eq('user_id', b.id).single();
    check(me && me.is_superadmin === false && me.cohort === 'rls-test', 'no puede hacerse superadmin ni cambiar su tanda',
      JSON.stringify(me));
  }

  console.log('\nMiembros del mismo grupo (A y C) se ven');
  {
    const { data } = await c.client.from('activities').select('id').eq('user_id', a.id);
    check((data || []).length === 1, 'C ve la actividad de A');
    const { data: tm } = await c.client.from('team_members').select('user_id');
    check((tm || []).some(r => r.user_id === a.id) && !(tm || []).some(r => r.user_id === b.id),
      'C ve el perfil de A y no el de B');
    const { data: gm } = await c.client.from('group_members').select('user_id').eq('group_id', group.id);
    check((gm || []).length === 2, 'C ve los 2 miembros del grupo');
    const { error } = await c.client.from('groups').select('invite_code');
    check(Boolean(error), 'un miembro no puede leer invite_code directamente');
    const r = await c.client.rpc('my_group_invite', { gid: group.id });
    check(Boolean(r.error), 'un miembro (no admin) no puede ver el código');
    const ra = await a.client.rpc('my_group_invite', { gid: group.id });
    check(!ra.error && ra.data === group.invite_code, 'el admin sí ve el código');
  }

  console.log('\nAdmin regenera el enlace y expulsa');
  {
    const { data: newCode, error } = await a.client.rpc('regenerate_invite', { gid: group.id });
    check(!error && newCode && newCode !== group.invite_code, 'regenerate_invite cambia el código');
    const old = await b.client.rpc('join_group', { code: group.invite_code });
    check(Boolean(old.error), 'el código viejo deja de funcionar');
    const rm = await a.client.rpc('remove_group_member', { gid: group.id, member: c.id });
    check(!rm.error, 'el admin expulsa a C', rm.error?.message);
    const { data } = await c.client.from('activities').select('id').eq('user_id', a.id);
    check((data || []).length === 0, 'C expulsado ya no ve la actividad de A');
  }

  console.log('\nWaitlist y registro cerrado');
  {
    const visitor = anon();
    const ok = await visitor.from('waitlist').insert({ email: ANON_PENDING });
    check(!ok.error, 'un visitante puede apuntarse a la waitlist', ok.error?.message);
    const forged = await visitor.from('waitlist').insert({ email: ANON_FORGED, status: 'invited' });
    check(Boolean(forged.error), 'un visitante no puede apuntarse ya invitado');
    const { data: rows } = await visitor.from('waitlist').select('email');
    check((rows || []).length === 0, 'un visitante no puede leer la waitlist');
    const signup = await visitor.auth.signUp({ email: NOT_INVITED, password: PASSWORD });
    check(Boolean(signup.error), 'registro con email no invitado falla', 'el registro se permitió');
    if (signup.error) console.log(`      (mensaje: "${signup.error.message}")`);
    const { data: w } = await admin.from('waitlist').select('status').eq('email', EMAILS.a).single();
    check(w?.status === 'joined', 'la waitlist marca como joined al crear la cuenta', w?.status);
  }
}

async function cleanup(state) {
  console.log('\nLimpiando…');
  await admin.from('groups').delete().eq('name', GROUP_NAME);
  for (const u of Object.values(state?.users || {})) {
    await admin.auth.admin.deleteUser(u.id);
  }
  // Por si el registro no invitado se hubiera colado.
  const { data: stray } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of stray?.users || []) {
    if (u.email?.startsWith(`rls-test-${RUN}-`)) await admin.auth.admin.deleteUser(u.id);
  }
  await admin.from('waitlist').delete().like('email', `rls-test-${RUN}-%`);
}

let state;
try {
  state = await setup();
  await run(state);
} catch (err) {
  console.error(`\nError inesperado: ${err.message}`);
  failures++;
} finally {
  await cleanup(state);
}

console.log(failures ? `\n✘ ${failures} comprobación(es) fallida(s)` : '\n✔ Todo correcto');
process.exit(failures ? 1 : 0);
