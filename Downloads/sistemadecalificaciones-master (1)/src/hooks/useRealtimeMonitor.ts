"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { RealtimeEvent } from "@/lib/realtime/types"

interface MonitorData {
  usuariosConectados: Array<{
    id: string
    usuarioId: string
    ip: string
    loginAt: string
    usuario: { nombre: string; email: string; rol: string }
  }>
  actividadReciente: Array<{
    id: string
    tipo: string
    accion: string
    entidad: string
    detalles: Record<string, unknown> | null
    fecha: string
    usuario: { nombre: string; email: string; rol: string }
  }>
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 10) }

function getWsUrl(): string {
  if (typeof window === "undefined") return ""
  const isProduction = window.location.protocol === "https:"
  const protocol = isProduction ? "wss:" : "ws:"
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

export function useRealtimeMonitor(userId: string | undefined, userName: string | undefined, userRol: string | undefined, isAdmin: boolean) {
  const [usuariosConectados, setUsuariosConectados] = useState<MonitorData["usuariosConectados"]>([])
  const [actividadReciente, setActividadReciente] = useState<MonitorData["actividadReciente"]>([])
  const [connected, setConnected] = useState(false)
  const [monitoreoLoading, setMonitoreoLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  const connect = useCallback(() => {
    if (!isAdmin || !userId || !userName) return

    const wsUrl = getWsUrl()
    if (!wsUrl) return

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[realtime] WebSocket connected")
        retryCountRef.current = 0
        setMonitoreoLoading(false)

        ws.send(JSON.stringify({
          type: "auth",
          payload: { userId, userName, userRol },
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === "connected") {
            setConnected(true)
            return
          }

          if (msg.type === "user-connected") {
            const user = msg.payload
            setUsuariosConectados((prev) => {
              const exists = prev.some((u) => u.usuarioId === user.id)
              if (exists) return prev
              return [...prev, {
                id: uid(),
                usuarioId: user.id,
                ip: "",
                loginAt: new Date().toISOString(),
                usuario: { nombre: user.nombre, email: user.email, rol: user.rol },
              }]
            })
            return
          }

          if (msg.type === "user-disconnected") {
            const user = msg.payload
            setUsuariosConectados((prev) => prev.filter((u) => u.usuarioId !== user.id))
            return
          }

          if (msg.type === "activity") {
            const activity = msg.payload
            setActividadReciente((prev) => {
              const newList = [activity, ...prev]
              return newList.slice(0, 50)
            })
            return
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        console.log("[realtime] WebSocket disconnected")
        setConnected(false)
        wsRef.current = null

        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
        retryCountRef.current++
        reconnectTimeoutRef.current = setTimeout(connect, retryDelay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      setMonitoreoLoading(false)
    }
  }, [isAdmin, userId, userName, userRol])

  const loadInitialData = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios-conectados", { cache: "no-store", credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUsuariosConectados(data.usuariosConectados || [])
        setActividadReciente(data.actividadReciente || [])
      }
    } catch {
      // ignore
    }
    setMonitoreoLoading(false)
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setMonitoreoLoading(false)
      return
    }

    loadInitialData()

    const timer = setTimeout(() => {
      connect()
    }, 1000)

    return () => {
      clearTimeout(timer)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [isAdmin, connect, loadInitialData])

  return {
    usuariosConectados,
    actividadReciente,
    monitoreoLoading,
    connected,
  }
}
