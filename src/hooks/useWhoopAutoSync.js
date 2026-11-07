import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useData } from '@/lib/DataContext';
import { apiPost } from '@/lib/api';

// Red de seguridad de los webhooks de WHOOP: como mucho una vez cada 3 h por
// dispositivo, trae los últimos 3 días al abrir la app.
const SYNC_MIN_INTERVAL_MS = 3 * 60 * 60 * 1000;
const LAST_SYNC_KEY = 'olympia_last_whoop_sync';

function readLast() {
  try { return parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10); } catch { return 0; }
}
function writeLast() {
  try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* sin almacenamiento */ }
}

export function useWhoopAutoSync() {
  const { user } = useAuth();
  const { myProfile, refresh } = useData();
  const triggered = useRef(false);
  const connected = Boolean(myProfile?.whoop_connected);

  useEffect(() => {
    if (!user?.email || !connected || triggered.current) return;
    triggered.current = true;
    if (Date.now() - readLast() < SYNC_MIN_INTERVAL_MS) return;

    const timer = setTimeout(async () => {
      try {
        const response = await apiPost('/api/whoop-sync', { action: 'sync', days: 3 });
        if (!response.ok) return;
        writeLast();
        const data = await response.json().catch(() => ({}));
        if (data.imported || data.linked) refresh();
      } catch (err) {
        console.warn('Auto-sync WHOOP falló:', err);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [user?.email, connected]);
}
