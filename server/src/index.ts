
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../client/dist");
const app = express();
const http = createServer(app);
const port = Number(process.env.PORT || 3001);

const io = new Server(http, {
  cors: { origin: process.env.CLIENT_ORIGIN || "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static(clientDist));

type Song = {
  id: string;
  title: string;
  thumbnail: string;
  duration?: number;
  addedBy: string;
};

type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  canControl: boolean;
  voiceJoined: boolean;
  muted: boolean;
};

type Chat = {
  id: string;
  userId: string;
  name: string;
  text: string;
  ts: number;
  reactions: Record<string, string[]>;
};

type Room = {
  code: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  hostId: string;
  participants: Map<string, Participant>;
  queue: Song[];
  current: Song | null;
  isPlaying: boolean;
  position: number;
  updatedAt: number;
  chat: Chat[];
};

const rooms = new Map<string, Room>();
const limits = new Map<string, { at: number; count: number }>();

const roomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  userName: z.string().trim().min(1).max(32),
  password: z.string().max(100).optional()
});

const joinSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9]{6}$/),
  userName: z.string().trim().min(1).max(32),
  password: z.string().max(100).optional()
});

const textSchema = z.string().trim().min(1).max(500);

const songSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().trim().min(1).max(160),
  thumbnail: z.string().url().max(500),
  duration: z.number().int().min(0).max(86400).optional(),
  addedBy: z.string().trim().min(1).max(32)
});

