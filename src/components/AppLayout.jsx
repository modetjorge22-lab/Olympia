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
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-0/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/[0.08] flex items-center justify-center">
            <span className="text-[11px] font-bold text-zinc-300 tracking-tight">O</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={goBack} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-zinc-300 min-w-[72px] text-center tracking-wide">
              {monthLabel}
            </span>
            <button onClick={goForward} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-0/95 backdrop-blur-xl border-t border-white/[0.04]">
        <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path ||
              (path === '/feed' && location.pathname === '/');

            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors relative"
              >
                <Icon
                  className={`w-[20px] h-[20px] transition-colors ${
                    isActive ? 'text-zinc-100' : 'text-zinc-600'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  className={`text-[10px] transition-colors ${
                    isActive ? 'text-zinc-100 font-medium' : 'text-zinc-600'
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
