import { analyzeChat } from "./ai";

// Trust Score (0-100) from four weighted signals:
// Transaction History 35% | Chat Analysis 30% | Account Age 20% | Pattern Matching 15%

type Seller = {
  created_at: string;
  total_transactions: number;
  successful_transactions: number;
  phone?: string | null;
  email?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
};

type ComputeParams = {
  seller: Seller;
  disputes: { id: string }[];
  chat_text?: string;
};

export async function computeTrustScore({ seller, disputes, chat_text }: ComputeParams) {
  const reasons: string[] = [];
  let score = 0;

  // 1. Transaction History (35 points)
  const { total_transactions, successful_transactions } = seller;
  if (total_transactions === 0) {
    score += 17; // new account baseline
    reasons.push("No transaction history");
  } else {
    const successRate = successful_transactions / total_transactions;
    const historyScore = Math.round(successRate * 35);
    score += historyScore;
    if (disputes.length > 0) reasons.push(`${disputes.length} dispute(s) on record`);
  }

  // 2. Chat Analysis NLP (30 points)
  if (chat_text) {
    const analysis = await analyzeChat(chat_text);
    const chatScore = Math.round(((100 - analysis.scam_probability) / 100) * 30);
    score += chatScore;
    if (analysis.scam_probability > 50) {
      reasons.push(`High scam probability detected: ${analysis.summary}`);
    }
  } else {
    score += 15; // neutral if no chat provided
  }

  // 3. Account Age (20 points)
  const accountAgeDays =
    (Date.now() - new Date(seller.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 7) {
    score += 5;
    reasons.push("Account is less than 7 days old");
  } else if (accountAgeDays > 90 && total_transactions > 0) {
    score += 20;
  } else {
    score += Math.round((accountAgeDays / 90) * 20);
  }

  // 4. Pattern Matching (15 points)
  // Placeholder: in production cross-reference against flagged accounts DB
  const hasFraudFlags = false;
  if (hasFraudFlags) {
    score += 0;
    reasons.push("Seller matched known fraud pattern");
  } else {
    score += 15;
  }

  score = Math.min(100, Math.max(0, score));

  const risk_level =
    score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH";

  return { score, risk_level, reasons };
}
