import React from 'react';
import { fmt, fmtDateLong, today } from '../constants';

export default function Dashboard({
  todayReport,
  fuelPrices,
  activePump,
  navigateTo,
  refreshTodayReport,
}) {
  const status = todayReport?.status || null;

  const statusConfig = {
    null:       { label: 'Not Started', color: 'text-slate-400', bg: 'bg-slate-800/60', dot: 'bg-slate-500' },
    draft:      { label: 'In Progress', color: 'text-amber-400',  bg: 'bg-amber-900/30', dot: 'bg-amber-400 animate-pulse' },
    completed:  { label: 'Completed',   color: 'text-green-400',  bg: 'bg-green-900/30', dot: 'bg-green-400' },
  };
  const sc = statusConfig[status] ?? statusConfig[null];

  const summary = todayReport?.summary;

  return (
    <div id="screen-dashboard" className="flex flex-col gap-4 pb-4 animate-fadeIn">

      {/* Date & Greeting */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TODAY</p>
        <h1 className="text-lg font-black text-white mt-0.5">
          {fmtDateLong(today())}
        </h1>
      </div>

      {/* Pump Status Card */}
      <div className="bg-gradient-to-br from-[#001f5b] to-[#0a1a40] border border-blue-900/40 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Pump</span>
            <div className="text-2xl font-black text-white mt-1">Pump 0{activePump}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">NSS Fuel Station · BPCL</div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[#FFD100]/10 border border-[#FFD100]/20 flex items-center justify-center">
            <span className="text-3xl">⛽</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${sc.bg}`}>
          <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
          <span className={`text-xs font-bold ${sc.color}`}>
            Today's Report: {sc.label}
          </span>
        </div>
      </div>

      {/* Today's Summary — only if report exists */}
      {summary && (
        <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Today's Summary</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Total Sales</p>
              <p className="text-base font-black text-[#FFD100] mt-1">{fmt(summary.total_fuel_amount)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Litres Sold</p>
              <p className="text-base font-black text-white mt-1">{summary.total_fuel_litres.toFixed(2)} L</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Net Collection</p>
              <p className="text-base font-black text-green-400 mt-1">{fmt(summary.net_collection)}</p>
            </div>
          </div>

          {/* Fuel breakdown */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
            <div className="bg-blue-900/20 rounded-xl p-3">
              <p className="text-[9px] font-bold text-blue-300 uppercase">Diesel</p>
              <p className="text-sm font-black text-white mt-1">{summary.diesel_litres.toFixed(2)} L</p>
              <p className="text-[10px] text-slate-400">{fmt(summary.diesel_amount)}</p>
            </div>
            <div className="bg-yellow-900/20 rounded-xl p-3">
              <p className="text-[9px] font-bold text-yellow-300 uppercase">Motor Spirit</p>
              <p className="text-sm font-black text-white mt-1">{summary.ms_litres.toFixed(2)} L</p>
              <p className="text-[10px] text-slate-400">{fmt(summary.ms_amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Prices */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Current Fuel Prices</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[9px] font-bold text-blue-300 uppercase">Diesel</span>
            <span className="text-xl font-black text-white">₹{fuelPrices.diesel?.toFixed(2)}</span>
            <span className="text-[9px] text-slate-500">per litre</span>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[9px] font-bold text-yellow-300 uppercase">Motor Spirit</span>
            <span className="text-xl font-black text-white">₹{fuelPrices.ms?.toFixed(2)}</span>
            <span className="text-[9px] text-slate-500">per litre</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {status === null && (
          <button
            id="btn-new-entry"
            onClick={() => navigateTo('entry')}
            className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-400 text-[#001040] font-black text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-wide"
          >
            ➕ New Daily Entry
          </button>
        )}

        {status === 'draft' && (
          <button
            id="btn-continue-entry"
            onClick={() => navigateTo('entry')}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-wide"
          >
            ✏️ Continue Today's Entry
          </button>
        )}

        {todayReport && (
          <button
            id="btn-view-report"
            onClick={() => navigateTo('report', { reportId: todayReport.id })}
            className="w-full py-4 bg-[#0b1329] border border-slate-700 text-white font-bold text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all"
          >
            📊 View Today's Report
          </button>
        )}

        <button
          id="btn-history"
          onClick={() => navigateTo('history')}
          className="w-full py-4 bg-[#0b1329] border border-slate-700 text-slate-300 font-bold text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all"
        >
          📋 View History
        </button>
      </div>
    </div>
  );
}
