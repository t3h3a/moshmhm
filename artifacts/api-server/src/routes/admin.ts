import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable, depositsTable, productsTable, verificationsTable, supportTicketsTable, siteSettingsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import { verifyAuthToken } from "../lib/authTokens";

const router: IRouter = Router();

function parseMaintenance(value: string | null | undefined) {
  const parsedMaintenance = { general: false, boys: false, girls: false };
  try {
    if (value && value.startsWith("{")) {
      const parsed = JSON.parse(value);
      parsedMaintenance.general = parsed?.general === true;
      parsedMaintenance.boys = parsed?.boys === true;
      parsedMaintenance.girls = parsed?.girls === true;
    } else {
      parsedMaintenance.general = value === "true";
      parsedMaintenance.boys = value === "true";
    }
  } catch {}
  return parsedMaintenance;
}

function publicSocialLinks(value: unknown) {
  let parsed: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    parsed = value as Record<string, unknown>;
  } else if (typeof value === "string") {
    try {
      const next = JSON.parse(value);
      if (next && typeof next === "object" && !Array.isArray(next)) {
        parsed = next as Record<string, unknown>;
      } else if (value.trim()) {
        parsed = { instagram: value.trim() };
      }
    } catch {
      if (value.trim()) parsed = { instagram: value.trim() };
    }
  }
  return JSON.stringify({
    ...(typeof parsed.instagram === "string" ? { instagram: parsed.instagram } : {}),
  });
}

async function getOptionalAdmin(req: AuthenticatedRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.isBanned || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

function settingsResponse(settings: {
  siteName: string;
  siteDescription: string | null;
  maintenanceMode: string;
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: string | null;
}, options: { publicOnly: boolean }) {
  const parsedMaintenance = parseMaintenance(settings.maintenanceMode);
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription ?? "",
    maintenanceMode: parsedMaintenance.general,
    boysMaintenanceMode: parsedMaintenance.boys,
    girlsMaintenanceMode: parsedMaintenance.girls,
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    socialLinks: options.publicOnly ? publicSocialLinks(settings.socialLinks) : (settings.socialLinks ?? ""),
  };
}

