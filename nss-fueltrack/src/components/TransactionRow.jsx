import React from 'react';
import { MODES, fmt, fmtTime } from '../constants';

export default function TransactionRow({ tx, onDelete }) {
  const mode = MODES.find((m) => m.id === tx.paymentMode) || {
    label: tx.modeLabel || 'Unknown',
    icon: '❓',
    color: '#64748b'
  };

  const isDeleted = tx.deleted;
  const isCredit = tx.paymentMode === 'credit';

  return (
    <div
      className={`relative bg-card border rounded-xl p-[12px] px-[14px] mb-2 transition-all ${
        isDeleted
          ? 'border-red-500/30 opacity-60'
          : isCredit
          ? 'border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.05)]'
          : 'border-border'
      }`}
    >
      {/* Delete button (✕) absolute top-right, visible if not deleted and onDelete provided */}
      {onDelete && !isDeleted && (
        <button
          onClick={() => onDelete(tx.id)}
          className="absolute top-2 right-3 text-red hover:text-red-400 font-extrabold text-[15px] p-1 select-none focus:outline-none"
          title="Delete Transaction"
        >
          ✕
        </button>
      )}

      {/* Top Row: Badge + Vehicle & Amount */}
      <div className="flex justify-between items-center mb-1.5 pr-6">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Payment Mode Badge */}
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${mode.color}22`,
              color: mode.color
            }}
          >
            {mode.icon} {mode.label}
          </span>

          {/* Vehicle Name */}
          <span
            className={`font-bold text-[14px] text-slate-200 ${
              isDeleted ? 'line-through text-slate-500' : ''
            }`}
          >
            {tx.vehicle}
          </span>

          {/* Overridden Badge */}
          {tx.isOverride && (
            <span className="text-[9px] bg-orange/13 text-orange border border-orange/30 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
              Override
            </span>
          )}

          {/* Deleted Badge */}
          {isDeleted && (
            <span className="text-[9px] bg-red/13 text-red border border-red/30 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
              Deleted
            </span>
          )}
        </div>

        {/* Amount */}
        <span
          className={`font-extrabold text-[15px] ${
            isDeleted ? 'line-through text-slate-500' : 'text-gold'
          }`}
        >
          {fmt(tx.amount)}
        </span>
      </div>

      {/* Bottom Row: Fuel + Liters + Rate + Timestamp */}
      <div
        className={`flex items-center gap-1.5 flex-wrap text-xs text-muted ${
          isDeleted ? 'line-through text-slate-600' : ''
        }`}
      >
        <span className="text-sub font-semibold">{tx.fuelLabel}</span>
        <span>·</span>
        <span className="text-sub">{tx.liters.toFixed(2)}L</span>
        <span>@</span>
        <span>{fmt(tx.rateUsed)}/L</span>
        {tx.note && (
          <>
            <span>·</span>
            <span className="text-slate-400 italic break-all max-w-[200px]">
              "{tx.note}"
            </span>
          </>
        )}
        <span className="text-[11px] text-slate-500 ml-auto select-none">
          {fmtTime(tx.timestamp)}
        </span>
      </div>

      {/* Override Reason Display */}
      {tx.isOverride && tx.overrideReason && !isDeleted && (
        <div className="mt-1.5 text-[11px] text-orange bg-orange/5 rounded p-1.5 px-2 border border-orange/10 leading-snug">
          <strong>⚠️ Justification:</strong> {tx.overrideReason}
        </div>
      )}

      {/* Deletion Reason Display */}
      {isDeleted && tx.deletionReason && (
        <div className="mt-1.5 text-[11px] text-red bg-red/5 rounded p-1.5 px-2 border border-red/10 leading-snug">
          <strong>❌ Deletion Reason:</strong> {tx.deletionReason}{' '}
          {tx.deletedAt && (
            <span className="text-slate-500">
              at {fmtTime(tx.deletedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
