import React, { useState, useEffect } from 'react';
import { fmtTime } from '../constants';

export default function Settings({
  prices,
  onSavePrices,
  dsmName,
  shiftType,
  startTime,
  onEndShiftInitiate,
  onSavePin,
  ownerEmail,
  onSaveEmail
}) {
  const [msPriceInput, setMsPriceInput] = useState(prices.ms.toString());
  const [hsdPriceInput, setHsdPriceInput] = useState(prices.hsd.toString());
  const [isPricesSavedFlash, setIsPricesSavedFlash] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [isPinFlash, setIsPinFlash] = useState(false);

  const [emailInput, setEmailInput] = useState(ownerEmail || '');
  const [isEmailSavedFlash, setIsEmailSavedFlash] = useState(false);

  useEffect(() => {
    setEmailInput(ownerEmail || '');
  }, [ownerEmail]);

  const handleSaveEmail = (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    onSaveEmail(emailInput.trim());
    setIsEmailSavedFlash(true);
    setTimeout(() => {
      setIsEmailSavedFlash(false);
    }, 2000);
  };

  const isShiftActive = !!startTime;

  const handleSavePrices = () => {
    const ms = parseFloat(msPriceInput);
    const hsd = parseFloat(hsdPriceInput);

    if (isNaN(ms) || isNaN(hsd) || ms <= 0 || hsd <= 0) {
      alert('Please enter valid, positive rates for both fuels.');
      return;
    }

    onSavePrices({ ms, hsd });
    
    setIsPricesSavedFlash(true);
    setTimeout(() => {
      setIsPricesSavedFlash(false);
    }, 1800);
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage('❌ PIN must be exactly 4 digits');
      return;
    }

    onSavePin(newPin);
    setNewPin('');
    setPinMessage('✅ PIN updated successfully!');
    setIsPinFlash(true);
    
    setTimeout(() => {
      setPinMessage('');
      setIsPinFlash(false);
    }, 2500);
  };

  return (
    <div id="s-settings" className="screen active" style={{padding: '0 14px 80px'}}>
      
      <div className="s-section" style={{
        background: 'linear-gradient(135deg, #0c1224 0%, #080b18 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{fontSize: '16px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px'}}>⛽ Fuel Prices</div>
        <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '16px'}}>Set today's rate per litre</div>
        
        <div style={{
          background: '#040814',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.03)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* HSD Price Input */}
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{
              fontSize: '12px',
              fontWeight: 900,
              padding: '10px 14px',
              borderRadius: '10px',
              minWidth: '70px',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.25)'
            }}>HSD</div>
            <div style={{position: 'relative', flex: 1}}>
              <span style={{position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 800, fontSize: '15px'}}>₹</span>
              <input 
                type="number" 
                value={hsdPriceInput} 
                onChange={(e) => setHsdPriceInput(e.target.value)}
                step="0.01" 
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: '#070c1a',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 12px 12px 28px',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '16px',
                  outline: 'none',
                  opacity: 1,
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
          
          {/* MS Price Input */}
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{
              fontSize: '12px',
              fontWeight: 900,
              padding: '10px 14px',
              borderRadius: '10px',
              minWidth: '70px',
              textAlign: 'center',
              background: 'rgba(255, 209, 0, 0.1)',
              color: '#FFD100',
              border: '1px solid rgba(255, 209, 0, 0.25)'
            }}>MS</div>
            <div style={{position: 'relative', flex: 1}}>
              <span style={{position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 800, fontSize: '15px'}}>₹</span>
              <input 
                type="number" 
                value={msPriceInput} 
                onChange={(e) => setMsPriceInput(e.target.value)}
                step="0.01" 
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: '#070c1a',
                  border: '1px solid rgba(255, 209, 0, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 12px 12px 28px',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '16px',
                  outline: 'none',
                  opacity: 1,
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSavePrices}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #FFD100, #fbbf24)',
            color: '#001440',
            fontWeight: 900,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 4px 15px rgba(255, 209, 0, 0.2)'
          }}
        >
          {isPricesSavedFlash ? '✓ Rates Saved!' : 'Save Prices'}
        </button>
      </div>

      <div className="s-section" style={{
        background: 'linear-gradient(135deg, #0c1224 0%, #080b18 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{fontSize: '16px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px'}}>🔑 Owner PIN</div>
        <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '16px'}}>Update the secret 4-digit manager PIN</div>
        
        <form onSubmit={handleSavePin}>
          <div style={{position: 'relative', marginBottom: '16px'}}>
            <input 
              type="password" 
              placeholder="Enter new 4-digit PIN" 
              inputMode="numeric" 
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              style={{
                width: '100%',
                background: '#040814',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#fff',
                fontWeight: 900,
                fontSize: '15px',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '8px'
              }}
            />
          </div>
          <button 
            type="submit"
            style={{
              width: '100%', 
              padding: '14px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: '#f8fafc', 
              fontWeight: 800,
              fontSize: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }} 
          >
            Update PIN
          </button>
        </form>
        {pinMessage && (
          <div style={{
            fontSize: '12px', 
            fontWeight: 800, 
            marginTop: '12px', 
            textAlign: 'center',
            color: pinMessage.includes('❌') ? '#ef4444' : '#22c55e'
          }}>
            {pinMessage}
          </div>
        )}
      </div>

      <div className="s-section" style={{
        background: 'linear-gradient(135deg, #0c1224 0%, #080b18 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{fontSize: '16px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px'}}>✉️ Owner Email</div>
        <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '16px'}}>Configure the email address for Shift Start OTPs</div>
        
        <form onSubmit={handleSaveEmail}>
          <div style={{position: 'relative', marginBottom: '16px'}}>
            <input 
              type="email" 
              placeholder="owner@example.com" 
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                width: '100%',
                background: '#040814',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#fff',
                fontWeight: 800,
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>
          <button 
            type="submit"
            style={{
              width: '100%', 
              padding: '14px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #FFD100, #fbbf24)', 
              color: '#001440', 
              fontWeight: 900,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 4px 15px rgba(255, 209, 0, 0.15)'
            }} 
          >
            {isEmailSavedFlash ? '✓ Email Saved!' : 'Update Email'}
          </button>
        </form>
      </div>

      <div className="s-section" style={{
        background: 'linear-gradient(135deg, #0c1224 0%, #080b18 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{fontSize: '16px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px'}}>🔄 Shift Data Management</div>
        <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '16px'}}>Manage local storage, logs & shift resets</div>
        
        <button 
          onClick={onEndShiftInitiate}
          style={{
            width: '100%', 
            padding: '14px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)', 
            color: '#fff', 
            fontWeight: 850,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }} 
        >
          🚨 End Shift & Clear Data
        </button>
        
        <div style={{
          fontSize: '11px', 
          color: '#64748b', 
          lineHeight: 1.5,
          background: 'rgba(0,0,0,0.15)',
          padding: '10px 14px',
          borderRadius: '10px',
          borderLeft: '3px solid #64748b'
        }}>
          ⚠️ Warning: This action will erase all cached shift entries, reset opening and closing totalizers, and lock the screen. Share the final shift report before proceeding.
        </div>
      </div>

    </div>
  );
}
