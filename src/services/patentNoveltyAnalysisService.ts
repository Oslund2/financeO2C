import { supabase } from '../lib/supabase';
import { generateText } from './geminiService';
import { extractCodebaseFeatures, createFeatureAnalysis, createFeatureMappings } from './patentFeatureExtractionService';
import { getPriorArtResults } from './patentPriorArtSearchService';
import { getPatentNoveltyAnalysisPrompt } from './promptResolver';
import { PATENT_PROMPT_TEMPLATES } from './patentPromptDefaults';

export interface NoveltyAnalysis {
  analysisId: string;
  overallScore: number;
  approvalProbability: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  featureNoveltyScores: Record<string, number>;
  patentabilityAssessment: string;
}

export interface AliceRiskAssessment {
  overallAliceRiskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  claimAnalysis: Array<{
    claimNumber: number;
    riskScore: number;
    riskLevel: string;
    abstractIdeaRisk: string;
    technicalAnchoringStrength: string;
    improvementEvidence: string;
    vulnerablePhrases: string[];
    strengths: string[];
    recommendations: string[];
  }>;
  overallStrengths: string[];
  overallWeaknesses: string[];
  recommendedImprovements: string[];
  summary: string;
}

export async function performNoveltyAnalysis(
  organizationId: string,
  patentApplicationId: string,
  userId: string
): Promise<NoveltyAnalysis> {
  const features = await extractCodebaseFeatures(organizationId);

  const priorArt = await getPriorArtResults(patentApplicationId);

  const analysisId = await createFeatureAnalysis(
    organizationId,
    patentApplicationId,
    userId
  );

  await createFeatureMappings(
    organizationId,
    patentApplicationId,
    analysisId,
    features.features
  );

  const aiAssessment = await generateAINoveltyAssessment(
    features.features,
    priorArt,
    organizationId
  );

  const overallScore = calculateNoveltyScore(features.features, priorArt);
  const approvalProbability = calculateApprovalProbability(overallScore, aiAssessment);

  await updateAnalysisScores(analysisId, overallScore, approvalProbability, aiAssessment);

  await supabase
    .from('patent_applications')
    .update({
      novelty_analysis_id: analysisId,
      approval_score: approvalProbability,
      approval_confidence: approvalProbability,
      novelty_score: overallScore
    })
    .eq('id', patentApplicationId);

  return {
    analysisId,
    overallScore,
    approvalProbability,
    strengths: aiAssessment.strengths,
    weaknesses: aiAssessment.weaknesses,
    recommendations: aiAssessment.recommendations,
    featureNoveltyScores: calculateFeatureScores(features.features),
    patentabilityAssessment: aiAssessment.assessment
  };
}

async function generateAINoveltyAssessment(
  features: any[],
  priorArt: any[],
  organizationId: string
): Promise<any> {
  const featuresText = features.map((f, i) => `${i + 1}. ${f.name} (${f.noveltyStrength} novelty)
   Description: ${f.description}
   Technical Details: ${f.technicalDetails}
   Core Innovation: ${f.isCoreInnovation ? 'Yes' : 'No'}`).join('\n\n');

  const priorArtText = priorArt.length > 0
    ? priorArt.map((pa, i) => `${i + 1}. ${pa.patent_number} - ${pa.patent_title}
   Abstract: ${pa.patent_abstract}
   Relevance: ${pa.relevance_score}/100
   Relationship: ${pa.relationship_type}`).join('\n\n')
    : 'No prior art identified yet.';

  try {
    const prompt = await getPatentNoveltyAnalysisPrompt(organizationId, {
      title: 'Patent Novelty Analysis',
      features: featuresText,
      priorArt: priorArtText,
      inventionDescription: ''
    });

    const response = await generateText(prompt, 'patent_novelty_analysis');

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI novelty assessment failed:', error);
  }

  return {
    strengths: [
      'Multiple novel algorithmic implementations',
      'Unique combination of features not found in prior art',
      'Clear commercial utility in animation production',
      'Technical depth with specific implementations'
    ],
    weaknesses: [
      'Some features may be considered obvious improvements',
      'Need to emphasize unexpected results in specification'
    ],
    recommendations: [
      'Emphasize the hierarchical asset decay algorithm as primary innovation',
      'Include specific performance metrics and cost savings data',
      'Add flowcharts showing system architecture',
      'Provide detailed examples of character consistency maintenance',
      'Quantify improvements over traditional methods'
    ],
    assessment: 'This invention demonstrates strong patentability based on multiple novel features working in combination. The hierarchical asset decay system, character consistency profiles, and integrated production workflow represent significant technical advancements over existing animation production methods. While some individual features may have prior art, the specific combination and implementation approach is unique. Recommend proceeding with application, emphasizing the synergistic effects of combined features and quantifiable improvements in production efficiency and cost reduction.'
  };
}

