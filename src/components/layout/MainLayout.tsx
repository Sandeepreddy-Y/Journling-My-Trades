import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * Main application layout shell.
 * Manages sidebar state (collapsed + mobile) and composes the full chrome.
 */
export default function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleMobileMenuOpen = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleMobileClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onToggle={handleToggleSidebar}
        onMobileClose={handleMobileClose}
      />
      <Topbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onMobileMenuOpen={handleMobileMenuOpen}
      />
      <main
        className="transition-all duration-300 p-4 sm:p-6 min-h-[calc(100vh-4rem)]"
        style={{
          marginLeft: window.innerWidth >= 1024 ? (isSidebarCollapsed ? '72px' : '260px') : '0px',
        }}
      >
        <div className="max-w-[1600px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
