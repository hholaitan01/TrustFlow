import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { computeTrustScore } from "@/lib/trust-score";

// POST /api/ai/trust-score
// Body: { transaction_id, seller_id, chat_text? }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transaction_id, seller_id, chat_text } = await req.json();

  const { data: seller } = await supabase
    .from("users")
    .select("*")
    .eq("id", seller_id)
    .single();

  const { data: disputes } = await supabase
    .from("disputes")
    .select("id")
    .eq("initiated_by", seller_id);

  const score = await computeTrustScore({
    seller,
    disputes: disputes ?? [],
    chat_text,
  });

  await supabase
    .from("transactions")
    .update({
      trust_score: score.score,
      risk_level: score.risk_level,
      risk_reasons: score.reasons,
    })
    .eq("id", transaction_id);

  return NextResponse.json(score);
}
