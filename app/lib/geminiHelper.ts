// app/lib/geminiHelper.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getWeather } from "../../services/weatherService";
import { WeatherData } from '../types/index';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `
You are Petty, a friendly assistant that can talk about weather and general things.
Rules:
-before answering weather questions, always ask the user shall i fetch the latest weather data for them give the two option only yes or no if they say yes fetch the data and provide it in your answer if they say no just reply normally without weather data.
- If user asks about weather, provide it using real data.
- Otherwise, reply naturally and helpfully.
- Be concise and friendly 🌤️
- before answering weather questions, always ask the user shall i fetch the latest weather data for them give the two option only yes or no if they say yes fetch the data and provide it in your answer if they say no just reply normally without weather data
 give the answer to no option accordingly.
`,
});

export type StreamCallback = (payload: { 
  type: 'text' | 'weather_data' | 'done'; 
  text?: string; 
  data?: WeatherData 
}) => void;

const streamChars = async (text: string, onStream: StreamCallback, delay = 15) => {
  for (const char of text) {
    onStream({ type: 'text', text: char });
    await new Promise((r) => setTimeout(r, delay));
  }
};

export const sendMessageToGemini = async (message: string, onStream: StreamCallback) => {
  try {
    // Check if message is about weather
    const isWeatherQuery = /weather|temperature|rain|sunny|cloud|forecast|humid|wind/i.test(message);
    const match = message.match(/weather in ([a-zA-Z\s]+)/i) || 
                  message.match(/in ([a-zA-Z\s]+)/i) ||
                  message.match(/for ([a-zA-Z\s]+)/i);
    
    let city = match?.[1]?.trim();
    console.log('Incoming message:', message, 'isWeatherQuery:', isWeatherQuery, 'extractedCity:', city);
    
    // If no city extracted but it's a weather query, use the whole message as city
    if (isWeatherQuery && !city && message.split(' ').length <= 3) {
      city = message.replace(/weather|temperature|forecast|for|in/gi, '').trim();
    }

    if (city && isWeatherQuery) {
      await streamChars(`🔍 Checking weather for ${city}...\n\n`, onStream);

      const weatherData = await getWeather(city);
      if (!weatherData) {
        await streamChars("❌ Sorry, I couldn't find weather data for that city.", onStream);
      } else {
        // Send weather data as a separate event
        onStream({ type: 'weather_data', data: weatherData });

        // Generate summary with the weather data
        const prompt = `Based on this weather data, provide a friendly summary:
        City: ${weatherData.location.name}
        Temperature: ${weatherData.current.temp_c}°C
        Condition: ${weatherData.current.condition.text}
        Humidity: ${weatherData.current.humidity}%
        Wind Speed: ${weatherData.current.wind_kph} km/h
        Feels Like: ${weatherData.current.feelslike_c}°C
        
        Please provide a concise, friendly weather summary.`;
        
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await streamChars(text, onStream, 12);
          }
        }
      }
    } else {
      // General conversation
      const result = await model.generateContentStream(message);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          await streamChars(text, onStream, 12);
        }
      }
    }

    onStream({ type: 'done' });
  } catch (err) {
    console.error("Gemini error:", err);
    await streamChars("\n⚠️ Something went wrong. Please try again.", onStream);
    onStream({ type: 'done' });
  }
};