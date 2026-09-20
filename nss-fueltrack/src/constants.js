// ── Collection Categories ────────────────────────────────────────────

export const COLLECTION_CATEGORIES = [
  { id: 'cash',             label: 'Cash' },
  { id: 'phonepay',         label: 'Phone Pay' },
  { id: 'pinelabs',         label: 'Pine Labs' },
  { id: 'cms_otp',          label: 'CMS OTP' },
  { id: 'pcr_otp',          label: 'P.Cr OTP' },
  { id: 'dcr_otp',          label: 'D.Cr OTP' },
  { id: 'credit',           label: 'Credit' },
  { id: 'phonepay_edc',     label: 'Phone Pay EDC' },
  { id: 'expenses',         label: 'Expenses' },
  { id: 'non_pump_expenses',label: 'Non Pump Expenses' },
  { id: 'discount',         label: 'Discount' },
  { id: 'lubricates',       label: 'Lubricates' },
  { id: 'testing',          label: 'Testing' },
];

// Income vs deduction classification (matches backend)
export const INCOME_CATEGORIES   = new Set(['cash','phonepay','pinelabs','cms_otp','pcr_otp','dcr_otp','credit','phonepay_edc']);
export const DEDUCTION_CATEGORIES = new Set(['expenses','non_pump_expenses','discount','lubricates']);

// ── Nozzle Config ────────────────────────────────────────────────────

export const NOZZLES = [
  { nozzle_number: 1, label: 'Nozzle 1', fuel_type: 'diesel', fuel_label: 'Diesel' },
  { nozzle_number: 2, label: 'Nozzle 2', fuel_type: 'diesel', fuel_label: 'Diesel' },
  { nozzle_number: 3, label: 'Nozzle 3', fuel_type: 'ms',     fuel_label: 'Motor Spirit' },
  { nozzle_number: 4, label: 'Nozzle 4', fuel_type: 'ms',     fuel_label: 'Motor Spirit' },
];

export const MAX_PUMPS = 3;

// ── Formatters ───────────────────────────────────────────────────────

export function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtNum(n, decimals = 2) {
  return Number(n || 0).toFixed(decimals);
}

export function today() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateLong(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : new Date(d);
  return dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
