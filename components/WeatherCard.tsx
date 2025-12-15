// app/components/WeatherCard.tsx
import React from 'react';
import { WeatherData } from '../app/types/index';
import { Wind, Droplets, MapPin, Thermometer, Clock } from 'lucide-react';

interface WeatherCardProps {
  data: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  return (
    <div className="mt-3 mb-1 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-sky-100 max-w-xs animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sky-900">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="font-semibold text-sm truncate max-w-[150px]">
            {data.location.name}, {data.location.country}
          </span>
        </div>
        <span className="text-xs text-sky-500 font-mono flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {new Date(data.location.localtime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-4xl font-bold text-sky-800">
            {Math.round(data.current.temp_c)}°C
          </span>
          <span className="text-sm text-sky-600 capitalize">
            {data.current.condition.text}
          </span>
        </div>
        <div className="relative w-16 h-16">
          {/* <img
            src={`https:${data.current.condition.icon}`}
            alt={data.current.condition.text}
            className="w-full h-full object-contain filter drop-shadow-md transform scale-125"
          /> */}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-sky-100">
        <div className="flex flex-col items-center p-2 bg-sky-50 rounded-lg">
          <Wind className="w-4 h-4 text-sky-500 mb-1" />
          <span className="text-xs font-medium text-sky-700">
            {data.current.wind_kph} <span className="text-[10px]">km/h</span>
          </span>
        </div>
        <div className="flex flex-col items-center p-2 bg-sky-50 rounded-lg">
          <Droplets className="w-4 h-4 text-blue-500 mb-1" />
          <span className="text-xs font-medium text-sky-700">
            {data.current.humidity}%
          </span>
        </div>
        <div className="flex flex-col items-center p-2 bg-sky-50 rounded-lg">
          <Thermometer className="w-4 h-4 text-orange-400 mb-1" />
          <span className="text-xs font-medium text-sky-700">
            {Math.round(data.current.feelslike_c)}°
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;