import React from 'react';
import { MODES, fmt } from '../constants';
import TransactionRow from '../components/TransactionRow';

export default function Dashboard({ transactions = [], shiftMeta = null, onStartAudit }) {
  const activeTxns = transactions.filter((t) => !t.deleted);

  // Grand totals
  const grandAmt = activeTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const grandLiters = activeTxns.reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);

  // Nozzle calculations
  const nozzleVolumes = { 1: 0, 2: 0, 3: 0, 4: 0 };
  activeTxns.forEach((t) => {
    const n = t.nozzle || 1;
    if (nozzleVolumes[n] !== undefined) {
      nozzleVolumes[n] += parseFloat(t.liters || 0);
    }
  });

  const openingN = {
    1: shiftMeta?.openingN1 || 0.0,
    2: shiftMeta?.openingN2 || 0.0,
    3: shiftMeta?.openingN3 || 0.0,
    4: shiftMeta?.openingN4 || 0.0,
  };

  // Recent entries (last 5)
  const recentEntries = activeTxns.slice(0, 5);

  return (
    <div id="s-dash" className="flex flex-col gap-4 pb-24 max-w-[480px] mx-auto w-full font-sans select-none animate-fadeUp">
      
      {/* TODAY'S SUMMARY */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TODAY'S SUMMARY</span>
          <span className="text-[9px] font-bold text-slate-500 cursor-pointer">View All {'>'}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase">TOTAL SALES (₹)</span>
            <span className="text-base font-black text-white mt-1">{grandAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            <span className="text-[9px] font-bold text-green-500 mt-0.5">↑ 12.5%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase">LITRES SOLD</span>
            <span className="text-base font-black text-white mt-1">{grandLiters.toFixed(2)} L</span>
            <span className="text-[9px] font-bold text-green-500 mt-0.5">↑ 8.3%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase">TRANSACTIONS</span>
            <span className="text-base font-black text-white mt-1">{activeTxns.length}</span>
            <span className="text-[9px] font-bold text-green-500 mt-0.5">↑ 5.2%</span>
          </div>
        </div>
      </div>

      {/* FUEL STOCK (APPROX) */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FUEL STOCK (APPROX)</span>
          <span className="text-[9px] font-bold text-slate-500">Updated just now</span>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <span>⛽</span> HSD (Diesel)
              </div>
              <div className="text-[10px] text-slate-400">18,450 L / 45,000 L</div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-[#FFD100] h-1.5 rounded-full" style={{ width: '41%' }}></div>
            </div>
            <div className="text-right text-[10px] font-bold text-[#FFD100]">41%</div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <span className="text-green-500">⛽</span> MS (Petrol)
              </div>
              <div className="text-[10px] text-slate-400">8,240 L / 20,000 L</div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '41%' }}></div>
            </div>
            <div className="text-right text-[10px] font-bold text-green-500">41%</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <button className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95">
          <span className="text-xl">⚡</span>
          <span className="text-[9px] font-bold text-slate-300">Quick Entry</span>
        </button>
        <button className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95">
          <span className="text-xl">📘</span>
          <span className="text-[9px] font-bold text-slate-300">Credit Ledger</span>
        </button>
        <button className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95">
          <span className="text-xl">📉</span>
          <span className="text-[9px] font-bold text-slate-300">Expenses</span>
        </button>
        <button className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95">
          <span className="text-xl">🎁</span>
          <span className="text-[9px] font-bold text-slate-300">Rewards</span>
        </button>
      </div>

      {/* Settle Shift & Audit Button */}
      <button 
        type="button" 
        onClick={onStartAudit}
        className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-500 hover:from-gold hover:to-amber-600 text-[#001440] font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 border-none"
      >
        📋 Settle Shift & Run Audit
      </button>

      {/* Live Running Totalizer */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📊</span> Current Meter Readings (VTOT)
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => {
            const openVal = openingN[n];
            const soldVal = nozzleVolumes[n];
            const currentTotalizer = openVal + soldVal;
            const typeLabel = (n === 1 || n === 2) ? 'HSD' : 'MS';
            const isHSD = typeLabel === 'HSD';
            
            return (
              <div 
                key={n} 
                className={`border rounded-xl p-3 shadow-inner relative overflow-hidden flex flex-col justify-between ${
                  isHSD 
                    ? 'bg-[#09152e] border-blue-500/20' 
                    : 'bg-[#1b1509] border-[#FFD100]/20'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-black uppercase ${isHSD ? 'text-blue-400' : 'text-[#FFD100]'}`}>
                    N{n} {typeLabel}
                  </span>
                  <span className="text-[8px] font-extrabold text-slate-500">Nozzle {n}</span>
                </div>
                
                <div className="text-lg font-black text-slate-100 mt-2 font-mono tracking-tight">
                  {currentTotalizer.toFixed(2)}
                </div>
                
                <div className="flex justify-between items-center mt-1 border-t border-slate-850 pt-1 text-[9px] font-black text-slate-400">
                  <span>Open: {openVal}</span>
                  <span className="text-green-500">+{soldVal.toFixed(2)}L</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Collection by Mode */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">
          💰 Collections by Payment Mode
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => {
            const isCredit = mode.id === 'credit';
            const modeTxns = activeTxns.filter((t) => t.paymentMode === mode.id);
            const modeAmt = modeTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const modeLiters = modeTxns.reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);

            const colorText = isCredit ? 'text-red-400' : 'text-[#FFD100]';
            const borderAccent = isCredit ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500';
            const displayLabel = isCredit ? 'Credit' : mode.label;

            return (
              <div
                key={mode.id}
                className={`bg-[#050b18] border border-slate-850 rounded-xl p-3 flex flex-col justify-between ${borderAccent} shadow-sm`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-300">{displayLabel}</span>
                  <span className="text-lg">{mode.icon}</span>
                </div>
                
                <div className={`text-base font-black mt-2 ${colorText}`}>
                  {fmt(modeAmt)}
                </div>
                
                <div className="text-[8px] font-bold text-slate-500 mt-1">
                  {modeTxns.length} txn · {modeLiters.toFixed(1)}L
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECENT ENTRIES */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RECENT TRANSACTIONS</span>
          <span className="text-[9px] font-bold text-slate-500 cursor-pointer">View All {'>'}</span>
        </div>
        
        {recentEntries.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {recentEntries.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            <div className="text-3xl mb-1">⛽</div>
            <div className="text-xs font-bold">No transactions logged yet.</div>
            <div className="text-[10px] mt-0.5">Use bottom nav ➕ to log entries.</div>
          </div>
        )}
      </div>

      {/* LOW STOCK ALERT */}
      <div className="bg-amber-950/20 border-l-4 border-amber-500 rounded-r-xl p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl text-amber-500">⚠️</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">LOW STOCK ALERT</span>
            <span className="text-[9px] font-bold text-slate-400">Petrol stock is below 10,000 L</span>
          </div>
        </div>
        <span className="text-amber-500">{'>'}</span>
      </div>
    </div>
  );
}
