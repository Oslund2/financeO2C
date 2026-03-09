/**
 * Economics AI Service
 *
 * Uses Gemini (gemini-2.5-flash via VITE_GEMINI_API_KEY) to provide intelligent
 * analysis and recommendations for all Production Economics / P&L displays.
 *
 * Follows the same fetch pattern as aiPromptGenerationService.ts and
 * promptEnhancementService.ts.
 */

import type { EpisodeEconomics, BreakEvenAnalysis, ChannelEconomics, CostBreakdown } from './episodeEconomicsService';
import type { ContentNiche, AudienceType } from './youtubeRevenueService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PLInsight {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  channelStrategy: string;
}

export interface BreakEvenInsight {
  assessment: string;
  keyDrivers: string[];
  recommendations: string[];
  scenarioNote: string;
}

export interface YouTubeInsight {
  summary: string;
  growthStrategy: string[];
  monetizationTips: string[];
  nicheAdvice: string;
}

export interface SeriesInsight {
  portfolioSummary: string;
  bestPerformers: string;
  improvements: string[];
  scaleStrategy: string;
}

export interface CostBenchmarkInsight {
  benchmarkAssessment: string;
  marketComparison: string[];
  optimisationOpportunities: string[];
  competitivePosition: string;
}

export interface DecayProjectionInsight {
  decayAssessment: string;
  genreComparison: string;
  retentionDrivers: string[];
  projectionAdjustments: string[];
  longTailOpportunities: string;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY)');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048, topP: 0.95 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function parseJSONSafely<T>(text: string, fallback: T): T {
  // Strip markdown code fences if present
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // If the response has leading text before the JSON object, extract the JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

// ── Episode P&L Analysis ──────────────────────────────────────────────────────

