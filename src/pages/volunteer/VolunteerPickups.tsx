import { useState, useEffect } from "react";
import { Home, MapPin, Package, MessageCircle, User, Loader2, CheckCircle, Camera, ArrowLeft, Phone, Navigation, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ContactVerification } from "@/components/ContactVerification";

const volunteerNav = [
  { icon: Home, label: "Home", path: "/volunteer" },
  { icon: Bell, label: "Alerts", path: "/notifications" },
  { icon: User, label: "Profile", path: "/volunteer/profile" },
];

const VolunteerPickups = () => {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState<any[]>([]);
  const [ngoVerifyId, setNgoVerifyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verification, setVerification] = useState<{ open: boolean; phone: string; type: "call" | "wa" | null }>({
    open: false,
    phone: "",
    type: null,
  });

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
    setVerification({ open: true, phone, type: "wa" });
  };

  const handleCall = (phone: string | null) => {
    if (!phone) {
      toast.error("Donor's contact number is not available.");
      return;
    }
    setVerification({ open: true, phone, type: "call" });
  };

  const executeContact = () => {
    const { phone, type } = verification;
    if (type === "call") {
      window.location.href = `tel:${phone}`;
    } else if (type === "wa") {
      const cleanPhone = phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=Assalam o Alaikum, I am the SafeBite volunteer. I am coming to pick up the food donation.`, "_blank");
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  const handleStartPickup = async (pickup: any) => {
    if (pickup.status === "picked_up") {
      navigate(`/volunteer/tracking?donation=${pickup.id}`);
      return;
    }
    setVerifyingId(pickup.id);
    setCodeInput("");
  };

  const confirmPickupCode = async (pickup: any) => {
    if (codeInput !== pickup.pickup_code) {
      toast.error("Incorrect Pickup Code. Ask the donor for the 4-digit code.");
      return;
    }

    try {
      const { error } = await supabase
        .from("food_donations")
        .update({ status: "picked_up" })
        .eq("id", pickup.id);

      if (error) throw error;
      toast.success("Pickup verified! Route is now active. 🚚");
      setVerifyingId(null);
      setPickups(prev => prev.map(p => p.id === pickup.id ? { ...p, status: "picked_up" } : p));
      navigate(`/volunteer/tracking?donation=${pickup.id}`);
    } catch (e: any) {
      toast.error("Cloud sync failed. Check your data connection.");
    }
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
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">My Pickups</h1>
      </div>

      <div className="page-padding flex flex-col gap-3 mt-2">
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
                  <div className="flex flex-col gap-2 mt-3">
                    {verifyingId === p.id ? (
                      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Verify Pickup
                          </p>
                          <button onClick={() => setVerifyingId(null)} className="text-[10px] text-muted-foreground underline">Cancel</button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Ask the donor for the 4-digit code shown in their history.</p>
                        <div className="flex gap-2">
                           <input 
                             type="text" 
                             maxLength={4} 
                             value={codeInput}
                             onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
                             placeholder="0000"
                             className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.5em] focus:ring-2 focus:ring-primary/20 outline-none"
                           />
                           <button 
                             onClick={() => confirmPickupCode(p)}
                             className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                           >
                            Confirm
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartPickup(p)}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-primary-foreground gradient-primary text-sm shadow-md"
                        >
                          {p.status === "picked_up" ? "TRACK DELIVERY" : "START PICKUP"}
                        </button>
                        <button
                          onClick={() => handleCall(p.donor?.phone)}
                          className="w-11 h-11 rounded-xl font-semibold text-primary bg-primary/10 border border-primary/10 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          onClick={() => handleWhatsAppChat(p.donor?.phone)}
                          className="w-11 h-11 rounded-xl font-semibold text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/10 flex items-center justify-center transition-all active:scale-90"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav items={volunteerNav} />
      
      <ContactVerification 
        isOpen={verification.open}
        phoneNumber={verification.phone}
        onClose={() => setVerification({ ...verification, open: false })}
        onVerified={executeContact}
      />
    </div>
  );
};


export default VolunteerPickups;
