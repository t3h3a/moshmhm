import { logger } from "./logger";

const useMockApi = process.env["LOCAL_MEMORY_API"] === "1" || !process.env["DATABASE_URL"];

export async function logSecurityEvent(input: {
  userId: number;
  action: string;
  ip?: string;
  userAgent?: string;
  actorId?: number;
}) {
  const { userId, action, ip = "", userAgent = "", actorId = null } = input;
  logger.info({ userId, action, ip, userAgent, actorId }, `Security Audit Log: ${action}`);

  if (useMockApi) {
    // In local/mock-app mode, events are logged to the console
    return;
  }

  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      INSERT INTO security_audit_logs (user_id, action, ip, user_agent, actor_id, created_at)
      VALUES (${userId}, ${action}, ${ip}, ${userAgent}, ${actorId}, NOW())
    `);
  } catch (err) {
    logger.error({ err }, "Failed to write to security_audit_logs");
  }
}
