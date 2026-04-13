export interface FireRegion {
  name: string;
  lat: number;
  lon: number;
  level: "critical" | "high" | "elevated" | "low";
  desc: string;
}

export interface FireZone {
  name: string;
  coords: [number, number][];
  color: string;
}

export interface Ocean {
  name: string;
  lat: number;
  lon: number;
}

export const THREAT_COLORS = {
  critical: "#ff0000",
  high: "#ff4444",
  elevated: "#ffcc00",
  low: "#00ff88",
} as const;

export const FIRE_PRONE_REGIONS: FireRegion[] = [
  {
    name: "California",
    lat: 37.5,
    lon: -119.5,
    level: "high",
    desc: "California \u2014 Wildfire-prone, Santa Ana winds, drought conditions",
  },
  {
    name: "Amazon",
    lat: -3.5,
    lon: -60.0,
    level: "elevated",
    desc: "Amazon Basin \u2014 Deforestation fires, dry season burning",
  },
  {
    name: "Siberia",
    lat: 62.0,
    lon: 100.0,
    level: "elevated",
    desc: "Siberia \u2014 Boreal forest fires, permafrost thaw, record heat",
  },
  {
    name: "SE Australia",
    lat: -33.0,
    lon: 149.0,
    level: "high",
    desc: "SE Australia \u2014 Bushfire corridor, eucalyptus fuel load",
  },
  {
    name: "Mediterranean",
    lat: 38.0,
    lon: 23.0,
    level: "elevated",
    desc: "Mediterranean \u2014 Greece, Turkey fire belt, summer heatwaves",
  },
  {
    name: "Algeria",
    lat: 36.75,
    lon: 3.06,
    level: "high",
    desc: "Algeria \u2014 CT-RD dataset origin, Bejaia/Sidi Bel-abbes regions",
  },
  {
    name: "British Columbia",
    lat: 53.5,
    lon: -123.0,
    level: "elevated",
    desc: "British Columbia \u2014 Canadian wildfire corridor, pine beetle damage",
  },
  {
    name: "Central Africa",
    lat: -5.0,
    lon: 25.0,
    level: "low",
    desc: "Central Africa \u2014 Agricultural burning, savanna fires",
  },
  {
    name: "Indonesia",
    lat: -1.5,
    lon: 110.0,
    level: "elevated",
    desc: "Indonesia \u2014 Peat fires, slash-and-burn, haze events",
  },
  {
    name: "Portugal",
    lat: 39.5,
    lon: -8.0,
    level: "elevated",
    desc: "Portugal \u2014 European wildfire hotspot, eucalyptus plantations",
  },
  {
    name: "Cerrado",
    lat: -15.0,
    lon: -47.0,
    level: "low",
    desc: "Brazilian Cerrado \u2014 Savanna fires, dry season",
  },
  {
    name: "Chernobyl",
    lat: 51.4,
    lon: 30.1,
    level: "low",
    desc: "Chernobyl Zone \u2014 Radioactive wildfire risk, exclusion zone",
  },
];

export const FIRE_ZONES: FireZone[] = [
  {
    name: "US West",
    coords: [
      [-125, 49],
      [-110, 49],
      [-110, 32],
      [-125, 32],
      [-125, 49],
    ],
    color: "#ff4444",
  },
  {
    name: "Amazon Arc",
    coords: [
      [-65, 2],
      [-45, 2],
      [-45, -12],
      [-65, -12],
      [-65, 2],
    ],
    color: "#ff8844",
  },
  {
    name: "Mediterranean Belt",
    coords: [
      [-10, 44],
      [40, 44],
      [40, 34],
      [-10, 34],
      [-10, 44],
    ],
    color: "#ffaa00",
  },
  {
    name: "SE Australia",
    coords: [
      [140, -25],
      [155, -25],
      [155, -40],
      [140, -40],
      [140, -25],
    ],
    color: "#ff4444",
  },
  {
    name: "Siberian Taiga",
    coords: [
      [60, 70],
      [140, 70],
      [140, 55],
      [60, 55],
      [60, 70],
    ],
    color: "#ffaa00",
  },
  {
    name: "SE Asia",
    coords: [
      [95, 8],
      [120, 8],
      [120, -8],
      [95, -8],
      [95, 8],
    ],
    color: "#ff8844",
  },
];

export const OCEANS: Ocean[] = [
  { name: "ATLANTIC", lat: 25, lon: -40 },
  { name: "PACIFIC", lat: 0, lon: -150 },
  { name: "INDIAN", lat: -20, lon: 75 },
  { name: "ARCTIC", lat: 75, lon: 0 },
  { name: "SOUTHERN", lat: -60, lon: 0 },
];

export const WEATHER_CODES: Record<number, string> = {
  0: "\u2600\uFE0F Clear",
  1: "\uD83C\uDF24\uFE0F Mostly clear",
  2: "\u26C5 Partly cloudy",
  3: "\u2601\uFE0F Overcast",
  45: "\uD83C\uDF2B\uFE0F Fog",
  48: "\uD83C\uDF2B\uFE0F Fog",
  51: "\uD83C\uDF27\uFE0F Drizzle",
  53: "\uD83C\uDF27\uFE0F Drizzle",
  55: "\uD83C\uDF27\uFE0F Drizzle",
  61: "\uD83C\uDF27\uFE0F Rain",
  63: "\uD83C\uDF27\uFE0F Rain",
  65: "\uD83C\uDF27\uFE0F Heavy rain",
  71: "\uD83C\uDF28\uFE0F Snow",
  73: "\uD83C\uDF28\uFE0F Snow",
  75: "\uD83C\uDF28\uFE0F Heavy snow",
  80: "\uD83C\uDF27\uFE0F Showers",
  81: "\uD83C\uDF27\uFE0F Showers",
  82: "\u26C8\uFE0F Heavy showers",
  95: "\u26C8\uFE0F Thunderstorm",
  96: "\u26C8\uFE0F Thunderstorm",
  99: "\u26C8\uFE0F Thunderstorm",
};
