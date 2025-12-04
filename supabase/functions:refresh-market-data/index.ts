import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataUpdate {
  symbol: string;
  price: number;
  change_percent: number;
}

interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '05. price': string;
    '10. change percent': string;
  };
}

const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');

// Fetch real-time stock data from Alpha Vantage API
async function fetchMarketData(symbols: string[]): Promise<MarketDataUpdate[]> {
  const results: MarketDataUpdate[] = [];
  
  for (const symbol of symbols) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      console.log(`Fetching data for ${symbol}...`);
      
      const response = await fetch(url);
      const data: AlphaVantageQuote = await response.json();

      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const price = parseFloat(data['Global Quote']['05. price']);
        const changePercentStr = data['Global Quote']['10. change percent'].replace('%', '');
        const changePercent = parseFloat(changePercentStr);

        results.push({
          symbol,
          price,
          change_percent: changePercent,
        });
        
        console.log(`✓ ${symbol}: $${price} (${changePercent}%)`);
      } else {
        console.warn(`No data available for ${symbol}`);
        // Keep existing price if API doesn't return data
      }

      // Rate limiting: Alpha Vantage free tier allows 5 calls/minute
      // Wait 12 seconds between calls to stay under limit
      await new Promise(resolve => setTimeout(resolve, 12000));
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
    }
  }
  
  return results;
}

async function checkPriceAlerts(
  supabase: any,
  userId: string,
  symbol: string,
  oldPrice: number,
  newPrice: number
) {
  const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
  
  // Check if user has alert thresholds for this symbol
  const { data: thresholds } = await supabase
    .from('alert_thresholds')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol);
  
  if (thresholds && thresholds.length > 0) {
    const threshold = thresholds[0];
    
    if (Math.abs(changePercent) >= threshold.threshold_percent) {
      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        symbol,
        message: `${symbol} price changed by ${changePercent.toFixed(2)}%: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}`,
        type: 'price_alert',
      });
      
      console.log(`Alert triggered for ${userId}: ${symbol} changed by ${changePercent.toFixed(2)}%`);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authentication token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Refreshing market data for user: ${user.id}`);

    // Get user's portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('owner_id', user.id);

    if (portfoliosError) throw portfoliosError;

    if (!portfolios || portfolios.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No portfolios found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique symbols from all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('symbol')
      .in('portfolio_id', portfolios.map((p: any) => p.id));

    if (transactionsError) throw transactionsError;

    const uniqueSymbols = [...new Set(transactions?.map((t: any) => t.symbol) || [])];
    
    if (uniqueSymbols.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No symbols to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating prices for symbols: ${uniqueSymbols.join(', ')}`);

    // Get current prices from market_data
    const { data: currentMarketData } = await supabase
      .from('market_data')
      .select('symbol, price')
      .in('symbol', uniqueSymbols);

    const currentPrices = new Map(
      currentMarketData?.map((d: any) => [d.symbol, d.price]) || []
    );

    // Fetch new market data
    const marketData = await fetchMarketData(uniqueSymbols);

    // Update market_data table, save historical data, and check for alerts
    for (const data of marketData) {
      const oldPrice = currentPrices.get(data.symbol) || data.price;
      
      // Upsert market data
      await supabase
        .from('market_data')
        .upsert({
          symbol: data.symbol,
          price: data.price,
          change_percent: data.change_percent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'symbol'
        });

      // Save historical price data
      await supabase
        .from('historical_prices')
        .insert({
          symbol: data.symbol,
          price: data.price,
          close_price: data.price,
          recorded_at: new Date().toISOString(),
        });

      // Check for price alerts
      await checkPriceAlerts(supabase, user.id, data.symbol, oldPrice, data.price);
    }

    // Log audit entry
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'REFRESH_MARKET_DATA',
      resource_type: 'market_data',
      details: { symbols: uniqueSymbols, count: marketData.length },
      status_code: 200,
    });

    return new Response(
      JSON.stringify({
        success: true,
        updated: marketData.length,
        symbols: uniqueSymbols,
        source: 'Alpha Vantage (Real-time data)',
        note: marketData.length < uniqueSymbols.length 
          ? 'Some symbols could not be updated due to API availability' 
          : 'All symbols updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in refresh-market-data:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
