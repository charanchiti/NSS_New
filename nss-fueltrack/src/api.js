// Base API URL configuration
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper for error handling
async function handleResponse(res) {
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      errMsg = data.detail || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }
  
  // Return null/empty if no content, otherwise JSON
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

export const api = {
  // --- Security / Authentication ---
  async verifyPin(pin) {
    const res = await fetch(`${BASE_URL}/api/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return await handleResponse(res);
  },

  async changePin(pin) {
    const res = await fetch(`${BASE_URL}/api/auth/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return await handleResponse(res);
  },

  // --- Fuel Prices ---
  async fetchPrices() {
    const res = await fetch(`${BASE_URL}/api/prices`);
    return await handleResponse(res);
  },

  async updatePrices(ms, hsd) {
    const res = await fetch(`${BASE_URL}/api/prices`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ms, hsd })
    });
    return await handleResponse(res);
  },

  // --- Shifts ---
  async fetchActiveShift() {
    const res = await fetch(`${BASE_URL}/api/shift/active`);
    return await handleResponse(res);
  },

  async startShift(dsmName, shiftType, startTime) {
    const res = await fetch(`${BASE_URL}/api/shift/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dsmName,
        shiftType,
        startTime: new Date(startTime).toISOString()
      })
    });
    return await handleResponse(res);
  },

  async endShift() {
    const res = await fetch(`${BASE_URL}/api/shift/end`, {
      method: 'POST'
    });
    return await handleResponse(res);
  },

  // --- Transactions ---
  async createTransaction(txn) {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle: txn.vehicle,
        fuelId: txn.fuelId,
        liters: txn.liters,
        amount: txn.amount,
        note: txn.note || null,
        paymentMode: txn.paymentMode,
        rateUsed: txn.rateUsed,
        isOverride: txn.isOverride || false,
        overrideReason: txn.overrideReason || null
      })
    });
    return await handleResponse(res);
  },

  async deleteTransaction(txId, reason) {
    const res = await fetch(`${BASE_URL}/api/transactions/${txId}/delete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return await handleResponse(res);
  }
};
