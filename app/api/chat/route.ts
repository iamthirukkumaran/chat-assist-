// app/api/chat/route.ts
import { sendMessageToGemini } from '@/app/lib/geminiHelper';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) return new Response("No message", { status: 400 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        await sendMessageToGemini(message, (payload) => {
          // Send SSE formatted data
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        });
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