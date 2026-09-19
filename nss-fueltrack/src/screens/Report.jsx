import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { COLLECTION_CATEGORIES, fmt, fmtDate, INCOME_CATEGORIES, DEDUCTION_CATEGORIES } from '../constants';

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="bg-[#001f5b] text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-t-xl">
        {title}
      </div>
      <div className="bg-[#0b1329] border border-slate-800 border-t-0 rounded-b-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function TableRow({ label, values, highlight, isTotal }) {
  return (
    <div className={`flex items-center px-4 py-2.5 border-b border-slate-800/70 last:border-0
      ${isTotal ? 'bg-[#FFD100]/10' : highlight ? 'bg-blue-900/10' : ''}`}
    >
      <span className={`flex-1 text-xs ${isTotal ? 'font-black text-[#FFD100]' : 'font-medium text-slate-300'}`}>
        {label}
      </span>
      {values.map((v, i) => (
        <span
          key={i}
          className={`text-xs font-bold min-w-[80px] text-right ${isTotal ? 'text-[#FFD100]' : 'text-white'}`}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

export default function Report({
  todayReport,
  viewReportId,
  showToast,
  navigateTo,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Determine which report to show
  const targetId = viewReportId || todayReport?.id || null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (targetId) {
          const r = await api.getReport(targetId);
          setReport(r);
        } else {
          setReport(null);
        }
      } catch (err) {
        showToast(`Failed to load report: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [targetId]);

  async function handlePdf() {
    if (!report) return;
    setPdfLoading(true);
    try {
      const filename = `NSS_Report_${report.date}_Pump0${report.pump_number}.pdf`;
      await api.downloadPdf(report.id, filename);
      showToast('📄 PDF downloaded!');
    } catch (err) {
      showToast(`PDF failed: ${err.message}`, 'error');
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-[#FFD100] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <span className="text-5xl">📊</span>
        <h2 className="text-lg font-black text-white">No Report Yet</h2>
        <p className="text-sm text-slate-400 max-w-[240px]">
          No daily report found. Create one using New Daily Entry.
        </p>
        <button
          onClick={() => navigateTo('entry')}
          className="px-6 py-3 bg-[#FFD100] text-[#001040] font-black text-sm rounded-2xl"
        >
          ➕ New Daily Entry
        </button>
      </div>
    );
  }

  const s = report.summary;
  const colMap = Object.fromEntries(
    (report.collections || []).map(c => [c.category, c])
  );

  const dieselNozzles = (report.nozzle_readings || []).filter(n => n.fuel_type === 'diesel');
  const msNozzles     = (report.nozzle_readings || []).filter(n => n.fuel_type === 'ms');
  const dieselPrice   = dieselNozzles[0]?.price || 0;
  const msPrice       = msNozzles[0]?.price || 0;

  return (
    <div id="screen-report" className="flex flex-col gap-2 pb-6">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#001f5b] to-[#0a1540] border border-blue-900/40 rounded-2xl p-5 text-center mb-3 shadow-xl">
        <p className="text-[10px] font-bold text-[#FFD100] uppercase tracking-[4px] mb-1">Bharat Petroleum Corporation Limited</p>
        <h1 className="text-lg font-black text-white">NSS FUEL STATION</h1>
        <p className="text-xs text-slate-300 font-bold mt-1">Daily Sales and Collection Report</p>

        <div className="grid grid-cols-2 gap-2 mt-4 text-left">
          {[
            ['Date',     fmtDate(report.date)],
            ['Pump',     `0${report.pump_number}`],
            ['Employee', report.employee_name],
            ['Timing',   report.start_time && report.end_time
                           ? `${report.start_time} – ${report.end_time}`
                           : report.start_time || '—'],
          ].map(([k, v]) => (
            <div key={k} className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-[9px] text-slate-400 uppercase font-bold">{k}</p>
              <p className="text-xs font-black text-white mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold
            ${report.status === 'completed' ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'completed' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
            {report.status === 'completed' ? 'Completed' : 'Draft'}
          </span>
        </div>
      </div>

      {/* ── FUEL SALES ─────────────────────────────────────────────── */}
      <Section title="⛽ Fuel Sales — Pump 01">
        {/* Column headers */}
        <div className="grid grid-cols-[60px_1fr_70px_70px_70px] gap-1 px-4 py-2 bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase">
          <span>Nozzle</span>
          <span>Fuel</span>
          <span className="text-right">Sales (L)</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
        </div>

        {(report.nozzle_readings || []).sort((a, b) => a.nozzle_number - b.nozzle_number).map(n => {
          const isHSD = n.fuel_type === 'diesel';
          return (
            <div key={n.nozzle_number}
              className={`grid grid-cols-[60px_1fr_70px_70px_70px] gap-1 px-4 py-3 border-b border-slate-800/60 items-center
                ${isHSD ? 'bg-blue-900/5' : 'bg-yellow-900/5'}`}>
              <span className={`text-xs font-black ${isHSD ? 'text-blue-300' : 'text-yellow-300'}`}>N{n.nozzle_number}</span>
              <div>
                <p className="text-[11px] font-bold text-white">{isHSD ? 'Diesel' : 'Motor Spirit'}</p>
                <p className="text-[9px] text-slate-500">{n.opening_reading?.toFixed(2)} → {n.closing_reading?.toFixed(2)}</p>
              </div>
              <span className="text-xs font-bold text-white text-right">{n.sales_litres?.toFixed(2)}</span>
              <span className="text-xs text-slate-400 text-right">₹{n.price?.toFixed(2)}</span>
              <span className="text-xs font-bold text-[#FFD100] text-right">{fmt(n.amount)}</span>
            </div>
          );
        })}

        {/* Totals */}
        <div className="flex items-center px-4 py-3 bg-[#FFD100]/10">
          <span className="flex-1 text-xs font-black text-[#FFD100] uppercase">TOTAL FUEL SALES</span>
          <span className="text-xs font-black text-[#FFD100] min-w-[70px] text-right">{s?.total_fuel_litres?.toFixed(2)} L</span>
          <span className="text-xs text-transparent min-w-[70px]">—</span>
          <span className="text-xs font-black text-[#FFD100] min-w-[70px] text-right">{fmt(s?.total_fuel_amount)}</span>
        </div>
      </Section>

      {/* ── COLLECTION / PAYMENT ───────────────────────────────────── */}
      <Section title="💰 Collection / Payment Details">
        <div className="grid grid-cols-[1fr_70px_70px_72px] gap-1 px-4 py-2 bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase">
          <span>Category</span>
          <span className="text-right">Day (₹)</span>
          <span className="text-right">Eve (₹)</span>
          <span className="text-right">Total (₹)</span>
        </div>

        {COLLECTION_CATEGORIES.map(cat => {
          const c = colMap[cat.id];
          const isDeduction = DEDUCTION_CATEGORIES.has(cat.id);
          const hasValue = c && c.total_amount > 0;
          return (
            <div key={cat.id}
              className={`grid grid-cols-[1fr_70px_70px_72px] gap-1 px-4 py-2.5 border-b border-slate-800/60 items-center
                ${isDeduction ? 'bg-red-950/10' : ''}`}>
              <span className={`text-xs font-medium ${isDeduction ? 'text-red-300' : 'text-slate-300'}`}>{cat.label}</span>
              <span className="text-xs text-slate-400 text-right">{c ? c.day_amount.toFixed(2) : '—'}</span>
              <span className="text-xs text-slate-400 text-right">{c ? c.evening_amount.toFixed(2) : '—'}</span>
              <span className={`text-xs font-bold text-right ${!hasValue ? 'text-slate-600' : isDeduction ? 'text-red-400' : 'text-white'}`}>
                {c ? fmt(c.total_amount) : '—'}
              </span>
            </div>
          );
        })}
      </Section>

      {/* ── SALES SUMMARY ──────────────────────────────────────────── */}
      <Section title="📈 Fuel Sales Summary">
        <div className="grid grid-cols-[1fr_70px_70px_80px] gap-1 px-4 py-2 bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase">
          <span>Fuel</span>
          <span className="text-right">Litres</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_70px_70px_80px] gap-1 px-4 py-3 border-b border-slate-800/60">
          <span className="text-xs font-bold text-blue-300">Diesel</span>
          <span className="text-xs text-white text-right">{s?.diesel_litres?.toFixed(2)}</span>
          <span className="text-xs text-slate-400 text-right">₹{dieselPrice.toFixed(2)}</span>
          <span className="text-xs font-bold text-white text-right">{fmt(s?.diesel_amount)}</span>
        </div>
        <div className="grid grid-cols-[1fr_70px_70px_80px] gap-1 px-4 py-3 border-b border-slate-800/60">
          <span className="text-xs font-bold text-yellow-300">Motor Spirit</span>
          <span className="text-xs text-white text-right">{s?.ms_litres?.toFixed(2)}</span>
          <span className="text-xs text-slate-400 text-right">₹{msPrice.toFixed(2)}</span>
          <span className="text-xs font-bold text-white text-right">{fmt(s?.ms_amount)}</span>
        </div>
        <div className="grid grid-cols-[1fr_70px_70px_80px] gap-1 px-4 py-3 bg-[#FFD100]/10">
          <span className="text-xs font-black text-[#FFD100]">TOTAL</span>
          <span className="text-xs font-black text-[#FFD100] text-right">{s?.total_fuel_litres?.toFixed(2)}</span>
          <span className="text-xs text-transparent text-right">—</span>
          <span className="text-xs font-black text-[#FFD100] text-right">{fmt(s?.total_fuel_amount)}</span>
        </div>
      </Section>

      {/* ── LUBRICATES ────────────────────────────────────────────── */}
      {report.lubricates?.length > 0 && (
        <Section title="🛢️ Lubricates">
          <div className="grid grid-cols-[1fr_70px_70px_70px] gap-1 px-4 py-2 bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase">
            <span>Product</span>
            <span className="text-right">Opening</span>
            <span className="text-right">Sales</span>
            <span className="text-right">Balance</span>
          </div>
          {report.lubricates.map(l => (
            <div key={l.product_name}
              className="grid grid-cols-[1fr_70px_70px_70px] gap-1 px-4 py-2.5 border-b border-slate-800/60 items-center">
              <span className="text-xs font-medium text-slate-300">{l.product_name}</span>
              <span className="text-xs text-slate-400 text-right">{l.opening_stock}</span>
              <span className="text-xs text-slate-400 text-right">{l.sales}</span>
              <span className="text-xs font-bold text-[#FFD100] text-right">{l.balance_stock}</span>
            </div>
          ))}
        </Section>
      )}

      {/* ── COLLECTION SUMMARY ────────────────────────────────────── */}
      <Section title="📋 Collection Summary">
        {[
          ['Expected Collection', fmt(s?.expected_collection), false],
          ['Gross Collection',    fmt(s?.gross_collection),    false],
          ['Total Deductions',    fmt(s?.total_deductions),    false],
          ['NET COLLECTION',      fmt(s?.net_collection),      true],
        ].map(([label, value, isNet]) => (
          <div key={label}
            className={`flex items-center justify-between px-4 py-3 border-b border-slate-800/60 last:border-0
              ${isNet ? 'bg-green-900/20' : ''}`}>
            <span className={`text-xs font-bold ${isNet ? 'text-green-400' : 'text-slate-300'}`}>{label}</span>
            <span className={`text-sm font-black ${isNet ? 'text-green-400' : 'text-white'}`}>{value}</span>
          </div>
        ))}
      </Section>

      {/* ── REMARKS ──────────────────────────────────────────────── */}
      {report.remarks && (
        <Section title="📝 Remarks">
          <p className="px-4 py-3 text-sm text-slate-300 leading-relaxed">{report.remarks}</p>
        </Section>
      )}

      {/* ── ACTIONS ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          id="btn-generate-pdf"
          onClick={handlePdf}
          disabled={pdfLoading}
          className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-400 text-[#001040] font-black text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-wide disabled:opacity-60"
        >
          {pdfLoading ? '⏳ Generating PDF...' : '📄 Generate PDF'}
        </button>
        <button
          id="btn-edit-report"
          onClick={() => navigateTo('entry')}
          className="w-full py-3 bg-[#0b1329] border border-slate-700 text-slate-300 font-bold text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all"
        >
          ✏️ Edit Entry
        </button>
      </div>
    </div>
  );
}
