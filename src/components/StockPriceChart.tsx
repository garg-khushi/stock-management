import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HistoricalPrice {
  recorded_at: string;
  price: number;
  close_price: number;
}

interface StockPriceChartProps {
  symbol: string;
  title?: string;
  showPeriodSelector?: boolean;
}

export function StockPriceChart({ symbol, title, showPeriodSelector = true }: StockPriceChartProps) {
  const [data, setData] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');

  useEffect(() => {
    fetchHistoricalData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('historical-prices-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historical_prices',
          filter: `symbol=eq.${symbol}`,
        },
        (payload) => {
          setData(prev => [...prev, payload.new as HistoricalPrice].slice(-100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, period]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    
    let query = supabase
      .from('historical_prices')
      .select('recorded_at, price, close_price')
      .eq('symbol', symbol)
      .order('recorded_at', { ascending: true });

    // Apply period filter
    const now = new Date();
    if (period === '1D') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      query = query.gte('recorded_at', oneDayAgo.toISOString());
    } else if (period === '1W') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('recorded_at', oneWeekAgo.toISOString());
    } else if (period === '1M') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('recorded_at', oneMonthAgo.toISOString());
    }

    const { data: historicalData, error } = await query;

    if (!error && historicalData) {
      setData(historicalData);
    }
    setLoading(false);
  };

  const chartData = data.map(item => ({
    time: format(new Date(item.recorded_at), period === '1D' ? 'HH:mm' : 'MMM dd'),
    price: parseFloat(item.price.toString()),
  }));

  const priceChange = data.length >= 2 
    ? ((parseFloat(data[data.length - 1].price.toString()) - parseFloat(data[0].price.toString())) / parseFloat(data[0].price.toString())) * 100
    : 0;

  const isPositive = priceChange >= 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
          <CardDescription>No historical data available yet</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Price history will appear once market data is refreshed
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title || `${symbol} Price Chart`}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>${chartData[chartData.length - 1]?.price.toFixed(2) || '0.00'}</span>
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </CardDescription>
          </div>
          {showPeriodSelector && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="1D">1D</TabsTrigger>
                <TabsTrigger value="1W">1W</TabsTrigger>
                <TabsTrigger value="1M">1M</TabsTrigger>
                <TabsTrigger value="ALL">ALL</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="time" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
              fillOpacity={1}
              fill={`url(#colorPrice-${symbol})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}