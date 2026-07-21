import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, Snowflake, Wind, Droplets, CloudDrizzle, CloudLightning, CloudFog, CloudSun } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: keyof typeof iconMap;
}

const iconMap = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  foggy: CloudFog,
  drizzle: CloudDrizzle,
  rainy: CloudRain,
  thunderstorm: CloudLightning,
  snowy: Snowflake,
};

// WMO Weather interpretation codes → display info
function interpretWMO(code: number): { condition: string; icon: keyof typeof iconMap } {
  if (code === 0) return { condition: "Clear sky", icon: "sunny" };
  if (code <= 3) return { condition: "Partly cloudy", icon: "partly-cloudy" };
  if (code <= 48) return { condition: "Fog", icon: "foggy" };
  if (code <= 55) return { condition: "Drizzle", icon: "drizzle" };
  if (code <= 57) return { condition: "Freezing drizzle", icon: "drizzle" };
  if (code <= 65) return { condition: "Rain", icon: "rainy" };
  if (code <= 67) return { condition: "Freezing rain", icon: "rainy" };
  if (code <= 77) return { condition: "Snow", icon: "snowy" };
  if (code <= 82) return { condition: "Rain showers", icon: "rainy" };
  if (code <= 86) return { condition: "Snow showers", icon: "snowy" };
  if (code <= 99) return { condition: "Thunderstorm", icon: "thunderstorm" };
  return { condition: "Cloudy", icon: "cloudy" };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return "Your location";
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Your location";
  } catch {
    return "Your location";
  }
}

async function getIPLocation(): Promise<{ latitude: number; longitude: number; city: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return { latitude: data.latitude, longitude: data.longitude, city: data.city || "Your location" };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWeather(latitude: number, longitude: number, locationName: string): Promise<WeatherData> {
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
  );
  if (!weatherRes.ok) throw new Error("Weather API failed");
  const data = await weatherRes.json();
  const current = data.current;
  const { condition, icon } = interpretWMO(current.weather_code);
  return {
    location: locationName,
    temperature: Math.round(current.temperature_2m),
    condition,
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
    icon,
  };
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let coords: { lat: number; lon: number; name: string } | null = null;

    async function resolveCoords() {
      if (coords) return coords;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) { reject(new Error("no geo")); return; }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, name };
        return coords;
      } catch {
        const ipLoc = await getIPLocation();
        if (!ipLoc) return null;
        coords = { lat: ipLoc.latitude, lon: ipLoc.longitude, name: ipLoc.city };
        return coords;
      }
    }

    async function refresh() {
      try {
        const c = await resolveCoords();
        if (!c) throw new Error("no location");
        const data = await fetchWeather(c.lat, c.lon, c.name);
        if (!cancelled) { setWeather(data); setError(null); setLoading(false); }
      } catch {
        if (!cancelled) { setError((prev) => prev ?? "Could not fetch weather"); setLoading(false); }
      }
    }

    refresh();
    const interval = setInterval(refresh, 10 * 60 * 1000); // every 10 min
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, []);


  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <Sun className="h-6 w-6 text-muted-foreground/30 animate-pulse" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center gap-1">
          <Cloud className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{error || "No weather data"}</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = iconMap[weather.icon];

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <span className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            Weather
          </span>
          <span className="text-[10px] normal-case tracking-normal font-normal">{weather.location}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center py-2">
          <Icon className="h-10 w-10 mx-auto mb-1.5 text-foreground" aria-hidden="true" />
          <p className="text-2xl font-bold text-foreground tabular-nums">{weather.temperature}°C</p>
          <p className="text-xs text-muted-foreground">{weather.condition}</p>
        </div>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><Droplets className="h-3 w-3" aria-hidden="true" />{weather.humidity}%</span>
          <span className="flex items-center gap-1"><Wind className="h-3 w-3" aria-hidden="true" />{weather.windSpeed} km/h</span>
        </div>
      </CardContent>
    </Card>
  );
}
