import crypto from "crypto";

const TOKEN_SECRET = process.env["AUTH_TOKEN_SECRET"] || "grove-local-dev-secret-change-before-production";

export function generateAuthToken(userId: number, issuedAt = Date.now(), nonce = crypto.randomBytes(8).toString("hex")) {
  const payload = `${userId}.${issuedAt}.${nonce}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAuthToken(token: string | undefined): number {
  if (!token) return 0;
  const parts = token.split(".");
  if (parts.length !== 4) return 0;
  const [rawUserId, rawIssuedAt, nonce, signature] = parts;
  const userId = Number(rawUserId);
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isInteger(userId) || !Number.isFinite(issuedAt) || !nonce || !signature) return 0;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(`${rawUserId}.${rawIssuedAt}.${nonce}`).digest("hex");
  if (signature.length !== expected.length) return 0;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? userId : 0;
}

const usedChallengeNonces = new Set<string>();

export function generateChallengeToken(userId: number, purpose: string, issuedAt = Date.now(), nonce = crypto.randomBytes(8).toString("hex")) {
  const payload = `${userId}.${purpose}.${issuedAt}.${nonce}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyChallengeToken(token: string | undefined, options: { consume?: boolean } = {}): { userId: number; purpose: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [rawUserId, purpose, rawIssuedAt, nonce, signature] = parts;
  const userId = Number(rawUserId);
  const issuedAt = Number(rawIssuedAt);
  
  if (!Number.isInteger(userId) || !Number.isFinite(issuedAt) || !purpose || !nonce || !signature) return null;
  
  const payload = `${rawUserId}.${purpose}.${rawIssuedAt}.${nonce}`;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  
  const consume = options.consume !== false;

  // Replay protection: check if nonce was already used
  if (consume && usedChallengeNonces.has(nonce)) {
    return null;
  }
  
  // Expiry check: 5 minutes = 300,000 ms
  if (Date.now() - issuedAt > 5 * 60 * 1000) {
    return null;
  }
  
  // Mark nonce as used
  if (consume) usedChallengeNonces.add(nonce);
  
  // Periodic cleanup of very old nonces to prevent unbounded memory growth
  if (usedChallengeNonces.size > 10000) {
    usedChallengeNonces.clear();
  }
  
  return { userId, purpose };
}
