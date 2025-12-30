import { supabase } from '../lib/supabase';

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: string;
  example?: string;
}

export interface PromptTemplate {
  id: string;
  organization_id: string | null;
  prompt_key: string;
  prompt_name: string;
  category: string;
  description: string | null;
  is_system_default: boolean;
  is_active: boolean;
  variables_schema: PromptVariable[];
  workspace_types: string[] | null;
  created_at: string;
  updated_at: string;
  deployed_version?: PromptVersion;
  version_count?: number;
}

export interface PromptVersion {
  id: string;
  prompt_template_id: string;
  version_number: number;
  prompt_content: string;
  variables_schema: PromptVariable[];
  created_by: string | null;
  change_notes: string | null;
  is_deployed: boolean;
  created_at: string;
}

export interface PromptEnhancement {
  id: string;
  prompt_version_id: string;
  organization_id: string | null;
  original_content: string;
  enhanced_content: string;
  enhancement_type: 'clarity' | 'detail' | 'optimize' | 'custom';
  custom_instruction: string | null;
  accepted: boolean | null;
  created_at: string;
}

export type PromptCategory = 'script' | 'video' | 'voice' | 'storyboard' | 'style' | 'general';

const PROMPT_CACHE = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(orgId: string | null, promptKey: string): string {
  return `${orgId || 'system'}:${promptKey}`;
}

export async function initializeOrganizationPrompts(organizationId: string): Promise<number> {
  const { data, error } = await supabase.rpc('initialize_organization_prompts', {
    p_organization_id: organizationId
  });

  if (error) {
    throw error;
  }

  return data || 0;
}

export async function getPromptsByCategory(
  organizationId: string,
  category?: PromptCategory,
  searchQuery?: string
): Promise<PromptTemplate[]> {
  let query = supabase
    .from('prompt_templates')
    .select(`
      *,
      deployed_version:prompt_template_versions!inner(*)
    `)
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq('prompt_template_versions.is_deployed', true)
    .order('prompt_name', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let results = (data || []).map((item: any) => ({
    ...item,
    deployed_version: Array.isArray(item.deployed_version)
      ? item.deployed_version[0]
      : item.deployed_version
  }));

  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    results = results.filter(
      (p: PromptTemplate) =>
        p.prompt_name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.prompt_key.toLowerCase().includes(lowerQuery)
    );
  }

  return results;
}

export async function getAllPromptsForOrganization(
  organizationId: string,
  workspaceType?: string
): Promise<PromptTemplate[]> {
  const { data: orgPrompts, error: orgError } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('category', { ascending: true })
    .order('prompt_name', { ascending: true });

  if (orgError) {
    throw orgError;
  }

  const existingKeys = new Set((orgPrompts || []).map((p) => p.prompt_key));

  const { data: systemPrompts, error: sysError } = await supabase
    .from('prompt_templates')
    .select('*')
    .is('organization_id', null)
    .eq('is_system_default', true);

  if (sysError) {
    throw sysError;
  }

  const missingSystemPrompts = (systemPrompts || []).filter(
    (p) => !existingKeys.has(p.prompt_key)
  );

  let allPrompts = [...(orgPrompts || []), ...missingSystemPrompts];

  if (workspaceType) {
    allPrompts = allPrompts.filter((p) => {
      if (!p.workspace_types || p.workspace_types.length === 0) {
        return true;
      }
      return p.workspace_types.includes(workspaceType);
    });
  }

  const promptIds = allPrompts.map((p) => p.id);
  const { data: versions } = await supabase
    .from('prompt_template_versions')
    .select('*')
    .in('prompt_template_id', promptIds)
    .eq('is_deployed', true);

  const versionMap = new Map();
  (versions || []).forEach((v: PromptVersion) => {
    versionMap.set(v.prompt_template_id, v);
  });

  const { data: versionCounts } = await supabase
    .from('prompt_template_versions')
    .select('prompt_template_id')
    .in('prompt_template_id', promptIds);

  const countMap = new Map<string, number>();
  (versionCounts || []).forEach((v: { prompt_template_id: string }) => {
    countMap.set(v.prompt_template_id, (countMap.get(v.prompt_template_id) || 0) + 1);
  });

  return allPrompts.map((p) => ({
    ...p,
    deployed_version: versionMap.get(p.id),
    version_count: countMap.get(p.id) || 0
  }));
}

