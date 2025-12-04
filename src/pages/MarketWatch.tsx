import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockSearch } from "@/components/StockSearch";
import { StockPriceChart } from "@/components/StockPriceChart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketData {
  symbol: string;
  price: number;
  change_percent: number;
  updated_at: string;
}

interface StockSymbol {
  symbol: string;
  name: string;
}

export default function MarketWatch() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'TSLA']);
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMarketData();

    // Subscribe to real-time market data updates
    const channel = supabase
      .channel('market-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_data',
        },
        () => {
          fetchMarketData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [watchlist]);

  const fetchMarketData = async () => {
    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .in('symbol', watchlist)
      .order('symbol');

    if (!error && data) {
      setMarketData(data);
    }
  };

  const handleAddToWatchlist = (symbol: string, name: string) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
      toast.success(`Added ${symbol} to watchlist`);
    } else {
      toast.info(`${symbol} is already in your watchlist`);
    }
  };

  const handleRefreshData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('refresh-market-data');
      if (error) throw error;
      toast.success('Market data refreshed successfully');
    } catch (error: any) {
      toast.error('Failed to refresh market data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
    if (selectedStock === symbol && watchlist.length > 1) {
      setSelectedStock(watchlist[0]);
    }
    toast.success(`Removed ${symbol} from watchlist`);
  };

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Watch</h1>
            <p className="text-muted-foreground">Real-time stock market monitoring and analysis</p>
          </div>
          <Button onClick={handleRefreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Market Data
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {marketData.map((stock) => {
            const isPositive = stock.change_percent >= 0;
            return (
              <Card 
                key={stock.symbol} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStock(stock.symbol)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${parseFloat(stock.price.toString()).toFixed(2)}
                  </div>
                  <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{stock.change_percent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated: {new Date(stock.updated_at).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StockPriceChart symbol={selectedStock} showPeriodSelector />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Watchlist Manager</CardTitle>
              <CardDescription>Add stocks to track</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StockSearch onSelect={handleAddToWatchlist} placeholder="Add stock..." />
              
              <div className="space-y-2">
                {watchlist.map((symbol) => {
                  const stock = marketData.find(s => s.symbol === symbol);
                  return (
                    <div 
                      key={symbol} 
                      className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedStock(symbol)}
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{symbol}</p>
                        {stock && (
                          <p className="text-sm text-muted-foreground">
                            ${parseFloat(stock.price.toString()).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(symbol);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">All Charts</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Summary</CardTitle>
                <CardDescription>Today's market performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {marketData.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium">{stock.symbol}</span>
                      <div className="flex items-center gap-4">
                        <span>${parseFloat(stock.price.toString()).toFixed(2)}</span>
                        <span className={stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="charts" className="space-y-4">
            {watchlist.map(symbol => (
              <StockPriceChart key={symbol} symbol={symbol} showPeriodSelector={false} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
  );
}