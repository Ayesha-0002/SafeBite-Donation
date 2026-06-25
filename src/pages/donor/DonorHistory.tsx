import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, Package, Loader2, ArrowLeft, Star, Scan } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: Scan, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorHistory = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time volunteer & rating tracking states
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [myRatings, setMyRatings] = useState<any[]>([]);
  const [ratingDialog, setRatingDialog] = useState<{ volunteerId: string; volunteerName: string; donationId: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 1. Fetch donations
      const { data: donationsData } = await supabase
        .from("food_donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false });
      
      const donationsList = donationsData || [];
      setDonations(donationsList);

      // 2. Fetch volunteer profiles
      const volunteerIds = [...new Set(donationsList.map(d => d.assigned_volunteer_id))].filter(Boolean);
      if (volunteerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", volunteerIds);
        setVolunteers(profiles || []);
      }

      // 3. Fetch NGO profiles who verified donations
      const ngoIds = [...new Set(donationsList.map(d => d.ngo_verified_by))].filter(Boolean);
      if (ngoIds.length > 0) {
        const { data: ngoProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ngoIds);
        setNgos(ngoProfiles || []);
      }

      // 4. Fetch ratings submitted by this donor
      const { data: ratingsData } = await supabase
        .from("donation_ratings")
        .select("*")
        .eq("rated_by_user_id", user.id);
      setMyRatings(ratingsData || []);
    } catch (err: any) {
      console.error("Error fetching history details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const getStatusBadge = (d: any) => {
    if (d.status === "delivered") return { label: "Delivered", cls: "badge-verified" };
    if (d.status === "picked_up") return { label: "Picked Up", cls: "px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary" };
    if (d.status === "posted") return { label: "Active", cls: "px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary" };
    if (d.status === "rejected") return { label: "Rejected", cls: "px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive font-bold" };
    return { label: d.status || "Unknown", cls: "px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground" };
  };

  const handleSubmitRating = async () => {
    if (!ratingDialog) return;
    if (ratingValue === 0) {
      toast.error("Please select a rating from 1 to 5 stars");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

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

      // Refresh data
      await fetchData();
    } catch (err: any) {
      toast.error("Error submitting rating: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Donation History</h1>
      </div>

      <div className="page-padding flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Contribution</p>
          <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px]">{donations.length} total</Badge>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : donations.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-body">No donations yet. Start donating!</p>
          </div>
        ) : (
          donations.map((d) => {
            const badge = getStatusBadge(d);
            const imgUrl = getImageUrl(d.image_url);
            const volunteer = volunteers.find(v => v.id === d.assigned_volunteer_id);
            const verifiedNgo = ngos.find(n => n.id === d.ngo_verified_by);
            const riderRating = volunteer ? myRatings.find(r => r.donation_id === d.id && r.rated_user_id === volunteer.id) : null;
            const ngoRating = d.ngo_verified_by ? myRatings.find(r => r.donation_id === d.id && r.rated_user_id === d.ngo_verified_by) : null;

            return (
              <div key={d.id} className="food-card flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  {imgUrl ? (
                    <img src={imgUrl} alt={d.title} loading="lazy" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Package size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">{d.title}</h4>
                    <p className="text-xs text-muted-foreground font-body">📍 {d.location}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                        <Clock size={10} /> {new Date(d.created_at).toLocaleString('en-US', { 
                          day: 'numeric', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {d.pickup_code && (d.status === "posted" || d.status === "accepted") && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 self-start mt-1">Code: {d.pickup_code}</span>
                      )}
                    </div>
                  </div>
                  <span className={badge.cls}>{badge.label}</span>
                </div>

                {d.status === "delivered" && (volunteer || verifiedNgo) && (
                  <div className="mt-2 pt-2 border-t border-border/40 space-y-3">
                    {volunteer && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Delivered By (Rider)</p>
                          <p className="text-xs font-bold text-foreground">{volunteer.full_name}</p>
                        </div>
                        
                        {riderRating ? (
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star size={11} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-black text-yellow-700">{riderRating.rating}.0 (Rated)</span>
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

                    {verifiedNgo && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/20">
                        <div className="flex flex-col">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Processed By (NGO)</p>
                          <p className="text-xs font-bold text-foreground">{verifiedNgo.full_name}</p>
                        </div>
                        
                        {ngoRating ? (
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star size={11} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-black text-yellow-700">{ngoRating.rating}.0 (Rated)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRatingDialog({
                                volunteerId: verifiedNgo.id,
                                volunteerName: verifiedNgo.full_name,
                                donationId: d.id
                              });
                              setRatingValue(0);
                              setRatingComment("");
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white text-xs font-bold active:scale-[0.97] transition-all cursor-pointer"
                          >
                            <Star size={11} /> Rate NGO
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {ratingDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setRatingDialog(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="gradient-primary p-6 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Star size={32} className="text-white fill-white animate-pulse" />
              </div>
              <h4 className="font-extrabold text-lg tracking-tight">Rate {ratingDialog.volunteerName}</h4>
              <p className="text-[10px] text-white/80 font-semibold uppercase tracking-widest mt-1">Submit your delivery feedback</p>
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
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitRating} 
                  className="flex-1 py-3 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" size={12} /> : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorHistory;
