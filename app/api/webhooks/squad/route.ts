import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase";

// POST /api/webhooks/squad
// Verify x-squad-signature (HMAC SHA512), update transaction status to FUNDED,
// then trigger Trust Score AI analysis.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-squad-encrypted-body") ?? "";

  const hash = crypto
    .createHmac("sha512", process.env.SQUAD_SECRET_KEY!)
    .update(body)
    .digest("hex")
    .toUpperCase();

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { transaction_ref } = event.data ?? {};

  if (!transaction_ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const supabase = createClient();
  await supabase
    .from("transactions")
    .update({ status: "FUNDED", squad_gateway_ref: event.data.gateway_ref })
    .eq("transaction_ref", transaction_ref);

  // TODO: trigger trust score analysis via /api/ai/trust-score

  return NextResponse.json({ received: true });
}
