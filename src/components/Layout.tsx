import { ReactNode, useState } from 'react';
import {
  Film,
  Users,
  FileText,
  Image,
  PlayCircle,
  Settings,
  Sparkles,
  Clapperboard,
  Camera,
  Shield,
  Menu,
  X,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Logo } from './Logo';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Clapperboard },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
    { id: 'scripts', label: 'Scripts', icon: FileText },
    { id: 'storyboard-generator', label: 'Storyboards', icon: Camera },
    { id: 'assets', label: 'Asset Library', icon: Image },
    { id: 'episodes', label: 'Episodes', icon: Film },
    { id: 'profit-per-episode', label: 'Profit Per Episode', icon: TrendingUp },
    { id: 'production', label: 'Production', icon: PlayCircle },
    { id: 'backup-recovery', label: 'Backup & Recovery', icon: Shield },
  ];

  const handleNavigation = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex">
      <aside className="hidden lg:flex w-64 bg-white border-r border-blue-200 flex-col shadow-lg">
        <div className="p-8 border-b border-blue-200">
          <div className="flex flex-col gap-3">
            <Logo size="xlarge" className="mx-auto" />
            <div className="text-center">
              <p className="text-xs font-medium text-scripps-navy">Animation Studio</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id ||
              (item.id === 'storyboard-generator' && currentView === 'storyboard-viewer');

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-200">
          <button
            onClick={() => onNavigate('settings')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-blue-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-blue-50 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-scripps-navy" />
            </button>
            <Logo size="medium" />
            <div className="w-10" />
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside
              className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col lg:hidden transform transition-transform"
              style={{
                paddingLeft: 'env(safe-area-inset-left)',
                paddingTop: 'env(safe-area-inset-top)'
              }}
            >
              <div className="p-6 border-b border-blue-200 flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <Logo size="xlarge" />
                  <p className="text-xs font-medium text-scripps-navy">Animation Studio</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id ||
                    (item.id === 'storyboard-generator' && currentView === 'storyboard-viewer');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all min-h-[44px] ${
                        isActive
                          ? 'bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white shadow-md'
                          : 'text-gray-700 hover:bg-blue-50 active:bg-blue-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-blue-200" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => handleNavigation('settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 active:bg-blue-100 transition-all min-h-[44px]"
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Settings</span>
                </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
