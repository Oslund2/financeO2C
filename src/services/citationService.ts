import { supabase } from '../lib/supabase';

export interface Citation {
  id: string;
  script_id: string;
  organization_id?: string;
  citation_number: number;
  source_name: string;
  source_type: string;
  citation_text: string;
  url?: string;
  page_number?: string;
  accessed_date?: string;
  reference_context?: string;
  is_primary_source: boolean;
  author?: string;
  publication_date?: string;
  publisher?: string;
  volume_issue?: string;
  notes?: string;
  ai_generated: boolean;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CitationSourceType {
  id: string;
  label: string;
  description?: string;
  icon_name?: string;
  sort_order: number;
}

export interface CitationSource {
  id: string;
  source_name: string;
  source_type: string;
  default_url_pattern?: string;
  description?: string;
  is_primary_source: boolean;
  is_active: boolean;
}

export interface CreateCitationInput {
  script_id: string;
  organization_id?: string;
  source_name: string;
  source_type: string;
  citation_text: string;
  url?: string;
  page_number?: string;
  accessed_date?: string;
  reference_context?: string;
  is_primary_source?: boolean;
  author?: string;
  publication_date?: string;
  publisher?: string;
  volume_issue?: string;
  notes?: string;
  ai_generated?: boolean;
}

export interface UpdateCitationInput {
  source_name?: string;
  source_type?: string;
  citation_text?: string;
  url?: string;
  page_number?: string;
  accessed_date?: string;
  reference_context?: string;
  is_primary_source?: boolean;
  author?: string;
  publication_date?: string;
  publisher?: string;
  volume_issue?: string;
  notes?: string;
  verified?: boolean;
}

export const citationService = {
  async getCitationSourceTypes(): Promise<CitationSourceType[]> {
    const { data, error } = await supabase
      .from('citation_source_types')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async getCitationSources(): Promise<CitationSource[]> {
    const { data, error } = await supabase
      .from('citation_sources')
      .select('*')
      .eq('is_active', true)
      .order('source_name');

    if (error) throw error;
    return data || [];
  },

  async getScriptCitations(scriptId: string): Promise<Citation[]> {
    const { data, error } = await supabase
      .from('script_citations')
      .select('*')
      .eq('script_id', scriptId)
      .order('citation_number');

    if (error) throw error;
    return data || [];
  },

  async getCitation(citationId: string): Promise<Citation | null> {
    const { data, error } = await supabase
      .from('script_citations')
      .select('*')
      .eq('id', citationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createCitation(input: CreateCitationInput): Promise<Citation> {
    const { data: nextNumber, error: numberError } = await supabase
      .rpc('get_next_citation_number', { p_script_id: input.script_id });

    if (numberError) throw numberError;

    const { data, error } = await supabase
      .from('script_citations')
      .insert({
        ...input,
        citation_number: nextNumber,
        is_primary_source: input.is_primary_source ?? false,
        ai_generated: input.ai_generated ?? false,
        verified: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createBulkCitations(
    scriptId: string,
    organizationId: string | undefined,
    citations: Omit<CreateCitationInput, 'script_id' | 'organization_id'>[]
  ): Promise<Citation[]> {
    if (citations.length === 0) return [];

    const { data: startNumber, error: numberError } = await supabase
      .rpc('get_next_citation_number', { p_script_id: scriptId });

    if (numberError) throw numberError;

    const citationsToInsert = citations.map((citation, index) => ({
      ...citation,
      script_id: scriptId,
      organization_id: organizationId,
      citation_number: startNumber + index,
      is_primary_source: citation.is_primary_source ?? false,
      ai_generated: citation.ai_generated ?? true,
      verified: false,
    }));

    const { data, error } = await supabase
      .from('script_citations')
      .insert(citationsToInsert)
      .select();

    if (error) throw error;
    return data || [];
  },

  async updateCitation(citationId: string, input: UpdateCitationInput): Promise<Citation> {
    const updateData: Record<string, unknown> = { ...input };

    if (input.verified) {
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('script_citations')
      .update(updateData)
      .eq('id', citationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCitation(citationId: string): Promise<void> {
    const { data: citation, error: fetchError } = await supabase
      .from('script_citations')
      .select('script_id')
      .eq('id', citationId)
      .single();

    if (fetchError) throw fetchError;

    const { error: deleteError } = await supabase
      .from('script_citations')
      .delete()
      .eq('id', citationId);

    if (deleteError) throw deleteError;

    await supabase.rpc('reorder_script_citations', { p_script_id: citation.script_id });
  },

  async reorderCitations(scriptId: string, citationIds: string[]): Promise<void> {
    for (let i = 0; i < citationIds.length; i++) {
      const { error } = await supabase
        .from('script_citations')
        .update({ citation_number: i + 1 })
        .eq('id', citationIds[i]);

      if (error) throw error;
    }
  },

  async verifyCitation(citationId: string, verified: boolean): Promise<Citation> {
    const { data, error } = await supabase
      .from('script_citations')
      .update({
        verified,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq('id', citationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async exportAsBibliography(scriptId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('export_citations_as_bibliography', { p_script_id: scriptId });

    if (error) throw error;
    return data || '';
  },

  async getCitationCount(scriptId: string): Promise<number> {
    const { count, error } = await supabase
      .from('script_citations')
      .select('*', { count: 'exact', head: true })
      .eq('script_id', scriptId);

    if (error) throw error;
    return count || 0;
  },

  async searchCitationSources(query: string): Promise<CitationSource[]> {
    const { data, error } = await supabase
      .from('citation_sources')
      .select('*')
      .eq('is_active', true)
      .ilike('source_name', `%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  formatChicagoCitation(citation: Citation): string {
    const parts: string[] = [];

    if (citation.author) {
      parts.push(citation.author);
    }

    if (citation.source_type === 'book') {
      parts.push(`*${citation.source_name}*.`);
      if (citation.publisher) parts.push(citation.publisher);
      if (citation.publication_date) parts.push(citation.publication_date);
    } else if (citation.source_type === 'journal' || citation.source_type === 'article') {
      parts.push(`"${citation.citation_text}."`);
      parts.push(`*${citation.source_name}*`);
      if (citation.volume_issue) parts.push(citation.volume_issue);
      if (citation.publication_date) parts.push(`(${citation.publication_date})`);
      if (citation.page_number) parts.push(`: ${citation.page_number}`);
    } else if (citation.source_type === 'website') {
      parts.push(`"${citation.citation_text}."`);
      parts.push(citation.source_name);
      if (citation.accessed_date) parts.push(`Accessed ${citation.accessed_date}.`);
      if (citation.url) parts.push(citation.url);
    } else {
      parts.push(citation.citation_text);
      parts.push(citation.source_name);
      if (citation.page_number) parts.push(citation.page_number);
    }

    return parts.join('. ').replace(/\.\./g, '.').trim();
  },

  getSourceTypeIcon(sourceType: string): string {
    const iconMap: Record<string, string> = {
      book: 'book-open',
      journal: 'graduation-cap',
      article: 'newspaper',
      newspaper: 'file-text',
      archive: 'archive',
      government_record: 'landmark',
      interview: 'mic',
      documentary: 'film',
      website: 'globe',
      primary_document: 'scroll',
    };
    return iconMap[sourceType] || 'file';
  },
};
