import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "crypto";
import { generateAuthToken, verifyAuthToken, generateChallengeToken, verifyChallengeToken } from "../lib/authTokens";
import { verifyTOTP, generateBase32Secret, generateBackupCodes, encrypt, decrypt } from "../lib/totp";
import qrcodeLib from "../lib/qrcode";
import { logSecurityEvent } from "../lib/securityAudit";

const router: IRouter = Router();

const attemptLimiter = new Map<string, { count: number; lockUntil: number }>();

function checkRateLimit(key: string, limit = 5, windowMs = 5 * 60 * 1000): { ok: boolean; message?: string } {
  const nowMs = Date.now();
  const state = attemptLimiter.get(key);
  if (state) {
    if (nowMs < state.lockUntil) {
      return { ok: false, message: "Too many attempts. Please wait before trying again." };
    }
    if (state.lockUntil > 0 && nowMs > state.lockUntil) {
      state.count = 1;
      state.lockUntil = 0;
      return { ok: true };
    }
    state.count += 1;
    if (state.count > limit) {
      state.lockUntil = nowMs + windowMs;
      return { ok: false, message: "Too many attempts. Please wait before trying again." };
    }
  } else {
    attemptLimiter.set(key, { count: 1, lockUntil: 0 });
  }
  return { ok: true };
}


function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "grove_salt_2024").digest("hex");
}

function generateToken(userId: number): string {
  return generateAuthToken(userId);
}

function userToResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    walletBalance: parseFloat(user.walletBalance ?? "0"),
    points: user.points,
    rank: user.rank,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    avatar: user.avatar ?? "",
    gender: user.gender ?? "male",
    createdAt: user.createdAt.toISOString(),
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorRequired: user.twoFactorRequired,
    twoFactorVerifiedAt: user.twoFactorVerifiedAt ? user.twoFactorVerifiedAt.toISOString() : null,
    googleSub: user.googleSub ?? undefined,
    googleEmail: user.googleEmail ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    authProvider: (user.authProvider as any) ?? "password",
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  let { name, username, email, password, phone, gender } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing required fields (email and password)" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  if (!username) {
    username = email.split("@")[0] || `user_${Date.now()}`;
  }
  if (!name) {
    name = "مستخدم جديد";
  }

  const selectedGender = (gender === "female") ? "female" : "male";

  const [user] = await db.insert(usersTable).values({
    name,
    username,
    email,
    phone: phone ?? null,
    passwordHash: hashPassword(password),
    role: "user",
    gender: selectedGender,
  }).returning();

  req.log.info({ userId: user.id }, "User registered");
  res.status(201).json({ user: userToResponse(user), token: generateToken(user.id) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  // Rate limiting login attempts
  const limitKey = `login:${String(email).trim().toLowerCase()}:${req.ip}`;
  const rateLimit = checkRateLimit(limitKey, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    res.status(429).json({ error: rateLimit.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Account is banned" });
    return;
  }

  // Determine if user requires 2FA or first-time setup
  const requires2FA = user.twoFactorEnabled;
  const requiresSetup = !user.twoFactorEnabled && (
    user.twoFactorRequired ||
    user.role === "admin" ||
    user.role === "owner" ||
    email.toLowerCase() === "tthhaaeeeerr@gmail.com" ||
    email.toLowerCase() === "qtybhrbas774@gmail.com"
  );

  if (requires2FA) {
    const challengeToken = generateChallengeToken(user.id, "login");
    await logSecurityEvent({ userId: user.id, action: "2FA login challenge issued", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({
      requires2FA: true,
      challengeToken,
      expiresIn: 300
    });
    return;
  }

  if (requiresSetup) {
    const secret = generateBase32Secret();
    await db.update(usersTable).set({
      twoFactorSecret: encrypt(secret),
    }).where(eq(usersTable.id, user.id));
    
    const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
    
    // Generate QR code SVG locally
    const qr = qrcodeLib(0, "M");
    qr.addData(otpauthUrl);
    qr.make();
    const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
    
    const challengeToken = generateChallengeToken(user.id, "setup");
    
    await logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });
    
    res.json({
      requiresSetup2FA: true,
      challengeToken,
      secret,
      qrCode: qrCodeSvg,
      expiresIn: 300
    });
    return;
  }

  // Normal login without 2FA
  await logSecurityEvent({ userId: user.id, action: "Login success (No 2FA)", ip: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ user: userToResponse(user), token: generateToken(user.id) });
});

router.post("/auth/verify-2fa", async (req, res): Promise<void> => {
  const { challengeToken } = req.body;
  const code = String(req.body?.code ?? "").trim().replace(/\s+/g, "");
  if (!challengeToken) {
    res.status(400).json({ error: "Missing 2FA challenge token" });
    return;
  }
  if (!code) {
    res.status(400).json({ error: "Missing 2FA code" });
    return;
  }
  if (!/^\d{6}$/.test(code) && !/^[a-f0-9]{8}$/i.test(code)) {
    res.status(400).json({ error: "Invalid or expired 2FA code" });
    return;
  }

  // Rate limiting verify-2fa
  const rateLimit = checkRateLimit(`verify2fa:${challengeToken}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    res.status(429).json({ error: rateLimit.message });
    return;
  }

  const verified = verifyChallengeToken(challengeToken, { consume: false });
  if (!verified) {
    res.status(400).json({ error: "2FA setup expired please login again" });
    return;
  }

  const { userId, purpose } = verified;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (purpose === "login") {
    // Check TOTP code
    const plainSecret = decrypt(user.twoFactorSecret);
    let isValid = verifyTOTP(plainSecret, code, 1);

    // If invalid, check if it's a backup code
    if (!isValid && code.length === 8) {
      let backupArray = [];
      try {
        backupArray = JSON.parse(decrypt(user.twoFactorBackupCodes) || "[]");
      } catch (_) {
        backupArray = [];
      }
      const idx = backupArray.indexOf(code);
      if (idx !== -1) {
        backupArray.splice(idx, 1);
        await db.update(usersTable).set({
          twoFactorBackupCodes: encrypt(JSON.stringify(backupArray)),
        }).where(eq(usersTable.id, user.id));
        isValid = true;
        await logSecurityEvent({ userId: user.id, action: "backup code used", ip: req.ip, userAgent: req.headers["user-agent"] });
      }
    }

    if (!isValid) {
      await logSecurityEvent({ userId: user.id, action: "2FA login failed", ip: req.ip, userAgent: req.headers["user-agent"] });
      if (process.env["NODE_ENV"] !== "production") console.info("[2FA debug]", { hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: false, codeLength: code.length, verificationResult: false });
      res.status(400).json({ error: "Invalid or expired 2FA code" });
      return;
    }

    if (process.env["NODE_ENV"] !== "production") console.info("[2FA debug]", { hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: false, codeLength: code.length, verificationResult: true });
    await logSecurityEvent({ userId: user.id, action: "2FA login success", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({ user: userToResponse(user), token: generateToken(user.id) });
    return;
  }

  if (purpose === "setup") {
    // Check TOTP code
    const plainSecret = decrypt(user.twoFactorSecret);
    const isValid = verifyTOTP(plainSecret, code, 1);

    if (!isValid) {
      if (process.env["NODE_ENV"] !== "production") console.info("[2FA debug]", { hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: true, codeLength: code.length, verificationResult: false });
      res.status(400).json({ error: "Invalid or expired 2FA code" });
      return;
    }

    // Set 2FA enabled
    const backupCodes = generateBackupCodes(8);
    
    const [updatedUser] = await db.update(usersTable).set({
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
      twoFactorBackupCodes: encrypt(JSON.stringify(backupCodes)),
    }).where(eq(usersTable.id, user.id)).returning();

    await logSecurityEvent({ userId: user.id, action: "2FA enabled", ip: req.ip, userAgent: req.headers["user-agent"] });
    if (process.env["NODE_ENV"] !== "production") console.info("[2FA debug]", { hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: true, codeLength: code.length, verificationResult: true });

    res.json({
      success: true,
      token: generateToken(user.id),
      user: userToResponse(updatedUser),
      backupCodes
    });
    return;
  }

  res.status(400).json({ error: "Invalid challenge purpose" });
});

router.post("/auth/enable-2fa", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) { res.status(401).json({ error: "Invalid token" }); return; }

  // Rate limiting enable-2fa
  const rateLimit = checkRateLimit(`enable2fa:${userId}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    res.status(429).json({ error: rateLimit.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.twoFactorEnabled) {
    res.status(400).json({ error: "2FA is already enabled" });
    return;
  }

  const secret = generateBase32Secret();
  await db.update(usersTable).set({
    twoFactorSecret: encrypt(secret),
  }).where(eq(usersTable.id, user.id));
  
  const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
  
  const qr = qrcodeLib(0, "M");
  qr.addData(otpauthUrl);
  qr.make();
  const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
  
  const challengeToken = generateChallengeToken(user.id, "setup");

  await logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });

  res.json({
    requiresSetup2FA: true,
    challengeToken,
    secret,
    qrCode: qrCodeSvg,
    expiresIn: 300
  });
});

router.post("/auth/disable-2fa", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) { res.status(401).json({ error: "Invalid token" }); return; }

  // Rate limiting disable-2fa
  const rateLimit = checkRateLimit(`disable2fa:${userId}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    res.status(429).json({ error: rateLimit.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { password, code } = req.body;
  if (!password || !code) {
    res.status(400).json({ error: "Password and verification code are required" });
    return;
  }

  // Admins and owners cannot disable 2FA
  if (user.role === "admin" || user.role === "owner" || user.twoFactorRequired) {
    res.status(403).json({ error: "Two-Factor Authentication is mandatory for administrative accounts and cannot be disabled." });
    return;
  }

  // Check password
  if (user.passwordHash !== hashPassword(String(password))) {
    res.status(400).json({ error: "Incorrect password" });
    return;
  }

  // Verify TOTP code
  const plainSecret = decrypt(user.twoFactorSecret);
  const isValid = verifyTOTP(plainSecret, code);
  if (!isValid) {
    res.status(400).json({ error: "Invalid two factor verification code" });
    return;
  }

  // Disable 2FA
  await db.update(usersTable).set({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorVerifiedAt: null,
    twoFactorBackupCodes: null,
  }).where(eq(usersTable.id, user.id));

  await logSecurityEvent({ userId: user.id, action: "2FA disabled", ip: req.ip, userAgent: req.headers["user-agent"] });

  res.json({ success: true, message: "Two-Factor Authentication disabled successfully." });
});

// Admin Reset 2FA route (Owner only)
router.post("/admin/users/:id/reset-2fa", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) { res.status(401).json({ error: "Invalid token" }); return; }

  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!actor) { res.status(404).json({ error: "User not found" }); return; }

  if (actor.role !== "owner") {
    res.status(403).json({ error: "Only the Owner can reset Two-Factor Authentication for administrative accounts." });
    return;
  }

  const targetId = Number(req.params.id);
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Reset 2FA
  await db.update(usersTable).set({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorVerifiedAt: null,
    twoFactorBackupCodes: null,
  }).where(eq(usersTable.id, targetUser.id));

  await logSecurityEvent({
    userId: targetUser.id,
    action: "2FA reset by owner",
    actorId: actor.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });

  res.json({ success: true, message: `Two-Factor Authentication has been reset successfully for ${targetUser.name}.` });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(userToResponse(user));
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) { res.status(401).json({ error: "Invalid token" }); return; }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: "Invalid password input" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.passwordHash !== hashPassword(String(oldPassword))) {
    res.status(400).json({ error: "Wrong old password" });
    return;
  }

  await db.update(usersTable).set({ passwordHash: hashPassword(String(newPassword)) }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/auth/google", async (req, res): Promise<void> => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "Missing ID token" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    logger.error("GOOGLE_CLIENT_ID is not configured in environment");
    res.status(500).json({ error: "Google authentication is not configured on the server" });
    return;
  }

  try {
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) {
      await logSecurityEvent({ userId: 0, action: "google login failed: invalid token", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: "Invalid Google ID Token" });
      return;
    }

    const payload = await verifyRes.json() as any;

    const aud = payload.aud;
    const iss = payload.iss;
    const exp = Number(payload.exp);
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    const sub = payload.sub;
    const email = payload.email;

    if (!sub || !email) {
      await logSecurityEvent({ userId: 0, action: "google login failed: missing claims", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: "Invalid Google token payload" });
      return;
    }

    if (aud !== clientId) {
      logger.warn("Google login failed: client ID mismatch");
      await logSecurityEvent({ userId: 0, action: "google login failed: client ID mismatch", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: "Google ID Token client mismatch" });
      return;
    }

    if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
      logger.warn("Google login failed: issuer mismatch");
      await logSecurityEvent({ userId: 0, action: "google login failed: issuer mismatch", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: "Google ID Token issuer mismatch" });
      return;
    }

    if (exp * 1000 < Date.now()) {
      logger.warn("Google login failed: token expired");
      await logSecurityEvent({ userId: 0, action: "google login failed: token expired", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(401).json({ error: "Google ID Token expired" });
      return;
    }

    if (!emailVerified) {
      logger.warn("Google login failed: email not verified");
      await logSecurityEvent({ userId: 0, action: "google login failed: email not verified", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.status(403).json({ error: "Google email is not verified" });
      return;
    }

    // Process user lookup/creation
    let [user] = await db.select().from(usersTable).where(eq(usersTable.googleSub, sub));
    let accountLinked = false;
    let newCreated = false;

    if (!user) {
      const [existingUserByEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (existingUserByEmail) {
        const authProv = existingUserByEmail.authProvider === "password" || !existingUserByEmail.authProvider ? "both" : existingUserByEmail.authProvider;
        const [updatedUser] = await db.update(usersTable).set({
          googleSub: sub,
          googleEmail: email,
          avatarUrl: payload.picture || null,
          authProvider: authProv
        }).where(eq(usersTable.id, existingUserByEmail.id)).returning();
        
        user = updatedUser;
        accountLinked = true;
        await logSecurityEvent({ userId: user.id, action: "google account linked", ip: req.ip, userAgent: req.headers["user-agent"] });
      } else {
        const username = email.split("@")[0] || `user_${Date.now()}`;
        const name = payload.name || "مستخدم Google";
        const randomPass = crypto.randomBytes(32).toString("hex");
        const passHash = hashPassword(randomPass);

        const [createdUser] = await db.insert(usersTable).values({
          name,
          username,
          email,
          passwordHash: passHash,
          role: "user",
          googleSub: sub,
          googleEmail: email,
          avatarUrl: payload.picture || null,
          authProvider: "google"
        }).returning();

        user = createdUser;
        newCreated = true;
        await logSecurityEvent({ userId: user.id, action: "new google user created", ip: req.ip, userAgent: req.headers["user-agent"] });
      }
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Account is banned" });
      return;
    }

    const requires2FA = user.twoFactorEnabled;
    const requiresSetup = !user.twoFactorEnabled && (
      user.twoFactorRequired ||
      user.role === "admin" ||
      user.role === "owner" ||
      user.email.toLowerCase() === "tthhaaeeeerr@gmail.com" ||
      user.email.toLowerCase() === "qtybhrbas774@gmail.com"
    );

    if (requires2FA) {
      const challengeToken = generateChallengeToken(user.id, "login");
      await logSecurityEvent({ userId: user.id, action: "2FA login challenge issued", ip: req.ip, userAgent: req.headers["user-agent"] });
      res.json({
        requires2FA: true,
        challengeToken,
        expiresIn: 300
      });
      return;
    }

    if (requiresSetup) {
      const secret = generateBase32Secret();
      await db.update(usersTable).set({
        twoFactorSecret: encrypt(secret),
      }).where(eq(usersTable.id, user.id));
      
      const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
      
      const qr = qrcodeLib(0, "M");
      qr.addData(otpauthUrl);
      qr.make();
      const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
      
      const challengeToken = generateChallengeToken(user.id, "setup");
      await logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });
      
      res.json({
        requiresSetup2FA: true,
        challengeToken,
        secret,
        qrCode: qrCodeSvg,
        expiresIn: 300
      });
      return;
    }

    await logSecurityEvent({ userId: user.id, action: "google login success", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.json({ user: userToResponse(user), token: generateToken(user.id) });
  } catch (err: any) {
    logger.error("Google authentication internal error");
    await logSecurityEvent({ userId: 0, action: "google login failed: internal error", ip: req.ip, userAgent: req.headers["user-agent"] });
    res.status(500).json({ error: "Internal server error during Google login" });
  }
});

export default router;
export { userToResponse, hashPassword };
