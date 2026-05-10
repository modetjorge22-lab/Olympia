import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useData } from '@/lib/DataContext';
import { User, Settings, LogOut, ChevronRight, BarChart3, Dumbbell, Check, Loader2, RefreshCw, AlertCircle, Camera } from 'lucide-react';

const glassCard = {
 background: 'rgba(245,237,224,0.92)',
 border: '1px solid rgba(255,255,255,0.35)',
 boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
};

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';

export default function Mas() {
 const { user, signOut } = useAuth();
 const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
 const [searchParams] = useSearchParams();

 const [stravaConnected, setStravaConnected] = useState(false);
 const [syncing, setSyncing] = useState(false);
 const [syncResult, setSyncResult] = useState(null);
 const [stravaStatus, setStravaStatus] = useState(null);

 useEffect(() => {
 const stravaParam = searchParams.get('strava');
 if (stravaParam === 'success') setStravaStatus('success');
 else if (stravaParam === 'error') setStravaStatus('error');
 }, [searchParams]);

 useEffect(() => {
 async function checkStrava() {
 if (!user?.email) return;
 const { data } = await supabase.from('strava_tokens').select('id').eq('user_email', user.email).limit(1);
 setStravaConnected(data?.length > 0);
 }
 checkStrava();
 }, [user, stravaStatus]);

 const connectStrava = () => {
 window.location.href = `/api/strava-auth?email=${encodeURIComponent(user.email)}`;
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
 } else setSyncResult({ type: 'error', message: data.error || 'Error al sincronizar' });
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
 style={{ border: '1.5px solid rgba(42,26,17,0.18)' }}
 />
 ) : (
 <div
 className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
 style={{
 background: 'rgba(42,26,17,0.08)',
 border: '1.5px solid rgba(42,26,17,0.18)',
 color: '#2a1a11',
 }}
 >
 {initials}
 </div>
 )}
 {/* Camera badge overlay */}
 <div
 className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
 style={{
 background: '#2a1a11',
 border: '2px solid rgba(245,237,224,0.95)',
 boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
 }}
 >
 {uploadingAvatar ? (
 <Loader2 className="w-3 h-3 text-white animate-spin" />
 ) : (
 <Camera className="w-3 h-3 text-white" />
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
 <p className="text-[11px] mt-1" style={{ color: '#b91c1c' }}>{avatarError}</p>
 )}
 </div>
 </div>

 {/* Strava banners */}
 {stravaStatus === 'success' && (
 <div className="rounded-xl px-4 py-3 flex items-center gap-2"
 style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)' }}>
 <Check className="w-4 h-4" style={{ color: '#047857' }} />
 <span className="text-[13px] font-medium" style={{ color: '#047857' }}>Strava conectado correctamente</span>
 </div>
 )}
 {stravaStatus === 'error' && (
 <div className="rounded-xl px-4 py-3 flex items-center gap-2"
 style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}>
 <AlertCircle className="w-4 h-4" style={{ color: '#b91c1c' }} />
 <span className="text-[13px] font-medium" style={{ color: '#b91c1c' }}>Error al conectar Strava</span>
 </div>
 )}

 {/* Integrations */}
 <div >
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(245,237,224,0.5)' }}>Integraciones</p>
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
 <button onClick={syncStrava} disabled={syncing}
 className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-colors"
 style={{ background: 'rgba(42,26,17,0.08)', border: '1px solid rgba(42,26,17,0.15)', color: TEXT_PRIMARY }}>
 {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
 Sincronizar
 </button>
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
 color: syncResult.type === 'success' ? '#047857' : '#b91c1c',
 }}>
 {syncResult.message}
 </div>
 )}
 </div>

 <div style={{ height: 1, background: 'rgba(42,26,17,0.08)' }} />

 {/* Whoop */}
 <div className="px-4 py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.35)' }}>
 <span className="text-sm font-bold" style={{ color: '#0f766e' }}>W</span>
 </div>
 <div>
 <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>Whoop</p>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Próximamente</p>
 </div>
 </div>
 <span className="text-[11px] px-2 py-1 rounded" style={{ background: 'rgba(42,26,17,0.06)', color: TEXT_MUTED }}>Pronto</span>
 </div>
 </div>
 </div>
 </div>

 {/* Personal menu */}
 <div >
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(245,237,224,0.5)' }}>Personal</p>
 <div className="rounded-2xl overflow-hidden" style={glassCard}>
 {[
 { icon: User, label: 'Perfil', color: 'rgba(99,102,241,0.22)', iconColor: '#4338ca' },
 { icon: Dumbbell, label: 'Mis Workouts', color: 'rgba(16,185,129,0.22)', iconColor: '#047857' },
 { icon: BarChart3, label: 'Estadísticas', color: 'rgba(245,158,11,0.22)', iconColor: '#b45309' },
 { icon: Settings, label: 'Ajustes', color: 'rgba(42,26,17,0.1)', iconColor: TEXT_SECONDARY },
 ].map((item, idx, arr) => (
 <button key={item.label}
 className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${idx < arr.length - 1 ? 'border-b' : ''}`}
 style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
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
 <LogOut className="w-[15px] h-[15px]" style={{ color: '#b91c1c' }} />
 </div>
 <span className="text-[13px] font-medium" style={{ color: '#b91c1c' }}>Cerrar sesión</span>
 </button>
 </div>
 </div>
 );
}
