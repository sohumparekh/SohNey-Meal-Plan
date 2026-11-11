// Small wrappers around Capacitor plugins, with browser fallbacks for development.
import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { Clipboard } from "@capacitor/clipboard";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { backupFileName, exportAll } from "../data/backup";
import { getMeta, setMeta } from "../data/db";

export const isNative = () => Capacitor.isNativePlatform();

/** Opens WhatsApp / Blinkit / the dialer outside the app. */
export async function openExternal(url: string) {
  if (isNative()) await AppLauncher.openUrl({ url });
  else window.open(url, "_blank", "noopener");
}

export async function copyText(text: string) {
  if (isNative()) await Clipboard.write({ string: text });
  else await navigator.clipboard.writeText(text);
}

export async function readClipboard(): Promise<string> {
  if (isNative()) return (await Clipboard.read()).value ?? "";
  return navigator.clipboard.readText();
}

/** "Share plan": writes the household file and opens the Android share sheet (WhatsApp, Drive...). */
export async function sharePlanFile() {
  const json = JSON.stringify(await exportAll());
  const name = backupFileName();
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: "Ghar ka Menu plan", files: [uri], dialogTitle: "Share plan" });
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = name;
    a.click();
  }
  await setMeta("lastExportAt", new Date().toISOString());
}

export const BACKUP_FOLDER = "GharKaMenu";

/**
 * Writes a backup to Documents/GharKaMenu on the phone's shared storage, which is kept
 * if the app is uninstalled. Returns where it went.
 */
export async function writeBackup(): Promise<{ where: string }> {
  const json = JSON.stringify(await exportAll());
  const name = backupFileName();
  if (!isNative()) {
    localStorage.setItem("ghar-ka-menu-last-backup", json);
    await setMeta("lastBackupAt", new Date().toISOString());
    return { where: "browser storage" };
  }
  try {
    await Filesystem.writeFile({ path: `${BACKUP_FOLDER}/${name}`, data: json, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    await pruneOldBackups();
    await setMeta("lastBackupAt", new Date().toISOString());
    await setMeta("lastBackupWhere", `Documents/${BACKUP_FOLDER}`);
    return { where: `Documents/${BACKUP_FOLDER}/${name}` };
  } catch {
    // Older Android without access to shared Documents: keep it in the app's own folder.
    await Filesystem.writeFile({ path: `${BACKUP_FOLDER}/${name}`, data: json, directory: Directory.External, encoding: Encoding.UTF8, recursive: true });
    await setMeta("lastBackupAt", new Date().toISOString());
    await setMeta("lastBackupWhere", `Android/data/<app>/files/${BACKUP_FOLDER} (removed if the app is uninstalled)`);
    return { where: `app folder (use "Share plan" to keep a copy elsewhere)` };
  }
}

/** Keep the 8 newest weekly backups. */
async function pruneOldBackups() {
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_FOLDER, directory: Directory.Documents });
    const ours = files.map((f) => f.name).filter((n) => /^ghar-ka-menu-.*\.json$/.test(n)).sort();
    for (const n of ours.slice(0, Math.max(0, ours.length - 8)))
      await Filesystem.deleteFile({ path: `${BACKUP_FOLDER}/${n}`, directory: Directory.Documents }).catch(() => {});
  } catch {
    /* listing can fail for files left by an earlier install; harmless */
  }
}

/** Weekly automatic backup, checked whenever the app opens or comes to the front. */
export async function autoBackupIfDue() {
  const last = await getMeta<string | null>("lastBackupAt", null);
  if (last && Date.now() - Date.parse(last) < 7 * 24 * 3600 * 1000) return null;
  return writeBackup();
}
