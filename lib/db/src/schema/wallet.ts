import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const depositsTable = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // credit, debit
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, createdAt: true });
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof depositsTable.$inferSelect;

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

export const walletAuditLogsTable = pgTable("wallet_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  adminId: integer("admin_id"),
  action: text("action").notNull(), // e.g. "deposit_approve", "deposit_reject", "admin_adjust", "order_purchase", "order_refund"
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  oldBalance: numeric("old_balance", { precision: 10, scale: 2 }).notNull(),
  newBalance: numeric("new_balance", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletAuditLogSchema = createInsertSchema(walletAuditLogsTable).omit({ id: true, createdAt: true });
export type InsertWalletAuditLog = z.infer<typeof insertWalletAuditLogSchema>;
export type WalletAuditLog = typeof walletAuditLogsTable.$inferSelect;

