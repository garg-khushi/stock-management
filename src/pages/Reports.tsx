import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  id: string;
  title: string;
  type: string;
  data: any;
  generated_at: string;
  portfolio_id: string | null;
  portfolios: { name: string } | null;
}

interface Portfolio {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  transaction_date: string;
  notes: string | null;
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*, portfolios(name)")
        .order("generated_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Fetch portfolios
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from("portfolios")
        .select("id, name")
        .order("name");

      if (portfoliosError) throw portfoliosError;
      setPortfolios(portfoliosData || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const generatePortfolioReport = async () => {
    if (!selectedPortfolio) {
      toast.error("Please select a portfolio");
      return;
    }

    try {
      // Fetch portfolio data
      const { data: portfolio, error: portfolioError } = await supabase
        .from("portfolios")
        .select("*")
        .eq("id", selectedPortfolio)
        .single();

      if (portfolioError) throw portfolioError;

      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("portfolio_id", selectedPortfolio)
        .order("transaction_date", { ascending: false });

      if (transactionsError) throw transactionsError;

      // Calculate summary
      const holdings: Record<string, { quantity: number; totalCost: number }> = {};
      
      transactions?.forEach((t: Transaction) => {
        if (!holdings[t.symbol]) {
          holdings[t.symbol] = { quantity: 0, totalCost: 0 };
        }
        
        if (t.type === "BUY") {
          holdings[t.symbol].quantity += t.quantity;
          holdings[t.symbol].totalCost += t.quantity * t.price;
        } else {
          holdings[t.symbol].quantity -= t.quantity;
          holdings[t.symbol].totalCost -= t.quantity * t.price;
        }
      });

      const totalValue = Object.values(holdings).reduce(
        (sum, h) => sum + h.totalCost,
        0
      );

      const reportData = {
        portfolio,
        transactions: transactions?.slice(0, 50),
        holdings,
        summary: {
          totalValue,
          totalTransactions: transactions?.length || 0,
          uniqueSymbols: Object.keys(holdings).length,
        },
      };

      // Save report
      const { data: session } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from("reports").insert({
        user_id: session.session?.user.id,
        portfolio_id: selectedPortfolio,
        title: `${portfolio.name} - Portfolio Report`,
        type: "portfolio_summary",
        data: reportData,
      });

      if (insertError) throw insertError;

      toast.success("Report generated successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    }
  };

  const exportToCSV = async (reportId: string) => {
    try {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      const transactions = report.data.transactions || [];
      
      // Create CSV content
      const headers = ["Date", "Symbol", "Type", "Quantity", "Price", "Total", "Notes"];
      const rows = transactions.map((t: Transaction) => [
        new Date(t.transaction_date).toLocaleDateString(),
        t.symbol,
        t.type,
        t.quantity,
        t.price.toFixed(2),
        (t.quantity * t.price).toFixed(2),
        t.notes || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => row.join(",")),
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and view portfolio reports
          </p>
        </div>
      </div>

      {/* Generate Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate New Report
          </CardTitle>
          <CardDescription>
            Create a detailed report for any portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map((portfolio) => (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generatePortfolioReport}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and export your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No reports generated yet</p>
                        <p className="text-sm">Generate your first report above</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {report.portfolios?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(report.generated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToCSV(report.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
