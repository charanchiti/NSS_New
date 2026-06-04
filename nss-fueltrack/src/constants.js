export const MODES = [
  { id: 'cash',     label: 'Cash',         icon: '💵', color: '#22c55e' },
  { id: 'upi',      label: 'UPI',          icon: '📱', color: '#3b82f6' },
  { id: 'penlabs',  label: 'Penlabs',      icon: '💳', color: '#8b5cf6' },
  { id: 'phonepay', label: 'PhonePe EDC',  icon: '🏧', color: '#f97316' },
  { id: 'otp',      label: 'OTP/Unbarath', icon: '🪪', color: '#ec4899' },
  { id: 'credit',   label: 'Credit',       icon: '📋', color: '#ef4444' },
];

export const FUELS = [
  { id: 'ms',  label: 'MS (Petrol)' },
  { id: 'hsd', label: 'HSD (Diesel)' },
];

export const VEHICLES = ['Bike', 'Car', 'Auto', 'Lorry', 'Bus', 'Other'];

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
