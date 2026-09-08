import mongoose from "mongoose";
import app from "./app.ts";
import env from "./config/env.ts";
import { connectDatabase } from "./config/db.ts";

async function start() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 API listening on http://localhost:${env.PORT}`);
    console.log(`   Allowed origins: ${env.CORS_ORIGINS.join(", ")}`);
  });

  /*
   * Without this the process stays alive after a failed bind: Mongo is
   * connected but nothing is serving HTTP, so the frontend silently talks to
   * whatever else already owns the port. Fail loudly instead.
   */
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${env.PORT} is already in use — this server did not start.`);
      console.error(`   Find the process:  lsof -nP -iTCP:${env.PORT} -sTCP:LISTEN`);
      console.error(`   Then stop it, or set a different PORT in backend-form/.env\n`);
    } else {
      console.error("❌ Server error:", error);
    }
    void mongoose.disconnect().finally(() => process.exit(1));
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`);
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
