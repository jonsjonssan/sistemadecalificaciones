"use client";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_LOG_LEVEL === "debug")
    ? "debug"
    : "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function createEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

function sendToServer(entry: LogEntry): void {
  if (typeof navigator === "undefined" || entry.level !== "error") return;
  const payload = JSON.stringify(entry);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/logs", payload);
  }
}

const logFn = (level: LogLevel) =>
  (message: string, data?: Record<string, unknown>): void => {
    if (!shouldLog(level)) return;
    const entry = createEntry(level, message, data);
    const fn = level === "error" ? console.error
      : level === "warn" ? console.warn
      : level === "debug" ? console.debug
      : console.log;
    fn(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, data ?? "");
    if (level === "error" || level === "warn") {
      sendToServer(entry);
    }
  };

export const clientLogger = {
  debug: logFn("debug"),
  info: logFn("info"),
  warn: logFn("warn"),
  error: logFn("error"),
};

export function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const elapsed = performance.now() - start;
    if (elapsed > 1000) {
      clientLogger.warn(`Slow operation: ${label}`, { ms: Math.round(elapsed) });
    } else {
      clientLogger.debug(`Operation: ${label}`, { ms: Math.round(elapsed) });
    }
  });
}
