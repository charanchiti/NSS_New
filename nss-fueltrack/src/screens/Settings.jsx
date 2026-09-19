import React, { useState, useEffect } from 'react';
import { api } from '../api';

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-slate-800 last:border-0">
      <div>
        <p className="text-xs font-bold text-white">{label}</p>
        {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings({ fuelPrices, setFuelPrices, lubricateProducts, setLubricateProducts, showToast }) {
  const [diesel, setDiesel] = useState(String(fuelPrices.diesel || ''));
  const [ms,     setMs]     = useState(String(fuelPrices.ms     || ''));
  const [savingPrices, setSavingPrices] = useState(false);

  const [newLub, setNewLub] = useState('');
  const [addingLub, setAddingLub] = useState(false);

  useEffect(() => {
    setDiesel(String(fuelPrices.diesel || ''));
    setMs(String(fuelPrices.ms || ''));
  }, [fuelPrices]);

  async function savePrices() {
    const d = parseFloat(diesel);
    const m = parseFloat(ms);
    if (isNaN(d) || d <= 0 || isNaN(m) || m <= 0) {
      showToast('Prices must be positive numbers', 'error');
      return;
    }
    setSavingPrices(true);
    try {
      const updated = await api.updateFuelPrices({ diesel: d, ms: m });
      setFuelPrices(updated);
      showToast('✅ Fuel prices updated!');
    } catch (err) {
      showToast(`Failed to update prices: ${err.message}`, 'error');
    } finally {
      setSavingPrices(false);
    }
  }

  async function addLubricate() {
    if (!newLub.trim()) return;
    setAddingLub(true);
    try {
      await api.addLubricateProduct({ name: newLub.trim() });
      const updated = await api.getLubricateProducts();
      setLubricateProducts(updated.map(p => p.name));
      setNewLub('');
      showToast(`✅ "${newLub.trim()}" added!`);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setAddingLub(false);
    }
  }

  return (
    <div id="screen-settings" className="flex flex-col gap-5 pb-6">

      <div>
        <h1 className="text-lg font-black text-white">Settings</h1>
        <p className="text-[10px] text-slate-500">Configure NSS FuelTrack</p>
      </div>

      {/* Fuel Prices */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">⛽ Fuel Prices (per Litre)</p>

        <SettingRow label="Diesel Price" hint="Used to calculate nozzle N1 & N2 amounts">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">₹</span>
            <input
              id="setting-diesel-price"
              type="number"
              min="0"
              step="0.01"
              value={diesel}
              onChange={e => setDiesel(e.target.value)}
              inputMode="decimal"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50"
            />
          </div>
        </SettingRow>

        <SettingRow label="Motor Spirit (Petrol) Price" hint="Used to calculate nozzle N3 & N4 amounts">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">₹</span>
            <input
              id="setting-ms-price"
              type="number"
              min="0"
              step="0.01"
              value={ms}
              onChange={e => setMs(e.target.value)}
              inputMode="decimal"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50"
            />
          </div>
        </SettingRow>

        <button
          id="btn-save-prices"
          onClick={savePrices}
          disabled={savingPrices}
          className="w-full mt-3 py-3 bg-gradient-to-r from-[#FFD100] to-amber-400 text-[#001040] font-black text-sm rounded-xl active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {savingPrices ? '⏳ Saving...' : '💾 Save Fuel Prices'}
        </button>
      </div>

      {/* Lubricate Products */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">🛢️ Lubricate Products</p>

        <div className="flex flex-col gap-1 mb-4">
          {lubricateProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No products configured.</p>
          ) : (
            lubricateProducts.map(name => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 bg-[#050b18] border border-slate-800 rounded-lg">
                <span className="text-sm text-slate-300">🛢️</span>
                <span className="text-xs font-bold text-slate-300">{name}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            id="setting-new-lubricate"
            type="text"
            value={newLub}
            onChange={e => setNewLub(e.target.value)}
            placeholder="New product name..."
            onKeyDown={e => e.key === 'Enter' && addLubricate()}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 bg-[#050b18] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50"
          />
          <button
            id="btn-add-lubricate"
            onClick={addLubricate}
            disabled={addingLub || !newLub.trim()}
            className="px-4 py-3 bg-[#FFD100] text-[#001040] font-black text-sm rounded-xl active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {addingLub ? '⏳' : '+ Add'}
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-md">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">ℹ️ App Information</p>
        <div className="flex flex-col gap-2 text-xs">
          {[
            ['App', 'NSS FuelTrack v3.0'],
            ['Station', 'NSS Fuel Station'],
            ['Corporation', 'Bharat Petroleum'],
            ['Active Pumps', 'Pump 01'],
            ['Backend', (import.meta.env.VITE_API_URL || 'http://localhost:8000')],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0">
              <span className="text-slate-400 font-bold">{k}</span>
              <span className="text-slate-300">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
