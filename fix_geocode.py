import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

geocode_fn = """
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
"""

# Insert geocode function before fetchTrackingData
content = content.replace("  const fetchTrackingData = useCallback(async () => {", geocode_fn + "\n  const fetchTrackingData = useCallback(async () => {")

# Update coordinate assignment in fetchTrackingData
old_coord_logic = """      // Generate stable coordinates for this donation if not present
      const hash = donationId.split('-')[0];
      const h = parseInt(hash, 16) % 100;
      setPickupCoords({ lat: 31.5204 + (h * 0.0005), lng: 74.3587 + (h * 0.0005) });
      
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
      }"""

new_coord_logic = """      let pickupLocStr = donationData.location || donorProfile?.address;
      let dropoffLocStr = donationData.dropoff_location;
      
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

      let ngoData = null;
      if (targetNgoId) {
        const { data: ngoProfile } = await supabase.from("profiles").select("full_name, address").eq("id", targetNgoId).single();
        if (ngoProfile) {
          ngoData = ngoProfile;
          setNgo({ full_name: ngoProfile.full_name, address: ngoProfile.address });
          if (!dropoffLocStr && ngoProfile.address) dropoffLocStr = ngoProfile.address;
        }
      }

      // Geocode locations
      if (pickupLocStr) {
        const coords = await geocodeAddress(pickupLocStr);
        if (coords) setPickupCoords(coords);
      }
      if (dropoffLocStr) {
        const coords = await geocodeAddress(dropoffLocStr);
        if (coords) setDropoffCoords(coords);
      }"""

content = content.replace(old_coord_logic, new_coord_logic)

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
