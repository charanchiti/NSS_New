import React, { useState } from 'react';
import { fmtTime } from '../hooks/useClock';

export default function Settings({
  prices,
  onSavePrices,
  dsmName,
  shiftType,
  startTime,
  onEndShiftInitiate,
  onSavePin
}) {
  // Local input state for prices
  const [msPriceInput, setMsPriceInput] = useState(prices.ms.toString());
  const [hsdPriceInput, setHsdPriceInput] = useState(prices.hsd.toString());
  const [isPricesSavedFlash, setIsPricesSavedFlash] = useState(false);

  // Local input state for PIN
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [isPinFlash, setIsPinFlash] = useState(false);

  // Shift state check
  const isShiftActive = !!startTime;

  // Handle Save Prices
  const handleSavePrices = () => {
    const ms = parseFloat(msPriceInput);
    const hsd = parseFloat(hsdPriceInput);

    if (isNaN(ms) || isNaN(hsd) || ms <= 0 || hsd <= 0) {
      alert('Please enter valid, positive rates for both fuels.');
      return;
    }

    onSavePrices({ ms, hsd });
    
    // Success flash
    setIsPricesSavedFlash(true);
    setTimeout(() => {
      setIsPricesSavedFlash(false);
    }, 1800);
  };

  // Handle Save PIN
  const handleSavePin = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage('❌ PIN must be exactly 4 digits');
      return;
    }

    onSavePin(newPin);
    setNewPin('');
    setPinMessage('✅ PIN updated successfully!');
    setIsPinFlash(true);
    
    setTimeout(() => {
      setPinMessage('');
      setIsPinFlash(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-4 select-none pb-12">
      {/* Fuel Prices Section */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="text-slate-200 font-bold text-[16px] mb-1">
          ⛽ Fuel Prices
        </div>
        <div className="text-muted text-xs mb-4">
          Set today's rate per litre. Amount auto-fills when DSM enters litres.
        </div>

        {/* Inputs Display */}
        <div className="bg-bg rounded-xl border border-border p-4 flex flex-col gap-3">
          {/* MS Input */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-black px-3 py-1.5 rounded-lg border border-gold bg-gold/13 text-gold min-w-[60px] text-center uppercase">
              MS
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sub font-bold text-[15px]">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 102.50"
                value={msPriceInput}
                onChange={(e) => setMsPriceInput(e.target.value)}
                readOnly={isShiftActive}
                className={`w-full bg-[#1e293b] border rounded-lg py-2.5 pl-8 pr-3 text-slate-200 text-sm font-bold outline-none focus:border-gold transition-colors ${
                  isShiftActive ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'border-border'
                }`}
              />
            </div>
          </div>

          {/* HSD Input */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-black px-3 py-1.5 rounded-lg border border-blue bg-blue-500/13 text-blue min-w-[60px] text-center uppercase">
              HSD
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sub font-bold text-[15px]">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 89.00"
                value={hsdPriceInput}
                onChange={(e) => setHsdPriceInput(e.target.value)}
                readOnly={isShiftActive}
                className={`w-full bg-[#1e293b] border rounded-lg py-2.5 pl-8 pr-3 text-slate-200 text-sm font-bold outline-none focus:border-gold transition-colors ${
                  isShiftActive ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'border-border'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Warning label & button status for price changes during shift */}
        {isShiftActive ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="text-red text-xs font-bold leading-normal bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              🔒 Price changes are locked during an active shift. Only the owner can change prices before the next shift starts.
            </div>
            <button
              type="button"
              disabled
              className="w-full py-3.5 rounded-xl border-none bg-gold text-black font-extrabold text-[15px] opacity-40 cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span>🔒 Save Prices</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSavePrices}
            className={`w-full py-3.5 rounded-xl border-none font-extrabold text-[15px] cursor-pointer mt-4 transition-all ${
              isPricesSavedFlash ? 'bg-green text-white' : 'bg-gold hover:opacity-90'
            }`}
          >
            {isPricesSavedFlash ? '✓ Prices Saved!' : 'Save Prices'}
          </button>
        )}

        {/* Current rates display pills */}
        <div className="flex gap-2.5 mt-4">
          <div className="flex-1 bg-bg border border-border rounded-xl p-3 text-center">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">
              MS / Petrol
            </div>
            <div className="text-[20px] font-black text-gold mt-1">
              ₹{prices.ms.toFixed(2)}
            </div>
          </div>
          <div className="flex-1 bg-bg border border-border rounded-xl p-3 text-center">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">
              HSD / Diesel
            </div>
            <div className="text-[20px] font-black text-blue mt-1">
              ₹{prices.hsd.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Change PIN Section */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="text-slate-200 font-bold text-[16px] mb-1">
          🔑 Change Owner PIN
        </div>
        <div className="text-muted text-xs mb-4">
          Update the 4-digit security PIN used to unlock settings.
        </div>

        <form onSubmit={handleSavePin} className="flex gap-2">
          <input
            type="password"
            maxLength={4}
            pattern="\d*"
            inputMode="numeric"
            placeholder="Enter new 4-digit PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="flex-grow bg-bg border border-border rounded-lg py-2.5 px-3.5 text-slate-200 text-sm font-semibold outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="bg-gold text-black font-extrabold text-xs px-4 rounded-lg hover:opacity-95 transition-opacity"
          >
            Update PIN
          </button>
        </form>
        {pinMessage && (
          <div
            className={`text-xs font-bold mt-2.5 ${
              pinMessage.includes('❌') ? 'text-red' : 'text-green'
            }`}
          >
            {pinMessage}
          </div>
        )}
      </div>

      {/* Shift Info Section */}
      {isShiftActive && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="text-slate-200 font-bold text-[16px] mb-2">
            ℹ️ Shift Info
          </div>
          <div className="text-sm text-sub leading-loose font-medium">
            <div className="flex justify-between border-b border-border/50 py-1">
              <span>DSM</span>
              <span className="text-slate-200 font-bold">{dsmName}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 py-1">
              <span>Shift Type</span>
              <span className="text-slate-200 font-bold uppercase">{shiftType} Shift</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Started</span>
              <span className="text-slate-200 font-bold">{fmtTime(startTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Button at the absolute bottom */}
      {isShiftActive && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onEndShiftInitiate}
            className="w-full py-4 rounded-xl border-none bg-red hover:bg-red-600 text-white font-extrabold text-[15px] cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-red/10 transition-colors"
          >
            ⚠️ End Shift & Clear Data
          </button>
        </div>
      )}
    </div>
  );
}
