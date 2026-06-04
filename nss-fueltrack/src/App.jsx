import React, { useState, useEffect } from 'react';
import { useClock } from './hooks/useClock';
import { fmtDuration, fmtTime, fmt } from './constants';
import { api } from './api';

// Component Imports
import Header from './components/Header';
import BottomNav from './components/BottomNav';

// Screen Imports
import Dashboard from './screens/Dashboard';
import Entry from './screens/Entry';
import Report from './screens/Report';
import History from './screens/History';
import Settings from './screens/Settings';

export default function App() {
  // ── LOCAL STORAGE INITIALIZATION (Resilience Backup) ──
  
  const getStorageItem = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  // ── STATES ──

  // Prices state (fallback defaults)
  const [prices, setPrices] = useState(() => 
    getStorageItem('nss_prices', { ms: 102.50, hsd: 89.00 })
  );

  // Security PIN (fallback default)
  const [ownerPin, setOwnerPin] = useState(() => {
    try {
      const pin = localStorage.getItem('nss_owner_pin');
      return pin ? JSON.parse(pin) : '0000';
    } catch (e) {
      return '0000';
    }
  });

  // Shift metadata (dsmName, shiftType, startTime)
  const [shiftMeta, setShiftMeta] = useState(() => 
    getStorageItem('nss_shift_meta', null)
  );

  // Transactions list
  const [transactions, setTransactions] = useState(() => 
    getStorageItem('nss_shift_transactions', [])
  );

  // API connectivity warning banner state
  const [isServerOffline, setIsServerOffline] = useState(false);

  // Routing states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');

  // PIN security unlock status
  const [unlockExpiry, setUnlockExpiry] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(null);
  const [pinLockCountdown, setPinLockCountdown] = useState(0);
  const [pinError, setPinError] = useState('');

  // Soft Deletion Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Reset Confirmation state
  const [showResetModal, setShowResetModal] = useState(false);

  // Setup Form states
  const [setupDsmName, setSetupDsmName] = useState('');
  const [setupShiftType, setSetupShiftType] = useState('day');

  // Toast status notification
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── LIVE CLOCK HOOK ──
  const startTimeVal = shiftMeta ? new Date(shiftMeta.startTime) : null;
  const { clock, duration } = useClock(startTimeVal);

  // Calculate total Credit amount for header limit warnings
  const activeTxns = transactions.filter((t) => !t.deleted);
  const totalCredit = activeTxns
    .filter((t) => t.paymentMode === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  // Check if Settings is unlocked (within the 5-minute window)
  const isSettingsUnlocked = unlockExpiry && Date.now() < unlockExpiry;

  // ── APP BOOTSTRAP: FETCH LATEST DATA FROM SERVER ──
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // 1. Fetch Prices
        const serverPrices = await api.fetchPrices();
        setPrices(serverPrices);
        localStorage.setItem('nss_prices', JSON.stringify(serverPrices));

        // 2. Fetch Active Shift from Server
        const activeShift = await api.fetchActiveShift();
        if (activeShift) {
          const meta = {
            dsmName: activeShift.dsm_name,
            shiftType: activeShift.shift_type,
            startTime: activeShift.start_time
          };
          setShiftMeta(meta);
          setTransactions(activeShift.transactions);
          
          localStorage.setItem('nss_shift_meta', JSON.stringify(meta));
          localStorage.setItem('nss_shift_transactions', JSON.stringify(activeShift.transactions));

          setToastMessage(
            `✅ Session synced — ${activeShift.transactions.filter(t => !t.deleted).length} transactions loaded from server`
          );
        } else {
          // If no active shift exists on server, check if we have an active local one
          const localMeta = getStorageItem('nss_shift_meta', null);
          if (localMeta) {
            // Local shift exists, warn user they might need to clear or sync
            setToastMessage(`⚠️ No active shift on server. Local backup restored.`);
          }
        }
        setIsServerOffline(false);
      } catch (err) {
        console.error("Backend fetch failed, using local storage fallback:", err);
        setIsServerOffline(true);
        setToastMessage("⚠️ Backend offline — using local storage fallback.");
      } finally {
        setIsLoading(false);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
    loadData();
  }, []);

  // Sync state changes with localStorage backups (for offline resilience)
  useEffect(() => {
    if (shiftMeta) {
      localStorage.setItem('nss_shift_meta', JSON.stringify(shiftMeta));
    } else {
      localStorage.removeItem('nss_shift_meta');
    }
  }, [shiftMeta]);

  useEffect(() => {
    localStorage.setItem('nss_shift_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Countdown timer for wrong-attempt lockouts
  useEffect(() => {
    if (!pinLockUntil) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((pinLockUntil - Date.now()) / 1000));
      setPinLockCountdown(remaining);
      if (remaining === 0) {
        setPinLockUntil(null);
        setPinAttempts(0);
        setPinError('');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pinLockUntil]);

  // ── ACTION HANDLERS ──

  // Start Shift Setup
  const handleStartShift = async () => {
    if (!setupDsmName.trim()) return;
    setIsLoading(true);
    const localStart = new Date().toISOString();

    try {
      if (!isServerOffline) {
        const serverShift = await api.startShift(setupDsmName.trim(), setupShiftType, localStart);
        const meta = {
          dsmName: serverShift.dsm_name,
          shiftType: serverShift.shift_type,
          startTime: serverShift.start_time
        };
        setShiftMeta(meta);
        setTransactions(serverShift.transactions);
      } else {
        // Fallback start shift locally
        const meta = {
          dsmName: setupDsmName.trim(),
          shiftType: setupShiftType,
          startTime: localStart
        };
        setShiftMeta(meta);
        setTransactions([]);
      }
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Error starting shift: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Transaction
  const handleAddTransaction = async (newTx) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        const savedTx = await api.createTransaction(newTx);
        setTransactions((prev) => [savedTx, ...prev]);
      } else {
        // Offline local transaction log
        const localTx = {
          ...newTx,
          id: Date.now().toString(36),
          fuelLabel: newTx.fuelId === 'ms' ? 'MS (Petrol)' : 'HSD (Diesel)',
          modeLabel: newTx.paymentMode === 'credit' ? 'Credit' : newTx.paymentMode.toUpperCase(),
          timestamp: new Date().toISOString(),
          deleted: false,
          deletionReason: null,
          deletedAt: null
        };
        setTransactions((prev) => [localTx, ...prev]);
      }
    } catch (err) {
      alert(`Error logging transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Soft Deletion Trigger
  const handleInitiateDelete = (txId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    setTxnToDelete(tx);
    setDeletionReason('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!txnToDelete || !deletionReason) return;
    setIsLoading(true);

    try {
      if (!isServerOffline) {
        await api.deleteTransaction(txnToDelete.id, deletionReason);
      }
      
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txnToDelete.id
            ? {
                ...t,
                deleted: true,
                deletionReason: deletionReason,
                deletedAt: new Date().toISOString()
              }
            : t
        )
      );
      
      setShowDeleteModal(false);
      setTxnToDelete(null);
      setDeletionReason('');
    } catch (err) {
      alert(`Error deleting transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // End Shift Flow
  const handleConfirmEndShift = async () => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.endShift();
      }
      
      localStorage.removeItem('nss_shift_meta');
      localStorage.removeItem('nss_shift_transactions');
      
      setShiftMeta(null);
      setTransactions([]);
      setSetupDsmName('');
      setSetupShiftType('day');
      setUnlockExpiry(null);
      setShowResetModal(false);
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Error ending shift: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tab switching access lock control
  const handleTabChange = (tabId) => {
    if (tabId === 'settings') {
      const unlocked = unlockExpiry && Date.now() < unlockExpiry;
      if (shiftMeta && !unlocked) {
        // Enforce lock dialog check
        setPreviousTab(activeTab);
        setShowPinModal(true);
        setEnteredPin('');
        setPinError('');
        return;
      }
    }
    setActiveTab(tabId);
  };

  // PIN Unlock submit
  const handlePinUnlockSubmit = async (e) => {
    e.preventDefault();

    if (pinLockUntil && Date.now() < pinLockUntil) {
      return;
    }

    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.verifyPin(enteredPin);
        // Correct pin, unlock settings
        setUnlockExpiry(Date.now() + 5 * 60 * 1000);
        setPinAttempts(0);
        setPinError('');
        setShowPinModal(false);
        setActiveTab('settings');
      } else {
        // Local PIN check fallback
        if (enteredPin === ownerPin) {
          setUnlockExpiry(Date.now() + 5 * 60 * 1000);
          setPinAttempts(0);
          setPinError('');
          setShowPinModal(false);
          setActiveTab('settings');
        } else {
          throw new Error("Incorrect PIN");
        }
      }
    } catch (err) {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      setEnteredPin('');
      
      if (nextAttempts >= 3) {
        setPinLockUntil(Date.now() + 60 * 1000);
        setPinLockCountdown(60);
        setPinError('Too many failed attempts. Locked for 60 seconds.');
      } else {
        setPinError(`Incorrect PIN. ${3 - nextAttempts} attempt(s) remaining.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPinModal = () => {
    setShowPinModal(false);
    setActiveTab(previousTab);
  };

  // Handle Save Prices
  const handleSavePrices = async (newPrices) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.updatePrices(newPrices.ms, newPrices.hsd);
      }
      setPrices(newPrices);
      localStorage.setItem('nss_prices', JSON.stringify(newPrices));
    } catch (err) {
      alert(`Error saving prices: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Save PIN
  const handleSavePin = async (newPinVal) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.changePin(newPinVal);
      }
      setOwnerPin(newPinVal);
      localStorage.setItem('nss_owner_pin', JSON.stringify(newPinVal));
    } catch (err) {
      alert(`Error updating PIN: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── CONDITIONAL RENDER SCREEN SELECTION ──
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} />;
      case 'entry':
        return <Entry prices={prices} onAddTransaction={handleAddTransaction} />;
      case 'report':
        return (
          <Report
            transactions={transactions}
            dsmName={shiftMeta?.dsmName}
            shiftType={shiftMeta?.shiftType}
            startTime={startTimeVal}
            duration={duration}
          />
        );
      case 'history':
        return (
          <History
            transactions={transactions}
            onDeleteInitiate={handleInitiateDelete}
          />
        );
      case 'settings':
        return (
          <Settings
            prices={prices}
            onSavePrices={handleSavePrices}
            dsmName={shiftMeta?.dsmName}
            shiftType={shiftMeta?.shiftType}
            startTime={startTimeVal}
            onEndShiftInitiate={() => setShowResetModal(true)}
            onSavePin={handleSavePin}
          />
        );
      default:
        return <Dashboard transactions={transactions} />;
    }
  };

  // State 1: Setup screen before shift starts
  if (!shiftMeta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-[480px] mx-auto w-full relative">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-[20px]">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="setup-card bg-card border border-border rounded-[20px] p-7 w-full shadow-lg">
          <div className="text-center mb-1.5 select-none">
            <span className="text-[34px] font-black text-gold tracking-[3px]">NSS</span>
            <span className="text-[16px] text-sub font-normal"> FuelTrack</span>
          </div>
          <p className="text-center text-muted text-[13px] mb-6 mt-1">
            Start your shift to begin tracking
          </p>

          <div className="mb-4">
            <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-2">
              DSM Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={setupDsmName}
              onChange={(e) => setSetupDsmName(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg py-3 px-3.5 text-slate-200 text-[15px] outline-none focus:border-gold"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-bold tracking-[1px] uppercase text-sub mb-2">
              Shift Type
            </label>
            <div className="flex gap-2">
              {['day', 'night', 'morning'].map((type) => {
                const isSel = setupShiftType === type;
                const emoji = type === 'day' ? '☀️' : type === 'night' ? '🌙' : '🌅';
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSetupShiftType(type)}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold select-none capitalize transition-colors ${
                      isSel
                        ? 'bg-gold/13 border-gold text-gold font-bold'
                        : 'border-border bg-bg text-sub'
                    }`}
                  >
                    {emoji} {type}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={!setupDsmName.trim() || isLoading}
            onClick={handleStartShift}
            className="w-full py-3.5 rounded-xl border-none bg-gold text-black font-extrabold text-[17px] cursor-pointer disabled:opacity-40 transition-opacity"
          >
            Start Shift →
          </button>
        </div>
      </div>
    );
  }

  // State 2: Main App with Header, tabs, and modals
  return (
    <div className="flex flex-col min-h-screen max-w-[480px] mx-auto w-full relative pb-24">
      {/* Toast Restored Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[400px] bg-green border border-green-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg text-center text-xs animate-bounce select-none">
          {toastMessage}
        </div>
      )}

      {/* Server Offline Warning Banner */}
      {isServerOffline && (
        <div className="bg-yellow-500 text-black py-1 px-4 text-center text-[10px] font-bold z-[150] flex items-center justify-center gap-1 select-none">
          ⚠️ Running in Offline Backup mode (Cannot reach API server)
        </div>
      )}

      {/* Loading Overlay spinner */}
      {isLoading && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center select-none">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Sticky Header */}
      <Header
        dsmName={shiftMeta.dsmName}
        shiftType={shiftMeta.shiftType}
        startTime={startTimeVal}
        clock={clock}
        duration={duration}
        txnCount={transactions.length}
        totalCredit={totalCredit}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-[18px] px-[14px]">
        {renderScreen()}
      </div>

      {/* Bottom Nav tabs */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isSettingsUnlocked={isSettingsUnlocked}
        hasActiveShift={!!shiftMeta}
      />

      {/* ── MODAL 1: OWNER PIN PROMPT FOR SETTINGS ── */}
      {showPinModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[340px] shadow-2xl text-center">
            <div className="text-[28px] mb-2 select-none">🔒</div>
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-1">
              Enter Owner PIN
            </h3>
            <p className="text-muted text-xs mb-4">
              Owner PIN is required to access settings during an active shift.
            </p>

            <form onSubmit={handlePinUnlockSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                placeholder="4-digit PIN"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                disabled={!!pinLockUntil}
                className="w-full bg-bg border border-border rounded-lg py-2.5 text-center text-slate-200 font-extrabold text-[22px] tracking-[8px] outline-none focus:border-gold disabled:opacity-50"
              />

              {pinError && (
                <div className="text-xs text-red font-bold mt-1 leading-snug">
                  {pinError}
                </div>
              )}

              {pinLockUntil && (
                <div className="text-xs text-yellow-500 font-bold mt-1 bg-yellow-500/10 border border-yellow-500/20 py-1.5 px-3 rounded-lg">
                  🔒 Locked. Try again in {pinLockCountdown}s
                </div>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={handleCancelPinModal}
                  className="flex-1 py-2.5 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length < 4 || !!pinLockUntil}
                  className="flex-1 py-2.5 rounded-lg bg-gold text-black font-extrabold text-xs disabled:opacity-40"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DELETE TRANSACTION CONFIRMATION WITH REASON ── */}
      {showDeleteModal && txnToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[360px] shadow-2xl">
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-3 text-center">
              Delete Transaction?
            </h3>

            {/* Transaction summary card */}
            <div className="bg-bg border border-border rounded-xl p-3 text-xs flex flex-col gap-1.5 mb-4 select-text">
              <div className="flex justify-between font-bold">
                <span className="text-sub">Payment Mode:</span>
                <span className="text-slate-200">{txnToDelete.modeLabel}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Vehicle:</span>
                <span className="text-slate-200">{txnToDelete.vehicle}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Fuel & Liters:</span>
                <span className="text-slate-200">
                  {txnToDelete.fuelLabel} · {txnToDelete.liters.toFixed(2)}L
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Amount:</span>
                <span className="text-gold">{fmt(txnToDelete.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sub">Logged Time:</span>
                <span className="text-slate-400">{fmtTime(txnToDelete.timestamp)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-sub tracking-wider mb-2">
                Reason for Deletion (Mandatory)
              </label>
              <select
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg py-2.5 px-3 text-slate-200 text-xs font-semibold outline-none focus:border-gold"
              >
                <option value="">Select deletion reason...</option>
                <option value="Wrong amount entered">Wrong amount entered</option>
                <option value="Wrong payment mode">Wrong payment mode</option>
                <option value="Wrong vehicle type">Wrong vehicle type</option>
                <option value="Duplicate entry">Duplicate entry</option>
                <option value="Customer cancelled">Customer cancelled</option>
              </select>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTxnToDelete(null);
                  setDeletionReason('');
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deletionReason}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-lg bg-red text-white font-extrabold text-xs disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SHIFT RESET CONFIRMATION ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[340px] shadow-2xl text-center">
            <div className="text-[28px] mb-2 select-none">⚠️</div>
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-1">
              End shift for {shiftMeta.dsmName}?
            </h3>
            <p className="text-muted text-xs mb-4 leading-normal">
              This will clear all shift transactions from memory. Make sure the shift report has been shared first!
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndShift}
                className="flex-1 py-2.5 rounded-lg bg-red text-white font-extrabold text-xs"
              >
                Confirm End Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
