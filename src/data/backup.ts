// Backup, restore and phone-to-phone transfer, all as one small JSON file.
// "Newest wins": every file carries the time the data was last changed.
import { DATA_TABLES, db, getMeta, setMeta } from "./db";

export const APP_ID = "ghar-ka-menu";
export const FILE_VERSION = 1;

export interface HouseholdFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  updatedAt: string;
  tables: Record<string, unknown[]>;
}

export async function exportAll(): Promise<HouseholdFile> {
  const tables: Record<string, unknown[]> = {};
  await db.transaction("r", DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) tables[t] = await db.table(t).toArray();
  });
  // device-local bookkeeping does not travel
  tables.meta = (tables.meta as { key: string }[]).filter((m) => !["lastBackupAt", "lastExportAt", "lastImportAt"].includes(m.key));
  return {
    app: APP_ID,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    updatedAt: await getMeta<string>("updatedAt", new Date(0).toISOString()),
    tables,
  };
}

export function parseHouseholdFile(text: string): HouseholdFile {
  let f: HouseholdFile;
  try {
    f = JSON.parse(text);
  } catch {
    throw new Error("This is not a Ghar ka Menu file.");
  }
  if (f?.app !== APP_ID || typeof f.updatedAt !== "string" || typeof f.tables !== "object") throw new Error("This is not a Ghar ka Menu file.");
  if (f.version > FILE_VERSION) throw new Error("This file is from a newer version of the app. Update the app first.");
  for (const t of ["dishes", "ingredients", "meals", "weeks", "meta"]) if (!Array.isArray(f.tables[t])) throw new Error(`The file is incomplete (${t} missing).`);
  return f;
}

/** Compare a file with the data on this phone. */
export async function compareWithLocal(f: HouseholdFile) {
  const local = await getMeta<string>("updatedAt", new Date(0).toISOString());
  return { fileIsNewer: f.updatedAt >= local, fileUpdatedAt: f.updatedAt, localUpdatedAt: local };
}

/** Replace everything on this phone with the file's data. */
export async function importAll(f: HouseholdFile) {
  const keepLocal = await db.meta.where("key").anyOf(["lastBackupAt", "lastExportAt"]).toArray();
  await db.transaction("rw", DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) {
      await db.table(t).clear();
      const rows = f.tables[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
    for (const m of keepLocal) await db.meta.put(m);
    await db.meta.put({ key: "updatedAt", value: f.updatedAt });
  });
  await setMeta("lastImportAt", new Date().toISOString());
}

export const backupFileName = (d = new Date()) =>
  `ghar-ka-menu-${d.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
