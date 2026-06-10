import { createServer } from 'http'
import { Server } from 'socket.io'
import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET

function verifySession(cookieValue: string): any {
  if (!SESSION_SECRET) {
    console.error('[Presencia] SESSION_SECRET no configurado')
    return null
  }
  
  const dotIndex = cookieValue.indexOf('.')
  if (dotIndex === -1) return null

  const payload = cookieValue.substring(0, dotIndex)
  const providedSignature = cookieValue.substring(dotIndex + 1)

  const expectedSignature = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))
  ) {
    return null
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: process.env.NEXTAUTH_URL?.replace(/:\d+$/, '') || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface OnlineUser {
  socketId: string
  userId: string
  nombre: string
  email: string
  rol: string
  acciones: string[]
  ultimaAccion: { tipo: string; descripcion: string; timestamp: Date } | null
  sessions: number
}

const onlineUsers = new Map<string, OnlineUser>()
const userSessions = new Map<string, Set<string>>()

function getUniqueUsers(): OnlineUser[] {
  const byUserId = new Map<string, OnlineUser>()
  for (const user of onlineUsers.values()) {
    const existing = byUserId.get(user.userId)
    if (!existing) {
      const sessions = userSessions.get(user.userId)?.size ?? 1
      byUserId.set(user.userId, { ...user, sessions })
    }
  }
  return Array.from(byUserId.values())
}

io.on('connection', (socket) => {
  console.log(`[Presencia] Socket conectado: ${socket.id}`)

  socket.on('join', (data: { userId: string; nombre: string; email: string; rol: string; sessionToken?: string }) => {
    // Verificar sesion si se proporciona el token
    if (data.sessionToken) {
      const sessionData = verifySession(data.sessionToken)
      if (!sessionData || sessionData.id !== data.userId) {
        console.warn(`[Presencia] Sesión inválida para usuario ${data.userId}`)
        socket.emit('auth-error', { message: 'Sesión inválida' })
        socket.disconnect()
        return
      }
    }

    const wasAlreadyOnline = userSessions.has(data.userId) && (userSessions.get(data.userId)?.size ?? 0) > 0

    const user: OnlineUser = {
      socketId: socket.id,
      userId: data.userId,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      acciones: ['Conectado'],
      ultimaAccion: null,
      sessions: 1,
    }
    onlineUsers.set(socket.id, user)

    // Trackear sesiones del usuario
    if (!userSessions.has(data.userId)) {
      userSessions.set(data.userId, new Set())
    }
    userSessions.get(data.userId)!.add(socket.id)

    const totalSockets = onlineUsers.size
    const totalUsers = userSessions.size
    console.log(`[Presencia] ${user.nombre} (${user.rol}) sesion=${userSessions.get(data.userId)!.size} — ${totalUsers} usuarios / ${totalSockets} sockets`)

    // Solo notificar a otros si es la primera sesion de este usuario
    if (!wasAlreadyOnline) {
      socket.broadcast.emit('user-joined', { ...user, sessions: userSessions.get(data.userId)!.size })
    }

    // Enviar lista deduplicada al nuevo socket
    socket.emit('users-list', getUniqueUsers())
  })

  socket.on('action', (data: {
    accion: string
    descripcion: string
    grado?: string
    asignatura?: string
    estudiante?: string
  }) => {
    const user = onlineUsers.get(socket.id)
    if (user) {
      user.acciones = [data.accion]
      user.ultimaAccion = {
        tipo: data.accion,
        descripcion: data.descripcion,
        timestamp: new Date()
      }
      const sessions = userSessions.get(user.userId)?.size ?? 1
      const event = {
        user: { ...user, sessions },
        accion: data.accion,
        descripcion: data.descripcion,
        grado: data.grado,
        asignatura: data.asignatura,
        estudiante: data.estudiante,
        timestamp: new Date().toISOString()
      }
      socket.broadcast.emit('user-action', event)
      console.log(`[Presencia] ${user.nombre}: ${data.accion} — ${data.descripcion}`)
    }
  })

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)
    if (user) {
      onlineUsers.delete(socket.id)

      const sessions = userSessions.get(user.userId)
      if (sessions) {
        sessions.delete(socket.id)
        if (sessions.size === 0) {
          userSessions.delete(user.userId)
          // Era la ultima sesion: notificar a todos que se fue
          io.emit('user-left', { ...user, sessions: 0 })
          console.log(`[Presencia] ${user.nombre} salio (ultima sesion) — ${userSessions.size} usuarios / ${onlineUsers.size} sockets`)
        } else {
          console.log(`[Presencia] ${user.nombre} cerro una pestaña (${sessions.size} restantes) — ${userSessions.size} usuarios / ${onlineUsers.size} sockets`)
        }
      }
    } else {
      console.log(`[Presencia] Socket desconectado: ${socket.id}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`[Presencia] Error socket (${socket.id}):`, error)
  })
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[Presencia] Servidor de presencia corriendo en puerto ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[Presencia] Recibido SIGTERM, cerrando...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[Presencia] Recibido SIGINT, cerrando...')
  httpServer.close(() => process.exit(0))
})
