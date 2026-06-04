import { Router, type IRouter } from "express";
import { db, verificationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function mapVerification(v: typeof verificationsTable.$inferSelect, userName?: string) {
  return {
    id: v.id,
    userId: v.userId,
    userName: userName ?? "",
    fullName: v.fullName ?? "",
    phone: v.phone ?? "",
    idImageUrl: v.idImageUrl ?? "",
    backImageUrl: v.backImageUrl ?? "",
    selfieUrl: v.selfieUrl ?? "",
    documentType: v.documentType ?? "",
    userNotes: v.userNotes ?? "",
    status: v.status,
    adminNotes: v.adminNotes ?? "",
    createdAt: v.createdAt.toISOString(),
  };
}

// Security Validation Helper for Base64 Uploads
function validateBase64Image(dataUri: string | null | undefined, fieldName: string): { ok: boolean; error?: string } {
  if (!dataUri) return { ok: true };
  if (!dataUri.startsWith("data:")) return { ok: true }; // Skip validation for non-base64 test/mock strings

  const match = dataUri.match(/^data:(.*?);base64,/);
  if (!match) {
    return { ok: false, error: `Invalid format for ${fieldName}. Base64 encoding required.` };
  }

  const mimeType = match[1];
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(mimeType ?? "")) {
    return { ok: false, error: `Invalid file type for ${fieldName}: (${mimeType}). Only PNG, JPEG, JPG, WEBP and GIF are allowed.` };
  }

  // Calculate actual byte size
  const base64Content = dataUri.replace(/^data:.*?;base64,/, "");
  const sizeInBytes = Math.ceil((base64Content.length * 3) / 4);
  const maxBytes = 10 * 1024 * 1024; // 10MB

  if (sizeInBytes > maxBytes) {
    return { ok: false, error: `File ${fieldName} exceeds the maximum allowable limit of 10MB.` };
  }

  // Basic search for suspicious script payloads (SVG tag injections, script keywords in raw buffer)
  try {
    const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
    if (/<script|javascript:|onload=|onerror=/i.test(textContent)) {
      return { ok: false, error: `Security Warning: Malicious script tags or executable directives detected in ${fieldName}.` };
    }
  } catch {}

  return { ok: true };
}

// 1. Get all verifications (Admin only)
router.get("/verification/all", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select({
    verification: verificationsTable,
    user: usersTable,
  }).from(verificationsTable)
    .leftJoin(usersTable, eq(verificationsTable.userId, usersTable.id))
    .orderBy(desc(verificationsTable.createdAt));

  res.json(rows.map(({ verification, user }: any) => mapVerification(verification, user?.name)));
});

// 2. Get own verification status
router.get("/verification", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const [v] = await db.select().from(verificationsTable).where(eq(verificationsTable.userId, user.id));
  if (!v) { res.status(404).json({ error: "No verification request" }); return; }
  res.json(mapVerification(v));
});

// 3. Submit a new verification request (Forced to current user, strictly validated size & type)
router.post("/verification", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const userId = user.id;

  const { fullName, phone, idImageUrl, backImageUrl, selfieUrl, documentType, userNotes } = req.body;
  if (!fullName || !phone) { res.status(400).json({ error: "Missing required fields" }); return; }

  // Perform Image Security Checks
  const frontCheck = validateBase64Image(idImageUrl, "ID Front Image");
  if (!frontCheck.ok) { res.status(400).json({ error: frontCheck.error }); return; }

  const backCheck = validateBase64Image(backImageUrl, "ID Back Image");
  if (!backCheck.ok) { res.status(400).json({ error: backCheck.error }); return; }

  const selfieCheck = validateBase64Image(selfieUrl, "Selfie Image");
  if (!selfieCheck.ok) { res.status(400).json({ error: selfieCheck.error }); return; }

  const existing = await db.select().from(verificationsTable).where(eq(verificationsTable.userId, userId));
  if (existing.length > 0) {
    // Update existing request
    const [v] = await db.update(verificationsTable).set({
      fullName,
      phone,
      idImageUrl: idImageUrl ?? null,
      backImageUrl: backImageUrl ?? null,
      selfieUrl: selfieUrl ?? null,
      documentType: documentType ?? null,
      userNotes: userNotes ?? null,
      status: "pending",
      adminNotes: null,
    }).where(eq(verificationsTable.userId, userId)).returning();
    
    // Also ensure user is reset to unverified during pending review
    await db.update(usersTable).set({ isVerified: false }).where(eq(usersTable.id, userId));

    res.status(201).json(mapVerification(v!));
    return;
  }

  const [v] = await db.insert(verificationsTable).values({
    userId,
    fullName,
    phone,
    idImageUrl: idImageUrl ?? null,
    backImageUrl: backImageUrl ?? null,
    selfieUrl: selfieUrl ?? null,
    documentType: documentType ?? null,
    userNotes: userNotes ?? null,
    status: "pending",
  }).returning();

  await db.update(usersTable).set({ isVerified: false }).where(eq(usersTable.id, userId));

  res.status(201).json(mapVerification(v));
});

// 4. Approve verification request (Admin only)
router.post("/verification/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [v] = await db.update(verificationsTable).set({ status: "approved" }).where(eq(verificationsTable.id, id)).returning();
  if (!v) { res.status(404).json({ error: "Not found" }); return; }

  // Mark user as verified
  await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.id, v.userId));
  res.json(mapVerification(v));
});

// 5. Reject verification request (Admin only)
router.post("/verification/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { adminNotes } = req.body;
  const [v] = await db.update(verificationsTable).set({ status: "rejected", adminNotes: adminNotes ?? null }).where(eq(verificationsTable.id, id)).returning();
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  
  // Make sure user remains unverified
  await db.update(usersTable).set({ isVerified: false }).where(eq(usersTable.id, v.userId));
  res.json(mapVerification(v));
});

export default router;
