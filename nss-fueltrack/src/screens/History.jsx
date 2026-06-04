import React from 'react';
import TransactionRow from '../components/TransactionRow';

export default function History({ transactions = [], onDeleteInitiate }) {
  const totalCount = transactions.length;
  const deletedCount = transactions.filter((t) => t.deleted).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Title with live count */}
      <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted">
        All Transactions ({totalCount})
      </div>

      {/* Transaction List */}
      {totalCount > 0 ? (
        <div className="flex flex-col">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onDelete={onDeleteInitiate}
            />
          ))}

          {/* Deleted transactions footer count */}
          {deletedCount > 0 && (
            <div className="mt-4 p-3 bg-red/5 border border-red/20 rounded-xl text-center text-xs text-red font-bold select-none">
              ⚠️ {deletedCount} deleted entry{deletedCount > 1 ? 's' : ''} logged this shift
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-[60px] px-5 bg-card/40 border border-border/50 rounded-2xl flex flex-col items-center justify-center">
          <div className="text-[48px] mb-3 select-none">📋</div>
          <div className="text-slate-300 font-medium">No transactions yet</div>
          <div className="text-[13px] text-slate-500 mt-1">
            Logs of your shift will appear here.
          </div>
        </div>
      )}
    </div>
  );
}
