import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, Snowflake, Wind, Droplets } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}

const icons = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, snowy: Snowflake };

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWeather(); }, []);

  const fetchWeather = () => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => {
        setWeather({
          location: 'Current Location',
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 40) + 40,
          windSpeed: Math.floor(Math.random() * 20) + 5,
          icon: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)] as any,
        });
        setLoading(false);
      },
      () => {
        setWeather({ location: 'Default', temperature: 22, condition: 'Partly Cloudy', humidity: 65, windSpeed: 12, icon: 'cloudy' });
        setLoading(false);
      }
    );
  };

  if (loading || !weather) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <Sun className="h-6 w-6 text-muted-foreground/30 animate-pulse" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  const Icon = icons[weather.icon];

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          Weather
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
