import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Briefcase, BarChart3, Shield, Settings, LogOut, TrendingUp, Users, FileText, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { NotificationsPopover } from "./NotificationsPopover";
import { ThemeToggle } from "./ThemeToggle";

interface UserRole {
  role: string;
}

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserRoles(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserRoles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      console.error("Error fetching user roles:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error("Failed to sign out");
    }
  };

  const hasRole = (role: string) => {
    return userRoles.some((r) => r.role === role);
  };

  const isAdmin = hasRole("admin");
  const isAdvisor = hasRole("advisor");
  const isAuditor = hasRole("auditor");

  const primaryRole = userRoles[0]?.role || "investor";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm">SMS</h2>
                <p className="text-xs text-muted-foreground">Stock Manager</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard"
                        end
                        className="flex items-center gap-3"
                        activeClassName="bg-primary text-primary-foreground"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {!isAuditor && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/portfolios"
                          className="flex items-center gap-3"
                          activeClassName="bg-primary text-primary-foreground"
                        >
                          <Briefcase className="w-4 h-4" />
                          <span>Portfolios</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard/analytics"
                        className="flex items-center gap-3"
                        activeClassName="bg-primary text-primary-foreground"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Analytics</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {(isAuditor || isAdmin) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/audit"
                          className="flex items-center gap-3"
                          activeClassName="bg-primary text-primary-foreground"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Audit Logs</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {isAdmin && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/dashboard/admin"
                            className="flex items-center gap-3"
                            activeClassName="bg-primary text-primary-foreground"
                          >
                            <Users className="w-4 h-4" />
                            <span>Admin Panel</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard/reports"
                        className="flex items-center gap-3"
                        activeClassName="bg-primary text-primary-foreground"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Reports</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard/market-watch"
                        className="flex items-center gap-3"
                        activeClassName="bg-primary text-primary-foreground"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Market Watch</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {!isAuditor && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/messages"
                          className="flex items-center gap-3"
                          activeClassName="bg-primary text-primary-foreground"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Messages</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {isAdvisor && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/advisor-panel"
                          className="flex items-center gap-3"
                          activeClassName="bg-primary text-primary-foreground"
                        >
                          <Users className="w-4 h-4" />
                          <span>Advisor Panel</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="mt-auto border-t border-border p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {session.user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.email}
                  </p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {primaryRole}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <ThemeToggle />
              <NotificationsPopover />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;