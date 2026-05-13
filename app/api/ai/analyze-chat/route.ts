import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { analyzeChat } from "@/lib/ai";

// POST /api/ai/analyze-chat
// Body: { transaction_id, chat_text }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transaction_id, chat_text } = await req.json();

  const result = await analyzeChat(chat_text);

  await supabase.from("chat_analyses").insert({
    transaction_id,
    raw_text: chat_text,
    flags: result.flags,
    scam_probability: result.scam_probability,
    analysis_summary: result.summary,
  });

  return NextResponse.json(result);
}
