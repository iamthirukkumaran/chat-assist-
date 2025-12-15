// app/services/weatherService.ts
import { WeatherData } from '../app/types/index';

const API_KEY = process.env.WEATHERAPI_KEY || process.env.OPENWEATHER_API_KEY;
const USE_WEATHERAPI = process.env.WEATHERAPI_KEY ? true : false;

export const getWeather = async (city: string): Promise<WeatherData | null> => {
  try {
    let data;
    
    if (USE_WEATHERAPI && process.env.WEATHERAPI_KEY) {
      // Using WeatherAPI
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_KEY}&q=${encodeURIComponent(city)}&aqi=no`
      );
      
      if (!res.ok) return null;
      const apiData = await res.json();
      
      data = {
        location: {
          name: apiData.location.name,
          region: apiData.location.region,
          country: apiData.location.country,
          localtime: apiData.location.localtime,
        },
        current: {
          temp_c: apiData.current.temp_c,
          temp_f: apiData.current.temp_f,
          condition: {
            text: apiData.current.condition.text,
            icon: apiData.current.condition.icon,
          },
          wind_kph: apiData.current.wind_kph,
          humidity: apiData.current.humidity,
          feelslike_c: apiData.current.feelslike_c,
          uv: apiData.current.uv,
        },
      };
    } else if (process.env.OPENWEATHER_API_KEY) {
      // Using OpenWeatherMap
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!res.ok) return null;
      const apiData = await res.json();
      
      // Calculate local time based on timezone offset
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const cityTime = new Date(utcMs + apiData.timezone * 1000);
      const localtime = cityTime.toISOString().slice(0, 16).replace('T', ' ');
      
      data = {
        location: {
          name: apiData.name,
          region: apiData.sys.country,
          country: apiData.sys.country,
          localtime,
        },
        current: {
          temp_c: Math.round(apiData.main.temp),
          temp_f: Math.round(apiData.main.temp * 9 / 5 + 32),
          condition: {
            text: apiData.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${apiData.weather[0].icon}@2x.png`,
          },
          wind_kph: Math.round(apiData.wind.speed * 3.6),
          humidity: apiData.main.humidity,
          feelslike_c: Math.round(apiData.main.feels_like),
          uv: 0,
        },
      };
    } else {
      console.error('No weather API key configured');
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch weather:', err);
    return null;
  }
};