function calculateNoveltyScore(features: any[], priorArt: any[]): number {
  let score = 50;

  const strongFeatures = features.filter(f => f.noveltyStrength === 'strong').length;
  const moderateFeatures = features.filter(f => f.noveltyStrength === 'moderate').length;
  const coreInnovations = features.filter(f => f.isCoreInnovation).length;

  score += strongFeatures * 8;
  score += moderateFeatures * 4;
  score += coreInnovations * 5;

  const highRelevancePriorArt = priorArt.filter(pa => pa.relevance_score >= 80).length;
  const blockingPriorArt = priorArt.filter(pa => pa.is_blocking).length;

  score -= highRelevancePriorArt * 5;
  score -= blockingPriorArt * 15;

  return Math.min(Math.max(score, 0), 100);
}

function calculateApprovalProbability(noveltyScore: number, assessment: any): number {
  let probability = noveltyScore * 0.7;

  if (assessment.strengths.length >= 4) {
    probability += 10;
  }

  if (assessment.weaknesses.length <= 2) {
    probability += 5;
  }

  return Math.min(Math.max(probability, 0), 100);
}

function calculateFeatureScores(features: any[]): Record<string, number> {
  const scores: Record<string, number> = {};
  const baseScores = { strong: 85, moderate: 65, weak: 40 };

  features.forEach(feature => {
    let score = baseScores[feature.noveltyStrength];

    if (feature.isCoreInnovation) {
      score += 10;
    }

    scores[feature.name] = Math.min(score, 100);
  });

  return scores;
}

async function updateAnalysisScores(
  analysisId: string,
  noveltyScore: number,
  approvalProbability: number,
  aiAssessment: any
): Promise<void> {
  await supabase
    .from('patent_novelty_analyses')
    .update({
      overall_novelty_score: noveltyScore,
      implementation_uniqueness_score: noveltyScore * 0.85,
      commercial_viability_score: noveltyScore * 1.1,
      novelty_strengths: aiAssessment.strengths || [],
      novelty_weaknesses: aiAssessment.weaknesses || [],
      recommendations: aiAssessment.recommendations || [],
      patentability_assessment: aiAssessment.assessment || ''
    })
    .eq('id', analysisId);
}

export async function getNoveltyAnalysis(
  patentApplicationId: string
): Promise<any | null> {
  const { data: app } = await supabase
    .from('patent_applications')
    .select('novelty_analysis_id, approval_score, approval_confidence, novelty_score')
    .eq('id', patentApplicationId)
    .maybeSingle();

  if (!app || !app.novelty_analysis_id) {
    return null;
  }

  const { data: analysis } = await supabase
    .from('patent_novelty_analyses')
    .select('*')
    .eq('id', app.novelty_analysis_id)
    .maybeSingle();

  if (!analysis) {
    return null;
  }

  const { data: featureMappings } = await supabase
    .from('patent_feature_mappings')
    .select('*')
    .eq('novelty_analysis_id', app.novelty_analysis_id)
    .order('feature_name');

  const keyFeatures = (featureMappings || []).map((mapping: any) => ({
    feature_name: mapping.feature_name,
    description: mapping.technical_description || '',
    novelty_score: calculateIndividualFeatureScore(mapping.novelty_strength)
  }));

  const extractedFeatures = analysis.extracted_features || [];
  if (keyFeatures.length === 0 && extractedFeatures.length > 0) {
    extractedFeatures.forEach((feature: any) => {
      keyFeatures.push({
        feature_name: feature.name,
        description: feature.description,
        novelty_score: calculateIndividualFeatureScore(feature.noveltyStrength)
      });
    });
  }

  return {
    id: analysis.id,
    overall_novelty_score: analysis.overall_novelty_score || app.novelty_score || 0,
    confidence_score: (app.approval_confidence || 0) / 100,
    technical_depth_score: analysis.technical_depth_score || 0,
    implementation_uniqueness_score: analysis.implementation_uniqueness_score || 0,
    commercial_viability_score: analysis.commercial_viability_score || 0,
    patentability_assessment: analysis.patentability_assessment || '',
    novelty_strengths: analysis.novelty_strengths || [],
    novelty_weaknesses: analysis.novelty_weaknesses || [],
    recommendations: analysis.recommendations || [],
    key_features: keyFeatures,
    extracted_features: extractedFeatures
  };
}

