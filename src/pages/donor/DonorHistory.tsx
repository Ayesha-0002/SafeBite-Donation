import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, Package, Loader2, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorHistory = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("food_donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false });
      setDonations(data || []);
      setLoading(false);
    };
    fetch();
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
            );
          })
        )}
      </div>
      <BottomNav items={donorNav} />
    </div>
  );
};

export default DonorHistory;
