import { useState, useEffect } from "react";
import { Home, Package, MessageCircle, User } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ChatConversationList from "@/components/ChatConversationList";
import ChatThread from "@/components/ChatThread";
import { useConversations, Conversation } from "@/hooks/useDirectMessages";
import { supabase } from "@/lib/supabaseClient";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: MessageCircle, label: "Chat", path: "/ngo/chat" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const NgoChat = () => {
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const { conversations, loading } = useConversations(userId);

  // Handle ?to= and ?donation= query params
  useEffect(() => {
    const toId = searchParams.get("to");
    const donationId = searchParams.get("donation");
    if (toId && userId) {
      const existing = conversations.find(c => c.user_id === toId);
      if (existing) {
        setActiveConv(existing);
      } else {
        supabase.from("profiles").select("full_name, avatar_url").eq("id", toId).single()
          .then(({ data }) => {
            setActiveConv({
              user_id: toId,
              full_name: data?.full_name || "User",
              avatar_url: data?.avatar_url || null,
              last_message: "",
              last_time: "",
              unread: 0,
              donation_id: donationId,
              donation_title: null,
              last_message_is_mine: false,
              last_message_read: false,
            });
          });
      }
    }
  }, [searchParams, userId, conversations]);

  if (activeConv && userId) {
    return (
      <div className="mobile-container min-h-screen bg-background pb-20 flex flex-col">
        <ChatThread
          currentUserId={userId}
          otherUserId={activeConv.user_id}
          otherName={activeConv.full_name || "User"}
          donationId={activeConv.donation_id}
          donationTitle={activeConv.donation_title}
          onBack={() => setActiveConv(null)}
        />
        <BottomNav items={ngoNav} />
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-background pb-20 flex flex-col">
      <div className="px-5 pt-6 pb-3 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-xs text-muted-foreground font-body">Chat with donors and riders</p>
      </div>

      <ChatConversationList
        conversations={conversations}
        loading={loading}
        onSelect={setActiveConv}
        emptyMessage="When you message a donor or rider, it will appear here."
      />

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default NgoChat;
