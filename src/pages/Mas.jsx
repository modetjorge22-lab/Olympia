import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useData } from '@/lib/DataContext';
import { LogOut, Check, Loader2, RefreshCw, AlertCircle, Camera, Moon, Sun } from 'lucide-react';
import { Button, SectionTitle } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { apiPost, startOAuth } from '@/lib/api';

const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';

export default function Mas() {
 const { mode, setMode } = useTheme();
 const { user, signOut } = useAuth();
 const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
 const [searchParams] = useSearchParams();

 const [stravaConnected, setStravaConnected] = useState(false);
 const [syncing, setSyncing] = useState(false);
 const [syncResult, setSyncResult] = useState(null);
 const [stravaStatus, setStravaStatus] = useState(null);

 const [whoopConnected, setWhoopConnected] = useState(false);
 const [whoopSyncing, setWhoopSyncing] = useState(false);
 const [whoopSyncResult, setWhoopSyncResult] = useState(null);
 const [whoopStatus, setWhoopStatus] = useState(null);

 useEffect(() => {
 const stravaParam = searchParams.get('strava');
 if (stravaParam === 'success') setStravaStatus('success');
 else if (stravaParam === 'error') setStravaStatus('error');
 const whoopParam = searchParams.get('whoop');
 if (whoopParam === 'success') {
 setWhoopStatus('success');
 const w = searchParams.get('w');
 const s = searchParams.get('s');
 if (w !== null && s !== null) setWhoopSyncResult({ type: 'success', message: whoopSummary(+w, +s) });
 }
 else if (whoopParam === 'error') setWhoopStatus('error');
 }, [searchParams]);

 useEffect(() => {
 async function checkConnections() {
 if (!user?.email) return;
 const [strava, whoop] = await Promise.all([
 supabase.from('strava_tokens').select('id').eq('user_email', user.email).limit(1),
 supabase.from('team_members').select('whoop_connected').eq('email', user.email).limit(1),
 ]);
 setStravaConnected(strava.data?.length > 0);
 setWhoopConnected(Boolean(whoop.data?.[0]?.whoop_connected));
 }
 checkConnections();
 }, [user, stravaStatus, whoopStatus]);

 const connectStrava = () => {
 window.location.href = `/api/strava-auth?email=${encodeURIComponent(user.email)}`;
 };

 const disconnectStrava = async () => {
 try {
 await supabase.from('strava_tokens').delete().eq('user_email', user.email);
 } catch (err) {
 console.error('Error disconnecting Strava:', err);
 }
 setStravaConnected(false);
 setSyncResult(null);
 };

 const connectWhoop = async () => {
 setWhoopStatus(null);
 try {
 await startOAuth('/api/whoop-auth');
 } catch (err) {
 console.error('Error connecting WHOOP:', err);
 setWhoopStatus('error');
 }
 };

 const disconnectWhoop = async () => {
 try {
 const response = await apiPost('/api/whoop-sync', { action: 'disconnect' });
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 setWhoopConnected(false);
 setWhoopStatus(null);
 setWhoopSyncResult(null);
 refreshMembers();
 } catch (err) {
 console.error('Error disconnecting WHOOP:', err);
 setWhoopSyncResult({ type: 'error', message: 'No se pudo desconectar WHOOP' });
 }
 };

 const syncWhoop = async () => {
 setWhoopSyncing(true);
 setWhoopSyncResult(null);
 try {
 const response = await apiPost('/api/whoop-sync', { action: 'sync', days: 30 });
 const data = await response.json().catch(() => ({}));
 if (response.ok) {
 setWhoopSyncResult({ type: 'success', message: whoopSummary(data.imported + data.linked, data.sleeps) });
 if (data.imported || data.linked) refreshData();
 } else if (response.status === 401 || data.error === 'reconnect_required') {
 setWhoopConnected(false);
 setWhoopSyncResult({ type: 'error', message: 'Vuelve a conectar WHOOP para seguir sincronizando' });
 } else {
 setWhoopSyncResult({ type: 'error', message: data.message || data.error || 'Error al sincronizar' });
 }
 } catch (err) {
 setWhoopSyncResult({ type: 'error', message: 'Error de conexión' });
 } finally {
 setWhoopSyncing(false);
 }
 };

 const syncStrava = async () => {
 setSyncing(true);
 setSyncResult(null);
 try {
 const response = await fetch('/api/strava-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
 const data = await response.json();
 if (response.ok) {
 setSyncResult({ type: 'success', message: `${data.imported} actividades importadas` });
 refreshData();
 } else if (response.status === 401 || data.error === 'reconnect_required') {
 setStravaConnected(false);
 setSyncResult({ type: 'error', message: 'Token expirado. Reconecta Strava para continuar.' });
 } else {
 setSyncResult({ type: 'error', message: data.message || data.error || 'Error al sincronizar' });
 }
 } catch (err) {
 setSyncResult({ type: 'error', message: 'Error de conexión' });
 } finally {
 setSyncing(false);
 }
 };

 const { refresh: refreshData } = useData();
 const { myProfile, upsertProfile, refresh: refreshMembers } = useTeamMembers();
 const fileInputRef = useRef(null);
 const [uploadingAvatar, setUploadingAvatar] = useState(false);
 const [avatarError, setAvatarError] = useState(null);

 const avatarUrl = myProfile?.avatar_url || null;

 const handleAvatarClick = () => {
 fileInputRef.current?.click();
 };

 const handleAvatarChange = async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Validaciones básicas
 if (!file.type.startsWith('image/')) {
 setAvatarError('Solo imágenes');
 setTimeout(() => setAvatarError(null), 3000);
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 setAvatarError('Máx 5MB');
 setTimeout(() => setAvatarError(null), 3000);
 return;
 }

 setUploadingAvatar(true);
 setAvatarError(null);

 try {
 // Usar user.id como carpeta para que la policy "own folder" funcione
 const ext = file.name.split('.').pop().toLowerCase();
 const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;

 // Upload a Supabase Storage
 const { error: uploadError } = await supabase.storage
 .from('avatars')
 .upload(fileName, file, {
 cacheControl: '3600',
 upsert: true,
 });

 if (uploadError) throw uploadError;

 // Public URL
 const { data: urlData } = supabase.storage
 .from('avatars')
 .getPublicUrl(fileName);

 const publicUrl = urlData.publicUrl;

 // Guardar en team_members
 await upsertProfile({
 full_name: user.user_metadata?.full_name || user.email.split('@')[0],
 avatar_url: publicUrl,
 });

 await refreshMembers();
 } catch (err) {
 console.error('Avatar upload error:', err);
 setAvatarError(err.message || 'Error al subir');
 setTimeout(() => setAvatarError(null), 4000);
 } finally {
 setUploadingAvatar(false);
 // Limpiar input para permitir re-seleccionar el mismo archivo
 if (fileInputRef.current) fileInputRef.current.value = '';
 }
 };

 const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

 return (
 <div className="px-4 py-5 max-w-lg mx-auto">
 {/* Perfil */}
 <div className="flex items-center gap-4 pb-6">
 <button
 onClick={handleAvatarClick}
 disabled={uploadingAvatar}
 aria-label="Cambiar foto de perfil"
 className="o-press relative flex-shrink-0"
 >
 {avatarUrl ? (
 <img src={avatarUrl} alt={userName} className="w-14 h-14 rounded-full object-cover img-outline" />
 ) : (
 <div className="w-14 h-14 rounded-full flex items-center justify-center text-[17px]"
 style={{ background: INK(0.08), color: INK(0.9) }}>
 {initials}
 </div>
 )}
 <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
 style={{ background: ACCENT, border: '2px solid var(--bg)' }}>
 {uploadingAvatar
 ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: ON_ACCENT }} />
 : <Camera className="w-3 h-3" style={{ color: ON_ACCENT }} />}
 </div>
 <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
 </button>
 <div className="flex-1 min-w-0">
 <p className="truncate" style={{ fontSize: 'var(--fs-metric)', letterSpacing: 'var(--tracking-title)', color: INK(0.95) }}>{userName}</p>
 <p className="truncate mt-0.5" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-meta)', color: INK(0.45) }}>{user?.email}</p>
 {avatarError && <StatusLine type="error">{avatarError}</StatusLine>}
 </div>
 </div>

 {/* Apariencia */}
 <section className="py-5" style={DIVIDER}>
 <SectionTitle>Apariencia</SectionTitle>
 <Segmented
 value={mode}
 onChange={setMode}
 options={[['dark', 'Oscuro', Moon], ['light', 'Claro', Sun]]}
 />
 </section>

 {/* Integraciones */}
 <section className="pt-5" style={DIVIDER}>
 <SectionTitle className="mb-1">Integraciones</SectionTitle>
 <IntegrationRow
 logo={<svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="#fc4c02" aria-hidden="true"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>}
 name="Strava"
 detail={stravaConnected ? 'Conectado' : 'Importa tus actividades'}
 connected={stravaConnected}
 syncing={syncing}
 onConnect={connectStrava}
 onSync={syncStrava}
 onDisconnect={disconnectStrava}
 >
 {stravaStatus === 'success' && <StatusLine type="success">Strava conectado</StatusLine>}
 {stravaStatus === 'error' && <StatusLine type="error">No se pudo conectar Strava</StatusLine>}
 {syncResult && <StatusLine type={syncResult.type}>{syncResult.message}</StatusLine>}
 </IntegrationRow>
 <div style={{ height: 1, background: INK(0.06) }} />
 <IntegrationRow
 logo={<span className="text-[14px]" style={{ color: '#2dd4bf' }} aria-hidden="true">W</span>}
 name="WHOOP"
 detail={whoopConnected ? 'Conectado · entrenos, sueño y recuperación' : 'Importa entrenos, sueño y recuperación'}
 connected={whoopConnected}
 syncing={whoopSyncing}
 onConnect={connectWhoop}
 onSync={syncWhoop}
 onDisconnect={disconnectWhoop}
 >
 <p className="mt-2 text-[11px]" style={{ color: INK(0.45) }}>
 Tus entrenos de WHOOP aparecen como actividades y el grupo los ve. Sueño y recuperación son solo para ti.
 </p>
 {whoopStatus === 'success' && <StatusLine type="success">WHOOP conectado</StatusLine>}
 {whoopStatus === 'error' && <StatusLine type="error">No se pudo conectar WHOOP</StatusLine>}
 {whoopSyncResult && <StatusLine type={whoopSyncResult.type}>{whoopSyncResult.message}</StatusLine>}
 </IntegrationRow>
 </section>

 {/* Sesión */}
 <section className="pt-5" style={DIVIDER}>
 <button onClick={signOut} className="o-press w-full flex items-center gap-3 py-2">
 <LogOut className="w-4 h-4" style={{ color: 'var(--danger)' }} />
 <span className="text-[13px]" style={{ color: 'var(--danger)' }}>Cerrar sesión</span>
 </button>
 </section>
 </div>
 );
}

