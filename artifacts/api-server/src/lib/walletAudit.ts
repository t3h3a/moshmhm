import { db, walletAuditLogsTable } from "@workspace/db";
import type { Request } from "express";

export async function auditWalletChange(params: {
  userId: number;
  adminId?: number | null;
  action: string;
  amount: string | number;
  oldBalance: string | number;
  newBalance: string | number;
  reason: string;
  req?: Request;
}) {
  try {
    const ip = params.req ? (params.req.ip || params.req.headers["x-forwarded-for"] || params.req.socket.remoteAddress) : null;
    const userAgent = params.req ? params.req.headers["user-agent"] : null;

    const cleanIp = Array.isArray(ip) ? ip[0] : (ip ?? null);

    await db.insert(walletAuditLogsTable).values({
      userId: params.userId,
      adminId: params.adminId ?? null,
      action: params.action,
      amount: String(params.amount),
      oldBalance: String(params.oldBalance),
      newBalance: String(params.newBalance),
      reason: params.reason,
      ip: cleanIp ?? null,
      userAgent: userAgent ?? null,
    });
  } catch (err) {
    console.error("Failed to write wallet audit log", err);
  }
}
