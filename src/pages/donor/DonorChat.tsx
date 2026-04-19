import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ChatConversationList from "@/components/ChatConversationList";
import ChatThread from "@/components/ChatThread";
import { useConversations, Conversation } from "@/hooks/useDirectMessages";
import { supabase } from "@/lib/supabaseClient";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: MessageCircle, label: "Chat", path: "/donor/chat" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorChat = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const { conversations, loading } = useConversations(userId);

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
        <BottomNav items={donorNav} />
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-background pb-20 flex flex-col">
      <div className="px-5 pt-6 pb-3 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-xs text-muted-foreground font-body">Chat with volunteers & NGOs about your donations</p>
      </div>

      <ChatConversationList
        conversations={conversations}
        loading={loading}
        onSelect={setActiveConv}
        emptyMessage="Jab koi volunteer ya NGO aap ki donation ke baare mein message karega, wo yahan dikhai dega."
      />

      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorChat;
