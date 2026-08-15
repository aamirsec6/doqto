/**
 * Thin realtime bridge: Socket.IO when available, no-op otherwise.
 * Local persistence always happens via messages.ts / store.ts.
 */

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();
let socket: {
  connected: boolean;
  emit: (event: string, payload: unknown) => void;
  on: (event: string, fn: (payload: unknown) => void) => void;
  off: (event: string, fn: (payload: unknown) => void) => void;
  disconnect: () => void;
} | null = null;
let connecting = false;

export function getRealtimeUrl() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_REALTIME_URL) {
    return process.env.NEXT_PUBLIC_REALTIME_URL;
  }
  return "http://localhost:3001";
}

export function isRealtimeConnected() {
  return Boolean(socket?.connected);
}

export function onRealtime(event: string, handler: Handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => handlers.get(event)?.delete(handler);
}

function fanIn(event: string, payload: unknown) {
  handlers.get(event)?.forEach((h) => {
    try {
      h(payload);
    } catch {
      /* ignore */
    }
  });
}

export function emitRealtime(event: string, payload: unknown) {
  // Always fan locally for same-tab listeners
  fanIn(event, payload);
  if (socket?.connected) {
    socket.emit(event, payload);
  }
}

export async function connectRealtime(presence?: {
  staffId: string;
  name: string;
  role: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (socket?.connected) {
    if (presence) socket.emit("presence:update", { ...presence, online: true });
    return true;
  }
  if (connecting) return false;
  connecting = true;

  try {
    const { io } = await import("socket.io-client");
    const url = getRealtimeUrl();
    const s = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 5,
      timeout: 4000,
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 4000);
      s.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
      s.on("connect_error", () => {
        clearTimeout(t);
        reject(new Error("connect_error"));
      });
    });

    socket = s as typeof socket;
    const relay = [
      "message:new",
      "message:batch",
      "presence:update",
      "presence:sync",
      "incident:raised",
      "incident:ack",
      "page:staff",
      "messages:sync",
    ];
    for (const ev of relay) {
      s.on(ev, (payload: unknown) => fanIn(ev, payload));
    }

    if (presence) {
      s.emit("presence:join", { ...presence, online: true });
    }
    connecting = false;
    return true;
  } catch {
    connecting = false;
    socket = null;
    return false;
  }
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function sendRealtimeMessage(payload: unknown) {
  emitRealtime("message:send", payload);
}
