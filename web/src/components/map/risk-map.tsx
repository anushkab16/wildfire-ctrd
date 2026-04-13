"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

type RiskMapProps = {
  center: { latitude: number; longitude: number; radiusKm: number };
  hotspots: Array<{ latitude: number; longitude: number; frp?: number }>;
  riskScore: number;
};

export function RiskMap({ center, hotspots, riskScore }: RiskMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let mounted = true;
    async function renderMap() {
      const leaflet: typeof import("leaflet") = await import("leaflet");
      if (!rootRef.current || !mounted) return;
      if (!mapRef.current) {
        mapRef.current = leaflet.map(rootRef.current).setView([center.latitude, center.longitude], 7);
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .addTo(mapRef.current);
      }
      const map = mapRef.current;
      map.setView([center.latitude, center.longitude], 7);
      map.eachLayer((layer) => {
        if (!(layer instanceof leaflet.TileLayer)) {
          map.removeLayer(layer);
        }
      });
      leaflet
        .circle([center.latitude, center.longitude], {
          radius: center.radiusKm * 1000,
          color: "#ea580c",
          fillOpacity: 0.08 + Math.min(0.5, riskScore),
        })
        .addTo(map);
      hotspots.slice(0, 200).forEach((hotspot) => {
        leaflet
          .circle([hotspot.latitude, hotspot.longitude], {
            radius: 1500 + Number(hotspot.frp ?? 0) * 20,
            color: "#dc2626",
            fillOpacity: 0.35,
          })
          .addTo(map);
      });
    }
    void renderMap();
    return () => {
      mounted = false;
    };
  }, [center.latitude, center.longitude, center.radiusKm, hotspots, riskScore]);

  return <div ref={rootRef} className="h-[360px] w-full rounded-md border" />;
}
