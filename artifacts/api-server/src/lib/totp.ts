import crypto from "crypto";

const TOKEN_SECRET = process.env["AUTH_TOKEN_SECRET"] || "grove-local-dev-secret-change-before-production";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(TOKEN_SECRET).digest();

/**
 * Encrypts a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-CBC encrypted string
 */
export function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return "";
  try {
    const [ivHex, encryptedHex] = encryptedText.split(":");
    if (!ivHex || !encryptedHex) return "";
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "";
  }
}

/**
 * Decodes a Base32 string to a Buffer
 */
export function decodeBase32(b32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = b32.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error("Invalid base32 character: " + cleaned[i]);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 TOTP secret
 */
export function generateBase32Secret(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += alphabet[randomBytes[i] % alphabet.length];
  }
  return secret;
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret supporting a specified clock skew window.
 */
export function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const cleanedSecret = String(secret).toUpperCase().replace(/[\s-]/g, "");
  if (!cleanedSecret || !code) return false;

  const step = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const t = step + i;
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(t, 4);

    try {
      const key = decodeBase32(cleanedSecret);
      const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const codeInt = hmac.subarray(offset, offset + 4).readUInt32BE(0) & 0x7fffffff;
      const otp = String(codeInt % 1000000).padStart(6, "0");
      if (otp === code) {
        return true;
      }
    } catch (e) {
      // Ignore errors (e.g. invalid base32 in decoding) and try other windows
    }
  }
  return false;
}

/**
 * Generates a list of 8-10 backup codes (e.g., 8-character hex strings)
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate an 8-character random hex code
    codes.push(crypto.randomBytes(4).toString("hex"));
  }
  return codes;
}
