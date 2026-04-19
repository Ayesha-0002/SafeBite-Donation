import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, Bell, Package, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: MessageCircle, label: "Chat", path: "/donor/chat" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, meals: 0, delivered: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("food_donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const all = data || [];
      setDonations(all);
      setStats({
        total: all.length,
        meals: all.reduce((sum, d) => sum + (d.quantity || 0), 0),
        delivered: all.filter(d => d.status === "delivered").length,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered": return "badge-verified";
      case "picked_up": return "badge-pending";
      case "accepted": return "px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary";
      default: return "px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return "Delivered ✓";
      case "picked_up": return "In Transit";
      case "accepted": return "Accepted";
      default: return "Posted";
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">SafeBite</h1>
              <p className="text-xs text-primary-foreground/70">Donor Dashboard</p>
            </div>
          </div>
          <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground relative">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-primary animate-pulse-dot" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: stats.total.toString(), label: "Total Donations" },
            { value: stats.meals.toString(), label: "Meals Served" },
            { value: stats.delivered.toString(), label: "Delivered" },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="page-padding -mt-4 relative z-10">
        <button
          onClick={() => navigate("/donor/post")}
          className="w-full glass-card-elevated p-4 flex items-center gap-4 mb-6"
        >
          <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center">
            <PlusCircle size={24} className="text-secondary-foreground" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Post Surplus Food</h3>
            <p className="text-xs text-muted-foreground font-body">AI will verify quality before posting</p>
          </div>
        </button>

        <h2 className="text-lg font-bold text-foreground mb-3">Recent Donations</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-10">
            <Package size={40} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">Abhi tak koi donation nahi ki</p>
            <button onClick={() => navigate("/donor/post")} className="mt-3 py-2 px-6 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
              Pehli Donation Karein
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {donations.map((d) => {
              const imgUrl = getImageUrl(d.image_url);
              return (
                <div key={d.id} className="food-card flex items-center gap-3 p-3">
                  {imgUrl ? (
                    <img src={imgUrl} alt={d.title} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Package size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">{d.title}</h4>
                    <p className="text-xs text-muted-foreground font-body">📍 {d.location}</p>
                    <p className="text-xs text-muted-foreground font-body">🍽 {d.quantity} servings</p>
                  </div>
                  <span className={getStatusBadge(d.status)}>
                    {getStatusLabel(d.status)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorDashboard;
