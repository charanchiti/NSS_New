import React from 'react';
import { MODES, fmt, fmtTime } from '../constants';

export default function TransactionRow({ tx, onEdit, onDelete }) {
  const mode = MODES.find((m) => m.id === tx.paymentMode) || {
    label: tx.modeLabel || 'Unknown',
    icon: '❓',
    color: '#64748b'
  };

  const isDeleted = tx.deleted;
  const isCredit = tx.paymentMode === 'credit';
  
  // Base styling for the row
  let rowStyle = {
    position: 'relative',
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: isDeleted ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
    transition: 'all 0.2s'
  };
  if (isCredit && !isDeleted) {
    rowStyle.borderLeft = `4px solid ${mode.color}`;
  }

  return (
    <div style={rowStyle}>
      {/* Top row with Mode badge, Vehicle tag and Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 900, 
            background: `${mode.color}15`, 
            padding: '4px 8px', 
            borderRadius: '6px',
            color: mode.color,
            border: `1px solid ${mode.color}35`,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{mode.icon}</span> {mode.label}
          </span>
          <span style={{ 
            fontWeight: 850, 
            fontSize: '15px', 
            color: '#f8fafc',
            textDecoration: isDeleted ? 'line-through' : 'none',
            letterSpacing: '0.5px'
          }}>
            {tx.vehicle}
          </span>
          {tx.isOverride && (
             <span style={{ fontSize: '9px', background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               ⚠️ Override
             </span>
          )}
          {tx.edited && (
            <span style={{ fontSize: '9px', background: 'rgba(255,209,0,0.12)', color: '#FFD100', border: '1px solid rgba(255,209,0,0.35)', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✏️ Edited
            </span>
          )}
          {isDeleted && (
            <span style={{ fontSize: '9px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🗑️ Deleted
            </span>
          )}
        </div>
        <div style={{
          fontWeight: 950,
          fontSize: '18px',
          color: isDeleted ? '#64748b' : '#FFD100',
          textDecoration: isDeleted ? 'line-through' : 'none',
          fontFamily: 'monospace'
        }}>
          {fmt(tx.amount)}
        </div>
      </div>

      {/* Middle row with Liters details, Fuel type and Rate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
        <span style={{
          fontWeight: 800, 
          color: tx.fuelId === 'hsd' ? '#60a5fa' : '#fbbf24',
          background: tx.fuelId === 'hsd' ? 'rgba(59,130,246,0.1)' : 'rgba(251,191,36,0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          {tx.fuelId === 'hsd' ? 'DIESEL (HSD)' : 'PETROL (MS)'}
        </span>
        <span>•</span>
        <span style={{ fontWeight: 750, color: '#f1f5f9' }}>{parseFloat(tx.liters).toFixed(2)} L</span>
        <span style={{ color: '#475569' }}>@</span>
        <span style={{ color: '#cbd5e1' }}>{fmt(tx.rateUsed)}/L</span>
        
        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
          ⏰ {fmtTime(tx.timestamp)}
        </span>
      </div>

      {/* Optional Note */}
      {tx.note && (
        <div style={{ 
          fontSize: '11px', 
          color: '#cbd5e1', 
          marginTop: '8px', 
          fontStyle: 'italic',
          background: 'rgba(255,255,255,0.03)',
          padding: '6px 10px',
          borderRadius: '6px',
          borderLeft: '2px solid #475569'
        }}>
          💬 "{tx.note}"
        </div>
      )}

      {/* Credit Details */}
      {isCredit && tx.creditName && !isDeleted && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#fca5a5', 
          background: 'rgba(239, 68, 68, 0.08)', 
          borderRadius: '10px', 
          padding: '10px', 
          border: '1px solid rgba(239,68,68,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontWeight: 800 }}>👤 Account: {tx.creditName}</div>
          {tx.creditPhone && <div style={{ color: '#f87171', fontSize: '10px' }}>📞 Phone: {tx.creditPhone}</div>}
        </div>
      )}

      {/* Edited original details */}
      {tx.edited && tx.originalAmount && !isDeleted && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#94a3b8', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '10px', 
          padding: '10px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <span style={{fontWeight: 800, color: '#e2e8f0'}}>✏️ Original Entry:</span> {fmt(tx.originalAmount)} · {tx.originalLiters?.toFixed(2)}L
        </div>
      )}

      {/* Override Justification */}
      {tx.isOverride && tx.overrideReason && !isDeleted && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#fdb574', 
          background: 'rgba(249,115,22,0.06)', 
          borderRadius: '10px', 
          padding: '10px', 
          border: '1px solid rgba(249,115,22,0.15)' 
        }}>
          <strong style={{color: '#f97316'}}>⚠️ Justification:</strong> {tx.overrideReason}
        </div>
      )}

      {/* Deletion Details */}
      {isDeleted && tx.deletionReason && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#fca5a5', 
          background: 'rgba(239,68,68,0.06)', 
          borderRadius: '10px', 
          padding: '10px', 
          border: '1px solid rgba(239,68,68,0.15)' 
        }}>
          <strong style={{color: '#ef4444'}}>❌ Deletion Reason:</strong> {tx.deletionReason}
        </div>
      )}

      {/* Actions */}
      {!isDeleted && (onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {onEdit && (
            <button 
              onClick={() => onEdit(tx.id)}
              style={{ 
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 209, 0, 0.35)',
                background: 'rgba(255, 209, 0, 0.05)',
                color: '#FFD100',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>✏️</span> Edit
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(tx.id)}
              style={{ 
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>✕</span> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
