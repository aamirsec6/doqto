/**
 * DOQTO hospital clinical intercom realtime server.
 * Run: npm run dev:realtime
 * Default: http://localhost:3001
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, ".data");
const DATA_FILE = join(DATA_DIR, "hospital-messages.json");
const PORT = Number(process.env.PORT || process.env.REALTIME_PORT || 3001);

/** @type {{ messages: any[], presence: Record<string, any> }} */
let state = { messages: [], presence: {} };

function load() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(DATA_FILE)) {
      state = JSON.parse(readFileSync(DATA_FILE, "utf8"));
      if (!state.messages) state.messages = [];
      if (!state.presence) state.presence = {};
    }
  } catch (e) {
    console.warn("[realtime] load failed", e);
  }
}

function save() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn("[realtime] save failed", e);
  }
}

load();

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "doqto-realtime",
      messages: state.messages.length,
      online: Object.values(state.presence).filter((p) => p.online).length,
    }),
  );
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  socket.join("hospital");
  socket.emit("messages:sync", state.messages.slice(0, 200));
  socket.emit("presence:sync", state.presence);

  socket.on("presence:join", (payload) => {
    if (!payload?.staffId) return;
    state.presence[payload.staffId] = {
      ...payload,
      online: true,
      at: new Date().toISOString(),
    };
    save();
    io.to("hospital").emit("presence:update", state.presence[payload.staffId]);
    socket.join(`staff:${payload.staffId}`);
    if (payload.roleCategory) socket.join(`role:${payload.roleCategory}`);
  });

  socket.on("presence:update", (payload) => {
    if (!payload?.staffId) return;
    state.presence[payload.staffId] = {
      ...state.presence[payload.staffId],
      ...payload,
      at: new Date().toISOString(),
    };
    save();
    io.to("hospital").emit("presence:update", state.presence[payload.staffId]);
  });

  socket.on("message:send", (msg) => {
    if (!msg?.id) return;
    state.messages = [msg, ...state.messages.filter((m) => m.id !== msg.id)].slice(
      0,
      500,
    );
    save();
    io.to("hospital").emit("message:new", msg);
    if (msg.targetStaffId) {
      io.to(`staff:${msg.targetStaffId}`).emit("page:staff", {
        staffId: msg.targetStaffId,
        message: msg,
      });
    }
    if (msg.incidentId) {
      io.to(`incident:${msg.incidentId}`).emit("message:new", msg);
    }
  });

  socket.on("message:batch", (batch) => {
    if (!Array.isArray(batch)) return;
    const ids = new Set(batch.map((m) => m.id));
    state.messages = [
      ...batch,
      ...state.messages.filter((m) => !ids.has(m.id)),
    ].slice(0, 500);
    save();
    io.to("hospital").emit("message:batch", batch);
  });

  socket.on("incident:raised", (payload) => {
    io.to("hospital").emit("incident:raised", payload);
    const incident = payload?.incident;
    if (incident?.id) {
      socket.join(`incident:${incident.id}`);
      io.to("hospital").emit("incident:raised", payload);
    }
  });

  socket.on("incident:ack", (payload) => {
    io.to("hospital").emit("incident:ack", payload);
  });

  socket.on("page:staff", (payload) => {
    if (payload?.staffId) {
      io.to(`staff:${payload.staffId}`).emit("page:staff", payload);
    }
    io.to("hospital").emit("page:staff", payload);
  });

  socket.on("disconnect", () => {
    // leave presence soft-offline after disconnect
  });
});

httpServer.listen(PORT, () => {
  console.log(`[doqto-realtime] listening on http://localhost:${PORT}`);
});
