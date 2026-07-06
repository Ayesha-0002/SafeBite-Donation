import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

# Update DeliveryStatus type
content = content.replace(
    'type DeliveryStatus = "not-started" | "en-route" | "arrived" | "photo-proof" | "signature" | "delivered";',
    'type DeliveryStatus = "not-started" | "en-route" | "arrived" | "in-transit" | "arrived-dropoff" | "photo-proof" | "signature" | "delivered";'
)

# Update useEffect distance check
old_dist_effect = """  useEffect(() => {
    if (!location || status === "not-started" || status === "arrived" || status === "signature" || status === "delivered") return;
    
    const targetLat = status === "en-route" ? pickupCoords.lat : dropoffCoords.lat;
    const targetLng = status === "en-route" ? pickupCoords.lng : dropoffCoords.lng;
    
    // mathematical distance
    const dist = calcDistance(location.lat, location.lng, targetLat, targetLng);
    
    // Fallback if no Maps API key is defined
    if (!API_KEY) {
      setDistance(`${dist.toFixed(1)} km`);
      setEta(`${Math.round(dist * 3)} min`);
    }

    if (dist < 0.05 && status === "en-route") {
      toast.success("You have arrived at the pickup point!");
      setStatus("arrived");
    }
    
    updateLocationInDb(location.lat, location.lng);
  }, [location, status, pickupCoords, dropoffCoords, calcDistance, updateLocationInDb]);"""

new_dist_effect = """  useEffect(() => {
    if (!location || status === "not-started" || status === "arrived" || status === "arrived-dropoff" || status === "signature" || status === "delivered") return;
    
    const targetLat = (status === "en-route") ? pickupCoords.lat : dropoffCoords.lat;
    const targetLng = (status === "en-route") ? pickupCoords.lng : dropoffCoords.lng;
    
    // mathematical distance
    const dist = calcDistance(location.lat, location.lng, targetLat, targetLng);
    
    // Fallback if no Maps API key is defined
    if (!API_KEY) {
      setDistance(`${dist.toFixed(1)} km`);
      setEta(`${Math.round(dist * 3)} min`);
    }

    if (dist < 0.05 && status === "en-route") {
      toast.success("You have arrived at the pickup point!");
      setStatus("arrived");
    }
    if (dist < 0.05 && status === "in-transit") {
      toast.success("You have arrived at the drop-off point!");
      setStatus("arrived-dropoff");
    }
    
    updateLocationInDb(location.lat, location.lng);
  }, [location, status, pickupCoords, dropoffCoords, calcDistance, updateLocationInDb]);"""

content = content.replace(old_dist_effect, new_dist_effect)

# Update buttons
old_buttons = """        {status === "not-started" ? (
          <button
            onClick={() => {
              const now = new Date().toISOString();
              localStorage.setItem(`ride_start_${donationId}`, now);
              setRideStartedAt(now);
              setStatus("en-route");
              toast.success("Ride started! Drive safely.");
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 transition-all hover:bg-emerald-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Start Ride
          </button>
        ) : (
          <button
            onClick={handleStartDeliveryProof}
            className="w-full py-3.5 rounded-xl font-semibold text-secondary-foreground gradient-warm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            {deliveryPhoto ? "Retake Photo & Get Signature" : "Deliver — Take Photo & Signature"}
          </button>
        )}"""

new_buttons = """        {status === "not-started" ? (
          <button
            onClick={() => {
              const now = new Date().toISOString();
              localStorage.setItem(`ride_start_${donationId}`, now);
              setRideStartedAt(now);
              setStatus("en-route");
              toast.success("Ride started! Drive safely.");
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 transition-all hover:bg-emerald-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Start Ride
          </button>
        ) : status === "en-route" ? (
           <button disabled className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600/50 transition-all flex items-center justify-center gap-2">
            Navigating to Pickup...
          </button>
        ) : status === "arrived" ? (
          <button
            onClick={async () => {
              setStatus("in-transit");
              await supabase.from("food_donations").update({ status: "picked_up" }).eq("id", donationId);
              toast.success("Navigating to Drop-off.");
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 transition-all hover:bg-blue-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Confirm Pickup & Start Delivery
          </button>
        ) : status === "in-transit" ? (
           <button disabled className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600/50 transition-all flex items-center justify-center gap-2">
            Navigating to Drop-off...
          </button>
        ) : (
          <button
            onClick={handleStartDeliveryProof}
            className="w-full py-3.5 rounded-xl font-semibold text-secondary-foreground gradient-warm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            {deliveryPhoto ? "Retake Photo & Get Signature" : "Deliver — Take Photo & Signature"}
          </button>
        )}"""

content = content.replace(old_buttons, new_buttons)

# Update Status text
old_status_text = """<p className="text-sm font-bold text-primary">{status === "arrived" || status === "photo-proof" ? "Arrived 📍" : "En Route 🚗"}</p>"""
new_status_text = """<p className="text-sm font-bold text-primary">{status === "arrived" ? "At Pickup 📍" : status === "arrived-dropoff" || status === "photo-proof" ? "At Drop-off 📍" : "En Route 🚗"}</p>"""
content = content.replace(old_status_text, new_status_text)

# Update RouteDisplay
old_route_display = """              <RouteDisplay 
                origin={location} 
                destination={status === "en-route" ? pickupCoords : dropoffCoords} 
                setDistanceInfo={(d, m) => { setDistance(d); setEta(m); }}
              />"""
new_route_display = """              <RouteDisplay 
                origin={location} 
                destination={(status === "not-started" || status === "en-route" || status === "arrived") ? pickupCoords : dropoffCoords} 
                setDistanceInfo={(d, m) => { setDistance(d); setEta(m); }}
              />"""
content = content.replace(old_route_display, new_route_display)

# Update simulation
old_sim = """        const targetLat = status === "en-route" ? pickupCoords.lat : dropoffCoords.lat;
        const targetLng = status === "en-route" ? pickupCoords.lng : dropoffCoords.lng;"""
new_sim = """        const targetLat = (status === "en-route" || status === "arrived") ? pickupCoords.lat : dropoffCoords.lat;
        const targetLng = (status === "en-route" || status === "arrived") ? pickupCoords.lng : dropoffCoords.lng;"""
content = content.replace(old_sim, new_sim)

# Also fix the initial data status fetching mapping
old_status_fetch = """      if (donationData.status === "delivered") setStatus("delivered");
      else if (donationData.status === "picked_up") setStatus("arrived");"""
new_status_fetch = """      if (donationData.status === "delivered") setStatus("delivered");
      else if (donationData.status === "picked_up") setStatus("in-transit");"""
content = content.replace(old_status_fetch, new_status_fetch)


with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
