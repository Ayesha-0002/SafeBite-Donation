import { useState, useEffect } from "react";
import { Home, MapPin, Package, MessageCircle, User, LogOut, Settings, Award, Loader2, Building2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const volunteerNav = [
  { icon: Home, label: "Home", path: "/volunteer" },
  { icon: MapPin, label: "Track", path: "/volunteer/tracking" },
  { icon: Package, label: "Pickups", path: "/volunteer/pickups" },
  { icon: User, label: "Profile", path: "/volunteer/profile" },
];

const VolunteerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ pickups: 0, delivered: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [ngoCode, setNgoCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, trackingRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("food_donations").select("id, status").eq("assigned_volunteer_id", user.id),
    ]);

    setProfile(profileRes.data || { email: user.email });
    const t = trackingRes.data || [];
    setStats({
      pickups: t.length,
      delivered: t.filter(x => x.status === "delivered").length,
      active: t.filter(x => x.status !== "delivered").length,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoinNgo = async () => {
    if (!ngoCode.trim()) return;
    setJoining(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: ngoCode.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to join NGO. Check the code.");
    } else {
      toast.success("Successfully joined NGO team! 🎉");
      fetchData();
      setNgoCode("");
    }
    setJoining(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const initials = (profile?.full_name || "V")
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
        <h2 className="text-xl font-bold text-primary-foreground">{profile?.full_name || "Volunteer"}</h2>
        <p className="text-sm text-primary-foreground/70 font-body">{profile?.email || ""}</p>
      </div>

      <div className="page-padding -mt-6 relative z-10">
        <div className="glass-card-elevated p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
            <Award size={24} className="text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Delivery Hero 🚚</h3>
            <p className="text-xs text-muted-foreground font-body">{stats.delivered > 0 ? `${stats.delivered} successful deliveries!` : "Complete deliveries to earn badges"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: stats.pickups.toString(), label: "Total Pickups" },
            { value: stats.delivered.toString(), label: "Delivered" },
            { value: stats.active.toString(), label: "Active" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* NGO Team Section */}
        <div className="glass-card-elevated p-4 mb-6">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-3">
            <Building2 size={18} />
            <span>NGO Team Placement</span>
          </div>
          
          {profile?.organization_id ? (
            <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Current Organization ID</p>
              <p className="text-sm font-mono font-medium text-foreground truncate">{profile.organization_id}</p>
              <p className="text-[10px] text-success mt-2 font-medium flex items-center gap-1">
                < Award size={10} /> Associated with Private NGO Rider Team
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-body">Not part of any NGO team yet. Enter Join Code to become their official rider.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ngoCode}
                  onChange={(e) => setNgoCode(e.target.value)}
                  placeholder="Paste NGO Join Code"
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                />
                <button
                  onClick={handleJoinNgo}
                  disabled={joining}
                  className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Team"}
                </button>
              </div>
            </div>
          )}
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

      <BottomNav items={volunteerNav} />
    </div>
  );
};

export default VolunteerProfile;
