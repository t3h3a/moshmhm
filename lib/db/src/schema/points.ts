import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pointsHistoryTable = pgTable("points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rewardsTable = pgTable("rewards", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ranksTable = pgTable("ranks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  minPoints: integer("min_points").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  benefits: text("benefits"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistoryTable).omit({ id: true, createdAt: true });
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistoryTable.$inferSelect;

export const insertRewardSchema = createInsertSchema(rewardsTable).omit({ id: true, createdAt: true });
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewardsTable.$inferSelect;

export const insertRankSchema = createInsertSchema(ranksTable).omit({ id: true, createdAt: true });
export type InsertRank = z.infer<typeof insertRankSchema>;
export type Rank = typeof ranksTable.$inferSelect;
