import { useEffect, useRef, useMemo, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarkerLocation {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  type?: "rider" | "pickup" | "dropoff";
}

interface LeafletMapProps {
  latitude?: number;
  longitude?: number;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  activeRiders?: MarkerLocation[];
  className?: string;
}

const LeafletMap = ({
  latitude,
  longitude,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  activeRiders = [],
  className = "",
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mainMarkerRef = useRef<L.Marker | null>(null);
  const riderMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Icons
  const volunteerIcon = useMemo(() => L.divIcon({
    html: `<div style="background: hsl(160, 84%, 39%); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: scale(1.1); transition: transform 0.2s;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
    </div>`,
    className: "custom-marker-rider",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  }), []);

  const otherRiderIcon = useMemo(() => L.divIcon({
    html: `<div style="background: hsl(220, 70%, 50%); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
    </div>`,
    className: "custom-marker-other",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }), []);

  const pickupIcon = useMemo(() => L.divIcon({
    html: `<div style="background: hsl(38, 92%, 50%); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>
    </div>`,
    className: "custom-marker-pickup",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }), []);

  const dropoffIcon = useMemo(() => L.divIcon({
    html: `<div style="background: hsl(0, 72%, 51%); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"/></svg>
    </div>`,
    className: "custom-marker-dropoff",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }), []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      const initialLat = latitude || 31.5204;
      const initialLng = longitude || 74.3587;

      map.setView([initialLat, initialLng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;

      // Initial points for fitting bounds
      const points: L.LatLngTuple[] = [];

      // Main Marker
      if (latitude !== undefined && longitude !== undefined) {
        mainMarkerRef.current = L.marker([latitude, longitude], { icon: volunteerIcon, zIndexOffset: 1000 }).addTo(map);
        mainMarkerRef.current.bindPopup("<b>Target Rider</b>").openPopup();
        points.push([latitude, longitude]);
      }

      // Pickup/Dropoff
      if (pickupLat && pickupLng) {
        pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
        pickupMarkerRef.current.bindPopup("<b>Pickup Location</b>");
        points.push([pickupLat, pickupLng]);
      }
      if (dropoffLat && dropoffLng) {
        dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
        dropoffMarkerRef.current.bindPopup("<b>NGO Dropoff</b>");
        points.push([dropoffLat, dropoffLng]);
      }

      // Route line for single mode
      if (points.length > 1 && !activeRiders.length) {
        routeLineRef.current = L.polyline(points, {
          color: "hsl(160, 84%, 39%)",
          weight: 4,
          dashArray: "10 6",
          opacity: 0.6,
        }).addTo(map);
        map.fitBounds(L.latLngBounds(points).pad(0.2));
      } else if (activeRiders.length > 0) {
        // Multi-rider mode
        activeRiders.forEach(r => {
          if (!r.latitude || !r.longitude) return;
          const m = L.marker([r.latitude, r.longitude], { 
            icon: otherRiderIcon,
            title: r.label || "Rider"
          }).addTo(map);
          m.bindPopup(`<b>${r.label || "Rider"}</b><br/>Status: Active`);
          riderMarkersRef.current.set(r.id, m);
          points.push([r.latitude, r.longitude]);
        });
        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points).pad(0.1));
        }
      }
    } catch (e) {
      console.error("Leaflet Map Error:", e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only once

  // Update logic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: L.LatLngTuple[] = [];

    // Update main marker
    if (latitude !== undefined && longitude !== undefined) {
      if (mainMarkerRef.current) {
        mainMarkerRef.current.setLatLng([latitude, longitude]);
      } else {
        mainMarkerRef.current = L.marker([latitude, longitude], { icon: volunteerIcon }).addTo(map);
      }
      points.push([latitude, longitude]);
    }

    // Update active riders markers
    const currentIds = new Set(activeRiders?.map(r => r.id) || []);
    
    // Remove stale markers (even if activeRiders is empty)
    riderMarkersRef.current.forEach((m, id) => {
      if (!currentIds.has(id)) {
        m.remove();
        riderMarkersRef.current.delete(id);
      }
    });

    if (activeRiders && activeRiders.length > 0) {
      // Update or add markers
      activeRiders.forEach(r => {
        if (!r.latitude || !r.longitude) return;
        points.push([r.latitude, r.longitude]);
        const existing = riderMarkersRef.current.get(r.id);
        if (existing) {
          existing.setLatLng([r.latitude, r.longitude]);
          if (r.label) existing.setPopupContent(`<b>${r.label}</b>`);
        } else {
          const m = L.marker([r.latitude, r.longitude], { icon: otherRiderIcon }).addTo(map);
          m.bindPopup(`<b>${r.label || "Rider"}</b>`);
          riderMarkersRef.current.set(r.id, m);
        }
      });
    }

    // Update static locations
    if (pickupLat && pickupLng) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
      }
      points.push([pickupLat, pickupLng]);
    }
    if (dropoffLat && dropoffLng) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
      }
      points.push([dropoffLat, dropoffLng]);
    }

    // Update Route Line
    if (routeLineRef.current && points.length > 1) {
      routeLineRef.current.setLatLngs(points);
    }

  }, [latitude, longitude, activeRiders, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  return <div ref={mapRef} className={`w-full ${className}`} style={{ minHeight: "280px" }} />;
};

export default memo(LeafletMap);
