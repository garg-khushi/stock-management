import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Briefcase, DollarSign, Activity, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StockPriceChart } from "@/components/StockPriceChart";

interface Portfolio {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: string;
  transaction_date: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change_percent: number;
}

const Dashboard = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch portfolios
      const { data: portfoliosData } = await supabase
        .from("portfolios")
        .select("id, name")
        .eq("owner_id", user.id);

      setPortfolios(portfoliosData || []);

      // Fetch recent transactions
      if (portfoliosData && portfoliosData.length > 0) {
        const portfolioIds = portfoliosData.map((p) => p.id);
        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("*")
          .in("portfolio_id", portfolioIds)
          .order("transaction_date", { ascending: false })
          .limit(10);

        setTransactions(transactionsData || []);
      }

      // Fetch market data
      const { data: marketDataData } = await supabase
        .from("market_data")
        .select("symbol, price, change_percent")
        .limit(5);

      setMarketData(marketDataData || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMarketData = async () => {
    try {
      setRefreshing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to refresh market data");
        return;
      }

      const { data, error } = await supabase.functions.invoke('refresh-market-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Market data refreshed! Updated ${data.updated} symbols`);
      fetchDashboardData();
    } catch (error: any) {
      console.error("Error refreshing market data:", error);
      toast.error("Failed to refresh market data");
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate holdings from transactions
  const calculateHoldings = () => {
    const holdings: Record<string, { quantity: number; totalCost: number }> = {};

    transactions.forEach((txn) => {
      if (!holdings[txn.symbol]) {
        holdings[txn.symbol] = { quantity: 0, totalCost: 0 };
      }

      if (txn.type === "BUY") {
        holdings[txn.symbol].quantity += Number(txn.quantity);
        holdings[txn.symbol].totalCost += Number(txn.quantity) * Number(txn.price);
      } else {
        holdings[txn.symbol].quantity -= Number(txn.quantity);
        holdings[txn.symbol].totalCost -= Number(txn.quantity) * Number(txn.price);
      }
    });

    return Object.entries(holdings)
      .filter(([_, data]) => data.quantity > 0)
      .map(([symbol, data]) => ({
        symbol,
        quantity: data.quantity,
        avgPrice: data.totalCost / data.quantity,
        currentPrice: marketData.find((m) => m.symbol === symbol)?.price || data.totalCost / data.quantity,
      }));
  };

  const holdings = calculateHoldings();
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const pieChartData = holdings.map((h) => ({
    name: h.symbol,
    value: h.quantity * h.currentPrice,
  }));

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your portfolio overview.</p>
        </div>
        <Button onClick={refreshMarketData} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Market Data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Portfolio valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPnL >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}% overall
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active portfolios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent activity</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
            <CardDescription>Distribution by symbol</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No holdings yet. Start by creating a portfolio and adding transactions.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      txn.type === "BUY" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {txn.type}
                    </div>
                    <div>
                      <p className="font-medium">{txn.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{Number(txn.quantity).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">@ ${Number(txn.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No transactions yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {marketData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Latest market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                {marketData.map((data) => (
                  <Card key={data.symbol}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{data.symbol}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">${Number(data.price).toFixed(2)}</div>
                      <div className={`text-xs font-medium mt-1 ${
                        (data.change_percent || 0) >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {(data.change_percent || 0) >= 0 ? "+" : ""}
                        {(data.change_percent || 0).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {marketData.slice(0, 4).map((data) => (
              <StockPriceChart 
                key={data.symbol} 
                symbol={data.symbol} 
                showPeriodSelector={false} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;