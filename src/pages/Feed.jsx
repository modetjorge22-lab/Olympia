import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';

export default function Feed() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Carrera mensual - placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Carrera mensual</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <TrendingUp className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">La gráfica de horas acumuladas aparecerá aquí</p>
        </div>
        <p className="text-xs text-zinc-600 text-center mt-2">Horas acumuladas · abril 2026</p>
      </motion.div>

      {/* Miembros del equipo - placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Miembros del Equipo</h2>
        <div className="space-y-4">
          {['Pablo Perea', 'Javier López', 'Jorge Modet', 'Javier Martínez'].map((name, i) => (
            <div
              key={name}
              className="bg-surface-2 border border-white/5 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-surface-4 flex items-center justify-center">
                    <span className="text-sm font-semibold text-zinc-400">
                      {name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{name}</p>
                    <p className="text-sm text-zinc-500">—h</p>
                  </div>
                </div>
                {i === 0 && (
                  <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    🏆 Performer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
