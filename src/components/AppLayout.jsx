import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMonth } from '@/lib/MonthContext';
import { useStravaAutoSync } from '@/hooks/useStravaAutoSync';

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
      {/* Top header — full width, flush to edge */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: '#16111a',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 max-w-lg mx-auto"
          style={{ height: HEADER_H }}
        >
          {/* Wordmark */}
          <div style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontWeight: 300,
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.88)',
          }}>
            Olympia
          </div>

          {/* Month navigator */}
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl"
            style={{
              background: '#1a1a22',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button onClick={goBack} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[12px] font-semibold text-zinc-200 min-w-[72px] text-center tracking-wide">
              {monthLabel}
            </span>
            <button onClick={goForward} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="w-[60px]" />
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

      {/* Bottom nav — full width, flush to edge */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: '#16111a',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="flex items-center justify-around px-2 max-w-lg mx-auto"
          style={{ height: NAV_H }}
        >
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path ||
              (path === '/feed' && location.pathname === '/');

            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative"
                style={{ minWidth: 64 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-[20px] h-[20px] transition-colors relative z-10 ${
                    isActive ? 'text-zinc-100' : 'text-zinc-500'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
                <span
                  className={`text-[10px] font-medium transition-colors relative z-10 ${
                    isActive ? 'text-zinc-100' : 'text-zinc-500'
                  }`}
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
