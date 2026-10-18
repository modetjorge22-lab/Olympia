import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { useStravaAutoSync } from '@/hooks/useStravaAutoSync';
import InfinityMark from './InfinityMark';
import FeatureAnnouncement from './FeatureAnnouncement';


const navItems = [
  { path: '/feed', label: 'Feed', icon: Newspaper },
  { path: '/actividad', label: 'Tú', icon: User },
  { path: '/grupos', label: 'Grupos', icon: Users },
  { path: '/mas', label: 'Más', icon: MoreHorizontal },
];

const HEADER_H = 52;
const NAV_H = 60;

// Liquid glass — vidrio translúcido flotante con blur y saturación
const glass = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

export default function AppLayout({ children }) {
  const location = useLocation();
  const mainRef = useRef(null);
  const activeIdx = navItems.findIndex(({ path }) =>
    location.pathname === path || (path === '/actividad' && location.pathname === '/'));

  useStravaAutoSync();

  // Al cambiar de pestaña, cada página arranca desde arriba (y con las barras completas)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, behavior: 'instant' });
    compact.set(0);
  }, [location.pathname]);

  // ── Barras que se recogen al hacer scroll (estilo Instagram / Revolut) ──
  // `compact` va de 0 (barras completas) a 1 (recogidas). Sigue al dedo: cada
  // píxel desplazado hacia abajo las recoge un poco y hacia arriba las despliega.
  // Al parar, se asientan en el estado más cercano con un muelle. Todo vive en
  // motion values → solo transforms en el compositor, cero renders de React.
  const compact = useMotionValue(0);
  const c = useSpring(compact, { stiffness: 520, damping: 46, mass: 0.6 });
  const headerY = useTransform(c, [0, 1], [0, -6]);
  const headerScale = useTransform(c, [0, 1], [1, 0.84]);
  const navY = useTransform(c, [0, 1], [0, 10]);
  const navScale = useTransform(c, [0, 1], [1, 0.86]);

  useEffect(() => {
    const RANGE = 90; // px de scroll para pasar de completa a recogida
    let last = null, raf = 0, idle = 0;
    const read = (t) => (t === window || t === document ? window.scrollY : t.scrollTop);
    const onScroll = (e) => {
      const target = e.target === document ? window : e.target;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = read(target);
        if (last == null) { last = y; return; }
        const dy = y - last; last = y;
        if (y < 12) compact.set(0);
        else compact.set(Math.min(1, Math.max(0, compact.get() + dy / RANGE)));
        clearTimeout(idle);
        idle = setTimeout(() => {
          const v = compact.get();
          if (v > 0 && v < 1) compact.set(read(target) < 12 ? 0 : v > 0.5 ? 1 : 0);
        }, 140);
      });
    };
    const main = mainRef.current;
    window.addEventListener('scroll', onScroll, { passive: true });
    main?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      main?.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf); clearTimeout(idle);
    };
  }, []);


  return (
    <>
    <FeatureAnnouncement />
    <div className="min-h-screen flex flex-col">
      {/* Header flotante — píldora de vidrio */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', pointerEvents: 'none' }}
      >
        <div className="mx-auto max-w-lg px-3">
          <motion.div
            className="flex items-center justify-start px-4"
            style={{ height: HEADER_H, borderRadius: HEADER_H / 2, pointerEvents: 'auto', ...glass,
              y: headerY, scale: headerScale, transformOrigin: '50% 0%', willChange: 'transform' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InfinityMark size={15} />
              <div style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontWeight: 400,
                fontSize: 13,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(var(--ink),0.92)',
              }}>
                Olympia
              </div>
            </div>

          </motion.div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + ${HEADER_H + 16}px)`,
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${NAV_H + 28}px)`,
        }}
      >
        {/* Cambio de pestaña — interacción frecuente: solo un fundido corto */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom nav flotante — píldora de vidrio */}
      <nav
        className="fixed left-0 right-0 z-50"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)', pointerEvents: 'none' }}
      >
        <div className="mx-auto px-4" style={{ maxWidth: 420 }}>
          <motion.div
            className="relative grid grid-cols-4 items-center px-2"
            style={{ height: NAV_H, borderRadius: NAV_H / 2, pointerEvents: 'auto', ...glass,
              y: navY, scale: navScale, transformOrigin: '50% 100%', willChange: 'transform' }}
          >
            {/* Píldora activa: una sola pieza que se desliza con transform (corre en
                el compositor, sin medir layout en JS → fluida aunque la página pese) */}
            {activeIdx >= 0 && (
              <div aria-hidden className="absolute pointer-events-none"
                style={{
                  top: 7, bottom: 7, left: 8, width: 'calc((100% - 16px) / 4)',
                  transform: `translate3d(${activeIdx * 100}%,0,0)`,
                  transition: 'transform 420ms cubic-bezier(0.32, 0.72, 0, 1)',
                }}>
                <div className="h-full rounded-full mx-1.5" style={{ background: 'rgba(var(--ink),0.1)' }} />
              </div>
            )}
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path ||
                (path === '/actividad' && location.pathname === '/');

              return (
                <NavLink
                  key={path}
                  to={path}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-full transition-transform duration-150 ease-out active:scale-[0.96] relative"
                >
                  <Icon
                    className="w-[19px] h-[19px] transition-colors relative z-10"
                    strokeWidth={isActive ? 2.2 : 1.6}
                    style={{ color: isActive ? 'rgba(var(--ink),0.95)' : 'rgba(var(--ink),0.5)' }}
                  />
                  <span
                    className="text-[10px] font-medium transition-colors relative z-10"
                    style={{ color: isActive ? 'rgba(var(--ink),0.95)' : 'rgba(var(--ink),0.5)' }}
                  >
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </motion.div>
        </div>
      </nav>
    </div>
    </>
  );
}
