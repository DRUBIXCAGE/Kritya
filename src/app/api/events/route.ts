import { NextRequest } from "next/server";
import { subscribeToEvents, SystemEvent } from "@/lib/event-bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      const initPacket = `data: ${JSON.stringify({ type: "CONNECTED", message: "SSE Real-time pipeline connected" })}\n\n`;
      controller.enqueue(encoder.encode(initPacket));

      // Subscribe to internal event bus
      const unsubscribe = subscribeToEvents((event: SystemEvent) => {
        try {
          const packet = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(packet));
        } catch {
          unsubscribe();
        }
      });

      // Keepalive heartbeat every 20 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
