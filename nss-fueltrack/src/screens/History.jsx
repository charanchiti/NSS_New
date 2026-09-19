import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { fmt, fmtDate } from '../constants';

export default function History({ navigateTo }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  async function loadReports() {
    setLoading(true);
    try {
      const data = await api.listReports(dateFrom || null, dateTo || null);
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, []);

  function handleFilter(e) {
    e.preventDefault();
    loadReports();
  }

  const statusConfig = {
    draft:     { label: 'Draft',     color: 'text-amber-400 bg-amber-900/30' },
    completed: { label: 'Completed', color: 'text-green-400 bg-green-900/30' },
  };

  return (
    <div id="screen-history" className="flex flex-col gap-4 pb-6">

      <div>
        <h1 className="text-lg font-black text-white">History</h1>
        <p className="text-[10px] text-slate-500">All saved daily reports</p>
      </div>

      {/* Date filter */}
      <form onSubmit={handleFilter} className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Date</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-slate-500 uppercase font-bold">From</label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm text-white bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-slate-500 uppercase font-bold">To</label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm text-white bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-[#FFD100] text-[#001040] font-black text-sm rounded-xl active:scale-[0.98] transition-all"
          >
            Apply Filter
          </button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(loadReports, 100); }}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl active:scale-[0.98] transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#FFD100] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-sm font-bold text-slate-400">No reports found</p>
          <p className="text-xs text-slate-600">Create a daily entry to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => {
            const sc = statusConfig[r.status] || statusConfig.draft;
            return (
              <button
                key={r.id}
                id={`history-report-${r.id}`}
                onClick={() => navigateTo('report', { reportId: r.id })}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-2xl p-4 text-left active:scale-[0.99] transition-all hover:border-slate-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-base font-black text-white">{fmtDate(r.date)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.employee_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${sc.color}`}>
                      {sc.label}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">Pump 0{r.pump_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Sales (₹)</p>
                    <p className="text-sm font-black text-[#FFD100] mt-0.5">{fmt(r.total_sales_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Litres</p>
                    <p className="text-sm font-black text-white mt-0.5">{r.total_sales_litres?.toFixed(2)} L</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Collected</p>
                    <p className="text-sm font-black text-green-400 mt-0.5">{fmt(r.total_collection)}</p>
                  </div>
                </div>

                <p className="text-[9px] text-slate-600 text-right mt-2">Tap to view report →</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