// 1. Get admin statistics (Admin only)
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
  const [totalOrdersResult] = await db.select({ count: count() }).from(ordersTable);
  const [totalProductsResult] = await db.select({ count: count() }).from(productsTable);

  const allOrders = await db.select().from(ordersTable);
  const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + parseFloat(o.price), 0);

  const [pendingDepositsResult] = await db.select({ count: count() }).from(depositsTable).where(eq(depositsTable.status, "pending"));
  const [pendingVerificationsResult] = await db.select({ count: count() }).from(verificationsTable).where(eq(verificationsTable.status, "pending"));
  const [openTicketsResult] = await db.select({ count: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open"));

  const recentOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5);

  res.json({
    totalUsers: totalUsersResult?.count ?? 0,
    totalOrders: totalOrdersResult?.count ?? 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    pendingDeposits: pendingDepositsResult?.count ?? 0,
    pendingVerifications: pendingVerificationsResult?.count ?? 0,
    openTickets: openTicketsResult?.count ?? 0,
    totalProducts: totalProductsResult?.count ?? 0,
    recentOrders: recentOrders.map((o: any) => ({
      id: o.id,
      userId: o.userId,
      userName: "",
      productId: o.productId,
      productName: o.productName,
      productNameAr: o.productNameAr ?? "",
      price: parseFloat(o.price),
      status: o.status,
      userInputData: o.userInputData ?? "",
      pointsEarned: o.pointsEarned,
      notes: o.notes ?? "",
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

// 2. Get site settings (Admin or public safe)
router.get("/admin/settings", async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = await getOptionalAdmin(req);
  const settings = await db.select().from(siteSettingsTable).limit(1);
  if (settings.length === 0) {
    res.json({
      siteName: "Grove Street",
      siteDescription: "شارعك الرقمي لشحن الألعاب والخدمات",
      maintenanceMode: false,
      boysMaintenanceMode: false,
      girlsMaintenanceMode: false,
      contactEmail: "",
      contactPhone: "",
      socialLinks: "",
    });
    return;
  }
  const s = settings[0]!;
  if (!admin) {
    res.json(settingsResponse(s, { publicOnly: true }));
    return;
  }
  let parsedMaintenance = { general: false, boys: false, girls: false };
  try {
    if (s.maintenanceMode && s.maintenanceMode.startsWith("{")) {
      parsedMaintenance = JSON.parse(s.maintenanceMode);
    } else {
      parsedMaintenance.general = s.maintenanceMode === "true";
      parsedMaintenance.boys = s.maintenanceMode === "true";
    }
  } catch {}

  res.json({
    siteName: s.siteName,
    siteDescription: s.siteDescription ?? "",
    maintenanceMode: parsedMaintenance.general,
    boysMaintenanceMode: parsedMaintenance.boys,
    girlsMaintenanceMode: parsedMaintenance.girls,
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    socialLinks: s.socialLinks ?? "",
  });
});

// 3. Patch site settings (Admin required, Owner required for sensitive fields like payments/maintenance)
router.patch("/admin/settings", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = req.user!;
  const { siteName, siteDescription, maintenanceMode, boysMaintenanceMode, girlsMaintenanceMode, contactEmail, contactPhone, socialLinks } = req.body;

  // Security Check: Enforce Owner authorization on highly sensitive settings
  const isChangingMaintenance = maintenanceMode !== undefined || boysMaintenanceMode !== undefined || girlsMaintenanceMode !== undefined;
  const isChangingPaymentNumber = contactPhone !== undefined;
  const isChangingSecurityOptions = socialLinks !== undefined;

  if (isChangingMaintenance || isChangingPaymentNumber || isChangingSecurityOptions) {
    if (admin.role !== "owner") {
      res.status(403).json({ error: "Forbidden: Only the owner is authorized to modify payment settings, maintenance modes, or security parameters" });
      return;
    }
  }

  const existing = await db.select().from(siteSettingsTable).limit(1);
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (siteName !== undefined) updates.siteName = siteName;
  if (siteDescription !== undefined) updates.siteDescription = siteDescription;

  // Build the JSON string for maintenance mode
  let currentGeneral = maintenanceMode;
  let currentBoys = boysMaintenanceMode;
  let currentGirls = girlsMaintenanceMode;

  if (existing.length > 0) {
    try {
      const current = existing[0]!;
      if (current.maintenanceMode && current.maintenanceMode.startsWith("{")) {
        const parsed = JSON.parse(current.maintenanceMode);
        if (currentGeneral === undefined) currentGeneral = parsed.general;
        if (currentBoys === undefined) currentBoys = parsed.boys;
        if (currentGirls === undefined) currentGirls = parsed.girls;
      } else {
        if (currentGeneral === undefined) currentGeneral = current.maintenanceMode === "true";
        if (currentBoys === undefined) currentBoys = current.maintenanceMode === "true";
        if (currentGirls === undefined) currentGirls = false;
      }
    } catch {}
  }

  const maintenanceJson = JSON.stringify({
    general: currentGeneral ?? false,
    boys: currentBoys ?? false,
    girls: currentGirls ?? false,
  });
  updates.maintenanceMode = maintenanceJson;

  if (contactEmail !== undefined) updates.contactEmail = contactEmail;
  if (contactPhone !== undefined) updates.contactPhone = contactPhone;
  if (socialLinks !== undefined) updates.socialLinks = socialLinks;

  let s;
  if (existing.length === 0) {
    const [inserted] = await db.insert(siteSettingsTable).values({
      siteName: siteName ?? "Grove Street",
      ...updates,
    }).returning();
    s = inserted!;
  } else {
    const [updated] = await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, existing[0]!.id)).returning();
    s = updated!;
  }

  let responseMaintenance = { general: false, boys: false, girls: false };
  try {
    responseMaintenance = JSON.parse(s.maintenanceMode);
  } catch {}

  res.json({
    siteName: s.siteName,
    siteDescription: s.siteDescription ?? "",
    maintenanceMode: responseMaintenance.general,
    boysMaintenanceMode: responseMaintenance.boys,
    girlsMaintenanceMode: responseMaintenance.girls,
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    socialLinks: s.socialLinks ?? "",
  });
});

export default router;
