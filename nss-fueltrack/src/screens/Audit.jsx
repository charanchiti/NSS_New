import React, { useState } from 'react';
import { api } from '../api';

export default function Audit({ prices, activeShift, onBack, onAuditSubmit }) {
  const [step, setStep] = useState(1);
  const [dsmName, setDsmName] = useState(activeShift?.dsmName || '');
  const [shiftType, setShiftType] = useState(activeShift?.shiftType || 'day');
  const [shiftDate, setShiftDate] = useState(() => {
    if (activeShift?.startTime) {
      return new Date(activeShift.startTime).toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    return new Date().toLocaleDateString('en-CA');
  });
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  // Meter readings
  const [openN1, setOpenN1] = useState(activeShift?.openingN1?.toString() || '');
  const [openN2, setOpenN2] = useState(activeShift?.openingN2?.toString() || '');
  const [openN3, setOpenN3] = useState(activeShift?.openingN3?.toString() || '');
  const [openN4, setOpenN4] = useState(activeShift?.openingN4?.toString() || '');

  const [closeN1, setCloseN1] = useState('');
  const [closeN2, setCloseN2] = useState('');
  const [closeN3, setCloseN3] = useState('');
  const [closeN4, setCloseN4] = useState('');

  // Payments Collected
  const [cashCollected, setCashCollected] = useState('');
  const [upiCollected, setUpiCollected] = useState('');
  const [pineLabsCollected, setPineLabsCollected] = useState('');
  const [otpVoucherCollected, setOtpVoucherCollected] = useState('');

  // Sub-entries state (local queue to be submitted at Step 4)
  const [creditEntries, setCreditEntries] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);

  // Modals/Inline forms for adding sub-entries
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditName, setCreditName] = useState('');
  const [creditPhone, setCreditPhone] = useState('');
  const [creditVehicle, setCreditVehicle] = useState('');
  const [creditAmount, setCreditAmount] = useState('');

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Calibration and deductions
  const [testingHsd, setTestingHsd] = useState('');
  const [testingMs, setTestingMs] = useState('');
  const [loyaltyRewards, setLoyaltyRewards] = useState('');

  // API loading overlay
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Dynamic Calculations ---
  // Rates
  const rateHsd = prices?.hsd || 91.29;
  const rateMs = prices?.ms || 103.24;

  // Net Liters (computed from entered readings)
  const n1Open = parseFloat(openN1) || 0;
  const n2Open = parseFloat(openN2) || 0;
  const n3Open = parseFloat(openN3) || 0;
  const n4Open = parseFloat(openN4) || 0;

  const n1Close = parseFloat(closeN1) || n1Open;
  const n2Close = parseFloat(closeN2) || n2Open;
  const n3Close = parseFloat(closeN3) || n3Open;
  const n4Close = parseFloat(closeN4) || n4Open;

  const hsdNet = Math.max(0, (n1Close - n1Open) + (n2Close - n2Open));
  const msNet = Math.max(0, (n3Close - n3Open) + (n4Close - n4Open));

  // Credits & Expenses sums
  const totalCreditGiven = creditEntries.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalExpenses = expenseEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Testing Deduction amount
  const testingLitersHsdVal = parseFloat(testingHsd) || 0;
  const testingLitersMsVal = parseFloat(testingMs) || 0;
  const calculatedTestingAmt = (testingLitersHsdVal * rateHsd) + (testingLitersMsVal * rateMs);

  // Sales calculations (excluding nozzle testing calibration liters)
  const hsdSalesVal = Math.max(0, hsdNet - testingLitersHsdVal) * rateHsd;
  const msSalesVal = Math.max(0, msNet - testingLitersMsVal) * rateMs;
  const totalSalesExpected = hsdSalesVal + msSalesVal;

  // Accounted collections
  const cashVal = parseFloat(cashCollected) || 0;
  const upiVal = parseFloat(upiCollected) || 0;
  const pineLabsVal = parseFloat(pineLabsCollected) || 0;
  const otpVoucherVal = parseFloat(otpVoucherCollected) || 0;
  const rewardsVal = parseFloat(loyaltyRewards) || 0;

  const totalAccounted = cashVal + upiVal + pineLabsVal + otpVoucherVal + totalCreditGiven + totalExpenses + rewardsVal;
  const varianceAmt = totalAccounted - totalSalesExpected;

  // Form validations
  const isStep1Valid = openN1 && openN2 && openN3 && openN4 && dsmName.trim();
  const isStep2Valid = closeN1 && closeN2 && closeN3 && closeN4 && 
    (parseFloat(closeN1) >= parseFloat(openN1)) &&
    (parseFloat(closeN2) >= parseFloat(openN2)) &&
    (parseFloat(closeN3) >= parseFloat(openN3)) &&
    (parseFloat(closeN4) >= parseFloat(openN4));
  const isStep3Valid = dsmName.trim() !== '';

  const handleAddCredit = () => {
    if (!creditName.trim() || !creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter a customer name and a valid positive amount.');
      return;
    }
    const newCredit = {
      id: `local_cr_${Date.now()}`,
      name: creditName.trim(),
      phone: creditPhone.trim(),
      vehicle: creditVehicle.trim().toUpperCase(),
      amount: parseFloat(creditAmount)
    };
    setCreditEntries([...creditEntries, newCredit]);
    setCreditName('');
    setCreditPhone('');
    setCreditVehicle('');
    setCreditAmount('');
    setShowCreditForm(false);
  };

  const handleRemoveCredit = (id) => {
    setCreditEntries(creditEntries.filter(c => c.id !== id));
  };

  const handleAddExpense = () => {
    if (!expenseNote.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert('Please enter expense description and a valid positive amount.');
      return;
    }
    const newExpense = {
      id: `local_ex_${Date.now()}`,
      note: expenseNote.trim(),
      amount: parseFloat(expenseAmount)
    };
    setExpenseEntries([...expenseEntries, newExpense]);
    setExpenseNote('');
    setExpenseAmount('');
    setShowExpenseForm(false);
  };

  const handleRemoveExpense = (id) => {
    setExpenseEntries(expenseEntries.filter(e => e.id !== id));
  };

  const handleNewAuditReset = () => {
    if (window.confirm('Reset this audit? All manually entered readings and inputs will be cleared.')) {
      setStep(1);
      setCloseN1('');
      setCloseN2('');
      setCloseN3('');
      setCloseN4('');
      setCashCollected('');
      setUpiCollected('');
      setPineLabsCollected('');
      setOtpVoucherCollected('');
      setCreditEntries([]);
      setExpenseEntries([]);
      setTestingHsd('');
      setTestingMs('');
      setLoyaltyRewards('');
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit Credit Transactions to active shift
      for (const credit of creditEntries) {
        await api.createTransaction({
          shiftId: activeShift?.id || 'active',
          vehicle: credit.vehicle || 'Other',
          fuelId: 'hsd', // default or custom
          fuelLabel: 'Credit Transaction',
          liters: credit.amount / rateHsd, // approximate
          amount: credit.amount,
          note: `Audit log credit for ${credit.name}`,
          paymentMode: 'credit',
          modeLabel: 'Credit Ledger',
          rateUsed: rateHsd,
          nozzle: 1,
          creditName: credit.name,
          creditPhone: credit.phone || null,
          creditVehicle: credit.vehicle || null
        });
      }

      // 2. Submit Expense Deductions
      for (const exp of expenseEntries) {
        await api.createDeduction({
          type: 'expense',
          amount: exp.amount,
          note: exp.note
        });
      }

      // 3. Submit Loyalty Rewards (if any)
      if (rewardsVal > 0) {
        await api.createDeduction({
          type: 'reward',
          amount: rewardsVal,
          note: 'BP Loyalty rewards audit deduction'
        });
      }

      // 4. Update closing readings
      await api.updateClosingReadings(
        parseFloat(closeN1),
        parseFloat(closeN2),
        parseFloat(closeN3),
        parseFloat(closeN4)
      );

      // 5. Invoke Shift End in Parent
      await onAuditSubmit({
        variance: varianceAmt,
        totalSales: totalSalesExpected,
        totalAccounted
      });
    } catch (e) {
      alert(`Error submitting audit details: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    let text = `⛽ *NSS BHARAT PETROLEUM — SHIFT AUDIT REPORT*\n`;
    text += `👤 *DSM:* ${dsmName || '—'}\n`;
    text += `📅 *Date:* ${shiftDate} | *Shift:* ${(shiftType || 'day').toUpperCase()}\n`;
    text += `⏰ *Time:* ${startTime} - ${endTime}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *VTOT READINGS & VOLUMES:*\n`;
    text += `• N1 HSD: Open ${openN1} ➔ Close ${closeN1}\n`;
    text += `• N2 HSD: Open ${openN2} ➔ Close ${closeN2}\n`;
    text += `• N3 MS: Open ${openN3} ➔ Close ${closeN3}\n`;
    text += `• N4 MS: Open ${openN4} ➔ Close ${closeN4}\n`;
    text += `• *HSD Net Sold:* ${hsdNet.toFixed(2)} L\n`;
    text += `• *MS Net Sold:* ${msNet.toFixed(2)} L\n`;
    if (testingLitersHsdVal > 0 || testingLitersMsVal > 0) {
      text += `🧪 *Testing Liters:* HSD: ${testingLitersHsdVal}L, MS: ${testingLitersMsVal}L\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *COLLECTIONS BREAKDOWN:*\n`;
    text += `• Cash Handover: ₹${cashVal.toFixed(2)}\n`;
    text += `• UPI / PhonePe: ₹${upiVal.toFixed(2)}\n`;
    text += `• Pine Labs (Card): ₹${pineLabsVal.toFixed(2)}\n`;
    text += `• OTP / Voucher: ₹${otpVoucherVal.toFixed(2)}\n`;
    text += `• Credit Given: ₹${totalCreditGiven.toFixed(2)}\n`;
    text += `• Expenses: ₹${totalExpenses.toFixed(2)}\n`;
    text += `• Loyalty Rewards: ₹${rewardsVal.toFixed(2)}\n`;
    text += `• *Total Accounted:* ₹${totalAccounted.toFixed(2)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 *FINANCIAL RECONCILIATION:*\n`;
    text += `• Expected Sales: ₹${totalSalesExpected.toFixed(2)}\n`;
    text += `• Actual Accounted: ₹${totalAccounted.toFixed(2)}\n`;
    text += `• *Variance:* *₹${varianceAmt.toFixed(2)}*\n`;
    text += `• *Status:* *${varianceAmt < 0 ? '⚠️ SHORTAGE' : '✅ BALANCED / EXCESS'}*\n`;
    
    if (creditEntries.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📋 *CREDIT DETAILS:*\n`;
      creditEntries.forEach(c => {
        text += `• ${c.name} (${c.vehicle || 'No vehicle'}): ₹${c.amount.toFixed(2)}\n`;
      });
    }

    if (expenseEntries.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💼 *EXPENSE DETAILS:*\n`;
      expenseEntries.forEach(e => {
        text += `• ${e.note}: ₹${e.amount.toFixed(2)}\n`;
      });
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#070d1a] text-slate-100 max-w-[480px] mx-auto w-full relative font-sans">
      {isSubmitting && (
        <div className="fixed inset-0 z-[300] bg-black/75 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[#FFD100] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-[#FFD100] tracking-wide">Submitting Audit...</span>
          </div>
        </div>
      )}

      {/* Sticky Header with BP Branding */}
      <div className="sticky top-0 z-[100] bg-gradient-to-r from-[#001440] via-[#002d72] to-[#001440] border-b-2 border-[#FFD100]/40 px-[18px] py-[12px] flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={step > 1 ? () => setStep(step - 1) : onBack}
            className="bg-[#050b18] border border-slate-700/60 text-[#FFD100] hover:text-white rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
          >
            ←
          </button>
          <div>
            <div className="font-extrabold text-[15px] text-[#FFD100] flex items-center gap-1.5 leading-none">
              <span>⛽</span> {activeShift?.dsmName ? `${activeShift.dsmName} Audit` : 'Pump Audit'}
            </div>
            <div className="text-[9px] text-[#93c5fd] font-black uppercase tracking-wider mt-1">
              Step {step} of 4 · {step === 1 ? 'Start/Opening' : step === 2 ? 'End/Closing' : step === 3 ? 'Collections' : 'Final Review'}
            </div>
          </div>
        </div>
        <button 
          onClick={handleNewAuditReset}
          className="bg-[#1a1309] border border-[#FFD100]/30 text-[#FFD100] hover:bg-[#FFD100]/15 font-black text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          ↻ Reset Form
        </button>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0a1224] border-b border-border/40 select-none shadow-md">
        {[
          { step: 1, label: 'Start/Opening' },
          { step: 2, label: 'End/Closing' },
          { step: 3, label: 'Collections' },
          { step: 4, label: 'Final Review' }
        ].map((item) => {
          const isDone = step > item.step;
          const isCurrent = step === item.step;
          return (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center gap-1 flex-1 relative z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border-2 ${
                    isDone 
                      ? 'bg-[#FFD100] border-[#FFD100] text-[#001440] shadow-md shadow-[#FFD100]/25' 
                      : isCurrent 
                        ? 'bg-[#001440] border-[#FFD100] text-[#FFD100] ring-4 ring-[#FFD100]/15' 
                        : 'bg-[#050b18] border-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : item.step}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider text-center max-w-[75px] mt-1 ${isCurrent ? 'text-[#FFD100]' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </div>
              {item.step < 4 && (
                <div 
                  className={`h-0.5 flex-1 -mt-4 transition-colors ${
                    step > item.step ? 'bg-[#FFD100]' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Wizard Step Screens */}
      <div className="flex-1 p-[14px] overflow-y-auto">
        
        {/* STEP 1: OPENING VTOT READINGS */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fadeUp">
            <div className="bg-[#0b1329] border border-blue-500/10 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <h2 className="text-base font-black text-slate-100">Shift Opening Meter readings</h2>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">Please check and input the starting readings from your shift ticket.</p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => alert('Camera scanner integration is currently mocked. Please enter values manually below.')}
              className="w-full py-3 border border-dashed border-[#FFD100]/40 text-[#FFD100] bg-[#FFD100]/5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#FFD100]/10 transition-colors"
            >
              📸 Scan Opening Receipt
            </button>

            {/* Nozzle Input Grid */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="text-[10px] font-black text-[#FFD100] uppercase tracking-wider mb-3 flex items-center gap-1">
                <span>⚡</span> Enter 4 Opening Readings (Open VTOT)
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* HSD (Diesel) Nozzles */}
                <div className="bg-[#09152e] border-2 border-blue-500/30 focus-within:border-blue-500 rounded-xl p-3 shadow-md transition-all">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block">N1 HSD (Diesel)</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01" 
                    inputMode="decimal"
                    value={openN1}
                    onChange={(e) => setOpenN1(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Decimal up to 2 places</span>
                </div>
                
                <div className="bg-[#09152e] border-2 border-blue-500/30 focus-within:border-blue-500 rounded-xl p-3 shadow-md transition-all">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block">N2 HSD (Diesel)</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01" 
                    inputMode="decimal"
                    value={openN2}
                    onChange={(e) => setOpenN2(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Decimal up to 2 places</span>
                </div>

                {/* MS (Petrol) Nozzles */}
                <div className="bg-[#1b1509] border-2 border-[#FFD100]/30 focus-within:border-[#FFD100] rounded-xl p-3 shadow-md transition-all">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#FFD100]"></span>
                    <span className="text-[9px] font-black text-[#FFD100] uppercase tracking-wider block">N3 MS (Petrol)</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01" 
                    inputMode="decimal"
                    value={openN3}
                    onChange={(e) => setOpenN3(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Decimal up to 2 places</span>
                </div>
                
                <div className="bg-[#1b1509] border-2 border-[#FFD100]/30 focus-within:border-[#FFD100] rounded-xl p-3 shadow-md transition-all">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#FFD100]"></span>
                    <span className="text-[9px] font-black text-[#FFD100] uppercase tracking-wider block">N4 MS (Petrol)</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01" 
                    inputMode="decimal"
                    value={openN4}
                    onChange={(e) => setOpenN4(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Decimal up to 2 places</span>
                </div>
              </div>
            </div>

            {/* Shift metadata configs */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Active Shift</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShiftType('day')}
                    className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      shiftType === 'day' 
                        ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] font-black shadow-lg shadow-[#FFD100]/5' 
                        : 'bg-[#050b18] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ☀️ Day Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftType('night')}
                    className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      shiftType === 'night' 
                        ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] font-black shadow-lg shadow-[#FFD100]/5' 
                        : 'bg-[#050b18] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🌙 Night Shift
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shift Date</span>
                  <input 
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="w-full bg-[#050b18] border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-bold outline-none focus:border-[#FFD100]"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</span>
                  <input 
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#050b18] border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-bold outline-none focus:border-[#FFD100]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!isStep1Valid}
              onClick={() => setStep(2)}
              className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer mt-2 shadow-lg hover:shadow-amber-500/10 active:scale-[0.99] transition-all"
            >
              Continue to Closing Meter →
            </button>
          </div>
        )}

        {/* STEP 2: CLOSING VTOT READINGS */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-fadeUp">
            <div className="bg-[#0b1329] border border-blue-500/10 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">⛽</span>
              <div>
                <h2 className="text-base font-black text-slate-100">End-of-Shift Readings</h2>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">Please check and input the final closing readings from your ticket.</p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => alert('Camera scanner integration is currently mocked. Please enter values manually below.')}
              className="w-full py-3 border border-dashed border-[#FFD100]/40 text-[#FFD100] bg-[#FFD100]/5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#FFD100]/10 transition-colors"
            >
              📸 Scan Closing Receipt
            </button>

            {/* Closing meter input grid */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="text-[10px] font-black text-[#FFD100] uppercase tracking-wider mb-3 flex items-center gap-1">
                <span>💾</span> Enter 4 Closing Readings (Close VTOT)
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* N1 HSD */}
                {(() => {
                  const hasError = closeN1 && parseFloat(closeN1) < n1Open;
                  return (
                    <div className={`bg-[#09152e] border-2 rounded-xl p-3 shadow-md transition-all ${
                      hasError ? 'border-red-500 bg-red-950/10' : 'border-blue-500/30 focus-within:border-blue-500'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></span>
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${hasError ? 'text-red-400' : 'text-blue-400'}`}>N1 HSD (Diesel)</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01" 
                        inputMode="decimal"
                        value={closeN1}
                        onChange={(e) => setCloseN1(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                      />
                      <div className="flex justify-between items-center mt-1 border-t border-slate-800/80 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold">Open: {n1Open}</span>
                        {hasError && <span className="text-[8px] text-red-400 font-black animate-pulse">⚠️ Too Low</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* N2 HSD */}
                {(() => {
                  const hasError = closeN2 && parseFloat(closeN2) < n2Open;
                  return (
                    <div className={`bg-[#09152e] border-2 rounded-xl p-3 shadow-md transition-all ${
                      hasError ? 'border-red-500 bg-red-950/10' : 'border-blue-500/30 focus-within:border-blue-500'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></span>
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${hasError ? 'text-red-400' : 'text-blue-400'}`}>N2 HSD (Diesel)</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01" 
                        inputMode="decimal"
                        value={closeN2}
                        onChange={(e) => setCloseN2(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                      />
                      <div className="flex justify-between items-center mt-1 border-t border-slate-800/80 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold">Open: {n2Open}</span>
                        {hasError && <span className="text-[8px] text-red-400 font-black animate-pulse">⚠️ Too Low</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* N3 MS */}
                {(() => {
                  const hasError = closeN3 && parseFloat(closeN3) < n3Open;
                  return (
                    <div className={`bg-[#1b1509] border-2 rounded-xl p-3 shadow-md transition-all ${
                      hasError ? 'border-red-500 bg-red-950/10' : 'border-[#FFD100]/30 focus-within:border-[#FFD100]'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500 animate-pulse' : 'bg-[#FFD100]'}`}></span>
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${hasError ? 'text-red-400' : 'text-[#FFD100]'}`}>N3 MS (Petrol)</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01" 
                        inputMode="decimal"
                        value={closeN3}
                        onChange={(e) => setCloseN3(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                      />
                      <div className="flex justify-between items-center mt-1 border-t border-slate-800/80 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold">Open: {n3Open}</span>
                        {hasError && <span className="text-[8px] text-red-400 font-black animate-pulse">⚠️ Too Low</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* N4 MS */}
                {(() => {
                  const hasError = closeN4 && parseFloat(closeN4) < n4Open;
                  return (
                    <div className={`bg-[#1b1509] border-2 rounded-xl p-3 shadow-md transition-all ${
                      hasError ? 'border-red-500 bg-red-950/10' : 'border-[#FFD100]/30 focus-within:border-[#FFD100]'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500 animate-pulse' : 'bg-[#FFD100]'}`}></span>
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${hasError ? 'text-red-400' : 'text-[#FFD100]'}`}>N4 MS (Petrol)</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01" 
                        inputMode="decimal"
                        value={closeN4}
                        onChange={(e) => setCloseN4(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-2xl font-black outline-none mt-1"
                      />
                      <div className="flex justify-between items-center mt-1 border-t border-slate-800/80 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold">Open: {n4Open}</span>
                        {hasError && <span className="text-[8px] text-red-400 font-black animate-pulse">⚠️ Too Low</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Error boundary check */}
              {((closeN1 && parseFloat(closeN1) < n1Open) || 
                (closeN2 && parseFloat(closeN2) < n2Open) || 
                (closeN3 && parseFloat(closeN3) < n3Open) || 
                (closeN4 && parseFloat(closeN4) < n4Open)) && (
                <div className="mt-4 bg-red-950/45 border border-red-500/35 text-red-400 p-3 rounded-xl text-xs font-black flex items-center gap-1.5">
                  ⚠️ Error: One or more closing readings are lower than opening. Please correct them.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</span>
                <input 
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-bold outline-none focus:border-[#FFD100]"
                />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</span>
                <input 
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-bold outline-none focus:border-[#FFD100]"
                />
              </div>
            </div>

            {/* Computed Sales Volumes */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>📊</span> Net Sales Volume (Liters)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#050b18] border border-blue-500/25 rounded-xl p-3.5">
                  <div className="text-[9px] text-[#64748b] font-bold uppercase">HSD Net Liters</div>
                  <div className="text-xl font-black text-blue-400 mt-1">{hsdNet.toFixed(2)} L</div>
                </div>
                <div className="bg-[#050b18] border border-[#FFD100]/25 rounded-xl p-3.5">
                  <div className="text-[9px] text-[#64748b] font-bold uppercase">MS Net Liters</div>
                  <div className="text-xl font-black text-[#FFD100] mt-1">{msNet.toFixed(2)} L</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!isStep2Valid}
              onClick={() => setStep(3)}
              className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer mt-2 shadow-lg hover:shadow-amber-500/10 active:scale-[0.99] transition-all"
            >
              Continue to Collections →
            </button>
          </div>
        )}

        {/* STEP 3: FINANCIAL COLLECTIONS, LEDGERS & DEDUCTIONS */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-fadeUp">
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-1.5">
                <span>💰</span> Handover Collections & Deductions
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Please specify all collected cash, digital transactions, and shift credits.</p>
            </div>

            {/* Fuel Rates Header Box */}
            <div className="bg-gradient-to-br from-[#0d1829] to-[#0a1224] border-l-4 border-[#FFD100] rounded-2xl p-4 relative overflow-hidden shadow-xl">
              <span className="absolute top-3 right-3 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase py-0.5 px-2 rounded-lg flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Rates Live
              </span>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Today's Retail Rates (1 Litre)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] text-blue-400 font-extrabold uppercase">HSD Diesel</div>
                  <div className="text-xl font-black text-slate-100">₹{rateHsd.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#FFD100] font-extrabold uppercase">MS Petrol</div>
                  <div className="text-xl font-black text-slate-100">₹{rateMs.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* DSM name confirmation */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Auditing DSM Full Name</span>
              <input 
                type="text"
                placeholder="Enter DSM name"
                value={dsmName}
                onChange={(e) => setDsmName(e.target.value)}
                className="w-full bg-[#050b18] border border-slate-800 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]"
              />
            </div>

            {/* Payments Collected Container */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="text-xs font-black text-[#FFD100] border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
                <span>💰</span> Payment Collections (Rupees)
              </div>
              
              <div className="flex flex-col gap-2.5 mt-1">
                {/* Cash */}
                <div className="bg-[#050b18] border border-slate-800 focus-within:border-[#FFD100] rounded-xl p-3 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💵</span>
                    <div>
                      <span className="block text-[10px] font-black text-[#FFD100] uppercase tracking-wider">Cash Handover</span>
                      <span className="text-[9px] text-slate-400">Actual physical cash</span>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    inputMode="decimal"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                    className="bg-transparent border-none text-white text-right text-lg font-black outline-none w-36"
                  />
                </div>

                {/* UPI */}
                <div className="bg-[#050b18] border border-slate-800 focus-within:border-[#FFD100] rounded-xl p-3 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div>
                      <span className="block text-[10px] font-black text-[#FFD100] uppercase tracking-wider">UPI / GPay / PayTM</span>
                      <span className="text-[9px] text-slate-400">Digital wallet collections</span>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    inputMode="decimal"
                    value={upiCollected}
                    onChange={(e) => setUpiCollected(e.target.value)}
                    className="bg-transparent border-none text-white text-right text-lg font-black outline-none w-36"
                  />
                </div>

                {/* Cards */}
                <div className="bg-[#050b18] border border-slate-800 focus-within:border-[#FFD100] rounded-xl p-3 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <span className="block text-[10px] font-black text-[#FFD100] uppercase tracking-wider">Pine Labs Card</span>
                      <span className="text-[9px] text-slate-400">POS credit/debit swipes</span>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    inputMode="decimal"
                    value={pineLabsCollected}
                    onChange={(e) => setPineLabsCollected(e.target.value)}
                    className="bg-transparent border-none text-white text-right text-lg font-black outline-none w-36"
                  />
                </div>

                {/* Vouchers */}
                <div className="bg-[#050b18] border border-slate-800 focus-within:border-[#FFD100] rounded-xl p-3 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎟️</span>
                    <div>
                      <span className="block text-[10px] font-black text-[#FFD100] uppercase tracking-wider">OTP / Vouchers</span>
                      <span className="text-[9px] text-slate-400">Bunk coupons & approvals</span>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    placeholder="₹ 0.00" 
                    inputMode="decimal"
                    value={otpVoucherCollected}
                    onChange={(e) => setOtpVoucherCollected(e.target.value)}
                    className="bg-transparent border-none text-white text-right text-lg font-black outline-none w-36"
                  />
                </div>

                {/* Credits read-only ledger sum */}
                <div className="bg-[#0c1e3a] border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <span className="block text-[10px] font-black text-blue-400 uppercase tracking-wider">Credit Ledger</span>
                      <span className="text-[9px] text-blue-300">{creditEntries.length} transactions added</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-400 text-lg font-black">₹{totalCreditGiven.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Customers Section */}
            <div className="bg-card border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl">
              <div className="text-xs font-black text-slate-200 border-b border-slate-800/80 pb-2 flex justify-between items-center">
                <span>📋 Credit Customer Transactions</span>
                <button 
                  onClick={() => setShowCreditForm(true)}
                  className="bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  ➕ Add New
                </button>
              </div>
              
              {creditEntries.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {creditEntries.map(cr => (
                    <div key={cr.id} className="flex justify-between items-center bg-[#050b18] border border-slate-800/80 rounded-xl p-2.5 px-3">
                      <div>
                        <div className="text-xs font-black text-slate-100">{cr.name}</div>
                        <div className="text-[9px] text-[#94a3b8] font-bold mt-0.5">🚚 {cr.vehicle || 'No vehicle'} {cr.phone && ` · 📱 ${cr.phone}`}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-[#FFD100]">₹{cr.amount.toFixed(2)}</span>
                        <button 
                          onClick={() => handleRemoveCredit(cr.id)}
                          className="bg-red-500/10 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-500/40 rounded-lg py-1 px-2 text-[10px] font-black cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#64748b] text-center py-2 font-medium">No credit customer transactions registered.</div>
              )}
            </div>

            {/* Expenses Section */}
            <div className="bg-card border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl">
              <div className="text-xs font-black text-slate-200 border-b border-slate-800/80 pb-2 flex justify-between items-center">
                <span>💸 Shift Cash Expenses</span>
                <button 
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  ➕ Add New
                </button>
              </div>
              
              {expenseEntries.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {expenseEntries.map(ex => (
                    <div key={ex.id} className="flex justify-between items-center bg-[#050b18] border border-slate-800/80 rounded-xl p-2.5 px-3">
                      <div className="text-xs font-black text-slate-100">{ex.note}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-orange-400">₹{ex.amount.toFixed(2)}</span>
                        <button 
                          onClick={() => handleRemoveExpense(ex.id)}
                          className="bg-red-500/10 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-500/40 rounded-lg py-1 px-2 text-[10px] font-black cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#64748b] text-center py-2 font-medium">No expenses logged yet for this shift.</div>
              )}
            </div>

            {/* Expenses & Rewards & Stock Calibration */}
            <div className="bg-card border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="text-xs font-black text-slate-200 border-b border-slate-800 pb-2">💼 Calibration & Deductions</div>
              
              <div className="flex flex-col gap-3 mt-1">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base select-none">💼</span>
                  <input 
                    type="number" 
                    readOnly
                    placeholder="0.00" 
                    value={totalExpenses || ''}
                    className="w-full bg-[#180a0a] border border-[#ef444433] text-orange-400 font-bold text-sm rounded-xl py-3 px-10 outline-none cursor-default"
                  />
                  <label className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-orange-400 uppercase">Total Expenses</label>
                </div>

                <div className="grid grid-cols-2 gap-3.5 bg-[#050b18] border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase col-span-2 tracking-wider">🔬 Nozzle Testing Calibration (Liters)</div>
                  <div>
                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">Testing HSD (Diesel)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={testingHsd}
                      onChange={(e) => setTestingHsd(e.target.value)}
                      className="w-full bg-[#0a142c] border border-blue-500/25 rounded-lg p-2 text-white font-extrabold text-sm outline-none focus:border-[#FFD100]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-[#FFD100] uppercase mb-1">Testing MS (Petrol)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={testingMs}
                      onChange={(e) => setTestingMs(e.target.value)}
                      className="w-full bg-[#1b1509] border border-[#FFD100]/25 rounded-lg p-2 text-white font-extrabold text-sm outline-none focus:border-[#FFD100]"
                    />
                  </div>
                  <div className="col-span-2 border-t border-slate-800/80 pt-2.5 flex justify-between text-[10px] font-bold text-[#64748b]">
                    <span>Testing Value Deducted:</span>
                    <span className="text-slate-300">₹{calculatedTestingAmt.toFixed(2)}</span>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base select-none">🎁</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    inputMode="decimal"
                    value={loyaltyRewards}
                    onChange={(e) => setLoyaltyRewards(e.target.value)}
                    className="w-full bg-[#050b18] border border-slate-800 rounded-xl py-3 px-10 text-white font-bold text-sm outline-none focus:border-[#FFD100] placeholder:text-slate-600"
                  />
                  <label className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-400 uppercase">Loyalty Rewards</label>
                </div>
              </div>
            </div>

            {/* Live Calculation Preview Card styled like a Cash Register Receipt */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-2xl relative overflow-hidden font-mono select-none">
              {/* Receipt Serrated Edge top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-300 via-transparent to-transparent bg-[length:10px_4px] bg-repeat-x"></div>
              
              <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">NSS BHARAT PETROLEUM</h4>
                <div className="text-xs font-black text-slate-800 uppercase mt-0.5">SHIFT AUDIT RECEIPT</div>
                <div className="text-[8px] text-slate-400 mt-1.5">DATE: {shiftDate} | SHIFT: {shiftType.toUpperCase()}</div>
              </div>

              {/* Items Table */}
              <div className="flex flex-col gap-2 text-xs border-b border-dashed border-slate-300 pb-3.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">HSD Expected Sales:</span>
                  <span className="font-extrabold text-slate-800">₹{hsdSalesVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MS Expected Sales:</span>
                  <span className="font-extrabold text-slate-800">₹{msSalesVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black border-t border-dotted border-slate-300 pt-2 text-slate-800">
                  <span>TOTAL SALES REQ:</span>
                  <span>₹{totalSalesExpected.toFixed(2)}</span>
                </div>
                
                <div className="h-2"></div>
                
                <div className="flex justify-between text-slate-500">
                  <span>Cash Handed Over:</span>
                  <span>+₹{cashVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Digital Payments:</span>
                  <span>+₹{(upiVal + pineLabsVal + otpVoucherVal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Credit Ledger:</span>
                  <span>+₹{totalCreditGiven.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shift Expenses:</span>
                  <span>+₹{totalExpenses.toFixed(2)}</span>
                </div>
                {rewardsVal > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Loyalty Rewards:</span>
                    <span>+₹{rewardsVal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black border-t border-dotted border-slate-300 pt-2 text-slate-800">
                  <span>TOTAL ACCOUNTED:</span>
                  <span>₹{totalAccounted.toFixed(2)}</span>
                </div>
              </div>

              {/* Verdict Section */}
              <div className="pt-4 text-center">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">RECONCILIATION VERDICT</div>
                <div className={`text-3xl font-black mt-2 tracking-tight ${varianceAmt < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {varianceAmt < 0 ? '-' : '+'}₹{Math.abs(varianceAmt).toFixed(2)}
                </div>
                
                {varianceAmt < 0 ? (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 animate-pulse">
                    ⚠️ SHORTAGE — DSM MUST PAY
                  </div>
                ) : (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5">
                    ✅ BALANCED / EXCESS
                  </div>
                )}
              </div>
              
              {/* Bottom Serrated Edge decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-300 via-transparent to-transparent bg-[length:10px_4px] bg-repeat-x"></div>
            </div>

            <button
              type="button"
              disabled={!isStep3Valid}
              onClick={() => setStep(4)}
              className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer mt-2 shadow-lg hover:shadow-amber-500/10 active:scale-[0.99] transition-all"
            >
              Review & Submit Report →
            </button>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-fadeUp">
            <div className="bg-[#0b1329] border border-blue-500/10 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">🏁</span>
              <div>
                <h2 className="text-base font-black text-slate-100">Review Shift Audit</h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">Please confirm all calculated details below.</p>
              </div>
            </div>

            {/* Shift & DSM Metadata Card */}
            <div className="bg-gradient-to-br from-[#001440] to-[#0a1224] border border-[#FFD100]/25 rounded-2xl p-4 shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="bg-[#FFD100] text-[#001440] text-[8px] font-black uppercase py-0.5 px-2 rounded-md">
                    {shiftType} shift
                  </span>
                  <h3 className="text-base font-black text-slate-100 mt-2">⛽ Pump Session Summary</h3>
                  <p className="text-[11px] text-[#93c5fd] font-bold mt-0.5">{startTime} - {endTime} | {shiftDate}</p>
                </div>
                <div className="text-right bg-[#001440]/50 border border-[#FFD100]/15 p-2 rounded-xl">
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">DSM Name</span>
                  <span className="text-sm font-black text-[#FFD100]">{dsmName}</span>
                </div>
              </div>
            </div>

            {/* Vtot Readings Summary Card */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="text-xs font-black text-slate-200 border-b border-slate-800 pb-2 mb-3">📈 Vtot Meter Readings Log</div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-blue-400 font-bold uppercase">N1 HSD Open</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{openN1}</div>
                </div>
                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-blue-400 font-bold uppercase">N1 HSD Close</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{closeN1}</div>
                </div>

                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-blue-400 font-bold uppercase">N2 HSD Open</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{openN2}</div>
                </div>
                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-blue-400 font-bold uppercase">N2 HSD Close</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{closeN2}</div>
                </div>

                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-[#FFD100] font-bold uppercase">N3 MS Open</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{openN3}</div>
                </div>
                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-[#FFD100] font-bold uppercase">N3 MS Close</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{closeN3}</div>
                </div>

                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-[#FFD100] font-bold uppercase">N4 MS Open</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{openN4}</div>
                </div>
                <div className="bg-[#050b18] p-2.5 px-3 border border-slate-800/80 rounded-xl">
                  <div className="text-[8px] text-[#FFD100] font-bold uppercase">N4 MS Close</div>
                  <div className="text-base font-black text-slate-200 mt-0.5">{closeN4}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-[9px] font-bold text-[#64748b] block uppercase">Net HSD Volume</span>
                  <span className="text-base font-extrabold text-blue-400">{hsdNet.toFixed(2)} L</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#64748b] block uppercase">Net MS Volume</span>
                  <span className="text-base font-extrabold text-[#FFD100]">{msNet.toFixed(2)} L</span>
                </div>
              </div>
            </div>

            {/* Collection Breakdown Summary */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="text-xs font-black text-slate-200 border-b border-slate-800 pb-2 mb-3">💰 Handover Collections</div>
              
              <div className="flex flex-col gap-2.5 text-xs text-[#94a3b8]">
                <div className="flex justify-between font-bold">
                  <span>DSM Cash Handover:</span>
                  <span className="text-slate-200">₹{cashVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>UPI / PhonePe:</span>
                  <span className="text-slate-200">₹{upiVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Pine Labs (Cards):</span>
                  <span className="text-slate-200">₹{pineLabsVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>OTP / Voucher:</span>
                  <span className="text-slate-200">₹{otpVoucherVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Credit Ledger:</span>
                  <span className="text-slate-200 font-extrabold">₹{totalCreditGiven.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Deducted Expenses:</span>
                  <span className="text-slate-200 font-extrabold">₹{totalExpenses.toFixed(2)}</span>
                </div>
                {calculatedTestingAmt > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Testing Deduction:</span>
                    <span className="text-slate-200">₹{calculatedTestingAmt.toFixed(2)}</span>
                  </div>
                )}
                {rewardsVal > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Loyalty Rewards:</span>
                    <span className="text-slate-200">₹{rewardsVal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold border-t border-slate-800/80 pt-2.5 mt-2.5">
                  <span className="text-slate-200">Total Accounted:</span>
                  <span className="text-green-400 font-black text-sm">₹{totalAccounted.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 shadow-md">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Expected Cash from Sales</span>
                <span className="text-base font-black text-slate-100">₹{totalSalesExpected.toFixed(2)}</span>
              </div>
              <div className="bg-[#0b1329] border border-slate-800 rounded-xl p-3 shadow-md">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Shortage/Excess Settle</span>
                <span className={`text-base font-black ${varianceAmt < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ₹{varianceAmt.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Final Alert Card */}
            <div className={`border-2 rounded-2xl p-4 text-center shadow-lg ${
              varianceAmt < 0 
                ? 'bg-red-950/20 border-red-500/40 text-red-400' 
                : 'bg-green-950/20 border-green-500/40 text-green-400'
            }`}>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#64748b]">Variance Settle Status</div>
              <div className="text-3xl font-black mt-1.5 tracking-tight">₹{Math.abs(varianceAmt).toFixed(2)}</div>
              <div className="text-[10px] font-bold mt-1 uppercase">
                {varianceAmt < 0 ? '⚠️ SHORTAGE — DSM must deposit shortage' : '✅ SHIFT BALANCED / EXCESS'}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={async () => {
                  handleShareWhatsApp();
                  await handleFinalSubmit();
                }}
                className="w-full py-4 bg-[#25D366] hover:bg-[#20ba56] text-white font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.99] border-none"
              >
                {/* Official WhatsApp icon */}
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share on WhatsApp & Submit
              </button>
              
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full py-3 bg-[#0c1324] border border-[#1e3a8a]/30 hover:bg-[#1e3a8a]/10 text-[#93c5fd] font-extrabold text-xs rounded-xl uppercase cursor-pointer transition-all active:scale-[0.99]"
              >
                ✓ Submit without Sharing
              </button>
              
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-3 bg-[#050b18] border border-slate-800 hover:bg-slate-800/10 text-slate-300 font-extrabold text-xs rounded-xl uppercase cursor-pointer transition-colors flex items-center justify-center gap-1 active:scale-[0.99]"
              >
                📝 Edit readings
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Credit Popover Modal Form */}
      {showCreditForm && (
        <div className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1829] border border-[#1e3a5f] rounded-2xl w-full max-w-[380px] p-5 shadow-2xl animate-scaleUp text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-black text-[#FFD100] uppercase tracking-wider flex items-center gap-1.5">
                <span>✍️</span> Add Credit Transaction
              </h3>
              <button 
                onClick={() => {
                  setShowCreditForm(false);
                  setCreditName('');
                  setCreditPhone('');
                  setCreditVehicle('');
                  setCreditAmount('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer / Company Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter name" 
                  value={creditName} 
                  onChange={(e) => setCreditName(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#FFD100] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle License Plate No. *</label>
                <input 
                  type="text" 
                  placeholder="e.g. KA01AB1234" 
                  value={creditVehicle} 
                  onChange={(e) => setCreditVehicle(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#FFD100] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile Phone (Optional)</label>
                <input 
                  type="tel" 
                  placeholder="10-digit mobile" 
                  maxLength={10}
                  value={creditPhone} 
                  onChange={(e) => setCreditPhone(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#FFD100] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Credit Value (₹) *</label>
                <input 
                  type="number" 
                  placeholder="₹ 0.00" 
                  value={creditAmount} 
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#FFD100] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => {
                  setShowCreditForm(false);
                  setCreditName('');
                  setCreditPhone('');
                  setCreditVehicle('');
                  setCreditAmount('');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCredit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFD100] to-amber-500 text-[#001440] hover:shadow-amber-500/10 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Popover Modal Form */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b120c] border border-orange-900/30 rounded-2xl w-full max-w-[380px] p-5 shadow-2xl animate-scaleUp text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-black text-[#f97316] uppercase tracking-wider flex items-center gap-1.5">
                <span>💼</span> Add Shift Expense
              </h3>
              <button 
                onClick={() => {
                  setShowExpenseForm(false);
                  setExpenseNote('');
                  setExpenseAmount('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expense Description *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Tea & Snacks, Office Stationery" 
                  value={expenseNote} 
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#f97316] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (₹) *</label>
                <input 
                  type="number" 
                  placeholder="₹ 0.00" 
                  value={expenseAmount} 
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-[#050b18] border border-slate-800 focus:border-[#f97316] rounded-xl p-3 text-slate-200 text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => {
                  setShowExpenseForm(false);
                  setExpenseNote('');
                  setExpenseAmount('');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddExpense}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:shadow-orange-500/10 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
