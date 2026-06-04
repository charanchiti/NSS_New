import React, { useState, useEffect } from 'react';
import { MODES, FUELS, VEHICLES } from '../constants';

export default function Entry({ prices, onAddTransaction }) {
  // Input fields state
  const [selVehicle, setSelVehicle] = useState('Bike');
  const [selFuel, setSelFuel] = useState('ms');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  const [selMode, setSelMode] = useState('');
  const [note, setNote] = useState('');

  // Override and warning states
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSavedFlash, setIsSavedFlash] = useState(false);

  // Rate calculations
  const currentRate = selFuel === 'ms' ? prices.ms : prices.hsd;
  const calculatedAmount = liters ? (parseFloat(liters) * currentRate) : 0;
  const calculatedAmountRounded = calculatedAmount ? parseFloat(calculatedAmount.toFixed(2)) : 0;

  // Handle liters change
  const handleLitersChange = (val) => {
    setLiters(val);
    const parsedL = parseFloat(val);
    if (!isNaN(parsedL) && parsedL > 0) {
      const calc = (parsedL * currentRate).toFixed(2);
      setAmount(calc);
      setIsOverride(false);
    } else {
      setAmount('');
      setIsOverride(false);
    }
  };

  // Recalculate amount if fuel type changes
  useEffect(() => {
    if (liters) {
      handleLitersChange(liters);
    }
  }, [selFuel, prices]);

  // Handle amount change (checks for manual override)
  const handleAmountChange = (val) => {
    setAmount(val);
    const parsedAmt = parseFloat(val);
    const parsedL = parseFloat(liters);

    if (isNaN(parsedL) || parsedL <= 0 || isNaN(parsedAmt)) {
      setIsOverride(false);
      return;
    }

    const diff = Math.abs(parsedAmt - calculatedAmountRounded);
    if (diff > 1.00) {
      setIsOverride(true);
    } else {
      setIsOverride(false);
    }
  };

  // Validation checks
  const parsedLiters = parseFloat(liters) || 0;
  const parsedAmount = parseFloat(amount) || 0;

  const hasLitersError = liters !== '' && parsedLiters <= 0;
  const hasAmountError = amount !== '' && parsedAmount <= 0;
  const isHighLiters = parsedLiters > 500;

  const requiresOverrideReason = isOverride;
  const hasValidOverrideReason = overrideReason.trim().length >= 5;

  const isFormValid =
    liters !== '' &&
    parsedLiters > 0 &&
    amount !== '' &&
    parsedAmount > 0 &&
    selMode !== '' &&
    (!requiresOverrideReason || hasValidOverrideReason);

  // Save transaction handler
  const handleSave = () => {
    if (!isFormValid) return;

    const tx = {
      vehicle: selVehicle,
      fuelId: selFuel,
      liters: parsedLiters,
      amount: parsedAmount,
      note: note,
      paymentMode: selMode,
      rateUsed: currentRate,
      isOverride,
      overrideReason: isOverride ? overrideReason : null
    };

    onAddTransaction(tx);

    // Save success animation flash
    setIsSavedFlash(true);
    
    // Clear state
    setLiters('');
    setAmount('');
    setSelMode('');
    setNote('');
    setIsOverride(false);
    setOverrideReason('');
    setSelVehicle('Bike');
    setSelFuel('ms');

    // Reset button color after 1.4 seconds
    setTimeout(() => {
      setIsSavedFlash(false);
    }, 1400);
  };

  // Check if auto-filled styling applies (if liters exists and it's not overridden)
  const isAutoFilled = liters && parseFloat(liters) > 0 && !isOverride;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-4">
        New Transaction
      </div>

      {/* Vehicle Type Selection */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-2">
          Vehicle Type
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLES.map((v) => {
            const isSelected = selVehicle === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setSelVehicle(v)}
                className={`py-2 px-3.5 rounded-full border text-xs font-semibold select-none transition-colors ${
                  isSelected
                    ? 'border-gold text-gold bg-gold/13 font-bold'
                    : 'border-border bg-bg text-sub'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fuel Type Selection */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-2">
          Fuel Type
        </label>
        <div className="flex gap-2">
          {FUELS.map((f) => {
            const isSelected = selFuel === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelFuel(f.id)}
                className={`flex-1 py-2 px-3.5 rounded-full border text-xs font-semibold select-none transition-colors ${
                  isSelected
                    ? 'border-gold text-gold bg-gold/13 font-bold'
                    : 'border-border bg-bg text-sub'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liters and Amount Inputs */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-1.5">
            Liters
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={liters}
            onChange={(e) => handleLitersChange(e.target.value)}
            className={`w-full bg-bg border rounded-lg py-2.5 px-3 text-slate-200 text-sm font-semibold outline-none focus:border-gold transition-colors ${
              hasLitersError ? 'border-red-500/50 bg-red-950/20' : 'border-border'
            }`}
          />
          {hasLitersError && (
            <div className="text-[10px] text-red-400 mt-1 font-bold">
              Liters must be greater than 0
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-1.5">
            Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Auto"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`w-full border rounded-lg py-2.5 px-3 text-slate-200 text-sm font-semibold outline-none focus:border-gold transition-colors ${
              isAutoFilled
                ? 'border-green/30 bg-[#0a1f0a]'
                : hasAmountError
                ? 'border-red-500/50 bg-red-950/20'
                : 'border-border bg-bg'
            }`}
          />
          {hasAmountError && (
            <div className="text-[10px] text-red-400 mt-1 font-bold">
              Amount must be greater than ₹0
            </div>
          )}
          {isAutoFilled && (
            <div className="text-[11px] text-green mt-1.5 min-h-[16px] font-bold">
              @ ₹{currentRate.toFixed(2)}/L → ₹{calculatedAmountRounded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Override Warning & Input */}
      {isOverride && (
        <div className="mb-4 flex flex-col gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-500">
          <div className="text-xs font-bold leading-normal">
            ⚠️ Amount differs from calculated rate (₹{calculatedAmountRounded.toFixed(2)}). A reason is required.
          </div>
          <input
            type="text"
            placeholder="Why is the amount different? (min 5 chars)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full bg-bg border border-yellow-500/30 rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-yellow-500 font-medium"
          />
        </div>
      )}

      {/* High Liters Warning */}
      {isHighLiters && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 px-3 text-yellow-500 text-xs font-semibold leading-normal">
          ⚠️ Unusually high litres — please verify
        </div>
      )}

      {/* Payment Mode Selection */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-2">
          Payment Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((mode) => {
            const isSelected = selMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelMode(mode.id)}
                className="flex flex-col items-center p-3 rounded-xl border text-xs cursor-pointer gap-1 transition-all"
                style={{
                  backgroundColor: isSelected ? mode.color : '#0f172a',
                  borderColor: isSelected ? mode.color : 'var(--border)',
                  color: isSelected ? '#fff' : 'var(--sub)',
                  fontWeight: isSelected ? 'bold' : 'normal'
                }}
              >
                <span className="text-[22px] select-none">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Credit Mode Banner */}
      {selMode === 'credit' && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 px-3 text-yellow-500 text-xs font-bold leading-normal">
          📋 Credit entry — no cash collected. This will be flagged in the report.
        </div>
      )}

      {/* Optional Note Field */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-1.5">
          Note (optional)
        </label>
        <input
          type="text"
          placeholder="Customer name, vehicle no..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg py-2.5 px-3 text-slate-200 text-sm font-semibold outline-none focus:border-gold transition-colors"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        disabled={!isFormValid || isSavedFlash}
        onClick={handleSave}
        className={`w-full py-4 rounded-xl border-none text-black font-extrabold text-[16px] transition-all cursor-pointer ${
          isSavedFlash
            ? 'bg-green text-white'
            : 'bg-gold hover:opacity-90 disabled:opacity-35 disabled:cursor-default'
        }`}
      >
        {isSavedFlash ? '✓ Saved!' : 'Save Transaction'}
      </button>
    </div>
  );
}
