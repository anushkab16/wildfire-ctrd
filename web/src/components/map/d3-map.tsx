"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FIRE_PRONE_REGIONS,
  FIRE_ZONES,
  OCEANS,
  THREAT_COLORS,
  WEATHER_CODES,
} from "@/lib/config/map";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
}

interface D3MapProps {
  points?: MapPoint[];
  onSelect?: (id: string) => void;
}

interface WeatherResult {
  temp: number | null;
  wind: number | null;
  condition: string;
}

const WIDTH = 960;
const HEIGHT = 480;

const weatherCache = new Map<string, { data: WeatherResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getLocalTime(lon: number): string {
  const now = new Date();
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const offset = Math.round(lon / 15);
  let local = (utcH + offset + 24) % 24;
  const ampm = local >= 12 ? "PM" : "AM";
  local = local % 12 || 12;
  return `${local}:${utcM.toString().padStart(2, "0")} ${ampm}`;
}

async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherResult | null> {
  const key = `${lat}_${lon}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`
    );
    const data = await res.json();
    const temp = data.current?.temperature_2m;
    const tempF = temp != null ? Math.round((temp * 9) / 5 + 32) : null;
    const wind = data.current?.wind_speed_10m;
    const code = data.current?.weather_code;
    const result: WeatherResult = {
      temp: tempF,
      wind: wind ? Math.round(wind) : null,
      condition: WEATHER_CODES[code] || "\u2014",
    };
    weatherCache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}

