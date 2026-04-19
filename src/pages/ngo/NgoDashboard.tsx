import { useState, useEffect } from "react";
import { Home, Package, CheckCircle, Bell, Loader2, Truck, User, MessageCircle, Eye, UserPlus, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: MessageCircle, label: "Chat", path: "/ngo/chat" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const NgoDashboard = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [stats, setStats] = useState({ received: 0, inProgress: 0, available: 0 });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [donationsRes, volunteersRes] = await Promise.all([
      supabase.from("food_donations").select("*").in("status", ["posted", "accepted", "picked_up"]).eq("ai_safe", true).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "volunteer"),
    ]);

    const allDonations = donationsRes.data || [];
    const volunteerIds = (volunteersRes.data || []).map(v => v.user_id);

    // Get volunteer profiles
    if (volunteerIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", volunteerIds);
      setVolunteers(profiles || []);
    }

    setDonations(allDonations);
    setStats({
      available: allDonations.filter(d => d.status === "posted").length,
      inProgress: allDonations.filter(d => d.status === "accepted" || d.status === "picked_up").length,
      received: allDonations.filter(d => d.status === "delivered").length,
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleAcceptDonation = async (donationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("food_donations").update({
      status: "accepted",
      ngo_verified_by: user.id,
      ngo_verified_at: new Date().toISOString(),
    }).eq("id", donationId);
    toast.success("Food donation accepted! Now assign a rider.");
    setAssigningId(donationId);
    fetchData();
  };

  const handleAssignVolunteer = async (donationId: string) => {
    if (!selectedVolunteer) {
      toast.error("Pehle rider select karo!");
      return;
    }
    await supabase.from("food_donations").update({
      assigned_volunteer_id: selectedVolunteer,
      status: "picked_up",
    }).eq("id", donationId);
    toast.success("Rider assigned! Woh ab pickup karega.");
    setAssigningId(null);
    setSelectedVolunteer("");
    fetchData();
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-5 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">SafeBite</h1>
              <p className="text-xs text-primary-foreground/70">NGO Dashboard</p>
            </div>
          </div>
          <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground relative">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-primary animate-pulse-dot" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: stats.available.toString(), label: "Available Food" },
            { value: stats.inProgress.toString(), label: "In Progress" },
            { value: stats.received.toString(), label: "Received" },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="page-padding -mt-4 relative z-10">
        <h2 className="text-lg font-bold text-foreground mb-3">Available Food Donations</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : donations.filter(d => d.status === "posted").length === 0 ? (
          <div className="text-center py-10">
            <Package size={40} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">No food available right now</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {donations.filter(d => d.status === "posted").map((d) => {
              const imgUrl = getImageUrl(d.image_url);
              return (
                <div key={d.id} className="food-card p-3">
                  <div className="flex items-center gap-3">
                    {imgUrl ? (
                      <img src={imgUrl} alt={d.title} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                        <Package size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground text-sm truncate">{d.title}</h4>
                        {d.ai_safe && <span className="badge-verified text-[10px]">AI ✓</span>}
                      </div>
                      <p className="text-xs text-muted-foreground font-body">📍 {d.location}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">🍽 {d.quantity} servings</span>
                        <span className="text-xs text-muted-foreground">📅 {d.pickup_day}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAcceptDonation(d.id)}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-primary-foreground gradient-primary text-sm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Accept Food
                    </button>
                    <button
                      onClick={() => navigate(`/ngo/chat?to=${d.donor_id}&donation=${d.id}`)}
                      className="py-2.5 px-4 rounded-xl font-semibold text-primary border border-primary text-sm flex items-center justify-center"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Accepted — Assign Rider */}
        {donations.filter(d => d.status === "accepted" || (d.status === "picked_up" && assigningId === d.id)).length > 0 && (
          <>
            <h2 className="text-lg font-bold text-foreground mt-6 mb-3">Accepted — Assign Rider 🏍️</h2>
            <div className="flex flex-col gap-3">
              {donations.filter(d => d.status === "accepted").map((d) => (
                <div key={d.id} className="glass-card-elevated p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Truck size={20} className="text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{d.title}</h4>
                      <p className="text-xs text-muted-foreground">📍 {d.location} · 🍽 {d.quantity} servings</p>
                    </div>
                  </div>

                  {assigningId === d.id || !d.assigned_volunteer_id ? (
                    <div className="space-y-2">
                      <select
                        value={selectedVolunteer}
                        onChange={(e) => setSelectedVolunteer(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">— Select Rider / Volunteer —</option>
                        {volunteers.map((v) => (
                          <option key={v.id} value={v.id}>{v.full_name || v.email}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignVolunteer(d.id)}
                        className="w-full py-2.5 rounded-xl font-semibold text-secondary-foreground gradient-warm text-sm flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} /> Assign Rider
                      </button>
                    </div>
                  ) : (
                    <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-primary" />
                      <p className="text-sm text-foreground font-medium">Rider assigned — pickup in progress</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* In Progress */}
        {donations.filter(d => d.status === "picked_up").length > 0 && (
          <>
            <h2 className="text-lg font-bold text-foreground mt-6 mb-3">In Progress 🚗</h2>
            <div className="flex flex-col gap-3">
              {donations.filter(d => d.status === "picked_up").map((d) => {
                const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
                return (
                  <div key={d.id} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-sm">{d.title}</h4>
                    <p className="text-xs text-muted-foreground">Rider: {volunteer?.full_name || "Assigned"}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/ngo/track?donation=${d.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
                    >
                      <MapPin size={12} /> Track
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default NgoDashboard;
