import { useState, useEffect, useCallback } from "react";
import { Home, Package, CheckCircle, Bell, Loader2, Truck, User, MessageCircle, Eye, UserPlus, MapPin, Utensils, LogOut, Phone, Star } from "lucide-react";
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

const RiderAssignmentControl = ({ 
  donationId, 
  volunteers, 
  onAssign,
  ratings
}: { 
  donationId: string; 
  volunteers: any[]; 
  onAssign: (donationId: string, volunteerId: string) => Promise<void>;
  ratings: any[];
}) => {
  const [localSelected, setLocalSelected] = useState("");

  // Helper to calculate volunteer stats
  const getVolunteerStats = (volunteerId: string) => {
    const vRatings = ratings.filter(r => r.rated_user_id === volunteerId);
    const avgRating = vRatings.length > 0 ? vRatings.reduce((acc, r) => acc + r.rating, 0) / vRatings.length : 0;
    return {
      avgRating,
      count: vRatings.length
    };
  };

  const sortedVolunteers = [...volunteers]
    .filter(v => {
      // Only show riders with active, available, pending, or approved status (don't hide pending/registered riders)
      const label = (v.statusLabel || "").toLowerCase();
      return (
        label.includes("approved") || 
        label.includes("available") || 
        label.includes("pending") || 
        label === "rider" || 
        !label || 
        label.includes("active")
      );
    })
    .sort((a, b) => {
      const statsA = getVolunteerStats(a.id);
      const statsB = getVolunteerStats(b.id);
      return statsB.avgRating - statsA.avgRating; // Sort by rating descending
    });

  return (
    <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Rider to Assign (Sorted by Rating)</h5>
      </div>
      
      <div className="bg-background border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-sm divide-y divide-border/30">
        {sortedVolunteers.length > 0 ? (
          sortedVolunteers.map(v => {
            const stats = getVolunteerStats(v.id);
            return (
              <div
                key={v.id}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-card hover:bg-muted/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0 border border-primary/20">
                    {(v.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-foreground">
                      {v.full_name || "Unknown Rider"}
                    </div>
                    <div className="text-[9px] text-muted-foreground truncate uppercase flex items-center gap-2 flex-wrap mt-0.5">
                        {v.phone || v.email || "No phone"}
                        <span className="flex items-center gap-0.5 text-yellow-600 font-bold">
                            <Star size={9} className="fill-yellow-600" /> {stats.avgRating.toFixed(1)} ({stats.count} reviews)
                        </span>
                        {v.statusLabel && (
                          <span className={`px-1 rounded-[4px] font-extrabold text-[7px] tracking-wide uppercase ${
                            v.statusLabel === "Approved Rider" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            v.statusLabel === "Approval Pending" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            v.statusLabel === "Approval Rejected" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                            "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          }`}>
                            {v.statusLabel}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await onAssign(donationId, v.id);
                    }}
                    className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest text-[#15803d] bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-300 shadow-sm"
                  >
                    Assign
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">No active riders found.</div>
        )}
      </div>
    </div>
  );
};

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
  const [stats, setStats] = useState({ received: 0, inProgress: 0, available: 0 });

  // Verification state
  const [verificationDialog, setVerificationDialog] = useState<{ isOpen: boolean; phone: string; action: () => void }>({ 
    isOpen: false, 
    phone: "", 
    action: () => {} 
  });
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);

  // Volunteer & Rating states
  const [myRatings, setMyRatings] = useState<any[]>([]);
  const [ratingDialog, setRatingDialog] = useState<{ volunteerId: string; volunteerName: string; donationId: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

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

      // 1. Get volunteer/rider user_ids from user_roles and merge with registration requests in a single robust list
      const [volRolesRes, regRequestsRes, excludedRolesRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["volunteer", "rider"]),
        supabase
          .from("registration_requests")
          .select("user_id, status")
          .in("requested_role", ["volunteer", "rider"]),
        supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["ngo", "donor"])
      ]);

      const volRoles = volRolesRes.data || [];
      const regRequests = regRequestsRes.data || [];
      const excludedRoles = excludedRolesRes.data || [];
      
      const roleUserIds = volRoles.map(r => r.user_id).filter(Boolean);
      const reqUserIds = regRequests.map(r => r.user_id).filter(Boolean);
      const excludedUserIds = new Set(excludedRoles.map(r => r.user_id).filter(Boolean));
      
      // Combine resources to get all registered riders/volunteers cleanly
      const mergedSet = new Set([...roleUserIds, ...reqUserIds]);
      
      // Remove any explicit NGO/Donor user IDs
      for (const id of excludedUserIds) {
        mergedSet.delete(id);
      }
      mergedSet.delete(user.id); // Exclude the NGO itself

      let volunteerIds: string[] = Array.from(mergedSet);
      console.log("NGO Dashboard: Merged unique registered volunteer IDs:", volunteerIds);

      // Fallback C: If STILL empty, let's fetch all profiles in the system as a last resort so testing is bulletproof
      if (volunteerIds.length === 0) {
        console.log("NGO Dashboard: No registered volunteers. Falling back to all profiles for testing...");
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name");
          
        if (allProfiles && allProfiles.length > 0) {
          volunteerIds = allProfiles
            .filter(p => {
              if (p.id === user.id) return false;
              if (excludedUserIds.has(p.id)) return false;
              const name = (p.full_name || "").toLowerCase();
              if (name === "ngo" || name === "donor" || name.includes("ngo") || name.includes("donor") || name === "real") {
                return false;
              }
              return true;
            })
            .map(p => p.id);
          console.log("NGO Dashboard Fallback C: Total fallback profile IDs (excluding non-volunteers):", volunteerIds.length);
        }
      }

      // 2. Fetch profiles, notifications, and ratings in parallel
      const [profilesRes, notificationsRes, ratingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", volunteerIds.length > 0 ? volunteerIds : ["dummy-id"]),
        
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),

        supabase
          .from("donation_ratings")
          .select("*")
          .eq("rated_by_user_id", user.id)
      ]);

      if (profilesRes.error) throw profilesRes.error;

      setMyRatings(ratingsRes.data || []);
      const allDonations = enrichedDonations;
      
      const regStatusMap = new Map(regRequests.map(r => [r.user_id, r.status]));
      const myVolunteers = (profilesRes.data || []).map((v: any) => {
        const isApprovedRole = (volRoles || []).some(vr => vr.user_id === v.id);
        const regStatus = regStatusMap.get(v.id);
        
        let statusLabel = "Rider";
        if (isApprovedRole || regStatus === "approved") {
          statusLabel = "Approved Rider";
        } else if (regStatus === "pending") {
          statusLabel = "Approval Pending";
        } else if (regStatus === "rejected") {
          statusLabel = "Approval Rejected";
        } else {
          statusLabel = "Available Rider";
        }
        
        return {
          ...v,
          statusLabel
        };
      });
      
      console.log("NGO Dashboard Fetched Volunteers:", myVolunteers);

      console.log("NGO Dashboard:", { 
        totalFetched: allDonations.length, 
        posted: allDonations.filter(d => d.status === "posted").length,
        statusCounts: allDonations.reduce((acc: any, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {})
      });

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
      
      if (allDonations.length === 0) {
        console.log("NGO Dashboard: No donations found in query.");
      }
    } catch (err: any) {
      console.error("Fetch Data Error:", err);
      toast.error("Failed to fetch donations: " + (err.message || "Connection error"));
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
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
    if (!phone) {
      toast.error("Contact number not found in profile.");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string | null, userName: string = "User") => {
    if (!phone) {
      toast.error("WhatsApp number not available");
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
    
    const message = encodeURIComponent(`Assalam o Alaikum ${userName}, this is SafeBite NGO coordinator. We are interested in your cooperation regarding food redistribution.`);
    window.open(`https://wa.me/${formattedPhone}/?text=${message}`, "_blank");
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

  const handleAssignVolunteer = async (donationId: string, volunteerId: string) => {
    if (!volunteerId) {
      toast.error("Please select a rider first!");
      return;
    }
    await supabase.from("food_donations").update({
      assigned_volunteer_id: volunteerId,
      status: "picked_up",
    }).eq("id", donationId);

    // Background notify assigned volunteer and donor
    supabase.from("food_donations").select("title, donor_id").eq("id", donationId).single().then(({ data: donation }) => {
      if (donation) {
        const volunteerInfo = volunteers.find(v => v.id === volunteerId);
        const volunteerName = volunteerInfo?.full_name || "A rider";

        // 1. Notify volunteer/rider
        supabase.from("notifications").insert({
          user_id: volunteerId,
          title: "New Ride Assigned! 🚴",
          message: `You have been assigned to pick up and deliver: ${donation.title}.`,
          type: "pickup-assigned",
          related_donation_id: donationId,
        }).then(() => {});

        // 2. Notify donor
        supabase.from("notifications").insert({
          user_id: donation.donor_id,
          title: "Rider Dispatched! 🚴",
          message: `${volunteerName} is on their way to pick up your donation: ${donation.title}.`,
          type: "info",
          related_donation_id: donationId,
        }).then(() => {});
      }
    });

    toast.success("Rider assigned! They will pick up the food now.");
    setAssigningId(null);
    fetchData();
  };

  const handleSubmitRating = async () => {
    if (!ratingDialog) return;
    if (ratingValue === 0) {
      toast.error("Please select a rating from 1 to 5 stars");
      return;
    }
    setSubmittingRating(true);
    try {
      const { error } = await supabase.from("donation_ratings").insert({
        donation_id: ratingDialog.donationId,
        rated_user_id: ratingDialog.volunteerId,
        rated_by_user_id: user.id,
        rating: ratingValue,
        comment: ratingComment || null,
      });

      if (error) {
        toast.error("Rating submission failed: " + error.message);
        return;
      }

      toast.success(`Rated ${ratingDialog.volunteerName} ⭐${ratingValue} successfully!`);
      setRatingDialog(null);
      setRatingValue(0);
      setRatingComment("");

      // Refresh data to show rated state
      await fetchData();
    } catch (err: any) {
      toast.error("Error submitting rating: " + err.message);
    } finally {
      setSubmittingRating(false);
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
                            <img src={imgUrl} alt={d.title} loading="lazy" className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-1 ring-border/50 transition-transform group-hover:scale-105" />
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
                          onClick={() => handleWhatsApp(d.donor?.phone, d.donor?.full_name)}
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
                        <div key={d.id} className="glass-card-elevated p-4 space-y-4">
                          {/* Donor Contact Row */}
                          <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Donor Contact</p>
                              <p className="text-xs font-bold text-foreground">{d.donor?.full_name || "Community Donor"}</p>
                              <p className="text-[10px] text-muted-foreground">{d.donor?.phone || "No phone number available"}</p>
                            </div>
                            {d.donor?.phone && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCall(d.donor.phone)}
                                  className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                  title="Call Donor"
                                >
                                  <Phone size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleWhatsApp(d.donor.phone, d.donor.full_name)}
                                  className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                                  title="WhatsApp Donor"
                                >
                                  <MessageCircle size={14} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                              <Truck size={20} className="text-secondary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">{d.title}</h4>
                              <p className="text-xs text-muted-foreground">📍 {d.location} · 🍽 {d.quantity} servings</p>
                            </div>
                          </div>

                          <RiderAssignmentControl
                            donationId={d.id}
                            volunteers={volunteers}
                            ratings={myRatings}
                            onAssign={handleAssignVolunteer}
                          />
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
                          <div key={d.id} className="glass-card p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Truck size={20} className="text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground text-sm">{d.title}</h4>
                                <p className="text-xs text-muted-foreground">📍 {d.location}</p>
                              </div>
                              <button
                                onClick={() => navigate(`/ngo/track?donation=${d.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold shrink-0 hover:bg-primary hover:text-white transition-all"
                              >
                                <MapPin size={12} /> Track
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                              {/* Rider Contact Column */}
                              <div className="bg-muted/30 p-2 rounded-xl border border-border/30 flex items-center justify-between">
                                <div className="min-w-0 pr-1">
                                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Rider</p>
                                  <p className="text-[10px] font-bold text-foreground truncate">{volunteer?.full_name || "Assigned Rider"}</p>
                                </div>
                                {volunteer?.phone && (
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleCall(volunteer.phone)} className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all" title="Call Rider">
                                      <Phone size={10} />
                                    </button>
                                    <button onClick={() => handleWhatsApp(volunteer.phone, volunteer.full_name)} className="w-6 h-6 rounded bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all" title="WhatsApp Rider">
                                      <MessageCircle size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Donor Contact Column */}
                              <div className="bg-muted/30 p-2 rounded-xl border border-border/30 flex items-center justify-between">
                                <div className="min-w-0 pr-1">
                                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Donor</p>
                                  <p className="text-[10px] font-bold text-foreground truncate">{d.donor?.full_name || "Community Donor"}</p>
                                </div>
                                {d.donor?.phone && (
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleCall(d.donor.phone)} className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all" title="Call Donor">
                                      <Phone size={10} />
                                    </button>
                                    <button onClick={() => handleWhatsApp(d.donor.phone, d.donor.full_name)} className="w-6 h-6 rounded bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all" title="WhatsApp Donor">
                                      <MessageCircle size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {donations.filter(d => d.status === "delivered" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black uppercase text-muted-foreground mb-3 tracking-widest">Received & Completed</h3>
                    <div className="flex flex-col gap-3">
                      {donations.filter(d => d.status === "delivered" && d.ngo_verified_by === user?.id).map((d) => {
                        const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
                        const rating = myRatings.find(r => r.donation_id === d.id);
                        
                        return (
                          <div key={d.id} className="glass-card p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                                <CheckCircle size={20} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground text-sm">{d.title}</h4>
                                <p className="text-xs text-muted-foreground">📍 {d.location} · 🍽 {d.quantity} servings</p>
                              </div>
                            </div>

                            {volunteer && (
                              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Rider</p>
                                  <p className="text-[10px] font-bold text-foreground">{volunteer.full_name || "Assigned Rider"}</p>
                                </div>
                                
                                {rating ? (
                                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                    <Star size={11} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-black text-yellow-700">{rating.rating}.0 (Rated)</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRatingDialog({
                                        volunteerId: volunteer.id,
                                        volunteerName: volunteer.full_name,
                                        donationId: d.id
                                      });
                                      setRatingValue(0);
                                      setRatingComment("");
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold active:scale-[0.97] transition-all cursor-pointer"
                                  >
                                    <Star size={11} /> Rate Rider
                                  </button>
                                )}
                              </div>
                            )}
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
      
      <ContactVerification 
        isOpen={verificationDialog.isOpen}
        onClose={() => setVerificationDialog(prev => ({ ...prev, isOpen: false }))}
        phoneNumber={verificationDialog.phone}
        onVerified={() => {
          setIsIdentityVerified(true);
          verificationDialog.action();
        }}
      />

      {ratingDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setRatingDialog(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="gradient-primary p-6 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Star size={32} className="text-white fill-white animate-pulse" />
              </div>
              <h4 className="font-extrabold text-lg tracking-tight">Rate {ratingDialog.volunteerName}</h4>
              <p className="text-[10px] text-white/80 font-semibold uppercase tracking-widest mt-1">Submit your rider feedback</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRatingValue(v)}
                    className="p-1 hover:scale-110 active:scale-90 transition-transform"
                  >
                    <Star 
                      size={32} 
                      className={v <= ratingValue ? "text-yellow-400 fill-yellow-400 filter drop-shadow" : "text-muted opacity-30"} 
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Share Comment</label>
                <textarea
                  placeholder="Tell us how the service was (optional)..."
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  className="w-full h-20 rounded-xl border border-border/80 p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
              
              <div className="flex gap-2.5 pt-1">
                <button 
                  type="button"
                  onClick={() => setRatingDialog(null)} 
                  className="flex-1 py-3 rounded-xl bg-muted/50 text-muted-foreground font-bold text-xs uppercase tracking-wider hover:bg-muted transition-all"
                  disabled={submittingRating}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitRating} 
                  className="flex-1 py-3 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  disabled={submittingRating}
                >
                  {submittingRating ? <Loader2 className="animate-spin" size={12} /> : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoDashboard;
