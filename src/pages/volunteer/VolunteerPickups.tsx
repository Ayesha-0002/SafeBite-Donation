import { useState, useEffect } from "react";
import { Home, MapPin, Package, MessageCircle, User, Loader2, CheckCircle, Camera } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const volunteerNav = [
  { icon: Home, label: "Home", path: "/volunteer" },
  { icon: MapPin, label: "Track", path: "/volunteer/tracking" },
  { icon: Package, label: "Pickups", path: "/volunteer/pickups" },
  { icon: User, label: "Profile", path: "/volunteer/profile" },
];

const VolunteerPickups = () => {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState<any[]>([]);
  const [ngoVerifyId, setNgoVerifyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get all donations assigned to or available for this volunteer
      const { data } = await supabase
        .from("food_donations")
        .select("*, donor:profiles!donor_id(phone, full_name)")
        .eq("assigned_volunteer_id", user.id)
        .in("status", ["accepted", "picked_up", "delivered"])
        .order("created_at", { ascending: false });
      setPickups(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleWhatsAppChat = (phone: string | null) => {
    if (!phone) {
      toast.error("Donor's contact number is not available.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    window.location.href = `https://wa.me/${cleanPhone}?text=Assalam o Alaikum, I am the SafeBite volunteer. I am coming to pick up the food donation.`;
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleNgoVerify = async (donationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("food_donations").update({
      ngo_verified: true,
      ngo_verified_at: new Date().toISOString(),
      ngo_verified_by: user.id,
    }).eq("id", donationId);

    setNgoVerifyId(donationId);
    setPickups(prev => prev.map(p => p.id === donationId ? { ...p, ngo_verified: true } : p));
  };

  const getDeliveryPhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/delivery-photos/${url}`;
  };

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Pickups</h1>
          <p className="text-sm text-muted-foreground font-body">
            Active: <span className="text-primary font-semibold">{pickups.filter(p => p.status !== "delivered").length}</span>
          </p>
        </div>
      </div>

      <div className="page-padding flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : pickups.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-body">No pickups available</p>
          </div>
        ) : (
          pickups.map((p) => {
            const imgUrl = getImageUrl(p.image_url);
            const deliveryImg = getDeliveryPhotoUrl(p.delivery_photo_url);
            const isDelivered = p.status === "delivered";

            return (
              <div key={p.id} className="food-card p-3">
                <div className="flex items-start gap-3">
                  {imgUrl ? (
                    <img src={imgUrl} alt={p.title} className="w-20 h-20 rounded-xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                      <Package size={28} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm">{p.title}</h4>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">📍 {p.location}</p>
                    <p className="text-xs text-muted-foreground font-body">🍽 {p.quantity} servings · {p.pickup_day}</p>
                    <span className={
                      p.ngo_verified ? "badge-verified mt-1 inline-block" :
                      isDelivered ? "px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary mt-1 inline-block" :
                      p.status === "picked_up" ? "px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary mt-1 inline-block" :
                      "px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground mt-1 inline-block"
                    }>
                      {p.ngo_verified ? "NGO Verified ✓" : isDelivered ? "Delivered" : p.status === "picked_up" ? "In Progress" : "Assigned"}
                    </span>
                  </div>
                </div>

                {/* Delivery photo proof section */}
                {isDelivered && deliveryImg && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border">
                    <img src={deliveryImg} alt="Delivery proof" className="w-full h-28 object-cover" />
                    <div className="p-2 bg-muted/50 flex items-center gap-2">
                      <Camera size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-body">Delivery Photo Proof</span>
                    </div>
                  </div>
                )}

                {p.ngo_verified && (
                  <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-primary" />
                    <span className="text-xs text-foreground font-medium">Food received & verified by NGO</span>
                  </div>
                )}

                {!isDelivered && !p.ngo_verified && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/volunteer/tracking?donation=${p.id}`)}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-primary-foreground gradient-primary text-sm"
                    >
                      {p.status === "picked_up" ? "TRACK DELIVERY" : "START PICKUP"}
                    </button>
                    <button
                      onClick={() => handleWhatsAppChat(p.donor?.phone)}
                      className="py-2.5 px-4 rounded-xl font-semibold text-white bg-[#25D366] border border-[#25D366] text-sm flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav items={volunteerNav} />
    </div>
  );
};


export default VolunteerPickups;
