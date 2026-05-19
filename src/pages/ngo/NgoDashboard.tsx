import { useState, useEffect, useCallback } from "react";
import { Home, Package, CheckCircle, Bell, Loader2, Truck, User, MessageCircle, Eye, UserPlus, MapPin, Utensils, LogOut, Phone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ContactVerification } from "@/components/ContactVerification";
import { useAuth } from "@/context/AuthContext";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const NgoDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [donations, setDonations] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cache_n_donations");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [volunteers, setVolunteers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cache_n_volunteers");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(donations.length === 0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [stats, setStats] = useState({ received: 0, inProgress: 0, available: 0 });

  const fetchData = useCallback(async (showLoading = false) => {
    if (!user) return;
    console.log("NGO: Fetching data...");
    // We only set loading if we don't have cached data to show
    if (showLoading && donations.length === 0) setLoading(true);

    try {
      const { data: donationsRes, error } = await supabase
        .from("food_donations")
        .select("*")
        .in("status", ["posted", "accepted", "picked_up", "delivered"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Extract donor ids and fetch profiles separately
      const donorIds = [...new Set(donationsRes?.map(d => d.donor_id) || [])].filter(Boolean);
      let donorProfiles: any[] = [];
      if (donorIds.length > 0) {
        const { data: pData } = await supabase.from("profiles").select("id, phone, full_name").in("id", donorIds);
        donorProfiles = pData || [];
      }
      const donorMap = new Map(donorProfiles.map(p => [p.id, p]));

      const enrichedDonations = (donationsRes || []).map(d => ({
        ...d,
        donor: donorMap.get(d.donor_id)
      }));

      const [volunteersRes, notificationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, organization_id")
          .eq("organization_id", user.id),

        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
      ]);

      const allDonations = enrichedDonations;
      const myVolunteers = volunteersRes.data || [];

      setDonations(allDonations);
      setVolunteers(myVolunteers);
      setUnreadNotifications(notificationsRes.count || 0);

      localStorage.setItem("cache_n_donations", JSON.stringify(allDonations));
      localStorage.setItem("cache_n_volunteers", JSON.stringify(myVolunteers));
      setStats({
        available: allDonations.filter(d => d.status === "posted").length,
        inProgress: allDonations.filter(d => d.status === "accepted" || d.status === "picked_up").length,
        received: allDonations.filter(d => d.status === "delivered").length,
      });
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, donations.length]);

  const handleLogout = () => {
    signOut();
  };

  useEffect(() => {
    if (authLoading || !user) return;

    fetchData(donations.length === 0);

    const channel = supabase
      .channel("ngo-donations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_donations",
        },
        () => {
          fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, fetchData]);

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleCall = (phone: string | null) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Assalam o Alaikum, this is the SafeBite coordinator. I want to discuss the food donation logistics.`);
    window.open(`https://wa.me/${cleanPhone}/?text=${message}`, "_blank");
  };

  const location = useLocation();
  const isRequestsTab = location.pathname === "/ngo/requests";

  const handleAcceptDonation = async (donationId: string) => {
    if (!user) return;
    await supabase.from("food_donations").update({
      status: "accepted",
      ngo_verified_by: user.id,
      ngo_verified_at: new Date().toISOString(),
    }).eq("id", donationId);

    // Background notify
    supabase.from("food_donations").select("title, donor_id").eq("id", donationId).single().then(({ data: donation }) => {
      if (donation) {
        supabase.from("notifications").insert({
          user_id: donation.donor_id,
          title: "Food Accepted!",
          message: `An NGO has accepted your donation: ${donation.title}.`,
          type: "info",
          related_donation_id: donationId,
        }).then(() => {});
      }
    });

    toast.success("Food donation accepted! Now assign a rider.");
    setAssigningId(donationId);
    fetchData();
  };

  const handleAssignVolunteer = async (donationId: string) => {
    if (!selectedVolunteer) {
      toast.error("Please select a rider first!");
      return;
    }
    await supabase.from("food_donations").update({
      assigned_volunteer_id: selectedVolunteer,
      status: "picked_up",
    }).eq("id", donationId);
    toast.success("Rider assigned! They will pick up the food now.");
    setAssigningId(null);
    setSelectedVolunteer("");
    fetchData();
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
              <p className="text-[10px] uppercase font-bold text-primary-foreground/60 tracking-widest">NGO / ORG</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { 
                localStorage.removeItem("cache_n_donations");
                localStorage.removeItem("cache_n_volunteers");
                fetchData(true);
                toast.success("Cache Cleared! 🔄"); 
              }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-primary-foreground hover:bg-white/20 transition-all" title="Clear Cache">
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
        {!isRequestsTab && (
          <>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-foreground">Marketplace</h2>
              <div className="bg-primary/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider">
                {donations.filter(d => d.status === "posted").length} Available
              </div>
            </div>

            {loading && donations.length === 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-32 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : donations.filter(d => d.status === "posted").length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-[2rem] border border-dashed border-border/50">
                <Package size={44} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-body">Marketplace is empty</p>
                <p className="text-[10px] text-muted-foreground/60 px-8 mt-1">New food donations will appear here in real-time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {donations.filter(d => d.status === "posted").map((d) => {
                  const imgUrl = getImageUrl(d.image_url);
                  return (
                    <div key={d.id} className="food-card p-4 overflow-hidden group">
                      <div className="flex gap-4">
                        <div className="relative">
                          {imgUrl ? (
                            <img src={imgUrl} alt={d.title} className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-1 ring-border/50 transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center border border-border shadow-inner">
                              <Package size={28} className="text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success text-white flex items-center justify-center shadow-md">
                            <span className="text-[8px] font-black">★</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate mb-0.5">{d.title}</h4>
                          <p className="text-[10px] text-primary font-black uppercase tracking-wider mb-1">Donor: {d.donor?.full_name || "Community"}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/30">
                              <MapPin size={10} className="text-primary" /> {d.location.split(',')[0]}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/30">
                              <Utensils size={10} className="text-primary" /> {d.quantity} servings
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100/50 inline-block">
                            🗓 Pickup: {d.pickup_day}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleAcceptDonation(d.id)}
                          className="flex-[2] py-2.5 rounded-xl font-bold text-primary-foreground gradient-primary text-xs transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                        >
                          Claim Food
                        </button>
                        <button
                          onClick={() => handleCall(d.donor?.phone)}
                          className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all active:scale-90 hover:bg-primary hover:text-white"
                        >
                          <Phone size={16} />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(d.donor?.phone)}
                          className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center transition-all active:scale-90 hover:bg-[#25D366] hover:text-white"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {isRequestsTab && (
          <>
            {/* Accepted — Assign Rider */}
            <h2 className="text-lg font-bold text-foreground mb-3">Your Active Requests</h2>
            
            {donations.filter(d => (d.status === "accepted" || d.status === "picked_up") && d.ngo_verified_by === user?.id).length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed border-border mt-2">
                <Truck size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No active pickup requests</p>
                <button 
                  onClick={() => navigate("/ngo")}
                  className="mt-4 text-xs font-bold text-primary underline"
                >
                  View Available Food
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {donations.filter(d => d.status === "accepted" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase text-muted-foreground mb-3 tracking-widest">Pending Assignment</h3>
                    <div className="flex flex-col gap-3">
                      {donations.filter(d => d.status === "accepted" && d.ngo_verified_by === user?.id).map((d) => (
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

                          <div className="space-y-2">
                            {volunteers.length > 0 ? (
                              <>
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
                              </>
                            ) : (
                              <div className="bg-muted rounded-xl p-4 text-center">
                                <Truck size={24} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-xs text-muted-foreground">No riders joined yet. Share your Team Code from Profile.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {donations.filter(d => d.status === "picked_up" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase text-muted-foreground mb-3 tracking-widest">In Progress</h3>
                    <div className="flex flex-col gap-3">
                      {donations.filter(d => d.status === "picked_up" && d.ngo_verified_by === user?.id).map((d) => {
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
                            <div className="flex gap-1.5 px-2">
                               <button onClick={() => handleCall(volunteer?.phone)} className="text-primary hover:scale-110"><Phone size={14} /></button>
                               <button onClick={() => handleWhatsApp(volunteer?.phone)} className="text-[#25D366] hover:scale-110"><MessageCircle size={14} /></button>
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
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default NgoDashboard;
