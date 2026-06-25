import { useState, useEffect, useCallback } from "react";
import { Home, Package, CheckCircle, Bell, Loader2, Truck, User, MessageCircle, UserPlus, MapPin, Utensils, LogOut, Phone, Star } from "lucide-react";
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
  ratings,
  allDonations = [],
  currentNgoId,
  ngos = [],
  onRefreshVolunteers
}: { 
  donationId: string; 
  volunteers: any[]; 
  onAssign: (donationId: string, volunteerId: string) => Promise<void>;
  ratings: any[];
  allDonations?: any[];
  currentNgoId?: string;
  ngos?: any[];
  onRefreshVolunteers?: () => void;
}) => {
  const [localSelected, setLocalSelected] = useState("");
  const [approvingRiderId, setApprovingRiderId] = useState<string | null>(null);
  const [localApprovedIds, setLocalApprovedIds] = useState<string[]>([]);

  const handleApproveRiderToTeam = async (riderId: string, name: string) => {
    setApprovingRiderId(riderId);
    try {
      await supabase
        .from("rider_join_requests")
        .update({ status: "accepted" })
        .eq("rider_id", riderId)
        .eq("ngo_id", currentNgoId)
        .throwOnError();

      await Promise.all([
        supabase
          .from("profiles")
          .update({ 
            is_approved: true, 
            ngo_id: currentNgoId,
            role: "volunteer"
          })
          .eq("id", riderId)
          .throwOnError(),
        supabase
          .from("user_roles")
          .upsert({ 
            user_id: riderId, 
            role: "volunteer" 
          })
          .throwOnError()
      ]);

      await supabase.from("notifications").insert({
        user_id: riderId,
        title: "Joined Team! 🎉",
        message: "You have been approved and added to the NGO's team.",
        type: "success"
      });

      setLocalApprovedIds(prev => [...prev, riderId]);
      toast.success(`${name} is now approved and part of your team.`);
      if (onRefreshVolunteers) {
        onRefreshVolunteers();
      }
    } catch (err: any) {
      console.error("Direct riders approval error:", err);
      toast.error("Failed to approve rider to team.");
    } finally {
      setApprovingRiderId(null);
    }
  };

  // Helper to calculate volunteer stats
  const getVolunteerStats = (volunteerId: string) => {
    const vRatings = ratings.filter(r => r.rated_user_id === volunteerId);
    const avgRating = vRatings.length > 0 ? vRatings.reduce((acc, r) => acc + r.rating, 0) / vRatings.length : 0;
    return {
      avgRating,
      count: vRatings.length
    };
  };

  // Check if rider is currently busy delivering for a different NGO
  const getBusyStatus = (volunteerId: string) => {
    const activeDonationsWithOtherNgo = allDonations.filter(d => 
      d.assigned_volunteer_id === volunteerId && 
      (d.status === "accepted" || d.status === "picked_up") && 
      d.ngo_verified_by !== currentNgoId
    );
    return activeDonationsWithOtherNgo.length > 0;
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
    <div className="space-y-4 bg-slate-50/50 p-3 sm:p-5 rounded-3xl border border-slate-100 shadow-inner">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
           <UserPlus size={12} className="text-primary/50" />
           Assign to Rider Team
         </h5>
        <span className="text-[10px] font-bold text-slate-400">{sortedVolunteers.length} Online</span>
      </div>
      
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
        {sortedVolunteers.length > 0 ? (
          sortedVolunteers.map(v => {
            const stats = getVolunteerStats(v.id);
            const isBusy = getBusyStatus(v.id);
            const isApprovedLocally = localApprovedIds.includes(v.id);
            const isMyTeam = v.ngo_id === currentNgoId || isApprovedLocally;
            
            const currentNgoName = ngos?.find((n: any) => n.id === currentNgoId)?.full_name || "My Team";
            const ngoName = isMyTeam 
              ? currentNgoName 
              : (ngos?.find((n: any) => n.id === v.ngo_id)?.full_name || "Independent");

            return (
              <div
                key={v.id}
                className={`group relative p-3.5 rounded-2xl border transition-all duration-300 bg-white ${
                  isBusy 
                    ? "border-slate-100 opacity-60 bg-white/55" 
                    : "border-slate-150 hover:border-primary/20 hover:shadow-md"
                }`}
              >
                {/* Main Identity Information (Flexible column/row setup that never squeezes) */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0 pt-0.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm transition-colors ${
                      isMyTeam ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}>
                      {(v.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    {!isBusy && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5 animate-fade-in">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex flex-col gap-1 flex-1">
                        {/* Rider Name (Breaks words naturally, never truncated, fully visible) */}
                        <span className="font-bold text-slate-800 text-[14px] leading-tight block break-words">
                          {v.full_name || "Unknown Rider"}
                        </span>
                        
                        {/* Organization / Status Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                            isMyTeam 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-150" 
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {ngoName}
                          </span>
                        </div>
                      </div>

                      {/* Average Rating indicator on the right of the name row */}
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[11px] shrink-0 bg-amber-50/60 px-1.5 py-0.5 rounded ml-2">
                        <Star size={10} className="fill-amber-500" />
                        <span>{stats.avgRating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Complete phone number (Always fully visible, never truncated or compressed) */}
                    {v.phone && (
                      <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px] mt-0.5">
                        <Phone size={10} className="text-slate-400 shrink-0" />
                        <span className="select-all tracking-wide">{v.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action buttons placed in its own row to avoid horizontal squeezing */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  {!isMyTeam && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await handleApproveRiderToTeam(v.id, v.full_name || "Unknown Rider");
                      }}
                      disabled={approvingRiderId === v.id}
                      className="h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest text-[#0ea5e9] bg-[#0ea5e9]/5 hover:bg-[#0ea5e9] hover:text-white border border-[#0ea5e9]/15 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm flex-1"
                    >
                      {approvingRiderId === v.id ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserPlus size={11} className="shrink-0" />
                      )}
                      Approve
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isBusy) {
                        toast.error("Rider currently busy!");
                        return;
                      }
                      await onAssign(donationId, v.id);
                    }}
                    className={`h-8 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200 border flex items-center justify-center gap-1.5 flex-1 ${
                      isBusy
                        ? "text-rose-400 bg-rose-50 border-rose-100 cursor-not-allowed"
                        : "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-sm"
                    }`}
                  >
                    {isBusy ? "Busy" : "Assign Rider"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center rounded-[2rem] bg-muted/5 border border-dashed border-border/50">
            <User size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[11px] text-muted-foreground font-bold px-6">No active riders found...</p>
          </div>
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
  const [ngos, setNgos] = useState<any[]>([]);

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

  // Stats Popup State
  const [activeStatType, setActiveStatType] = useState<"available" | "inProgress" | "received" | null>(null);
  const [popupDateFilter, setPopupDateFilter] = useState<"all" | "today" | "yesterday" | "tomorrow">("all");

  // Active requests card expansion state
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [riderRequests, setRiderRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Claim food confirmation dialog states
  const [claimDialog, setClaimDialog] = useState<any | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchData = useCallback(async (showLoading = false) => {
    if (!user) return;
    console.log("NGO: Fetching data...");
    // We only set loading if we don't have cached data to show
    if (showLoading && donations.length === 0) setLoading(true);

    try {
      const { data: ngosData } = await supabase.from("profiles").select("id, full_name").eq("role", "ngo");
      setNgos(ngosData || []);

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
          .select("id, status")
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
      const reqUserIds = regRequests.map(r => r.id).filter(Boolean);
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
          .select("id, full_name, phone, ngo_id, is_approved");
          
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
      const [profilesRes, notificationsRes, ratingsRes, riderReqRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, ngo_id, is_approved")
          .in("id", volunteerIds.length > 0 ? volunteerIds : ["dummy-id"]),
        
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),

        supabase
          .from("donation_ratings")
          .select("*")
          .eq("rated_by_user_id", user.id),

        supabase
          .from("rider_join_requests")
          .select("id, rider_id, status, created_at")
          .eq("ngo_id", user.id)
          .eq("status", "pending")
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const riderReqData = (riderReqRes as any)?.data || [];
      const riderReqIds = riderReqData.map((r: any) => r.rider_id).filter(Boolean);
      let riderReqProfiles: any[] = [];
      if (riderReqIds.length > 0) {
        const { data: rProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", riderReqIds);
        riderReqProfiles = rProfiles || [];
      }
      const riderReqMap = new Map(riderReqProfiles.map((p: any) => [p.id, p]));
      const enrichedRiderReqs = riderReqData.map((r: any) => ({
        ...r,
        rider: riderReqMap.get(r.rider_id)
      }));
      setRiderRequests(enrichedRiderReqs);

      setMyRatings(ratingsRes.data || []);
      const allDonations = enrichedDonations;
      
      const regStatusMap = new Map(regRequests.map(r => [r.id, r.status]));
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

  const handleApproveRider = async (requestId: string, riderId: string) => {
    setProcessingRequest(requestId);
    try {
      await supabase
        .from("rider_join_requests")
        .update({ status: "accepted" })
        .eq("id", requestId)
        .throwOnError();
      await Promise.all([
        supabase
          .from("profiles")
          .update({ 
            is_approved: true, 
            ngo_id: user?.id,
            role: "volunteer"
          })
          .eq("id", riderId)
          .throwOnError(),
        supabase
          .from("user_roles")
          .upsert({ 
            user_id: riderId, 
            role: "volunteer" 
          })
          .throwOnError()
      ]);
      await supabase.from("notifications").insert({
        user_id: riderId,
        title: "Request Approved! 🎉",
        message: "Your join request has been approved. You can now login.",
        type: "info"
      });
      toast.success("Rider approved! They can now login.");
      fetchData(false);
    } catch (err: any) {
      toast.error("Approval failed: " + (err.message || "Error"));
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRider = async (requestId: string, riderId: string) => {
    setProcessingRequest(requestId);
    try {
      await supabase
        .from("rider_join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      await supabase.from("notifications").insert({
        user_id: riderId,
        title: "Request Declined",
        message: "Your join request was not approved by the NGO.",
        type: "info"
      });
      toast.success("Request rejected.");
      fetchData(false);
    } catch (err: any) {
      toast.error("Rejection failed: " + (err.message || "Error"));
    } finally {
      setProcessingRequest(null);
    }
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
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "rider_join_requests",
        filter: `ngo_id=eq.${user.id}`,
      }, () => { fetchData(false); })
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
  const isRequestsTab = location.pathname.includes("/requests");

  const handleAcceptDonation = async (donationId: string) => {
    if (!user) return;
    setClaiming(true);
    try {
      const { error } = await supabase.from("food_donations").update({
        status: "accepted",
        ngo_verified_by: user.id,
        ngo_verified_at: new Date().toISOString(),
      }).eq("id", donationId);

      if (error) throw error;

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
      setClaimDialog(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const handleAssignVolunteer = async (donationId: string, volunteerId: string) => {
    if (!volunteerId) {
      toast.error("Please select a rider first!");
      return;
    }

    // Safety check: verify if the rider is busy with another NGO
    const isBusy = (donations || []).some(d => 
      d.assigned_volunteer_id === volunteerId && 
      (d.status === "accepted" || d.status === "picked_up") && 
      d.ngo_verified_by !== user?.id
    );

    if (isBusy) {
      toast.error("A rider cannot pick up donations from two different NGOs at the same time!");
      return;
    }

    const { error: updateAuthError } = await supabase.from("food_donations").update({
      assigned_volunteer_id: volunteerId,
      status: "picked_up",
    }).eq("id", donationId);

    if (updateAuthError) {
       toast.error("Failed to assign rider");
       return;
    }

    // Await notification assignment to ensure it processes
    const { data: donation } = await supabase.from("food_donations").select("title, donor_id").eq("id", donationId).single();
    
    if (donation) {
      const volunteerInfo = volunteers.find(v => v.id === volunteerId);
      const volunteerName = volunteerInfo?.full_name || "A rider";

      // 1. Notify volunteer/rider
      await supabase.from("notifications").insert({
        user_id: volunteerId,
        title: "New Ride Assigned! 🚴",
        message: `You have been assigned to pick up and deliver: ${donation.title}.`,
        type: "pickup-assigned",
        related_donation_id: donationId,
      });

      // 2. Notify donor
      await supabase.from("notifications").insert({
        user_id: donation.donor_id,
        title: "Rider Dispatched! 🚴",
        message: `${volunteerName} is on their way to pick up your donation: ${donation.title}.`,
        type: "info",
        related_donation_id: donationId,
      });
    }

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
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { type: "available" as const, value: stats.available.toString(), label: "Available Food" },
            { type: "inProgress" as const, value: stats.inProgress.toString(), label: "In Progress" },
            { type: "received" as const, value: stats.received.toString(), label: "Received" },
          ].map((stat) => (
            <button 
              key={stat.label} 
              type="button"
              onClick={() => setActiveStatType(stat.type)}
              className="bg-primary-foreground/10 backdrop-blur rounded-xl p-3 text-center hover:bg-primary-foreground/25 active:scale-95 transition-all outline-none focus:ring-1 focus:ring-white/20 cursor-pointer select-none"
            >
              <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="page-padding mt-6 relative z-10">
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
                    <div key={d.id} className="group bg-white rounded-3xl border border-slate-100 p-4 shadow-sm shadow-slate-200/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                      <div className="flex gap-5">
                        <div className="relative shrink-0">
                          {imgUrl ? (
                            <img src={imgUrl} alt={d.title} loading="lazy" className="w-24 h-24 rounded-2xl object-cover shadow-sm ring-1 ring-slate-100 transition-transform duration-500 group-hover:scale-[1.03]" />
                          ) : (
                            <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-[1.03] transition-transform duration-500">
                              <Package size={32} className="text-slate-300" />
                            </div>
                          )}
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                            <Star size={10} className="fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <h4 className="font-bold text-slate-900 text-base tracking-tight truncate mb-1">{d.title}</h4>
                          <div className="flex items-center gap-1.5 mb-3">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Donor</p>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <p className="text-[11px] font-black text-primary truncate tracking-tight">{d.donor?.full_name || "Community Partner"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                              <MapPin size={10} className="text-primary/60" /> {d.location.split(',')[0]}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                              <Utensils size={10} className="text-primary/60" /> {d.quantity} servings
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                             <p className="text-[10px] font-black text-orange-600/80 uppercase tracking-widest italic">Pickup: {d.pickup_day}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-5">
                        <button
                          onClick={() => setClaimDialog(d)}
                          className="flex-1 h-11 rounded-2xl font-black text-white gradient-primary text-[10px] uppercase tracking-[0.15em] transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                          Claim Food
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCall(d.donor?.phone)}
                            className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-90"
                          >
                            <Phone size={16} />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(d.donor?.phone, d.donor?.full_name)}
                            className="w-11 h-11 rounded-2xl bg-slate-50 text-emerald-600 border border-slate-200 flex items-center justify-center transition-all hover:bg-emerald-500 hover:text-white hover:border-emerald-500 active:scale-90"
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
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
            {/* Loading State for Requests Tab */}
            {loading && donations.length === 0 ? (
              <div className="space-y-4">
                <div className="h-8 w-40 bg-muted animate-pulse rounded-lg mb-4" />
                <div className="h-40 w-full bg-muted animate-pulse rounded-[2.5rem]" />
                <div className="h-40 w-full bg-muted animate-pulse rounded-[2.5rem]" />
              </div>
            ) : (
              <>
                {/* Accepted — Assign Rider */}
            {riderRequests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    🚴 Rider Join Requests
                    <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      {riderRequests.length}
                    </span>
                  </h3>
                  <button 
                    onClick={() => navigate("/ngo/profile")}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all"
                  >
                    <UserPlus size={12} /> Invite
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {riderRequests.map(req => (
                    <div key={req.id} className="glass-card-elevated p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border border-primary/20 shrink-0">
                          {(req.rider?.full_name || "R").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">
                            {req.rider?.full_name || "Unknown Rider"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {req.rider?.phone || "No phone"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRejectRider(req.id, req.rider_id)}
                          disabled={processingRequest === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveRider(req.id, req.rider_id)}
                          disabled={processingRequest === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          {processingRequest === req.id
                            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : null}
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h2 className="text-lg font-bold text-foreground mb-3">Your Active Requests</h2>
            
                {donations.filter(d => (d.status === "accepted" || d.status === "picked_up") && d.ngo_verified_by === user?.id).length === 0 && riderRequests.length === 0 ? (
                  <div className="text-center py-16 bg-muted/10 rounded-[2.5rem] border border-dashed border-border/50 mt-2">
                    <Truck size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-bold tracking-tight">No requests available at the moment</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 px-10">When you claim food from the Marketplace, it will appear here.</p>
                    <button 
                      onClick={() => navigate("/ngo")}
                      className="mt-6 px-8 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all"
                    >
                      Check Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                {donations.filter(d => d.status === "accepted" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-[0.2em] flex items-center gap-2">
                       <UserPlus size={12} className="text-primary/40" />
                       Assign Rider Team
                    </h3>
                    <div className="flex flex-col gap-4">
                      {donations.filter(d => d.status === "accepted" && d.ngo_verified_by === user?.id).map((d) => {
                        const isExpanded = assigningId === d.id;
                        return (
                          <div key={d.id} className={`group bg-white rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${isExpanded ? "ring-2 ring-primary/5 shadow-2xl border-primary/20" : "border-slate-100 hover:border-primary/10 shadow-sm shadow-slate-200/50"}`}>
                            {/* Donation Info Card */}
                            <div 
                              onClick={() => setAssigningId(isExpanded ? null : d.id)}
                              className="p-6 cursor-pointer relative"
                            >
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                  <Truck size={28} className="text-primary/40" />
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className="font-bold text-slate-900 text-base tracking-tight truncate leading-tight">{d.title}</h4>
                                    <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                      Accepted
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                                      <MapPin size={12} className="text-slate-300 shrink-0" />
                                      <span className="truncate">{d.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                                      <Utensils size={12} className="text-slate-300 shrink-0" />
                                      <span className="font-semibold text-slate-600">{d.quantity} Serving(s)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Donor Details Section */}
                              <div className={`mt-6 pt-5 border-t border-dashed border-slate-100 flex items-center justify-between transition-all duration-500 ${isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 h-0 overflow-hidden"}`}>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    <User size={12} className="text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Donor Contact</p>
                                    <p className="text-xs font-bold text-slate-700 tracking-tight">{d.donor?.full_name || "Community Donor"}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {d.donor?.phone && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleCall(d.donor.phone); }} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                                        <Phone size={14} />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(d.donor.phone, d.donor.full_name); }} className="w-9 h-9 rounded-xl bg-slate-50 text-emerald-600 border border-slate-200 flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm">
                                        <MessageCircle size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Rider List (Expanded Section) */}
                            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[800px] bg-slate-50/30 border-t border-slate-100" : "max-h-0 overflow-hidden opacity-0"}`}>
                              <div className="p-4">
                                <RiderAssignmentControl
                                  donationId={d.id}
                                  volunteers={volunteers}
                                  ratings={myRatings}
                                  onAssign={handleAssignVolunteer}
                                  allDonations={donations}
                                  currentNgoId={user?.id}
                                  ngos={ngos}
                                  onRefreshVolunteers={() => fetchData(false)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {donations.filter(d => d.status === "picked_up" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-primary px-4 py-2 bg-primary/5 rounded-2xl w-fit tracking-[0.2em] flex items-center gap-2 border border-primary/10 shadow-sm mb-2 ml-1">
                       <Truck size={12} className="text-primary/60" />
                       Delivery In Progress
                    </h3>
                    <div className="flex flex-col gap-4">
                      {donations.filter(d => d.status === "picked_up" && d.ngo_verified_by === user?.id).map((d) => {
                        const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
                        const isExpanded = expandedRequestId === d.id;
                        return (
                          <div 
                            key={d.id} 
                            onClick={() => setExpandedRequestId(prev => prev === d.id ? null : d.id)}
                            className={`group bg-white rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${isExpanded ? "ring-2 ring-primary/5 shadow-2xl border-primary/20" : "border-slate-100 hover:border-primary/10 shadow-sm shadow-slate-200/50 cursor-pointer"}`}
                          >
                            <div className="p-6">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                  <Truck size={28} className="text-primary/40" />
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className="font-bold text-slate-900 text-base tracking-tight truncate leading-tight">{d.title}</h4>
                                    <div className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[8px] font-black uppercase tracking-widest border border-primary/10">
                                      Moving
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                                      <MapPin size={12} className="text-slate-300 shrink-0" />
                                      <span className="truncate text-slate-500">{d.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                                      <Utensils size={12} className="text-slate-300 shrink-0" />
                                      <span className="font-semibold text-slate-600">{d.quantity} Serving(s)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Rider & Donor Info Section */}
                              <div className={`mt-6 pt-5 border-t border-dashed border-slate-100 flex flex-col gap-4 transition-all duration-500 ${isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 h-0 overflow-hidden"}`}>
                                {/* Rider Info Card */}
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                      <User size={18} className="text-primary/60" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 leading-none">Assigned Rider</p>
                                      <p className="text-[14px] font-bold text-slate-900 leading-tight truncate">{volunteer?.full_name || "Assigned Rider"}</p>
                                    </div>
                                  </div>
                                  {volunteer?.phone && (
                                    <div className="flex gap-2 shrink-0">
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/ngo/track?donation=${d.id}`);
                                        }} 
                                        className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                        title="Track Live"
                                      >
                                        <MapPin size={14} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleCall(volunteer.phone); }} 
                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95 shadow-sm"
                                      >
                                        <Phone size={14} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleWhatsApp(volunteer.phone, volunteer.full_name); }} 
                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all active:scale-95 shadow-sm"
                                      >
                                        <MessageCircle size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Donor Info Card */}
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                      <User size={18} className="text-primary/60" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 leading-none">Food Donor</p>
                                      <p className="text-[14px] font-bold text-slate-900 leading-tight truncate">{d.donor?.full_name || "Community Partner"}</p>
                                    </div>
                                  </div>
                                  {d.donor?.phone && (
                                    <div className="flex gap-2 shrink-0">
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleCall(d.donor.phone); }} 
                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95 shadow-sm"
                                      >
                                        <Phone size={14} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleWhatsApp(d.donor.phone, d.donor.full_name); }} 
                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all active:scale-95 shadow-sm"
                                      >
                                        <MessageCircle size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {donations.filter(d => d.status === "delivered" && d.ngo_verified_by === user?.id).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-[0.2em] flex items-center gap-2">
                       <CheckCircle size={12} className="text-emerald-500/50" />
                       Received & Completed
                    </h3>
                    <div className="flex flex-col gap-4">
                      {donations.filter(d => d.status === "delivered" && d.ngo_verified_by === user?.id).map((d) => {
                        const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
                        const rating = myRatings.find(r => r.donation_id === d.id);
                        
                        return (
                          <div key={d.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm shadow-slate-200/40">
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-inner shrink-0">
                                <CheckCircle size={24} />
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-bold text-slate-900 text-base tracking-tight mb-1">{d.title}</h4>
                                <div className="flex flex-wrap items-center gap-3">
                                   <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                     <MapPin size={11} className="text-slate-300" />
                                     <span className="truncate">{d.location.split(',')[0]}</span>
                                   </div>
                                   <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                     <Utensils size={11} className="text-slate-300" />
                                     <span className="font-bold">{d.quantity} servings</span>
                                   </div>
                                </div>
                              </div>
                            </div>

                            {volunteer && (
                              <div className="mt-5 pt-4 border-t border-dashed border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    <User size={12} className="text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned Rider</p>
                                    <p className="text-[10px] font-bold text-slate-700">{volunteer.full_name || "Assigned Rider"}</p>
                                  </div>
                                </div>
                                
                                {rating ? (
                                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                    <Star size={12} className="text-amber-500 fill-amber-500" />
                                    <span className="text-[10px] font-black text-amber-700">{rating.rating}.0 Rated</span>
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                                  >
                                    <Star size={12} /> Rate Rider
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

      {activeStatType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setActiveStatType(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-border flex flex-col max-h-[80vh] animate-scale-in animate-duration-200" onClick={e => e.stopPropagation()}>
            <div className="gradient-primary p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-lg tracking-tight">
                  {activeStatType === "available" && "Available Food"}
                  {activeStatType === "inProgress" && "In Progress Food"}
                  {activeStatType === "received" && "Received Food"}
                </h4>
                <p className="text-[10px] text-white/80 font-semibold uppercase tracking-widest mt-0.5">
                  {activeStatType === "available" && `${stats.available} donations available on marketplace`}
                  {activeStatType === "inProgress" && `${stats.inProgress} active pickup requests`}
                  {activeStatType === "received" && `${stats.received} donations received successfully`}
                </p>
              </div>
              <button onClick={() => setActiveStatType(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>

            {/* Date Filters Row */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-muted/10 shrink-0">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">Filter:</span>
              {[
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "tomorrow", label: "Tomorrow" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPopupDateFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-tight transition-all shrink-0 ${
                    popupDateFilter === tab.id
                      ? "gradient-primary text-white shadow-sm font-extrabold scale-105"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-background">
              {(() => {
                let filtered = [];
                if (activeStatType === "available") {
                  filtered = donations.filter(d => d.status === "posted");
                } else if (activeStatType === "inProgress") {
                  filtered = donations.filter(d => d.status === "accepted" || d.status === "picked_up");
                } else if (activeStatType === "received") {
                  filtered = donations.filter(d => d.status === "delivered");
                }

                // Apply date filters
                if (popupDateFilter === "today") {
                  filtered = filtered.filter(d => {
                    if (d.pickup_day?.toLowerCase() === "today") return true;
                    if (d.created_at) {
                      const created = new Date(d.created_at).toDateString();
                      const today = new Date().toDateString();
                      return created === today;
                    }
                    return false;
                  });
                } else if (popupDateFilter === "yesterday") {
                  filtered = filtered.filter(d => {
                    if (d.pickup_day?.toLowerCase() === "yesterday") return true;
                    if (d.created_at) {
                      const created = new Date(d.created_at).toDateString();
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return created === yesterday.toDateString();
                    }
                    return false;
                  });
                } else if (popupDateFilter === "tomorrow") {
                  filtered = filtered.filter(d => {
                    const pickupLower = d.pickup_day?.toLowerCase() || "";
                    if (pickupLower === "tomorrow" || pickupLower === "day after") return true;
                    if (d.created_at) {
                      const created = new Date(d.created_at).toDateString();
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return created === tomorrow.toDateString();
                    }
                    return false;
                  });
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground animate-fade-in">
                      <Package size={36} className="mx-auto mb-2 opacity-30 animate-pulse" />
                      <p className="text-sm font-semibold">No donations found</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1 uppercase tracking-wider">Try selecting a different filter above</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 animate-fade-in">
                    {filtered.map((d) => {
                      const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
                      return (
                        <div key={d.id} className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-3 shadow-sm hover:border-border/80 transition-all text-left">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-foreground text-sm leading-tight">{d.title}</h5>
                              <p className="text-[10px] text-primary font-black uppercase tracking-wider mt-0.5">Donor: {d.donor?.full_name || "Community"}</p>
                            </div>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border shrink-0 ${
                              d.status === "posted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                              d.status === "accepted" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                              d.status === "picked_up" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                              "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/25"
                            }`}>
                              {d.status === "posted" ? "Available" : d.status === "accepted" ? "Claimed" : d.status === "picked_up" ? "Picked Up" : d.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-border/30 py-2">
                            <p className="truncate"><span className="font-bold text-muted-foreground mr-1">Qty:</span>{d.quantity} servings</p>
                            {d.pickup_day && <p className="truncate"><span className="font-bold text-muted-foreground mr-1">Day:</span>{d.pickup_day}</p>}
                            {volunteer && (
                              <p className="col-span-2 truncate"><span className="font-bold text-muted-foreground mr-1">Rider:</span>{volunteer.full_name || "Assigned"}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <MapPin size={11} className="text-primary shrink-0" />
                            <span className="truncate">{d.location}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            <div className="p-4 border-t border-border shrink-0 bg-muted/10">
              <button 
                type="button" 
                onClick={() => setActiveStatType(null)} 
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-black text-xs uppercase tracking-widest transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {claimDialog && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 backdrop-blur-md z-50 animate-fade-in" 
          onClick={() => !claiming && setClaimDialog(null)}
        >
          <div 
            className="bg-background rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-border/80 animate-scale-in" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header with clean, elegant styling */}
            <div className="relative p-6 pb-4 text-center border-b border-border/40">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Utensils size={24} className="text-primary" />
              </div>
              <h4 className="font-extrabold text-lg text-foreground tracking-tight">Claim Food Donation</h4>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                Verify details before reserving
              </p>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Selected Item Summary */}
              <div className="bg-muted/30 p-3.5 rounded-2xl border border-border/40 text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Selected Item</p>
                <h5 className="font-extrabold text-foreground text-sm mt-1.5">{claimDialog.title}</h5>
                <p className="text-[11px] text-primary font-bold mt-1 inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Donor: {claimDialog.donor?.full_name || "Community Partner"}
                </p>
              </div>

              {/* Bento information grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 p-3 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">Servings Available</p>
                  <p className="text-xs font-extrabold text-foreground mt-1">{claimDialog.quantity} servings</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">Scheduled Pickup</p>
                  <p className="text-xs font-extrabold text-foreground mt-1">{claimDialog.pickup_day}</p>
                </div>
              </div>

              {/* Informational Warning (Now in Clean English) */}
              <div className="flex items-start gap-3 bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
                <CheckCircle size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Confirming this claim will instantly reserve the food donation for your NGO. You will need to assign a volunteer rider to coordinate and handle the pickup.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  disabled={claiming}
                  onClick={() => setClaimDialog(null)} 
                  className="flex-1 py-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={claiming}
                  onClick={() => handleAcceptDonation(claimDialog.id)}
                  className="flex-[2] py-3 rounded-xl font-black text-white gradient-primary text-xs uppercase tracking-widest transition-all hover:opacity-95 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {claiming ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Claiming...
                    </>
                  ) : (
                    "Confirm Claim"
                  )}
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
