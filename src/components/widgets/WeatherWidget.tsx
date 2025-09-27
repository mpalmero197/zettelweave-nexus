import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, Snowflake, Wind, Thermometer, Droplets } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      // Get user's location
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // For demo purposes, using mock data
            // In a real app, you'd use a weather API like OpenWeatherMap
            const mockWeather: WeatherData = {
              location: 'Current Location',
              temperature: Math.floor(Math.random() * 30) + 10, // Random temp between 10-40°C
              condition: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
              humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
              windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
              icon: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)] as any,
            };

            setWeather(mockWeather);
            setError(null);
          } catch (err) {
            setError('Failed to fetch weather data');
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Location access denied, use default location
          const mockWeather: WeatherData = {
            location: 'Default Location',
            temperature: 22,
            condition: 'Partly Cloudy',
            humidity: 65,
            windSpeed: 12,
            icon: 'cloudy',
          };
          setWeather(mockWeather);
          setLoading(false);
        }
      );
    } catch (err) {
      setError('Weather unavailable');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <Sun className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading weather...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <Cloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{error || 'Weather unavailable'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const WeatherIcon = weatherIcons[weather.icon];

  return (
    <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <WeatherIcon className="h-4 w-4" />
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {/* Main weather display */}
          <div className="text-center">
            <WeatherIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{weather.temperature}°C</div>
            <div className="text-xs text-muted-foreground">{weather.condition}</div>
            <div className="text-xs text-muted-foreground">{weather.location}</div>
          </div>

          {/* Weather details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-500" />
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3 text-gray-500" />
              <span>{weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}