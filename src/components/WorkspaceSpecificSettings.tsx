import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useWorkspaceCapabilities } from '../hooks/useWorkspaceCapabilities';
import { ClaymationSettings } from './ClaymationSettings';
import { PhotorealSettings } from './PhotorealSettings';
import { DocumentarySettings } from './DocumentarySettings';
import { CommercialSettings } from './CommercialSettings';

interface WorkspaceSpecificSettingsProps {
  expanded: boolean;
  onToggle: () => void;
}

export function WorkspaceSpecificSettings({ expanded, onToggle }: WorkspaceSpecificSettingsProps) {
  const { workspaceType, displayName, description, primaryColor } = useWorkspaceCapabilities();

  if (workspaceType === 'general' || !workspaceType) {
    return null;
  }

  const getGradientColors = () => {
    switch (workspaceType) {
      case 'claymation':
        return 'from-pink-500 to-rose-600';
      case 'photoreal':
        return 'from-blue-500 to-cyan-600';
      case 'documentary':
        return 'from-emerald-500 to-teal-600';
      case 'commercial':
        return 'from-amber-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getGradientColors()} rounded-lg flex items-center justify-center`}>
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">{displayName} Workspace Settings</h2>
            <p className="text-sm text-gray-600">{description || `Configure ${displayName.toLowerCase()}-specific settings and preferences`}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-6 h-6 text-gray-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {workspaceType === 'claymation' && <ClaymationSettings />}
          {workspaceType === 'photoreal' && <PhotorealSettings />}
          {workspaceType === 'documentary' && <DocumentarySettings />}
          {workspaceType === 'commercial' && <CommercialSettings />}
        </div>
      )}
    </div>
  );
}
