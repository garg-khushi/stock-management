-- Create historical_prices table to track price changes over time
CREATE TABLE IF NOT EXISTS public.historical_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  volume BIGINT,
  open_price NUMERIC,
  high_price NUMERIC,
  low_price NUMERIC,
  close_price NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_historical_prices_symbol_recorded ON public.historical_prices(symbol, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.historical_prices ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view historical prices
CREATE POLICY "All authenticated users can view historical prices"
ON public.historical_prices
FOR SELECT
USING (true);

-- System can insert historical prices
CREATE POLICY "System can insert historical prices"
ON public.historical_prices
FOR INSERT
WITH CHECK (true);

-- Admins can manage historical prices
CREATE POLICY "Admins can manage historical prices"
ON public.historical_prices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for historical_prices
ALTER PUBLICATION supabase_realtime ADD TABLE public.historical_prices;

-- Create a table for popular stock symbols
CREATE TABLE IF NOT EXISTS public.stock_symbols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  market_cap TEXT,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_symbols ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view stock symbols
CREATE POLICY "All authenticated users can view stock symbols"
ON public.stock_symbols
FOR SELECT
USING (true);

-- Admins can manage stock symbols
CREATE POLICY "Admins can manage stock symbols"
ON public.stock_symbols
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert popular stocks
INSERT INTO public.stock_symbols (symbol, name, exchange, sector, industry, is_popular) VALUES
('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology', 'Consumer Electronics', true),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology', 'Software', true),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology', 'Internet', true),
('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Cyclical', 'Internet Retail', true),
('TSLA', 'Tesla Inc.', 'NASDAQ', 'Consumer Cyclical', 'Auto Manufacturers', true),
('META', 'Meta Platforms Inc.', 'NASDAQ', 'Technology', 'Internet', true),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Technology', 'Semiconductors', true),
('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'Financial Services', 'Banks', true),
('V', 'Visa Inc.', 'NYSE', 'Financial Services', 'Credit Services', true),
('WMT', 'Walmart Inc.', 'NYSE', 'Consumer Defensive', 'Discount Stores', true),
('DIS', 'The Walt Disney Company', 'NYSE', 'Communication Services', 'Entertainment', true),
('NFLX', 'Netflix Inc.', 'NASDAQ', 'Communication Services', 'Entertainment', true),
('BA', 'The Boeing Company', 'NYSE', 'Industrials', 'Aerospace & Defense', true),
('KO', 'The Coca-Cola Company', 'NYSE', 'Consumer Defensive', 'Beverages', true),
('PFE', 'Pfizer Inc.', 'NYSE', 'Healthcare', 'Drug Manufacturers', true)
ON CONFLICT (symbol) DO NOTHING;