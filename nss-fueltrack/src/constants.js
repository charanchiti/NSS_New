// V2 Payment Modes (matching prototype)
export const MODES = [
  { id: 'cash',     label: 'Cash',         icon: '💵', color: '#22c55e' },
  { id: 'upi',      label: 'UPI',          icon: '📱', color: '#3b82f6' },
  { id: 'penlabs',  label: 'Penlabs',      icon: '💳', color: '#8b5cf6' },
  { id: 'phonepay', label: 'PhonePe EDC',  icon: '🏧', color: '#f97316' },
  { id: 'otp',      label: 'OTP/Unbarath', icon: '🪪', color: '#ec4899' },
  { id: 'credit',   label: 'Credit',       icon: '📋', color: '#ef4444' },
  { id: 'testing',  label: 'Testing',      icon: '🧪', color: '#64748b' },
];

export const FUELS = [
  { id: 'ms',  label: 'MS (Petrol)' },
  { id: 'hsd', label: 'HSD (Diesel)' },
];

export const VEHICLES = ['Bike', 'Car', 'Auto', 'Lorry', 'Bus', 'Other'];

// V2: Nozzle definitions matching prototype (N1/N2 = HSD, N3/N4 = MS)
export const NOZZLES = [
  { id: 1, label: 'Diesel 1', fuel: 'hsd' },
  { id: 2, label: 'Diesel 2', fuel: 'hsd' },
  { id: 3, label: 'Petrol 1', fuel: 'ms' },
  { id: 4, label: 'Petrol 2', fuel: 'ms' },
];

// V2: Quick amount presets for Turbo Mode
export const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000];

// Format as Indian Rupee with commas
export function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Format time as "02:45 PM"
export function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// Format duration from ms
export function fmtDuration(startTime) {
  if (!startTime) return '—';
  const ms = new Date() - new Date(startTime);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h + 'h ' + m + 'm';
}

// V2: Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// V2: Get nozzle info by id
export function getNozzle(nozzleId) {
  return NOZZLES.find(n => n.id === nozzleId) || NOZZLES[0];
}

// V2: Get fuel type for a nozzle
export function getNozzleFuel(nozzleId) {
  const nozzle = getNozzle(nozzleId);
  return nozzle.fuel;
}
