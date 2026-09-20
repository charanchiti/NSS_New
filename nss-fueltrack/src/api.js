/**
 * NSS FuelTrack — Simple REST API Client
 * All calls go to VITE_API_URL (FastAPI backend).
 * No Supabase. No localStorage database.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== null) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail?.message || json.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  // Some endpoints return 204 No Content
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {

  // ── Config ─────────────────────────────────────────────────────

  /** @returns {{ diesel: number, ms: number }} */
  getFuelPrices: () => request('GET', '/api/config/fuel-prices'),

  /** @param {{ diesel: number, ms: number }} prices */
  updateFuelPrices: (prices) => request('PUT', '/api/config/fuel-prices', prices),

  /** @returns {Array<{ id, name, sort_order, active }>} */
  getLubricateProducts: () => request('GET', '/api/config/lubricates'),

  /** @param {{ name: string, sort_order?: number }} payload */
  addLubricateProduct: (payload) => request('POST', '/api/config/lubricates', payload),

  // ── Reports ────────────────────────────────────────────────────

  /**
   * Create a new daily report.
   * Throws a special error with existing_id if a report already exists for that date/pump.
   */
  createReport: (payload) => request('POST', '/api/reports', payload),

  /** @returns {Array<ReportSummary>} */
  listReports: (dateFrom = null, dateTo = null) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo)   params.set('date_to',   dateTo);
    const qs = params.toString() ? `?${params}` : '';
    return request('GET', `/api/reports${qs}`);
  },

  /** Get today's report for the active pump (null if not created yet) */
  getTodayReport: (pump = 1) => request('GET', `/api/reports/today?pump=${pump}`),

  /** @param {string} id */
  getReport: (id) => request('GET', `/api/reports/${id}`),

  /** @param {string} id @param {object} payload */
  updateReport: (id, payload) => request('PUT', `/api/reports/${id}`, payload),

  /** Trigger server-side recalculation */
  calculateReport: (id) => request('POST', `/api/reports/${id}/calculate`),

  /** Returns PDF download URL (use as href or fetch) */
  getPdfUrl: (id) => `${BASE_URL}/api/reports/${id}/pdf`,

  /** Download PDF as a blob and trigger browser download */
  downloadPdf: async (id, filename) => {
    const res = await fetch(`${BASE_URL}/api/reports/${id}/pdf`);
    if (!res.ok) throw new Error(`PDF generation failed: HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `NSS_Report_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
