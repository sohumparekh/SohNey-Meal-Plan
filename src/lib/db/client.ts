import postgres from "postgres";

// One connection pool per server instance. On Vercel use Supabase's transaction pooler
// URL (port 6543); prepared statements must be off for it.
const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

export function sql() {
  if (!globalForDb.__sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__sql = postgres(url, {
      prepare: false,
      onnotice: () => {},
      max: 3,
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
      // keep DATE columns as "YYYY-MM-DD" strings (no timezone conversion)
      types: {
        date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
      },
    });
  }
  return globalForDb.__sql;
}
