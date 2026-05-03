import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { useMonth } from '@/lib/MonthContext';
import { useStravaAutoSync } from '@/hooks/useStravaAutoSync';
import InfinityMark from './InfinityMark';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const navItems = [
  { path: '/feed', label: 'Feed', icon: Newspaper },
  { path: '/actividad', label: 'Actividad', icon: User },
  { path: '/grupos', label: 'Grupos', icon: Users },
  { path: '/mas', label: 'Más', icon: MoreHorizontal },
];

const HEADER_H = 56;
const NAV_H = 68;

export default function AppLayout({ children }) {
  const location = useLocation();
  const { currentMonth, goBack, goForward } = useMonth();

  useStravaAutoSync();

  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — fondo vino con blur sutil */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'rgba(58,24,32,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(245,237,224,0.08)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 max-w-lg mx-auto"
          style={{ height: HEADER_H }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfinityMark size={12} />
            <div style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 11,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(245,237,224,0.92)',
            }}>
              Olympia
            </div>
          </div>

          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl"
            style={{
              background: 'rgba(245,237,224,0.08)',
              border: '1px solid rgba(245,237,224,0.14)',
            }}
          >
            <button onClick={goBack} style={{ color: 'rgba(245,237,224,0.55)' }} className="hover:opacity-100 transition-opacity">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[12px] font-semibold min-w-[72px] text-center tracking-wide" style={{ color: 'rgba(245,237,224,0.92)' }}>
              {monthLabel}
            </span>
            <button onClick={goForward} style={{ color: 'rgba(245,237,224,0.55)' }} className="hover:opacity-100 transition-opacity">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + ${HEADER_H}px)`,
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${NAV_H}px)`,
        }}
      >
        {children}
      </main>

      {/* Bottom nav — fondo vino con blur sutil */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'rgba(58,24,32,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(245,237,224,0.08)',
        }}
      >
        <div
          className="flex items-center justify-around px-2 max-w-lg mx-auto"
          style={{ height: NAV_H }}
        >
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path ||
              (path === '/actividad' && location.pathname === '/');

            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative"
                style={{ minWidth: 64 }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(245,237,224,0.1)' }}
                  />
                )}
                <Icon
                  className="w-[20px] h-[20px] transition-colors relative z-10"
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? 'rgba(245,237,224,0.95)' : 'rgba(245,237,224,0.5)' }}
                />
                <span
                  className="text-[10px] font-medium transition-colors relative z-10"
                  style={{ color: isActive ? 'rgba(245,237,224,0.95)' : 'rgba(245,237,224,0.5)' }}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
