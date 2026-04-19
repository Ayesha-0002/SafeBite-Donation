import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, LogOut, Settings, Award, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: MessageCircle, label: "Chat", path: "/donor/chat" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ donations: 0, meals: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, donationsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("food_donations").select("id, quantity, status").eq("donor_id", user.id),
      ]);

      setProfile(profileRes.data || { email: user.email });
      const d = donationsRes.data || [];
      setStats({
        donations: d.length,
        meals: d.reduce((sum, x) => sum + (x.quantity || 0), 0),
        delivered: d.filter(x => x.status === "delivered").length,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const initials = (profile?.full_name || "D")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pt-8 pb-12 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary-foreground">
          {initials}
        </div>
        <h2 className="text-xl font-bold text-primary-foreground">{profile?.full_name || "Donor"}</h2>
        <p className="text-sm text-primary-foreground/70 font-body">{profile?.email || ""}</p>
      </div>

      <div className="page-padding -mt-6 relative z-10">
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

        <div className="flex flex-col gap-2">
          <button className="glass-card p-4 flex items-center gap-3 text-left">
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
