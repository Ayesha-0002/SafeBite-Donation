import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  className?: string;
}

const LeafletMap = ({
  latitude,
  longitude,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  className = "",
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Create custom icons
  const volunteerIcon = L.divIcon({
    html: `<div style="background: hsl(160, 84%, 39%); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
    </div>`,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const pickupIcon = L.divIcon({
    html: `<div style="background: hsl(38, 92%, 50%); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const dropoffIcon = L.divIcon({
    html: `<div style="background: hsl(0, 72%, 51%); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
    </div>`,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([latitude, longitude], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    // Volunteer marker
    markerRef.current = L.marker([latitude, longitude], { icon: volunteerIcon }).addTo(map);
    markerRef.current.bindPopup("📍 Your Location").openPopup();

    // Pickup marker
    if (pickupLat && pickupLng) {
      pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
      pickupMarkerRef.current.bindPopup("🟡 Pickup Point");
    }

    // Dropoff marker
    if (dropoffLat && dropoffLng) {
      dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
      dropoffMarkerRef.current.bindPopup("🔴 Drop-off Point");
    }

    // Draw route line
    const points: L.LatLngExpression[] = [];
    if (pickupLat && pickupLng) points.push([pickupLat, pickupLng]);
    points.push([latitude, longitude]);
    if (dropoffLat && dropoffLng) points.push([dropoffLat, dropoffLng]);

    if (points.length > 1) {
      routeLineRef.current = L.polyline(points, {
        color: "hsl(160, 84%, 39%)",
        weight: 4,
        dashArray: "10 6",
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(L.latLngBounds(points as L.LatLngTuple[]).pad(0.2));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update volunteer marker position
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    markerRef.current.setLatLng([latitude, longitude]);
    mapInstanceRef.current.panTo([latitude, longitude], { animate: true });

    // Update route line
    if (routeLineRef.current) {
      const points: L.LatLngExpression[] = [];
      if (pickupLat && pickupLng) points.push([pickupLat, pickupLng]);
      points.push([latitude, longitude]);
      if (dropoffLat && dropoffLng) points.push([dropoffLat, dropoffLng]);
      routeLineRef.current.setLatLngs(points);
    }
  }, [latitude, longitude]);

  return <div ref={mapRef} className={`w-full ${className}`} style={{ minHeight: "280px" }} />;
};

export default LeafletMap;
