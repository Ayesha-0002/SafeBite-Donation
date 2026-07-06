import { useState, useEffect, useCallback } from "react";
import { Home, PlusCircle, Clock, User, Bell, Package, Loader2, Utensils, LogOut, Phone, MessageCircle, Scan, ChevronRight, Activity } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ContactVerification } from "@/components/ContactVerification";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: Scan, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0 });
  const [selectedStat, setSelectedStat] = useState<{ label: string; count: number; items: any[] } | null>(null);
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
          .select("*")
          .eq("donor_id", user.id)
          .order("created_at", { ascending: false })
      ]);
      
      setUnreadNotifications(notifRes.count || 0);

      const rawDonations = donationRes.data || [];
      
      // Fetch volunteer profiles separately
      const volunteerIds = [...new Set(rawDonations.map(d => d.assigned_volunteer_id))].filter(Boolean);
      let volunteersMap = new Map();
      if (volunteerIds.length > 0) {
        const { data: vProfiles } = await supabase.from("profiles").select("id, phone, full_name").in("id", volunteerIds);
        volunteersMap = new Map(vProfiles?.map(v => [v.id, v]) || []);
      }

      const allDonations = rawDonations.map(d => ({
        ...d,
        volunteer: volunteersMap.get(d.assigned_volunteer_id)
      }));

      setDonations(allDonations.slice(0, 10)); // Local UI limit

      // Calculate stats from the full list
      const newStats = {
        total: allDonations.length,
        pending: allDonations.filter(d => d.status !== "delivered").length,
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
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast.error("Rider WhatsApp unavailable");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "92" + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {
      formattedPhone = "92" + cleanPhone;
    }
    const message = encodeURIComponent(`Assalam o Alaikum, this is regarding the SafeBite food donation. I am the ${profile?.full_name || 'assigned person'}.`);
    window.open(`https://wa.me/${formattedPhone}/?text=${message}`, "_blank");
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/notifications")} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-primary-foreground relative hover:bg-white/20 transition-all">
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center border-2 border-primary text-white animate-pulse">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>        <div className="grid grid-cols-3 gap-4">
          {[
            { 
              value: stats.total.toString(), 
              label: "DONATIONS",
              items: donations
            },
            { 
              value: stats.pending.toString(), 
              label: "PENDING",
              items: donations.filter(d => d.status !== "delivered")
            },
            { 
              value: stats.delivered.toString(), 
              label: "DELIVERED",
              items: donations.filter(d => d.status === "delivered")
            },
          ].map((stat) => (
            <button 
              key={stat.label} 
              onClick={() => setSelectedStat({ label: stat.label, count: Number(stat.value), items: stat.items })}
              className="bg-white/20 backdrop-blur-xl rounded-[1.8rem] p-5 text-center hover:bg-white/30 active:scale-95 transition-all outline-none border border-white/20 cursor-pointer group relative shadow-2xl shadow-black/10"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <p className="text-3xl font-bold text-white group-hover:scale-110 transition-transform duration-500">{stat.value}</p>
              <p className="text-[9px] text-white/80 font-bold uppercase tracking-[0.2em] mt-1 whitespace-nowrap">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedStat} onOpenChange={(open) => !open && setSelectedStat(null)}>
        <DialogContent className="max-w-[85%] w-[340px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white select-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedStat?.label}</DialogTitle>
            <DialogDescription>Overview and detailed breakdown of {selectedStat?.label}</DialogDescription>
          </DialogHeader>
          <div className="gradient-primary p-5 pb-8 relative overflow-hidden">
             <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
             
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-sm">
                  <Activity size={20} className="stroke-[2.5]" />
                </div>
                <div>
                   <h2 className="text-lg font-bold text-white tracking-tight leading-none">{selectedStat?.label}</h2>
                   <p className="text-white/50 text-[8px] mt-1 font-bold uppercase tracking-[0.2em]">Live Insights</p>
                </div>
             </div>
  
             <div className="flex items-end justify-between px-1">
                <div>
                   <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Current</p>
                   <p className="text-4xl font-bold text-white leading-none tracking-tighter">{selectedStat?.count}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/10 text-white/80 text-[8px] font-black uppercase tracking-wider border border-white/10 backdrop-blur-sm">
                   <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                   Active Record
                </div>
             </div>
          </div>
  
          <div className="bg-white -mt-4 rounded-t-[2rem] p-4 pt-8 min-h-[240px] max-h-[55vh] overflow-y-auto relative z-10">
             <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] flex items-center gap-1.5">
                   <span className="w-1 h-1 rounded-full bg-primary" />
                   Recent Details
                </h3>
             </div>
  
             {selectedStat?.items && selectedStat.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedStat.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-primary/10 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary/70 shrink-0">
                        <Package size={14} className="stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{item.title}</p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.status}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-primary leading-none">{item.quantity}</p>
                        <p className="text-[6px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">Units</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                   <Package size={24} className="text-slate-100 mb-2" />
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Records</p>
                </div>
              )}
  
              <button 
                onClick={() => {
                  setSelectedStat(null);
                  navigate("/donor/history");
                }}
                className="w-full mt-6 py-3 rounded-xl bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.25em] shadow-lg shadow-slate-100 active:scale-[0.97] transition-all hover:bg-slate-800"
              >
                 Detailed Profile
              </button>
           </div>
         </DialogContent>
       </Dialog>
 
       <div className="page-padding mt-4 relative z-10">
         <button
           onClick={() => navigate("/donor/post")}
           className="w-full bg-white rounded-3xl p-5 flex items-center gap-5 mb-8 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-slate-50 hover:shadow-xl transition-all active:scale-[0.98] group relative overflow-hidden"
         >
           <div className="w-14 h-14 rounded-2xl bg-[#ff9800]/10 flex items-center justify-center border border-[#ff9800]/20 shadow-sm transition-transform group-hover:scale-105">
             <PlusCircle size={30} className="text-[#ff9800] stroke-[2.5]" />
           </div>
           <div className="text-left">
             <h2 className="font-bold text-[#0f172a] text-xl tracking-tight leading-none">Post Surplus Food</h2>
             <p className="text-sm text-slate-500 mt-1">Share your extra meals today</p>
           </div>
           <div className="ml-auto w-10 h-10 rounded-full bg-slate-50/50 flex items-center justify-center text-slate-200 group-hover:bg-primary/5 group-hover:text-primary transition-all">
             <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
           </div>
         </button>
 
         <div className="flex items-center justify-between mb-4 px-1">
           <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">Recent Donations</h2>
         </div>
        
        {loading ? (
          <div className="flex flex-col gap-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="w-full h-24 bg-slate-50 animate-pulse rounded-3xl" />
             ))}
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <Package size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No donations found</p>
            <button onClick={() => navigate("/donor/post")} className="mt-4 py-2 px-8 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              Donate Now
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {donations.map((d) => {
              const imgUrl = getImageUrl(d.image_url);
              return (
                <div key={d.id} className="bg-white rounded-[2rem] p-3.5 flex items-center gap-4 border border-slate-50 shadow-sm hover:shadow-md transition-all group">
                  <div className="relative shrink-0">
                    {imgUrl ? (
                      <img src={imgUrl} alt={d.title} loading="lazy" className="w-20 h-20 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Package size={28} className="text-slate-200" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1">
                      <span className={`${getStatusBadge(d.status)} px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-sm border border-white/50`}>
                        {getStatusLabel(d.status).split(' ')[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 text-sm truncate leading-tight">{d.title}</h4>
                    <div className="flex flex-col gap-1 mt-1.5">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <span className="opacity-50">📍</span> {d.location}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-tighter">
                          <Clock size={10} className="stroke-[3]" /> {new Date(d.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </p>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                          Qty: {d.quantity}
                        </p>
                      </div>
                    </div>
                    {d.volunteer && (
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                              <User size={10} className="text-emerald-500" />
                           </div>
                           <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{d.volunteer.full_name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCall(d.volunteer.phone)} className="p-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-colors"><Phone size={12} /></button>
                          <button onClick={() => handleWhatsApp(d.volunteer.phone)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-colors"><MessageCircle size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
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
