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
  let referenceData = await getCPCReferenceData();

  if (referenceData.length === 0) {
    console.warn('CPC reference data is empty, using built-in fallback classifications');
    referenceData = COMMON_SOFTWARE_CPC_CLASSES.map(c => ({
      code: c.code,
      title: c.title,
      description: c.description,
      parent_code: null,
      level: 3,
      category: 'subclass',
      keywords: c.description.toLowerCase().split(/[,\s]+/)
    }));
  }

  const availableClasses = referenceData
    .filter(r => r.level >= 3)
    .map(r => `${r.code}: ${r.title}`)
    .join('\n');

  const fallbackClasses = COMMON_SOFTWARE_CPC_CLASSES
    .map(c => `${c.code}: ${c.title} - ${c.description}`)
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
${availableClasses || fallbackClasses}

COMMON SOFTWARE/TECH CPC CODES FOR REFERENCE:
${fallbackClasses}

CLASSIFICATION GUIDANCE:

1. ANIMATION/GRAPHICS (Primary for animation production systems):
   - G06T 13/00: Animation (broad category)
   - G06T 13/20: 3D Animation (for 3D mesh manipulation, claymation, photo-real styles)
   - G06T 13/40: Facial Animation (for lip-sync, facial expressions)
   - G06T 13/80: 2D Animation (for cartoon-style, flat animation)
   - G06T 19/00: Manipulating 3D Models (for computer graphics rendering)

2. AI/MACHINE LEARNING (Secondary for AI-powered systems):
   - G06N 3/00: Biological Models - Neural Networks (for LLMs, diffusion models, deep learning)
   - G06N 20/00: Machine Learning (for adaptive algorithms, learning systems)

3. LEGAL/IP AUTOMATION (Critical for IP management features):
   - G06Q 50/18: Legal Services (for IP management, automated copyright/patent generation)
   Note: Business method patents require strong technical grounding

4. BUSINESS/WORKFLOW (For cost modeling, project management):
   - G06Q 10/06: Project/Resource Management (for cost modeling, asset decay simulation, progress tracking)

5. SPEECH/VOICE (For voice generation features):
   - G10L 13/00: Speech Synthesis (for TTS, dialogue audio generation)

IMPORTANT CLASSIFICATION RULES:
- For inventions combining animation + AI: Primary should be G06T 13/xx (the core output)
- For legal automation features: Include G06Q 50/18 but emphasize TECHNICAL implementation
- For self-documenting patent features: Anchor in G06F (codebase scanning, AST analysis) rather than just business methods
- Be specific with subclass codes when possible (e.g., G06T13/40 not just G06T13)

Based on the invention description and technical field, select:
1. ONE primary CPC classification that best describes the core technical innovation (the OUTPUT)
2. Up to THREE secondary CPC classifications for underlying technologies and additional aspects

