import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
            border: '1.5px solid rgba(99,102,241,0.25)',
            boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
          }}
        >
          <span className="text-xl font-black text-indigo-400">O</span>
        </motion.div>
        <div className="flex gap-1.5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.5)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
