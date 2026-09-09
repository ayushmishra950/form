import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { parse as parseCookie } from "cookie";
import env from "../config/env.ts";
import User, { accountBlockReason } from "../models/User.ts";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/tokens.ts";

/** Personal channel — everything addressed to one account. */
export const userRoom = (userId: string) => `user:${userId}`;

/** Shared channel every admin joins, for platform-wide events. */
export const ADMIN_ROOM = "admins";

let io: Server | null = null;

/**
 * Attaches a Socket.IO server to the existing HTTP server.
 *
 * The handshake is authenticated with the same httpOnly access-token cookie
 * the REST API uses — no token is ever handed to client-side JavaScript, so a
 * socket cannot be opened by anyone who is not already signed in.
 */
export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true, // lets the browser attach the auth cookies
    },
    path: "/socket.io/",
  });

  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers.cookie;
      if (!header) {
        next(new Error("unauthorized"));
        return;
      }

      const token = parseCookie(header)[ACCESS_COOKIE];
      if (!token) {
        next(new Error("unauthorized"));
        return;
      }

      const payload = verifyAccessToken(token);

      // Re-read the account so a deactivated or deleted user cannot keep a
      // live channel open on the strength of a still-valid token.
      const user = await User.findById(payload.sub).select("role isActive deletedAt");
      if (!user || accountBlockReason(user)) {
        next(new Error("unauthorized"));
        return;
      }

      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };

    void socket.join(userRoom(userId));
    if (role === "admin") void socket.join(ADMIN_ROOM);

    socket.emit("ready", { userId, role });
  });

  console.log("🔌 Socket.IO ready at /socket.io/");
  return io;
}

/** The live server, or null before startup / in scripts that never call init. */
export function getIO(): Server | null {
  return io;
}

/** Pushes an event to one account, across every tab they have open. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/** Pushes an event to every connected admin. */
export function emitToAdmins(event: string, payload: unknown): void {
  io?.to(ADMIN_ROOM).emit(event, payload);
}
