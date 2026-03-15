import type { Context } from "@netlify/functions";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const O2C_SYSTEM_PROMPT = `You are an AI assistant embedded in an Orders-to-Cash (O2C) Automation Planning Tool for a media company. You have deep expertise in:

1. **Wide Orbit** — the broadcast media traffic and billing system
2. **Order-to-Cash workflows** — the 7 phases: Order Entry & Validation, Traffic & Billing Handoff, Invoice Generation & Delivery, Aging & Collections Prioritization, Collections Outreach, Dispute Resolution, and Cash Application
3. **Snowflake** — where the Wide Orbit data is mirrored for safe, read-only querying
4. **Media industry AR/AP** — agency relationships, rate cards, makegoods, affidavits, as-run logs, CPM billing
5. **AI automation** — how Claude and AI agents can automate repetitive O2C tasks while keeping humans in the loop for exceptions

Key context:
- The company processes ~4,200 orders/month across multiple stations
- AR/AP has ~3.2 FTEs doing largely repetitive work
- Data fidelity is critical — the company must not short-change itself or its billable customers
- The Snowflake mirror is the key enabler — AI queries the mirror, never the live WideOrbit system
- The structural shift: AI handles retrieval, matching, drafting, and routing (high-volume, low-judgment). Humans shift from doing the work to approving the work.

You help users:
- Understand their O2C workflow and automation potential
- Estimate time savings for specific process steps
- Draft collections emails, dispute summaries, and executive summaries
- Explain how AI automation works for specific O2C tasks
- Answer questions about Wide Orbit data, Snowflake queries, and media billing
- Recommend phasing strategies for automation rollout

Be concise, practical, and specific to media industry O2C. Reference actual data points when possible. Always emphasize data fidelity and human-in-the-loop for high-risk decisions.`;

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
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured. Add it in Netlify environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { messages, context: userContext } = body;

    const systemPrompt = userContext
      ? `${O2C_SYSTEM_PROMPT}\n\nCurrent context from the application:\n${userContext}`
      : O2C_SYSTEM_PROMPT;

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
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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