const INK = a => `rgba(var(--ink),${a})`;

// «3 entrenos · 12 noches»: cifras primero (voz del sistema).
function whoopSummary(workouts = 0, nights = 0) {
 const w = `${workouts} ${workouts === 1 ? 'entreno' : 'entrenos'}`;
 const n = `${nights} ${nights === 1 ? 'noche' : 'noches'}`;
 return `${w} · ${n}`;
}
const DIVIDER = { borderTop: '1px solid rgba(var(--ink),0.12)' };

// Selector segmentado del sistema: contenedor ink .06 y píldora activa ink .1
// que se desliza (transform en el compositor, 420 ms).
function Segmented({ value, onChange, options }) {
 const idx = Math.max(0, options.findIndex(([k]) => k === value));
 return (
 <div role="radiogroup" className="relative grid p-1 rounded-full"
 style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)`, background: INK(0.06) }}>
 <span aria-hidden="true" className="absolute top-1 bottom-1 left-1 rounded-full"
 style={{
 width: `calc((100% - 8px) / ${options.length})`,
 transform: `translateX(${idx * 100}%)`,
 transition: 'transform 420ms cubic-bezier(.32,.72,0,1)',
 background: INK(0.1),
 }} />
 {options.map(([key, label, Icon]) => (
 <button key={key} role="radio" aria-checked={value === key} onClick={() => onChange(key)}
 className="relative z-10 flex items-center justify-center gap-2 py-2 text-[12px]"
 style={{ color: value === key ? INK(0.95) : INK(0.5), transition: 'color 150ms ease-out' }}>
 <Icon className="w-3.5 h-3.5" />
 {label}
 </button>
 ))}
 </div>
 );
}

function IntegrationRow({ logo, name, detail, connected, syncing, onConnect, onSync, onDisconnect, children }) {
 return (
 <div className="py-4">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: INK(0.06) }}>
 {logo}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[13px]" style={{ color: INK(0.95) }}>{name}</p>
 <p className="text-[11px] mt-0.5" style={{ color: INK(0.45) }}>
 {detail}
 {connected && (
 <>
 {' · '}
 <button onClick={onDisconnect} className="underline underline-offset-2" style={{ color: INK(0.45) }}>
 desconectar
 </button>
 </>
 )}
 </p>
 </div>
 {connected ? (
 <Button variant="secondary" size="sm" onClick={onSync} disabled={syncing}>
 {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
 Sincronizar
 </Button>
 ) : (
 <Button variant="secondary" size="sm" onClick={onConnect}>Conectar</Button>
 )}
 </div>
 {children}
 </div>
 );
}

// Estado en línea, junto a lo que lo causa (sin cajas de color).
function StatusLine({ type, children }) {
 const ok = type === 'success';
 const Icon = ok ? Check : AlertCircle;
 return (
 <p role="status" className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>
 <Icon className="w-3.5 h-3.5 flex-shrink-0" />{children}
 </p>
 );
}
