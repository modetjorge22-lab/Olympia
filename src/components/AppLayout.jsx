import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { useMonth } from '@/lib/MonthContext';
import { useStravaAutoSync } from '@/hooks/useStravaAutoSync';
import InfinityMark from './InfinityMark';
import FeatureAnnouncement from './FeatureAnnouncement';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

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
  const { currentMonth, goBack, goForward } = useMonth();
  const mainRef = useRef(null);

  useStravaAutoSync();

  // Al cambiar de pestaña, cada página arranca desde arriba
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

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
          <div
            className="flex items-center justify-between pl-4 pr-2"
            style={{ height: HEADER_H, borderRadius: HEADER_H / 2, pointerEvents: 'auto', ...glass }}
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

            <div
              className="flex items-center gap-3 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(var(--ink),0.08)',
                border: '1px solid rgba(var(--ink),0.1)',
              }}
            >
              <button onClick={goBack} style={{ color: 'rgba(var(--ink),0.55)' }} className="hover:opacity-100 transition-opacity">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="text-[12px] font-semibold min-w-[72px] text-center tracking-wide" style={{ color: 'rgba(var(--ink),0.92)' }}>
                {monthLabel}
              </span>
              <button onClick={goForward} style={{ color: 'rgba(var(--ink),0.55)' }} className="hover:opacity-100 transition-opacity">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
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
        {/* Transición suave entre pestañas — fundido con leve deslizamiento */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
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
          <div
            className="flex items-center justify-around px-2"
            style={{ height: NAV_H, borderRadius: NAV_H / 2, pointerEvents: 'auto', ...glass }}
          >
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path ||
                (path === '/actividad' && location.pathname === '/');

              return (
                <NavLink
                  key={path}
                  to={path}
                  className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-transform duration-150 active:scale-90 relative"
                  style={{ minWidth: 64 }}
                >
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'rgba(var(--ink),0.1)' }}
                    />
                  )}
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
          </div>
        </div>
      </nav>
    </div>
    </>
  );
}
