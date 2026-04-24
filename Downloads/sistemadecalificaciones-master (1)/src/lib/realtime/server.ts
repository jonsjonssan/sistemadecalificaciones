import { createServer } from "http"
import { WebSocketServer, WebSocket } from "ws"
import { randomUUID } from "crypto"
import type { RealtimeEvent, RealtimeUser, RealtimeActivity } from "./types"

interface ClientInfo {
  ws: WebSocket
  userId: string
  userName: string
  connectedAt: number
}

const REALTIME_PORT = parseInt(process.env.REALTIME_PORT || "3001")
const SECRET_TOKEN = process.env.REALTIME_SECRET || "realtime-secret-token"

const clients = new Map<string, ClientInfo>()

const httpServer = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/emit") {
    const token = req.headers["x-realtime-token"]
    if (token !== SECRET_TOKEN) {
      res.writeHead(401)
      res.end("Unauthorized")
      return
    }

    let body = ""
    req.on("data", (chunk) => { body += chunk })
    req.on("end", () => {
      try {
        const event: RealtimeEvent = JSON.parse(body)
        broadcast(event)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: true, clients: clients.size }))
      } catch {
        res.writeHead(400)
        res.end("Invalid JSON")
      }
    })
    return
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", clients: clients.size }))
    return
  }

  res.writeHead(404)
  res.end("Not Found")
})

const wss = new WebSocketServer({ server: httpServer, path: "/ws" })

wss.on("connection", (ws, req) => {
  const clientId = randomUUID()
  let authenticated = false

  const timeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, "Authentication timeout")
    }
  }, 10000)

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === "auth") {
        const { userId, userName, userRol } = msg.payload || {}
        if (!userId || !userName) {
          ws.close(4002, "Invalid auth payload")
          return
        }

        // Only admins can monitor
        const adminRoles = ["admin", "admin-directora", "admin-codirectora"]
        if (!adminRoles.includes(userRol)) {
          ws.close(4003, "Unauthorized role")
          return
        }

        authenticated = true
        clearTimeout(timeout)

        clients.set(clientId, {
          ws,
          userId,
          userName,
          connectedAt: Date.now(),
        })

        console.log(`[realtime] Admin connected: ${userName} (${clients.size} clients)`)

        // Broadcast updated users list
        broadcastUsersList()

        ws.send(JSON.stringify({
          type: "connected",
          payload: { clientId },
          timestamp: new Date().toISOString(),
        }))
      }
    } catch {
      // ignore malformed messages
    }
  })

  ws.on("close", () => {
    clearTimeout(timeout)
    if (clients.has(clientId)) {
      const client = clients.get(clientId)!
      console.log(`[realtime] Admin disconnected: ${client.userName} (${clients.size - 1} clients)`)
      clients.delete(clientId)
      broadcastUsersList()
    }
  })

  ws.on("error", (err) => {
    console.error(`[realtime] WebSocket error ${clientId}:`, err.message)
  })
})

function broadcastUsersList() {
  const users: RealtimeUser[] = []
  for (const [, client] of clients) {
    users.push({
      id: client.userId,
      nombre: client.userName,
      email: "",
      rol: "admin",
    })
  }

  broadcast({
    type: "users-list",
    payload: { monitors: users.length },
    timestamp: new Date().toISOString(),
  })
}

function broadcast(event: RealtimeEvent) {
  const data = JSON.stringify(event)
  for (const [, client] of clients) {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data)
      }
    } catch {
      // client may have disconnected
    }
  }
}

httpServer.listen(REALTIME_PORT, () => {
  console.log(`[realtime] WebSocket server listening on port ${REALTIME_PORT}`)
})

process.on("SIGTERM", () => {
  console.log("[realtime] Shutting down...")
  wss.close()
  httpServer.close()
})

process.on("SIGINT", () => {
  console.log("[realtime] Shutting down...")
  wss.close()
  httpServer.close()
})
