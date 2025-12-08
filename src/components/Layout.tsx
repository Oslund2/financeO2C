import { ReactNode } from 'react';
import {
  Film,
  Users,
  FileText,
  Image,
  PlayCircle,
  Settings,
  Sparkles,
  Clapperboard,
  Camera
} from 'lucide-react';
import { Logo } from './Logo';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Clapperboard },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'scripts', label: 'Scripts', icon: FileText },
    { id: 'storyboard-generator', label: 'Storyboards', icon: Camera },
    { id: 'assets', label: 'Asset Library', icon: Image },
    { id: 'episodes', label: 'Episodes', icon: Film },
    { id: 'production', label: 'Production', icon: PlayCircle },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex">
      <aside className="w-64 bg-white border-r border-blue-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-blue-200">
          <div className="flex flex-col gap-2">
            <Logo size="medium" className="mx-auto" />
            <div className="text-center">
              <p className="text-xs font-medium text-scripps-navy">Animation Studio</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
