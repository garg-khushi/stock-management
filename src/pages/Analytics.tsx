import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Portfolio {
  id: string;
  name: string;
}

interface Transaction {
  symbol: string;
  quantity: number;
  price: number;
  type: string;
  transaction_date: string;
}

const Analytics = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedPortfolio]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: portfoliosData } = await supabase
        .from("portfolios")
        .select("id, name")
        .eq("owner_id", user.id);

      setPortfolios(portfoliosData || []);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("transactions")
        .select("*, portfolios!inner(owner_id)")
        .eq("portfolios.owner_id", user.id)
        .order("transaction_date", { ascending: true });

      if (selectedPortfolio !== "all") {
        query = query.eq("portfolio_id", selectedPortfolio);
      }

      const { data } = await query;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Calculate holdings and P&L
  const calculateMetrics = () => {
    const holdings: Record<string, { quantity: number; totalCost: number; transactions: Transaction[] }> = {};

    transactions.forEach((txn) => {
      if (!holdings[txn.symbol]) {
        holdings[txn.symbol] = { quantity: 0, totalCost: 0, transactions: [] };
      }

      const quantity = txn.quantity;
      const price = txn.price;

      if (txn.type === "BUY") {
        holdings[txn.symbol].quantity += quantity;
        holdings[txn.symbol].totalCost += quantity * price;
      } else {
        holdings[txn.symbol].quantity -= quantity;
        holdings[txn.symbol].totalCost -= quantity * price;
      }

      holdings[txn.symbol].transactions.push(txn);
    });

    return Object.entries(holdings)
      .filter(([_, data]) => data.quantity > 0)
      .map(([symbol, data]) => ({
        symbol,
        quantity: data.quantity,
        avgPrice: data.totalCost / data.quantity,
        value: data.totalCost,
      }));
  };

  const holdings = calculateMetrics();
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

  // Transaction volume over time
  const transactionsByMonth = transactions.reduce((acc: Record<string, { buy: number; sell: number }>, txn) => {
    const month = new Date(txn.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    if (!acc[month]) {
      acc[month] = { buy: 0, sell: 0 };
    }
    const value = txn.quantity * txn.price;
    if (txn.type === "BUY") {
      acc[month].buy += value;
    } else {
      acc[month].sell += value;
    }
    return acc;
  }, {});

  const transactionVolumeData = Object.entries(transactionsByMonth).map(([month, data]) => ({
    month,
    buy: data.buy,
    sell: data.sell,
  }));

  // Allocation data
  const allocationData = holdings.map((h) => ({
    name: h.symbol,
    value: h.value,
  }));

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Detailed insights into your investments</p>
        </div>
        <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select portfolio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Portfolios</SelectItem>
            {portfolios.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {holdings.length} symbols</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter((t) => t.type === "BUY").length} buys, {transactions.filter((t) => t.type === "SELL").length} sells
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${transactions.length > 0 ? (totalValue / transactions.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
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
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holdings Value</CardTitle>
            <CardDescription>Current value by symbol</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={holdings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="symbol" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {transactionVolumeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume Over Time</CardTitle>
            <CardDescription>Buy and sell activity by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transactionVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="buy"
                  stackId="1"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.6}
                  name="Buy"
                />
                <Area
                  type="monotone"
                  dataKey="sell"
                  stackId="1"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.6}
                  name="Sell"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;