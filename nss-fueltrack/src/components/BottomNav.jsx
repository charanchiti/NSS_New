import React from 'react';

export default function BottomNav({
  activeTab,
  onTabChange,
  isSettingsUnlocked,
  hasActiveShift
}) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'entry', label: 'Entry', icon: '➕' },
    { id: 'report', label: 'Report', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div 
      id="bnav" 
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border flex z-[100]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isSettings = tab.id === 'settings';
        const showLock = isSettings && hasActiveShift && !isSettingsUnlocked;
        const showRedDot = isSettings && isSettingsUnlocked;

        if (tab.id === 'entry') {
          return (
            <div id="nb-entry" key={tab.id}>
              <button
                id="nb-entry-btn"
                onClick={() => onTabChange(tab.id)}
                className={isActive ? 'active-fab' : ''}
              >
                {tab.icon}
              </button>
              <span id="nb-entry-lbl">
                {tab.label}
              </span>
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nb ${isActive ? 'active' : ''} relative`}
          >
            <div className="relative text-[20px] flex items-center justify-center">
              {/* Main Tab Icon */}
              <span>{tab.icon}</span>

              {/* Settings Lock Overlay */}
              {showLock && (
                <span className="absolute -top-1 -right-2 text-[10px] bg-bg border border-border rounded-full p-0.5 shadow-md">
                  🔒
                </span>
              )}

              {/* Settings Unlocked Red Dot */}
              {showRedDot && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full animate-pulse" />
              )}
            </div>
            <span className="font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

