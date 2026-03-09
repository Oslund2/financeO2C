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
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
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

  const prompt = `You are a media finance expert specialising in animation and video production P&L analysis.

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

  const prompt = `You are a media finance expert. Analyse this episode break-even data and provide strategic recommendations.

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

  const prompt = `You are a YouTube monetisation expert specialising in animation and kids/family content.

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
  const prompt = `You are a media finance expert. Analyse this episode revenue and profit projection.

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
  const prompt = `You are a media production finance expert. Analyse this series-level P&L portfolio.

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
