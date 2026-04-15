import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  User,
  Settings,
  Link2,
  LogOut,
  ChevronRight,
  BarChart3,
  Dumbbell,
} from 'lucide-react';

const menuSections = [
  {
    title: 'Personal',
    items: [
      { icon: User, label: 'Perfil', path: '/perfil' },
      { icon: Dumbbell, label: 'Mis Workouts', path: '/workouts' },
      { icon: BarChart3, label: 'Estadísticas', path: '/estadisticas' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { icon: Link2, label: 'Integraciones', subtitle: 'Strava, Whoop', path: '/integraciones' },
      { icon: Settings, label: 'Ajustes', path: '/ajustes' },
    ],
  },
];

export default function Mas() {
  const { user, signOut } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="px-4 py-6 space-y-6">
      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-full bg-surface-4 flex items-center justify-center">
          <span className="text-lg font-semibold text-zinc-400">
            {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-zinc-100 text-lg">{userName}</p>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
      </motion.div>

      {/* Menu sections */}
      {menuSections.map((section, sIdx) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * (sIdx + 1), duration: 0.3 }}
        >
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-1">
            {section.title}
          </h3>
          <div className="bg-surface-2 border border-white/5 rounded-2xl overflow-hidden">
            {section.items.map((item, idx) => (
              <button
                key={item.label}
                className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors ${
                  idx < section.items.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-zinc-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                    {item.subtitle && (
                      <p className="text-xs text-zinc-500">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <button
          onClick={signOut}
          className="w-full bg-surface-2 border border-white/5 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-red-500/5 hover:border-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-sm font-medium text-red-400">Cerrar sesión</span>
        </button>
      </motion.div>
    </div>
  );
}
