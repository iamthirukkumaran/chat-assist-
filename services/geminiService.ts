import { GoogleGenerativeAI } from "@google/generative-ai";
import { getWeather } from "./weatherService";

/* ========================================================= */
/*  Gemini Init                                              */
/* ========================================================= */

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  systemInstruction: `
You are Petty, a weather-only assistant.

Rules:
- before answering weather questions, always ask the user shall i fetch the latest weather data for them give the two option only yes or no if they say yes fetch the data and provide it in your answer if they say no just reply normally without weather data
 give the answer to no option accordingly.
-introduce yourself as Petty
- Answer only weather-related questions
- Ask for city if missing
- Be friendly and concise 🌤️
- Provide data in structured format for the app to render
- weathercard: include all relevant weather data
- send the fetched weather data to the WeatherCard component
- display weather in the card only, not in the text response
`,
});

/* ========================================================= */
/*  Types                                                    */
/* ========================================================= */

export type StreamCallback = (text: string, done: boolean) => void;
export type WeatherCallback = (data: any) => void;

/* ========================================================= */
/*  🔥 Character streaming helper                            */
/* ========================================================= */

const streamChars = async (
  text: string,
  onStream: StreamCallback,
  delay = 15
) => {
  for (const char of text) {
    onStream(char, false);
    await new Promise((r) => setTimeout(r, delay));
  }
};

/* ========================================================= */
/*  Main streaming function                                  */
/* ========================================================= */

export const sendMessageToGemini = async (
  message: string,
  onStream: StreamCallback,
  onWeatherData?: WeatherCallback
) => {
  try {
    /* ----------------------------------------------------- */
    /*  Extract city                                        */
    /* ----------------------------------------------------- */

    const match =
      message.match(/weather in ([a-zA-Z\s]+)/i) ||
      message.match(/in ([a-zA-Z\s]+)/i);

    const city = match?.[1]?.trim();

    if (!city) {
      await streamChars(
        "🌤️ Please tell me the city you want the weather for.",
        onStream
      );
      onStream("", true);
      return;
    }

    await streamChars(`🔍 Checking weather for ${city}...\n\n`, onStream);

    /* ----------------------------------------------------- */
    /*  Fetch weather                                       */
    /* ----------------------------------------------------- */

    const weatherData = await getWeather(city);

    if (!weatherData) {
      await streamChars(
        "❌ Sorry, I couldn't find weather data for that city.",
        onStream
      );
      onStream("", true);
      return;
    }

    onWeatherData?.(weatherData);

    /* ----------------------------------------------------- */
    /*  Generate AI response                                 */
    /* ----------------------------------------------------- */

    const prompt = `
Summarize the weather in a friendly way.

City: ${weatherData.location.name}
Temperature: ${weatherData.current.temp_c}°C
Condition: ${weatherData.current.condition.text}
Humidity: ${weatherData.current.humidity}%
Wind: ${weatherData.current.wind_kph} km/h
`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        await streamChars(text, onStream, 12);
      }
    }

    onStream("", true);
  } catch (error) {
    console.error("Gemini error:", error);
    onStream("\n⚠️ Something went wrong. Try again.", true);
  }
};
