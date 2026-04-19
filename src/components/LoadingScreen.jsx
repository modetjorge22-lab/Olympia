import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      background: '#281811',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
    }}>
      <span style={{
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontWeight: 400,
        fontSize: 26,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        color: 'rgba(245,237,224,0.92)',
        animation: 'olympia-breathe 2.2s ease-in-out infinite',
      }}>
        Olympia
      </span>

      <style>{`
        @keyframes olympia-breathe {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
