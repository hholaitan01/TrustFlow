import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { releasePayout } from "@/lib/squad";
import { generateRef } from "@/lib/utils";

// POST /api/payout
// Body: { transaction_id }
// Called when buyer confirms receipt — releases escrowed funds to seller.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transaction_id } = await req.json();

  const { data: tx } = await supabase
    .from("transactions")
    .select("*, users!seller_id(*)")
    .eq("id", transaction_id)
    .single();

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (tx.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tx.status !== "DELIVERED") return NextResponse.json({ error: "Transaction not ready for payout" }, { status: 400 });

  const payout_ref = generateRef();

  await releasePayout({
    transaction_reference: payout_ref,
    amount: tx.amount,
    bank_code: tx.users.bank_code,
    account_number: tx.users.account_number,
    account_name: tx.users.account_name,
    remark: `TrustFlow payout for ${tx.item_description}`,
  });

  await supabase
    .from("transactions")
    .update({ status: "RELEASED", confirmed_at: new Date().toISOString(), payout_ref })
    .eq("id", transaction_id);

  // Update trust scores for both parties
  await supabase.rpc("increment_successful_transaction", { user_id: tx.seller_id });
  await supabase.rpc("increment_total_transaction", { user_id: tx.buyer_id });

  return NextResponse.json({ success: true, payout_ref });
}
