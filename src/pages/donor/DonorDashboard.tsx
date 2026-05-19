import { useState, useEffect, useCallback } from "react";
import { Home, PlusCircle, Clock, User, Bell, Package, Loader2, Utensils, LogOut, Phone, MessageCircle, Eye } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ContactVerification } from "@/components/ContactVerification";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, meals: 0, delivered: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [verification, setVerification] = useState<{ open: boolean; phone: string; type: "call" | "wa" | null }>({
    open: false,
    phone: "",
    type: null,
  });

  const fetchData = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      console.log("Fetching dashboard data for user:", user.id);
      // Combine queries if possible or just ensure they are efficient
      const [notifRes, donationRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("food_donations")
          .select("*, volunteer:profiles!left.assigned_volunteer_id(id, phone, full_name)")
          .eq("donor_id", user.id)
          .order("created_at", { ascending: false })
      ]);
      
      setUnreadNotifications(notifRes.count || 0);

      const allDonations = donationRes.data || [];
      console.log("Fetched donations for user", user.id, ":", allDonations);
      setDonations(allDonations.slice(0, 10)); // Local UI limit

      // Calculate stats from the full list
      const newStats = {
        total: allDonations.length,
        meals: allDonations.reduce((sum, d) => sum + Number(d.quantity || 0), 0),
        delivered: allDonations.filter(d => d.status === "delivered").length,
      };
      console.log("Calculated stats:", newStats);
      setStats(newStats);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  const handleLogout = async () => {
    signOut();
  };

  useEffect(() => {
    if (authLoading || !user) return;

    fetchData(true);

    // Listen for changes to my donations
    const channel = supabase
      .channel("donor-donations-updates")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "food_donations",
          filter: `donor_id=eq.${user.id}` 
        },
        (payload) => {
          console.log("Realtime update detected:", payload);
          fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, donations.length, fetchData]);

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleCall = (phone: string | null) => {
    if (!phone) {
      toast.error("Rider contact unavailable");
      return;
    }
    setVerification({ open: true, phone, type: "call" });
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast.error("Rider WhatsApp unavailable");
      return;
    }
    setVerification({ open: true, phone, type: "wa" });
  };

  const executeContact = () => {
    const { phone, type } = verification;
    if (type === "call") {
      window.location.href = `tel:${phone}`;
    } else if (type === "wa") {
      const cleanPhone = phone.replace(/\D/g, "");
      const message = encodeURIComponent(`Assalam o Alaikum, this is regarding the SafeBite food donation. I am the ${profile?.full_name || 'assigned person'}.`);
      window.open(`https://wa.me/${cleanPhone}/?text=${message}`, "_blank");
    }
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
      {/* Header */}
      <div className="gradient-primary px-5 pt-6 pb-10 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
              <Utensils size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground tracking-tight">SafeBite</h1>
              <p className="text-[10px] uppercase font-bold text-primary-foreground/60 tracking-widest">Donor Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchData(); toast.success("Refreshed! 🔄"); }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-primary-foreground hover:bg-white/20 transition-all">
              <Eye size={18} />
            </button>
            <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-primary-foreground relative hover:bg-white/20 transition-all">
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center border-2 border-primary text-white animate-pulse">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/20 flex items-center justify-center text-white hover:bg-destructive transition-all shadow-lg"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
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
            <p className="text-xs text-muted-foreground font-body">Share your extra meals today</p>
          </div>
        </button>

        <h2 className="text-lg font-bold text-foreground mb-3">Recent Donations</h2>
        
        {loading ? (
          <div className="flex flex-col gap-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="w-full h-20 bg-muted animate-pulse rounded-2xl" />
             ))}
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-10">
            <Package size={40} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">You haven't made any donations yet</p>
            <button onClick={() => navigate("/donor/post")} className="mt-3 py-2 px-6 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
              Make Your First Donation
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
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                        📍 {d.location}
                      </p>
                      <p className="text-[10px] text-primary/70 font-medium flex items-center gap-1">
                        <Clock size={10} /> {new Date(d.created_at).toLocaleString('en-US', { 
                          day: 'numeric', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1 mt-0.5">
                        🗓 Pickup: {d.pickup_day}
                      </p>
                    </div>
                    {d.volunteer && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Rider: {d.volunteer.full_name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleCall(d.volunteer.phone)} className="text-primary hover:scale-110 transition-all"><Phone size={10} /></button>
                          <button onClick={() => handleWhatsApp(d.volunteer.phone)} className="text-[#25D366] hover:scale-110 transition-all"><MessageCircle size={10} /></button>
                        </div>
                      </div>
                    )}
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
      
      <ContactVerification 
        isOpen={verification.open}
        phoneNumber={verification.phone}
        onClose={() => setVerification({ ...verification, open: false })}
        onVerified={executeContact}
      />
    </div>
  );
};

export default DonorDashboard;