export async function getPromptTemplate(templateId: string): Promise<PromptTemplate | null> {
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActivePrompt(
  organizationId: string,
  promptKey: string,
  useCache: boolean = true
): Promise<string | null> {
  const cacheKey = getCacheKey(organizationId, promptKey);

  if (useCache) {
    const cached = PROMPT_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const { data: orgPrompt, error: orgError } = await supabase
    .from('prompt_templates')
    .select(`
      id,
      prompt_template_versions!inner(prompt_content)
    `)
    .eq('organization_id', organizationId)
    .eq('prompt_key', promptKey)
    .eq('is_active', true)
    .eq('prompt_template_versions.is_deployed', true)
    .maybeSingle();

  if (orgError && orgError.code !== 'PGRST116') {
    throw orgError;
  }

  if (orgPrompt) {
    const content = Array.isArray(orgPrompt.prompt_template_versions)
      ? orgPrompt.prompt_template_versions[0]?.prompt_content
      : (orgPrompt.prompt_template_versions as any)?.prompt_content;

    if (content) {
      PROMPT_CACHE.set(cacheKey, { data: content, timestamp: Date.now() });
      return content;
    }
  }

  const { data: systemPrompt, error: sysError } = await supabase
    .from('prompt_templates')
    .select(`
      id,
      prompt_template_versions!inner(prompt_content)
    `)
    .is('organization_id', null)
    .eq('prompt_key', promptKey)
    .eq('is_system_default', true)
    .eq('prompt_template_versions.is_deployed', true)
    .maybeSingle();

  if (sysError && sysError.code !== 'PGRST116') {
    throw sysError;
  }

  if (systemPrompt) {
    const content = Array.isArray(systemPrompt.prompt_template_versions)
      ? systemPrompt.prompt_template_versions[0]?.prompt_content
      : (systemPrompt.prompt_template_versions as any)?.prompt_content;

    if (content) {
      PROMPT_CACHE.set(cacheKey, { data: content, timestamp: Date.now() });
      return content;
    }
  }

  return null;
}

export function clearPromptCache(organizationId?: string, promptKey?: string): void {
  if (organizationId && promptKey) {
    PROMPT_CACHE.delete(getCacheKey(organizationId, promptKey));
  } else if (organizationId) {
    for (const key of PROMPT_CACHE.keys()) {
      if (key.startsWith(`${organizationId}:`)) {
        PROMPT_CACHE.delete(key);
      }
    }
  } else {
    PROMPT_CACHE.clear();
  }
}

export async function createPromptTemplate(
  organizationId: string,
  data: {
    prompt_key: string;
    prompt_name: string;
    category: PromptCategory;
    description?: string;
    initial_content: string;
    variables_schema?: PromptVariable[];
  }
): Promise<PromptTemplate> {
  const { data: template, error: templateError } = await supabase
    .from('prompt_templates')
    .insert([{
      organization_id: organizationId,
      prompt_key: data.prompt_key,
      prompt_name: data.prompt_name,
      category: data.category,
      description: data.description,
      is_system_default: false,
      is_active: true,
      variables_schema: data.variables_schema || []
    }])
    .select()
    .single();

  if (templateError) {
    throw templateError;
  }

  const { error: versionError } = await supabase
    .from('prompt_template_versions')
    .insert([{
      prompt_template_id: template.id,
      version_number: 1,
      prompt_content: data.initial_content,
      variables_schema: data.variables_schema || [],
      created_by: 'user',
      change_notes: 'Initial version',
      is_deployed: true
    }]);

  if (versionError) {
    throw versionError;
  }

  return template;
}

export async function createPromptVersion(
  templateId: string,
  content: string,
  changeNotes?: string,
  variablesSchema?: PromptVariable[]
): Promise<PromptVersion> {
  const { data: nextVersion } = await supabase.rpc('get_next_prompt_version_number', {
    p_template_id: templateId
  });

  const { data: version, error } = await supabase
    .from('prompt_template_versions')
    .insert([{
      prompt_template_id: templateId,
      version_number: nextVersion || 1,
      prompt_content: content,
      variables_schema: variablesSchema || [],
      created_by: 'user',
      change_notes: changeNotes || null,
      is_deployed: false
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return version;
}

export async function deployVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc('deploy_prompt_version', {
    p_version_id: versionId
  });

  if (error) {
    throw error;
  }

  clearPromptCache();
}

export async function revertToVersion(
  templateId: string,
  versionNumber: number
): Promise<PromptVersion> {
  const { data: sourceVersion, error: fetchError } = await supabase
    .from('prompt_template_versions')
    .select('*')
    .eq('prompt_template_id', templateId)
    .eq('version_number', versionNumber)
    .single();

  if (fetchError || !sourceVersion) {
    throw fetchError || new Error('Version not found');
  }

  const newVersion = await createPromptVersion(
    templateId,
    sourceVersion.prompt_content,
    `Reverted to version ${versionNumber}`,
    sourceVersion.variables_schema
  );

  await deployVersion(newVersion.id);

  return newVersion;
}

export async function getVersionHistory(
  templateId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ versions: PromptVersion[]; total: number }> {
  const { count } = await supabase
    .from('prompt_template_versions')
    .select('*', { count: 'exact', head: true })
    .eq('prompt_template_id', templateId);

  const { data: versions, error } = await supabase
    .from('prompt_template_versions')
    .select('*')
    .eq('prompt_template_id', templateId)
    .order('version_number', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    versions: versions || [],
    total: count || 0
  };
}

export async function getVersion(versionId: string): Promise<PromptVersion | null> {
  const { data, error } = await supabase
    .from('prompt_template_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export interface VersionDiff {
  additions: string[];
  deletions: string[];
  changes: Array<{ before: string; after: string }>;
}

export function compareVersions(content1: string, content2: string): VersionDiff {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');

  const additions: string[] = [];
  const deletions: string[] = [];
  const changes: Array<{ before: string; after: string }> = [];

  const set1 = new Set(lines1);
  const set2 = new Set(lines2);

  lines2.forEach((line) => {
    if (!set1.has(line) && line.trim()) {
      additions.push(line);
    }
  });

  lines1.forEach((line) => {
    if (!set2.has(line) && line.trim()) {
      deletions.push(line);
    }
  });

  const maxLen = Math.max(lines1.length, lines2.length);
  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i] || '';
    const l2 = lines2[i] || '';
    if (l1 !== l2 && l1.trim() && l2.trim()) {
      const similarity = calculateSimilarity(l1, l2);
      if (similarity > 0.5) {
        changes.push({ before: l1, after: l2 });
      }
    }
  }

  return { additions, deletions, changes };
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export async function updatePromptTemplate(
  templateId: string,
  updates: {
    prompt_name?: string;
    description?: string;
    is_active?: boolean;
    variables_schema?: PromptVariable[];
  }
): Promise<void> {
  const { error } = await supabase
    .from('prompt_templates')
    .update(updates)
    .eq('id', templateId);

  if (error) {
    throw error;
  }
}

export async function deletePromptTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('prompt_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    throw error;
  }

  clearPromptCache();
}

export async function resetPromptToDefault(
  organizationId: string,
  promptKey: string
): Promise<void> {
  const { data: systemPrompt, error: sysError } = await supabase
    .from('prompt_templates')
    .select(`
      *,
      prompt_template_versions!inner(*)
    `)
    .is('organization_id', null)
    .eq('prompt_key', promptKey)
    .eq('is_system_default', true)
    .eq('prompt_template_versions.is_deployed', true)
    .maybeSingle();

  if (sysError || !systemPrompt) {
    throw sysError || new Error('System default not found');
  }

  const deployedVersion = Array.isArray(systemPrompt.prompt_template_versions)
    ? systemPrompt.prompt_template_versions[0]
    : systemPrompt.prompt_template_versions;

  const { data: orgPrompt } = await supabase
    .from('prompt_templates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('prompt_key', promptKey)
    .maybeSingle();

  if (orgPrompt) {
    const newVersion = await createPromptVersion(
      orgPrompt.id,
      deployedVersion.prompt_content,
      'Reset to system default',
      deployedVersion.variables_schema
    );
    await deployVersion(newVersion.id);
  } else {
    await initializeOrganizationPrompts(organizationId);
  }

  clearPromptCache(organizationId, promptKey);
}

export async function checkIfModifiedFromDefault(
  organizationId: string,
  promptKey: string
): Promise<boolean> {
  const orgContent = await getActivePrompt(organizationId, promptKey, false);

  const { data: systemPrompt } = await supabase
    .from('prompt_templates')
    .select(`
      prompt_template_versions!inner(prompt_content)
    `)
    .is('organization_id', null)
    .eq('prompt_key', promptKey)
    .eq('is_system_default', true)
    .eq('prompt_template_versions.is_deployed', true)
    .maybeSingle();

  if (!systemPrompt || !orgContent) {
    return false;
  }

  const sysContent = Array.isArray(systemPrompt.prompt_template_versions)
    ? systemPrompt.prompt_template_versions[0]?.prompt_content
    : (systemPrompt.prompt_template_versions as any)?.prompt_content;

  return orgContent !== sysContent;
}

export function renderPrompt(template: string, variables: Record<string, any>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    result = result.replace(placeholder, stringValue);
  }

  return result;
}

export function extractVariablesFromTemplate(template: string): string[] {
  const regex = /\$\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
