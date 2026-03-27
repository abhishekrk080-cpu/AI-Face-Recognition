import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  UserPlus, 
  Camera, 
  LayoutDashboard, 
  Users, 
  Download, 
  Menu, 
  X, 
  Bell, 
  Moon, 
  Sun,
  ScanFace
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/attendance', label: 'Live Attendance', icon: Camera },
  { path: '/register', label: 'Register Student', icon: UserPlus },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/export', label: 'Export & Reports', icon: Download },
];

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const pageTitle = NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'FaceAttend AI';

  return (
    <div className="flex h-screen overflow-hidden bg-bg-dark text-text-primary">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-violet-500 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <ScanFace className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            FaceAttend AI
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group",
                  isActive 
                    ? "bg-primary-500/10 text-primary-400 font-medium" 
                    : "text-text-secondary hover:bg-white/5 hover:text-white"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full" />
                    )}
                    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary-500")} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="glass-card p-4 flex flex-col items-center justify-center text-center">
            <span className="text-sm text-text-secondary block mb-1">
              {format(currentTime, 'EEEE, MMM do')}
            </span>
            <span className="text-xl font-mono font-bold text-white tracking-wider">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        {/* Header */}
        <header className="h-20 px-6 flex items-center justify-between bg-surface/50 backdrop-blur-md border-b border-white/5 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-text-secondary hover:text-white md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-text-secondary hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full animate-pulse-glow"></span>
            </button>
            <button onClick={toggleTheme} className="p-2 text-text-secondary hover:text-white transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-violet-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-surface border-2 border-transparent overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
