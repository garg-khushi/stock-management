import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_profile: { full_name: string; email: string };
}

interface Advisor {
  id: string;
  full_name: string;
  email: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAndAdvisors();
    fetchMessages();

    const messagesChannel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    const rolesChannel = supabase
      .channel("user-roles-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_roles",
          filter: "role=eq.advisor",
        },
        () => {
          fetchUserAndAdvisors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  const fetchUserAndAdvisors = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserId(session.user.id);

    // Fetch all users with advisor role
    const { data: advisorRoles } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        user:profiles!user_roles_user_id_fkey(id, full_name, email)
      `)
      .eq("role", "advisor");

    if (advisorRoles) {
      const advisorList = advisorRoles.map((ar: any) => ar.user).filter(Boolean);
      setAdvisors(advisorList);
      if (advisorList.length > 0) {
        setSelectedAdvisor(advisorList[0].id);
      }
    }
  };

  const fetchMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(full_name, email)
      `)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAdvisor) {
      toast({
        title: "Error",
        description: "Please select an advisor and enter a message",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: selectedAdvisor,
      content: newMessage,
    });

    if (error) {
      console.error("Error sending message:", error);
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

  const filteredMessages = messages.filter(
    (msg) =>
      (msg.sender_id === userId && msg.receiver_id === selectedAdvisor) ||
      (msg.receiver_id === userId && msg.sender_id === selectedAdvisor)
  );

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Message Your Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {advisors.length === 0 ? (
            <p className="text-muted-foreground">
              No advisors available yet. Sign up new accounts to create advisor profiles.
            </p>
          ) : (
            <>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an advisor" />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.full_name || advisor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {filteredMessages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No messages yet. Start a conversation!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === userId ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === userId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm font-semibold mb-1">
                            {msg.sender_id === userId
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
                  placeholder="Type your message..."
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages;
