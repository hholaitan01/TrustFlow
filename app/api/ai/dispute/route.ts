import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { resolveDispute } from "@/lib/ai";

// POST /api/ai/dispute
// Body: { dispute_id }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dispute_id } = await req.json();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*, transactions(*)")
    .eq("id", dispute_id)
    .single();

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const recommendation = await resolveDispute(dispute);

  await supabase
    .from("disputes")
    .update({
      ai_recommendation: recommendation.verdict,
      ai_reasoning: recommendation.reasoning,
    })
    .eq("id", dispute_id);

  return NextResponse.json(recommendation);
}
