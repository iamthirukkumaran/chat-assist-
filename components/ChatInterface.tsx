// app/components/ChatInterface.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CloudSun, MapPin } from "lucide-react";
import { Message, WeatherData } from "../app/types/index";
import ChatMessage from "./ChatMessage";

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Add welcome message only on client
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: "Hello! I'm SkyCast, your friendly weather assistant. 🌤️\nAsk me about the weather anywhere in the world, or just chat with me about anything!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    const aiMessagePlaceholder: Message = {
      id: aiMessageId,
      role: "model",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiMessagePlaceholder]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulatedText = "";
      let weatherDataBuffer: WeatherData | undefined = undefined;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          
          try {
            const match = line.match(/^data:\s*(.+)$/);
            if (match) {
              const data = JSON.parse(match[1]);
              
              if (data.type === 'text' && data.text) {
                accumulatedText += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId
                      ? { ...m, content: accumulatedText }
                      : m
                  )
                );
              }
              else if (data.type === 'weather_data' && data.data) {
                weatherDataBuffer = data.data;
                console.log('Received weather_data:', weatherDataBuffer);
                setMessages((prev) => {
                  const next = prev.map((m) =>
                    m.id === aiMessageId
                      ? { ...m, weatherData: weatherDataBuffer }
                      : m
                  );
                  console.log('Messages after attaching weather:', next);
                  return next;
                });
              }
              else if (data.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId 
                      ? { ...m, isStreaming: false } 
                      : m
                  )
                );
                setIsLoading(false);
              }
            }
          } catch (err) {
            console.warn("Failed to parse SSE line:", line, err);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: "⚠️ Sorry, I encountered an error. Please try again.",
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

  const quickCities = ["Chennai", "Mumbai", "Delhi", "London", "Tokyo", "New York", "Paris", "Dubai"];

  // Show loading skeleton while not on client
  if (!isClient) {
    return (
      <div className="flex flex-col h-[700px] w-full bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl overflow-hidden animate-pulse">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-32 p-6"></div>
        <div className="flex-1 p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[700px] w-full bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <CloudSun className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SkyCast Weather AI</h1>
            <p className="text-blue-100">Real-time weather insights powered by AI</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Live</span>
          </div>
        </div>

        {/* Quick Actions - Only render on client */}
        <div className="flex gap-3 mt-6 overflow-x-auto pb-2">
          {quickCities.map((city) => (
            <button
              key={city}
              onClick={() => setInput(`Weather in ${city}`)}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap"
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
      <div className="border-t border-gray-100 bg-white p-6">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            <MapPin className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about weather in any city or chat with me..."
            className="w-full pl-12 pr-24 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 text-gray-800 text-base"
            disabled={isLoading}
            suppressHydrationWarning
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              input.trim() && !isLoading
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            suppressHydrationWarning
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Checking...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Ask</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;