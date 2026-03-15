import type { Context } from "@netlify/functions";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { type, data } = await req.json();

    const prompts: Record<string, string> = {
      estimate_time: `You are analyzing a workflow step in an Orders-to-Cash process for a media company using Wide Orbit.

Given this step:
${JSON.stringify(data.step, null, 2)}

And these volume assumptions:
- Monthly order volume: ${data.assumptions?.monthlyOrderVolume || 4200}
- Current FTEs: ${data.assumptions?.fteCount || 3.2}

Provide a JSON response with:
{
  "manualTimeMinutes": <your estimate for manual processing time per occurrence>,
  "automatedTimeMinutes": <your estimate for AI-automated time per occurrence>,
  "confidence": "high" | "medium" | "low",
  "rationale": "<2-3 sentences explaining your estimate>",
  "automationApproach": "<how Claude/AI would handle this step>",
  "riskFactors": ["<list of risks to watch>"]
}

Be realistic. Base estimates on typical media industry AR/AP workflows.`,

      savings_narrative: `You are writing an executive summary for a finance leadership meeting about O2C automation.

Here are the savings calculations:
${JSON.stringify(data.savings, null, 2)}

Assumptions:
${JSON.stringify(data.assumptions, null, 2)}

Phase breakdown:
${JSON.stringify(data.breakdown, null, 2)}

Write a 3-4 paragraph executive narrative that:
1. Opens with the headline savings number and what it means in practical terms
2. Explains which phases drive the most value and why
3. Addresses data fidelity — how automation maintains accuracy
4. Closes with a recommended first step

Tone: confident but not salesy. This is an internal finance presentation. Use specific numbers from the data.`,

      automation_score: `Rate the automation potential of this O2C workflow step on a scale of 1-10.

Step: ${JSON.stringify(data.step, null, 2)}

Return JSON:
{
  "score": <1-10>,
  "rationale": "<why this score>",
  "quickWins": ["<immediate automation opportunities>"],
  "humanRequired": ["<aspects that still need human judgment>"]
}`,

      dispute_resolution: `You are an AI assistant resolving a billing dispute for a media company.

Dispute details:
${JSON.stringify(data.dispute, null, 2)}

Generate a complete dispute resolution summary including:
1. Summary of the dispute
2. Evidence gathered (reference specific documents)
3. Root cause analysis
4. Recommended resolution
5. Action items

Be specific and reference actual order numbers, dates, and amounts from the data provided.`,

      collections_email: `Draft a professional but personalized collections email for a media company.

Account details:
${JSON.stringify(data.account, null, 2)}

The email should:
1. Reference specific invoice numbers and amounts
2. Mention the actual spots/flights that were aired
3. Be firm but maintain the agency relationship
4. Include a clear call to action with deadline

This is a ${data.noticeLevel || 'first'} notice.`,
    };

    const prompt = prompts[type];
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: `Unknown analysis type: ${type}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    return new Response(JSON.stringify({ result: text, type }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
