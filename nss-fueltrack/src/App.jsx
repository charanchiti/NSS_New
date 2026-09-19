import React, { useState, useEffect } from 'react';
import { api } from './api';
import { today } from './constants';

// Components
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';

// Screens
import Dashboard from './screens/Dashboard';
import Entry from './screens/Entry';
import Report from './screens/Report';
import History from './screens/History';
import Settings from './screens/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);

  // Global state shared across screens
  const [todayReport, setTodayReport] = useState(null); // null | report object
  const [fuelPrices, setFuelPrices]   = useState({ diesel: 99.11, ms: 111.22 });
  const [lubricateProducts, setLubricateProducts] = useState([]);

  // Navigation context: when opening Report from History, store the report id
  const [viewReportId, setViewReportId] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Bootstrap ───────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const [prices, prods, rpt] = await Promise.all([
          api.getFuelPrices(),
          api.getLubricateProducts(),
          api.getTodayReport(),
        ]);
        if (prices) setFuelPrices(prices);
        if (prods)  setLubricateProducts(prods.map(p => p.name));
        setTodayReport(rpt || null);
      } catch (err) {
        console.error('Boot failed:', err);
        showToast('⚠️ Cannot connect to server. Is the backend running?', 'error');
      } finally {
        setTimeout(() => setShowSplash(false), 1200);
      }
    }
    boot();
  }, []);

  // ── Navigation helpers ──────────────────────────────────────────
  function navigateTo(tab, opts = {}) {
    if (opts.reportId) setViewReportId(opts.reportId);
    setActiveTab(tab);
  }

  // Called after a report is saved/updated
  async function refreshTodayReport() {
    try {
      const rpt = await api.getTodayReport();
      setTodayReport(rpt || null);
    } catch (_) {}
  }

  if (showSplash) return <SplashScreen />;

  const screenProps = {
    fuelPrices,
    lubricateProducts,
    todayReport,
    viewReportId,
    showToast,
    navigateTo,
    refreshTodayReport,
    setFuelPrices,
    setLubricateProducts,
  };

  return (
    <div className="min-h-screen bg-[#060d1f] text-white font-sans pb-20">

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#001040]/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFD100] flex items-center justify-center">
            <span className="text-[#001040] font-black text-sm">⛽</span>
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wide">NSS FuelTrack</div>
            <div className="text-[9px] text-slate-400 font-medium">Bharat Petroleum</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-[#FFD100]">PUMP 01</span>
          <span className="text-[9px] text-slate-400">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-[520px] mx-auto px-3 pt-4">
        {activeTab === 'dashboard' && <Dashboard {...screenProps} />}
        {activeTab === 'entry'     && <Entry     {...screenProps} />}
        {activeTab === 'report'    && <Report    {...screenProps} />}
        {activeTab === 'history'   && <History   {...screenProps} />}
        {activeTab === 'settings'  && <Settings  {...screenProps} />}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl transition-all
            ${toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-[#001040]'
              : 'bg-green-600 text-white'
            }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
