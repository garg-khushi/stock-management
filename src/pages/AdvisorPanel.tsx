import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageCircle, Send, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Client {
  id: string;
  full_name: string;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_profile: { full_name: string; email: string };
}

interface Portfolio {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const AdvisorPanel = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [advisorId, setAdvisorId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAdvisorAndClients();

    const channel = supabase
      .channel("advisor-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          if (selectedClient) fetchMessages(selectedClient.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient]);

  const fetchAdvisorAndClients = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setAdvisorId(session.user.id);

    const { data: advisorClients } = await supabase
      .from("advisor_clients")
      .select(`
        client_id,
        client:profiles!advisor_clients_client_id_fkey(id, full_name, email)
      `)
      .eq("advisor_id", session.user.id);

    if (advisorClients) {
      const clientList = advisorClients.map((ac: any) => ac.client);
      setClients(clientList);
    }
  };

  const fetchMessages = async (clientId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(full_name, email)
      `)
      .or(`and(sender_id.eq.${clientId},receiver_id.eq.${advisorId}),and(sender_id.eq.${advisorId},receiver_id.eq.${clientId})`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
  };

  const fetchClientPortfolios = async (clientId: string) => {
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("owner_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching portfolios:", error);
    } else {
      setPortfolios(data || []);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    fetchMessages(client.id);
    fetchClientPortfolios(client.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: advisorId,
      receiver_id: selectedClient.id,
      content: newMessage,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    }
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No clients assigned yet
                </p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <Button
                      key={client.id}
                      variant={selectedClient?.id === client.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleClientSelect(client)}
                    >
                      {client.full_name || client.email}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedClient
                ? `${selectedClient.full_name || selectedClient.email}`
                : "Select a client"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedClient ? (
              <p className="text-muted-foreground text-center py-8">
                Select a client to view their details and communicate
              </p>
            ) : (
              <Tabs defaultValue="messages">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="messages">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger value="portfolios">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Portfolios
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="space-y-4">
                  <ScrollArea className="h-[350px] border rounded-lg p-4">
                    {messages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No messages yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_id === advisorId ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.sender_id === advisorId
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm font-semibold mb-1">
                                {msg.sender_id === advisorId
                                  ? "You"
                                  : msg.sender_profile.full_name || msg.sender_profile.email}
                              </p>
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your advice..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="portfolios">
                  <ScrollArea className="h-[400px]">
                    {portfolios.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Client has no portfolios yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {portfolios.map((portfolio) => (
                          <Card key={portfolio.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {portfolio.description || "No description"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Created: {new Date(portfolio.created_at).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvisorPanel;
