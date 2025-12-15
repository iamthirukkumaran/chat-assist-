// app/api/chat/route.ts
import { sendMessageToGemini } from '@/services/geminiService';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message, consent, city } = await req.json();
    if (!message) return new Response("No message", { status: 400 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        await sendMessageToGemini(message, (payload) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }, { consent, city });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}