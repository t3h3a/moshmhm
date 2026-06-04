import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountListingsTable = pgTable("account_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameId: integer("game_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  rank: text("rank"),
  level: integer("level"),
  region: text("region"),
  imageUrls: text("image_urls"), // JSON array of image URLs
  status: text("status").notNull().default("pending"), // pending, approved, rejected, sold
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountListingSchema = createInsertSchema(accountListingsTable).omit({ id: true, createdAt: true });
export type InsertAccountListing = z.infer<typeof insertAccountListingSchema>;
export type AccountListing = typeof accountListingsTable.$inferSelect;
