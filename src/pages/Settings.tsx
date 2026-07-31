import { useState } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Download, FileText, User, Keyboard, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTrades } from '@/hooks';
import { exportTradesToCSV, exportTradesToPDF } from '@/lib/exportUtils';
import { AutoSyncSettings } from '@/components/sync/AutoSyncSettings';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { trades } = useTrades();
  const [activeTab, setActiveTab] = useState<'sync' | 'profile' | 'shortcuts'>('sync');

  const [displayName, setDisplayName] = useState(user?.displayName || 'Trader');
  const [email] = useState(user?.email || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ displayName });
    toast.success('Profile settings updated!');
  };

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <SettingsIcon className="w-3.5 h-3.5" /> Preferences & Account Configuration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Application & Profile Settings
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure MT5 Real-Time Auto Sync, manage your profile, theme mode, export trade data, and view keyboard shortcuts.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sync' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-bright'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> MT5 Auto Sync
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-bright'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Profile & Theme
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'shortcuts' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-bright'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" /> Shortcuts
          </button>
        </div>
      </div>

      {/* Tab 1: Real-Time MT5 Auto Sync */}
      {activeTab === 'sync' && <AutoSyncSettings />}

      {/* Tab 2: Profile & Theme */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <form onSubmit={handleSaveProfile} className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <User className="w-4 h-4 text-primary" /> Profile Settings
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-white/[0.02] border border-white/[0.06] text-text-muted text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Save Profile Changes
            </button>
          </form>

          {/* Theme & Display Options */}
          <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Sun className="w-4 h-4 text-warning" /> Appearance & Theme Mode
              </h2>

              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-text-bright block">Theme Mode</span>
                  <span className="text-[11px] text-text-muted">Currently active: {theme.toUpperCase()} mode</span>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright text-xs font-bold rounded-xl transition-all"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-primary" />}
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </button>
              </div>
            </div>

            {/* Export Trade Data */}
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Download className="w-4 h-4 text-profit" /> Export & Backup Data
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => exportTradesToCSV(trades)}
                  className="flex items-center justify-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] hover:border-profit/40 text-profit text-xs font-bold rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export to CSV / Excel
                </button>

                <button
                  type="button"
                  onClick={exportTradesToPDF}
                  className="flex items-center justify-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] hover:border-primary/40 text-primary text-xs font-bold rounded-xl transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Keyboard Shortcuts */}
      {activeTab === 'shortcuts' && (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Keyboard className="w-4 h-4 text-primary" /> Global Keyboard Shortcuts Reference
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Log New Trade</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + N</kbd>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Trading Dashboard</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + D</kbd>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Trades Journal Log</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + T</kbd>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Performance Analytics</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + A</kbd>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Prop Firm Dashboard</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + P</kbd>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-text-muted">Position Risk Calculator</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-primary font-mono font-bold text-[11px]">Shift + R</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
