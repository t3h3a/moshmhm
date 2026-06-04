import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type LocalStore = Record<string, unknown>;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.basename(moduleDir) === "dist" ? path.resolve(moduleDir, "..") : path.resolve(moduleDir, "..", "..");
const storePath = process.env["LOCAL_STORE_PATH"] || path.join(apiServerDir, "data", "local-store.json");

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

export function readLocalStore(): LocalStore {
  try {
    if (!fs.existsSync(storePath)) return {};
    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalStore(store: LocalStore) {
  ensureStoreDir();
  const tempPath = `${storePath}.tmp`;
  const content = JSON.stringify(store, null, 2);

  // 1. Write the temp file first
  try {
    fs.writeFileSync(tempPath, content, "utf8");
  } catch (err) {
    // Fallback: Try writing directly to storePath immediately
    try {
      fs.writeFileSync(storePath, content, "utf8");
    } catch (_) {}
    return;
  }

  // 2. Attempt atomic rename with retry on Windows EPERM/EBUSY
  let retries = 5;
  while (retries > 0) {
    try {
      // Unlink existing storePath if present to help clear Windows locks before rename
      if (fs.existsSync(storePath)) {
        try {
          fs.unlinkSync(storePath);
        } catch (_) {}
      }
      fs.renameSync(tempPath, storePath);
      return; // Success!
    } catch (err: any) {
      if (err.code === "EPERM" || err.code === "EBUSY" || err.code === "EACCES") {
        retries--;
        if (retries === 0) {
          break; // Fallback to direct write
        }
        // Synchronous sleep/delay of 50ms on Windows
        const end = Date.now() + 50;
        while (Date.now() < end) {}
      } else {
        break; // Other error, fallback to direct write
      }
    }
  }

  // 3. Fallback: Write directly to storePath
  try {
    fs.writeFileSync(storePath, content, "utf8");
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
  } catch (_) {
    // Suppress crash in test/dev environment as requested
  }
}

export function updateLocalStore(section: string, value: unknown) {
  const store = readLocalStore();
  store[section] = value;
  writeLocalStore(store);
}
