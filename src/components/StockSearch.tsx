import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface StockSymbol {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
}

interface StockSearchProps {
  onSelect: (symbol: string, name: string) => void;
  placeholder?: string;
}

export function StockSearch({ onSelect, placeholder = "Search stocks..." }: StockSearchProps) {
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockSymbol[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    const { data, error } = await supabase
      .from('stock_symbols')
      .select('*')
      .order('is_popular', { ascending: false })
      .order('symbol');
    
    if (!error && data) {
      setStocks(data);
    }
  };

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stock.sector && stock.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search stocks..." />
          <CommandList>
            <CommandEmpty>No stocks found.</CommandEmpty>
            <CommandGroup heading="Popular Stocks">
              {filteredStocks.slice(0, 10).map((stock) => (
                <CommandItem
                  key={stock.id}
                  value={stock.symbol}
                  onSelect={() => {
                    onSelect(stock.symbol, stock.name);
                    setSearchTerm("");
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stock.symbol}</span>
                      <span className="text-xs text-muted-foreground">{stock.exchange}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stock.name}</span>
                    {stock.sector && (
                      <span className="text-xs text-muted-foreground">{stock.sector}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}