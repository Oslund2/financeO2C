import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Save, RotateCcw, Sparkles, CheckCircle, Languages, Tv, DollarSign, Globe } from 'lucide-react';

interface CardItem {
  icon: string;
  text: string;
}

interface Card {
  title: string;
  icon: string;
  items: CardItem[];
}

interface IPSectionData {
  section_title: string;
  section_description_1: string;
  section_description_2: string;
  card_1: Card;
  card_2: Card;
  card_3: Card;
}

interface DashboardIPSectionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IPSectionData, applyToAllSeries: boolean) => Promise<void>;
  initialData: IPSectionData | null;
  currentSource: 'series' | 'organization' | 'default';
  seriesId: string | null;
}

const AVAILABLE_ICONS = [
  { name: 'CheckCircle', component: CheckCircle, label: 'Check Circle' },
  { name: 'Sparkles', component: Sparkles, label: 'Sparkles' },
  { name: 'Languages', component: Languages, label: 'Languages' },
  { name: 'Tv', component: Tv, label: 'TV' },
  { name: 'DollarSign', component: DollarSign, label: 'Dollar Sign' },
  { name: 'Globe', component: Globe, label: 'Globe' },
];

const DEFAULT_DATA: IPSectionData = {
  section_title: 'Leveraging Iconic IP for Global Entertainment',
  section_description_1: 'Leveraging the iconic Scripps National Spelling Bee brand, this animated series transforms historic winning words into hilarious, educational adventures all steeped in pop culture and Zeitgeist. The Bee and its animated series creates virtuous year-round brand and marketing opportunities.',
  section_description_2: 'This groundbreaking format blends new fictional characters with real-life Bee champions (secured via perpetual NIL) to expand our IP universe. Each 22-minute episode is thematically anchored by a specific winning word and designed for global scale across Scripps linear assets and streaming platforms.',
  card_1: {
    title: 'Production Format',
    icon: 'Tv',
    items: [
      { icon: 'CheckCircle', text: '22-minute runtime with optimized break structure' },
      { icon: 'CheckCircle', text: '3 internal 2-minute breaks plus 1 end 2-minute break' },
      { icon: 'CheckCircle', text: 'Thematically anchored by historic Spelling Bee winning words' },
    ],
  },
  card_2: {
    title: 'Dynamic Monetization',
    icon: 'DollarSign',
    items: [
      { icon: 'Sparkles', text: 'AI-driven product placement technology' },
      { icon: 'Sparkles', text: 'Swappable sponsors per market or airing' },
      { icon: 'Sparkles', text: 'Interchangeable branding opportunities for maximum revenue' },
    ],
  },
  card_3: {
    title: 'Global Scale',
    icon: 'Globe',
    items: [
      { icon: 'Languages', text: 'Automated localization for all languages' },
      { icon: 'Languages', text: 'Distribution across Scripps linear and streaming platforms' },
      { icon: 'Languages', text: 'Built for worldwide accessibility and cultural adaptation' },
    ],
  },
};

