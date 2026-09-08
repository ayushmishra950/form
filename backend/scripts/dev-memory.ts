/**
 * Starts the API against a throwaway in-memory MongoDB.
 *
 * Useful for local development and end-to-end checks when no mongod or Atlas
 * cluster is available. Data is discarded when the process exits.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri("main-form");
console.log(`🧪 In-memory MongoDB at ${process.env.MONGODB_URI}`);

await import("../server.ts");

process.on("SIGINT", async () => {
  await mongo.stop();
  process.exit(0);
});
