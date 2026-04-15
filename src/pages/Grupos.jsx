import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export default function Grupos() {
  return (
    <div className="px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-24 text-zinc-600"
      >
        <Users className="w-12 h-12 mb-4 opacity-40" />
        <h2 className="text-lg font-semibold text-zinc-400 mb-1">Grupos</h2>
        <p className="text-sm text-zinc-600 text-center">
          Gestiona tus grupos de entrenamiento
        </p>
      </motion.div>
    </div>
  );
}
