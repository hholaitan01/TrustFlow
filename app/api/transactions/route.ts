import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { initSquadPayment } from "@/lib/squad";
import { generateRef } from "@/lib/utils";

// GET  /api/transactions  — list transactions for the authenticated user
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/transactions  — create a new escrow transaction and initiate Squad payment
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, item_description, seller_email } = await req.json();

  // Resolve seller user id from email
  const { data: seller } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", seller_email)
    .single();

  const transaction_ref = generateRef();

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      buyer_id: user.id,
      seller_id: seller?.id ?? null,
      amount,
      item_description,
      status: "PENDING_PAYMENT",
      transaction_ref,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const checkout = await initSquadPayment({
    amount,
    email: user.email!,
    transaction_ref,
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tx/${tx.id}/callback`,
  });

  return NextResponse.json({ transaction: tx, checkout_url: checkout.checkout_url });
}
