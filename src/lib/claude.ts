export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || data.result || 'No response received.';
}

export async function analyzeStep(step: any, assumptions: any): Promise<any> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'estimate_time', data: { step, assumptions } }),
  });

  if (!response.ok) throw new Error('Analysis failed');
  const data = await response.json();

  try {
    const jsonMatch = data.result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { rationale: data.result };
  } catch {
    return { rationale: data.result };
  }
}

export async function generateSavingsNarrative(
  savings: any,
  assumptions: any,
  breakdown: any
): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'savings_narrative',
      data: { savings, assumptions, breakdown },
    }),
  });

  if (!response.ok) throw new Error('Narrative generation failed');
  const data = await response.json();
  return data.result;
}

export async function getAutomationScore(step: any): Promise<any> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'automation_score', data: { step } }),
  });

  if (!response.ok) throw new Error('Scoring failed');
  const data = await response.json();

  try {
    const jsonMatch = data.result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, rationale: data.result };
  } catch {
    return { score: 0, rationale: data.result };
  }
}

export async function resolveDispute(dispute: any): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'dispute_resolution', data: { dispute } }),
  });

  if (!response.ok) throw new Error('Dispute resolution failed');
  const data = await response.json();
  return data.result;
}

export async function draftCollectionsEmail(account: any, noticeLevel: string): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'collections_email',
      data: { account, noticeLevel },
    }),
  });

  if (!response.ok) throw new Error('Email drafting failed');
  const data = await response.json();
  return data.result;
}

export async function queryDataNL(question: string, dataContext: string): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'nl_data_query',
      data: { question, dataContext },
    }),
  });

  if (!response.ok) throw new Error('Data query failed');
  const data = await response.json();
  return data.result;
}

export async function analyzeCashMatch(payment: any, openAR: any): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'cash_match_analysis',
      data: { payment, openAR },
    }),
  });

  if (!response.ok) throw new Error('Cash match analysis failed');
  const data = await response.json();
  return data.result;
}

export async function verifyAPInvoice(details: any): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ap_verification',
      data: { details },
    }),
  });

  if (!response.ok) throw new Error('AP verification failed');
  const data = await response.json();
  return data.result;
}

export async function scanDiscrepancies(reconciliation: any): Promise<string> {
  const response = await fetch('/.netlify/functions/claude-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'discrepancy_scan',
      data: { reconciliation },
    }),
  });

  if (!response.ok) throw new Error('Discrepancy scan failed');
  const data = await response.json();
  return data.result;
}
