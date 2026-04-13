import { getCached, setCached } from "@/lib/cache/store";

type WeatherSummary = {
  temperature: number;
  humidity: number;
  wind: number;
  precipitationProbability: number;
};

export async function fetchWeatherSummary(
  latitude: number,
  longitude: number,
  forecastDays: number,
): Promise<WeatherSummary> {
  const cacheKey = `weather:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${forecastDays}`;
  const cached = getCached<WeatherSummary>(cacheKey);
  if (cached) return cached;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("forecast_days", String(Math.max(1, Math.min(16, forecastDays))));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability",
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch weather summary.");
  }
  const payload = await response.json();
  const hourly = payload.hourly ?? {};
  const count = Math.min(24, (hourly.temperature_2m ?? []).length || 1);
  const aggregate = (arr: number[]) =>
    arr.slice(0, count).reduce((sum, val) => sum + Number(val), 0) / count;

  const summary: WeatherSummary = {
    temperature: Number(
      payload.current?.temperature_2m ?? aggregate(hourly.temperature_2m ?? [20]),
    ),
    humidity: Number(
      payload.current?.relative_humidity_2m ?? aggregate(hourly.relative_humidity_2m ?? [50]),
    ),
    wind: Number(payload.current?.wind_speed_10m ?? aggregate(hourly.wind_speed_10m ?? [10])),
    precipitationProbability: Number(aggregate(hourly.precipitation_probability ?? [20])),
  };

  return setCached(cacheKey, summary, 15 * 60 * 1000);
}

