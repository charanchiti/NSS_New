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
    <div id="hdr" className="sticky top-0 z-[100] flex flex-col shadow-2xl">
      {/* High Credit Alert Banner */}
      {isHighCredit && (
        <div className="bg-red-600 text-white py-1.5 px-4 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-1 select-none">
          <span>⚠️ High Credit Alert:</span>
          <span>{fmtRupee(totalCredit)} has been given on credit!</span>
        </div>
      )}
      
      <div className="flex justify-between items-center px-[18px] py-[14px]">
        {/* Left Side: DSM and Shift info */}
        <div>
          <div id="dsm-name" className="font-black text-[18px] leading-tight">
            {dsmName || '—'}
          </div>
          <div id="shift-meta" className="text-[10px] font-black tracking-wider uppercase mt-1">
            {(shiftType || 'day').toUpperCase()} SHIFT · {duration}
          </div>
          {startTime && (
            <div className="text-[9px] text-[#93c5fd] font-bold mt-0.5">
              Started {fmtTime(startTime)}
            </div>
          )}
        </div>

        {/* Right Side: Live Clock and Txn count */}
        <div className="text-right">
          <div id="live-time" className="font-black text-[20px] font-mono tracking-tight leading-tight">
            {clock}
          </div>
          <div id="txn-count" className="text-[11px] font-black uppercase mt-1">
            {txnCount} TXN
          </div>
        </div>
      </div>
    </div>
  );
}
