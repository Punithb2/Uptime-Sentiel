import { Suspense, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { RouteSkeleton } from './Skeletons';
import { useTheme } from './ThemeContext';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Monitors', href: '/monitors', icon: Server },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const prefetchRoute = {
    '/dashboard': () => import('../pages/Dashboard'),
    '/monitors': () => import('../pages/Monitors'),
    '/incidents': () => import('../pages/Incidents'),
    '/settings': () => import('../pages/Settings'),
  };

  // Heartbeat countdown for live telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setCountdown(15);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="h-screen w-screen overflow-hidden app-bg flex flex-col md:flex-row antialiased selection:bg-blue-500/20 selection:text-blue-400">
      {/* Mobile Top Navigation */}
      <header className="md:hidden sticky top-0 z-40 sidebar-bg border-b px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Activity className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">Sentinel</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={handleManualRefresh}
            title="Refresh All Telemetry"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button 
            type="button"
            onClick={toggleTheme} 
            className="rounded-lg p-2 text-slate-400 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-white" 
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="rounded-lg p-2 text-slate-400 hover:text-white"
            aria-label="Open menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-over Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden fade-enter"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Fixed Sidebar Navigation - Always pinned to the viewport height */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen sidebar-bg border-r flex flex-col transition-transform duration-300 ease-out md:static md:translate-x-0 shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-slate-900"></span>
              </span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">Sentinel</span>
              <p className="text-[11px] text-slate-400 tracking-wide">Uptime Monitor</p>
            </div>
          </Link>

          <button 
            type="button"
            onClick={toggleTheme} 
            className="hidden md:flex rounded-lg p-2 text-slate-400 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-white" 
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>
        </div>

        {/* Live Telemetry Heartbeat Pill */}
        <div className="px-4 pt-3.5 pb-2 shrink-0">
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-medium text-slate-300 text-xs">Live Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">{countdown}s</span>
              <button
                type="button"
                onClick={handleManualRefresh}
                title="Force refresh metrics"
                className="text-slate-400 hover:text-blue-400 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation Links - Scrollable if screen height is very small */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Menu</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onMouseEnter={prefetchRoute[item.href]}
                onFocus={prefetchRoute[item.href]}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active 
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]' 
                    : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.name}</span>
                </div>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pinned Bottom Footer with Sign Out - Always visible in viewport */}
        <div className="p-4 border-t border-white/5 mt-auto shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Independently scrolls within viewport */}
      <main className="flex-1 h-screen overflow-y-auto app-bg">
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
