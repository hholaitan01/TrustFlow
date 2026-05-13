const SQUAD_BASE_URL = "https://sandbox-api-d.squadco.com";

const squadHeaders = () => ({
  Authorization: `Bearer ${process.env.SQUAD_SECRET_KEY}`,
  "Content-Type": "application/json",
});

export async function initSquadPayment(params: {
  amount: number;
  email: string;
  transaction_ref: string;
  callback_url: string;
}) {
  const res = await fetch(`${SQUAD_BASE_URL}/transaction/initiate`, {
    method: "POST",
    headers: squadHeaders(),
    body: JSON.stringify({
      amount: params.amount * 100, // convert to kobo
      email: params.email,
      currency: "NGN",
      transaction_ref: params.transaction_ref,
      callback_url: params.callback_url,
    }),
  });

  if (!res.ok) throw new Error(`Squad initiate failed: ${await res.text()}`);
  const json = await res.json();
  return json.data as { checkout_url: string; transaction_ref: string };
}

export async function verifyTransaction(ref: string) {
  const res = await fetch(`${SQUAD_BASE_URL}/transaction/verify/${ref}`, {
    headers: squadHeaders(),
  });
  if (!res.ok) throw new Error(`Squad verify failed: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function createVirtualAccount(params: {
  customer_identifier: string;
  first_name: string;
  last_name: string;
  mobile_num: string;
  email: string;
  bvn: string;
  transaction_ref: string;
}) {
  const res = await fetch(`${SQUAD_BASE_URL}/virtual-account`, {
    method: "POST",
    headers: squadHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Squad virtual account failed: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function lookupAccount(params: {
  bank_code: string;
  account_number: string;
}) {
  const res = await fetch(`${SQUAD_BASE_URL}/payout/account/lookup`, {
    method: "POST",
    headers: squadHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Squad account lookup failed: ${await res.text()}`);
  const json = await res.json();
  return json.data as { account_name: string };
}

export async function releasePayout(params: {
  transaction_reference: string;
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string;
  remark: string;
}) {
  const res = await fetch(`${SQUAD_BASE_URL}/payout/transfer`, {
    method: "POST",
    headers: squadHeaders(),
    body: JSON.stringify({
      ...params,
      amount: params.amount * 100, // convert to kobo
    }),
  });
  if (!res.ok) throw new Error(`Squad payout failed: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}
