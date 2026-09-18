// Event Bus & Realtime SSE Broadcaster (BullMQ / Redis abstraction)
export type EventType =
  | "LEAD_INGESTED"
  | "LEAD_TRANSITION"
  | "CHARGING_ENQUEUED"
  | "TRANSACTION_PROCESSED"
  | "CUSTOMER_CREATED"
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "AUDIT_LOGGED"
  | "CHAT_MESSAGE_SENT";

export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: string;
  tenantId: string;
  actor: {
    id?: string;
    name: string;
    role: string;
  };
  payload: Record<string, unknown>;
}

// Global SSE clients registry for streaming updates
type SSEListener = (event: SystemEvent) => void;
const sseListeners = new Set<SSEListener>();

export function subscribeToEvents(listener: SSEListener): () => void {
  sseListeners.add(listener);
  return () => {
    sseListeners.delete(listener);
  };
}

export function broadcastEvent(event: Omit<SystemEvent, "id" | "timestamp">): SystemEvent {
  const fullEvent: SystemEvent = {
    ...event,
    id: "evt_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    timestamp: new Date().toISOString(),
  };

  // Dispatch to all connected SSE clients
  sseListeners.forEach((listener) => {
    try {
      listener(fullEvent);
    } catch (err) {
      console.error("SSE listener dispatch failed:", err);
    }
  });

  return fullEvent;
}
