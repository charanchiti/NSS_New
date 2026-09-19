import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { NOZZLES, COLLECTION_CATEGORIES, today, nowTime, fmt } from '../constants';

const SECTION_LABELS = {
  A: 'Basic Information',
  B: 'Nozzle Readings (Pump 01)',
  C: 'Collection / Payment Details',
  D: 'Lubricates',
  E: 'Remarks',
};

function SectionHeader({ id, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-[#FFD100] text-[#001040] font-black text-xs flex items-center justify-center shrink-0">
        {id}
      </div>
      <h2 className="text-sm font-black text-white uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md ${className}`}>
      {children}
    </div>
  );
}

function InputField({ label, id, type = 'text', value, onChange, placeholder, inputMode, min, required, readOnly, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        readOnly={readOnly}
        className={`w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50 transition-all
          ${readOnly
            ? 'bg-slate-900/50 border-slate-800 text-slate-400 cursor-default'
            : 'bg-[#050b18] border-slate-700 hover:border-slate-600'}`}
      />
      {hint && <p className="text-[9px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function Entry({
  todayReport,
  fuelPrices,
  lubricateProducts,
  showToast,
  navigateTo,
  refreshTodayReport,
}) {
  // Section A — Basic Info
  const [date, setDate]           = useState(today());
  const [employeeName, setEmployeeName] = useState('');
  const [startTime, setStartTime] = useState(nowTime());
  const [endTime, setEndTime]     = useState('');

  // Section B — Nozzle Readings
  // Array of { nozzle_number, fuel_type, opening_reading, closing_reading }
  const [nozzleReadings, setNozzleReadings] = useState(
    NOZZLES.map(n => ({
      nozzle_number: n.nozzle_number,
      fuel_type: n.fuel_type,
      opening_reading: '',
      closing_reading: '',
    }))
  );

  // Section C — Collections
  // Array of { category, day_amount, evening_amount }
  const [collections, setCollections] = useState(
    COLLECTION_CATEGORIES.map(c => ({ category: c.id, day_amount: '', evening_amount: '' }))
  );

  // Section D — Lubricates
  const [lubricates, setLubricates] = useState([]);

  // Section E — Remarks
  const [remarks, setRemarks] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Existing report for today?
  const existingId = todayReport?.id || null;

  // Populate form from existing report (if editing)
  useEffect(() => {
    if (todayReport) {
      setDate(todayReport.date || today());
      setEmployeeName(todayReport.employee_name || '');
      setStartTime(todayReport.start_time || nowTime());
      setEndTime(todayReport.end_time || '');
      setRemarks(todayReport.remarks || '');

      if (todayReport.nozzle_readings?.length) {
        setNozzleReadings(
          NOZZLES.map(n => {
            const existing = todayReport.nozzle_readings.find(r => r.nozzle_number === n.nozzle_number);
            return {
              nozzle_number: n.nozzle_number,
              fuel_type: n.fuel_type,
              opening_reading: existing ? String(existing.opening_reading) : '',
              closing_reading: existing ? String(existing.closing_reading) : '',
            };
          })
        );
      }

      if (todayReport.collections?.length) {
        setCollections(
          COLLECTION_CATEGORIES.map(cat => {
            const existing = todayReport.collections.find(c => c.category === cat.id);
            return {
              category: cat.id,
              day_amount:     existing ? String(existing.day_amount)     : '',
              evening_amount: existing ? String(existing.evening_amount) : '',
            };
          })
        );
      }

      if (todayReport.lubricates?.length) {
        setLubricates(
          todayReport.lubricates.map(l => ({
            product_name:  l.product_name,
            opening_stock: String(l.opening_stock),
            sales:         String(l.sales),
          }))
        );
      }
    }
  }, [todayReport]);

  // Initialize lubricate rows from product list
  useEffect(() => {
    if (!todayReport?.lubricates?.length && lubricateProducts.length) {
      setLubricates(
        lubricateProducts.map(name => ({ product_name: name, opening_stock: '', sales: '' }))
      );
    }
  }, [lubricateProducts]);

  // ── Live calculation helpers ─────────────────────────────────────

  function calcNozzle(n) {
    const price = fuelPrices[n.fuel_type === 'diesel' ? 'diesel' : 'ms'] || 0;
    const open  = parseFloat(n.opening_reading) || 0;
    const close = parseFloat(n.closing_reading) || 0;
    const sales = Math.max(0, close - open);
    const amount = sales * price;
    return { sales: sales.toFixed(2), amount: amount.toFixed(2), price: price.toFixed(2) };
  }

  function calcCollection(c) {
    const day  = parseFloat(c.day_amount) || 0;
    const eve  = parseFloat(c.evening_amount) || 0;
    return (day + eve).toFixed(2);
  }

  function calcLubricate(l) {
    const open  = parseFloat(l.opening_stock) || 0;
    const sales = parseFloat(l.sales) || 0;
    return Math.max(0, open - sales).toFixed(2);
  }

  // ── Nozzle update ───────────────────────────────────────────────
  function updateNozzle(index, field, value) {
    setNozzleReadings(prev =>
      prev.map((n, i) => i === index ? { ...n, [field]: value } : n)
    );
  }

  // ── Collection update ────────────────────────────────────────────
  function updateCollection(index, field, value) {
    setCollections(prev =>
      prev.map((c, i) => i === index ? { ...c, [field]: value } : c)
    );
  }

  // ── Lubricate update ─────────────────────────────────────────────
  function updateLubricate(index, field, value) {
    setLubricates(prev =>
      prev.map((l, i) => i === index ? { ...l, [field]: value } : l)
    );
  }

  // ── Validation ───────────────────────────────────────────────────
  function validate() {
    const errs = [];
    if (!date)            errs.push('Date is required');
    if (!employeeName.trim()) errs.push('Employee name is required');
    if (!startTime)       errs.push('Start time is required');

    nozzleReadings.forEach((n, i) => {
      const open  = parseFloat(n.opening_reading);
      const close = parseFloat(n.closing_reading);
      if (n.opening_reading !== '' && n.closing_reading !== '') {
        if (isNaN(open) || isNaN(close)) {
          errs.push(`Nozzle ${i + 1}: readings must be numeric`);
        } else if (close < open) {
          errs.push(`Nozzle ${i + 1}: closing reading (${close}) < opening reading (${open})`);
        }
      }
    });

    lubricates.forEach(l => {
      const open  = parseFloat(l.opening_stock) || 0;
      const sales = parseFloat(l.sales) || 0;
      if (sales > open) {
        errs.push(`${l.product_name}: sales (${sales}) exceed opening stock (${open})`);
      }
    });

    return errs;
  }

  // ── Build API payload ─────────────────────────────────────────────
  function buildPayload() {
    return {
      date,
      employee_name: employeeName.trim(),
      start_time:  startTime || null,
      end_time:    endTime   || null,
      pump_number: 1,
      remarks:     remarks   || '',
      nozzle_readings: nozzleReadings
        .filter(n => n.opening_reading !== '' || n.closing_reading !== '')
        .map(n => ({
          nozzle_number:   n.nozzle_number,
          fuel_type:       n.fuel_type,
          opening_reading: parseFloat(n.opening_reading) || 0,
          closing_reading: parseFloat(n.closing_reading) || 0,
        })),
      collections: collections
        .filter(c => c.day_amount !== '' || c.evening_amount !== '')
        .map(c => ({
          category:       c.category,
          day_amount:     parseFloat(c.day_amount)     || 0,
          evening_amount: parseFloat(c.evening_amount) || 0,
        })),
      lubricates: lubricates
        .filter(l => l.opening_stock !== '' || l.sales !== '')
        .map(l => ({
          product_name:  l.product_name,
          opening_stock: parseFloat(l.opening_stock) || 0,
          sales:         parseFloat(l.sales)         || 0,
        })),
    };
  }

  // ── Save handlers ─────────────────────────────────────────────────
  async function handleSave(asDraft) {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors([]);
    setSaving(true);

    try {
      const payload = buildPayload();

      if (existingId) {
        await api.updateReport(existingId, {
          ...payload,
          status: asDraft ? 'draft' : 'completed',
        });
      } else {
        // Try create; if 409, update the existing one
        try {
          await api.createReport({ ...payload, status: asDraft ? 'draft' : 'completed' });
        } catch (err) {
          if (err.message && err.message.includes('report already exists')) {
            // Parse existing id from error if available, else reload
            await refreshTodayReport();
            return;
          }
          throw err;
        }
      }

      await refreshTodayReport();
      showToast(asDraft ? '💾 Draft saved!' : '✅ Report completed!');
      if (!asDraft) navigateTo('report');
    } catch (err) {
      showToast(`❌ Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Totals for live preview ────────────────────────────────────────
  const totalSalesLitres = nozzleReadings.reduce((s, n) => s + parseFloat(calcNozzle(n).sales), 0);
  const totalSalesAmount = nozzleReadings.reduce((s, n) => s + parseFloat(calcNozzle(n).amount), 0);

  return (
    <div id="screen-entry" className="flex flex-col gap-5 pb-6">

      {/* Page title */}
      <div>
        <h1 className="text-lg font-black text-white">Daily Entry</h1>
        <p className="text-[10px] text-slate-500">Pump 01 · NSS Fuel Station</p>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <p className="text-xs font-bold text-red-400 mb-2">Please fix the following:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-[11px] text-red-300">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── SECTION A: BASIC INFO ───────────────────────────────────── */}
      <Card>
        <SectionHeader id="A" title={SECTION_LABELS.A} />

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="date"
              label="Date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            <InputField
              id="pump-number"
              label="Pump Number"
              value="Pump 01"
              readOnly
            />
          </div>

          <InputField
            id="employee-name"
            label="Employee Name(s)"
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            placeholder="e.g. Shailaja, Suma & Mahesh"
            hint="Separate multiple names with commas or &"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="start-time"
              label="Start Time"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
            <InputField
              id="end-time"
              label="End Time"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION B: NOZZLE READINGS ─────────────────────────────── */}
      <Card>
        <SectionHeader id="B" title={SECTION_LABELS.B} />

        <div className="flex flex-col gap-4">
          {NOZZLES.map((nozzle, idx) => {
            const n = nozzleReadings[idx];
            const { sales, amount, price } = calcNozzle(n);
            const isHSD = nozzle.fuel_type === 'diesel';
            const borderColor = isHSD ? 'border-blue-800/40' : 'border-yellow-800/40';
            const labelColor  = isHSD ? 'text-blue-300'      : 'text-yellow-300';
            const dotColor    = isHSD ? 'bg-blue-500'         : 'bg-yellow-500';

            return (
              <div key={nozzle.nozzle_number} className={`border ${borderColor} rounded-xl p-4`}>
                {/* Nozzle header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className={`text-xs font-black ${labelColor}`}>
                      Nozzle {nozzle.nozzle_number} — {nozzle.fuel_label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500">₹{price}/L</span>
                  </div>
                </div>

                {/* Reading inputs */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <InputField
                    id={`nozzle-${nozzle.nozzle_number}-opening`}
                    label="Opening Reading"
                    value={n.opening_reading}
                    onChange={e => updateNozzle(idx, 'opening_reading', e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <InputField
                    id={`nozzle-${nozzle.nozzle_number}-closing`}
                    label="Closing Reading"
                    value={n.closing_reading}
                    onChange={e => updateNozzle(idx, 'closing_reading', e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>

                {/* Auto-calculated */}
                <div className="grid grid-cols-2 gap-3 bg-[#050b18] rounded-xl p-3">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Sales Litres</p>
                    <p className="text-sm font-black text-white mt-0.5">{sales} L</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Amount</p>
                    <p className="text-sm font-black text-[#FFD100] mt-0.5">{fmt(parseFloat(amount))}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Nozzle totals */}
          <div className="bg-[#001f5b]/40 border border-blue-800/30 rounded-xl p-4 flex justify-between">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-bold">Total Sales Litres</p>
              <p className="text-base font-black text-white">{totalSalesLitres.toFixed(2)} L</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 uppercase font-bold">Total Fuel Amount</p>
              <p className="text-base font-black text-[#FFD100]">{fmt(totalSalesAmount)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── SECTION C: COLLECTION ──────────────────────────────────── */}
      <Card>
        <SectionHeader id="C" title={SECTION_LABELS.C} />

        <div className="flex flex-col gap-3">
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_80px_80px_72px] gap-2 px-1">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Category</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase text-center">Day (₹)</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase text-center">Evening (₹)</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase text-right">Total</p>
          </div>

          {COLLECTION_CATEGORIES.map((cat, idx) => {
            const c = collections[idx];
            const total = calcCollection(c);
            const isDeduction = ['expenses', 'non_pump_expenses', 'discount', 'lubricates'].includes(cat.id);

            return (
              <div
                key={cat.id}
                className={`grid grid-cols-[1fr_80px_80px_72px] gap-2 items-center rounded-xl px-2 py-2
                  ${isDeduction ? 'bg-red-950/20' : 'bg-[#050b18]'}`}
              >
                <span className={`text-[11px] font-bold ${isDeduction ? 'text-red-300' : 'text-slate-300'}`}>
                  {cat.label}
                </span>
                <input
                  id={`col-${cat.id}-day`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.day_amount}
                  onChange={e => updateCollection(idx, 'day_amount', e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full px-2 py-2 rounded-lg text-sm text-white text-center bg-[#0b1329] border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FFD100]/50 placeholder-slate-700"
                />
                <input
                  id={`col-${cat.id}-eve`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.evening_amount}
                  onChange={e => updateCollection(idx, 'evening_amount', e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full px-2 py-2 rounded-lg text-sm text-white text-center bg-[#0b1329] border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FFD100]/50 placeholder-slate-700"
                />
                <span className={`text-xs font-black text-right ${parseFloat(total) > 0 ? (isDeduction ? 'text-red-400' : 'text-green-400') : 'text-slate-600'}`}>
                  {parseFloat(total) > 0 ? `₹${parseFloat(total).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── SECTION D: LUBRICATES ──────────────────────────────────── */}
      <Card>
        <SectionHeader id="D" title={SECTION_LABELS.D} />

        {lubricates.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No lubricate products configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 px-1 mb-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Product</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase text-center">Opening</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase text-center">Sales</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase text-right">Balance</p>
            </div>

            {lubricates.map((l, idx) => (
              <div key={l.product_name} className="grid grid-cols-[1fr_72px_72px_72px] gap-2 items-center bg-[#050b18] rounded-xl px-2 py-2">
                <span className="text-[11px] font-bold text-slate-300">{l.product_name}</span>
                <input
                  id={`lub-${idx}-opening`}
                  type="number"
                  min="0"
                  step="1"
                  value={l.opening_stock}
                  onChange={e => updateLubricate(idx, 'opening_stock', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full px-2 py-2 rounded-lg text-sm text-white text-center bg-[#0b1329] border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FFD100]/50 placeholder-slate-700"
                />
                <input
                  id={`lub-${idx}-sales`}
                  type="number"
                  min="0"
                  step="1"
                  value={l.sales}
                  onChange={e => updateLubricate(idx, 'sales', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full px-2 py-2 rounded-lg text-sm text-white text-center bg-[#0b1329] border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FFD100]/50 placeholder-slate-700"
                />
                <span className="text-xs font-black text-right text-[#FFD100]">
                  {calcLubricate(l)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── SECTION E: REMARKS ────────────────────────────────────── */}
      <Card>
        <SectionHeader id="E" title={SECTION_LABELS.E} />
        <textarea
          id="remarks"
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="e.g. We Paid Cash For Ajith Rs.28200"
          rows={4}
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50 resize-none"
        />
      </Card>

      {/* ── SAVE BUTTONS ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          id="btn-save-complete"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-400 text-[#001040] font-black text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-wide disabled:opacity-60"
        >
          {saving ? '⏳ Saving...' : '✅ Save & Complete Report'}
        </button>
        <button
          id="btn-save-draft"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="w-full py-3 bg-[#0b1329] border border-slate-700 text-slate-300 font-bold text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving ? '⏳ Saving...' : '💾 Save Draft'}
        </button>
      </div>
    </div>
  );
}
