import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@db/schema";
import dotenv from "dotenv";

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in .env.local file");
}

async function initializeDatabase() {
  // Use dynamic import to load the pg module
  const pgModule = await import("pg");
  const { Pool } = pgModule.default;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

export const db = await (async () => {
  return await initializeDatabase();
})();
