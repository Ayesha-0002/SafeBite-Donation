import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

old_sim = """  const startSimulation = useCallback(() => {
    setIsSimulated(true);
    setGpsError(null);
    // Start at a point slightly away from pickup if en-route
    if (!location) {
      setLocation({ lat: pickupCoords.lat - 0.02, lng: pickupCoords.lng - 0.02 });
    }
  }, [location, pickupCoords]);"""

new_sim = """  const startSimulation = useCallback(() => {
    setIsSimulated(true);
    setGpsError(null);
    // Force location to be near pickup point for demo purposes
    setLocation({ lat: pickupCoords.lat - 0.01, lng: pickupCoords.lng - 0.01 });
  }, [pickupCoords]);"""

content = content.replace(old_sim, new_sim)

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
