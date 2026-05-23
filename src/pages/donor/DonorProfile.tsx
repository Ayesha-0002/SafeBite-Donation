import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, LogOut, Settings, Award, Loader2, ArrowLeft, Phone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorProfile = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(authProfile);
  const [stats, setStats] = useState({ donations: 0, meals: 0, delivered: 0 });
  const [loading, setLoading] = useState(!authProfile);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;

      try {
        const [profileRes, donationsRes] = await Promise.all([
          !authProfile ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() : Promise.resolve({ data: authProfile }),
          supabase.from("food_donations").select("id, quantity, status").eq("donor_id", user.id),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        const d = donationsRes.data || [];
        setStats({
          donations: d.length,
          meals: d.reduce((sum, x) => sum + Number(x.quantity || 0), 0),
          delivered: d.filter(x => x.status === "delivered").length,
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, authProfile]);

  const handleLogout = async () => {
    signOut();
  };

  // Remove blocking loader and use fallback text if profile is missing
  // if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const initials = (profile?.full_name || "D")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">My Profile</h1>
      </div>

      <div className="gradient-primary px-5 pt-10 pb-12 rounded-b-[2.5rem] text-center shadow-lg mx-2 mt-2">
        <div className="w-20 h-20 rounded-full bg-primary-foreground/20 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary-foreground">
          {initials}
        </div>
        <h2 className="text-xl font-bold text-primary-foreground leading-tight">{profile?.full_name || "Donor"}</h2>
        <p className="text-sm text-primary-foreground/70 font-body">{profile?.email || ""}</p>
      </div>

      <div className="page-padding -mt-8 relative z-10">
        <div className="glass-card-elevated p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
            <Award size={24} className="text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Food Hero 🏆</h3>
            <p className="text-xs text-muted-foreground font-body">{stats.delivered > 0 ? `${stats.delivered} successful deliveries!` : "Start donating to earn badges"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: stats.donations.toString(), label: "Donations" },
            { value: stats.meals.toString(), label: "Meals" },
            { value: stats.delivered.toString(), label: "Delivered" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          <div className="glass-card-elevated p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Full Name</p>
              {loading && !profile?.full_name ? (
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <p className="text-sm font-bold text-foreground font-body">{profile?.full_name || "—"}</p>
              )}
            </div>
          </div>

          <div className="glass-card-elevated p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Phone size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Phone Number</p>
              {loading && !profile?.phone ? (
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <p className="text-sm font-bold text-foreground font-body">{profile?.phone || "Not set"}</p>
              )}
            </div>
          </div>

          <div className="glass-card-elevated p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Award size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Email Address</p>
              {loading && !profile?.email ? (
                <div className="h-4 w-40 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <p className="text-sm font-bold text-foreground font-body">{profile?.email || user?.email || "—"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate("/donor/settings")}
            className="glass-card p-4 flex items-center gap-3 text-left transition-all active:scale-95"
          >
            <Settings size={20} className="text-muted-foreground" />
            <span className="font-medium text-foreground">Settings</span>
          </button>
          <button onClick={handleLogout} className="glass-card p-4 flex items-center gap-3 text-left">
            <LogOut size={20} className="text-muted-foreground" />
            <span className="font-medium text-foreground">Log Out</span>
          </button>
        </div>
      </div>

      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorProfile;
