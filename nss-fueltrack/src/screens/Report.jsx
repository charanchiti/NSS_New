import React from 'react';
import { MODES, fmt, fmtTime } from '../constants';

export default function Report({
  transactions = [],
  dsmName,
  shiftType,
  startTime,
  duration
}) {
  // Filter active transactions
  const activeTxns = transactions.filter((t) => !t.deleted);

  // Stats
  const totalLiters = activeTxns.reduce((sum, t) => sum + t.liters, 0);
  const totalTxns = activeTxns.length;
  const grandTotal = activeTxns.reduce((sum, t) => sum + t.amount, 0);

  // Override count
  const overrideCount = activeTxns.filter((t) => t.isOverride).length;

  // Credit calculation
  const creditTxns = activeTxns.filter((t) => t.paymentMode === 'credit');
  const creditTotal = creditTxns.reduce((sum, t) => sum + t.amount, 0);
  const creditCount = creditTxns.length;

  // Collectible Cash + Digital (excludes credit)
  const collectibleTotal = grandTotal - creditTotal;

  // Split modes into collected vs zero
  const activeModes = [];
  const zeroModes = [];

  MODES.forEach((mode) => {
    const txnsOfMode = activeTxns.filter((t) => t.paymentMode === mode.id);
    const amt = txnsOfMode.reduce((sum, t) => sum + t.amount, 0);
    const lit = txnsOfMode.reduce((sum, t) => sum + t.liters, 0);

    const modeSummary = {
      ...mode,
      count: txnsOfMode.length,
      amount: amt,
      liters: lit
    };

    if (txnsOfMode.length > 0) {
      activeModes.push(modeSummary);
    } else {
      zeroModes.push(modeSummary);
    }
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header Card */}
      <div className="report-hdr bg-card rounded-2xl border border-border p-5 text-center">
        <div className="report-title font-black text-[22px] text-gold tracking-[2px] uppercase">
          SHIFT REPORT
        </div>
        <div className="report-meta text-sub text-xs font-semibold mt-1 uppercase">
          {dsmName || '—'} · {(shiftType || 'DAY').toUpperCase()} SHIFT
        </div>
        <div className="report-meta text-muted text-xs mt-1">
          Duration: {duration}
        </div>
        {startTime && (
          <div className="text-[11px] text-muted font-bold mt-1.5 bg-bg/50 border border-border/40 py-1 px-3 rounded-lg inline-block">
            Shift Started (recorded by app): <span className="text-slate-200">{fmtTime(startTime)}</span>
          </div>
        )}
      </div>

      {/* Totals Card */}
      <div className="report-total bg-[#0f2540] rounded-2xl border border-blue-600 p-5 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>Total Liters Sold</span>
          <span className="color-gold font-bold text-gold">{totalLiters.toFixed(2)} L</span>
        </div>
        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>Total Transactions</span>
          <span className="color-gold font-bold text-gold">{totalTxns}</span>
        </div>
        
        <div className="h-px bg-border my-2" />
        
        <div className="flex justify-between items-center">
          <span className="font-extrabold text-[16px] text-white">GRAND TOTAL</span>
          <span className="text-green font-black text-[22px] tracking-tight leading-none">
            {fmt(grandTotal)}
          </span>
        </div>

        {/* Collectible Total (Excludes Credit) */}
        <div className="flex justify-between items-center text-xs text-slate-400 mt-1 select-none">
          <span>Collectible Cash + Digital</span>
          <span className="text-slate-200 font-bold">{fmt(collectibleTotal)}</span>
        </div>

        {/* Override Warning Count */}
        {overrideCount > 0 && (
          <div className="text-orange text-xs font-bold mt-2 pt-2 border-t border-blue-500/20 flex items-center justify-center gap-1 select-none animate-pulse">
            ⚠️ {overrideCount} manual override{overrideCount > 1 ? 's' : ''} this shift
          </div>
        )}
      </div>

      {/* Loophole 7: Credit Alert Section */}
      {creditTotal > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-4 text-red flex flex-col gap-1">
          <div className="text-sm font-black flex items-center gap-1">
            <span>⚠️ Credit Alert:</span>
            <span>{fmt(creditTotal)} given on credit</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-semibold">
            Across {creditCount} credit transaction{creditCount > 1 ? 's' : ''} this shift. Please verify manually with owner.
          </div>
        </div>
      )}

      {/* Mode-wise Breakdown */}
      <div>
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
          Mode-wise Breakdown
        </div>
        <div className="flex flex-col gap-2">
          {activeModes.map((mode) => (
            <div
              key={mode.id}
              className="report-row bg-card border border-border rounded-xl p-3.5 px-4 flex justify-between items-center"
            >
              <div className="rr-left flex gap-3 items-center">
                <span className="rr-icon text-[22px] select-none">{mode.icon}</span>
                <div>
                  <div className="rr-name font-bold text-slate-200 text-[15px]">
                    {mode.label}
                  </div>
                  <div className="rr-sub text-xs text-muted">
                    {mode.count} txn · {mode.liters.toFixed(2)}L
                  </div>
                </div>
              </div>
              <div className="rr-amt font-extrabold text-[17px]" style={{ color: mode.color }}>
                {fmt(mode.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zero Collection */}
      {zeroModes.length > 0 && (
        <div>
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
            Zero Collection
          </div>
          <div className="flex flex-col gap-2">
            {zeroModes.map((mode) => (
              <div
                key={mode.id}
                className="report-row bg-card border border-border rounded-xl p-3.5 px-4 flex justify-between items-center opacity-35"
              >
                <div className="rr-left flex gap-3 items-center">
                  <span className="rr-icon text-[22px] select-none">{mode.icon}</span>
                  <div>
                    <div className="rr-name font-bold text-slate-200 text-[15px]">
                      {mode.label}
                    </div>
                    <div className="rr-sub text-xs text-muted">
                      0 txn · 0.00L
                    </div>
                  </div>
                </div>
                <div className="rr-amt font-extrabold text-[17px] text-muted">
                  ₹0.00
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
