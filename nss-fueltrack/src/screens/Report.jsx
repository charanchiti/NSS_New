import React, { useRef, useState } from 'react';
import { MODES, fmt, fmtTime } from '../constants';

export default function Report({
  transactions = [],
  dsmName,
  shiftType,
  startTime,
  duration,
  openingN1 = 0,
  openingN2 = 0,
  openingN3 = 0,
  openingN4 = 0
}) {
  const reportRef = useRef(null);

  const activeTxns = transactions.filter((t) => !t.deleted);
  
  // Closing readings state
  const [closingN1, setClosingN1] = useState('');
  const [closingN2, setClosingN2] = useState('');
  const [closingN3, setClosingN3] = useState('');
  const [closingN4, setClosingN4] = useState('');

  // Grand Totals
  const totalLiters = activeTxns.reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);
  const totalTxns = activeTxns.length;
  const grandTotal = activeTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Split fuel
  const hsdLiters = activeTxns.filter(t => t.fuelId === 'hsd').reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);
  const msLiters = activeTxns.filter(t => t.fuelId === 'ms').reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);

  // Nozzle volume calculations (App L)
  const nozzleVolumes = { 1: 0, 2: 0, 3: 0, 4: 0 };
  activeTxns.forEach((t) => {
    const n = t.nozzle || 1;
    if (nozzleVolumes[n] !== undefined) {
      nozzleVolumes[n] += parseFloat(t.liters || 0);
    }
  });

  const openings = { 1: openingN1, 2: openingN2, 3: openingN3, 4: openingN4 };
  const closings = { 1: closingN1, 2: closingN2, 3: closingN3, 4: closingN4 };
  const nozzleLabels = { 1: 'HSD', 2: 'HSD', 3: 'MS', 4: 'MS' };

  let totalMismatch = 0;

  // Mode split
  const activeModes = [];
  const zeroModes = [];

  MODES.forEach((mode) => {
    const txnsOfMode = activeTxns.filter((t) => t.paymentMode === mode.id);
    const amt = txnsOfMode.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const lit = txnsOfMode.reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);
    const modeSummary = { ...mode, count: txnsOfMode.length, amount: amt, liters: lit };
    if (txnsOfMode.length > 0) {
      activeModes.push(modeSummary);
    } else {
      zeroModes.push(modeSummary);
    }
  });

  // WhatsApp share
  const doWhatsApp = () => {
    let text = `📊 *NSS FuelTrack — Shift Report*\n`;
    text += `DSM: ${dsmName || '—'} | ${(shiftType || 'day').toUpperCase()} Shift\n`;
    text += `Duration: ${duration}\n\n`;
    text += `💰 *Grand Total: ${fmt(grandTotal)}*\n`;
    text += `⛽ Total Liters: ${totalLiters.toFixed(2)}L\n`;
    text += `📝 Transactions: ${totalTxns}\n\n`;
    text += `--- Mode Breakdown ---\n`;
    activeModes.forEach((m) => {
      text += `${m.icon} ${m.label}: ${fmt(m.amount)} (${m.count} txn)\n`;
    });
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const doShareReport = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      if (!reportRef.current) return;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#001440',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `NSS_Shift_Report_${dsmName || 'DSM'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Failed to generate image. Try again.');
      console.error(err);
    }
  };

  return (
    <div id="s-report" className="screen active" style={{paddingTop: 0, paddingBottom: '80px'}}>
      
      {/* STICKY CLOSING READINGS */}
      <div id="closing-sticky" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        padding: '14px 14px 10px',
        margin: '0 -14px',
        borderBottom: '1px solid rgba(255, 209, 0, 0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{fontSize: '10px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px'}}>
          <span>📊</span> EXPECTED CLOSING READINGS (AUTO)
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px'}}>
          {[1, 2, 3, 4].map(n => {
            const expectedClose = openings[n] + nozzleVolumes[n];
            const isHSD = n <= 2;
            const borderColor = isHSD ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 209, 0, 0.25)';
            const bgColor = isHSD ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 209, 0, 0.05)';
            const numColor = isHSD ? '#3b82f6' : '#FFD100';
            const valColor = isHSD ? '#93c5fd' : '#fde68a';
            
            return (
              <div key={n} style={{
                background: bgColor,
                borderRadius: '12px',
                padding: '8px 4px',
                textAlign: 'center',
                border: `1px solid ${borderColor}`,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.03)'
              }}>
                <div style={{fontSize: '13px', fontWeight: 900, color: numColor}}>N{n}</div>
                <div style={{fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: isHSD ? 'rgba(59,130,246,0.6)' : 'rgba(255,209,0,0.6)', textTransform: 'uppercase'}}>{nozzleLabels[n]}</div>
                <div style={{fontSize: '13px', fontWeight: 900, color: valColor, margin: '2px 0', fontFamily: 'monospace'}}>{expectedClose.toFixed(2)}</div>
                <div style={{fontSize: '9px', fontWeight: 700, color: '#22c55e'}}>+{nozzleVolumes[n].toFixed(2)}L</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{paddingTop: '10px'}}>
        
        {/* CLOSING RECONCILIATION FORM */}
        <div style={{
          background: 'linear-gradient(135deg, #0c1224 0%, #080b18 100%)',
          borderRadius: '20px',
          padding: '18px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          margin: '16px 0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{fontSize: '12px', fontWeight: 900, color: '#FFD100', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <span>⛽</span> PHYSICAL METER RECONCILIATION
          </div>
          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '4px', marginBottom: '14px'}}>
            Enter physical meter closing at shift-end to detect stock mismatch.
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px'}}>
            {[1, 2, 3, 4].map(n => {
              const clVal = closings[n];
              const parsedCl = parseFloat(clVal);
              const opVal = openings[n];
              const appSold = nozzleVolumes[n];
              
              let mismatchText = "—";
              let gap = 0;
              if (!isNaN(parsedCl)) {
                const meterSold = parsedCl - opVal;
                gap = appSold - meterSold;
                totalMismatch += gap;
                if (gap > 0.05 || gap < -0.05) {
                  mismatchText = `${gap > 0 ? '+' : ''}${gap.toFixed(2)}L`;
                } else {
                  mismatchText = "OK";
                }
              }

              const isHSD = n <= 2;
              const inputBorderColor = isHSD ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 209, 0, 0.2)';

              return (
                <div key={n} style={{
                  background: '#040814',
                  borderRadius: '12px',
                  padding: '8px 4px',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div style={{fontSize: '9px', fontWeight: 800, color: isHSD ? '#60a5fa' : '#fde68a', textTransform: 'uppercase', marginBottom: '6px'}}>N{n} Close</div>
                  <input 
                    type="number" 
                    step="0.01" 
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={n === 1 ? closingN1 : n === 2 ? closingN2 : n === 3 ? closingN3 : closingN4}
                    onChange={(e) => {
                      const v = e.target.value;
                      if(n === 1) setClosingN1(v);
                      else if(n === 2) setClosingN2(v);
                      else if(n === 3) setClosingN3(v);
                      else setClosingN4(v);
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${inputBorderColor}`,
                      color: '#f8fafc',
                      fontSize: '14px',
                      fontWeight: 800,
                      textAlign: 'center',
                      outline: 'none',
                      padding: '4px 0',
                    }}
                  />
                  <div style={{
                    fontSize: '10px', 
                    fontWeight: 800, 
                    marginTop: '6px',
                    color: mismatchText === 'OK' ? '#22c55e' : mismatchText !== '—' ? '#ef4444' : '#64748b'
                  }}>
                    {mismatchText}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            borderRadius: '12px',
            padding: '12px 16px',
            marginTop: '14px',
            fontSize: '12px',
            fontWeight: 700,
            background: Math.abs(totalMismatch) > 0.05 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
            border: Math.abs(totalMismatch) > 0.05 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
            color: Math.abs(totalMismatch) > 0.05 ? '#fca5a5' : '#86efac'
          }}>
            <span style={{fontWeight: 900, textTransform: 'uppercase'}}>Total Variance:</span> {totalMismatch > 0 ? '+' : ''}{totalMismatch.toFixed(2)}L
            <div style={{fontSize: '10px', marginTop: '2px', fontWeight: 500, color: Math.abs(totalMismatch) > 0.05 ? '#fca5a5bb' : '#86efacbb'}}>
              {Math.abs(totalMismatch) <= 0.05 
                ? '✓ App sales match meter readings perfectly.' 
                : '⚠️ App sales differ from physical meters. Double check entries.'}
            </div>
          </div>
        </div>

        {/* SHIFT REPORT CONTAINER (FOR CANVAS CONVERSION) */}
        <div ref={reportRef} style={{
          background: 'linear-gradient(135deg, #001440 0%, #002255 100%)',
          borderRadius: '24px',
          padding: '24px 20px',
          border: '1px solid rgba(255, 209, 0, 0.25)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid rgba(255, 209, 0, 0.3)',
            paddingBottom: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{fontSize: '22px', fontWeight: 950, color: '#FFD100', letterSpacing: '1px'}}>SHIFT REPORT</div>
              <div style={{fontSize: '10px', color: '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px', fontWeight: 800}}>NSS FUEL STATION</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '14px', fontWeight: 850, color: '#f8fafc'}}>{dsmName || 'DSM'}</div>
              <div style={{fontSize: '10px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 800, marginTop: '2px'}}>{shiftType || 'DAY'} Shift</div>
            </div>
          </div>
          
          <div style={{fontSize: '11px', color: '#94a3b8', marginBottom: '16px', display: 'flex', justifyContent: 'space-between'}}>
            <span>Duration: <b>{duration}</b></span>
            <span>Generated: <b>{new Date().toLocaleDateString()}</b></span>
          </div>
          
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'}}>
              <span style={{color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block'}}></span>Diesel HSD Sold
              </span>
              <span style={{color: '#93c5fd', fontWeight: 800, fontFamily: 'monospace'}}>{hsdLiters.toFixed(2)} L</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'}}>
              <span style={{color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#FFD100', display: 'inline-block'}}></span>Petrol MS Sold
              </span>
              <span style={{color: '#fde68a', fontWeight: 800, fontFamily: 'monospace'}}>{msLiters.toFixed(2)} L</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px'}}>
              <span style={{color: '#cbd5e1'}}>Total Litres Sold</span>
              <span style={{color: '#FFD100', fontWeight: 800, fontFamily: 'monospace'}}>{totalLiters.toFixed(2)} L</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'}}>
              <span style={{color: '#cbd5e1'}}>Total Transactions</span>
              <span style={{color: '#FFD100', fontWeight: 800}}>{totalTxns} entries</span>
            </div>
            <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontWeight: 900, color: '#e2e8f0', fontSize: '15px'}}>ACTUAL SALES</span>
              <span style={{color: '#22c55e', fontWeight: 950, fontSize: '22px', fontFamily: 'monospace'}}>{fmt(grandTotal)}</span>
            </div>
          </div>
          
          <div style={{
            fontSize: '11px', 
            fontWeight: 800, 
            color: '#FFD100', 
            letterSpacing: '1px', 
            textTransform: 'uppercase', 
            marginBottom: '10px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '4px'
          }}>
            Mode-wise Collection
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            {activeModes.map(m => (
              <div key={m.id} style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                padding: '10px 14px'
              }}>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{fontSize: '18px'}}>{m.icon}</span>
                  <div>
                    <div style={{fontWeight: 700, color: '#e2e8f0', fontSize: '13px'}}>{m.label}</div>
                    <div style={{fontSize: '10px', color: '#94a3b8'}}>{m.count} txn · {m.liters.toFixed(2)}L</div>
                  </div>
                </div>
                <div style={{fontWeight: 850, fontSize: '14px', color: m.color, fontFamily: 'monospace'}}>{fmt(m.amount)}</div>
              </div>
            ))}
          </div>
          
          {zeroModes.length > 0 && (
            <>
              <div style={{
                fontSize: '11px', 
                fontWeight: 800, 
                color: '#64748b', 
                letterSpacing: '1px', 
                textTransform: 'uppercase', 
                marginTop: '16px',
                marginBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                paddingBottom: '4px'
              }}>
                Zero Collection Modes
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                {zeroModes.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.02)', 
                    borderRadius: '10px', 
                    padding: '8px 10px',
                    opacity: 0.5
                  }}>
                    <span style={{fontSize: '14px'}}>{m.icon}</span>
                    <div>
                      <div style={{fontWeight: 600, color: '#94a3b8', fontSize: '11px'}}>{m.label}</div>
                      <div style={{fontSize: '9px', color: '#64748b'}}>₹0.00</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

      </div>
      
      {/* SHARING ACTIONS */}
      <div style={{padding: '0 14px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <button 
          onClick={doWhatsApp}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff',
            fontWeight: 850,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.15s'
          }}
        >
          <span>💬</span> Share on WhatsApp
        </button>
        
        <button 
          onClick={doShareReport}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #FFD100, #fbbf24)',
            color: '#001440',
            fontWeight: 900,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 209, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.15s'
          }}
        >
          <span>📥</span> Download Full Report
        </button>
      </div>

      <div style={{height: '80px'}}></div>
    </div>
  );
}