export function DashboardIPSectionEditor({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentSource,
  seriesId,
}: DashboardIPSectionEditorProps) {
  const [formData, setFormData] = useState<IPSectionData>(DEFAULT_DATA);
  const [applyToAllSeries, setApplyToAllSeries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'card1' | 'card2' | 'card3'>('main');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || DEFAULT_DATA);
      setApplyToAllSeries(false);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData, applyToAllSeries);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default content? This will discard all your changes.')) {
      setFormData(DEFAULT_DATA);
    }
  };

  const addCardItem = (cardKey: 'card_1' | 'card_2' | 'card_3') => {
    setFormData({
      ...formData,
      [cardKey]: {
        ...formData[cardKey],
        items: [...formData[cardKey].items, { icon: 'CheckCircle', text: '' }],
      },
    });
  };

  const removeCardItem = (cardKey: 'card_1' | 'card_2' | 'card_3', index: number) => {
    setFormData({
      ...formData,
      [cardKey]: {
        ...formData[cardKey],
        items: formData[cardKey].items.filter((_, i) => i !== index),
      },
    });
  };

  const updateCardItem = (cardKey: 'card_1' | 'card_2' | 'card_3', index: number, field: 'icon' | 'text', value: string) => {
    const items = [...formData[cardKey].items];
    items[index] = { ...items[index], [field]: value };
    setFormData({
      ...formData,
      [cardKey]: {
        ...formData[cardKey],
        items,
      },
    });
  };

  const getIconComponent = (iconName: string) => {
    const icon = AVAILABLE_ICONS.find(i => i.name === iconName);
    return icon?.component || CheckCircle;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Dashboard Content</h2>
            <p className="text-sm text-gray-600 mt-1">
              Customize the IP section for your {seriesId ? 'series' : 'workspace'}
              {currentSource !== 'default' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Currently using {currentSource} settings
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'main'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Main Section
          </button>
          <button
            onClick={() => setActiveTab('card1')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'card1'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Card 1
          </button>
          <button
            onClick={() => setActiveTab('card2')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'card2'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Card 2
          </button>
          <button
            onClick={() => setActiveTab('card3')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'card3'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Card 3
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'main' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={formData.section_title}
                  onChange={(e) => setFormData({ ...formData, section_title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter section title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description Paragraph 1
                </label>
                <textarea
                  value={formData.section_description_1}
                  onChange={(e) => setFormData({ ...formData, section_description_1: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter first description paragraph"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description Paragraph 2
                </label>
                <textarea
                  value={formData.section_description_2}
                  onChange={(e) => setFormData({ ...formData, section_description_2: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter second description paragraph"
                />
              </div>
            </div>
          )}

          {(activeTab === 'card1' || activeTab === 'card2' || activeTab === 'card3') && (
            <div className="space-y-6">
              {(() => {
                const cardKey = `card_${activeTab.slice(-1)}` as 'card_1' | 'card_2' | 'card_3';
                const card = formData[cardKey];
                const IconComponent = getIconComponent(card.icon);

                return (
                  <>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Card Title
                        </label>
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => setFormData({
                            ...formData,
                            [cardKey]: { ...card, title: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter card title"
                        />
                      </div>

                      <div className="w-48">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Card Icon
                        </label>
                        <div className="relative">
                          <select
                            value={card.icon}
                            onChange={(e) => setFormData({
                              ...formData,
                              [cardKey]: { ...card, icon: e.target.value }
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          >
                            {AVAILABLE_ICONS.map(icon => (
                              <option key={icon.name} value={icon.name}>
                                {icon.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <IconComponent className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-700">
                          Bullet Points
                        </label>
                        <button
                          onClick={() => addCardItem(cardKey)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </button>
                      </div>

                      <div className="space-y-3">
                        {card.items.map((item, index) => {
                          const ItemIcon = getIconComponent(item.icon);
                          return (
                            <div key={index} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                              <GripVertical className="w-5 h-5 text-gray-400 mt-2.5 flex-shrink-0" />

                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <select
                                    value={item.icon}
                                    onChange={(e) => updateCardItem(cardKey, index, 'icon', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  >
                                    {AVAILABLE_ICONS.map(icon => (
                                      <option key={icon.name} value={icon.name}>
                                        {icon.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="p-2 bg-white border border-gray-300 rounded-lg">
                                    <ItemIcon className="w-5 h-5 text-gray-600" />
                                  </div>
                                </div>

                                <textarea
                                  value={item.text}
                                  onChange={(e) => updateCardItem(cardKey, index, 'text', e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Enter bullet point text"
                                />
                              </div>

                              <button
                                onClick={() => removeCardItem(cardKey, index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          );
                        })}

                        {card.items.length === 0 && (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            No items yet. Click "Add Item" to create your first bullet point.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {seriesId && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllSeries}
                  onChange={(e) => setApplyToAllSeries(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Apply to all series in workspace</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Save these settings as the default for all series in your workspace
                  </div>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
