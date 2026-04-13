"use client";

import dynamic from "next/dynamic";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
};

export function GlobeView({
  points,
  onSelect,
}: {
  points: GlobePoint[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="h-[520px] w-full overflow-hidden rounded-md border bg-black">
      <Globe
        width={1000}
        height={520}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundColor="rgba(0,0,0,0)"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(d) => (d as GlobePoint).size}
        pointColor="color"
        pointLabel={(d) => (d as GlobePoint).label}
        onPointClick={(d) => onSelect?.((d as GlobePoint).id)}
      />
    </div>
  );
}

