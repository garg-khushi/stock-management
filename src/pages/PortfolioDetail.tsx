import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StockSearch } from "@/components/StockSearch";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
}

interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: string;
  transaction_date: string;
  notes: string | null;
}

const PortfolioDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    symbol: "",
    symbolName: "",
    quantity: "",
    price: "",
    type: "BUY" as "BUY" | "SELL",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      fetchPortfolioData();
    }
  }, [id]);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioResult, transactionsResult] = await Promise.all([
        supabase.from("portfolios").select("*").eq("id", id).single(),
        supabase
          .from("transactions")
          .select("*")
          .eq("portfolio_id", id)
          .order("transaction_date", { ascending: false }),
      ]);

      if (portfolioResult.error) throw portfolioResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      setPortfolio(portfolioResult.data);
      setTransactions(transactionsResult.data || []);
    } catch (error: any) {
      toast.error("Failed to load portfolio data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockSelect = (symbol: string, name: string) => {
    setNewTransaction({ ...newTransaction, symbol, symbolName: name });
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(newTransaction.price);
    
    if (!price || isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    try {
      const { error } = await supabase.from("transactions").insert({
        portfolio_id: id,
        symbol: newTransaction.symbol,
        quantity: parseFloat(newTransaction.quantity),
        price: price,
        type: newTransaction.type,
        notes: newTransaction.notes || null,
      });

      if (error) throw error;

      toast.success("Transaction added successfully");
      setIsDialogOpen(false);
      setNewTransaction({
        symbol: "",
        symbolName: "",
        quantity: "",
        price: "",
        type: "BUY",
        notes: "",
      });
      fetchPortfolioData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add transaction");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Transaction deleted");
      fetchPortfolioData();
    } catch (error: any) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleDeletePortfolio = async () => {
    try {
      const { error } = await supabase
        .from("portfolios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Portfolio deleted");
      navigate("/dashboard/portfolios");
    } catch (error: any) {
      toast.error("Failed to delete portfolio");
    }
  };

  // Calculate holdings
  const calculateHoldings = () => {
    const holdings: Record<string, { quantity: number; totalCost: number }> = {};

    transactions.forEach((txn) => {
      if (!holdings[txn.symbol]) {
        holdings[txn.symbol] = { quantity: 0, totalCost: 0 };
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
    });

    return Object.entries(holdings)
      .filter(([_, data]) => data.quantity > 0)
      .map(([symbol, data]) => ({
        symbol,
        quantity: data.quantity,
        avgPrice: data.totalCost / data.quantity,
      }));
  };

  const holdings = calculateHoldings();
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Portfolio not found</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard/portfolios")}>
              Back to Portfolios
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/portfolios")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{portfolio.name}</h1>
            <p className="text-muted-foreground">{portfolio.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>Record a buy or sell transaction</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTransaction}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value: "BUY" | "SELL") =>
                        setNewTransaction({ ...newTransaction, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Select Stock</Label>
                    <StockSearch 
                      onSelect={handleStockSelect}
                      placeholder="Search for a stock..."
                    />
                    {newTransaction.symbol && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {newTransaction.symbolName} ({newTransaction.symbol})
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Share</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={newTransaction.price}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.0001"
                      placeholder="10"
                      value={newTransaction.quantity}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, quantity: e.target.value })
                      }
                      required
                    />
                    {newTransaction.quantity && newTransaction.price && (
                      <p className="text-sm text-muted-foreground">
                        Total: ${(parseFloat(newTransaction.price) * parseFloat(newTransaction.quantity || "0")).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Investment notes..."
                      value={newTransaction.notes}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Transaction</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Portfolio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this portfolio and all its transactions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePortfolio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holdings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
            <CardDescription>Your active positions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell className="font-medium">{holding.symbol}</TableCell>
                    <TableCell className="text-right">{holding.quantity.toFixed(4)}</TableCell>
                    <TableCell className="text-right">${holding.avgPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${(holding.quantity * holding.avgPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All recorded transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No transactions yet. Add your first transaction to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => {
                  const total = txn.quantity * txn.price;
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>{new Date(txn.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.type === "BUY"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {txn.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{txn.symbol}</TableCell>
                      <TableCell className="text-right">{txn.quantity.toFixed(4)}</TableCell>
                      <TableCell className="text-right">${txn.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${total.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{txn.notes || "-"}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTransaction(txn.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDetail;