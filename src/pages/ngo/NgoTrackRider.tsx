import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, MapPin, Truck, CheckCircle, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import LeafletMap from "@/components/LeafletMap";

const NgoTrackRider = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get("donation");

  const [tracking, setTracking] = useState<any>(null);
  const [donation, setDonation] = useState<any>(null);
  const [volunteer, setVolunteer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTracking = async () => {
    if (!donationId) return;

    const { data: don } = await supabase
      .from("food_donations")
      .select("*")
      .eq("id", donationId)
      .single();
    setDonation(don);

    if (don?.assigned_volunteer_id) {
      const [trackRes, profileRes] = await Promise.all([
        supabase
          .from("volunteer_tracking")
          .select("*")
          .eq("donation_id", donationId)
          .eq("volunteer_id", don.assigned_volunteer_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", don.assigned_volunteer_id)
          .single(),
      ]);
      setTracking(trackRes.data);
      setVolunteer(profileRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTracking();

    if (!donationId) return;

    // Supabase Realtime: Listen for location updates
    const channel = supabase
      .channel(`tracking-${donationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "volunteer_tracking",
          filter: `donation_id=eq.${donationId}`,
        },
        (payload) => {
          setTracking(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "food_donations",
          filter: `id=eq.${donationId}`,
        },
        (payload) => {
          setDonation(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [donationId]);

  const statusLabel = (s: string | null) => {
    if (s === "delivered") return { text: "Delivered ✅", color: "text-primary" };
    if (s === "arrived") return { text: "Arrived at Drop-off 📍", color: "text-secondary" };
    return { text: "En Route 🚗", color: "text-primary" };
  };

  const st = statusLabel(tracking?.status || donation?.status);

  return (
    <div className="mobile-container min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Track Rider</h1>
        {tracking && (
          <div className="ml-auto flex items-center gap-1.5">
            <MapPin size={14} className="text-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">LIVE</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : !donation ? (
        <div className="text-center py-20 px-5">
          <p className="text-sm text-muted-foreground">Donation not found</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-8">
          {/* Map */}
          {tracking?.latitude && tracking?.longitude ? (
            <div className="rounded-2xl overflow-hidden border border-border">
              <LeafletMap
                latitude={tracking.latitude}
                longitude={tracking.longitude}
                dropoffLat={31.4804}
                dropoffLng={74.3187}
                className="h-64"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-border h-48 flex flex-col items-center justify-center bg-muted/50 gap-2">
              <Clock size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-body">Rider location not available yet</p>
              <p className="text-xs text-muted-foreground">Location will appear when rider starts delivery</p>
            </div>
          )}

          {/* Status Card */}
          <div className="glass-card-elevated p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">{donation.title}</h3>
                <p className="text-xs text-muted-foreground">📍 {donation.location} · 🍽 {donation.quantity} servings</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-body">Status</p>
                <p className={`text-sm font-bold ${st.color}`}>{st.text}</p>
              </div>
              {tracking?.latitude && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-body">Last Update</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(tracking.updated_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rider Info */}
          {volunteer && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Rider Info</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Truck size={18} className="text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{volunteer.full_name || "Rider"}</p>
                  <p className="text-xs text-muted-foreground">{volunteer.phone || volunteer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivered proof */}
          {donation.status === "delivered" && donation.delivery_photo_url && (
            <div className="glass-card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Delivery Proof</h4>
              </div>
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/delivery-photos/${donation.delivery_photo_url}`}
                alt="Delivery proof"
                className="w-full h-40 object-cover rounded-xl"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NgoTrackRider;
