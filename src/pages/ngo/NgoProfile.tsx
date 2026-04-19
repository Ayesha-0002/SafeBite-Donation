import { useState, useEffect } from "react";
import { Home, Package, User, MessageCircle, LogOut, Loader2, Mail, Phone, Building2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: MessageCircle, label: "Chat", path: "/ngo/chat" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const NgoProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data || { email: user.email });
      setLoading(false);
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pt-8 pb-12 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary-foreground">
          {(profile?.full_name || "N").charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-primary-foreground">{profile?.full_name || "NGO User"}</h1>
        <p className="text-sm text-primary-foreground/70">Organization</p>
      </div>

      <div className="page-padding -mt-4 relative z-10 space-y-3">
        <div className="glass-card-elevated p-4 flex items-center gap-3">
          <Mail size={18} className="text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium text-foreground">{profile?.email || "—"}</p></div>
        </div>
        <div className="glass-card-elevated p-4 flex items-center gap-3">
          <Phone size={18} className="text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium text-foreground">{profile?.phone || "—"}</p></div>
        </div>
        <div className="glass-card-elevated p-4 flex items-center gap-3">
          <Building2 size={18} className="text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Organization</p><p className="text-sm font-medium text-foreground">{profile?.organization || "—"}</p></div>
        </div>

        <button onClick={handleLogout} className="w-full mt-6 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold flex items-center justify-center gap-2">
          <LogOut size={18} /> Log Out
        </button>
      </div>

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default NgoProfile;