function calculateTerminator(): [number, number][] {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const declination =
    -23.45 * Math.cos(((360 / 365) * (dayOfYear + 10) * Math.PI) / 180);
  const hourAngle =
    (now.getUTCHours() + now.getUTCMinutes() / 60) * 15 - 180;

  const pts: [number, number][] = [];
  for (let lat = -90; lat <= 90; lat += 2) {
    const tanDec = Math.tan((declination * Math.PI) / 180);
    const tanLat = Math.tan((lat * Math.PI) / 180);
    let lon =
      -hourAngle + (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
    if (isNaN(lon))
      lon = lat * declination > 0 ? -hourAngle + 180 : -hourAngle;
    pts.push([lon, lat]);
  }
  for (let lat = 90; lat >= -90; lat -= 2) {
    const tanDec = Math.tan((declination * Math.PI) / 180);
    const tanLat = Math.tan((lat * Math.PI) / 180);
    let lon =
      -hourAngle - (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
    if (isNaN(lon))
      lon = lat * declination > 0 ? -hourAngle - 180 : -hourAngle;
    pts.push([lon, lat]);
  }
  return pts;
}

export function D3Map({ points = [], onSelect }: D3MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const initialized = useRef(false);
  const mapGroupRef = useRef<unknown>(null);
  const projectionRef = useRef<unknown>(null);
  const zoomRef = useRef<unknown>(null);
  const d3Ref = useRef<typeof import("d3") | null>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    color: string;
    lines: string[];
  }>({ visible: false, x: 0, y: 0, title: "", color: "", lines: [] });

  const showTooltip = useCallback(
    (e: MouseEvent, title: string, color: string, lines: string[] = []) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 10,
        title,
        color,
        lines,
      });
    },
    []
  );

  const moveTooltip = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 10,
    }));
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  const showEnhancedTooltip = useCallback(
    async (
      e: MouseEvent,
      lat: number,
      lon: number,
      desc: string,
      color: string
    ) => {
      const localTime = getLocalTime(lon);
      const lines = [`\uD83D\uDD50 Local: ${localTime}`];
      showTooltip(e, desc, color, lines);

      const weather = await fetchWeather(lat, lon);
      if (weather) {
        setTooltip((prev) =>
          prev.visible
            ? {
                ...prev,
                lines: [
                  `\uD83D\uDD50 Local: ${localTime}`,
                  `${weather.condition} ${weather.temp}\u00B0F, ${weather.wind}mph`,
                ],
              }
            : prev
        );
      }
    },
    [showTooltip]
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initMap() {
      const d3 = await import("d3");
      const topojson = await import("topojson-client");
      d3Ref.current = d3;

      if (!svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

      const mapGroup = svg.append("g").attr("id", "mapGroup");
      mapGroupRef.current = mapGroup;

      const projection = d3
        .geoEquirectangular()
        .scale(155)
        .center([0, 20])
        .translate([WIDTH / 2, HEIGHT / 2 - 20]);
      projectionRef.current = projection;

      const path = d3.geoPath().projection(projection);

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .filter((event) => {
          if (event.type === "wheel") return false;
          if (event.type === "dblclick") return false;
          return true;
        })
        .on("zoom", (event) => {
          mapGroup.attr("transform", event.transform.toString());
        });
      zoomRef.current = zoom;

      svg.call(zoom);

      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        );
        const world = await response.json();
        const countries = topojson.feature(
          world,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          world.objects.countries as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;

        mapGroup
          .selectAll("path.country")
          .data(countries.features)
          .enter()
          .append("path")
          .attr("class", "country")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr("d", path as any)
          .attr("fill", "#0f3028")
          .attr("stroke", "#1a5040")
          .attr("stroke-width", 0.5)
          .style("transition", "fill 0.2s")
          .on("mouseenter", function () {
            d3.select(this).attr("fill", "#1a4a3a");
          })
          .on("mouseleave", function () {
            d3.select(this).attr("fill", "#0f3028");
          });

        const graticule = d3.geoGraticule().step([30, 30]);
        mapGroup
          .append("path")
          .datum(graticule)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr("d", path as any)
          .attr("fill", "none")
          .attr("stroke", "#1a3830")
          .attr("stroke-width", 0.3)
          .attr("stroke-dasharray", "2,2");

        OCEANS.forEach((o) => {
          const [x, y] = projection([o.lon, o.lat]) || [0, 0];
          if (x && y) {
            mapGroup
              .append("text")
              .attr("x", x)
              .attr("y", y)
              .attr("fill", "#1a4a40")
              .attr("font-size", "10px")
              .attr("font-family", "monospace")
              .attr("text-anchor", "middle")
              .attr("opacity", 0.6)
              .text(o.name);
          }
        });

        const terminatorPoints = calculateTerminator();
        mapGroup
          .append("path")
          .datum({
            type: "Polygon",
            coordinates: [terminatorPoints],
          } as GeoJSON.Polygon)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr("d", path as any)
          .attr("fill", "rgba(0,0,0,0.3)")
          .attr("stroke", "none");

        FIRE_ZONES.forEach((zone) => {
          mapGroup
            .append("path")
            .datum({
              type: "Polygon",
              coordinates: [zone.coords],
            } as GeoJSON.Polygon)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr("d", path as any)
            .attr("fill", zone.color)
            .attr("fill-opacity", 0.1)
            .attr("stroke", zone.color)
            .attr("stroke-width", 0.5)
            .attr("stroke-opacity", 0.3);
        });

        FIRE_PRONE_REGIONS.forEach((h) => {
          const [x, y] = projection([h.lon, h.lat]) || [0, 0];
          if (x && y) {
            const color =
              THREAT_COLORS[h.level as keyof typeof THREAT_COLORS];
            mapGroup
              .append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 6)
              .attr("fill", color)
              .attr("fill-opacity", 0.3)
              .style("animation", "pulse-ring 2s ease-in-out infinite");
            mapGroup
              .append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 3)
              .attr("fill", color);
            mapGroup
              .append("text")
              .attr("x", x + 8)
              .attr("y", y + 3)
              .attr("fill", color)
              .attr("font-size", "8px")
              .attr("font-family", "monospace")
              .text(h.name);
            mapGroup
              .append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 12)
              .attr("fill", "transparent")
              .style("cursor", "pointer")
              .on("mouseenter", (event: MouseEvent) =>
                showEnhancedTooltip(event, h.lat, h.lon, h.desc, color)
              )
              .on("mousemove", (event: MouseEvent) => moveTooltip(event))
              .on("mouseleave", () => hideTooltip());
          }
        });
      } catch (err) {
        console.error("Failed to load map data:", err);
      }
    }

    initMap();
  }, [showEnhancedTooltip, moveTooltip, hideTooltip]);

  useEffect(() => {
    if (
      !d3Ref.current ||
      !mapGroupRef.current ||
      !projectionRef.current
    )
      return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapGroup = mapGroupRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projection = projectionRef.current as any;

    mapGroup.selectAll(".dynamic-point").remove();

    points.forEach((p) => {
      const [x, y] = projection([p.lng, p.lat]) || [0, 0];
      if (x && y) {
        mapGroup
          .append("circle")
          .attr("class", "dynamic-point")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 4)
          .attr("fill", p.color)
          .attr("fill-opacity", 0.6);
        mapGroup
          .append("circle")
          .attr("class", "dynamic-point")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 2)
          .attr("fill", p.color);
        mapGroup
          .append("circle")
          .attr("class", "dynamic-point")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 10)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .on("mouseenter", (event: MouseEvent) =>
            showTooltip(event, p.label, p.color)
          )
          .on("mousemove", (event: MouseEvent) => moveTooltip(event))
          .on("mouseleave", () => hideTooltip())
          .on("click", () => onSelect?.(p.id));
      }
    });
  }, [points, onSelect, showTooltip, moveTooltip, hideTooltip]);

  const handleZoomIn = () => {
    if (!svgRef.current || !d3Ref.current || !zoomRef.current) return;
    const d3 = d3Ref.current;
    const svg = d3.select(svgRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svg.transition().duration(300).call((zoomRef.current as any).scaleBy, 1.5);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !d3Ref.current || !zoomRef.current) return;
    const d3 = d3Ref.current;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(300)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((zoomRef.current as any).scaleBy, 1 / 1.5);
  };

  const handleZoomReset = () => {
    if (!svgRef.current || !d3Ref.current || !zoomRef.current) return;
    const d3 = d3Ref.current;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(300)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((zoomRef.current as any).transform, d3.zoomIdentity);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2 / 1",
        background: "#0a0f0d",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            background: "rgba(10,10,10,0.95)",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "0.5rem",
            fontSize: "0.65rem",
            color: "#ddd",
            maxWidth: 250,
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          <div style={{ color: tooltip.color, fontWeight: 600 }}>
            {tooltip.title}
          </div>
          {tooltip.lines.map((line, i) => (
            <div key={i} style={{ opacity: 0.7 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          right: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {[
          { label: "+", fn: handleZoomIn },
          { label: "\u2212", fn: handleZoomOut },
          { label: "\u27F2", fn: handleZoomReset },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.fn}
            style={{
              width: "2.25rem",
              height: "2.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid #333",
              borderRadius: 4,
              color: "#aaa",
              fontSize: "1rem",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              Object.assign(e.currentTarget.style, {
                background: "rgba(40,40,40,0.9)",
                color: "#fff",
              })
            }
            onMouseLeave={(e) =>
              Object.assign(e.currentTarget.style, {
                background: "rgba(20,20,20,0.9)",
                color: "#aaa",
              })
            }
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          background: "rgba(10,10,10,0.8)",
          padding: "0.3rem 0.5rem",
          borderRadius: 4,
          fontSize: "0.55rem",
        }}
      >
        {(
          [
            ["critical", "Critical", "#ff0000"],
            ["high", "High", "#ff4444"],
            ["elevated", "Elevated", "#ffcc00"],
            ["low", "Low", "#00ff88"],
          ] as const
        ).map(([, label, color]) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "#888",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
              }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
