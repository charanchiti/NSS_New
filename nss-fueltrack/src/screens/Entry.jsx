import React, { useState, useEffect } from 'react';
import { MODES, VEHICLES } from '../constants';
import { api } from '../api';

const VEHICLE_EMOJIS = {
  Bike: '🏍️',
  Car: '🚗',
  Auto: '🛺',
  Lorry: '🚛',
  Bus: '🚌',
  Other: '⚙️'
};

export default function Entry({ prices, onAddTransaction }) {
  // Turbo mode
  const [isTurbo, setIsTurbo] = useState(false);

  // Input fields state
  const [selVehicle, setSelVehicle] = useState('Bike');
  const [nozzle, setNozzle] = useState(1); 
  
  // Normal mode inputs
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  
  // Turbo mode inputs
  const [turboAmount, setTurboAmount] = useState('');
  
  const [selMode, setSelMode] = useState('');
  const [note, setNote] = useState('');

  // Credit details state
  const [creditName, setCreditName] = useState('');
  const [creditPhone, setCreditPhone] = useState('');
  const [creditVehicle, setCreditVehicle] = useState('');
  const [creditCustomers, setCreditCustomers] = useState([]);

  // Override and warning states
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSavedFlash, setIsSavedFlash] = useState(false);

  // Auto-map nozzle to fuel id (N1, N2 = Diesel (HSD); N3, N4 = Petrol (MS))
  const fuelId = (nozzle === 1 || nozzle === 2) ? 'hsd' : 'ms';
  const currentRate = fuelId === 'ms' ? prices.ms : prices.hsd;
  
  const calculatedAmount = liters ? (parseFloat(liters) * currentRate) : 0;
  const calculatedAmountRounded = calculatedAmount ? parseFloat(calculatedAmount.toFixed(2)) : 0;
  
  const turboLiters = turboAmount ? (parseFloat(turboAmount) / currentRate).toFixed(2) : '';

  // Load credit customers for datalist autocompletion
  useEffect(() => {
    async function loadCustomers() {
      try {
        const list = await api.fetchCreditCustomers();
        setCreditCustomers(list || []);
      } catch (e) {
        console.error("Failed to load credit customers lookup", e);
      }
    }
    loadCustomers();
  }, []);

  // Handle liters change (Normal Mode)
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

  // Recalculate if nozzle/rate changes
  useEffect(() => {
    if (isTurbo && turboAmount) {
      // Liters auto-recalculate based on rate
    } else if (!isTurbo && liters) {
      handleLitersChange(liters);
    }
  }, [nozzle, prices, isTurbo]);

  // Handle amount change (Normal Mode Override)
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

  // Handle Credit Customer Select Auto-fill
  const handleCreditNameChange = (val) => {
    setCreditName(val);
    const match = creditCustomers.find(
      (c) => c.name.toLowerCase() === val.toLowerCase().trim()
    );
    if (match) {
      setCreditPhone(match.phone || '');
      setCreditVehicle(match.vehicle || '');
      if (match.vehicle) {
        setSelVehicle('Lorry'); // Auto-set vehicle to lorry/car if matched
      }
    }
  };

  // Validation checks
  const currentLiters = isTurbo ? parseFloat(turboLiters) : parseFloat(liters);
  const currentAmount = isTurbo ? parseFloat(turboAmount) : parseFloat(amount);
  
  const parsedLiters = currentLiters || 0;
  const parsedAmount = currentAmount || 0;

  const hasLitersError = !isTurbo && liters !== '' && parsedLiters <= 0;
  const hasAmountError = !isTurbo && amount !== '' && parsedAmount <= 0;
  const isHighLiters = parsedLiters > 500;

  const requiresOverrideReason = isOverride && !isTurbo;
  const hasValidOverrideReason = overrideReason.trim().length >= 5;

  const isCreditValid = selMode !== 'credit' || (creditName.trim() !== '');

  const isFormValid =
    parsedLiters > 0 &&
    parsedAmount > 0 &&
    selMode !== '' &&
    isCreditValid &&
    (!requiresOverrideReason || hasValidOverrideReason);

  // Save transaction handler
  const handleSave = () => {
    if (!isFormValid) return;

    const finalVehicle = isTurbo ? 'Bike' : selVehicle; // Default to bike in turbo if hidden

    const tx = {
      vehicle: selMode === 'credit' && creditVehicle ? creditVehicle : finalVehicle,
      fuelId,
      liters: parsedLiters,
      amount: parsedAmount,
      note: isTurbo ? '' : note,
      paymentMode: selMode,
      rateUsed: currentRate,
      nozzle,
      creditName: selMode === 'credit' ? creditName.trim() : null,
      creditPhone: selMode === 'credit' ? creditPhone.trim() : null,
      creditVehicle: selMode === 'credit' ? creditVehicle.trim() : null,
      isOverride: isTurbo ? false : isOverride,
      overrideReason: (isOverride && !isTurbo) ? overrideReason : null
    };

    onAddTransaction(tx);

    setIsSavedFlash(true);
    
    // Clear state
    setLiters('');
    setAmount('');
    setTurboAmount('');
    setSelMode('');
    setNote('');
    setCreditName('');
    setCreditPhone('');
    setCreditVehicle('');
    setIsOverride(false);
    setOverrideReason('');
    if (!isTurbo) setSelVehicle('Bike');

    setTimeout(() => {
      setIsSavedFlash(false);
    }, 1400);
  };

  const isAutoFilled = !isTurbo && liters && parseFloat(liters) > 0 && !isOverride;

  return (
    <div id="s-entry" className="flex flex-col gap-4 pb-24 max-w-[480px] mx-auto w-full font-sans select-none animate-fadeUp">
      
      {/* Turbo toggle */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 mx-[14px] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-xs font-black text-[#FFD100] uppercase tracking-wider">Turbo Mode</div>
            <div className="text-[10px] text-slate-400">Fewer taps · Fast entries for rush hours</div>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsTurbo(!isTurbo);
            setTurboAmount('');
            setLiters('');
            setAmount('');
          }}
          className={`w-12 h-6 rounded-full transition-all relative cursor-pointer border-none outline-none ${
            isTurbo ? 'bg-[#FFD100] shadow-md shadow-[#FFD100]/25' : 'bg-slate-800'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-[#001440] absolute top-0.5 transition-all shadow-sm ${
            isTurbo ? 'left-[26px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 mx-[14px] flex flex-col gap-4 shadow-xl">
        
        {/* NOZZLE */}
        <div>
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Select Nozzle</span>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(n => {
              const fuel = n === 1 || n === 2 ? 'HSD' : 'MS';
              const isHSD = fuel === 'HSD';
              const isSelected = nozzle === n;
              
              let nozzleStyle = '';
              if (isSelected) {
                nozzleStyle = isHSD 
                  ? 'bg-[#09152e] border-blue-500 text-blue-400 font-black ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10' 
                  : 'bg-[#1b1509] border-[#FFD100] text-[#FFD100] font-black ring-2 ring-[#FFD100]/20 shadow-md shadow-[#FFD100]/10';
              } else {
                nozzleStyle = isHSD 
                  ? 'bg-[#050b18] border-slate-850 hover:border-blue-500/50 text-blue-400/80' 
                  : 'bg-[#050b18] border-slate-850 hover:border-[#FFD100]/50 text-[#FFD100]/80';
              }
              
              return (
                <button 
                  key={n} 
                  type="button"
                  className={`py-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${nozzleStyle}`} 
                  onClick={() => setNozzle(n)}
                >
                  <span className="text-base font-black">N{n}</span>
                  <span className="text-[8px] font-black tracking-widest uppercase">{fuel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* VEHICLE (hidden in turbo) */}
        {!isTurbo && (
          <div id="vehicle-section">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Vehicle Type</span>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map(v => {
                const isSelected = selVehicle === v;
                const emoji = VEHICLE_EMOJIS[v] || '❓';
                return (
                  <button 
                    key={v} 
                    type="button"
                    className={`py-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected 
                        ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] shadow-md shadow-[#FFD100]/10 font-black' 
                        : 'bg-[#050b18] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setSelVehicle(v)}
                  >
                    <span className="text-2xl transition-transform" style={{ transform: isSelected ? 'scale(1.15)' : 'scale(1)' }}>{emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{v}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LITERS & AMOUNT */}
        {!isTurbo ? (
          <div id="normal-fields" className="flex flex-col gap-3">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Litres & Amount</span>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Liters Input */}
              <div className={`bg-[#050b18] border-2 rounded-xl p-3 flex flex-col justify-between shadow-inner ${
                hasLitersError ? 'border-red-500' : 'border-slate-850 focus-within:border-[#FFD100]'
              }`}>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  <span>⛽ Volume</span>
                  <span className="text-slate-500">Liters</span>
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="0.00" 
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent border-none text-white text-xl font-black outline-none"
                />
              </div>

              {/* Amount Input */}
              <div className={`bg-[#050b18] border-2 rounded-xl p-3 flex flex-col justify-between shadow-inner ${
                isOverride ? 'border-amber-500 bg-amber-950/5' : 'border-slate-850 focus-within:border-[#FFD100]'
              }`}>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  <span>₹ Total cost</span>
                  <span className="text-slate-500">Rupees</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    readOnly={!liters}
                    className={`w-full bg-transparent border-none text-white text-xl font-black outline-none ${
                      isAutoFilled ? 'text-green-400' : ''
                    }`}
                  />
                  {isAutoFilled && <span className="bg-green-950 text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-green-500/20">AUTO</span>}
                </div>
              </div>
            </div>

            {isAutoFilled && (
              <div className="text-[10px] text-green-500 font-bold tracking-wide flex items-center gap-1 select-none">
                <span>✓</span> Calculated at ₹{currentRate.toFixed(2)} / L
              </div>
            )}
            
            {/* Manual Override Warning */}
            {isOverride && (
              <div className="bg-amber-950/20 border-2 border-amber-500/30 rounded-xl p-3 flex flex-col gap-2">
                <div className="text-[10px] text-amber-500 font-black leading-relaxed">
                  ⚠️ Price Mismatch (Rate calculation is ₹{calculatedAmountRounded.toFixed(2)}). An override reason is required.
                </div>
                <input
                  type="text"
                  placeholder="Enter reason for difference (min 5 chars)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-[#050b18] border border-amber-500/20 focus:border-amber-500 rounded-lg py-2 px-3 text-slate-200 text-xs font-bold outline-none"
                />
              </div>
            )}
            
          </div>
        ) : (
          /* TURBO QUICK AMOUNTS */
          <div id="turbo-fields" className="flex flex-col gap-3">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Preset / Custom Amount</span>
            
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map(amt => {
                const isSelected = parseFloat(turboAmount) === amt;
                return (
                  <button 
                    key={amt} 
                    type="button"
                    className={`py-3 rounded-xl border-2 transition-all cursor-pointer text-xs font-black ${
                      isSelected 
                        ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] shadow-md shadow-[#FFD100]/5' 
                        : 'bg-[#050b18] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setTurboAmount(amt.toString())}
                  >
                    ₹{amt}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Custom amount */}
              <div className="bg-[#050b18] border border-slate-850 rounded-xl p-3 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">₹ Custom Amount</span>
                <input 
                  type="number" 
                  placeholder="₹ 0" 
                  value={turboAmount}
                  onChange={(e) => setTurboAmount(e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent border-none text-white text-xl font-black outline-none"
                />
              </div>

              {/* Calculated Liters */}
              <div className="bg-[#050b18] border border-slate-850 rounded-xl p-3 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">⛽ Equivalent Liters</span>
                <div className="flex justify-between items-center">
                  <input 
                    type="number" 
                    readOnly 
                    placeholder="0.00"
                    value={turboLiters}
                    className="w-full bg-transparent border-none text-green-400 text-xl font-black outline-none cursor-default"
                  />
                  {turboAmount && <span className="bg-green-950 text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-green-500/20">AUTO</span>}
                </div>
              </div>
            </div>

            {turboAmount && (
              <div className="text-[10px] text-green-500 font-bold tracking-wide flex items-center gap-1 select-none">
                <span>✓</span> Calculated at ₹{currentRate.toFixed(2)} / L
              </div>
            )}
          </div>
        )}

        {/* High Liters Warning */}
        {isHighLiters && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 text-amber-500 text-xs font-black leading-relaxed">
            ⚠️ Warning: Unusually high liters ({parsedLiters.toFixed(2)} L). Please double-check details.
          </div>
        )}

        {/* PAYMENT MODE */}
        <div>
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Payment Mode</span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => {
              const isSelected = selMode === m.id;
              return (
                <button 
                  key={m.id} 
                  type="button"
                  className={`py-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] shadow-md shadow-[#FFD100]/5 font-black' 
                      : 'bg-[#050b18] border-slate-850 text-slate-400 hover:text-slate-200'
                  }`} 
                  onClick={() => setSelMode(m.id)}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-[10px] uppercase tracking-wider">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CREDIT FIELDS */}
        {selMode === 'credit' && (
          <div className="bg-red-950/5 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block">⚠️ Required Credit Customer Details</span>
            
            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">👤 Customer / Company Name *</span>
              <input 
                list="credit-customers"
                type="text" 
                placeholder="Enter customer name" 
                value={creditName}
                onChange={(e) => handleCreditNameChange(e.target.value)}
                className="w-full bg-[#050b18] border border-slate-850 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]"
              />
              <datalist id="credit-customers">
                {creditCustomers.map((cust) => (
                  <option key={cust.name} value={cust.name} />
                ))}
              </datalist>
            </div>

            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">📞 Mobile Phone (Optional)</span>
              <input 
                type="tel" 
                placeholder="9XXXXXXXXX" 
                inputMode="numeric"
                maxLength={10}
                value={creditPhone}
                onChange={(e) => setCreditPhone(e.target.value)}
                className="w-full bg-[#050b18] border border-slate-850 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]"
              />
            </div>
            
            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">🚘 Vehicle License Plate *</span>
              <input 
                type="text" 
                placeholder="e.g. KA01AB1234"
                value={creditVehicle}
                onChange={(e) => setCreditVehicle(e.target.value)}
                className="w-full bg-[#050b18] border border-slate-850 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]"
              />
            </div>
          </div>
        )}

        {/* NOTE (hidden in turbo) */}
        {!isTurbo && (
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">📝 Note (optional)</span>
            <input 
              type="text" 
              placeholder="Driver name, coupons, or details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#050b18] border border-slate-850 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]"
            />
          </div>
        )}

        <button 
          disabled={!isFormValid || isSavedFlash} 
          onClick={handleSave}
          className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg select-none border-none cursor-pointer ${
            isSavedFlash 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white active:scale-100 shadow-green-500/20' 
              : 'bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] hover:shadow-amber-500/10 active:scale-[0.99]'
          }`}
        >
          {isSavedFlash ? '✓ Saved!' : 'Save Transaction'}
        </button>
      </div>
    </div>
  );
}
