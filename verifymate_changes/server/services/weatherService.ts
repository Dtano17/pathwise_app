/**
 * Weather Service
 * 
 * Fetches weather data for plan locations using free weather APIs
 * Uses Open-Meteo (free, no API key required) as primary source
 */

interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
    unit: string;
  };
  conditions: string;
  precipitation: {
    probability: number;
    amount: number;
  };
  wind: {
    speed: number;
    direction: string;
  };
  alerts?: string[];
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}

// Weather condition codes from Open-Meteo
const WEATHER_CONDITIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Geocode a location name to coordinates using Open-Meteo geocoding
 */
async function geocodeLocation(locationName: string): Promise<LocationCoordinates | null> {
  try {
    const encodedLocation = encodeURIComponent(locationName);
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodedLocation}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      console.error('[WEATHER] Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log(`[WEATHER] No coordinates found for: ${locationName}`);
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    };
  } catch (error) {
    console.error('[WEATHER] Geocoding error:', error);
    return null;
  }
}

/**
 * Get weather forecast for a location using Open-Meteo (free, no API key)
 */
export async function getWeatherForecast(
  location: string,
  startDate: Date,
  endDate?: Date
): Promise<WeatherForecast[] | null> {
  try {
    // First, geocode the location
    const coords = await geocodeLocation(location);
    if (!coords) {
      return null;
    }

    // Format dates for API
    const start = startDate.toISOString().split('T')[0];
    const end = endDate ? endDate.toISOString().split('T')[0] : start;

    // Fetch forecast from Open-Meteo
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${coords.latitude}&longitude=${coords.longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_direction_10m_dominant` +
      `&start_date=${start}&end_date=${end}` +
      `&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
    );

    if (!response.ok) {
      console.error('[WEATHER] Forecast fetch failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.daily || !data.daily.time) {
      console.log('[WEATHER] No forecast data available');
      return null;
    }

    // Transform response to our format
    const forecasts: WeatherForecast[] = data.daily.time.map((date: string, i: number) => ({
      date,
      temperature: {
        min: Math.round(data.daily.temperature_2m_min[i]),
        max: Math.round(data.daily.temperature_2m_max[i]),
        unit: '°F',
      },
      conditions: WEATHER_CONDITIONS[data.daily.weather_code[i]] || 'Unknown',
      precipitation: {
        probability: data.daily.precipitation_probability_max[i] || 0,
        amount: data.daily.precipitation_sum[i] || 0,
      },
      wind: {
        speed: Math.round(data.daily.wind_speed_10m_max[i]),
        direction: getWindDirection(data.daily.wind_direction_10m_dominant[i]),
      },
    }));

    console.log(`[WEATHER] Retrieved ${forecasts.length} day forecast for ${coords.name}`);
    return forecasts;

  } catch (error) {
    console.error('[WEATHER] Error fetching forecast:', error);
    return null;
  }
}

/**
 * Convert wind direction degrees to compass direction
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Get a weather summary string for reminder enrichment
 */
export async function getWeatherSummary(location: string, date: Date): Promise<string | null> {
  try {
    const forecasts = await getWeatherForecast(location, date);
    
    if (!forecasts || forecasts.length === 0) {
      return null;
    }

    const forecast = forecasts[0];
    
    // Build a natural language summary
    let summary = `🌡️ Weather for ${location}: ${forecast.conditions}, `;
    summary += `${forecast.temperature.min}-${forecast.temperature.max}${forecast.temperature.unit}`;

    // Add precipitation warning if significant
    if (forecast.precipitation.probability > 30) {
      summary += `. 🌧️ ${forecast.precipitation.probability}% chance of precipitation`;
    }

    // Add wind warning if strong
    if (forecast.wind.speed > 20) {
      summary += `. 💨 Windy (${forecast.wind.speed} mph)`;
    }

    // Add packing suggestions
    const suggestions: string[] = [];
    
    if (forecast.conditions.toLowerCase().includes('rain') || forecast.precipitation.probability > 50) {
      suggestions.push('Pack an umbrella');
    }
    if (forecast.temperature.max < 50) {
      suggestions.push('Bring warm layers');
    }
    if (forecast.temperature.max > 85) {
      suggestions.push('Stay hydrated, wear sunscreen');
    }
    if (forecast.conditions.toLowerCase().includes('clear') || forecast.conditions.toLowerCase().includes('sunny')) {
      suggestions.push('Great weather for outdoor activities!');
    }

    if (suggestions.length > 0) {
      summary += `\n💡 ${suggestions.join('. ')}`;
    }

    return summary;

  } catch (error) {
    console.error('[WEATHER] Error getting summary:', error);
    return null;
  }
}

/**
 * Check for severe weather alerts
 */
export async function checkWeatherAlerts(
  location: string,
  startDate: Date,
  endDate?: Date
): Promise<string[] | null> {
  try {
    const forecasts = await getWeatherForecast(location, startDate, endDate);
    
    if (!forecasts) {
      return null;
    }

    const alerts: string[] = [];

    for (const forecast of forecasts) {
      // Check for severe conditions
      if (forecast.conditions.toLowerCase().includes('thunderstorm')) {
        alerts.push(`⚠️ ${forecast.date}: Thunderstorms expected`);
      }
      if (forecast.conditions.toLowerCase().includes('heavy')) {
        alerts.push(`⚠️ ${forecast.date}: Heavy precipitation expected`);
      }
      if (forecast.temperature.max > 100) {
        alerts.push(`🔥 ${forecast.date}: Extreme heat (${forecast.temperature.max}°F)`);
      }
      if (forecast.temperature.min < 20) {
        alerts.push(`❄️ ${forecast.date}: Very cold (${forecast.temperature.min}°F)`);
      }
      if (forecast.wind.speed > 40) {
        alerts.push(`💨 ${forecast.date}: High winds (${forecast.wind.speed} mph)`);
      }
    }

    return alerts.length > 0 ? alerts : null;

  } catch (error) {
    console.error('[WEATHER] Error checking alerts:', error);
    return null;
  }
}
