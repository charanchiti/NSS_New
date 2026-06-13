import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback to local storage mock if Supabase environment variables are missing
const hasSupabase = !!(supabaseUrl && supabaseAnonKey);
if (!hasSupabase) {
  console.warn("⚠️ Supabase VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not configured. Falling back to local storage mock mode.");
}

const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const api = {
  // --- Security / PIN Config ---
  async fetchOwnerPin() {
    if (!supabase) {
      return localStorage.getItem('mock_owner_pin') || '0000';
    }
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'owner_pin')
        .maybeSingle();
      if (error) throw error;
      return data ? data.value : '0000';
    } catch (err) {
      console.error("Supabase fetchOwnerPin failed, falling back to local storage:", err);
      return localStorage.getItem('mock_owner_pin') || '0000';
    }
  },

  async verifyPin(pin) {
    const storedPin = await this.fetchOwnerPin();
    if (storedPin !== pin) throw new Error("Incorrect Owner PIN");
    return true;
  },

  async changePin(newPin) {
    if (!supabase) {
      localStorage.setItem('mock_owner_pin', newPin);
      return { message: "PIN updated locally" };
    }
    try {
      const { error } = await supabase
        .from('config')
        .upsert({ key: 'owner_pin', value: newPin });
      if (error) throw error;
      return { message: "PIN updated successfully" };
    } catch (err) {
      console.error("Supabase changePin failed:", err);
      throw err;
    }
  },

  async fetchOwnerEmail() {
    if (!supabase) {
      return localStorage.getItem('mock_owner_email') || 'owner@example.com';
    }
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'owner_email')
        .maybeSingle();
      if (error) throw error;
      return data ? data.value : 'owner@example.com';
    } catch (err) {
      console.error("Supabase fetchOwnerEmail failed, falling back to local storage:", err);
      return localStorage.getItem('mock_owner_email') || 'owner@example.com';
    }
  },

  async updateOwnerEmail(newEmail) {
    if (!supabase) {
      localStorage.setItem('mock_owner_email', newEmail);
      return { message: "Email updated locally" };
    }
    try {
      const { error } = await supabase
        .from('config')
        .upsert({ key: 'owner_email', value: newEmail });
      if (error) throw error;
      return { message: "Email updated successfully" };
    } catch (err) {
      console.error("Supabase updateOwnerEmail failed:", err);
      throw err;
    }
  },

  async sendEmailOtp(email) {
    if (!supabase) {
      console.log(`[Mock Mode] Sending mock OTP for email ${email}`);
      return { message: "Mock OTP sent" };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) throw error;
      return { message: "OTP sent successfully" };
    } catch (err) {
      console.error("Supabase sendEmailOtp failed:", err);
      throw err;
    }
  },

  async verifyEmailOtp(email, token) {
    if (!supabase) {
      console.log(`[Mock Mode] Verifying mock OTP ${token} for email ${email}`);
      if (token === '111111' || token.length === 6) {
        return { message: "Mock verification successful" };
      }
      throw new Error("Invalid mock OTP code (Must be 6 digits)");
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      });
      if (error) throw error;
      return { message: "Verification successful", session: data.session };
    } catch (err) {
      console.error("Supabase verifyEmailOtp failed:", err);
      throw err;
    }
  },

  async fetchDsmLockCode() {
    return localStorage.getItem('dsm_lock_code') || '1234';
  },

  async changeDsmLockCode(newCode) {
    localStorage.setItem('dsm_lock_code', newCode);
    return true;
  },

  // --- Fuel Prices ---
  async fetchPrices() {
    if (!supabase) {
      return {
        ms: parseFloat(localStorage.getItem('mock_price_ms')) || 102.50,
        hsd: parseFloat(localStorage.getItem('mock_price_hsd')) || 89.00
      };
    }
    try {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .in('key', ['ms_price', 'hsd_price']);
      if (error) throw error;
      
      const msRow = data?.find(r => r.key === 'ms_price');
      const hsdRow = data?.find(r => r.key === 'hsd_price');
      return {
        ms: msRow ? parseFloat(msRow.value) : 102.50,
        hsd: hsdRow ? parseFloat(hsdRow.value) : 89.00
      };
    } catch (err) {
      console.error("Supabase fetchPrices failed, falling back to local storage:", err);
      return {
        ms: parseFloat(localStorage.getItem('mock_price_ms')) || 102.50,
        hsd: parseFloat(localStorage.getItem('mock_price_hsd')) || 89.00
      };
    }
  },

  async updatePrices(ms, hsd) {
    if (!supabase) {
      localStorage.setItem('mock_price_ms', ms);
      localStorage.setItem('mock_price_hsd', hsd);
      return { ms, hsd };
    }
    try {
      const { error: msErr } = await supabase
        .from('config')
        .upsert({ key: 'ms_price', value: ms.toString() });
      const { error: hsdErr } = await supabase
        .from('config')
        .upsert({ key: 'hsd_price', value: hsd.toString() });
      if (msErr || hsdErr) throw msErr || hsdErr;
      return { ms, hsd };
    } catch (err) {
      console.error("Supabase updatePrices failed:", err);
      throw err;
    }
  },

  // --- Shift Actions ---
  async fetchActiveShift() {
    if (!supabase) {
      const cached = localStorage.getItem('mock_active_shift');
      if (!cached) return null;
      return JSON.parse(cached);
    }
    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('active', true)
        .maybeSingle();
      if (error || !shift) return null;
      
      // Load active shift's transactions and deductions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('shift_id', shift.id)
        .order('timestamp', { ascending: false });
      
      const { data: deductions } = await supabase
        .from('deductions')
        .select('*')
        .eq('shift_id', shift.id)
        .order('time', { ascending: false });
      
      return {
        id: shift.id,
        dsmName: shift.dsm_name,
        shiftType: shift.shift_type,
        startTime: shift.start_time,
        endTime: shift.end_time,
        active: shift.active,
        openingN1: shift.opening_n1,
        openingN2: shift.opening_n2,
        openingN3: shift.opening_n3,
        openingN4: shift.opening_n4,
        closingN1: shift.closing_n1,
        closingN2: shift.closing_n2,
        closingN3: shift.closing_n3,
        closingN4: shift.closing_n4,
        transactions: (txns || []).map(t => ({
          id: t.id,
          shiftId: t.shift_id,
          vehicle: t.vehicle,
          fuelId: t.fuel_id,
          fuelLabel: t.fuel_label,
          liters: t.liters,
          amount: t.amount,
          note: t.note,
          paymentMode: t.payment_mode,
          modeLabel: t.mode_label,
          rateUsed: t.rate_used,
          timestamp: t.timestamp,
          nozzle: t.nozzle,
          creditName: t.credit_name,
          creditPhone: t.credit_phone,
          creditVehicle: t.credit_vehicle,
          isOverride: t.is_override,
          overrideReason: t.override_reason,
          deleted: t.deleted,
          deletionReason: t.deletion_reason,
          deletedAt: t.deleted_at,
          edited: t.edited,
          editedAt: t.edited_at,
          editedBy: t.edited_by,
          editOtpRef: t.edit_otp_ref,
          originalAmount: t.original_amount,
          originalLiters: t.original_liters,
          originalMode: t.original_mode
        })),
        deductions: (deductions || []).map(d => ({
          id: d.id,
          shiftId: d.shift_id,
          type: d.type,
          amount: d.amount,
          note: d.note,
          time: d.time
        }))
      };
    } catch (err) {
      console.error("Supabase fetchActiveShift failed, falling back to local storage:", err);
      const cached = localStorage.getItem('mock_active_shift');
      if (!cached) return null;
      return JSON.parse(cached);
    }
  },

  async startShift(shift) {
    if (!supabase) {
      const shiftData = { ...shift, active: true };
      localStorage.setItem('mock_active_shift', JSON.stringify(shiftData));
      return shiftData;
    }
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          id: shift.id,
          dsm_name: shift.dsmName,
          shift_type: shift.shiftType,
          start_time: shift.startTime,
          active: true,
          opening_n1: shift.openingN1 || 0.0,
          opening_n2: shift.openingN2 || 0.0,
          opening_n3: shift.openingN3 || 0.0,
          opening_n4: shift.openingN4 || 0.0
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        dsmName: data.dsm_name,
        shiftType: data.shift_type,
        startTime: data.start_time,
        active: data.active,
        openingN1: data.opening_n1,
        openingN2: data.opening_n2,
        openingN3: data.opening_n3,
        openingN4: data.opening_n4
      };
    } catch (err) {
      console.error("Supabase startShift failed:", err);
      throw err;
    }
  },

  async updateClosingReadings(cl1, cl2, cl3, cl4) {
    if (!supabase) {
      const cached = localStorage.getItem('mock_active_shift');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.closingN1 = parseFloat(cl1);
        parsed.closingN2 = parseFloat(cl2);
        parsed.closingN3 = parseFloat(cl3);
        parsed.closingN4 = parseFloat(cl4);
        localStorage.setItem('mock_active_shift', JSON.stringify(parsed));
      }
      return { message: "Closing readings updated locally" };
    }
    try {
      const { data: shift, error: shiftErr } = await supabase
        .from('shifts')
        .select('id')
        .eq('active', true)
        .maybeSingle();
      if (shiftErr || !shift) throw new Error("No active shift found to update closing readings");
      
      const { error } = await supabase
        .from('shifts')
        .update({
          closing_n1: parseFloat(cl1) || 0.0,
          closing_n2: parseFloat(cl2) || 0.0,
          closing_n3: parseFloat(cl3) || 0.0,
          closing_n4: parseFloat(cl4) || 0.0
        })
        .eq('id', shift.id);
      if (error) throw error;
      return { message: "Closing readings updated successfully" };
    } catch (err) {
      console.error("Supabase updateClosingReadings failed:", err);
      throw err;
    }
  },

  async endShift() {
    if (!supabase) {
      const cached = localStorage.getItem('mock_active_shift');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.active = false;
        parsed.endTime = new Date().toISOString();
        localStorage.setItem('mock_active_shift', JSON.stringify(parsed));
      }
      return { message: "Shift ended locally" };
    }
    try {
      const { data: shift, error: shiftErr } = await supabase
        .from('shifts')
        .select('id')
        .eq('active', true)
        .maybeSingle();
      if (shiftErr || !shift) throw new Error("No active shift found to end");
      
      const { error } = await supabase
        .from('shifts')
        .update({
          active: false,
          end_time: new Date().toISOString()
        })
        .eq('id', shift.id);
      if (error) throw error;
      return { message: "Shift ended successfully" };
    } catch (err) {
      console.error("Supabase endShift failed:", err);
      throw err;
    }
  },

  // --- Transactions ---
  async createTransaction(txn) {
    if (!supabase) return txn;
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          id: txn.id,
          shift_id: txn.shiftId,
          vehicle: txn.vehicle,
          fuel_id: txn.fuelId,
          fuel_label: txn.fuelLabel,
          liters: parseFloat(txn.liters),
          amount: parseFloat(txn.amount),
          note: txn.note,
          payment_mode: txn.paymentMode,
          mode_label: txn.modeLabel,
          rate_used: parseFloat(txn.rateUsed),
          timestamp: txn.timestamp,
          nozzle: txn.nozzle || 1,
          credit_name: txn.creditName,
          credit_phone: txn.creditPhone,
          credit_vehicle: txn.creditVehicle,
          is_override: txn.isOverride || false,
          override_reason: txn.overrideReason,
          deleted: false
        });
      if (error) throw error;
      return txn;
    } catch (err) {
      console.error("Supabase createTransaction failed:", err);
      throw err;
    }
  },

  async editTransaction(txId, txn) {
    if (!supabase) return txn;
    try {
      const { data: existing, error: getErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .maybeSingle();
      if (getErr) throw getErr;

      const updatePayload = {
        amount: txn.amount !== undefined ? parseFloat(txn.amount) : undefined,
        liters: txn.liters !== undefined ? parseFloat(txn.liters) : undefined,
        nozzle: txn.nozzle !== undefined ? parseInt(txn.nozzle) : undefined,
        payment_mode: txn.paymentMode,
        mode_label: txn.paymentMode ? (txn.paymentMode === 'credit' ? 'Credit' : txn.paymentMode.toUpperCase()) : undefined,
        credit_name: txn.creditName,
        credit_phone: txn.creditPhone,
        edited: true,
        edited_at: new Date().toISOString(),
        edited_by: txn.editedBy || 'Admin',
        edit_otp_ref: txn.otpRef || ''
      };

      if (existing && !existing.edited) {
        updatePayload.original_amount = existing.amount;
        updatePayload.original_liters = existing.liters;
        updatePayload.original_mode = existing.payment_mode;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', txId);
      if (error) throw error;
      return txn;
    } catch (err) {
      console.error("Supabase editTransaction failed:", err);
      throw err;
    }
  },

  async deleteTransaction(txId, reason) {
    if (!supabase) return { message: "Deleted locally" };
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          deleted: true,
          deletion_reason: reason,
          deleted_at: new Date().toISOString()
        })
        .eq('id', txId);
      if (error) throw error;
      return { message: "Transaction deleted successfully" };
    } catch (err) {
      console.error("Supabase deleteTransaction failed:", err);
      throw err;
    }
  },

  // --- Credit Customers Lookup ---
  async fetchCreditCustomers() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('credit_name')
        .not('credit_name', 'is', null);
      if (error) throw error;
      
      const names = Array.from(new Set(data.map(t => t.credit_name).filter(Boolean)));
      return names.map(n => ({ name: n }));
    } catch (err) {
      console.error("Supabase fetchCreditCustomers failed:", err);
      return [];
    }
  }
};
