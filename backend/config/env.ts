import dotenv from "dotenv";
dotenv.config();

import { envSchema } from "../schemas/env.schema.ts";

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment configuration error:");
    result.error.issues.forEach((issue) => {
      console.error(`  👉 [${issue.path.join(".")}]: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

const env = parseEnv();

export const isProduction = env.NODE_ENV === "production";

export default env;
