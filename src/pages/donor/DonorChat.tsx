import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, ArrowLeft, Scan } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ChatConversationList from "@/components/ChatConversationList";
import ChatThread from "@/components/ChatThread";
import { useConversations, Conversation } from "@/hooks/useDirectMessages";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: Scan, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorChat = () => {
  const navigate = useNavigate();
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
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">Messages</h1>
      </div>

      <ChatConversationList
        conversations={conversations}
        loading={loading}
        onSelect={setActiveConv}
        emptyMessage="When a volunteer or NGO messages you about your donation, it will appear here."
      />

      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorChat;
