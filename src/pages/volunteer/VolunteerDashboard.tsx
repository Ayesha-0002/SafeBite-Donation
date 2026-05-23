import { useState, useEffect, useCallback } from "react";
import { Home, MapPin, Package, MessageCircle, User, Navigation, Bell, Loader2, Utensils, LogOut, Phone, Eye } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ContactVerification } from "@/components/ContactVerification";
import { useAuth } from "@/context/AuthContext";
import { openWhatsApp } from "@/lib/utils";

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [pickups, setPickups] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cache_v_pickups");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = "assigned";

  const [loading, setLoading] = useState(pickups.length === 0);

  // Simplified BottomNav for better UX
  const volunteerNav = [
    { icon: Home, label: "Home", path: "/volunteer" },
    { icon: Bell, label: "Alerts", path: "/notifications" },
    { icon: User, label: "Profile", path: "/volunteer/profile" },
  ];
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [stats, setStats] = useState({ done: 0, active: 0, rating: "0" });

  const fetchData = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    try {
      const [assignedRes, trackingRes, ratingsRes, notificationsRes] = await Promise.all([
        supabase
          .from("food_donations")
          .select("*")
          .eq("assigned_volunteer_id", user.id)
          .in("status", ["picked_up", "accepted"])
          .order("created_at", { ascending: false }),
        
        supabase.from("volunteer_tracking").select("donation_id, status").eq("volunteer_id", user.id),

        supabase
          .from("donation_ratings")
          .select("rating")
          .eq("rated_user_id", user.id),

        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
      ]);
      
      const assignedRaw = assignedRes.data || [];

      // Manual Enrichment for donor profiles
      const donorIds = [...new Set(assignedRaw.map(d => d.donor_id))].filter(Boolean);
      let profileMap = new Map();
      if (donorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, phone, full_name, avatar_url").in("id", donorIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      const assignedEnriched = assignedRaw.map(d => ({ ...d, donor: profileMap.get(d.donor_id) }));

      setPickups(assignedEnriched);
      setUnreadNotifications(notificationsRes.count || 0);

      const tracking = trackingRes.data || [];
      const ratingsData = ratingsRes.data || [];
      const avgRating = ratingsData.length > 0
        ? (ratingsData.reduce((sum, r: any) => sum + r.rating, 0) / ratingsData.length).toFixed(1)
        : "N/A";

      // A delivery is active if it's assigned to me AND not delivered yet
      const activeCount = assignedEnriched.length;
      const doneCount = tracking.filter(t => t.status === "delivered").length;

      setStats({
        done: doneCount,
        active: activeCount,
        rating: avgRating
      });

      // Update cache
      localStorage.setItem("cache_v_pickups", JSON.stringify(assignedEnriched));
    } catch (error: any) {
      console.error("Volunteer dashboard fetch error:", error);
      toast.error("Failed to fetch jobs: " + (error.message || "Connection error"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = () => {
    signOut();
  };

  useEffect(() => {
    if (authLoading || !user) return;
    
    // Only show loading if we really have no data yet
    fetchData(pickups.length === 0);

    // Add real-time listener for assignment updates
    const channel = supabase
      .channel("volunteer-assignment-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "food_donations",
          filter: `assigned_volunteer_id=eq.${user.id}`,
        },
        () => {
          fetchData(false); // Don't show loading skeletons for bg updates
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, fetchData]);

  const handleClaimDonation = async (donationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("food_donations")
        .update({ 
          assigned_volunteer_id: user.id,
          status: "accepted" 
        })
        .eq("id", donationId)
        .is("assigned_volunteer_id", null);

      if (error) throw error;

      // Background notify
      supabase.from("food_donations").select("title, donor_id").eq("id", donationId).single().then(({ data: donation }) => {
        if (donation) {
          supabase.from("notifications").insert({
            user_id: donation.donor_id,
            title: "Food Claimed!",
            message: `A volunteer has claimed your donation: ${donation.title}.`,
            type: "pickup-assigned",
            related_donation_id: donationId,
          }).then(() => {});
        }
      });

      toast.success("Donation claimed! Go to Pickups to start.");
      fetchData();
    } catch (e: any) {
      toast.error("Could not claim. It might have been taken by someone else.");
    }
  };

  const handleGoogleMaps = (location: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  };

  const handleCall = (phone: string | null) => {
    if (!phone) {
      toast.error("Donor contact number not found in their profile.");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppChat = (phone: string | null) => {
    if (!phone) {
      toast.error("Donor's WhatsApp number is not available.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    // Resilient Pakistani number formatting
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "92" + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {
      formattedPhone = "92" + cleanPhone;
    }
    
    window.open(`https://wa.me/${formattedPhone}?text=Assalam o Alaikum, I am SafeBite volunteer. I am coming for food pickup.`, "_blank");
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
      <div className="gradient-primary px-5 pt-6 pb-10 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-primary-foreground hover:bg-white/20 transition-all mr-1">
              <Package size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Utensils size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground tracking-tight">SafeBite</h1>
                <p className="text-[9px] uppercase font-bold text-primary-foreground/60 tracking-widest">Volunteer</p>
              </div>
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
            { value: stats.done.toString(), label: "Pickups Done" },
            { value: stats.rating, label: "Rating" },
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
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
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
            {pickups.length === 0 ? (
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
                          <img src={imgUrl} alt={p.title} loading="lazy" className="w-16 h-16 rounded-xl object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                            <Package size={24} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-sm truncate">{p.title}</h4>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleCall(p.donor?.phone)}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary transition-all active:scale-90"
                                title="Call Donor"
                              >
                                <Phone size={14} />
                              </button>
                              <button 
                                onClick={() => handleWhatsAppChat(p.donor?.phone)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] transition-all active:scale-90"
                                title="WhatsApp Donor"
                              >
                                <MessageCircle size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground font-body">📍 {p.location}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground font-bold">🍽 {p.quantity} servings</span>
                            <span className="text-xs text-muted-foreground">📅 {p.pickup_day}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleGoogleMaps(p.location)} className="flex-1 py-2.5 rounded-xl font-bold bg-secondary/10 text-secondary text-xs flex items-center justify-center gap-2">
                          <MapPin size={14} /> View Map
                        </button>
                        <button onClick={() => handleStartPickup(p.id)} className="flex-[2] py-2.5 rounded-xl font-bold text-primary-foreground gradient-primary text-xs transition-all hover:opacity-90 active:scale-[0.98]">
                          Start Tracking
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav items={volunteerNav} />
    </div>
  );
};

export default VolunteerDashboard;
