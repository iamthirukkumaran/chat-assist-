// app/page.tsx
"use client";

import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">SkyCast AI</h1>
          <p className="text-gray-600">Your intelligent weather assistant</p>
        </div>
        <ChatInterface />
      </div>
    </main>
  );
}