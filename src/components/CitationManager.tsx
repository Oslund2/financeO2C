import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Download,
  Search,
  ExternalLink,
  CheckCircle,
  GraduationCap,
  Newspaper,
  FileText,
  Archive,
  Landmark,
  Mic,
  Film,
  Globe,
  Scroll,
  AlertCircle,
} from 'lucide-react';
import {
  citationService,
  Citation,
  CitationSourceType,
  CreateCitationInput,
} from '../services/citationService';

interface CitationManagerProps {
  scriptId: string;
  organizationId?: string;
  readonly?: boolean;
  onCitationCountChange?: (count: number) => void;
}

const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  book: BookOpen,
  journal: GraduationCap,
  article: Newspaper,
  newspaper: FileText,
  archive: Archive,
  government_record: Landmark,
  interview: Mic,
  documentary: Film,
  website: Globe,
  primary_document: Scroll,
};

export default function CitationManager({
  scriptId,
  organizationId,
  readonly = false,
  onCitationCountChange,
}: CitationManagerProps) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sourceTypes, setSourceTypes] = useState<CitationSourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CreateCitationInput>>({
    source_name: '',
    source_type: 'book',
    citation_text: '',
    reference_context: '',
    is_primary_source: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [citationsData, typesData] = await Promise.all([
        citationService.getScriptCitations(scriptId),
        citationService.getCitationSourceTypes(),
      ]);
      setCitations(citationsData);
      setSourceTypes(typesData);
      onCitationCountChange?.(citationsData.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load citations');
    } finally {
      setLoading(false);
    }
  }, [scriptId, onCitationCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source_name || !formData.citation_text) return;

    try {
      if (editingId) {
        await citationService.updateCitation(editingId, {
          source_name: formData.source_name,
          source_type: formData.source_type,
          citation_text: formData.citation_text,
          url: formData.url,
          page_number: formData.page_number,
          accessed_date: formData.accessed_date,
          reference_context: formData.reference_context,
          is_primary_source: formData.is_primary_source,
          author: formData.author,
          publication_date: formData.publication_date,
          publisher: formData.publisher,
        });
      } else {
        await citationService.createCitation({
          script_id: scriptId,
          organization_id: organizationId,
          ...formData,
        } as CreateCitationInput);
      }
      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save citation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this citation?')) return;
    try {
      await citationService.deleteCitation(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete citation');
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      await citationService.verifyCitation(id, verified);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update citation');
    }
  };

  const handleCopy = async (citation: Citation) => {
    const formatted = citationService.formatChicagoCitation(citation);
    await navigator.clipboard.writeText(formatted);
    setCopiedId(citation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportBibliography = async () => {
    try {
      const bibliography = await citationService.exportAsBibliography(scriptId);
      const blob = new Blob([bibliography], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bibliography.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export bibliography');
    }
  };

  const resetForm = () => {
    setFormData({
      source_name: '',
      source_type: 'book',
      citation_text: '',
      reference_context: '',
      is_primary_source: false,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const startEdit = (citation: Citation) => {
    setFormData({
      source_name: citation.source_name,
      source_type: citation.source_type,
      citation_text: citation.citation_text,
      url: citation.url || '',
      page_number: citation.page_number || '',
      accessed_date: citation.accessed_date || '',
      reference_context: citation.reference_context || '',
      is_primary_source: citation.is_primary_source,
      author: citation.author || '',
      publication_date: citation.publication_date || '',
      publisher: citation.publisher || '',
    });
    setEditingId(citation.id);
    setShowAddForm(true);
  };

  const filteredCitations = citations.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.citation_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.source_type === filterType;
    return matchesSearch && matchesType;
  });

  const getIcon = (sourceType: string) => {
    const IconComponent = SOURCE_TYPE_ICONS[sourceType] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search citations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {sourceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {citations.length > 0 && (
            <button
              onClick={handleExportBibliography}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          {!readonly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Citation
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Citation' : 'Add New Citation'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Name *
                </label>
                <input
                  type="text"
                  value={formData.source_name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, source_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., National Archives"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Type *
                </label>
                <select
                  value={formData.source_type || 'book'}
                  onChange={(e) =>
                    setFormData({ ...formData, source_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {sourceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Citation Text *
              </label>
              <textarea
                value={formData.citation_text || ''}
                onChange={(e) =>
                  setFormData({ ...formData, citation_text: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Full citation text..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publication Date
                </label>
                <input
                  type="text"
                  value={formData.publication_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, publication_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1965"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Number
                </label>
                <input
                  type="text"
                  value={formData.page_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, page_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., pp. 45-47"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Context
              </label>
              <input
                type="text"
                value={formData.reference_context || ''}
                onChange={(e) =>
                  setFormData({ ...formData, reference_context: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What does this citation support?"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary_source"
                checked={formData.is_primary_source || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_primary_source: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_primary_source" className="text-sm text-gray-700">
                This is a primary source
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {editingId ? 'Update Citation' : 'Add Citation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredCitations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-900 font-medium mb-1">No citations yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Add citations to support historical claims in your documentary script.
          </p>
          {!readonly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Citation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCitations.map((citation) => (
            <div
              key={citation.id}
              className={`bg-white border rounded-lg p-4 ${
                citation.verified
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    citation.is_primary_source
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {getIcon(citation.source_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      [{citation.citation_number}]
                    </span>
                    <h4 className="font-medium text-gray-900 truncate">
                      {citation.source_name}
                    </h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {sourceTypes.find((t) => t.id === citation.source_type)?.label ||
                        citation.source_type}
                    </span>
                    {citation.is_primary_source && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                        Primary
                      </span>
                    )}
                    {citation.verified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{citation.citation_text}</p>

                  {citation.reference_context && (
                    <p className="text-sm text-gray-500 italic mb-2">
                      Supports: {citation.reference_context}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {citation.author && <span>By: {citation.author}</span>}
                    {citation.publication_date && (
                      <span>Published: {citation.publication_date}</span>
                    )}
                    {citation.page_number && <span>Page: {citation.page_number}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {citation.url && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleCopy(citation)}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedId === citation.id
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Copy formatted citation"
                  >
                    {copiedId === citation.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {!readonly && (
                    <>
                      <button
                        onClick={() => handleVerify(citation.id, !citation.verified)}
                        className={`p-2 rounded-lg transition-colors ${
                          citation.verified
                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={citation.verified ? 'Unverify' : 'Mark as verified'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(citation)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(citation.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {citations.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-2">
          {filteredCitations.length} of {citations.length} citation
          {citations.length !== 1 ? 's' : ''} shown
        </div>
      )}
    </div>
  );
}
