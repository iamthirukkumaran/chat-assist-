"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CloudSun, MapPin } from "lucide-react";
import { Message, WeatherData } from "../app/types/index";
import ChatMessage from "./ChatMessage";

/* -----------------------------------------
   Helper: stream text character by character
------------------------------------------ */
const streamText = async (
  text: string,
  onUpdate: (partial: string, done: boolean) => void,
  delay = 18
) => {
  let current = "";
  for (const char of text) {
    current += char;
    onUpdate(current, false);
    await new Promise((r) => setTimeout(r, delay));
  }
  onUpdate(current, true);
};

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* -----------------------------------------
     Streamed welcome message (CLIENT ONLY)
  ------------------------------------------ */
  useEffect(() => {
    setIsClient(true);

    const welcomeId = "welcome";

    // Empty placeholder message
    setMessages([
      {
        id: welcomeId,
        role: "model",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    const welcomeText =
      "Hello! I'm SkyCast, your friendly weather assistant. 🌤️\n" +
      "Ask me about the weather anywhere in the world, or just chat with me about anything!";

    streamText(welcomeText, (partial, done) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === welcomeId
            ? { ...m, content: partial, isStreaming: !done }
            : m
        )
      );
    });
  }, []);

  /* -----------------------------------------
     Auto-scroll
  ------------------------------------------ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* -----------------------------------------
     Send Message
  ------------------------------------------ */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        role: "model",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let textAcc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data:")) continue;

          const payload = JSON.parse(chunk.replace("data:", "").trim());

          if (payload.type === "text") {
            textAcc += payload.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: textAcc } : m
              )
            );
          }

          if (payload.type === "weather_data") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId
                  ? { ...m, weatherData: payload.data }
                  : m
              )
            );
          }

          if (payload.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, isStreaming: false } : m
              )
            );
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: "⚠️ Sorry, something went wrong.",
                isStreaming: false,
              }
            : m
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickCities = [
    "Chennai",
    "Mumbai",
    "Delhi",
    "London",
    "Tokyo",
    "New York",
    "Paris",
    "Dubai",
  ];

  /* -----------------------------------------
     SSR Safety
  ------------------------------------------ */
  if (!isClient) {
    return (
      <div className="h-[700px] w-full rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col h-[700px] w-full bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <CloudSun className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SkyCast Weather AI</h1>
            <p className="text-blue-100">AI powered weather assistant</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 overflow-x-auto">
          {quickCities.map((city) => (
            <button
              key={city}
              onClick={() => setInput(`Weather in ${city}`)}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm"
              suppressHydrationWarning
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-6">
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about weather or chat..."
            className="w-full pl-12 pr-24 py-4 rounded-xl border bg-gray-50"
            disabled={isLoading}
            suppressHydrationWarning
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-300"
            suppressHydrationWarning
          >
            {isLoading ? "..." : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
