import { useState, useEffect } from "react";
import { Home, PlusCircle, Clock, MessageCircle, User, Package, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";

const donorNav = [
  { icon: Home, label: "Home", path: "/donor" },
  { icon: PlusCircle, label: "Donate", path: "/donor/post" },
  { icon: Clock, label: "History", path: "/donor/history" },
  { icon: MessageCircle, label: "Chat", path: "/donor/chat" },
  { icon: User, label: "Profile", path: "/donor/profile" },
];

const DonorHistory = () => {
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
    if (d.ngo_verified) return { label: "NGO Verified ✓", cls: "badge-verified" };
    if (d.status === "delivered") return { label: "Delivered", cls: "badge-verified" };
    if (d.status === "picked_up") return { label: "Picked Up", cls: "px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary" };
    if (d.status === "posted") return { label: "Active", cls: "px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary" };
    return { label: d.status || "Unknown", cls: "badge-fraud" };
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-foreground">Your Donations</h1>
        <p className="text-sm text-muted-foreground font-body">Total: {donations.length} donations</p>
      </div>

      <div className="page-padding flex flex-col gap-3">
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
                  <p className="text-xs text-muted-foreground font-body">🗓 {new Date(d.created_at).toLocaleDateString()}</p>
                  {d.ai_quality_score && (
                    <p className="text-xs text-muted-foreground font-body">🤖 Score: {d.ai_quality_score}/100</p>
                  )}
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
