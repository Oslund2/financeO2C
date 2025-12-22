import { supabase } from '../lib/supabase';
import { generateText } from './geminiService';

export interface CPCClassification {
  code: string;
  title: string;
  description?: string;
  level: number;
  category: string;
  confidence?: number;
}

export interface CPCClassificationResult {
  primary: CPCClassification | null;
  secondary: CPCClassification[];
  aiSuggested: boolean;
  confidence: number | null;
  analysisRationale?: string;
}

export interface CPCReferenceData {
  code: string;
  title: string;
  description: string | null;
  parent_code: string | null;
  level: number;
  category: string;
  keywords: string[];
}

export async function getCPCReferenceData(): Promise<CPCReferenceData[]> {
  const { data, error } = await supabase
    .from('cpc_classification_reference')
    .select('*')
    .order('code', { ascending: true });

  if (error) {
    console.error('Failed to load CPC reference data:', error);
    return [];
  }

  return data || [];
}

export async function getCPCClassificationsByCategory(category: string): Promise<CPCReferenceData[]> {
  const { data, error } = await supabase
    .from('cpc_classification_reference')
    .select('*')
    .eq('category', category)
    .order('code', { ascending: true });

  if (error) {
    console.error('Failed to load CPC classifications by category:', error);
    return [];
  }

  return data || [];
}

export async function getCPCHierarchy(code: string): Promise<CPCReferenceData[]> {
  const hierarchy: CPCReferenceData[] = [];
  let currentCode: string | null = code;

  while (currentCode) {
    const { data, error } = await supabase
      .from('cpc_classification_reference')
      .select('*')
      .eq('code', currentCode)
      .maybeSingle();

    if (error || !data) break;

    hierarchy.unshift(data);
    currentCode = data.parent_code;
  }

  return hierarchy;
}

export async function suggestCPCClassifications(
  title: string,
  inventionDescription: string,
  technicalField: string | null,
  claimsText: string | null
): Promise<CPCClassificationResult> {
  const referenceData = await getCPCReferenceData();

  const availableClasses = referenceData
    .filter(r => r.level >= 3)
    .map(r => `${r.code}: ${r.title}`)
    .join('\n');

  const prompt = `Analyze this patent application and suggest the most appropriate CPC (Cooperative Patent Classification) codes.

INVENTION TITLE: ${title}

INVENTION DESCRIPTION:
${inventionDescription || 'Not provided'}

TECHNICAL FIELD:
${technicalField || 'Not specified'}

CLAIMS (if available):
${claimsText ? claimsText.substring(0, 2000) : 'Not yet generated'}

AVAILABLE CPC CLASSIFICATIONS:
${availableClasses}

Based on the invention description and technical field, select:
1. ONE primary CPC classification that best describes the core innovation
2. Up to THREE secondary CPC classifications for additional aspects

Consider:
- If the invention involves AI/ML, consider G06N classes
- If it involves image/video processing, consider G06T or H04N
- If it involves speech/voice, consider G10L
- If it involves business processes/workflow, consider G06Q
- If it involves data processing/software, consider G06F

Respond in JSON format:
{
  "primary": {
    "code": "G06T13/40",
    "confidence": 0.85,
    "rationale": "Brief explanation why this is the primary classification"
  },
  "secondary": [
    {"code": "G06N3/08", "confidence": 0.72, "rationale": "Brief explanation"},
    {"code": "G10L13", "confidence": 0.65, "rationale": "Brief explanation"}
  ],
  "overallRationale": "Summary of the classification analysis"
}`;

  try {
    const response = await generateText(prompt, 'cpc_classification');
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      const primaryRef = referenceData.find(r => r.code === parsed.primary?.code);
      const primary: CPCClassification | null = primaryRef ? {
        code: primaryRef.code,
        title: primaryRef.title,
        description: primaryRef.description || undefined,
        level: primaryRef.level,
        category: primaryRef.category,
        confidence: parsed.primary?.confidence || 0.7
      } : null;

      const secondary: CPCClassification[] = (parsed.secondary || [])
        .map((s: any) => {
          const ref = referenceData.find(r => r.code === s.code);
          if (!ref) return null;
          return {
            code: ref.code,
            title: ref.title,
            description: ref.description || undefined,
            level: ref.level,
            category: ref.category,
            confidence: s.confidence || 0.5
          };
        })
        .filter(Boolean)
        .slice(0, 3);

      return {
        primary,
        secondary,
        aiSuggested: true,
        confidence: parsed.primary?.confidence || null,
        analysisRationale: parsed.overallRationale
      };
    }
  } catch (error) {
    console.error('AI classification suggestion failed:', error);
  }

  return suggestClassificationFromKeywords(title, inventionDescription, technicalField, referenceData);
}

