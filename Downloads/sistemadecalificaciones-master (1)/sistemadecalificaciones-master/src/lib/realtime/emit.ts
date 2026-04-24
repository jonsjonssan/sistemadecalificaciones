import type { RealtimeEvent } from "./types"

const REALTIME_PORT = process.env.REALTIME_PORT || "3001"
const SECRET_TOKEN = process.env.REALTIME_SECRET || "realtime-secret-token"

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function emitRealtimeEvent(event: RealtimeEvent): Promise<void> {
  try {
    await fetch(`http://localhost:${REALTIME_PORT}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-realtime-token": SECRET_TOKEN,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    // WebSocket server might be down - don't block the API
  }
}

export function emitRealtimeEventAsync(event: RealtimeEvent): void {
  emitRealtimeEvent(event).catch(() => {})
}
