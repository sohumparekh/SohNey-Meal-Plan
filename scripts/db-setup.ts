// Run: DATABASE_URL=... npx tsx scripts/db-setup.ts
import { setupDatabase } from "../src/lib/db/setup";
import { sql } from "../src/lib/db/client";

setupDatabase()
  .then((r) => console.log("database ready", r))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => sql().end());
