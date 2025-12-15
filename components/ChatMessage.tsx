// app/components/ChatMessage.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Message } from '../app/types/index';
import { Bot, User } from 'lucide-react';
import WeatherCard from './WeatherCard';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [isClient, setIsClient] = useState(false);
  const isUser = message.role === 'user';

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className="h-12 w-3/4 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  const formattedTime = () => {
    const date = message.timestamp instanceof Date
      ? message.timestamp
      : new Date(message.timestamp);
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[85%] md:max-w-[70%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        } items-end gap-2`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
            isUser
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-sky-500 border border-sky-100'
          }`}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-none'
                : 'bg-white text-gray-700 border border-sky-50 rounded-bl-none'
            }`}
          >
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>
            )}
          </div>

          {/* Embedded Weather Card if available */}
          {message.weatherData && <WeatherCard data={message.weatherData} />}

          {/* Timestamp */}
          <span className="text-[10px] text-gray-400 mt-1 px-1">
            {formattedTime()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;