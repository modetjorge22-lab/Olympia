import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Newspaper, User, Users, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/feed', label: 'Feed', icon: Newspaper },
  { path: '/actividad', label: 'Actividad', icon: User },
  { path: '/grupos', label: 'Grupos', icon: Users },
  { path: '/mas', label: 'Más', icon: MoreHorizontal },
];

export default function AppLayout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-0/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-full bg-surface-3 border border-white/10 flex items-center justify-center">
            <span className="text-sm font-bold text-zinc-300">O</span>
          </div>

          {/* Month selector */}
          <MonthSelector />

          {/* Spacer for alignment */}
          <div className="w-9" />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path || 
              (path === '/feed' && location.pathname === '/');
            
            return (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-white/5 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isActive ? 'text-zinc-100' : 'text-zinc-600'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] relative z-10 transition-colors ${
                    isActive ? 'text-zinc-100 font-medium' : 'text-zinc-600'
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
        {/* Safe area for phones with home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}

function MonthSelector() {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const now = new Date();
  const [monthIndex, setMonthIndex] = React.useState(now.getMonth());
  const [year, setYear] = React.useState(now.getFullYear());

  const goBack = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear(y => y - 1);
    } else {
      setMonthIndex(m => m - 1);
    }
  };

  const goForward = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear(y => y + 1);
    } else {
      setMonthIndex(m => m + 1);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-surface-3 rounded-full px-4 py-2">
      <button onClick={goBack} className="text-zinc-400 hover:text-zinc-200 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span className="text-sm font-semibold text-zinc-200 min-w-[80px] text-center">
        {months[monthIndex]} {year}
      </span>
      <button onClick={goForward} className="text-zinc-400 hover:text-zinc-200 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