Respond in JSON format:
{
  "primary": {
    "code": "G06T13/00",
    "confidence": 0.85,
    "rationale": "Brief explanation why this is the primary classification"
  },
  "secondary": [
    {"code": "G06Q50/18", "confidence": 0.78, "rationale": "IP management and legal automation features"},
    {"code": "G06N3/00", "confidence": 0.72, "rationale": "Neural network-based AI generation"},
    {"code": "G10L13/00", "confidence": 0.65, "rationale": "Speech synthesis for dialogue"}
  ],
  "overallRationale": "Summary explaining classification hierarchy and why primary was chosen over secondaries"
}`;

  try {
    const response = await generateText(prompt, 'cpc_classification');
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      let primaryRef = referenceData.find(r => r.code === parsed.primary?.code);
      if (!primaryRef && parsed.primary?.code) {
        const commonMatch = COMMON_SOFTWARE_CPC_CLASSES.find(c =>
          parsed.primary.code.startsWith(c.code) || c.code === parsed.primary.code
        );
        if (commonMatch) {
          primaryRef = {
            code: parsed.primary.code,
            title: commonMatch.title + (parsed.primary.code !== commonMatch.code ? ` (${parsed.primary.code})` : ''),
            description: commonMatch.description,
            parent_code: commonMatch.code,
            level: parsed.primary.code.includes('/') ? 5 : 4,
            category: 'group',
            keywords: []
          };
        }
      }

      const primary: CPCClassification | null = primaryRef ? {
        code: primaryRef.code,
        title: primaryRef.title,
        description: primaryRef.description || undefined,
        level: primaryRef.level,
        category: primaryRef.category,
        confidence: parsed.primary?.confidence || 0.7
      } : (parsed.primary?.code ? {
        code: parsed.primary.code,
        title: parsed.primary.rationale || 'AI-suggested classification',
        description: undefined,
        level: 4,
        category: 'group',
        confidence: parsed.primary?.confidence || 0.6
      } : null);

      const secondary: CPCClassification[] = (parsed.secondary || [])
        .map((s: any) => {
          let ref = referenceData.find(r => r.code === s.code);
          if (!ref && s.code) {
            const commonMatch = COMMON_SOFTWARE_CPC_CLASSES.find(c =>
              s.code.startsWith(c.code) || c.code === s.code
            );
            if (commonMatch) {
              return {
                code: s.code,
                title: commonMatch.title,
                description: commonMatch.description,
                level: s.code.includes('/') ? 5 : 4,
                category: 'group',
                confidence: s.confidence || 0.5
              };
            }
            return {
              code: s.code,
              title: s.rationale || 'Secondary classification',
              description: undefined,
              level: 4,
              category: 'group',
              confidence: s.confidence || 0.5
            };
          }
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

  const keywordResult = suggestClassificationFromKeywords(title, inventionDescription, technicalField, referenceData);

  if (!keywordResult.primary) {
    return {
      primary: {
        code: 'G06F',
        title: 'Electric Digital Data Processing',
        description: 'General software and computing',
        level: 3,
        category: 'subclass',
        confidence: 0.4
      },
      secondary: [
        {
          code: 'G06N',
          title: 'Computing Based on Specific Models',
          description: 'AI, ML, Neural Networks',
          level: 3,
          category: 'subclass',
          confidence: 0.3
        }
      ],
      aiSuggested: false,
      confidence: 0.4,
      analysisRationale: 'Default software classification assigned. Consider manually selecting a more specific classification.'
    };
  }

  return keywordResult;
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
  { code: 'G06F', title: 'Electric Digital Data Processing', description: 'General software and computing, data processing systems' },
  { code: 'G06N', title: 'Computing Based on Specific Models', description: 'AI, ML, Neural Networks, computational models' },
  { code: 'G06N3/00', title: 'Biological Models (Neural Networks)', description: 'Computer systems based on biological models, LLMs, diffusion models, deep learning' },
  { code: 'G06N20/00', title: 'Machine Learning', description: 'Adaptive algorithms, training systems, learning curve simulation' },
  { code: 'G06Q', title: 'Business Data Processing', description: 'Business methods, administrative systems, workflow automation' },
  { code: 'G06Q10/06', title: 'Project/Resource Management', description: 'Workflow management, cost modeling, resource allocation, progress tracking, asset management' },
  { code: 'G06Q50/18', title: 'Legal Services', description: 'IP management, automated copyright registration, patent generation, legal document automation' },
  { code: 'G06T', title: 'Image Data Processing', description: 'Graphics, visualization, image generation' },
  { code: 'G06T13/00', title: 'Animation', description: 'Computer animation, motion graphics, animated content generation' },
  { code: 'G06T13/20', title: '3D Animation', description: 'Three-dimensional animation, 3D character animation, claymation-style rendering' },
  { code: 'G06T13/40', title: 'Facial Animation', description: 'Lip-sync, facial expression animation, character face movement' },
  { code: 'G06T13/80', title: '2D Animation', description: 'Two-dimensional animation, cartoon-style, flat animation' },
  { code: 'G06T19/00', title: 'Manipulating 3D Models', description: '3D model manipulation, computer graphics rendering, scene composition' },
  { code: 'G06V', title: 'Image/Video Recognition', description: 'Computer vision, recognition, visual analysis' },
  { code: 'G10L', title: 'Speech Analysis/Synthesis', description: 'Voice, TTS, ASR, voice cloning' },
  { code: 'G10L13/00', title: 'Speech Synthesis', description: 'Text-to-speech, voice generation, dialogue audio synthesis' },
  { code: 'H04L', title: 'Digital Information Transmission', description: 'Networks, protocols, data transmission' },
  { code: 'H04N', title: 'Pictorial Communication', description: 'Video, multimedia, streaming, video generation' }
];

export interface ArtUnitSuggestion {
  techCenter: string;
  artUnit: string;
  description: string;
  relevance: number;
}

export function suggestArtUnits(classifications: CPCClassificationResult): ArtUnitSuggestion[] {
  const suggestions: ArtUnitSuggestion[] = [];
  const allCodes = [
    classifications.primary?.code,
    ...classifications.secondary.map(s => s.code)
  ].filter(Boolean) as string[];

  const hasAnimation = allCodes.some(c => c.startsWith('G06T13') || c.startsWith('G06T19'));
  const hasAI = allCodes.some(c => c.startsWith('G06N'));
  const hasLegal = allCodes.some(c => c.startsWith('G06Q50/18'));
  const hasBusiness = allCodes.some(c => c.startsWith('G06Q'));
  const hasSpeech = allCodes.some(c => c.startsWith('G10L'));
  const hasVideo = allCodes.some(c => c.startsWith('H04N'));

  if (hasAnimation || hasAI) {
    suggestions.push({
      techCenter: '2100',
      artUnit: '2121-2129',
      description: 'Computer Architecture and Software - AI, Graphics, Animation',
      relevance: hasAnimation && hasAI ? 0.95 : 0.85
    });
  }

  if (hasLegal || hasBusiness) {
    suggestions.push({
      techCenter: '3600',
      artUnit: '3621-3629',
      description: 'Business Methods - Legal Automation, IP Management, Workflow',
      relevance: hasLegal ? 0.9 : 0.75
    });
  }

  if (hasSpeech) {
    suggestions.push({
      techCenter: '2600',
      artUnit: '2654-2658',
      description: 'Communications - Speech Processing, Audio Synthesis',
      relevance: 0.8
    });
  }

  if (hasVideo) {
    suggestions.push({
      techCenter: '2400',
      artUnit: '2482-2488',
      description: 'Networking, Multiplexing, and Video - Video Processing',
      relevance: 0.75
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      techCenter: '2100',
      artUnit: '2121-2129',
      description: 'Computer Architecture and Software (Default)',
      relevance: 0.5
    });
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance);
}
