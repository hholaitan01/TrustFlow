import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SCAM_DETECTION_PROMPT = `You are a fraud detection analyst.
Analyze this conversation between a buyer and seller.
Look for these red flags:
1. Urgency pressure ("Pay now", "Last one", "Someone else wants it")
2. Refusal to verify identity (no video call, no photo of item)
3. Price significantly below market value
4. Request for payment to personal account instead of business
5. Newly created social media account
6. Inconsistent product descriptions
7. Request to move conversation to another platform

Return JSON only:
{
  "scam_probability": 0-100,
  "flags": [{"type": "...", "snippet": "...", "severity": "low|medium|high"}],
  "summary": "One sentence assessment"
}`;

const DISPUTE_PROMPT = `You are a fair dispute mediator.
Given the transaction details, delivery evidence, and both parties' statements,
recommend one of:
- RELEASE: Funds go to seller (goods delivered as described)
- PARTIAL_REFUND: Split amount (goods received but not as described)
- FULL_REFUND: Return all funds to buyer (goods not received or scam)

Respond with JSON only:
{
  "verdict": "RELEASE|PARTIAL_REFUND|FULL_REFUND",
  "reasoning": "Clear explanation"
}`;

export async function analyzeChat(chat_text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SCAM_DETECTION_PROMPT },
      { role: "user", content: chat_text },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!) as {
    scam_probability: number;
    flags: { type: string; snippet: string; severity: string }[];
    summary: string;
  };
}

export async function resolveDispute(dispute: {
  reason: string;
  buyer_evidence: string | null;
  seller_evidence: string | null;
  transactions: {
    item_description: string;
    amount: number;
    tracking_number: string | null;
    estimated_delivery: string | null;
    delivered_at: string | null;
  };
}) {
  const context = JSON.stringify(dispute, null, 2);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: DISPUTE_PROMPT },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!) as {
    verdict: "RELEASE" | "PARTIAL_REFUND" | "FULL_REFUND";
    reasoning: string;
  };
}