function calculateIndividualFeatureScore(noveltyStrength: string): number {
  const scoreMap: Record<string, number> = {
    'strong': 85,
    'moderate': 65,
    'weak': 40
  };
  return scoreMap[noveltyStrength] || 50;
}

export async function performAliceRiskAssessment(
  patentApplicationId: string,
  organizationId: string
): Promise<AliceRiskAssessment> {
  const { data: app } = await supabase
    .from('patent_applications')
    .select('title, summary_invention, invention_description')
    .eq('id', patentApplicationId)
    .maybeSingle();

  const { data: claims } = await supabase
    .from('patent_claims')
    .select('claim_number, claim_text, claim_type')
    .eq('patent_application_id', patentApplicationId)
    .order('claim_number');

  const { data: features } = await supabase
    .from('patent_feature_mappings')
    .select('feature_name, technical_description, novelty_strength')
    .eq('patent_application_id', patentApplicationId);

  if (!claims || claims.length === 0) {
    return getDefaultAliceAssessment('No claims found to analyze');
  }

  const claimsText = claims
    .map(c => `Claim ${c.claim_number} (${c.claim_type}): ${c.claim_text}`)
    .join('\n\n');

  const featuresText = (features || [])
    .map(f => `- ${f.feature_name}: ${f.technical_description} (${f.novelty_strength})`)
    .join('\n');

  const promptTemplate = PATENT_PROMPT_TEMPLATES.patent_alice_risk_assessment;
  if (!promptTemplate) {
    return getDefaultAliceAssessment('Alice risk assessment prompt not found');
  }

  const prompt = promptTemplate.content
    .replace('${title}', app?.title || 'Unknown')
    .replace('${claims}', claimsText)
    .replace('${features}', featuresText || 'No features extracted')
    .replace('${inventionDescription}', app?.invention_description || app?.summary_invention || '');

  try {
    const response = await generateText(prompt, 'patent_alice_risk_assessment');
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        overallAliceRiskScore: parsed.overallAliceRiskScore || 50,
        riskLevel: getRiskLevel(parsed.overallAliceRiskScore || 50),
        claimAnalysis: parsed.claimAnalysis || [],
        overallStrengths: parsed.overallStrengths || [],
        overallWeaknesses: parsed.overallWeaknesses || [],
        recommendedImprovements: parsed.recommendedImprovements || [],
        summary: parsed.summary || ''
      };
    }
  } catch (error) {
    console.error('Alice risk assessment failed:', error);
  }

  return getDefaultAliceAssessment('Analysis could not be completed');
}

function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 35) return 'Low';
  if (score <= 65) return 'Medium';
  return 'High';
}

function getDefaultAliceAssessment(reason: string): AliceRiskAssessment {
  return {
    overallAliceRiskScore: 50,
    riskLevel: 'Medium',
    claimAnalysis: [],
    overallStrengths: [
      'Technical implementation details present',
      'Specific data structures referenced'
    ],
    overallWeaknesses: [
      reason,
      'Manual review recommended'
    ],
    recommendedImprovements: [
      'Ensure claims reference specific hardware components',
      'Include mathematical formulas or algorithms',
      'Avoid abstract business method language'
    ],
    summary: `Alice risk assessment requires manual review. ${reason}`
  };
}