export async function analyzeEpisodeEconomics(economics: EpisodeEconomics): Promise<PLInsight> {
  const { costs, channels, breakEven, lifetime } = economics;
  const enabledChannels = channels.filter(c => c.enabled);

  const channelSummary = enabledChannels.map(c =>
    `  - ${c.channelName} (${c.channelType}): ${formatCurrency(c.annualNetRevenue)}/yr net, CPM $${c.cpmRate}, platform fee ${c.platformFeePercent.toFixed(0)}%`
  ).join('\n');

  const prompt = `You are a media finance expert specialising in animation and video production P&L analysis. Where relevant, reference 2024-2025 industry benchmarks and research (e.g. Animation Guild wage surveys, Parrot Analytics content valuation studies, PwC Global Entertainment & Media Outlook, Ampere Analysis streaming data).

EPISODE: "${economics.episodeTitle}"
FORMAT: ${economics.format.formatLabel} (${economics.format.runtimeMinutes} min runtime, ${economics.format.contentMinutes.toFixed(1)} min content)

COST BREAKDOWN:
  AI/Token production cost: ${formatCurrency(costs.tokenCosts)}
  Human labor cost:         ${formatCurrency(costs.humanLaborCosts)}
  Dubbing/localization:     ${formatCurrency(costs.dubbingCosts)}
  Total investment:         ${formatCurrency(costs.totalInitialInvestment)}
  Cost per finished minute: ${formatCurrency(costs.costPerFinishedMinute)}

REVENUE (distribution channels):
${channelSummary}
  Total annual net revenue: ${formatCurrency(economics.totalAnnualNetRevenue)}
  Total monthly net revenue: ${formatCurrency(economics.totalMonthlyNetRevenue)}

BREAK-EVEN:
  Break-even timeline: ${breakEven.breakEvenMonths.toFixed(1)} months (${breakEven.breakEvenYears.toFixed(2)} years)
  Avg net CPM across channels: $${breakEven.avgNetCpmAcrossChannels.toFixed(2)}

LIFETIME PROJECTION (${lifetime.yearsInService} years):
  Gross lifetime revenue: ${formatCurrency(lifetime.grossLifetimeRevenue)}
  Net lifetime revenue:   ${formatCurrency(lifetime.netLifetimeRevenue)}
  Lifetime profit:        ${formatCurrency(lifetime.lifetimeProfit)}
  Lifetime margin:        ${lifetime.lifetimeMargin.toFixed(1)}%
  ROI multiple:           ${lifetime.roiMultiple.toFixed(2)}x

Provide a concise but expert analysis as JSON with this exact structure (no markdown fences):
{
  "summary": "2-3 sentence executive summary of the P&L health",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "channelStrategy": "1-2 sentences on optimising the distribution channel mix"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<PLInsight>(text, {
    summary: text.slice(0, 300),
    strengths: [],
    risks: [],
    recommendations: [],
    channelStrategy: ''
  });
}

// ── Break-Even Analysis ───────────────────────────────────────────────────────

export async function analyzeBreakEven(
  breakEven: BreakEvenAnalysis,
  costs: CostBreakdown
): Promise<BreakEvenInsight> {
  const linearLines = breakEven.linearChannelBreakEven.map(c =>
    `  - ${c.channelName}: ${c.airingsNeeded.toFixed(0)} airings, ~${c.monthsNeeded.toFixed(0)} months if sole channel`
  ).join('\n');

  const onDemandLines = breakEven.onDemandChannelBreakEven.map(c =>
    `  - ${c.channelName}: ${(c.viewsNeeded / 1000).toFixed(0)}K views, ~${c.monthsNeeded.toFixed(0)} months if sole channel`
  ).join('\n');

  const prompt = `You are a media finance expert. Analyse this episode break-even data and provide strategic recommendations. Reference 2024-2025 industry benchmarks where relevant (e.g. typical broadcast CPM ranges, streaming platform payout rates from Variety/Deadline reporting, Ampere Analysis content break-even research).

INVESTMENT: ${formatCurrency(breakEven.totalInvestment)}
  AI/token costs:  ${formatCurrency(costs.tokenCosts)}
  Human labor:     ${formatCurrency(costs.humanLaborCosts)}
  Dubbing:         ${formatCurrency(costs.dubbingCosts)}

COMBINED BREAK-EVEN (all channels):
  Timeline: ${breakEven.breakEvenMonths.toFixed(1)} months (${breakEven.breakEvenYears.toFixed(2)} years)
  Monthly net revenue: ${formatCurrency(breakEven.totalMonthlyNetRevenue)}
  Total impressions needed: ${(breakEven.breakEvenImpressions / 1000).toFixed(0)}K
  Average net CPM: $${breakEven.avgNetCpmAcrossChannels.toFixed(2)}

LINEAR CHANNEL BREAK-EVEN (if sole distribution):
${linearLines || '  None configured'}

ON-DEMAND CHANNEL BREAK-EVEN (if sole distribution):
${onDemandLines || '  None configured'}

Return JSON only (no markdown fences):
{
  "assessment": "1-2 sentence honest assessment of break-even health",
  "keyDrivers": ["top driver 1", "top driver 2", "top driver 3"],
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "scenarioNote": "What-if insight: which single channel change would most accelerate break-even?"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<BreakEvenInsight>(text, {
    assessment: text.slice(0, 200),
    keyDrivers: [],
    recommendations: [],
    scenarioNote: ''
  });
}

// ── Channel Mix Analysis ──────────────────────────────────────────────────────

export async function analyzeChannelMix(
  channels: ChannelEconomics[],
  totalInvestment: number,
  formatLabel: string
): Promise<{ analysis: string; priorities: string[]; warnings: string[] }> {
  const enabledChannels = channels.filter(c => c.enabled);
  const disabledChannels = channels.filter(c => !c.enabled);

  const enabledSummary = enabledChannels.map(c =>
    `  - ${c.channelName} (${c.channelType}): $${c.cpmRate} CPM, ${formatCurrency(c.annualNetRevenue)}/yr net, ${c.platformFeePercent.toFixed(0)}% platform fee`
  ).join('\n');

  const disabledSummary = disabledChannels.map(c =>
    `  - ${c.channelName} (${c.channelType}): disabled`
  ).join('\n');

  const prompt = `You are a media distribution strategist. Analyse this distribution channel mix for a ${formatLabel} production.

TOTAL INVESTMENT: ${formatCurrency(totalInvestment)}

ACTIVE CHANNELS:
${enabledSummary || '  None'}

INACTIVE CHANNELS:
${disabledSummary || '  None'}

Return JSON only (no markdown fences):
{
  "analysis": "2-sentence assessment of the current channel strategy",
  "priorities": ["priority action 1", "priority action 2", "priority action 3"],
  "warnings": ["warning or gap 1", "warning or gap 2"]
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely(text, { analysis: text.slice(0, 200), priorities: [], warnings: [] });
}

// ── YouTube Revenue Analysis ──────────────────────────────────────────────────

export async function analyzeYouTubeRevenue(
  monthlyViews: number,
  niche: ContentNiche,
  audienceType: AudienceType,
  scenario: 'conservative' | 'moderate' | 'optimistic',
  adRevenueNet: number,
  sponsorshipMid: number,
  totalMid: number
): Promise<YouTubeInsight> {
  const rpm = adRevenueNet / (monthlyViews / 1000);

  const prompt = `You are a YouTube monetisation expert specialising in animation and kids/family content. Base your advice on the latest 2024-2025 data: Influencer Marketing Hub YouTube Money Calculator benchmarks, SocialBlade CPM reports, Think with Google Kids content monetisation research, and creator economy reports from Conviva and Tubular Labs.

CHANNEL PROFILE:
  Content niche: ${niche.replace(/_/g, ' ')}
  Audience type: ${audienceType}
  Monthly views: ${(monthlyViews / 1000).toFixed(0)}K
  Scenario: ${scenario}

REVENUE ESTIMATES:
  Ad revenue (net):    $${adRevenueNet.toFixed(0)}/mo (effective RPM: $${rpm.toFixed(2)})
  Sponsorship (mid):   $${sponsorshipMid.toFixed(0)}/mo
  Total combined:      $${totalMid.toFixed(0)}/mo / $${(totalMid * 12).toFixed(0)}/yr

Return JSON only (no markdown fences):
{
  "summary": "2-sentence summary of the revenue outlook for this channel profile",
  "growthStrategy": ["growth tactic 1", "growth tactic 2", "growth tactic 3"],
  "monetizationTips": ["monetisation tip 1", "monetisation tip 2", "monetisation tip 3"],
  "nicheAdvice": "Specific advice for the ${niche.replace(/_/g, ' ')} niche — CPM expectations, sponsorship opportunities, COPPA considerations if applicable"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<YouTubeInsight>(text, {
    summary: text.slice(0, 200),
    growthStrategy: [],
    monetizationTips: [],
    nicheAdvice: ''
  });
}

// ── Revenue Projection Analysis (ShowRevenueEstimator data) ──────────────────

export async function analyzeRevenueProjection(params: {
  episodeTitle: string;
  productionCost: number;
  episodeCount: number;
  annualRunsPerEpisode: number;
  totalRevenue: number;
  grossProfit: number;
  margin: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  lifetimeMargin: number;
  paybackPeriodYears: number | null;
  averageAnnualProfit: number;
  yearsInService: number;
}): Promise<PLInsight> {
  const prompt = `You are a media finance expert. Analyse this episode revenue and profit projection. Reference 2024-2025 industry data where relevant (PwC Entertainment & Media Outlook, Parrot Analytics content valuation, SVOD payout benchmarks from Variety Intelligence Platform).

EPISODE: "${params.episodeTitle}"
PRODUCTION COST: ${formatCurrency(params.productionCost)}
SERIES SIZE: ${params.episodeCount} episodes
ANNUAL RUNS PER EPISODE: ${params.annualRunsPerEpisode}

YEAR-1 PROJECTIONS:
  Total annual revenue:  ${formatCurrency(params.totalRevenue)}
  Gross profit (Year 1): ${formatCurrency(params.grossProfit)}
  Profit margin (Year 1): ${params.margin.toFixed(1)}%

LIFETIME PROJECTIONS (${params.yearsInService} years):
  Lifetime revenue: ${formatCurrency(params.lifetimeRevenue)}
  Lifetime profit:  ${formatCurrency(params.lifetimeProfit)}
  Lifetime margin:  ${params.lifetimeMargin.toFixed(1)}%
  Avg annual profit: ${formatCurrency(params.averageAnnualProfit)}
  Payback period:   ${params.paybackPeriodYears !== null ? params.paybackPeriodYears.toFixed(1) + ' years' : 'Not reached in projection'}

Return JSON only (no markdown fences):
{
  "summary": "2-3 sentence executive summary of the P&L outlook",
  "strengths": ["financial strength 1", "financial strength 2"],
  "risks": ["financial risk 1", "financial risk 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "channelStrategy": "How should distribution be optimised to improve these metrics?"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<PLInsight>(text, {
    summary: text.slice(0, 300),
    strengths: [],
    risks: [],
    recommendations: [],
    channelStrategy: ''
  });
}

// ── Series Portfolio Analysis ─────────────────────────────────────────────────

export async function analyzeSeriesPerformance(totals: {
  totalInvestment: number;
  totalAnnualNetRevenue: number;
  totalMonthlyNetRevenue: number;
  totalLifetimeProfit: number;
  averageRoiMultiple: number;
  seriesBreakEvenMonths: number;
  episodeCount: number;
}): Promise<SeriesInsight> {
  const prompt = `You are a media production finance expert. Analyse this series-level P&L portfolio. Reference 2024-2025 industry research (Ampere Analysis series economics, Animation Guild cost surveys, kids/animation co-production financing benchmarks from MIPCOM/Kidscreen reports).

SERIES PORTFOLIO (${totals.episodeCount} episodes):
  Total production investment:  ${formatCurrency(totals.totalInvestment)}
  Annual net revenue:           ${formatCurrency(totals.totalAnnualNetRevenue)}
  Monthly net revenue:          ${formatCurrency(totals.totalMonthlyNetRevenue)}
  Series break-even:            ${totals.seriesBreakEvenMonths.toFixed(1)} months
  Lifetime profit (projected):  ${formatCurrency(totals.totalLifetimeProfit)}
  Average ROI multiple:         ${totals.averageRoiMultiple.toFixed(2)}x
  Avg cost per episode:         ${formatCurrency(totals.totalInvestment / Math.max(totals.episodeCount, 1))}
  Avg revenue per episode/yr:   ${formatCurrency(totals.totalAnnualNetRevenue / Math.max(totals.episodeCount, 1))}

Return JSON only (no markdown fences):
{
  "portfolioSummary": "2-3 sentence honest assessment of series financial health and trajectory",
  "bestPerformers": "What episode profile or channel configuration is driving the best returns?",
  "improvements": ["improvement area 1", "improvement area 2", "improvement area 3"],
  "scaleStrategy": "How should this creator scale — more episodes, higher CPM channels, co-productions, licensing?"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<SeriesInsight>(text, {
    portfolioSummary: text.slice(0, 250),
    bestPerformers: '',
    improvements: [],
    scaleStrategy: ''
  });
}

// ── AI Cost Benchmark Analysis ────────────────────────────────────────────────

export async function analyzeCostBenchmark(params: {
  aiProductionCost: number;
  traditionalCost: number;
  freelanceCost: number | null;
  creatorCost: number | null;
  runtimeMinutes: number;
  animationStyle?: string;
}): Promise<CostBenchmarkInsight> {
  const aiCpm = params.runtimeMinutes > 0 ? params.aiProductionCost / params.runtimeMinutes : 0;
  const tradCpm = params.runtimeMinutes > 0 ? params.traditionalCost / params.runtimeMinutes : 0;

  const prompt = `You are an animation production finance analyst with deep knowledge of 2024-2025 AI-assisted and traditional production costs. Compare the following production costs against current industry benchmarks.

PRODUCTION COSTS (per episode, ${params.runtimeMinutes} min runtime):
  AI-Assisted production:   ${formatCurrency(params.aiProductionCost)} (${formatCurrency(aiCpm)}/min)
  Traditional studio:       ${formatCurrency(params.traditionalCost)} (${formatCurrency(tradCpm)}/min)
  ${params.freelanceCost !== null ? `Freelance (Fiverr/Upwork): ${formatCurrency(params.freelanceCost)}` : ''}
  ${params.creatorCost !== null ? `In-house creator team:     ${formatCurrency(params.creatorCost)}` : ''}
  ${params.animationStyle ? `Animation style: ${params.animationStyle}` : ''}

Use 2024-2025 industry benchmarks:
- Traditional 2D TV animation: $100K-$500K per half-hour (Animation Guild / Variety)
- Stop-motion/claymation premium: 2-4x 2D costs (Laika, Mackinnon & Saunders pricing)
- AI-assisted animation pipelines: $1K-$15K per finished minute (2024 AI production surveys)
- Freelance animation (Fiverr/Upwork): $500-$5K per minute depending on quality tier
- ElevenLabs voice synthesis: ~$0.30/1K characters; Runway/Sora video gen: ~$0.05-0.10/second

Return JSON only (no markdown fences):
{
  "benchmarkAssessment": "2-sentence assessment of how these costs compare to 2024-2025 industry benchmarks",
  "marketComparison": ["comparison data point 1 with source", "comparison data point 2 with source", "comparison data point 3 with source"],
  "optimisationOpportunities": ["cost reduction opportunity 1", "cost reduction opportunity 2", "cost reduction opportunity 3"],
  "competitivePosition": "1-2 sentences on the competitive cost advantage or disadvantage of the AI-assisted approach vs market alternatives"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<CostBenchmarkInsight>(text, {
    benchmarkAssessment: text.slice(0, 250),
    marketComparison: [],
    optimisationOpportunities: [],
    competitivePosition: ''
  });
}

// ── Decay Projection Analysis ─────────────────────────────────────────────────

export async function analyzeDecayProjection(params: {
  yearlyBreakdown: Array<{ year: number; revenue: number; retentionPercent: number; profit: number; cumulativeProfit: number }>;
  decayRatePercent: number;
  minimumRetentionPercent: number;
  productionCost: number;
  yearsInService: number;
  genre?: string;
}): Promise<DecayProjectionInsight> {
  const yr1Revenue = params.yearlyBreakdown[0]?.revenue ?? 0;
  const yr3Revenue = params.yearlyBreakdown[2]?.revenue ?? 0;
  const finalRevenue = params.yearlyBreakdown[params.yearlyBreakdown.length - 1]?.revenue ?? 0;
  const finalRetention = params.yearlyBreakdown[params.yearlyBreakdown.length - 1]?.retentionPercent ?? params.minimumRetentionPercent;

  const prompt = `You are a content valuation expert specialising in long-tail revenue modelling for animation and children's media. Analyse the content decay model and suggest refinements based on 2024-2025 research.

DECAY MODEL CONFIGURATION:
  Annual decay rate:       ${params.decayRatePercent}% per year
  Minimum floor:           ${params.minimumRetentionPercent}% of Year 1 revenue
  Years in service:        ${params.yearsInService} years
  ${params.genre ? `Genre: ${params.genre}` : ''}

PROJECTED REVENUE TRAJECTORY:
  Production cost:   ${formatCurrency(params.productionCost)}
  Year 1 revenue:    ${formatCurrency(yr1Revenue)}
  Year 3 revenue:    ${formatCurrency(yr3Revenue)}
  Final year revenue: ${formatCurrency(finalRevenue)} (${finalRetention.toFixed(0)}% retention floor)

RESEARCH CONTEXT — reference these 2024-2025 benchmarks:
- Children's animation has 25-40% lower decay than adult content due to repeat viewing (Parrot Analytics 2024)
- SVOD library content typically decays 15-25%/year in viewing; AVOD slower at 10-18%/year (Ampere Analysis)
- Evergreen content (preschool, educational) retains 30-50% of peak revenue in years 5-10 (Kidscreen research)
- Physical merchandise extensions can reverse decay curves for strong IP (NPD Group licensing data)
- Multi-language dubbing increases long-tail retention by 15-20% in non-English markets (MIPJunior 2024)

Return JSON only (no markdown fences):
{
  "decayAssessment": "2-sentence honest assessment of whether this decay model is realistic for the content type",
  "genreComparison": "How does this content's projected decay compare to genre benchmarks from 2024-2025 research?",
  "retentionDrivers": ["factor that slows decay 1", "factor that slows decay 2", "factor that accelerates decay"],
  "projectionAdjustments": ["specific adjustment recommendation 1", "specific adjustment recommendation 2"],
  "longTailOpportunities": "What licensing, merchandising, or distribution strategies could extend the revenue curve beyond the current projection?"
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<DecayProjectionInsight>(text, {
    decayAssessment: text.slice(0, 200),
    genreComparison: '',
    retentionDrivers: [],
    projectionAdjustments: [],
    longTailOpportunities: ''
  });
}

// ── Greenlight Score ──────────────────────────────────────────────────────────

export interface GreenlightScoreResult {
  overallScore: number; // 0-100
  scoreLabel: string;   // e.g. "Strong Greenlight"
  breakEvenEstimate: string;
  roiProbabilityRange: string;
  formatRecommendation: string;
  distributionStrategy: string;
  riskFactors: string[];
  goNoGo: string; // Clear recommendation sentence
  scoreImprovements: string[]; // Actionable steps to raise the greenlight score
}

export async function analyzeGreenlightScore(params: {
  genre: string;
  targetAudience: string;
  runtimeMinutes: number;
  characterCount: number;
  targetChannels: string[];
  estimatedBudgetPerEpisode: number;
  episodeCount: number;
}): Promise<GreenlightScoreResult> {
  const channelList = params.targetChannels.join(', ') || 'unspecified';

  const costPerMinute = params.runtimeMinutes > 0 ? params.estimatedBudgetPerEpisode / params.runtimeMinutes : 0;
  const totalBudget = params.estimatedBudgetPerEpisode * params.episodeCount;
  const channelCount = params.targetChannels.length;

  const prompt = `You are a media greenlight executive and production finance expert. Evaluate this concept BEFORE production begins and deliver a pre-production greenlight score based on 2024-2025 market conditions.

IMPORTANT: Do NOT default to 50. Score the concept honestly using the rubric below.

CONCEPT PARAMETERS:
  Genre:                   ${params.genre}
  Target audience:         ${params.targetAudience}
  Runtime per episode:     ${params.runtimeMinutes} minutes
  Character count:         ${params.characterCount} characters
  Target channels:         ${channelList} (${channelCount} channel${channelCount !== 1 ? 's' : ''})
  Budget per episode:      ${formatCurrency(params.estimatedBudgetPerEpisode)} (${formatCurrency(costPerMinute)}/min)
  Planned episode count:   ${params.episodeCount}
  Total series budget:     ${formatCurrency(totalBudget)}

SCORING RUBRIC — use ALL of these factors:

Budget efficiency (0-25 points):
  - AI-assisted animation at <$500/min is exceptional (25 pts)
  - $500-$1,500/min is strong (18-22 pts)
  - $1,500-$5,000/min is moderate (10-17 pts)
  - >$5,000/min is weak for AI-assisted, needs justification (0-9 pts)

Market fit (0-25 points):
  - Preschool/educational + COPPA-safe = high CPM potential (20-25 pts)
  - Kids adventure/comedy with broad appeal = solid (15-19 pts)
  - Niche audience or saturated genre = harder path (5-14 pts)

Distribution coverage (0-25 points):
  - 3+ platforms including YouTube + FAST channel = excellent (22-25 pts)
  - 2 platforms = good (14-21 pts)
  - Single platform = risky concentration (5-13 pts)
  - No channels specified = major gap (0-4 pts)

Scale & format (0-25 points):
  - 11-min format + 13+ episodes + <15 characters = ideal for rapid ROI (22-25 pts)
  - 22-min format, moderate episode count, reasonable cast = solid (14-21 pts)
  - Long format, few episodes, or 20+ characters = higher risk (5-13 pts)

Total = sum of all four categories (0-100).

MARKET CONTEXT (2024-2025):
- Kids/family animation with <20 characters has faster production cycles and lower cost overrun risk
- 11-minute format breaks even 30-40% faster than 22-minute for AVOD/YouTube distribution
- Educational/preschool content commands 20-35% CPM premium on connected TV platforms
- Multi-platform launch (YouTube + FAST) reduces break-even timeline by 25-40% vs single channel
- Children's animation ROI range: 0.8x-4.5x depending on distribution mix (Parrot Analytics 2024)

Return ONLY valid JSON (no markdown fences, no extra text before or after):
{
  "overallScore": <integer 0-100 calculated from rubric>,
  "scoreLabel": "<Weak (0-30) / Marginal (31-50) / Moderate (51-65) / Strong (66-80) / Exceptional (81-100)> Greenlight",
  "breakEvenEstimate": "<e.g. '8-14 months with YouTube + Tubi' — be specific to this concept's channels and budget>",
  "roiProbabilityRange": "<e.g. '2.1x-3.8x over 5 years — 80% probability of positive ROI' — derive from budget efficiency and channel mix>",
  "formatRecommendation": "<specific recommendation about runtime, character count, or format adjustments with projected impact — e.g. 'Switching from 22-min to 11-min format would reduce per-episode cost by ~45% and accelerate break-even by 35%'>",
  "distributionStrategy": "<recommended first-window and secondary distribution strategy with rationale based on the genre and audience>",
  "riskFactors": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "goNoGo": "<1 clear sentence: GREENLIGHT / CONDITIONAL GREENLIGHT / PASS — with the specific reason>",
  "scoreImprovements": ["<specific, actionable change that would increase the score, with estimated point impact — e.g. 'Add a third distribution channel (e.g. Tubi) to raise Distribution Coverage score by 8-10 pts'>", "<improvement 2>", "<improvement 3>", "<improvement 4>"]
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<GreenlightScoreResult>(text, {
    overallScore: 50,
    scoreLabel: 'Moderate Greenlight',
    breakEvenEstimate: 'Unable to estimate — try again',
    roiProbabilityRange: '',
    formatRecommendation: text.slice(0, 200),
    distributionStrategy: '',
    riskFactors: [],
    goNoGo: '',
    scoreImprovements: []
  });
}

// ── Distribution Package Generator ───────────────────────────────────────────

export interface DistributionPackage {
  youtube: {
    title: string;
    description: string;
    tags: string[];
    chapterTimestamps: string;
    thumbnailConcepts: string[];
  };
  fastAvod: {
    epgTitle: string;
    epgDescription: string;
    xmlSnippet: string;
    recommendedPlatforms: string[];
  };
  broadcastPitch: {
    logline: string;
    formatSpec: string;
    costRoiSnapshot: string;
    compTitles: string[];
    pitchSummary: string;
  };
}

export async function generateDistributionPackage(params: {
  episodeTitle: string;
  seriesTitle?: string;
  genre: string;
  targetAudience: string;
  runtimeMinutes: number;
  synopsis: string;
  productionCost: number;
  roiMultiple: number;
  breakEvenMonths: number;
  distributionChannels: string[];
}): Promise<DistributionPackage> {
  const costFmt = formatCurrency(params.productionCost);

  const prompt = `You are a distribution and marketing expert for animation and children's media. Generate a complete distribution package for the following content.

EPISODE: "${params.episodeTitle}"${params.seriesTitle ? ` (Series: "${params.seriesTitle}")` : ''}
GENRE: ${params.genre}
TARGET AUDIENCE: ${params.targetAudience}
RUNTIME: ${params.runtimeMinutes} minutes
SYNOPSIS: ${params.synopsis}
PRODUCTION COST: ${costFmt}
ROI MULTIPLE: ${params.roiMultiple.toFixed(2)}x
BREAK-EVEN: ${params.breakEvenMonths.toFixed(0)} months
CURRENT CHANNELS: ${params.distributionChannels.join(', ') || 'not specified'}

Return JSON only (no markdown fences):
{
  "youtube": {
    "title": "<SEO-optimised YouTube title, max 70 chars, include key search terms>",
    "description": "<YouTube description, 3-4 paragraphs: hook, episode summary, series context, CTA + hashtags>",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
    "chapterTimestamps": "<Chapter timestamps formatted as: 0:00 Intro\\n1:30 [Chapter Name]\\n... >",
    "thumbnailConcepts": ["concept 1: describe character, action, text overlay, color palette", "concept 2", "concept 3"]
  },
  "fastAvod": {
    "epgTitle": "<Clean EPG programme title, max 40 chars>",
    "epgDescription": "<EPG short description, max 150 chars for Tubi/Pluto/Peacock>",
    "xmlSnippet": "<Complete XMLTV-format programme element snippet ready to paste>",
    "recommendedPlatforms": ["Tubi", "Pluto TV", "Peacock Free", "Samsung TV Plus", "Amazon Freevee"]
  },
  "broadcastPitch": {
    "logline": "<One-sentence logline in present tense>",
    "formatSpec": "<Format specification: runtime, content minutes, break structure, episodes in series>",
    "costRoiSnapshot": "<Cost and ROI summary for pitch deck: 2-3 sentences with numbers>",
    "compTitles": ["comp title 1 (network/platform)", "comp title 2", "comp title 3"],
    "pitchSummary": "<Full broadcast pitch paragraph: concept, audience, competitive landscape, revenue potential>"
  }
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<DistributionPackage>(text, {
    youtube: {
      title: params.episodeTitle,
      description: params.synopsis,
      tags: [],
      chapterTimestamps: '0:00 Intro',
      thumbnailConcepts: []
    },
    fastAvod: {
      epgTitle: params.episodeTitle.slice(0, 40),
      epgDescription: params.synopsis.slice(0, 150),
      xmlSnippet: '',
      recommendedPlatforms: ['Tubi', 'Pluto TV']
    },
    broadcastPitch: {
      logline: '',
      formatSpec: `${params.runtimeMinutes}-minute episode`,
      costRoiSnapshot: `Production cost: ${costFmt}. ROI: ${params.roiMultiple.toFixed(2)}x.`,
      compTitles: [],
      pitchSummary: text.slice(0, 300)
    }
  });
}

// ── Episode Performance Feedback Loop ────────────────────────────────────────

export interface FeedbackLoopInsight {
  performanceSummary: string;
  varianceAnalysis: string;
  revisedDecayRate: number;
  revisedDecayRationale: string;
  topRoiDecisions: string[];
  nextEpisodeRecommendation: string;
  projectionAccuracyScore: number; // 0-100, how close projections were to actuals
}

export async function analyzePerformanceFeedback(params: {
  episodeTitle: string;
  projectedMonthlyViews: number;
  actualMonthlyViews: number;
  projectedMonthlyRevenue: number;
  actualMonthlyRevenue: number;
  daysLive: number;
  productionCost: number;
  topPerformingProductionDecisions: string[];
  genre: string;
  targetAudience: string;
  currentDecayRate: number;
}): Promise<FeedbackLoopInsight> {
  const viewsVariance = params.actualMonthlyViews > 0
    ? ((params.actualMonthlyViews - params.projectedMonthlyViews) / Math.max(params.projectedMonthlyViews, 1)) * 100
    : 0;
  const revenueVariance = params.actualMonthlyRevenue > 0
    ? ((params.actualMonthlyRevenue - params.projectedMonthlyRevenue) / Math.max(params.projectedMonthlyRevenue, 1)) * 100
    : 0;

  const decisionsText = params.topPerformingProductionDecisions.length > 0
    ? params.topPerformingProductionDecisions.map((d, i) => `  ${i + 1}. ${d}`).join('\n')
    : '  None specified';

  const prompt = `You are a content performance analyst specialising in animation and children's media. Analyse the first ${params.daysLive} days of performance against projections and recalibrate the content decay model.

EPISODE: "${params.episodeTitle}"
GENRE: ${params.genre} | AUDIENCE: ${params.targetAudience}
PRODUCTION COST: ${formatCurrency(params.productionCost)}
DAYS LIVE: ${params.daysLive}

PERFORMANCE VS PROJECTIONS:
  Projected monthly views:   ${(params.projectedMonthlyViews / 1000).toFixed(0)}K
  Actual monthly views:      ${(params.actualMonthlyViews / 1000).toFixed(0)}K  (${viewsVariance >= 0 ? '+' : ''}${viewsVariance.toFixed(0)}%)
  Projected monthly revenue: ${formatCurrency(params.projectedMonthlyRevenue)}
  Actual monthly revenue:    ${formatCurrency(params.actualMonthlyRevenue)}  (${revenueVariance >= 0 ? '+' : ''}${revenueVariance.toFixed(0)}%)
  Current decay rate model:  ${params.currentDecayRate}% per year

PRODUCTION DECISIONS THAT PERFORMED WELL:
${decisionsText}

BENCHMARKS (2024-2025):
- Children's animation: 15-25% annual decay is typical; evergreen educational content: 8-15%
- Content underperforming by >30% at 90 days rarely recovers without promotion/algorithmic boost
- Content overperforming by >20% at 90 days typically sustains 60-70% of that lift long-term
- YouTube Kids algorithm heavily favours watch-time completion rate; short-form (<12 min) sees 15-20% higher completion

Return JSON only (no markdown fences):
{
  "performanceSummary": "2-sentence honest assessment of how the episode performed vs projections",
  "varianceAnalysis": "Why did performance diverge from projections? Cite likely causes (algorithm, content quality, timing, audience match)",
  "revisedDecayRate": <number, new recommended annual decay rate %>,
  "revisedDecayRationale": "Why this decay rate is more accurate given observed performance",
  "topRoiDecisions": ["production decision with best ROI impact 1", "decision 2", "decision 3"],
  "nextEpisodeRecommendation": "One specific, concrete recommendation for the next episode based on this data",
  "projectionAccuracyScore": <integer 0-100, 100 = projections were perfect>
}`;

  const text = await callGemini(prompt);
  return parseJSONSafely<FeedbackLoopInsight>(text, {
    performanceSummary: text.slice(0, 200),
    varianceAnalysis: '',
    revisedDecayRate: params.currentDecayRate,
    revisedDecayRationale: '',
    topRoiDecisions: [],
    nextEpisodeRecommendation: '',
    projectionAccuracyScore: 50
  });
}
