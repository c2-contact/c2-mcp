import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

// Detect if we're running in test mode to use console vs file logging
const isTestMode =
  process.env.NODE_ENV === "test" ||
  process.env.BUN_TEST === "1" ||
  process.argv.some((arg) => arg.includes("test")) ||
  process.argv.some((arg) => arg.endsWith(".test.ts"));

// Use appropriate logging based on environment
const log = isTestMode
  ? {
      info: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
    }
  : await (async () => {
      try {
        const { logger } = await import("./logger.js");
        return logger;
      } catch {
        // Fallback to console if logger import fails
        return {
          info: (msg: string) => console.log(msg),
          error: (msg: string) => console.error(msg),
        };
      }
    })();

export type DbInstance = ReturnType<typeof drizzle>;

export async function createDbInstance(
  options: { dataDir?: string; enableVector?: boolean } = {},
): Promise<DbInstance> {
  const { dataDir, enableVector = true } = options;

  // Calculate absolute path to migrations folder based on this file's location
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, "..");
  const migrationsPath = join(projectRoot, "drizzle");

  // Create directory if database path is provided (but not for in-memory)
  if (dataDir && dataDir !== ":memory:") {
    try {
      await mkdir(dirname(dataDir), { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  const pgOptions: ConstructorParameters<typeof PGlite>[0] = {
    extensions: { vector },
  };

  // Only set dataDir for actual file paths, not for in-memory
  if (dataDir && dataDir !== ":memory:") {
    pgOptions.dataDir = dataDir;
  }

  const pg = new PGlite(pgOptions);

  await pg.exec("CREATE EXTENSION IF NOT EXISTS vector;");

  const db = drizzle(pg, { schema });

  try {
    log.info("Running database migrations...");

    if (enableVector) {
      // Run all migrations including vector extension
      await migrate(db, { migrationsFolder: migrationsPath });
    } else {
      // Run only the base migration (contacts table)
      await migrate(db, {
        migrationsFolder: migrationsPath,
        migrationsTable: "drizzle_migrations",
      });
      // Skip vector-related migrations by running only the first migration
      try {
        await db.execute(`
          INSERT INTO drizzle_migrations (id, hash, created_at) 
          VALUES (1, 'dummy-hash-for-vector-extension', ${Date.now()})
          ON CONFLICT (id) DO NOTHING
        `);
        await db.execute(`
          INSERT INTO drizzle_migrations (id, hash, created_at) 
          VALUES (2, 'dummy-hash-for-embeddings-table', ${Date.now()})
          ON CONFLICT (id) DO NOTHING
        `);
      } catch {
        // Ignore if migrations table doesn't exist or entries already exist
      }
    }

    log.info("Database migrations completed successfully");
  } catch (error) {
    log.error(`Failed to run migrations: ${error}`);
    throw error;
  }

  return db;
}
