import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      background: '#16111a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
    }}>
      <div style={{ position: 'relative', width: 200, height: 200 }}>

        {/* Background ring */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.07)',
        }} />

        {/* Spinning arc */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'rgba(255,255,255,0.85)',
          borderRightColor: 'rgba(255,255,255,0.25)',
          animation: 'olympia-spin 1.4s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />

        {/* Center wordmark */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontWeight: 300,
            fontSize: 22,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.90)',
            animation: 'olympia-breathe 2.8s ease-in-out infinite',
          }}>
            Olympia
          </span>
        </div>

      </div>

      <style>{`
        @keyframes olympia-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes olympia-breathe {
          0%, 100% { opacity: 0.65; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
