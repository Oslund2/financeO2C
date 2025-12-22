import { useState } from 'react';
import {
  Shield,
  Copyright,
  Bookmark,
  FileText,
  TrendingUp,
  Globe,
  AlertCircle
} from 'lucide-react';
import { PatentApplication } from './PatentApplication';
import { CopyrightApplication } from './CopyrightApplication';
import { TrademarkApplication } from './TrademarkApplication';

type IPCategory = 'patents' | 'copyrights' | 'trademarks';

interface CategoryConfig {
  id: IPCategory;
  label: string;
  icon: typeof Shield;
  description: string;
  color: string;
  bgColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'patents',
    label: 'Patents',
    icon: FileText,
    description: 'Protect your inventions and innovations',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100'
  },
  {
    id: 'copyrights',
    label: 'Copyrights',
    icon: Copyright,
    description: 'Register scripts, characters, and creative works',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100'
  },
  {
    id: 'trademarks',
    label: 'Trademarks',
    icon: Bookmark,
    description: 'Protect character names and brand identities',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  }
];

export function IPProtection() {
  const [activeCategory, setActiveCategory] = useState<IPCategory>('copyrights');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-scripps-blue" />
            IP Protection
          </h1>
          <p className="text-gray-500 mt-1">
            Manage patents, copyrights, and trademarks for your creative works
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Comprehensive IP Portfolio</h2>
            <p className="text-gray-600 text-sm mt-1">
              Protect your animated series, characters, and creative content with patents for technology innovations,
              copyrights for scripts and artwork, and trademarks for character names and brand identities.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-gray-700">Patents</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <Copyright className="w-4 h-4 text-teal-600" />
              <span className="text-gray-700">Copyrights</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <Bookmark className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Trademarks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-4">
        {CATEGORIES.map(category => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
                isActive
                  ? `${category.bgColor.replace('hover:', '')} border-2 border-current shadow-sm ${category.color}`
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? category.color : 'text-gray-400'}`} />
              <div className="text-left">
                <span className={`font-semibold ${isActive ? category.color : 'text-gray-900'}`}>
                  {category.label}
                </span>
                <p className="text-xs text-gray-500 hidden sm:block">{category.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        {activeCategory === 'patents' && <PatentApplication />}
        {activeCategory === 'copyrights' && <CopyrightApplication />}
        {activeCategory === 'trademarks' && <TrademarkApplication />}
      </div>
    </div>
  );
}
