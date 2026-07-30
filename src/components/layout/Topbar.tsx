import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/helpers';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onMobileMenuOpen: () => void;
}

/** Sample notifications — will come from API later */
const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Daily drawdown alert', desc: 'FTMO account approaching 4% limit', time: '2m ago', unread: true, type: 'warning' as const },
  { id: '2', title: 'Trade logged', desc: 'EUR/USD Long +$124.50', time: '1h ago', unread: true, type: 'success' as const },
  { id: '3', title: 'Weekly report ready', desc: 'Your performance summary is available', time: '3h ago', unread: false, type: 'info' as const },
];

export default function Topbar({ isSidebarCollapsed, onToggleSidebar, onMobileMenuOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6',
        'bg-bg-secondary/80 backdrop-blur-xl border-b border-white/[0.06]',
        'transition-all duration-300',
      )}
      style={{
        marginLeft: window.innerWidth >= 1024 ? (isSidebarCollapsed ? '72px' : '260px') : '0px',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuOpen}
          className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors lg:hidden"
          aria-label="Open menu"
          id="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          aria-label="Toggle sidebar"
          id="sidebar-toggle"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search trades, symbols..."
            className="w-64 lg:w-80 h-9 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.08)] transition-all duration-200"
            id="global-search"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-text-muted bg-white/[0.04] border border-white/[0.06]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-2">

        {/* ── Notification Bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className={cn(
              'relative p-2.5 rounded-xl transition-all duration-200',
              isNotifOpen
                ? 'bg-white/[0.06] text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
            )}
            aria-label="Notifications"
            id="notifications-btn"
          >
            <Bell className="w-[20px] h-[20px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-loss text-[10px] font-bold text-white shadow-[0_0_6px_rgba(239,83,80,0.4)]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-bg-card/98 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden animate-slide-up z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-text-bright">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-white/[0.03] last:border-0',
                      notif.unread && 'bg-primary/[0.03]',
                    )}
                  >
                    {/* Dot */}
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      notif.type === 'warning' && 'bg-warning',
                      notif.type === 'success' && 'bg-profit',
                      notif.type === 'info' && 'bg-primary',
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary leading-tight">{notif.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{notif.desc}</p>
                      <p className="text-[11px] text-text-muted mt-1">{notif.time}</p>
                    </div>
                    {notif.unread && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <button className="w-full text-center text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-7 w-px bg-white/[0.06] mx-1 hidden sm:block" />

        {/* ── Profile Menu ── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
            className={cn(
              'flex items-center gap-2.5 pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl transition-all duration-200',
              isProfileOpen
                ? 'bg-white/[0.06]'
                : 'hover:bg-white/[0.04]',
            )}
            id="user-menu-btn"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white/[0.08]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-white/[0.06]">
                {user ? getInitials(user.displayName) : 'TT'}
              </div>
            )}
            <div className="hidden md:block text-left max-w-[120px]">
              <p className="text-sm font-medium text-text-primary leading-tight truncate">
                {user?.displayName || 'Trader'}
              </p>
              <p className="text-[11px] text-text-muted leading-tight truncate">
                {user?.email || 'trader@email.com'}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-text-muted transition-transform duration-200 hidden sm:block',
              isProfileOpen && 'rotate-180',
            )} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-bg-card/98 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden animate-slide-up z-50">
              {/* User info */}
              <div className="px-4 py-3.5 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-text-bright truncate">
                  {user?.displayName || 'Trader'}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {user?.email || 'trader@email.com'}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                {[
                  { icon: User, label: 'My Profile', action: () => { navigate('/settings'); setIsProfileOpen(false); } },
                  { icon: Settings, label: 'Settings', action: () => { navigate('/settings'); setIsProfileOpen(false); } },
                  { icon: HelpCircle, label: 'Help & Support', action: () => setIsProfileOpen(false) },
                ].map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="py-1.5 border-t border-white/[0.06]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-loss/80 hover:text-loss hover:bg-loss/8 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
