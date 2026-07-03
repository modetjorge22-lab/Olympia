import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useData } from '@/lib/DataContext';
import { User, Settings, LogOut, ChevronRight, BarChart3, Dumbbell, Check, Loader2, RefreshCw, AlertCircle, Camera, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

const glassCard = {
 background: 'transparent',
 borderTop: '1px solid rgba(var(--ink),0.12)',
 borderRadius: 0,
 paddingLeft: 0,
 paddingRight: 0,
};

const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
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
 if (whoopParam === 'success') setWhoopStatus('success');
 else if (whoopParam === 'error') setWhoopStatus('error');
 }, [searchParams]);

 useEffect(() => {
 async function checkConnections() {
 if (!user?.email) return;
 const [strava, whoop] = await Promise.all([
 supabase.from('strava_tokens').select('id').eq('user_email', user.email).limit(1),
 supabase.from('whoop_tokens').select('id').eq('user_email', user.email).limit(1),
 ]);
 setStravaConnected(strava.data?.length > 0);
 setWhoopConnected(whoop.data?.length > 0);
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

 const connectWhoop = () => {
 window.location.href = `/api/whoop-auth?email=${encodeURIComponent(user.email)}`;
 };

 const disconnectWhoop = async () => {
 try {
 const { createClient } = await import('@supabase/supabase-js');
 const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
 await sb.from('whoop_tokens').delete().eq('user_email', user.email);
 setWhoopConnected(false);
 setWhoopSyncResult(null);
 } catch (err) {
 console.error('Error disconnecting Whoop:', err);
 }
 };

 const syncWhoop = async () => {
 setWhoopSyncing(true);
 setWhoopSyncResult(null);
 try {
 const response = await fetch('/api/whoop-sync', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: user.email }),
 });
 const data = await response.json();
 if (response.ok) {
 setWhoopSyncResult({ type: 'success', message: `${data.imported} noches importadas` });
 if (data.imported > 0) refreshData();
 } else if (response.status === 401 || data.error === 'reconnect_required') {
 setWhoopConnected(false);
 setWhoopSyncResult({ type: 'error', message: 'Token expirado. Reconecta Whoop para continuar.' });
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
 <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
 {/* User card */}
 <div className="rounded-2xl p-4 flex items-center gap-4" style={glassCard}>
 <button
 onClick={handleAvatarClick}
 disabled={uploadingAvatar}
 className="relative group flex-shrink-0"
 style={{ cursor: uploadingAvatar ? 'default' : 'pointer' }}
 >
 {avatarUrl ? (
 <img
 src={avatarUrl}
 alt={userName}
 className="w-14 h-14 rounded-xl object-cover"
 style={{ border: '1.5px solid rgba(var(--ink),0.22)' }}
 />
 ) : (
 <div
 className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
 style={{
 background: 'rgba(var(--ink),0.08)',
 border: '1.5px solid rgba(var(--ink),0.22)',
 color: TEXT_PRIMARY,
 }}
 >
 {initials}
 </div>
 )}
 {/* Camera badge overlay */}
 <div
 className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
 style={{
 background: ACCENT,
 border: '2px solid var(--bg)',
 boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
 }}
 >
 {uploadingAvatar ? (
 <Loader2 className="w-3 h-3 animate-spin" style={{ color: ON_ACCENT }} />
 ) : (
 <Camera className="w-3 h-3" style={{ color: ON_ACCENT }} />
 )}
 </div>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 onChange={handleAvatarChange}
 style={{ display: 'none' }}
 />
 </button>
 <div className="flex-1 min-w-0">
 <p className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{userName}</p>
 <p className="text-[13px] truncate" style={{ color: TEXT_SECONDARY }}>{user?.email}</p>
 {avatarError && (
 <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{avatarError}</p>
 )}
 </div>
 </div>

 {/* Apariencia */}
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(var(--ink),0.5)' }}>Apariencia</p>
 <div className="grid grid-cols-2 gap-1.5">
 {[['dark', 'Oscuro', Moon], ['light', 'Claro', Sun]].map(([key, label, Icon]) => (
 <button
 key={key}
 onClick={() => setMode(key)}
 className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
 style={mode === key ? {
 background: ACCENT,
 color: ON_ACCENT,
 } : {
 background: 'rgba(var(--ink),0.07)',
 border: '1px solid rgba(var(--ink),0.12)',
 color: TEXT_MUTED,
 }}
 >
 <Icon className="w-3.5 h-3.5" />
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Strava banners */}
 {stravaStatus === 'success' && (
 <div className="rounded-xl px-4 py-3 flex items-center gap-2"
 style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)' }}>
 <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
 <span className="text-[13px] font-medium" style={{ color: 'var(--success)' }}>Strava conectado correctamente</span>
 </div>
 )}
 {stravaStatus === 'error' && (
 <div className="rounded-xl px-4 py-3 flex items-center gap-2"
 style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}>
 <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
 <span className="text-[13px] font-medium" style={{ color: 'var(--danger)' }}>Error al conectar Strava</span>
 </div>
 )}

 {/* Integrations */}
 <div >
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(var(--ink),0.5)' }}>Integraciones</p>
 <div className="rounded-2xl overflow-hidden" style={glassCard}>
 {/* Strava */}
 <div className="px-4 py-4">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,76,2,0.18)', border: '1px solid rgba(252,76,2,0.35)' }}>
 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#fc4c02">
 <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
 </svg>
 </div>
 <div>
 <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>Strava</p>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{stravaConnected ? 'Conectado' : 'Sincroniza tus actividades'}</p>
 </div>
 </div>
 {stravaConnected ? (
 <div className="flex items-center gap-2">
 <button onClick={disconnectStrava}
 className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
 style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
 Desconectar
 </button>
 <button onClick={syncStrava} disabled={syncing}
 className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-colors"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.18)', color: TEXT_PRIMARY }}>
 {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
 Sincronizar
 </button>
 </div>
 ) : (
 <button onClick={connectStrava}
 className="text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
 style={{ background: '#fc4c02' }}>
 Conectar
 </button>
 )}
 </div>
 {syncResult && (
 <div className={`mt-2 px-3 py-2 rounded-lg text-[12px] font-medium`}
 style={{
 background: syncResult.type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
 color: syncResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
 }}>
 {syncResult.message}
 </div>
 )}
 </div>

 <div style={{ height: 1, background: 'rgba(var(--ink),0.08)' }} />

 {/* Whoop */}
 <div className="px-4 py-4">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.35)' }}>
 <span className="text-sm font-bold" style={{ color: '#2dd4bf' }}>W</span>
 </div>
 <div>
 <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>Whoop</p>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{whoopConnected ? 'Conectado · datos de sueño' : 'Sincroniza tu sueño'}</p>
 </div>
 </div>
 {whoopConnected ? (
 <div className="flex items-center gap-2">
 <button onClick={disconnectWhoop}
 className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
 style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
 Desconectar
 </button>
 <button onClick={syncWhoop} disabled={whoopSyncing}
 className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-colors"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.18)', color: TEXT_PRIMARY }}>
 {whoopSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
 Sincronizar
 </button>
 </div>
 ) : (
 <button onClick={connectWhoop}
 className="text-[12px] font-semibold px-3 py-2 rounded-lg"
 style={{ background: '#2dd4bf', color: '#042f2e' }}>
 Conectar
 </button>
 )}
 </div>
 {whoopSyncResult && (
 <div className="mt-2 px-3 py-2 rounded-lg text-[12px] font-medium"
 style={{
 background: whoopSyncResult.type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
 color: whoopSyncResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
 }}>
 {whoopSyncResult.message}
 </div>
 )}
 {whoopStatus === 'success' && (
 <div className="mt-2 px-3 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2"
 style={{ background: 'rgba(16,185,129,0.18)' }}>
 <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
 <span style={{ color: 'var(--success)' }}>Whoop conectado correctamente</span>
 </div>
 )}
 {whoopStatus === 'error' && (
 <div className="mt-2 px-3 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2"
 style={{ background: 'rgba(239,68,68,0.18)' }}>
 <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
 <span style={{ color: 'var(--danger)' }}>Error al conectar Whoop</span>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Personal menu */}
 <div >
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(var(--ink),0.5)' }}>Personal</p>
 <div className="rounded-2xl overflow-hidden" style={glassCard}>
 {[
 { icon: User, label: 'Perfil', color: 'rgba(99,102,241,0.22)', iconColor: 'var(--info)' },
 { icon: Dumbbell, label: 'Mis Workouts', color: 'rgba(16,185,129,0.22)', iconColor: 'var(--success)' },
 { icon: BarChart3, label: 'Estadísticas', color: 'rgba(245,158,11,0.22)', iconColor: 'var(--warning)' },
 { icon: Settings, label: 'Ajustes', color: 'rgba(var(--ink),0.12)', iconColor: TEXT_SECONDARY },
 ].map((item, idx, arr) => (
 <button key={item.label}
 className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${idx < arr.length - 1 ? 'border-b' : ''}`}
 style={{ borderColor: 'rgba(var(--ink),0.08)' }}>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: item.color }}>
 <item.icon className="w-[15px] h-[15px]" style={{ color: item.iconColor }} />
 </div>
 <p className="text-[13px] font-medium" style={{ color: TEXT_PRIMARY }}>{item.label}</p>
 </div>
 <ChevronRight className="w-4 h-4" style={{ color: TEXT_MUTED }} />
 </button>
 ))}
 </div>
 </div>

 {/* Logout */}
 <div >
 <button onClick={signOut}
 className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors"
 style={glassCard}>
 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.18)' }}>
 <LogOut className="w-[15px] h-[15px]" style={{ color: 'var(--danger)' }} />
 </div>
 <span className="text-[13px] font-medium" style={{ color: 'var(--danger)' }}>Cerrar sesión</span>
 </button>
 </div>
 </div>
 );
}
