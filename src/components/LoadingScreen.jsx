import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,30,40,1)_0%,_rgba(10,10,11,1)_70%)]" />

      {/* Animated rings */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Outer ring 3 */}
        <motion.div
          className="absolute w-48 h-48 rounded-full border border-white/5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Outer ring 2 */}
        <motion.div
          className="absolute w-36 h-36 rounded-full border border-white/8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />

        {/* Outer ring 1 */}
        <motion.div
          className="absolute w-28 h-28 rounded-full border border-white/10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {/* Spinning arc - top */}
        <motion.svg
          className="absolute w-32 h-32"
          viewBox="0 0 128 128"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            strokeDasharray="88 264"
            strokeLinecap="round"
          />
        </motion.svg>

        {/* Spinning arc - smaller */}
        <motion.svg
          className="absolute w-44 h-44"
          viewBox="0 0 176 176"
          initial={{ rotate: 180 }}
          animate={{ rotate: -180 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="88"
            cy="88"
            r="80"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="100 404"
            strokeLinecap="round"
          />
        </motion.svg>

        {/* Center circle with O */}
        <motion.div
          className="w-16 h-16 rounded-full bg-surface-3/80 border border-white/10 flex items-center justify-center z-10"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <span className="text-xl font-bold text-zinc-300">O</span>
        </motion.div>
      </div>

      {/* Text */}
      <motion.div
        className="relative z-10 mt-12 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <h1 className="text-4xl font-bold text-zinc-100 tracking-tight font-display">
          Olympia
        </h1>
        <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mt-2">
          Loading Performance
        </p>
      </motion.div>
    </div>
  );
}