function rateLimit(id: string, max = 30) {
  const now = Date.now();
  const current = limits.get(id);
  if (!current || now - current.at > 60000) {
    limits.set(id, { at: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

function makeCode() {
  let code = "";
  do {
    code = crypto.randomBytes(4).toString("base64url").slice(0, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function currentPosition(room: Room) {
  if (!room.current || !room.isPlaying) return Math.max(0, room.position);
  return Math.max(0, room.position + (Date.now() - room.updatedAt) / 1000);
}

function publicState(room: Room) {
  return {
    code: room.code,
    name: room.name,
    hasPassword: Boolean(room.passwordHash),
    hostId: room.hostId,
    participants: [...room.participants.values()],
    queue: room.queue,
    current: room.current,
    isPlaying: room.isPlaying,
    position: currentPosition(room),
    updatedAt: room.updatedAt
  };
}

function emitState(room: Room) {
  io.to(room.code).emit("room:state", publicState(room));
}

function systemMessage(room: Room, text: string) {
  io.to(room.code).emit("chat:message", {
    id: crypto.randomUUID(),
    userId: "system",
    name: "SyncBeat",
    text,
    ts: Date.now(),
    reactions: {}
  });
}

function setPlayback(room: Room, playing: boolean, position?: number) {
  const nextPosition = Number.isFinite(position) ? Math.max(0, Number(position)) : currentPosition(room);
  room.position = nextPosition;
  room.isPlaying = playing;
  room.updatedAt = Date.now();
}

app.get("/health", (_, res) => res.json({ ok: true, rooms: rooms.size }));

app.get("/config", (_, res) =>
  res.json({
    stunUrls: (process.env.STUN_URLS ||
      "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  })
);

io.on("connection", (socket) => {
  socket.on("keepalive", () => {});

  socket.on("room:create", (raw: unknown, ack: (value: unknown) => void) => {
    if (!rateLimit(socket.id, 10)) return ack({ error: "Too many requests. Try again shortly." });
    if (socket.data.roomCode) return ack({ error: "You are already in a room." });

    const parsed = roomSchema.safeParse(raw);
    if (!parsed.success) return ack({ error: "Invalid room details." });

    const code = makeCode();
    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;

    if (parsed.data.password) {
      passwordSalt = crypto.randomBytes(16).toString("hex");
      passwordHash = hashPassword(parsed.data.password, passwordSalt);
    }

    const room: Room = {
      code,
      name: parsed.data.name,
      passwordHash,
      passwordSalt,
      hostId: socket.id,
      participants: new Map([
        [
          socket.id,
          {
            id: socket.id,
            name: parsed.data.userName,
            isHost: true,
            canControl: true,
            voiceJoined: false,
            muted: false
          }
        ]
      ]),
      queue: [],
      current: null,
      isPlaying: false,
      position: 0,
      updatedAt: Date.now(),
      chat: []
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.name = parsed.data.userName;

    ack({ state: publicState(room) });
  });

  socket.on("room:join", (raw: unknown, ack: (value: unknown) => void) => {
    if (!rateLimit(socket.id, 10)) return ack({ error: "Too many requests. Try again shortly." });
    if (socket.data.roomCode) return ack({ error: "You are already in a room." });

    const parsed = joinSchema.safeParse(raw);
    if (!parsed.success) return ack({ error: "Invalid room code or name." });

    const room = rooms.get(parsed.data.code);
    if (!room) return ack({ error: "Room not found. Check the code." });

    if (room.passwordHash) {
      const provided = parsed.data.password || "";
      const calculated = hashPassword(provided, room.passwordSalt || "");
      if (calculated !== room.passwordHash) return ack({ error: "Incorrect room password." });
    }

    room.participants.set(socket.id, {
      id: socket.id,
      name: parsed.data.userName,
      isHost: false,
      canControl: false,
      voiceJoined: false,
      muted: false
    });

    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.name = parsed.data.userName;

    ack({ state: publicState(room), chat: room.chat.slice(-100) });
    systemMessage(room, parsed.data.userName + " joined the room");
    emitState(room);
  });

  const getRoom = () => {
    const code = socket.data.roomCode as string | undefined;
    return code ? rooms.get(code) : undefined;
  };

  const canControl = (room: Room) => room.participants.get(socket.id)?.canControl === true;

  socket.on("sync:request", () => {
    const room = getRoom();
    if (room) socket.emit("room:state", publicState(room));
  });

  socket.on("player:action", (action: unknown) => {
    const room = getRoom();
    if (!room || !canControl(room) || !rateLimit(socket.id, 120)) return;

    const value = (action ?? {}) as Record<string, unknown>;
    const type = typeof value.type === "string" ? value.type : "";

    if (type === "play") {
      setPlayback(room, true, typeof value.position === "number" ? value.position : undefined);
    } else if (type === "pause") {
      setPlayback(room, false, typeof value.position === "number" ? value.position : undefined);
    } else if (type === "seek" && typeof value.position === "number" && Number.isFinite(value.position)) {
      setPlayback(room, room.isPlaying, value.position);
    } else if (type === "load") {
      const songResult = songSchema.safeParse(value.song);
      if (!songResult.success) return;
      room.current = songResult.data;
      room.position = 0;
      room.isPlaying = false;
      room.updatedAt = Date.now();

      if (value.removeFromQueue === true && Number.isInteger(value.index)) {
        const index = Number(value.index);
        if (index >= 0 && index < room.queue.length && room.queue[index]?.id === songResult.data.id) {
          room.queue.splice(index, 1);
        }
      }

      systemMessage(room, "Now playing: " + songResult.data.title);
    } else if (type === "ended" || type === "next") {
      if (room.queue.length > 0) {
        room.current = room.queue.shift() || null;
        room.position = 0;
        room.isPlaying = true;
        room.updatedAt = Date.now();
        systemMessage(room, "Now playing: " + (room.current?.title || "next track"));
      } else {
        room.position = 0;
        room.isPlaying = false;
        room.updatedAt = Date.now();
      }
    } else {
      return;
    }

    emitState(room);
  });

  socket.on("queue:add", (raw: unknown) => {
    const room = getRoom();
    if (!room || !rateLimit(socket.id, 40)) return;
    const parsed = songSchema.safeParse(raw);
    if (!parsed.success) return;
    room.queue.push(parsed.data);
    emitState(room);
  });

  socket.on("queue:remove", (index: unknown) => {
    const room = getRoom();
    if (!room || !canControl(room) || !rateLimit(socket.id, 40) || !Number.isInteger(index)) return;
    const i = Number(index);
    if (i < 0 || i >= room.queue.length) return;
    room.queue.splice(i, 1);
    emitState(room);
  });

  socket.on("queue:reorder", (raw: unknown) => {
    const room = getRoom();
    if (!room || !canControl(room) || !rateLimit(socket.id, 40)) return;
    const data = raw as { from?: unknown; to?: unknown };
    if (!Number.isInteger(data?.from) || !Number.isInteger(data?.to)) return;
    const from = Number(data.from);
    const to = Number(data.to);
    if (from < 0 || to < 0 || from >= room.queue.length || to >= room.queue.length) return;

    const [item] = room.queue.splice(from, 1);
    if (item) room.queue.splice(to, 0, item);
    emitState(room);
  });

  socket.on("chat:send", (raw: unknown) => {
    const room = getRoom();
    if (!room || !rateLimit(socket.id, 20)) return;

    const parsed = textSchema.safeParse(raw);
    if (!parsed.success) return;

    const cleaned = parsed.data.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;

    const participant = room.participants.get(socket.id);
    const message: Chat = {
      id: crypto.randomUUID(),
      userId: socket.id,
      name: participant?.name || socket.data.name || "Guest",
      text: cleaned.slice(0, 500),
      ts: Date.now(),
      reactions: {}
    };

    room.chat.push(message);
    room.chat = room.chat.slice(-200);
    io.to(room.code).emit("chat:message", message);
  });

  socket.on("chat:typing", (typing: unknown) => {
    const room = getRoom();
    if (!room) return;
    socket.to(room.code).emit("chat:typing", {
      userId: socket.id,
      name: socket.data.name || "Someone",
      typing: typing === true
    });
  });

  socket.on("chat:react", (raw: unknown) => {
    const room = getRoom();
    if (!room || !rateLimit(socket.id, 40)) return;

    const data = raw as { id?: unknown; emoji?: unknown };
    const message = room.chat.find((item) => item.id === data?.id);
    const emoji = typeof data?.emoji === "string" ? data.emoji.slice(0, 8) : "";
    if (!message || !emoji) return;

    message.reactions[emoji] ||= [];
    const list = message.reactions[emoji];
    const existing = list.indexOf(socket.id);

    if (existing >= 0) list.splice(existing, 1);
    else if (list.length < 100) list.push(socket.id);

    io.to(room.code).emit("chat:reaction", { id: message.id, reactions: message.reactions });
  });

  socket.on("participant:set-control", (raw: unknown) => {
    const room = getRoom();
    if (!room || room.hostId !== socket.id || !rateLimit(socket.id, 30)) return;

    const targetId = typeof raw === "string" ? raw : "";
    const target = room.participants.get(targetId);
    if (!target || target.id === room.hostId) return;

    target.canControl = !target.canControl;
    systemMessage(room, target.name + (target.canControl ? " can now control playback" : " can no longer control playback"));
    emitState(room);
  });

  socket.on("host:transfer", (raw: unknown) => {
    const room = getRoom();
    if (!room || room.hostId !== socket.id || !rateLimit(socket.id, 20)) return;

    const targetId = typeof raw === "string" ? raw : "";
    const target = room.participants.get(targetId);
    if (!target) return;

    room.hostId = targetId;
    for (const participant of room.participants.values()) {
      participant.isHost = participant.id === targetId;
      participant.canControl = participant.id === targetId;
    }

    systemMessage(room, target.name + " is now the host");
    emitState(room);
  });

  socket.on("participant:kick", (raw: unknown) => {
    const room = getRoom();
    if (!room || room.hostId !== socket.id || !rateLimit(socket.id, 20)) return;

    const targetId = typeof raw === "string" ? raw : "";
    if (!targetId || targetId === socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetId);
    const target = room.participants.get(targetId);
    if (!target) return;

    targetSocket?.emit("room:kicked");
    targetSocket?.leave(room.code);
    if (targetSocket) targetSocket.data.roomCode = undefined;

    room.participants.delete(targetId);
    systemMessage(room, target.name + " was removed by the host");
    emitState(room);
  });

  socket.on("voice:join", () => {
    const room = getRoom();
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || participant.voiceJoined) return;

    const peerIds = [...room.participants.values()]
      .filter((item) => item.voiceJoined && item.id !== socket.id)
      .map((item) => item.id);

    participant.voiceJoined = true;
    emitState(room);
    socket.emit("voice:peers", { peerIds });
    socket.to(room.code).emit("voice:peer-joined", { peerId: socket.id });
  });

  socket.on("voice:leave", () => {
    const room = getRoom();
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) participant.voiceJoined = false;
    socket.to(room.code).emit("voice:peer-left", { peerId: socket.id });
    emitState(room);
  });

  socket.on("voice:signal", (raw: unknown) => {
    const room = getRoom();
    if (!room) return;

    const data = raw as { peerId?: unknown; data?: unknown };
    const peerId = typeof data?.peerId === "string" ? data.peerId : "";
    if (!peerId || peerId === socket.id || !room.participants.has(peerId)) return;

    io.to(peerId).emit("voice:signal", {
      peerId: socket.id,
      data: data.data
    });
  });

  socket.on("voice:mute", (muted: unknown) => {
    const room = getRoom();
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    participant.muted = muted === true;
    systemMessage(room, participant.name + (participant.muted ? " muted voice" : " unmuted voice"));
    emitState(room);
  });

  socket.on("disconnect", () => {
    const room = getRoom();
    limits.delete(socket.id);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    const leavingName = participant?.name || socket.data.name || "Someone";
    socket.to(room.code).emit("voice:peer-left", { peerId: socket.id });
    room.participants.delete(socket.id);

    if (room.hostId === socket.id) {
      const nextHost = room.participants.values().next().value as Participant | undefined;
      if (nextHost) {
        room.hostId = nextHost.id;
        for (const item of room.participants.values()) {
          item.isHost = item.id === nextHost.id;
          item.canControl = item.id === nextHost.id;
        }
        systemMessage(room, nextHost.name + " is now the host");
      } else {
        rooms.delete(room.code);
        return;
      }
    }

    systemMessage(room, leavingName + " left the room");
    emitState(room);
  });
});

app.get("*", (req, res) => {
  if (req.path === "/health" || req.path === "/config") return res.end();
  res.sendFile(path.join(clientDist, "index.html"));
});

http.listen(port, "0.0.0.0", () => {
  console.log("SyncBeat listening on " + port);
});
