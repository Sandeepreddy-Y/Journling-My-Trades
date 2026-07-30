import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  BarChart3,
  CalendarDays,
  Brain,
  Calculator,
  Settings,
  LogOut,
  TrendingUp,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/helpers';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Trades', path: '/trades', icon: LineChart },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Psychology', path: '/psychology', icon: Brain },
  { label: 'Risk Calculator', path: '/risk-calculator', icon: Calculator },
] as const;

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        onMobileClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen, onMobileClose]);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const sidebarContent = (
    <aside
      ref={sidebarRef}
      className={cn(
        'fixed left-0 top-0 z-50 h-screen flex flex-col',
        'bg-bg-secondary/95 backdrop-blur-xl border-r border-white/[0.06]',
        'transition-all duration-300 ease-in-out',
        // Desktop
        'max-lg:hidden',
        isCollapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse-glow" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-text-bright tracking-tight truncate animate-fade-in">
              TradeTrack<span className="text-gradient">Pro</span>
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-white/[0.04] transition-all duration-200',
            isCollapsed && 'mx-auto',
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          id="sidebar-collapse-btn"
        >
          {isCollapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <div
            key={path}
            className="relative"
            onMouseEnter={() => isCollapsed && setHoveredItem(path)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl transition-all duration-200 group relative',
                  isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(41,98,255,0.15)]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_8px_rgba(41,98,255,0.4)]" />
                  )}
                  <Icon className={cn('w-[20px] h-[20px] shrink-0', isActive && 'drop-shadow-[0_0_4px_rgba(41,98,255,0.4)]')} />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium truncate animate-fade-in">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>

            {/* Tooltip on collapsed hover */}
            {isCollapsed && hoveredItem === path && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-white/[0.08] text-xs font-medium text-text-primary whitespace-nowrap shadow-xl">
                  {label}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="py-3 px-2.5 border-t border-white/[0.06] space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl transition-all duration-200',
              isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
            )
          }
        >
          <Settings className="w-[20px] h-[20px] shrink-0" />
          {!isCollapsed && (
            <span className="text-[13px] font-medium truncate animate-fade-in">Settings</span>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
            isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5',
            'text-text-secondary hover:text-loss hover:bg-loss/8',
          )}
          id="logout-btn"
        >
          <LogOut className="w-[20px] h-[20px] shrink-0" />
          {!isCollapsed && (
            <span className="text-[13px] font-medium truncate animate-fade-in">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );

  // ── Mobile Sidebar ──
  const mobileSidebar = (
    <>
      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-[280px] flex flex-col lg:hidden',
          'bg-bg-secondary/98 backdrop-blur-xl border-r border-white/[0.06]',
          'transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-text-bright tracking-tight">
              TradeTrack<span className="text-gradient">Pro</span>
            </span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                  )}
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="py-3 px-3 border-t border-white/[0.06] space-y-1">
          <NavLink
            to="/settings"
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
              )
            }
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Settings</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-loss hover:bg-loss/8 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      {sidebarContent}
      {mobileSidebar}
    </>
  );
}
