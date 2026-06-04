import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // user, admin, owner
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  points: integer("points").notNull().default(0),
  rank: text("rank").notNull().default("Bronze"),
  isVerified: boolean("is_verified").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  avatar: text("avatar"),
  gender: text("gender").notNull().default("male"), // male, female
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorVerifiedAt: timestamp("two_factor_verified_at", { withTimezone: true }),
  twoFactorRequired: boolean("two_factor_required").notNull().default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes"),
  googleSub: text("google_sub"),
  googleEmail: text("google_email"),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider").notNull().default("password"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
