import React, { useState, useEffect } from 'react';
import { useClock } from './hooks/useClock';
import { fmtTime, fmt } from './constants';
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
import Audit from './screens/Audit';
import SplashScreen from './components/SplashScreen';
import PinModal from './components/PinModal';

// IndexedDB Imports
import {
  initDB,
  saveLocalConfig,
  getLocalConfig,
  saveLocalShift,
  getLocalShift,
  clearLocalShift,
  addLocalTransaction,
  getLocalTransactions,
  clearLocalTransactions,
  syncLocalTransactions,
  getPendingLocalTransactions,
  pruneOldLocalTransactions
} from './utils/indexedDb';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shiftMeta, setShiftMeta] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState({ ms: 102.50, hsd: 89.00 });
  const [ownerPin, setOwnerPin] = useState('0000');
  const [dsmLockCode, setDsmLockCode] = useState('1234');
  
  // Lock states
  const [isLocked, setIsLocked] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [lockError, setLockError] = useState('');
  
  // PIN verification modal for protected actions
  const [pinAction, setPinAction] = useState(null); // { type: 'settings'|'edit'|'delete', data: any, callback: function }
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(null);
  const [pinLockCountdown, setPinLockCountdown] = useState(0);

  const [isServerOffline, setIsServerOffline] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Setup form states (V2 Opening readings)
  const [setupDsmName, setSetupDsmName] = useState('');
  const [setupShiftType, setSetupShiftType] = useState('day');
  const [setupOpeningN1, setSetupOpeningN1] = useState('');
  const [setupOpeningN2, setSetupOpeningN2] = useState('');
  const [setupOpeningN3, setSetupOpeningN3] = useState('');
  const [setupOpeningN4, setSetupOpeningN4] = useState('');
  const [isOwnerVerified, setIsOwnerVerified] = useState(false);

  // OTP Verification States
  const [ownerEmail, setOwnerEmail] = useState('owner@example.com');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingShiftPayload, setPendingShiftPayload] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showSettingsOtpModal, setShowSettingsOtpModal] = useState(false);
  const [settingsOtpCode, setSettingsOtpCode] = useState('');
  const [settingsOtpError, setSettingsOtpError] = useState('');
  const [settingsOtpLoading, setSettingsOtpLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [txnToEdit, setTxnToEdit] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editLiters, setEditLiters] = useState('');
  const [editNozzle, setEditNozzle] = useState(1);
  const [editPaymentMode, setEditPaymentMode] = useState('cash');
  const [editCreditName, setEditCreditName] = useState('');
  const [editCreditPhone, setEditCreditPhone] = useState('');
  const [editCreditVehicle, setEditCreditVehicle] = useState('');

  // Soft Deletion Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Reset/End shift modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [closingN1, setClosingN1] = useState('');
  const [closingN2, setClosingN2] = useState('');
  const [closingN3, setClosingN3] = useState('');
  const [closingN4, setClosingN4] = useState('');

  // Live clock
  const startTimeVal = shiftMeta ? new Date(shiftMeta.startTime) : null;
  const { clock, duration } = useClock(startTimeVal);

  // Active transactions
  const activeTxns = transactions.filter((t) => !t.deleted);
  const totalCredit = activeTxns
    .filter((t) => t.paymentMode === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // ── BOOTSTRAP INITIALIZATION ──
  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      try {
        // 1. Initialize IndexedDB
        await initDB();
        
        // 2. Prune old local transactions (keep DB clean)
        await pruneOldLocalTransactions();

        // 3. Load configurations (Prices & PINs)
        let activePrices = { ms: 102.50, hsd: 89.00 };
        let activeOwnerPin = '0000';
        let activeDsmLock = '1234';

        try {
          const fetchedPrices = await api.fetchPrices();
          if (fetchedPrices) {
            activePrices = fetchedPrices;
            await saveLocalConfig('nss_prices', fetchedPrices);
          }
        } catch (e) {
          const cached = await getLocalConfig('nss_prices');
          if (cached) activePrices = cached;
          setIsServerOffline(true);
        }

        try {
          const fetchedPin = await api.fetchOwnerPin();
          if (fetchedPin) {
            activeOwnerPin = fetchedPin;
            await saveLocalConfig('nss_owner_pin', fetchedPin);
          }
        } catch (e) {
          const cached = await getLocalConfig('nss_owner_pin');
          if (cached) activeOwnerPin = cached;
        }

        let activeOwnerEmail = 'owner@example.com';
        try {
          const fetchedEmail = await api.fetchOwnerEmail();
          if (fetchedEmail) {
            activeOwnerEmail = fetchedEmail;
            await saveLocalConfig('nss_owner_email', fetchedEmail);
          }
        } catch (e) {
          const cached = await getLocalConfig('nss_owner_email');
          if (cached) activeOwnerEmail = cached;
        }
        setOwnerEmail(activeOwnerEmail);

        try {
          const fetchedLock = await api.fetchDsmLockCode();
          if (fetchedLock) {
            activeDsmLock = fetchedLock;
            await saveLocalConfig('nss_dsm_lock_code', fetchedLock);
          }
        } catch (e) {
          const cached = await getLocalConfig('nss_dsm_lock_code');
          if (cached) activeDsmLock = cached;
        }

        setPrices(activePrices);
        setOwnerPin(activeOwnerPin);
        setDsmLockCode(activeDsmLock);

        // 4. Load Active Shift from Server / IndexedDB fallback
        let currentShift = null;
        let currentTxns = [];

        try {
          const activeShift = await api.fetchActiveShift();
          if (activeShift) {
            currentShift = {
              id: activeShift.id,
              dsmName: activeShift.dsm_name,
              shiftType: activeShift.shift_type,
              startTime: activeShift.start_time,
              openingN1: activeShift.opening_n1 || 0,
              openingN2: activeShift.opening_n2 || 0,
              openingN3: activeShift.opening_n3 || 0,
              openingN4: activeShift.opening_n4 || 0,
            };
            currentTxns = activeShift.transactions || [];
            
            // Cache to IndexedDB
            await saveLocalShift(currentShift);
            await syncLocalTransactions(currentTxns);
          }
        } catch (err) {
          console.warn("Backend offline, loading active shift from IndexedDB...");
          setIsServerOffline(true);
          currentShift = await getLocalShift();
          if (currentShift) {
            currentTxns = await getLocalTransactions(currentShift.id);
          }
        }

        if (currentShift) {
          setShiftMeta(currentShift);
          setTransactions(currentTxns);
          setToastMessage("✅ Session synchronized successfully.");
        }
        
        // 5. Setup dynamic synchronization polling
        triggerSyncCycle();
      } catch (err) {
        console.error("Bootstrap failed", err);
        setToastMessage("❌ Initialization error. Please reload.");
      } finally {
        setIsLoading(false);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
    bootstrap();
  }, []);

  // ── KEYBOARD FOCUS NAVIGATION ON ENTER (TICK) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'INPUT') {
          e.preventDefault();
          
          // Find all editable inputs currently visible on screen
          const inputs = Array.from(document.querySelectorAll('input:not([readonly]):not([disabled]):not([type="hidden"])'))
            .filter(input => {
              // Only include inputs that are visible (width > 0, height > 0)
              return !!(input.offsetWidth || input.offsetHeight || input.getClientRects().length);
            });
          
          const index = inputs.indexOf(activeEl);
          if (index > -1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else {
            // Collapse keyboard on final input
            activeEl.blur();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync polling
  async function triggerSyncCycle() {
    setInterval(async () => {
      try {
        const syncedCount = await syncPendingLocalTransactions();
        if (syncedCount > 0) {
          setToastMessage(`⚡ Synced ${syncedCount} pending transaction(s) to cloud database.`);
          setTimeout(() => setToastMessage(null), 3000);
          setIsServerOffline(false);
          
          // Refresh lists from database
          if (shiftMeta) {
            const activeShift = await api.fetchActiveShift();
            if (activeShift) {
              setTransactions(activeShift.transactions || []);
              await syncLocalTransactions(activeShift.transactions || []);
            }
          }
        }
      } catch (e) {
        console.log("Background sync paused (Offline)");
        setIsServerOffline(true);
      }
    }, 30000);
  }

  // Sync pending local queue
  const syncPendingLocalTransactions = async () => {
    try {
      const pending = await getPendingLocalTransactions();
      if (pending.length === 0) return 0;
      
      let successCount = 0;
      for (const tx of pending) {
        try {
          if (tx.deleted) {
            await api.deleteTransaction(tx.id, tx.deletionReason);
          } else if (tx.edited) {
            await api.editTransaction(tx.id, tx);
          } else {
            await api.createTransaction(tx);
          }
          // Mark as synced in local DB
          tx.synced = true;
          await addLocalTransaction(tx);
          successCount++;
        } catch (err) {
          console.error(`Failed to sync transaction ${tx.id}:`, err);
        }
      }
      return successCount;
    } catch (e) {
      console.error("Sync process error:", e);
      return 0;
    }
  };

  // ── IDLE TIMER SCREEN LOCK ──
  useEffect(() => {
    if (!shiftMeta || isLocked) return;

    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      // 2 minutes = 120000 ms
      timeout = setTimeout(() => {
        setIsLocked(true);
        setShowLockModal(true);
      }, 120000);
    };

    // Listen to user interactions
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [shiftMeta, isLocked]);

  // Lock Countdown
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

  // Start Shift Setup - Directly Launch Shift (No longer requires OTP at this stage)
  const handleInitiateStartShift = async () => {
    if (!setupDsmName.trim()) return;
    setIsLoading(true);
    const localStart = new Date().toISOString();
    
    const opN1 = parseFloat(setupOpeningN1) || 0.0;
    const opN2 = parseFloat(setupOpeningN2) || 0.0;
    const opN3 = parseFloat(setupOpeningN3) || 0.0;
    const opN4 = parseFloat(setupOpeningN4) || 0.0;

    const shiftId = `shift_${setupDsmName.trim().toLowerCase().replace(/ /g, '_')}_${new Date(localStart).getTime()}`;

    const shiftPayload = {
      id: shiftId,
      dsmName: setupDsmName.trim(),
      shiftType: setupShiftType,
      startTime: localStart,
      openingN1: opN1,
      openingN2: opN2,
      openingN3: opN3,
      openingN4: opN4,
    };

    try {
      let newShift = shiftPayload;
      try {
        newShift = await api.startShift(shiftPayload);
      } catch (err) {
        console.warn("API startShift failed, using offline fallback");
        setIsServerOffline(true);
      }

      setShiftMeta(newShift);
      setTransactions([]);
      await saveLocalShift(newShift);
      await clearLocalTransactions();
      
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Error starting shift: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtpForLaunch = async () => {
    if (!setupDsmName.trim()) return;
    setIsLoading(true);
    setOtpError('');
    setOtpCode('');
    try {
      await api.sendEmailOtp(ownerEmail);
      setIsOtpSent(true);
      setToastMessage("⚡ OTP sent to owner's email.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.warn("Failed to send OTP email, falling back to mock input screen:", e);
      setIsOtpSent(true);
      setOtpError("⚠️ Network error sending OTP. If offline/mock mode, enter 111111.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpForLaunch = async (e) => {
    if (e) e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setOtpError("OTP code must be exactly 6 digits");
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      await api.verifyEmailOtp(ownerEmail, otpCode.trim());
      setIsOwnerVerified(true);
      setIsOtpSent(false);
      setOtpCode('');
      setToastMessage("✅ Owner OTP verified successfully.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setOtpError(`❌ Incorrect or expired OTP. Please try again. ${err.message}`);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveEmail = async (newEmail) => {
    try {
      await api.updateOwnerEmail(newEmail);
      setOwnerEmail(newEmail);
      await saveLocalConfig('nss_owner_email', newEmail);
      setToastMessage("✉️ Owner Email updated successfully.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert(`Error updating owner email: ${err.message}`);
    }
  };

  // Add Transaction (Online / Offline support)
  const handleAddTransaction = async (newTx) => {
    setIsLoading(true);
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const localTx = {
      ...newTx,
      id: txId,
      shiftId: shiftMeta.id,
      fuelLabel: newTx.fuelId === 'ms' ? 'MS (Petrol)' : 'HSD (Diesel)',
      modeLabel: newTx.paymentMode === 'credit' ? 'Credit' : newTx.paymentMode.toUpperCase(),
      timestamp: new Date().toISOString(),
      deleted: false,
      deletionReason: null,
      deletedAt: null,
      synced: false
    };

    try {
      // Save locally first
      await addLocalTransaction(localTx);
      setTransactions((prev) => [localTx, ...prev]);

      if (!isServerOffline) {
        try {
          const savedTx = await api.createTransaction(localTx);
          if (savedTx) {
            // Mark as synced
            localTx.synced = true;
            await addLocalTransaction(localTx);
            // Replace with server copy
            setTransactions((prev) => prev.map(t => t.id === localTx.id ? savedTx : t));
          }
        } catch (e) {
          console.warn("Transaction saved offline, will sync in background");
        }
      }
    } catch (err) {
      alert(`Error logging transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Guarded Delete Trigger (15 mins window check)
  const handleInitiateDelete = (txId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    const durationInMinutes = (Date.now() - new Date(tx.timestamp).getTime()) / 60000;

    if (durationInMinutes <= 15) {
      // Direct delete within 15 minutes self-correction window
      executeDelete(tx);
    } else {
      // Requires Owner PIN after 15 minutes
      setPinAction({
        type: 'delete',
        data: tx,
        callback: () => executeDelete(tx)
      });
      setEnteredPin('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const executeDelete = (tx) => {
    setTxnToDelete(tx);
    setDeletionReason('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!txnToDelete || !deletionReason) return;
    setIsLoading(true);
    
    const updatedTx = {
      ...txnToDelete,
      deleted: true,
      deletionReason: deletionReason,
      deletedAt: new Date().toISOString(),
      synced: false
    };

    try {
      await addLocalTransaction(updatedTx);
      
      setTransactions((prev) =>
        prev.map((t) => (t.id === txnToDelete.id ? updatedTx : t))
      );

      if (!isServerOffline) {
        try {
          await api.deleteTransaction(txnToDelete.id, deletionReason);
          updatedTx.synced = true;
          await addLocalTransaction(updatedTx);
        } catch (e) {
          console.warn("Delete pending sync");
        }
      }

      setShowDeleteModal(false);
      setTxnToDelete(null);
      setDeletionReason('');
    } catch (err) {
      alert(`Error deleting transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Guarded Edit Trigger (15 mins window check)
  const handleInitiateEdit = (txId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    const durationInMinutes = (Date.now() - new Date(tx.timestamp).getTime()) / 60000;

    if (durationInMinutes <= 15) {
      // Direct edit within 15 minutes self-correction window
      executeEdit(tx);
    } else {
      // Requires Owner PIN after 15 minutes
      setPinAction({
        type: 'edit',
        data: tx,
        callback: () => executeEdit(tx)
      });
      setEnteredPin('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const executeEdit = (tx) => {
    setTxnToEdit(tx);
    setEditAmount(tx.amount.toString());
    setEditLiters(tx.liters.toString());
    setEditNozzle(tx.nozzle || 1);
    setEditPaymentMode(tx.paymentMode);
    setEditCreditName(tx.creditName || '');
    setEditCreditPhone(tx.creditPhone || '');
    setEditCreditVehicle(tx.creditVehicle || '');
    setShowEditModal(true);
  };

  const handleConfirmEdit = async () => {
    if (!txnToEdit) return;
    setIsLoading(true);

    const amt = parseFloat(editAmount) || 0;
    const lit = parseFloat(editLiters) || 0;

    const updatedTx = {
      ...txnToEdit,
      amount: amt,
      liters: lit,
      nozzle: parseInt(editNozzle),
      paymentMode: editPaymentMode,
      modeLabel: editPaymentMode === 'credit' ? 'Credit' : editPaymentMode.toUpperCase(),
      creditName: editPaymentMode === 'credit' ? editCreditName : null,
      creditPhone: editPaymentMode === 'credit' ? editCreditPhone : null,
      creditVehicle: editPaymentMode === 'credit' ? editCreditVehicle : null,
      edited: true,
      editedAt: new Date().toISOString(),
      originalAmount: txnToEdit.edited ? txnToEdit.originalAmount : txnToEdit.amount,
      originalLiters: txnToEdit.edited ? txnToEdit.originalLiters : txnToEdit.liters,
      originalMode: txnToEdit.edited ? txnToEdit.originalMode : txnToEdit.paymentMode,
      synced: false
    };

    try {
      await addLocalTransaction(updatedTx);
      
      setTransactions((prev) =>
        prev.map((t) => (t.id === txnToEdit.id ? updatedTx : t))
      );

      if (!isServerOffline) {
        try {
          await api.editTransaction(txnToEdit.id, updatedTx);
          updatedTx.synced = true;
          await addLocalTransaction(updatedTx);
        } catch (e) {
          console.warn("Edit pending sync");
        }
      }

      setShowEditModal(false);
      setTxnToEdit(null);
    } catch (err) {
      alert(`Error editing transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // End Shift Flow with Closing Nozzles
  const handleConfirmEndShift = async () => {
    setIsLoading(true);
    const clN1 = parseFloat(closingN1) || 0;
    const clN2 = parseFloat(closingN2) || 0;
    const clN3 = parseFloat(closingN3) || 0;
    const clN4 = parseFloat(closingN4) || 0;

    try {
      if (!isServerOffline) {
        await api.updateClosingReadings(clN1, clN2, clN3, clN4);
        await api.endShift();
      }
      
      await clearLocalShift();
      await clearLocalTransactions();
      
      setShiftMeta(null);
      setTransactions([]);
      setSetupDsmName('');
      setSetupShiftType('day');
      setSetupOpeningN1('');
      setSetupOpeningN2('');
      setSetupOpeningN3('');
      setSetupOpeningN4('');
      setClosingN1('');
      setClosingN2('');
      setClosingN3('');
      setClosingN4('');
      setShowResetModal(false);
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Error ending shift: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tab Change Guard (Settings requires Owner Email OTP)
  const handleTabChange = async (tabId) => {
    if (tabId === 'settings') {
      setIsLoading(true);
      setSettingsOtpError('');
      setSettingsOtpCode('');
      try {
        await api.sendEmailOtp(ownerEmail);
        setShowSettingsOtpModal(true);
        setToastMessage("⚡ OTP sent to owner's email for settings access.");
        setTimeout(() => setToastMessage(null), 3000);
      } catch (e) {
        console.warn("Failed to send Settings access OTP, falling back to mock mode:", e);
        setShowSettingsOtpModal(true);
        setSettingsOtpError("⚠️ Network error sending OTP. If offline, enter 111111.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setActiveTab(tabId);
    }
  };

  const handleVerifySettingsOtp = async (e) => {
    if (e) e.preventDefault();
    if (settingsOtpCode.trim().length !== 6) {
      setSettingsOtpError("OTP code must be exactly 6 digits");
      return;
    }

    setSettingsOtpLoading(true);
    setSettingsOtpError('');

    try {
      await api.verifyEmailOtp(ownerEmail, settingsOtpCode.trim());
      setShowSettingsOtpModal(false);
      setSettingsOtpCode('');
      setActiveTab('settings');
    } catch (err) {
      setSettingsOtpError(`❌ Incorrect or expired OTP. ${err.message}`);
    } finally {
      setSettingsOtpLoading(false);
    }
  };

  const handleResendSettingsOtp = async () => {
    setSettingsOtpLoading(true);
    setSettingsOtpError('');
    try {
      await api.sendEmailOtp(ownerEmail);
      setToastMessage("⚡ Settings OTP resent successfully.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      setSettingsOtpError("Failed to resend Settings OTP code.");
    } finally {
      setSettingsOtpLoading(false);
    }
  };

  // PIN Submit Modal (Locked, verification against local Owner PIN)
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pinLockUntil && Date.now() < pinLockUntil) return;

    setIsLoading(true);
    try {
      let isCorrect = enteredPin === ownerPin;

      // Try server verification if online
      if (!isServerOffline) {
        try {
          await api.verifyPin(enteredPin);
          isCorrect = true;
        } catch (err) {
          isCorrect = false;
        }
      }

      if (isCorrect) {
        setPinAttempts(0);
        setPinError('');
        setShowPinModal(false);
        
        // Fire queued action callback
        if (pinAction && pinAction.callback) {
          pinAction.callback();
        }
        setPinAction(null);
      } else {
        throw new Error("Incorrect PIN");
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

  // Handle Screen Unlock (using lock code or owner pin)
  const handleScreenUnlock = (e) => {
    e.preventDefault();
    if (unlockPin === dsmLockCode || unlockPin === ownerPin) {
      setIsLocked(false);
      setShowLockModal(false);
      setUnlockPin('');
      setLockError('');
    } else {
      setLockError("Invalid passcode. Enter DSM code or Owner PIN.");
      setUnlockPin('');
    }
  };

  // Save configs
  const handleSavePrices = async (newPrices) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.updatePrices(newPrices.ms, newPrices.hsd);
      }
      setPrices(newPrices);
      await saveLocalConfig('nss_prices', newPrices);
    } catch (err) {
      alert(`Error saving prices: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePin = async (newPinVal) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.changePin(newPinVal);
      }
      setOwnerPin(newPinVal);
      await saveLocalConfig('nss_owner_pin', newPinVal);
    } catch (err) {
      alert(`Error updating PIN: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDsmLock = async (newLock) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.changeDsmLockCode(newLock);
      }
      setDsmLockCode(newLock);
      await saveLocalConfig('nss_dsm_lock_code', newLock);
    } catch (e) {
      alert(`Error saving DSM lock code: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuditSubmit = async ({ variance, totalSales, totalAccounted }) => {
    setIsLoading(true);
    try {
      if (!isServerOffline) {
        await api.endShift();
      }
      await clearLocalShift();
      await clearLocalTransactions();
      
      setShiftMeta(null);
      setTransactions([]);
      setSetupDsmName('');
      setSetupShiftType('day');
      setSetupOpeningN1('');
      setSetupOpeningN2('');
      setSetupOpeningN3('');
      setSetupOpeningN4('');
      setClosingN1('');
      setClosingN2('');
      setClosingN3('');
      setClosingN4('');
      setActiveTab('dashboard');
      alert(`Shift Audit submitted successfully! Variance: ₹${variance.toFixed(2)}`);
    } catch (err) {
      alert(`Error submitting shift audit: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── SCREEN RENDERER ──
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            transactions={transactions} 
            shiftMeta={shiftMeta} 
            onStartAudit={() => setActiveTab('audit')}
          />
        );
      case 'entry':
        return <Entry prices={prices} onAddTransaction={handleAddTransaction} />;
      case 'audit':
        return (
          <Audit 
            prices={prices} 
            activeShift={shiftMeta}
            onBack={() => setActiveTab('dashboard')} 
            onAuditSubmit={handleAuditSubmit}
          />
        );
      case 'report':
        return (
          <Report
            transactions={transactions}
            dsmName={shiftMeta?.dsmName}
            shiftType={shiftMeta?.shiftType}
            startTime={startTimeVal}
            duration={duration}
            openingN1={shiftMeta?.openingN1 || 0}
            openingN2={shiftMeta?.openingN2 || 0}
            openingN3={shiftMeta?.openingN3 || 0}
            openingN4={shiftMeta?.openingN4 || 0}
          />
        );
      case 'history':
        return (
          <History
            transactions={transactions}
            onDeleteInitiate={handleInitiateDelete}
            onEditInitiate={handleInitiateEdit}
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
            onEndShiftInitiate={() => {
              setClosingN1('');
              setClosingN2('');
              setClosingN3('');
              setClosingN4('');
              setShowResetModal(true);
            }}
            onSavePin={handleSavePin}
            dsmLockCode={dsmLockCode}
            onSaveDsmLock={handleSaveDsmLock}
            ownerEmail={ownerEmail}
            onSaveEmail={handleSaveEmail}
          />
        );
      default:
        return <Dashboard transactions={transactions} shiftMeta={shiftMeta} />;
    }
  };

  // ── STATE 1: SETUP SCREEN ──
  if (!shiftMeta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-[480px] mx-auto w-full relative bg-[#070d1a] font-sans">
        {isLoading && (
          <div className="fixed inset-0 z-[300] bg-black/75 flex items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-[#FFD100] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <div id="setup" className="w-full">
          <div className="setup-card bg-[#0b1329] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="setup-logo text-center mb-6">
              <span className="s1 text-4xl font-black text-[#FFD100] tracking-wider block">NSS</span>
              <span className="s2 text-xs font-bold text-slate-400 mt-1 block uppercase tracking-widest">FuelTrack · Shift Login</span>
            </div>

            {!isOwnerVerified ? (
              <div id="setup-step1" className="flex flex-col gap-4">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">DSM Full Name</span>
                  <input 
                    className="w-full bg-[#050b18] border border-slate-850 rounded-xl p-3 text-slate-200 text-sm font-bold outline-none focus:border-[#FFD100]" 
                    type="text" 
                    placeholder="Enter your full name"
                    value={setupDsmName}
                    onChange={(e) => setSetupDsmName(e.target.value)}
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Shift Type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['day', 'night', 'morning'].map((type) => {
                      const isSel = setupShiftType === type;
                      const emoji = type === 'day' ? '☀️' : type === 'night' ? '🌙' : '🌅';
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSetupShiftType(type)}
                          className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-1.5 active:scale-95 text-xs capitalize ${
                            isSel 
                              ? 'bg-[#1a1309] border-[#FFD100] text-[#FFD100] font-black shadow-lg shadow-[#FFD100]/5' 
                              : 'bg-[#050b18] border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {emoji} {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#001440] to-[#050b18] rounded-xl p-4 border border-[#FFD100]/20 mt-2 shadow-inner flex flex-col gap-3">
                  <div className="text-[11px] font-black text-[#FFD100] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>🔒</span> Owner OTP Approval Required
                  </div>
                  
                  {!isOtpSent ? (
                    <>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Shift launch requires Owner approval. Send a 6-digit OTP passcode to the owner's registered email: <br />
                        <span className="text-white font-bold">{ownerEmail}</span>
                      </p>
                      <button 
                        type="button"
                        className="w-full py-3 bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-md active:scale-95 transition-all"
                        disabled={!setupDsmName.trim() || isLoading}
                        onClick={handleSendOtpForLaunch}
                      >
                        ✉️ Send OTP to Owner
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Enter the 6-digit OTP sent to: <span className="text-slate-200 font-bold">{ownerEmail}</span>
                      </p>
                      
                      <input
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="\d*"
                        placeholder="6-digit OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        disabled={otpLoading}
                        className="w-full bg-[#040814] border border-[#FFD100]/20 rounded-xl py-2.5 text-center text-white font-extrabold text-[20px] tracking-[6px] outline-none focus:border-[#FFD100] disabled:opacity-50"
                      />

                      {otpError && (
                        <div className="text-[10px] text-red-500 font-bold leading-relaxed bg-red-950/20 border border-red-500/20 p-2 rounded-lg">
                          {otpError}
                        </div>
                      )}

                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setOtpCode('');
                            setOtpError('');
                          }}
                          disabled={otpLoading}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-350 font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyOtpForLaunch}
                          disabled={otpCode.trim().length < 6 || otpLoading}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD100] to-amber-500 text-[#001440] font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                        >
                          {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendOtpForLaunch}
                        disabled={otpLoading}
                        className="bg-transparent border-none text-[#FFD100] font-bold text-[9px] uppercase tracking-wider cursor-pointer hover:underline mt-1 text-center"
                      >
                        🔄 Resend OTP Code
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div id="setup-step2" className="flex flex-col gap-4">
                <div className="bg-green-950/20 border border-green-500/30 text-green-400 p-3 rounded-xl text-xs font-black flex items-center gap-1.5">
                  ✅ Owner Verified successfully
                </div>
                
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Enter Opening Totalizer Readings (VTOT)</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* HSD (Diesel) Nozzles */}
                    <div className="bg-[#09152e] border-2 border-blue-500/25 rounded-xl p-3 shadow-md">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider block mb-1">N1 HSD (Diesel)</span>
                      <input 
                        type="number" 
                        placeholder="Required" 
                        inputMode="decimal" 
                        value={setupOpeningN1} 
                        onChange={(e) => setSetupOpeningN1(e.target.value)} 
                        className="w-full bg-transparent border-none text-white text-lg font-black outline-none"
                      />
                    </div>
                    
                    <div className="bg-[#09152e] border-2 border-blue-500/25 rounded-xl p-3 shadow-md">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider block mb-1">N2 HSD (Diesel)</span>
                      <input 
                        type="number" 
                        placeholder="Required" 
                        inputMode="decimal" 
                        value={setupOpeningN2} 
                        onChange={(e) => setSetupOpeningN2(e.target.value)} 
                        className="w-full bg-transparent border-none text-white text-lg font-black outline-none"
                      />
                    </div>

                    {/* MS (Petrol) Nozzles */}
                    <div className="bg-[#1b1509] border-2 border-[#FFD100]/25 rounded-xl p-3 shadow-md">
                      <span className="text-[8px] font-black text-[#FFD100] uppercase tracking-wider block mb-1">N3 MS (Petrol)</span>
                      <input 
                        type="number" 
                        placeholder="Required" 
                        inputMode="decimal" 
                        value={setupOpeningN3} 
                        onChange={(e) => setSetupOpeningN3(e.target.value)} 
                        className="w-full bg-transparent border-none text-white text-lg font-black outline-none"
                      />
                    </div>
                    
                    <div className="bg-[#1b1509] border-2 border-[#FFD100]/25 rounded-xl p-3 shadow-md">
                      <span className="text-[8px] font-black text-[#FFD100] uppercase tracking-wider block mb-1">N4 MS (Petrol)</span>
                      <input 
                        type="number" 
                        placeholder="Required" 
                        inputMode="decimal" 
                        value={setupOpeningN4} 
                        onChange={(e) => setSetupOpeningN4(e.target.value)} 
                        className="w-full bg-transparent border-none text-white text-lg font-black outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  className="w-full py-4 bg-gradient-to-r from-[#FFD100] to-amber-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[#001440] font-black text-sm rounded-xl uppercase tracking-wider cursor-pointer mt-2 shadow-lg hover:shadow-amber-500/10 active:scale-[0.99] transition-all"
                  disabled={!setupOpeningN1 || !setupOpeningN2 || !setupOpeningN3 || !setupOpeningN4 || isLoading} 
                  onClick={handleInitiateStartShift}
                >
                  🚀 Start Shift →
                </button>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center flex flex-col gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Are you the owner?</span>
              <button 
                onClick={() => {
                  setPinAction({ type: 'ownerLogin' });
                  setShowPinModal(true);
                }} 
                className="w-full py-3 bg-[#1c1209] border border-[#FFD100]/40 text-[#FFD100] hover:bg-[#FFD100]/15 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
              >
                👑 Owner Direct Login
              </button>
            </div>
          </div>
        </div>

        <PinModal 
          isOpen={showPinModal && pinAction?.type === 'ownerLogin'}
          onClose={() => {
            setShowPinModal(false);
            setPinAction(null);
          }}
          onSuccess={() => {
            setShowPinModal(false);
            if (pinAction?.type === 'ownerLogin') {
              // Direct login logic - skip setup readings, auto-fill dummy shift for owner
              setShiftMeta({
                id: 'owner_session',
                dsmName: 'Owner Direct',
                shiftType: 'day',
                startTime: new Date().toISOString(),
                openingN1: 0, openingN2: 0, openingN3: 0, openingN4: 0
              });
            }
            setPinAction(null);
          }}
          expectedPin={ownerPin}
        />
      </div>
    );
  }

  // ── STATE 2: MAIN WORKSPACE ──
  const isAuditing = activeTab === 'audit';

  return (
    <div className={`flex flex-col min-h-screen max-w-[480px] mx-auto w-full relative bg-bg ${isAuditing ? '' : 'pb-20'}`}>
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[400px] bg-green-600 border border-green-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg text-center text-xs animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Server offline banner */}
      {isServerOffline && (
        <div className="bg-yellow-500 text-black py-0.5 px-4 text-center text-[10px] font-bold z-[150] flex items-center justify-center gap-1 select-none">
          ⚠️ Offline backup mode (Data stored in local browser database)
        </div>
      )}

      {/* Loading Spinner overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Sticky Header */}
      {!isAuditing && (
        <Header
          dsmName={shiftMeta.dsmName}
          shiftType={shiftMeta.shiftType}
          startTime={startTimeVal}
          clock={clock}
          duration={duration}
          txnCount={transactions.length}
          totalCredit={totalCredit}
        />
      )}

      {/* Tab Screens Content */}
      <div className={`flex-1 ${isAuditing ? 'p-0' : 'p-[14px]'}`}>
        {renderScreen()}
      </div>

      {/* Bottom navigation */}
      {!isAuditing && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isSettingsUnlocked={activeTab === 'settings'}
          hasActiveShift={!!shiftMeta}
        />
      )}

      {/* ── MODAL 1: OWNER PIN PROMPT ── */}
      {showPinModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[340px] shadow-2xl text-center">
            <div className="text-[28px] mb-2 select-none">🔒</div>
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-1">
              Enter Owner PIN
            </h3>
            <p className="text-muted text-xs mb-4">
              This action is protected. Enter Owner PIN to authenticate.
            </p>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                placeholder="4-digit PIN"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                disabled={!!pinLockUntil}
                className="w-full bg-bg border border-border rounded-lg py-2 text-center text-slate-200 font-extrabold text-[22px] tracking-[8px] outline-none focus:border-gold disabled:opacity-50"
              />

              {pinError && (
                <div className="text-xs text-red-500 font-bold mt-1">
                  {pinError}
                </div>
              )}

              {pinLockUntil && (
                <div className="text-xs text-yellow-500 font-bold mt-1 bg-yellow-500/10 border border-yellow-500/20 py-1.5 px-3 rounded-lg">
                  🔒 Try again in {pinLockCountdown}s
                </div>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinAction(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length < 4 || !!pinLockUntil}
                  className="flex-1 py-2 rounded-lg bg-gold text-black font-extrabold text-xs disabled:opacity-40"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SCREEN LOCKOUT (2 MINS IDLE) ── */}
      {showLockModal && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[340px] shadow-2xl text-center">
            <div className="text-[34px] mb-2 select-none">💤</div>
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-1">
              App Screen Locked
            </h3>
            <p className="text-muted text-xs mb-4">
              The screen was locked due to 2 minutes of idle inactivity.
            </p>

            <form onSubmit={handleScreenUnlock} className="flex flex-col gap-3">
              <input
                type="password"
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                placeholder="Passcode"
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg py-2 text-center text-slate-200 font-extrabold text-[22px] tracking-[8px] outline-none focus:border-gold"
              />

              {lockError && (
                <div className="text-xs text-red-500 font-bold mt-1">
                  {lockError}
                </div>
              )}

              <button
                type="submit"
                disabled={unlockPin.length < 4}
                className="w-full py-2.5 rounded-lg bg-gold text-black font-extrabold text-xs mt-2 disabled:opacity-40"
              >
                🔓 Unlock Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT TRANSACTION FORM ── */}
      {showEditModal && txnToEdit && (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-[360px] shadow-2xl">
            <h3 className="text-slate-200 font-extrabold text-[16px] mb-3 text-center">
              Edit Transaction Details
            </h3>
            
            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold text-sub uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-sub uppercase mb-1">Liters (L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editLiters}
                  onChange={(e) => setEditLiters(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-sub uppercase mb-1">Nozzle</label>
                <select
                  value={editNozzle}
                  onChange={(e) => setEditNozzle(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                >
                  <option value={1}>N1 - Diesel (HSD)</option>
                  <option value={2}>N2 - Diesel (HSD)</option>
                  <option value={3}>N3 - Petrol (MS)</option>
                  <option value={4}>N4 - Petrol (MS)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-sub uppercase mb-1">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="penlabs">Penlabs</option>
                  <option value="phonepay">PhonePe EDC</option>
                  <option value="credit">Credit Ledger</option>
                </select>
              </div>

              {editPaymentMode === 'credit' && (
                <div className="border-t border-border/40 pt-2 flex flex-col gap-2">
                  <label className="block text-[9px] font-bold text-gold uppercase text-center">Credit customer info</label>
                  <div>
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={editCreditName}
                      onChange={(e) => setEditCreditName(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={editCreditPhone}
                      onChange={(e) => setEditCreditPhone(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Vehicle Number"
                      value={editCreditVehicle}
                      onChange={(e) => setEditCreditVehicle(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs outline-none focus:border-gold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-4 border-t border-border/30 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setTxnToEdit(null);
                }}
                className="flex-1 py-2 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                className="flex-1 py-2 rounded-lg bg-gold text-black font-extrabold text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE TRANSACTION CONFIRMATION ── */}
      {showDeleteModal && txnToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 select-none">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-[360px] shadow-2xl">
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-3 text-center">
              Delete Transaction?
            </h3>

            <div className="bg-bg border border-border rounded-xl p-3 text-xs flex flex-col gap-1.5 mb-4 select-text">
              <div className="flex justify-between font-bold">
                <span className="text-sub">Payment:</span>
                <span className="text-slate-200">{txnToDelete.modeLabel}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Vehicle:</span>
                <span className="text-slate-200">{txnToDelete.vehicle}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Fuel & Vol:</span>
                <span className="text-slate-200">
                  {txnToDelete.fuelLabel} · {parseFloat(txnToDelete.liters).toFixed(2)}L
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sub">Amount:</span>
                <span className="text-gold">₹{parseFloat(txnToDelete.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-sub tracking-wider mb-2">
                Reason for Deletion (Required)
              </label>
              <select
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-slate-200 text-xs font-semibold outline-none focus:border-gold"
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
                className="flex-1 py-2 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deletionReason}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-extrabold text-xs disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: SHIFT END WITH CLOSING READINGS ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-5 select-none">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-[360px] shadow-2xl">
            <h3 className="text-slate-200 font-extrabold text-[17px] mb-1.5 text-center">
              End Active Shift
            </h3>
            <p className="text-muted text-center text-xs mb-4">
              Please enter final nozzle readings (closing totalizers) to settle calculations.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-sub font-bold mb-1">N1 Diesel (HSD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingN1}
                    onChange={(e) => setClosingN1(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg py-2 px-2 text-slate-200 text-xs outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-sub font-bold mb-1">N2 Diesel (HSD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingN2}
                    onChange={(e) => setClosingN2(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg py-2 px-2 text-slate-200 text-xs outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-sub font-bold mb-1">N3 Petrol (MS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingN3}
                    onChange={(e) => setClosingN3(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg py-2 px-2 text-slate-200 text-xs outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-sub font-bold mb-1">N4 Petrol (MS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingN4}
                    onChange={(e) => setClosingN4(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg py-2 px-2 text-slate-200 text-xs outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-lg bg-[#0f172a] border border-border text-sub font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndShift}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-extrabold text-xs"
              >
                Confirm End Shift
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL 6: SETTINGS EMAIL OTP VERIFICATION PROMPT ── */}
      {showSettingsOtpModal && (
        <div className="fixed inset-0 z-[250] bg-black/85 flex items-center justify-center p-6 select-none backdrop-blur-md">
          <div className="bg-[#0b1329] border-2 border-[#FFD100]/30 rounded-3xl p-6 w-full max-w-[360px] shadow-2xl text-center animate-popIn" style={{ animation: 'popIn 0.3s ease' }}>
            <div className="text-[28px] mb-2 select-none">🔑</div>
            <h3 className="text-[#FFD100] font-black text-lg mb-1 tracking-wide uppercase">
              Settings OTP Verification
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Enter the 6-digit Settings access OTP sent to the Owner email:<br />
              <b className="text-slate-200">{ownerEmail}</b>
            </p>

            <form onSubmit={handleVerifySettingsOtp} className="flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
                placeholder="6-digit OTP"
                value={settingsOtpCode}
                onChange={(e) => setSettingsOtpCode(e.target.value)}
                disabled={settingsOtpLoading}
                className="w-full bg-[#040814] border border-[#FFD100]/20 rounded-xl py-3 text-center text-white font-extrabold text-[24px] tracking-[6px] outline-none focus:border-[#FFD100] disabled:opacity-50"
              />

              {settingsOtpError && (
                <div className="text-xs text-red-500 font-bold mt-1 leading-relaxed bg-red-950/20 border border-red-500/20 p-2 rounded-lg">
                  {settingsOtpError}
                </div>
              )}

              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsOtpModal(false);
                    setSettingsOtpCode('');
                    setSettingsOtpError('');
                  }}
                  disabled={settingsOtpLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-800 border-none text-slate-350 font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsOtpCode.trim().length < 6 || settingsOtpLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFD100] to-amber-500 border-none text-[#001440] font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                >
                  {settingsOtpLoading ? 'Verifying...' : 'Verify & Access'}
                </button>
              </div>
              
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleResendSettingsOtp}
                  disabled={settingsOtpLoading}
                  className="bg-transparent border-none text-[#FFD100] font-extrabold text-[10px] uppercase tracking-wider cursor-pointer hover:underline"
                >
                  🔄 Resend OTP Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
