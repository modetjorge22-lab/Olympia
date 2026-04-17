import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMonth } from '@/lib/MonthContext';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const navItems = [
  { path: '/feed', label: 'Feed', icon: Newspaper },
  { path: '/actividad', label: 'Actividad', icon: User },
  { path: '/grupos', label: 'Grupos', icon: Users },
  { path: '/mas', label: 'Más', icon: MoreHorizontal },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const { currentMonth, goBack, goForward } = useMonth();

  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating glass header */}
      <header className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-lg">
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(17, 19, 26, 0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #27272a, #18181b)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-[11px] font-bold text-zinc-300 tracking-tight">O</span>
          </div>

          {/* Month navigator */}
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
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

          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-[72px] pb-24">
        {children}
      </main>

      {/* Bottom nav — glass pill */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
        <div
          className="rounded-2xl px-2 py-2 flex items-center justify-around"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(17, 19, 26, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path ||
              (path === '/feed' && location.pathname === '/');

            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative"
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
                  className={`w-[19px] h-[19px] transition-colors relative z-10 ${
                    isActive ? 'text-zinc-100' : 'text-zinc-600'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span
                  className={`text-[9px] font-medium transition-colors relative z-10 ${
                    isActive ? 'text-zinc-200' : 'text-zinc-600'
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
