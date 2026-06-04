import React from 'react';
import { MODES, fmt } from '../constants';
import TransactionRow from '../components/TransactionRow';

export default function Dashboard({ transactions = [] }) {
  // Filter active (non-deleted) transactions for calculations
  const activeTxns = transactions.filter((t) => !t.deleted);

  // Grand totals
  const grandAmt = activeTxns.reduce((sum, t) => sum + t.amount, 0);
  const grandLiters = activeTxns.reduce((sum, t) => sum + t.liters, 0);

  // Manual overrides count (active transactions only)
  const overrideCount = activeTxns.filter((t) => t.isOverride).length;

  // Recent entries (last 5 active transactions)
  const recentEntries = activeTxns.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* Grand Total Card */}
      <div className="grand-card flex flex-col items-center justify-center p-6 rounded-2xl border text-center bg-gradient-to-br from-[#1e3a5f] to-[#1e293b] border-blue-500/20">
        <div className="text-[12px] font-bold tracking-[1.5px] uppercase text-blue-300">
          Total Collection
        </div>
        <div className="text-[42px] font-black text-white my-2 tracking-tight leading-none">
          {fmt(grandAmt)}
        </div>
        <div className="text-[13px] text-slate-400">
          {grandLiters.toFixed(2)} Liters · {activeTxns.length} Transactions
        </div>

        {/* Dashboard Manual Override warning banner (if > 0 overrides) */}
        {overrideCount > 0 && (
          <div className="mt-3.5 bg-orange/13 text-orange text-xs font-bold py-1 px-3 rounded-full border border-orange/20 flex items-center gap-1 animate-pulse">
            ⚠️ {overrideCount} amount override{overrideCount > 1 ? 's' : ''} logged
          </div>
        )}
      </div>

      {/* Payment Mode Grid */}
      <div>
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
          Collection by Payment Mode
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          {MODES.map((mode) => {
            const isCredit = mode.id === 'credit';
            const modeTxns = activeTxns.filter((t) => t.paymentMode === mode.id);
            const modeAmt = modeTxns.reduce((sum, t) => sum + t.amount, 0);
            const modeLiters = modeTxns.reduce((sum, t) => sum + t.liters, 0);

            // Credit Mode Loophole 7 requirement:
            // "the Credit tile must always show in RED regardless of its mode color, with label '⚠️ Credit (No Cash)'"
            const tileBorderColor = isCredit ? 'border-l-[#ef4444]' : '';
            const tileTextColor = isCredit ? 'text-red' : '';
            const displayLabel = isCredit ? '⚠️ Credit (No Cash)' : mode.label;
            const customTileColor = isCredit ? '#ef4444' : mode.color;

            return (
              <div
                key={mode.id}
                className="bg-card border border-border rounded-xl p-3.5 border-l-4"
                style={{
                  borderLeftColor: customTileColor
                }}
              >
                <div className="text-[22px] mb-1 select-none">{mode.icon}</div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide">
                  {displayLabel}
                </div>
                <div
                  className="text-[18px] font-extrabold mt-1 tracking-tight"
                  style={{ color: customTileColor }}
                >
                  {fmt(modeAmt)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {modeTxns.length} txn · {modeLiters.toFixed(1)}L
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Entries Section */}
      {recentEntries.length > 0 ? (
        <div>
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
            Recent Entries
          </div>
          <div>
            {recentEntries.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-[60px] px-5 bg-card/40 border border-border/50 rounded-2xl flex flex-col items-center justify-center">
          <div className="text-[48px] mb-3 select-none">⛽</div>
          <div className="text-slate-300 font-medium">No transactions yet.</div>
          <div className="text-[13px] text-slate-500 mt-1">
            Tap ➕ Entry to add one.
          </div>
        </div>
      )}
    </div>
  );
}
