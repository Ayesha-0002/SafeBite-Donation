import { useState, useEffect } from "react";
import { Home, MapPin, Package, MessageCircle, User, LogOut, Settings, Award, Loader2, ArrowLeft, Navigation, Phone, Bell, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const volunteerNav = [
  { icon: Home, label: "Home", path: "/volunteer" },
  { icon: Bell, label: "Alerts", path: "/notifications" },
  { icon: User, label: "Profile", path: "/volunteer/profile" },
];

const VolunteerProfile = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(authProfile);
  const [stats, setStats] = useState({ pickups: 0, delivered: 0, active: 0, rating: "N/A" });
  const [loading, setLoading] = useState(!authProfile);
  const [ngoName, setNgoName] = useState<string | null>(() => localStorage.getItem("sb_v_ngo_name"));
  const [activePopup, setActivePopup] = useState<{ title: string; desc: string; value: string } | null>(null);

  const fetchData = async () => {
    if (!user) return;
    console.log("VolunteerProfile: Fetching latest profile data directly from database.");

    try {
      const [profileRes, trackingRes, ratingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("food_donations").select("id, status").eq("assigned_volunteer_id", user.id),
        supabase.from("donation_ratings").select("rating").eq("rated_user_id", user.id),
      ]);

      if (profileRes.data) {
        console.log("VolunteerProfile: Profile fetched:", profileRes.data.full_name);
        setProfile(profileRes.data);
        if (profileRes.data.ngo_id) {
          const { data: ngoData } = await supabase.from("profiles").select("full_name").eq("id", profileRes.data.ngo_id).maybeSingle();
          if (ngoData?.full_name) {
            setNgoName(ngoData.full_name);
            localStorage.setItem("sb_v_ngo_name", ngoData.full_name);
          }
        } else {
          setNgoName(null);
          localStorage.removeItem("sb_v_ngo_name");
        }
      }
      const t = trackingRes.data || [];
      const ratingsData = ratingsRes.data || [];
      const avgRating = ratingsData.length > 0
        ? (ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length).toFixed(1)
        : "N/A";

      setStats({
        pickups: t.length,
        delivered: t.filter(x => x.status === "delivered").length,
        active: t.filter(x => x.status !== "delivered").length,
        rating: avgRating,
      });
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, authProfile]);

  const handleLogout = async () => {
    signOut();
  };

  // Remove blocking loader and use fallback text if profile is missing
  // if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const initials = (profile?.full_name || "V")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mobile-container min-h-screen bg-background pb-20 text-foreground">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">My Profile</h1>
      </div>

      <div className="gradient-primary px-5 pt-10 pb-12 rounded-b-[2.5rem] text-center shadow-lg">
        <div className="w-24 h-24 rounded-3xl bg-primary-foreground/20 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center mx-auto mb-3 text-3xl font-black text-primary-foreground shadow-2xl">
          {initials}
        </div>
        <h2 className="text-xl font-bold text-primary-foreground leading-tight">{profile?.full_name || "Volunteer"}</h2>
        <p className="text-sm text-primary-foreground/70 font-body">{profile?.email || ""}</p>
        {ngoName && (
          <div className="inline-block mt-3 bg-white/20 backdrop-blur-md text-primary-foreground border border-white/25 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-inner">
            Affiliated NGO: {ngoName}
          </div>
        )}
      </div>

      <div className="page-padding mt-4 relative z-10">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { value: stats.delivered.toString(), label: "Delivered", desc: "Total number of completed food pickups." },
            { value: stats.rating, label: "Avg Rating", desc: "Your average rating from NGOs and Donors." },
          ].map((s) => (
            <button 
              key={s.label} 
              onClick={() => setActivePopup({ title: s.label, desc: s.desc, value: s.value })}
              className="stat-card transition-transform active:scale-95 cursor-pointer text-left focus:outline-none"
            >
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          <div className="glass-card-elevated p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MessageCircle size={18} />
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

          <div className="glass-card-elevated p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Phone size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Contact Number</p>
              {loading && !profile?.phone ? (
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <p className="text-sm font-bold text-foreground font-body">{profile?.phone || user?.user_metadata?.phone || "—"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate("/volunteer/settings")}
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

      {/* Info Popup */}
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 transition-all duration-200" onClick={() => setActivePopup(null)}>
          <div className="bg-background rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 p-6 relative border border-border" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActivePopup(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X size={16} className="text-foreground" />
            </button>
            <div className="text-center mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                {activePopup.title}
              </span>
              <div className="text-4xl font-black text-foreground mb-4">
                {activePopup.value}
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                {activePopup.desc}
              </p>
            </div>
            <button 
              onClick={() => setActivePopup(null)}
              className="w-full mt-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <BottomNav items={volunteerNav} />
    </div>
  );
};

export default VolunteerProfile;
