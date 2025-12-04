import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-2xl">
            <TrendingUp className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Stock Management System
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Professional portfolio tracking with real-time analytics, transaction management, and comprehensive reporting
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
