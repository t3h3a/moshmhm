import { logger } from "./lib/logger";
import fs from "fs";
import path from "path";

// Load local .env file if it exists (Node 24 local dev fallback)
try {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index !== -1) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        // Strip quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  logger.error({ err: e }, "Failed to load local .env file");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const useMockApi = process.env["LOCAL_MEMORY_API"] === "1" || !process.env["DATABASE_URL"];

// Asset Copying & Restructuring
function copyAssets() {
  try {
    const rootDir = path.resolve("."); // c:\Users\admin\Downloads\Web-Asset-Manager\Web-Asset-Manager
    const parentDir = path.resolve(rootDir, ".."); // c:\Users\admin\Downloads\Web-Asset-Manager
    const publicDir = path.resolve(rootDir, "artifacts", "grove-street", "public");

    const boysDir = path.join(publicDir, "images", "boys");
    const boysAdsDir = path.join(boysDir, "ads");
    const boysCharactersDir = path.join(boysDir, "characters");
    const girlsDir = path.join(publicDir, "images", "girls");
    const girlsAdsDir = path.join(girlsDir, "ads");
    const girlsCharactersDir = path.join(girlsDir, "characters");
    const ffDir = path.join(publicDir, "images", "games", "freefire");
    const pubgDir = path.join(publicDir, "images", "games", "pubg");
    const logoDir = path.join(publicDir, "images", "logo");

    // Ensure directories exist
    [boysAdsDir, boysCharactersDir, girlsAdsDir, girlsCharactersDir, ffDir, pubgDir, logoDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const filesToCopy = [
      { src: "a3lan1.png", dests: [path.join(boysAdsDir, "a3lan1.png"), path.join(publicDir, "a3lan1.png")] },
      { src: "a3lan2.png", dests: [path.join(boysAdsDir, "a3lan2.png"), path.join(publicDir, "a3lan2.png")] },
      { src: "a3lan3.png", dests: [path.join(boysAdsDir, "a3lan3.png"), path.join(publicDir, "a3lan3.png")] },
      { src: "a3lan1g.png", dests: [path.join(girlsAdsDir, "a3lan1g.png"), path.join(publicDir, "a3lan1g.png")] },
      { src: "a3lan2g.png", dests: [path.join(girlsAdsDir, "a3lan2g.png"), path.join(publicDir, "a3lan2g.png")] },
      { src: "logogerl.png", dests: [path.join(girlsCharactersDir, "logogerl.png"), path.join(publicDir, "logogerl.png")] },
      { src: "logogerl2.png", dests: [path.join(girlsCharactersDir, "logogerl2.png"), path.join(publicDir, "logogerl2.png")] },
      { src: "logo.png", dests: [path.join(logoDir, "logo.png"), path.join(publicDir, "logo.png")] },
      { src: "sh7nfreefireicon.png", dests: [path.join(ffDir, "sh7nfreefireicon.png"), path.join(publicDir, "sh7nfreefireicon.png")] },
      { src: "chargre.png", dests: [path.join(boysCharactersDir, "chargre.png"), path.join(publicDir, "chargre.png")] },
      { src: "card.png", dests: [path.join(boysCharactersDir, "card.png"), path.join(publicDir, "card.png")] },
    ];

    filesToCopy.forEach((f) => {
      const srcPath = path.join(parentDir, f.src);
      if (fs.existsSync(srcPath)) {
        f.dests.forEach((destPath) => {
          try {
            fs.copyFileSync(srcPath, destPath);
          } catch (err) {
            logger.error({ err, src: srcPath, dest: destPath }, "Error copying asset file");
          }
        });
      }
    });
    logger.info("Static assets organized and copied successfully.");
  } catch (err) {
    logger.error({ err }, "Asset copying process encountered an error");
  }
}

// Database schema self-healing
async function ensureDatabaseSchema() {
  if (useMockApi) return;
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // 1. Create site_settings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        site_name TEXT NOT NULL DEFAULT 'Grove Street',
        site_description TEXT,
        maintenance_mode TEXT NOT NULL DEFAULT 'false',
        contact_email TEXT,
        contact_phone TEXT,
        social_links TEXT,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Alter verifications table if columns don't exist
    await db.execute(sql`
      ALTER TABLE verifications ADD COLUMN IF NOT EXISTS back_image_url TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE verifications ADD COLUMN IF NOT EXISTS document_type TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE verifications ADD COLUMN IF NOT EXISTS user_notes TEXT;
    `);

    // Alter users table if 2FA columns don't exist
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMP WITH TIME ZONE;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_required BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password';
    `);

    // 3. Create wallet_audit_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wallet_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        admin_id INTEGER,
        action TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        old_balance NUMERIC(10, 2) NOT NULL,
        new_balance NUMERIC(10, 2) NOT NULL,
        reason TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Create security_audit_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        actor_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);


    logger.info("Database schema self-healing check complete.");
  } catch (err) {
    logger.error({ err }, "Database schema self-healing check failed");
  }
}

// Copy assets first
copyAssets();

// Run DB checks
await ensureDatabaseSchema();

const { default: app } = !useMockApi
  ? await import("./app")
  : await import("./mock-app");

if (useMockApi) {
  logger.warn("DATABASE_URL is not set. Running local in-memory API mode.");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
