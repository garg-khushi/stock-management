import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Users, Database, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
  status_code: number | null;
  profiles: { email: string } | null;
}

interface AdvisorClient {
  id: string;
  advisor_id: string;
  client_id: string;
  advisor: { email: string };
  client: { email: string };
}

const Admin = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [advisorClients, setAdvisorClients] = useState<AdvisorClient[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;
      
      // Group roles by user_id
      const rolesByUser: Record<string, UserRole[]> = {};
      (rolesData || []).forEach((role) => {
        if (!rolesByUser[role.user_id]) {
          rolesByUser[role.user_id] = [];
        }
        rolesByUser[role.user_id].push(role);
      });
      setUserRoles(rolesByUser);

      // Fetch recent audit logs
      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*, profiles(email)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setAuditLogs(logsData || []);

      // Fetch advisor-client relationships
      const { data: advisorClientsData, error: advisorClientsError } = await supabase
        .from("advisor_clients")
        .select(`
          *,
          advisor:profiles!advisor_clients_advisor_id_fkey(email),
          client:profiles!advisor_clients_client_id_fkey(email)
        `);

      if (advisorClientsError) throw advisorClientsError;
      setAdvisorClients(advisorClientsData as any || []);

    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: role as any }]);

      if (error) throw error;

      toast.success(`Role ${role} assigned successfully`);
      fetchData();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role removed successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    }
  };

  const assignClientToAdvisor = async (advisorId: string, clientId: string) => {
    try {
      const { error } = await supabase
        .from("advisor_clients")
        .insert({ advisor_id: advisorId, client_id: clientId });

      if (error) throw error;

      toast.success("Client assigned to advisor successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error assigning client:", error);
      toast.error("Failed to assign client");
    }
  };

  const triggerBackup = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("backups")
        .insert({
          status: "completed",
          location: "cloud-storage/backup-" + new Date().toISOString(),
          triggered_by: session.session?.user.id
        });

      if (error) throw error;

      toast.success("Backup triggered successfully");
    } catch (error: any) {
      console.error("Error triggering backup:", error);
      toast.error("Failed to trigger backup");
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

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
            <Shield className="w-8 h-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and system settings
          </p>
        </div>
        <Button onClick={triggerBackup} variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Trigger Backup
        </Button>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage user accounts and assign roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => {
                  const roles = userRoles[profile.id] || [];
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.email}</TableCell>
                      <TableCell>{profile.full_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeRole(role.id)}
                            >
                              {role.role} ×
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          onValueChange={(role) => assignRole(profile.id, role)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="investor">Investor</SelectItem>
                            <SelectItem value="advisor">Advisor</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="novice">Novice</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
          <CardDescription>Last 10 system actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.profiles?.email || "System"}</TableCell>
                    <TableCell className="font-mono text-sm">{log.action}</TableCell>
                    <TableCell>
                      {log.resource_type && (
                        <span className="text-muted-foreground">
                          {log.resource_type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status_code && log.status_code < 400
                            ? "default"
                            : "destructive"
                        }
                      >
                        {log.status_code || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
