import { useState, useEffect } from "react";
import { Home, MapPin, Package, MessageCircle, User, Navigation, Bell, Loader2, Utensils } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const volunteerNav = [
  { icon: Home, label: "Home", path: "/volunteer" },
  { icon: MapPin, label: "Track", path: "/volunteer/tracking" },
  { icon: Package, label: "Pickups", path: "/volunteer/pickups" },
  { icon: User, label: "Profile", path: "/volunteer/profile" },
];

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ done: 0, active: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Only show pickups assigned to this volunteer
      const { data } = await supabase
        .from("food_donations")
        .select("*, donor:profiles!donor_id(phone, full_name)")
        .eq("assigned_volunteer_id", user.id)
        .in("status", ["picked_up", "accepted"])
        .order("created_at", { ascending: false })
        .limit(10);
      setPickups(data || []);

      const { data: tracking } = await supabase.from("volunteer_tracking").select("*").eq("volunteer_id", user.id);
      setStats({
        done: (tracking || []).filter(t => t.status === "delivered").length,
        active: (tracking || []).filter(t => t.status !== "delivered").length,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleWhatsAppChat = (phone: string | null) => {
    if (!phone) {
      toast.error("Donor's contact number is not available.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    window.location.href = `https://wa.me/${cleanPhone}?text=Assalam o Alaikum, I am the SafeBite volunteer. I am coming to pick up the food donation.`;
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleStartPickup = async (donationId: string) => {
    navigate(`/volunteer/tracking?donation=${donationId}`);
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/30 shadow-lg">
              <Utensils size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">SafeBite</h1>
              <p className="text-xs text-primary-foreground/70">Volunteer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground relative">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-primary animate-pulse-dot" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: stats.done.toString(), label: "Pickups Done" },
            { value: "4.9", label: "Rating" },
            { value: stats.active.toString(), label: "Active" },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="page-padding -mt-4 relative z-10">
        <button onClick={() => navigate("/volunteer/tracking")} className="w-full glass-card-elevated p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center relative">
            <Navigation size={24} className="text-secondary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse-dot" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Live GPS Tracking</h3>
            <p className="text-xs text-muted-foreground font-body">Track your active deliveries</p>
          </div>
        </button>

        <h2 className="text-lg font-bold text-foreground mb-3">Assigned Pickups</h2>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : pickups.length === 0 ? (
          <div className="text-center py-10">
            <Package size={40} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">No assigned pickups — NGO will assign you soon</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pickups.map((p) => {
              const imgUrl = getImageUrl(p.image_url);
              return (
                <div key={p.id} className="food-card p-3">
                  <div className="flex items-center gap-3">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.title} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                        <Package size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm truncate">{p.title}</h4>
                        <button 
                          onClick={() => handleWhatsAppChat(p.donor?.phone)}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-1 rounded-lg"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground font-body">📍 {p.location}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">🍽 {p.quantity} servings</span>
                        <span className="text-xs text-muted-foreground">📅 {p.pickup_day}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleStartPickup(p.id)} className="w-full mt-3 py-2.5 rounded-xl font-semibold text-primary-foreground gradient-primary text-sm transition-all hover:opacity-90 active:scale-[0.98]">
                    Start Pickup & Track
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav items={volunteerNav} />
    </div>
  );
};

export default VolunteerDashboard;