function suggestClassificationFromKeywords(
  title: string,
  description: string,
  technicalField: string | null,
  referenceData: CPCReferenceData[]
): CPCClassificationResult {
  const text = `${title} ${description} ${technicalField || ''}`.toLowerCase();

  const scores: Map<string, number> = new Map();

  for (const ref of referenceData) {
    if (ref.level < 3) continue;

    let score = 0;
    const keywords = ref.keywords || [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 10;
        if (title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
        }
      }
    }

    if (ref.title && text.includes(ref.title.toLowerCase().split(' ')[0])) {
      score += 3;
    }

    if (score > 0) {
      scores.set(ref.code, score);
    }
  }

  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    const defaultRef = referenceData.find(r => r.code === 'G06F');
    return {
      primary: defaultRef ? {
        code: defaultRef.code,
        title: defaultRef.title,
        description: defaultRef.description || undefined,
        level: defaultRef.level,
        category: defaultRef.category,
        confidence: 0.3
      } : null,
      secondary: [],
      aiSuggested: false,
      confidence: 0.3,
      analysisRationale: 'Default classification assigned - insufficient keywords matched'
    };
  }

  const primaryCode = sorted[0][0];
  const primaryRef = referenceData.find(r => r.code === primaryCode);
  const maxScore = sorted[0][1];

  const primary: CPCClassification | null = primaryRef ? {
    code: primaryRef.code,
    title: primaryRef.title,
    description: primaryRef.description || undefined,
    level: primaryRef.level,
    category: primaryRef.category,
    confidence: Math.min(0.9, maxScore / 50)
  } : null;

  const secondary: CPCClassification[] = sorted
    .slice(1, 4)
    .map(([code, score]) => {
      const ref = referenceData.find(r => r.code === code);
      if (!ref) return null;
      return {
        code: ref.code,
        title: ref.title,
        description: ref.description || undefined,
        level: ref.level,
        category: ref.category,
        confidence: Math.min(0.9, score / 50)
      };
    })
    .filter(Boolean) as CPCClassification[];

  return {
    primary,
    secondary,
    aiSuggested: false,
    confidence: primary?.confidence || null,
    analysisRationale: 'Classification suggested based on keyword matching'
  };
}

export async function updatePatentClassifications(
  applicationId: string,
  classifications: CPCClassificationResult
): Promise<void> {
  const { error } = await supabase
    .from('patent_applications')
    .update({
      cpc_classifications: {
        primary: classifications.primary?.code || null,
        primaryDetails: classifications.primary,
        secondary: classifications.secondary.map(s => s.code),
        secondaryDetails: classifications.secondary,
        ai_suggested: classifications.aiSuggested,
        confidence: classifications.confidence,
        rationale: classifications.analysisRationale
      }
    })
    .eq('id', applicationId);

  if (error) {
    throw new Error(`Failed to update classifications: ${error.message}`);
  }
}

export async function getPatentClassifications(
  applicationId: string
): Promise<CPCClassificationResult | null> {
  const { data, error } = await supabase
    .from('patent_applications')
    .select('cpc_classifications')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !data?.cpc_classifications) {
    return null;
  }

  const stored = data.cpc_classifications as any;

  return {
    primary: stored.primaryDetails || null,
    secondary: stored.secondaryDetails || [],
    aiSuggested: stored.ai_suggested || false,
    confidence: stored.confidence || null,
    analysisRationale: stored.rationale
  };
}

export function formatCPCCodeForDisplay(code: string): string {
  if (code.length <= 4) return code;

  const section = code[0];
  const classCode = code.substring(0, 3);
  const subclass = code.substring(0, 4);
  const group = code.includes('/') ? code : code.substring(4);

  return `${section} ${classCode} ${subclass} ${group}`;
}

export function getCPCCodeLink(code: string): string {
  return `https://www.uspto.gov/web/patents/classification/cpc/html/cpc-${code.substring(0, 4)}.html`;
}

export const COMMON_SOFTWARE_CPC_CLASSES = [
  { code: 'G06F', title: 'Electric Digital Data Processing', description: 'General software and computing' },
  { code: 'G06N', title: 'Computing Based on Specific Models', description: 'AI, ML, Neural Networks' },
  { code: 'G06Q', title: 'Business Data Processing', description: 'Business methods, workflows' },
  { code: 'G06T', title: 'Image Data Processing', description: 'Graphics, visualization, animation' },
  { code: 'G06V', title: 'Image/Video Recognition', description: 'Computer vision, recognition' },
  { code: 'G10L', title: 'Speech Analysis/Synthesis', description: 'Voice, TTS, ASR' },
  { code: 'H04L', title: 'Digital Information Transmission', description: 'Networks, protocols' },
  { code: 'H04N', title: 'Pictorial Communication', description: 'Video, multimedia, streaming' }
];
