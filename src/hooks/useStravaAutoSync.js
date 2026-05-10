import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useData } from '@/lib/DataContext';

const SYNC_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const LAST_SYNC_KEY = 'olympia_last_strava_sync';

export function useStravaAutoSync() {
  const { user } = useAuth();
  const { refresh } = useData();
  const triggered = useRef(false);

  useEffect(() => {
    if (!user?.email || triggered.current) return;
    triggered.current = true;

    async function maybeSync() {
      // ¿Hace cuánto fue el último sync en este cliente?
      const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10);
      const elapsed = Date.now() - lastSync;
      if (elapsed < SYNC_MIN_INTERVAL_MS) return;

      // ¿Tiene el usuario Strava conectado?
      const { data } = await supabase
        .from('strava_tokens')
        .select('id')
        .eq('user_email', user.email)
        .limit(1);

      if (!data?.length) return;

      // Disparar sync en background (sin bloquear UI)
      try {
        const response = await fetch('/api/strava-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        });
        if (response.ok) {
          localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
          // Refrescar datos para que los planes convertidos a actividades se reflejen
          refresh();
        }
      } catch (err) {
        // Silencioso: no queremos romper la UI si falla
        console.warn('Auto-sync Strava falló:', err);
      }
    }

    // Pequeño delay para no competir con el render inicial
    const timer = setTimeout(maybeSync, 1500);
    return () => clearTimeout(timer);
  }, [user?.email]);
}
