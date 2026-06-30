import React, { useState } from 'react';
import { MODES, fmt } from '../constants';
import TransactionRow from '../components/TransactionRow';

export default function History({ transactions = [], onDeleteInitiate, onEditInitiate }) {
  const activeTxns = transactions.filter((t) => !t.deleted);
  const totalCount = transactions.length;
  
  // Grand totals (Active only)
  const grandAmt = activeTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Soft Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  const handleDeleteClick = (tx) => {
    setTxToDelete(tx);
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteReason.trim().length < 5) return;
    onDeleteInitiate(txToDelete.id, deleteReason);
    setShowDeleteModal(false);
    setTxToDelete(null);
  };

  return (
    <div id="s-hist" className="screen active" style={{padding: '0 14px 80px'}}>
      
      {/* HISTORY SETTLEMENT SUMMARY */}
      <div id="hist-summary-card" style={{
        background: 'linear-gradient(135deg, #001440 0%, #002868 50%, #0a132c 100%)',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 209, 0, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          right: '-10px',
          top: '-10px',
          fontSize: '70px',
          opacity: 0.06,
          userSelect: 'none'
        }}>
          📊
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 900,
          color: '#FFD100',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>📊</span> SHIFT COLLECTION SUMMARY
        </div>
        
        <div id="hist-mode-rows" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {MODES.map((mode) => {
            const modeTxns = activeTxns.filter((t) => t.paymentMode === mode.id);
            if (modeTxns.length === 0) return null;
            const modeAmt = modeTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            
            return (
              <div key={mode.id} style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '16px'}}>{mode.icon}</span>
                  <span style={{fontSize: '13px', fontWeight: 650, color: '#94a3b8'}}>{mode.label}</span>
                </div>
                <span style={{fontSize: '14px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace'}}>{fmt(modeAmt)}</span>
              </div>
            );
          })}
        </div>
        
        <div style={{borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px', marginTop: '10px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: 800, color: '#e2e8f0', fontSize: '14px', letterSpacing: '0.5px'}}>ACTUAL SALES (LOGGED)</span>
            <span id="hist-actual-sales" style={{fontWeight: 950, color: '#FFD100', fontSize: '20px', fontFamily: 'monospace'}}>{fmt(grandAmt)}</span>
          </div>
        </div>
      </div>

      <div className="sec" id="hist-title" style={{
        fontSize: '11px',
        fontWeight: 800,
        color: '#94a3b8',
        letterSpacing: '1.5px',
        marginBottom: '10px',
        marginTop: '6px'
      }}>
        ALL TRANSACTIONS ({totalCount})
      </div>
      
      {totalCount > 0 ? (
        <div id="hist-list" style={{
          background: '#0d1326',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div className="flex flex-col gap-0">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onDelete={() => handleDeleteClick(tx)}
                onEdit={(id) => onEditInitiate(id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty" id="hist-empty" style={{
          background: '#0d1326',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div className="empty-ic" style={{fontSize: '48px', marginBottom: '12px'}}>📋</div>
          <div style={{color: '#64748b', fontWeight: 700, fontSize: '14px'}}>No transactions logged in this shift.</div>
        </div>
      )}

      {/* SOFT DELETE REASON MODAL */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0a1024',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'popIn 0.3s ease'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 900, color: '#ef4444', marginBottom: '8px'}}>
              <span>⚠️</span> Confirm Deletion
            </div>
            <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '18px', lineHeight: 1.5}}>
              You are deleting a logged transaction. The owner will see this in the audit log. Please provide a reason.
            </div>
            <input
              type="text"
              placeholder="Why are you deleting this? (min 5 chars)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              style={{
                width: '100%',
                background: '#040817',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '14px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '20px',
                outline: 'none',
                fontWeight: 700
              }}
            />
            <div style={{display: 'flex', gap: '12px'}}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setTxToDelete(null);
                }}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#94a3b8',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Cancel
              </button>
              <button 
                disabled={deleteReason.trim().length < 5}
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  background: deleteReason.trim().length < 5 ? '#311010' : '#ef4444',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  opacity: deleteReason.trim().length < 5 ? 0.5 : 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{height: '20px'}}></div>
    </div>
  );
}
