import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash for 1.5 seconds, then fade out for 0.7s
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 700);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      id="splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 35%, #003087 0%, #001440 60%, #000a1f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: fading ? 'none' : 'auto'
      }}
    >
      <div style={{ animation: 'splashIn 0.9s ease forwards', textAlign: 'center' }}>
        <div style={{
          width: '110px', 
          height: '110px', 
          borderRadius: '28px', 
          boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,209,0,0.15)', 
          marginBottom: '24px', 
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px',
          fontWeight: 900,
          color: '#000'
        }}>
          NSS
        </div>
        <h1 style={{ fontWeight: 900, fontSize: '32px', color: '#fff', letterSpacing: '1px', margin: 0, lineHeight: 1.1 }}>
          NSS
        </h1>
        <div style={{ fontWeight: 800, fontSize: '24px', color: '#FFD100', letterSpacing: '1px' }}>
          FUELTRACK
        </div>
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(255,209,0,0.2)',
            borderTopColor: '#FFD100',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ color: '#93c5fd', fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Loading Shift Data...
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
