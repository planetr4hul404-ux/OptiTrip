-- Supabase schema for OptiTrip demo
-- Stores search queries and calculated recommendations

CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  origin_text TEXT NOT NULL,
  destination_text TEXT NOT NULL,
  distance_km NUMERIC,
  duration_min NUMERIC,
  priority TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  price NUMERIC NOT NULL,
  time NUMERIC NOT NULL,
  wait_min NUMERIC NOT NULL,
  availability_score NUMERIC NOT NULL,
  final_score NUMERIC NOT NULL,
  rank INT NOT NULL,
  why TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) - Enable public anonymous INSERT and SELECT for demo
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to queries" ON queries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read from queries" ON queries
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to recommendations" ON recommendations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read from recommendations" ON recommendations
  FOR SELECT USING (true);
