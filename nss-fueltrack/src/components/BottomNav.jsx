import React from 'react';

const TABS = [
  { id: 'dashboard', icon: '🏠', label: 'Home' },
  { id: 'entry',     icon: '📝', label: 'New Entry' },
  { id: 'report',    icon: '📊', label: 'Report' },
  { id: 'history',   icon: '📋', label: 'History' },
  { id: 'settings',  icon: '⚙️',  label: 'Settings' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#001040]/97 backdrop-blur border-t border-slate-800 flex items-stretch">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all
              ${isActive ? 'text-[#FFD100]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {/* Active indicator bar */}
            <span className={`block h-0.5 w-6 rounded-full mb-1 transition-all ${isActive ? 'bg-[#FFD100]' : 'bg-transparent'}`} />
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className={`text-[9px] font-bold leading-none mt-0.5 ${isActive ? 'text-[#FFD100]' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
