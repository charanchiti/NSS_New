import React from 'react';
import { fmtTime } from '../hooks/useClock';

export default function Header({
  dsmName,
  shiftType,
  startTime,
  clock,
  duration,
  txnCount,
  totalCredit
}) {
  const isHighCredit = totalCredit > 5000;

  // Formatted Indian Rupee for high credit limit alert
  const fmtRupee = (n) => {
    return '₹' + Number(n).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="sticky top-0 z-[100] bg-card border-b border-border flex flex-col">
      {/* High Credit Alert Banner */}
      {isHighCredit && (
        <div className="bg-red text-white py-1.5 px-4 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-1">
          <span>⚠️ High Credit Limit Alert:</span>
          <span>{fmtRupee(totalCredit)} has been given on credit!</span>
        </div>
      )}
      
      <div className="flex justify-between items-center px-[18px] py-[14px]">
        {/* Left Side: DSM and Shift info */}
        <div>
          <div className="font-extrabold text-[18px] text-gold leading-tight">
            {dsmName || '—'}
          </div>
          <div className="text-[11px] text-muted font-bold tracking-[1px] uppercase mt-0.5">
            {(shiftType || 'DAY').toUpperCase()} SHIFT · {duration}
          </div>
          {startTime && (
            <div className="text-[10px] text-muted/80 mt-0.5">
              Started {fmtTime(startTime)}
            </div>
          )}
        </div>

        {/* Right Side: Live Clock and Txn count */}
        <div className="text-right">
          <div className="font-bold text-[20px] font-mono tracking-tight leading-tight">
            {clock}
          </div>
          <div className="text-[12px] text-gold font-semibold mt-0.5">
            {txnCount} TXN
          </div>
        </div>
      </div>
    </div>
  );
}
