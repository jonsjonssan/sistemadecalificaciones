import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
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
}

const onlineUsers = new Map<string, OnlineUser>()

io.on('connection', (socket) => {
  console.log(`[Presencia] Usuario conectado: ${socket.id}`)

  socket.on('join', (data: { userId: string; nombre: string; email: string; rol: string }) => {
    const user: OnlineUser = {
      socketId: socket.id,
      userId: data.userId,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      acciones: ['Conectado'],
      ultimaAccion: null,
    }
    onlineUsers.set(socket.id, user)
    console.log(`[Presencia] ${user.nombre} (${user.rol}) se unio — ${onlineUsers.size} en linea`)

    socket.broadcast.emit('user-joined', user)
    socket.emit('users-list', Array.from(onlineUsers.values()))
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
      const event = {
        user,
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
      io.emit('user-left', user)
      console.log(`[Presencia] ${user.nombre} salio — ${onlineUsers.size} en linea`)
    } else {
      console.log(`[Presencia] Usuario desconectado: ${socket.id}`)
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
