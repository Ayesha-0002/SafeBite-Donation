import { useState, useEffect } from "react";
import { Home, Package, User, MessageCircle, LogOut, Loader2, Mail, Phone, ArrowLeft, Settings, UserPlus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const NgoProfile = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(authProfile);
  const [loading, setLoading] = useState(!authProfile);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      if (!authProfile) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        setProfile(data || { email: user.email });
        setLoading(false);
      }
    };
    fetch();
  }, [user, authProfile]);

  const handleLogout = () => {
    signOut();
  };

  const copyToClipboard = async () => {
    const code = profile?.id || profile?.uid || (user?.id);
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        toast.success("Code copied! Riders can use this to join your team.");
      } catch (err) {
        // Fallback for clipboard
        const textArea = document.createElement("textarea");
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success("Code copied! (Fallback)");
        } catch (copyErr) {
          toast.error("Failed to copy code. Please select and copy manually.");
        }
        document.body.removeChild(textArea);
      }
    } else {
      toast.error("No code available yet. Still loading...");
    }
  };

  // Remove blocking loader and use fallback text if profile is missing
  // if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">NGO Profile</h1>
      </div>

      <div className="gradient-primary px-5 pt-10 pb-12 rounded-b-[2.5rem] text-center shadow-lg mx-2 mt-2">
        <div className="w-20 h-20 rounded-full bg-primary-foreground/20 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary-foreground">
          {(profile?.full_name || "N").charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-primary-foreground leading-tight">{profile?.full_name || "NGO User"}</h1>
        <p className="text-sm text-primary-foreground/70">Organization Account</p>
      </div>

      <div className="page-padding -mt-6 relative z-10 space-y-3">
        <div className="glass-card-elevated p-4 flex items-center gap-3">
          <Mail size={18} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            {loading && !user?.email ? (
              <div className="h-4 w-40 bg-muted animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-sm font-medium text-foreground">{user?.email || profile?.email || "—"}</p>
            )}
          </div>
        </div>
        <div className="glass-card-elevated p-4 flex items-center gap-3">
          <Phone size={18} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            {loading && !profile?.phone ? (
              <div className="h-4 w-32 bg-muted animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile?.phone || user?.user_metadata?.phone || "—"}</p>
            )}
          </div>
        </div>

        <div className="glass-card-elevated p-5 space-y-3 relative overflow-hidden bg-primary/5 border-primary/10">
          <div className="flex items-center justify-between text-primary font-bold text-sm">
            <div className="flex items-center gap-2">
              <UserPlus size={20} />
              <span>Team Join Code</span>
            </div>
            <button 
              onClick={copyToClipboard}
              className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-all active:scale-95 shadow-sm"
            >
              Copy Code
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
            Riders can enter this code in their Profile &gt; Settings to join your official delivery team.
          </p>
          <div className="bg-muted p-3 rounded-2xl font-mono text-center text-xs border border-border select-all break-all text-foreground font-bold shadow-inner">
            {profile?.id || "Loading code..."}
          </div>
        </div>

        <button 
          onClick={() => navigate("/ngo/settings")}
          className="w-full py-3 rounded-xl border border-border text-foreground font-semibold flex items-center justify-center gap-2 bg-card shadow-sm active:scale-95 transition-all"
        >
          <Settings size={18} /> Settings
        </button>

        <button onClick={handleLogout} className="w-full mt-6 py-3 rounded-xl border border-destructive/30 text-destructive font-semibold flex items-center justify-center gap-2">
          <LogOut size={18} /> Log Out
        </button>
      </div>

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default NgoProfile;
