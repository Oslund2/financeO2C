import { supabase } from '../lib/supabase';
import type { WorkspaceType } from '../contexts/OrganizationContext';

interface PromptTemplate {
  id: string;
  organization_id: string | null;
  prompt_key: string;
  prompt_name: string;
  category: string;
  description: string | null;
  is_system_default: boolean;
  is_active: boolean;
  variables_schema: any;
  workspace_types: string[] | null;
  created_at: string;
  updated_at: string;
  deployed_content?: string;
}

interface WorkspaceStyleConfig {
  baseStyle: string;
  fullStyle: string;
  negativePrompt: string;
}

const promptCache = new Map<string, { data: PromptTemplate[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getPromptsForWorkspace(
  organizationId: string,
  workspaceType: WorkspaceType
): Promise<PromptTemplate[]> {
  const cacheKey = `${organizationId}-${workspaceType}`;
  const cached = promptCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase.rpc('get_prompts_for_workspace_type', {
      p_organization_id: organizationId,
      p_workspace_type: workspaceType
    });

    if (error) throw error;

    const prompts = data || [];

    for (const prompt of prompts) {
      const { data: versionData } = await supabase
        .from('prompt_template_versions')
        .select('prompt_content')
        .eq('prompt_template_id', prompt.id)
        .eq('is_deployed', true)
        .maybeSingle();

      if (versionData) {
        prompt.deployed_content = versionData.prompt_content;
      }
    }

    promptCache.set(cacheKey, { data: prompts, timestamp: Date.now() });
    return prompts;
  } catch (error) {
    console.error('Error fetching workspace prompts:', error);
    return [];
  }
}

export async function getStylePromptsForWorkspace(
  organizationId: string,
  workspaceType: WorkspaceType
): Promise<WorkspaceStyleConfig> {
  const prompts = await getPromptsForWorkspace(organizationId, workspaceType);

  const baseStylePrompt = prompts.find(p =>
    p.category === 'style' &&
    (p.prompt_key === `${workspaceType}_style_base` || p.prompt_key === 'claymation_style_base')
  );

  const fullStylePrompt = prompts.find(p =>
    p.category === 'style' &&
    (p.prompt_key === `${workspaceType}_style_full` || p.prompt_key === 'claymation_style_full')
  );

  const negativePrompt = prompts.find(p =>
    p.category === 'style' &&
    (p.prompt_key === `${workspaceType}_negative_prompt` || p.prompt_key === 'negative_prompt')
  );

  const defaultClaymation = 'claymation style, vibrant colors, playful animation aesthetic, smooth rounded shapes, friendly character design';
  const defaultPhotoreal = 'photorealistic, cinematic lighting, historically accurate, documentary style, natural environments, realistic human subjects';

  return {
    baseStyle: baseStylePrompt?.deployed_content || (workspaceType === 'photoreal' ? defaultPhotoreal : defaultClaymation),
    fullStyle: fullStylePrompt?.deployed_content || (workspaceType === 'photoreal' ? defaultPhotoreal : defaultClaymation),
    negativePrompt: negativePrompt?.deployed_content || ''
  };
}

export async function getVideoStylePromptForWorkspace(
  organizationId: string,
  workspaceType: WorkspaceType
): Promise<string> {
  const prompts = await getPromptsForWorkspace(organizationId, workspaceType);

  const videoStylePrompt = prompts.find(p =>
    p.category === 'style' &&
    (p.prompt_key === `${workspaceType}_cinematic_video_style` ||
     p.prompt_key === `${workspaceType}_video_style` ||
     p.prompt_key === 'video_style')
  );

  if (videoStylePrompt?.deployed_content) {
    return videoStylePrompt.deployed_content;
  }

  if (workspaceType === 'photoreal') {
    return 'Cinematic photorealistic footage, professional documentary style, natural lighting, historically accurate settings, realistic human subjects and environments';
  }

  return 'Claymation animation style, stop-motion aesthetic, handcrafted clay characters with visible texture, tangible 3D miniature sets, studio lighting';
}

export function clearPromptCache(): void {
  promptCache.clear();
}
