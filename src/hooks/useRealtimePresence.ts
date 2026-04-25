"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface OnlineUser {
  socketId: string;
  userId: string;
  nombre: string;
  email: string;
  rol: string;
  acciones: string[];
  ultimaAccion: { tipo: string; descripcion: string; timestamp: Date } | null;
  sessions: number;
}

export interface ActionEvent {
  user: OnlineUser;
  accion: string;
  descripcion: string;
  grado?: string;
  asignatura?: string;
  estudiante?: string;
  timestamp: string;
}

interface UseRealtimePresenceProps {
  userId: string;
  nombre: string;
  email: string;
  rol: string;
}

interface UseRealtimePresenceReturn {
  onlineUsers: OnlineUser[];
  isConnected: boolean;
  lastAction: ActionEvent | null;
  emitAction: (
    action: string,
    description: string,
    extra?: { grado?: string; asignatura?: string; estudiante?: string }
  ) => void;
}

export function useRealtimePresence({
  userId,
  nombre,
  email,
  rol,
}: UseRealtimePresenceProps): UseRealtimePresenceReturn {
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastAction, setLastAction] = useState<ActionEvent | null>(null);

  const emitAction = useCallback(
    (
      action: string,
      description: string,
      extra?: { grado?: string; asignatura?: string; estudiante?: string }
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("action", {
          accion: action,
          descripcion: description,
          ...extra,
        });
      }
    },
    []
  );

  useEffect(() => {
    const socket = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", { userId, nombre, email, rol });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("users-list", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on("user-joined", (user: OnlineUser) => {
      setOnlineUsers((prev) => {
        const idx = prev.findIndex((u) => u.userId === user.userId);
        if (idx >= 0) {
          // Actualizar sesiones si ya existe
          const next = [...prev];
          next[idx] = { ...user };
          return next;
        }
        return [...prev, user];
      });
    });

    socket.on("user-left", (user: OnlineUser) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    });

    socket.on("user-action", (event: ActionEvent) => {
      setLastAction(event);
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.userId === event.user.userId ? { ...event.user } : u
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, nombre, email, rol]);

  return { onlineUsers, isConnected, lastAction, emitAction };
}
