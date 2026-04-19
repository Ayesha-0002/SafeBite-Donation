import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Phone, MessageCircle, Camera, CheckCircle, Locate, Loader2, AlertTriangle, X, PenTool } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import LeafletMap from "@/components/LeafletMap";
import SignaturePad from "@/components/SignaturePad";
import { toast } from "sonner";

type DeliveryStatus = "en-route" | "arrived" | "photo-proof" | "signature" | "delivered";

const LiveTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get("donation");
  const deliveryPhotoRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<DeliveryStatus>("en-route");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [eta, setEta] = useState(20);
  const [distance, setDistance] = useState(5.2);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);

  const pickupLat = 31.5204;
  const pickupLng = 74.3587;
  const dropoffLat = 31.4804;
  const dropoffLng = 74.3187;

  const calcDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !donationId) return;
    const dbStatus = status === "photo-proof" || status === "signature" ? "arrived" : status === "delivered" ? "delivered" : status;
    const { data: existing } = await supabase.from("volunteer_tracking").select("id").eq("volunteer_id", user.id).eq("donation_id", donationId).maybeSingle();
    if (existing) {
      await supabase.from("volunteer_tracking").update({ latitude: lat, longitude: lng, status: dbStatus, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("volunteer_tracking").insert({ volunteer_id: user.id, donation_id: donationId, latitude: lat, longitude: lng, status: dbStatus });
    }
  }, [donationId, status]);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported"); return; }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setGpsError(null);
        const dist = calcDistance(latitude, longitude, dropoffLat, dropoffLng);
        setDistance(+dist.toFixed(1));
        setEta(Math.ceil((dist / 30) * 60));
        if (dist < 0.1 && status === "en-route") setStatus("arrived");
        updateLocationInDb(latitude, longitude);
      },
      (error) => {
        setGpsError(error.code === error.PERMISSION_DENIED ? "Location permission denied." : "Location unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [calcDistance, updateLocationInDb, status]);

  const handleDeliveryPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDeliveryPhoto(ev.target?.result as string);
      // Photo lene ke baad signature step pe jao
      setStatus("signature");
    };
    reader.readAsDataURL(file);
  };

  const handleStartDeliveryProof = () => {
    setStatus("photo-proof");
    deliveryPhotoRef.current?.click();
  };

  const handleSignatureSaved = (base64: string) => {
    setSignatureBase64(base64);
    toast.success("Signature captured!");
  };

  const handleFinalConfirm = async () => {
    if (!deliveryPhoto || !signatureBase64 || !receiverName.trim()) {
      toast.error("Photo, receiver name aur signature sab zaruri hain!");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Upload delivery photo
      const blob = await fetch(deliveryPhoto).then(r => r.blob());
      const fileName = `${user.id}/${Date.now()}-delivery.jpg`;
      await supabase.storage.from("delivery-photos").upload(fileName, blob);

      // Save to deliveries table (signature + receiver info)
      await supabase.from("deliveries").insert({
        donation_id: donationId,
        volunteer_id: user.id,
        receiver_name: receiverName.trim(),
        signature_base64: signatureBase64,
        delivery_photo_url: fileName,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        delivered_at: new Date().toISOString(),
      });

      // Update donation status
      if (donationId) {
        await supabase.from("food_donations").update({
          status: "delivered",
          delivery_photo_url: fileName,
        }).eq("id", donationId);

        await supabase.from("volunteer_tracking").update({ status: "delivered" }).eq("volunteer_id", user.id).eq("donation_id", donationId);
      }

      setStatus("delivered");
      toast.success("Delivery confirmed with signature proof!");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm delivery");
    }
    setIsUploading(false);
  };

  // ── Delivered Screen ──
  if (status === "delivered") {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center page-padding">
        <div className="glass-card-elevated p-8 text-center max-w-sm w-full animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Delivery Confirmed!</h2>
          <p className="text-sm text-muted-foreground font-body mb-2">Photo + Digital signature saved.</p>
          {deliveryPhoto && <img src={deliveryPhoto} alt="Delivery proof" className="w-full h-28 object-cover rounded-xl mb-3" />}
          {signatureBase64 && (
            <div className="bg-white rounded-xl p-2 mb-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Receiver: <span className="font-semibold text-foreground">{receiverName}</span></p>
              <img src={signatureBase64} alt="Signature" className="w-full h-16 object-contain" />
            </div>
          )}
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-muted-foreground font-body">✅ Verification complete — NGO notified</p>
          </div>
          <button onClick={() => navigate("/volunteer")} className="w-full py-3 rounded-xl font-semibold text-primary-foreground gradient-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Signature Step Screen ──
  if (status === "signature") {
    return (
      <div className="mobile-container min-h-screen bg-background">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => setStatus("photo-proof")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Receiver Verification</h1>
        </div>

        <div className="px-4 space-y-4 pb-8">
          {/* Photo Preview */}
          {deliveryPhoto && (
            <div className="glass-card p-3">
              <p className="text-xs text-muted-foreground font-body mb-2 flex items-center gap-1.5"><Camera size={12} /> Delivery Photo</p>
              <div className="relative">
                <img src={deliveryPhoto} alt="Delivery" className="w-full h-36 object-cover rounded-xl" />
                <button onClick={() => { setDeliveryPhoto(null); setStatus("photo-proof"); deliveryPhotoRef.current?.click(); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                  <X size={14} className="text-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Receiver Name */}
          <div className="glass-card-elevated p-4">
            <label className="text-sm font-semibold text-foreground mb-2 block">Receiver's Name</label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Enter receiver's full name"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Signature Pad */}
          <div className="glass-card-elevated p-4">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <PenTool size={16} className="text-primary" /> Digital Signature
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-3">Receiver se neeche sign karwayen</p>
            
            {signatureBase64 ? (
              <div className="space-y-2">
                <div className="bg-white rounded-xl p-2 border border-primary/20">
                  <img src={signatureBase64} alt="Signature" className="w-full h-32 object-contain" />
                </div>
                <button onClick={() => setSignatureBase64(null)} className="w-full py-2 rounded-xl text-sm font-medium text-foreground bg-muted">
                  Retake Signature
                </button>
              </div>
            ) : (
              <SignaturePad onSave={handleSignatureSaved} onClear={() => setSignatureBase64(null)} />
            )}
          </div>

          {/* Final Confirm */}
          <button
            onClick={handleFinalConfirm}
            disabled={isUploading || !signatureBase64 || !receiverName.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-secondary-foreground gradient-warm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Confirm Delivery
          </button>
        </div>
      </div>
    );
  }

  // ── Main Tracking Screen ──
  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Live GPS Tracking</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Locate size={14} className="text-primary animate-pulse-dot" />
          <span className="text-xs font-medium text-primary">LIVE</span>
        </div>
      </div>

      <input ref={deliveryPhotoRef} type="file" accept="image/*" capture="environment" onChange={handleDeliveryPhotoCapture} className="hidden" />

      {/* Map */}
      <div className="mx-4 rounded-2xl overflow-hidden border border-border">
        {gpsError ? (
          <div className="h-72 flex flex-col items-center justify-center bg-muted/50 gap-3 p-6">
            <AlertTriangle size={32} className="text-destructive" />
            <p className="text-sm text-foreground font-medium text-center">{gpsError}</p>
          </div>
        ) : !location ? (
          <div className="h-72 flex flex-col items-center justify-center bg-muted/50 gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-foreground font-medium">Getting GPS location...</p>
          </div>
        ) : (
          <LeafletMap latitude={location.lat} longitude={location.lng} pickupLat={pickupLat} pickupLng={pickupLng} dropoffLat={dropoffLat} dropoffLng={dropoffLng} className="h-72" />
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 glass-card p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground font-body">Distance</p><p className="text-lg font-bold text-foreground">{distance} Km</p></div>
        <div className="h-8 w-px bg-border" />
        <div><p className="text-xs text-muted-foreground font-body">ETA</p><p className="text-lg font-bold text-foreground">{eta} min</p></div>
        <div className="h-8 w-px bg-border" />
        <div><p className="text-xs text-muted-foreground font-body">Status</p><p className="text-sm font-bold text-primary">{status === "arrived" || status === "photo-proof" ? "Arrived 📍" : "En Route 🚗"}</p></div>
      </div>

      {/* Delivery Photo Preview (if taken but going back) */}
      {status === "photo-proof" && deliveryPhoto && (
        <div className="mx-4 mt-4 glass-card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Camera size={16} /> Delivery Photo</h3>
          <div className="relative">
            <img src={deliveryPhoto} alt="Delivery" className="w-full h-40 object-cover rounded-xl" />
            <button onClick={() => { setDeliveryPhoto(null); deliveryPhotoRef.current?.click(); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
              <X size={16} className="text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Pickup details */}
      <div className="mx-4 mt-4 glass-card-elevated p-4">
        <h3 className="font-semibold text-foreground mb-3">Pickup Details</h3>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-primary mt-1" />
          <div><p className="text-sm font-medium text-foreground">Pickup Point</p><p className="text-xs text-muted-foreground font-body">Gulberg III, Lahore</p></div>
        </div>
        <div className="ml-1.5 w-px h-6 bg-border" />
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive mt-1" />
          <div><p className="text-sm font-medium text-foreground">Drop-off Point</p><p className="text-xs text-muted-foreground font-body">Model Town, Lahore</p></div>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 mt-4 flex gap-3">
        <button className="flex-1 py-3 rounded-xl font-semibold text-primary-foreground gradient-primary flex items-center justify-center gap-2 text-sm"><Phone size={16} /> Call Donor</button>
        <button className="flex-1 py-3 rounded-xl font-semibold text-foreground bg-muted flex items-center justify-center gap-2 text-sm"><MessageCircle size={16} /> Message</button>
      </div>

      <div className="mx-4 mt-4 mb-8">
        <button
          onClick={handleStartDeliveryProof}
          className="w-full py-3.5 rounded-xl font-semibold text-secondary-foreground gradient-warm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Camera size={18} />
          {deliveryPhoto ? "Retake Photo & Get Signature" : "Deliver — Take Photo & Signature"}
        </button>
      </div>
    </div>
  );
};

export default LiveTracking;
