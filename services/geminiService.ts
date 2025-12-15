// app/lib/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getWeather } from "../services/weatherService";
import { WeatherData } from "../app/types/index";

/* ========================================================= */
/*  Gemini Init                                              */
/* ========================================================= */

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `
You are Petty, a friendly and conversational weather assistant 🌤️.

Weather behavior:
- When the user asks about weather like e.g., “What’s the weather in Paris?”, “weather in Chennai”, “Tell me the forecast for New York”

  - Ask for permission exactly once to fetch live weather data.
  
  - The permission question must offer only two options: "Yes" or "No".
  - Use the most recently mentioned city from the conversation.
  - Never ask follow-up questions like “Which city?”

After permission:
- If the user replies "Yes":
  - Immediately fetch and provide real-time weather data for the last mentioned city using the weather tool.
  - Do not ask the permission question again.

- If the user replies "No":
  - Provide a general or descriptive weather-related explanation without using real or live data.
  - Do not ask the permission question again.

General rules:
- Never repeat the permission question once it has been answered.
- For non-weather-related questions, respond normally in a concise, friendly, and helpful manner.
- Keep responses natural, polite, and conversational.

`
});

/* ========================================================= */
/*  Types                                                    */
/* ========================================================= */

export type StreamCallback = (payload: {
  type: "text" | "weather_data" | "done" | "permission";
  text?: string;
  data?: WeatherData;
  // when permission type, city is provided here
  city?: string;
}) => void;

/* ========================================================= */
/*  Character streaming helper                               */
/* ========================================================= */

const streamChars = async (
  text: string,
  onStream: StreamCallback,
  delay = 15
) => {
  for (const char of text) {
    onStream({ type: "text", text: char });
    await new Promise((r) => setTimeout(r, delay));
  }
};

/* ========================================================= */
/*  Main Gemini Service                                      */
/* ========================================================= */

export const sendMessageToGemini = async (
  message: string,
  onStream: StreamCallback,
  options: { consent?: boolean; city?: string } = {}
) => {
  try {
    /* ----------------------------------------------------- */
    /*  Detect weather intent                                */
    /* ----------------------------------------------------- */

    const isWeatherQuery =
      /weather|temperature|rain|sunny|cloud|forecast|humid|wind/i.test(
        message
      );

    const match =
      message.match(/weather in ([a-zA-Z\s]+)/i) ||
      message.match(/in ([a-zA-Z\s]+)/i) ||
      message.match(/for ([a-zA-Z\s]+)/i);

    let city = match?.[1]?.trim() || options.city;

    // effectiveCity is the city we'll operate on (match from message or passed in options)
    const effectiveCity = city;

    if (isWeatherQuery && !city && message.split(" ").length <= 3) {
      city = message.replace(
        /weather|temperature|forecast|for|in/gi,
        ""
      ).trim();
    }

    /* ----------------------------------------------------- */
    /*  Weather flow                                         */
    /* ----------------------------------------------------- */

    // Handle flows where consent is provided (Yes/No) even if the message itself isn't a weather query
    if ((isWeatherQuery && effectiveCity) || options.consent !== undefined) {
      // If consent was not provided yet, ask for permission
      if (options.consent === undefined) {
        if (effectiveCity) {
          onStream({ type: "permission", text: `Shall I fetch the latest weather data for ${effectiveCity}?`, city: effectiveCity });
        } else {
          // No city known — ask model to request the city
          await streamChars("🌤️ Please tell me the city you want the weather for.", onStream);
        }
        onStream({ type: "done" });
        return;
      }

      // If user denied consent
      if (options.consent === false) {
        const c = effectiveCity || options.city;
        await streamChars(
          `As you selected No, I did not fetch live weather data${c ? ` for ${c}` : ''}. Here is a general description:`,
          onStream,
          12
        );

        const prompt = `Provide a friendly, general explanation of typical weather for ${c || 'that city'} without using live data.`;
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await streamChars(text, onStream, 12);
          }
        }

        onStream({ type: "done" });
        return;
      }

      // options.consent === true -> fetch and send weather
      const c = effectiveCity || options.city;
      if (!c) {
        // No city available even after consent — ask user
        await streamChars("I'm sorry, I seem to have forgotten the city we were discussing. Could you please remind me which city you'd like the weather for? My apologies!", onStream, 12);
        onStream({ type: "done" });
        return;
      }

      await streamChars(`🔍 Fetching latest weather for ${c}...\n\n`, onStream);

      const weatherData = await getWeather(c);

      if (!weatherData) {
        await streamChars(
          "❌ Sorry, I couldn't find weather data for that city.",
          onStream
        );
        onStream({ type: "done" });
        return;
      }

      onStream({ type: "weather_data", data: weatherData });

      const prompt = `
Summarize this weather in a friendly way:

City: ${weatherData.location.name}
Temperature: ${weatherData.current.temp_c}°C
Condition: ${weatherData.current.condition.text}
Humidity: ${weatherData.current.humidity}%
Wind: ${weatherData.current.wind_kph} km/h
Feels Like: ${weatherData.current.feelslike_c}°C
`;

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          await streamChars(text, onStream, 12);
        }
      }

      onStream({ type: "done" });
      return;
    }

    /* ----------------------------------------------------- */
    /*  General conversation                                 */
    /* ----------------------------------------------------- */

    const result = await model.generateContentStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        await streamChars(text, onStream, 12);
      }
    }

    onStream({ type: "done" });
  } catch (error) {
    console.error("Gemini error:", error);
    await streamChars(
      "\n⚠️ Something went wrong. Please try again.",
      onStream
    );
    onStream({ type: "done" });
  }
};
