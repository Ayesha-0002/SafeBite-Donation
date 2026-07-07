import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Phone, MessageCircle, Camera, CheckCircle, Locate, Loader2, AlertTriangle, X, PenTool, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import LeafletMap from "@/components/LeafletMap";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

function RouteDisplay({ origin, destination, setDistanceInfo }: {
  origin: {lat: number, lng: number} | null;
  destination: {lat: number, lng: number} | null;
  setDistanceInfo?: (distance: number, minutes: number) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLib || !map) return;
    setDirectionsService(new routesLib.DirectionsService());
    setDirectionsRenderer(new routesLib.DirectionsRenderer({ map, suppressMarkers: true }));
  }, [routesLib, map]);

  const originKey = origin ? `${origin.lat},${origin.lng}` : "";
  const destKey = destination ? `${destination.lat},${destination.lng}` : "";

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    }).then(response => {
      directionsRenderer.setDirections(response);
      const route = response.routes[0];
      if (route && route.legs[0] && setDistanceInfo) {
        const durMins = route.legs[0].duration?.value ? Math.ceil(route.legs[0].duration.value / 60) : 0;
        const distKm = route.legs[0].distance?.value ? +(route.legs[0].distance.value / 1000).toFixed(2) : 0;
        setDistanceInfo(distKm, durMins);
      }
    }).catch(err => console.error("Directions error", err));

    return () => { directionsRenderer.setDirections({routes:[]}); }
  }, [directionsService, directionsRenderer, originKey, destKey, origin, destination, setDistanceInfo]);

  return null;
}
import SignaturePad from "@/components/SignaturePad";
import { toast } from "sonner";
import { ContactVerification } from "@/components/ContactVerification";

type DeliveryStatus = "not-started" | "en-route" | "arrived" | "in-transit" | "arrived-dropoff" | "photo-proof" | "signature" | "delivered";

const LiveTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get("donation");
  const deliveryPhotoRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<DeliveryStatus>("not-started");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [eta, setEta] = useState(0);
  const [distance, setDistance] = useState(0);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);

  const [pickupCoords, setPickupCoords] = useState({ lat: 31.5204, lng: 74.3587 });
  const [dropoffCoords, setDropoffCoords] = useState({ lat: 31.4804, lng: 74.3187 });
  const [isSimulated, setIsSimulated] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  
  const [rideStartedAt, setRideStartedAt] = useState<string | null>(() => localStorage.getItem(`ride_start_${donationId}`));
  const [rideEndedAt, setRideEndedAt] = useState<string | null>(() => localStorage.getItem(`ride_end_${donationId}`));

  const calcDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const [trackingRecord, setTrackingRecord] = useState<any>(null);
  const [donor, setDonor] = useState<{ id: string; phone: string | null; full_name: string | null } | null>(null);
  const [donation, setDonation] = useState<{ title: string; location: string; dropoff_location?: string } | null>(null);
  const [ngo, setNgo] = useState<{ full_name: string; address: string | null; phone: string | null } | null>(null);


  const geocodeAddress = async (address: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
    return null;
  };

  const fetchTrackingData = useCallback(async () => {
    if (!donationId) return;
    
    const { data: donationData, error } = await supabase
      .from("food_donations")
      .select("title, location, dropoff_location, donor_id, ngo_verified_by, status")
      .eq("id", donationId)
      .single();
    
    if (error) {
       console.error("fetchTrackingData: failed to fetch donation", error);
       toast.error("Failed to fetch donation details.");
    }
    
    if (donationData) {
      setDonation({ title: donationData.title, location: donationData.location, dropoff_location: donationData.dropoff_location });
      if (donationData.status === "delivered") setStatus("delivered");
      else if (donationData.status === "picked_up") setStatus("in-transit");
      // Don't auto-set en-route here, we want them to click "Start Ride" usually, unless already tracking

      // Geocode pickup address
      const pickupAddress = donationData.location;
      if (pickupAddress) {
        geocodeAddress(pickupAddress).then(coords => {
          if (coords) setPickupCoords(coords);
        });
      }

      // Fetch donor profile
      const { data: donorProfile } = await supabase
        .from("profiles")
        .select("id, phone, full_name, address")
        .eq("id", donationData.donor_id)
        .single();
      
      if (donorProfile) {
        setDonor({ 
          id: donorProfile.id, 
          phone: donorProfile.phone,
          full_name: donorProfile.full_name
        });
        
        if (!donationData.location && donorProfile.address) {
          setDonation(prev => prev ? { ...prev, location: donorProfile.address! } : { title: donationData.title, location: donorProfile.address! });
        }
      }

      // Fetch NGO profile if assigned, else try to get volunteer's own NGO
      let targetNgoId = donationData.ngo_verified_by;
      
      if (!targetNgoId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: volProfile } = await supabase.from("profiles").select("ngo_id").eq("id", user.id).single();
          if (volProfile && volProfile.ngo_id) {
            targetNgoId = volProfile.ngo_id;
          }
        }
      }

      if (targetNgoId) {
        const { data: ngoProfile } = await supabase
          .from("profiles")
          .select("full_name, address")
          .eq("id", targetNgoId)
          .single();
        if (ngoProfile) {
          setNgo({ 
            full_name: ngoProfile.full_name, 
            address: ngoProfile.address 
          });
          const nh = ngoProfile.full_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
          setDropoffCoords({ lat: 31.4804 - (nh * 0.0005), lng: 74.3187 - (nh * 0.0005) });
        }
      }
    }
  }, [donationId]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !donationId) return;
    const dbStatus = ["arrived-dropoff", "photo-proof", "signature"].includes(status) ? "arrived-dropoff" : status === "delivered" ? "delivered" : status;
    const { data: existing } = await supabase.from("volunteer_tracking").select("*").eq("volunteer_id", user.id).eq("donation_id", donationId).maybeSingle();
    if (existing) {
      const { data: updated } = await supabase.from("volunteer_tracking").update({ latitude: lat, longitude: lng, status: dbStatus, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
      setTrackingRecord(updated);
    } else {
      const { data: inserted } = await supabase.from("volunteer_tracking").insert({ 
        volunteer_id: user.id, 
        donation_id: donationId, 
        latitude: lat, 
        longitude: lng, 
        status: dbStatus,
        updated_at: new Date().toISOString()
      }).select().single();
      setTrackingRecord(inserted);
    }
  }, [donationId, status]);

  const handleCallDonor = () => {
    if (donor?.phone) {
      window.location.href = `tel:${donor.phone}`;
    } else {
      toast.error("Donor contact number not found in their profile.");
    }
  };

  const handleWhatsAppDonor = () => {
    if (donor?.phone) {
      const cleanPhone = donor.phone.replace(/\D/g, "");
      // Resilient Pakistani number formatting
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith("0")) {
        formattedPhone = "92" + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {
        formattedPhone = "92" + cleanPhone;
      }
      
      const msg = encodeURIComponent(`Assalam o Alaikum ${donor.full_name || 'Donor'}, I am the SafeBite volunteer. I am on my way to pick up the donation: ${donation?.title || 'food'}. Currently ${distance} km away.`);
      window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
    } else {
      toast.error("Donor's WhatsApp number is not available.");
    }
  };

  const startSimulation = useCallback(() => {
    setIsSimulated(true);
    setGpsError(null);
    // Force location to be near pickup point for demo purposes
    setLocation({ lat: pickupCoords.lat - 0.01, lng: pickupCoords.lng - 0.01 });
  }, [pickupCoords]);

  useEffect(() => {
    if (isSimulated && location && status !== "not-started") {
      simulationInterval.current = setInterval(() => {
        const targetLat = (status === "en-route" || status === "arrived") ? pickupCoords.lat : dropoffCoords.lat;
        const targetLng = (status === "en-route" || status === "arrived") ? pickupCoords.lng : dropoffCoords.lng;
        
        setLocation(prev => {
          if (!prev) return prev;
          // Slowly move towards target
          const step = 0.0005; 
          const dLat = targetLat - prev.lat;
          const dLng = targetLng - prev.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          
          if (dist < step) return { lat: targetLat, lng: targetLng };
          
          return {
            lat: prev.lat + (dLat / dist) * step,
            lng: prev.lng + (dLng / dist) * step
          };
        });
      }, 2000);
    }
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [isSimulated, location, status, pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (!location || status === "not-started" || status === "arrived" || status === "signature" || status === "delivered") return;
    
    const targetLat = status === "en-route" ? pickupCoords.lat : dropoffCoords.lat;
    const targetLng = status === "en-route" ? pickupCoords.lng : dropoffCoords.lng;
    
    // mathematical distance
    const dist = calcDistance(location.lat, location.lng, targetLat, targetLng);
    
    // Fallback if no Maps API key is defined
    if (!process.env.GOOGLE_MAPS_PLATFORM_KEY) {
      setDistance(+dist.toFixed(2));
      const estimatedMinutes = Math.ceil((dist / 25) * 60);
      setEta(estimatedMinutes > 1 ? estimatedMinutes : 1);
    }

    if (dist < 0.15 && status === "en-route") {
      toast.success("You have arrived at the pickup point!");
      setStatus("arrived");
    } else if (dist < 0.15 && status === "in-transit") {
      toast.success("You have arrived at the drop-off point!");
      setStatus("arrived-dropoff");
    }
    
    updateLocationInDb(location.lat, location.lng);
  }, [location, status, pickupCoords, dropoffCoords, calcDistance, updateLocationInDb]);

  useEffect(() => {
    if (isSimulated) return; // Don't use real GPS if simulation is on

    if (!navigator.geolocation) { 
      setGpsError("Geolocation not supported"); 
      return; 
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setGpsError(null);
      },
      (error) => {
        console.error("GPS Watch error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("Location permission denied. Please enable GPS.");
        } else {
          setGpsError("Location unavailable.");
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 20000, 
        maximumAge: 0 
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulated]);

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
    console.log("handleSignatureSaved called in LiveTracking, data length:", base64.length);
    setSignatureBase64(base64);
    toast.success("Signature captured! Scroll down to confirm.");
    
    // Smooth scroll to the next button
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
      });
    }, 100);
  };

  const handleFinalConfirm = async () => {
    if (!deliveryPhoto || !signatureBase64 || !receiverName.trim()) {
      toast.error("Photo, receiver name, and signature are all required!");
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

        // Notify Donor
        if (donor?.id) {
          await supabase.from("notifications").insert({
            user_id: donor.id,
            title: "Donation Delivered!",
            message: `Your donation "${donation?.title}" has been successfully delivered and received.`,
            type: "delivered",
            related_donation_id: donationId,
          });
        }

        // Notify NGO if they verified it
        if (donation?.ngo_verified_by) {
          await supabase.from("notifications").insert({
            user_id: donation.ngo_verified_by,
            title: "Food Delivered! 🎉",
            message: `Donation "${donation?.title}" has been successfully delivered by the rider.`,
            type: "delivered",
            related_donation_id: donationId,
          });
        }
      }

      const now = new Date().toISOString();
      localStorage.setItem(`ride_end_${donationId}`, now);
      setRideEndedAt(now);
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
          {deliveryPhoto && <img src={deliveryPhoto} alt="Delivery proof" loading="lazy" className="w-full h-28 object-cover rounded-xl mb-3" />}
          {signatureBase64 && (
            <div className="bg-white rounded-xl p-2 mb-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Receiver: <span className="font-semibold text-foreground">{receiverName}</span></p>
              <img src={signatureBase64} alt="Signature" loading="lazy" className="w-full h-16 object-contain" />
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
                <img src={deliveryPhoto} alt="Delivery" loading="lazy" className="w-full h-36 object-cover rounded-xl" />
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
            <p className="text-xs text-muted-foreground font-body mb-3">Ask the receiver to sign below</p>
            
            {signatureBase64 ? (
              <div className="space-y-2">
                <div className="bg-white rounded-xl p-2 border border-primary/20">
                  <img src={signatureBase64} alt="Signature" loading="lazy" className="w-full h-32 object-contain" />
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
          <div className="h-72 flex flex-col items-center justify-center bg-muted/50 gap-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-1">
              <AlertTriangle size={28} className="text-destructive" />
            </div>
            <div>
              <p className="text-sm text-foreground font-bold mb-1">{gpsError}</p>
              <p className="text-[10px] text-muted-foreground px-4 leading-relaxed">
                Rizq supports real-time GPS tracking. However, browser previews often block location permissions. 
                Use <b>Simulated Tracking</b> below to see the animated route demo.
              </p>
            </div>
            <button 
              onClick={startSimulation}
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-[0.98] transition-all uppercase tracking-wider"
            >
              <Locate size={12} /> Start Mock Tracking Demo
            </button>
          </div>
        ) : !location || isNaN(location.lat) || isNaN(location.lng) ? (
          <div className="h-72 flex flex-col items-center justify-center bg-muted/50 gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-foreground font-medium">Getting GPS location...</p>
          </div>
        ) : !API_KEY ? (
          <LeafletMap latitude={location.lat} longitude={location.lng} pickupLat={pickupCoords.lat} pickupLng={pickupCoords.lng} dropoffLat={dropoffCoords.lat} dropoffLng={dropoffCoords.lng} className="h-72" />
        ) : (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: location.lat, lng: location.lng }}
              center={{ lat: location.lat, lng: location.lng }}
              defaultZoom={15}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '18rem' }}
              disableDefaultUI={true}
            >
              <AdvancedMarker position={{ lat: location.lat, lng: location.lng }} title="You">
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 text-white border-2 border-white ring-4 ring-primary/20">
                   <Locate size={14} />
                 </div>
              </AdvancedMarker>
              
              <AdvancedMarker position={pickupCoords} title="Pickup Point">
                 <Pin background="#10b981" glyphColor="#fff" borderColor="#047857" />
              </AdvancedMarker>
              
              <AdvancedMarker position={dropoffCoords} title="Drop-off Point">
                 <Pin background="#ef4444" glyphColor="#fff" borderColor="#b91c1c" />
              </AdvancedMarker>
              
              <RouteDisplay 
                origin={location} 
                destination={(status === "not-started" || status === "en-route" || status === "arrived") ? pickupCoords : dropoffCoords} 
                setDistanceInfo={(d, m) => { setDistance(d); setEta(m); }}
              />
            </Map>
          </APIProvider>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 glass-card p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground font-body">Distance</p><p className="text-lg font-bold text-foreground">{distance} Km</p></div>
        <div className="h-8 w-px bg-border" />
        <div><p className="text-xs text-muted-foreground font-body">ETA</p><p className="text-lg font-bold text-foreground">{eta} min</p></div>
        <div className="h-8 w-px bg-border" />
        <div><p className="text-xs text-muted-foreground font-body">Current Step</p><p className="text-sm font-bold text-primary">{status === "not-started" ? "Ready to Start" : status === "en-route" ? "To Pickup Point" : status === "arrived" ? "At Pickup" : status === "in-transit" ? "To Drop-off NGO" : status === "arrived-dropoff" || status === "photo-proof" || status === "signature" ? "At Drop-off" : "Task Completed"}</p></div>
      </div>

      {/* Delivery Photo Preview (if taken but going back) */}
      {status === "photo-proof" && deliveryPhoto && (
        <div className="mx-4 mt-4 glass-card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Camera size={16} /> Delivery Photo</h3>
          <div className="relative">
            <img src={deliveryPhoto} alt="Delivery" loading="lazy" className="w-full h-40 object-cover rounded-xl" />
            <button onClick={() => { setDeliveryPhoto(null); deliveryPhotoRef.current?.click(); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
              <X size={16} className="text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Contact Card */}
      {(() => {
        const isHeadingToDropoff = ["in-transit", "arrived-dropoff", "photo-proof", "signature", "delivered"].includes(status);
        const contactTarget = isHeadingToDropoff ? ngo : donor;
        const targetType = isHeadingToDropoff ? "NGO Drop-off" : "Food Donor";
        const targetName = isHeadingToDropoff ? ngo?.full_name || "NGO Location" : donor?.full_name || "SafeBite Donor";
        
        if (!contactTarget) return null;
        
        const handleCall = () => {
          if (contactTarget.phone) window.open(`tel:${contactTarget.phone}`, "_system");
          else toast.error("Phone number not available");
        };

        const handleWhatsApp = () => {
          if (contactTarget.phone) window.open(`https://wa.me/${contactTarget.phone.replace(/[^0-9]/g, '')}`, "_blank");
          else toast.error("WhatsApp not available");
        };

        return (
          <div className="mx-4 mt-4 glass-card-elevated p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{targetType}</p>
                <h4 className="text-sm font-bold text-foreground">{targetName}</h4>
                <p className="text-xs text-muted-foreground font-medium">{contactTarget.phone || "Number stored"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCall}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce-subtle"
                title={`Call ${targetType}`}
              >
                <Phone size={18} />
              </button>
              <button 
                onClick={handleWhatsApp}
                className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20"
                title={`WhatsApp ${targetType}`}
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Timestamps */}
      {(rideStartedAt || rideEndedAt) && (
        <div className="mx-4 mt-4 glass-card-elevated p-4 flex gap-4 text-center divide-x divide-border">
          {rideStartedAt && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body">Started</p>
              <p className="text-sm font-bold text-foreground">
                {new Date(rideStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-muted-foreground">{new Date(rideStartedAt).toLocaleDateString()}</p>
            </div>
          )}
          {rideEndedAt && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body">Ended</p>
              <p className="text-sm font-bold text-foreground">
                {new Date(rideEndedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-muted-foreground">{new Date(rideEndedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Pickup details */}
      <div className="mx-4 mt-4 glass-card-elevated p-4 mb-4">
        <h3 className="font-semibold text-foreground mb-3">Pickup Details</h3>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-primary mt-1" />
          <div>
            <p className="text-sm font-medium text-foreground">Pickup Point (Real Location)</p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed max-w-[250px]">{(donation && donation.location) ? donation.location : "Not specified by donor"}</p>
          </div>
        </div>
        <div className="ml-1.5 w-px h-6 bg-border" />
        <div className="flex items-start gap-3 mt-3">
          <div className="w-3 h-3 rounded-full bg-destructive mt-1" />
          <div>
            <p className="text-sm font-medium text-foreground">Drop-off Point</p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed max-w-[250px]">{donation?.dropoff_location || ((ngo && ngo.address) ? `${ngo.full_name}, ${ngo.address}` : ngo?.full_name ? ngo.full_name : "Not specified")}</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 mb-8">
        {status === "not-started" ? (
          <button
            onClick={() => {
              const now = new Date().toISOString();
              localStorage.setItem(`ride_start_${donationId}`, now);
              setRideStartedAt(now);
              setStatus("en-route");
              toast.success("Ride started! Drive safely.");
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 transition-all hover:bg-emerald-700 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            Start Ride
          </button>
        ) : (status === "en-route" || status === "arrived") ? (
          <button
            onClick={async () => {
              setStatus("in-transit");
              await supabase.from("food_donations").update({ status: "picked_up" }).eq("id", donationId);
              toast.success("Food picked up! Navigating to NGO Drop-off.");
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 transition-all hover:bg-blue-700 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            Confirm Pickup & Start Delivery
          </button>
        ) : (status === "in-transit" || status === "arrived-dropoff") ? (
           <button
            onClick={handleStartDeliveryProof}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-orange-500 transition-all hover:bg-orange-600 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Camera size={18} />
            Deliver — Take Photo & Signature
          </button>
        ) : (status === "photo-proof" || status === "signature") ? (
           <button
            onClick={() => setStatus("signature")}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-orange-500 transition-all hover:bg-orange-600 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Continue Verification
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default LiveTracking;
