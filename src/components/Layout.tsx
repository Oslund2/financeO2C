import { ReactNode } from 'react';
import {
  LayoutDashboard,
  GitBranch,
  Calculator,
  BarChart3,
  Presentation,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export type View = 'dashboard' | 'workflow' | 'savings' | 'scenarios' | 'presentation' | 'data' | 'ai-demo';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard; description: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'O2C overview & metrics' },
  { view: 'workflow', label: 'Workflow Map', icon: GitBranch, description: 'Visual process editor' },
  { view: 'savings', label: 'Savings Calculator', icon: Calculator, description: 'ROI & time savings' },
  { view: 'scenarios', label: 'Scenario Modeler', icon: BarChart3, description: 'What-if analysis' },
  { view: 'presentation', label: 'Present', icon: Presentation, description: 'Finance meeting mode' },
  { view: 'data', label: 'Data Explorer', icon: Database, description: 'Snowflake data views' },
  { view: 'ai-demo', label: 'AI Demos', icon: Sparkles, description: 'Live automation demos' },
];

export function Layout({ currentView, onNavigate, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-white border-r border-surface-200 transition-all duration-300
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className={`flex items-center gap-3 p-4 border-b border-surface-200 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">O2C</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-surface-900 text-sm truncate">O2C Automation</h1>
              <p className="text-xs text-surface-500 truncate">Planning Tool</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ view, label, icon: Icon, description }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => { onNavigate(view); setMobileOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150 group
                  ${active
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="text-sm truncate">{label}</div>
                    {!active && <div className="text-xs text-surface-400 truncate">{description}</div>}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-surface-200 hidden lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-50 transition-colors text-sm"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-surface-200 bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-50"
          >
            <Menu className="w-5 h-5 text-surface-600" />
          </button>
          <h1 className="font-bold text-surface-900">O2C Automation Planner</h1>
        </div>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
