-- 001_initial_schema.sql

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT UNIQUE NOT NULL,
  full_name               TEXT NOT NULL,
  phone                   TEXT,
  bank_code               TEXT,
  account_number          TEXT,
  account_name            TEXT,
  trust_score             INTEGER DEFAULT 50,
  total_transactions      INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  disputes_filed          INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id             UUID REFERENCES users(id),
  seller_id            UUID REFERENCES users(id),
  amount               NUMERIC NOT NULL,
  item_description     TEXT NOT NULL,
  status               TEXT DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN (
      'PENDING_PAYMENT','FUNDED','SHIPPED','DELIVERED',
      'CONFIRMED','DISPUTED','REFUNDED','RELEASED'
    )),
  transaction_ref      TEXT UNIQUE NOT NULL,
  squad_gateway_ref    TEXT,
  trust_score          INTEGER,
  risk_level           TEXT CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
  risk_reasons         JSONB,
  tracking_number      TEXT,
  estimated_delivery   TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  confirmed_at         TIMESTAMPTZ,
  payout_ref           TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Disputes
CREATE TABLE disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID REFERENCES transactions(id),
  initiated_by        UUID REFERENCES users(id),
  reason              TEXT NOT NULL,
  buyer_evidence      TEXT,
  seller_evidence     TEXT,
  ai_recommendation   TEXT CHECK (ai_recommendation IN (
    'RELEASE','PARTIAL_REFUND','FULL_REFUND','PENDING'
  )),
  ai_reasoning        TEXT,
  resolution          TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Chat analyses
CREATE TABLE chat_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID REFERENCES transactions(id),
  raw_text          TEXT NOT NULL,
  flags             JSONB,
  scam_probability  NUMERIC,
  analysis_summary  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_analyses  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Parties can read their transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Helper RPCs
CREATE OR REPLACE FUNCTION increment_successful_transaction(user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE users
  SET successful_transactions = successful_transactions + 1,
      total_transactions       = total_transactions + 1
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION increment_total_transaction(user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE users
  SET total_transactions = total_transactions + 1
  WHERE id = user_id;
$$;
