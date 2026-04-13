import { pgTable, text, serial, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  asset: text("asset").notNull(),
  action: text("action").notNull(),
  price: numeric("price").notNull(),
  confidence: integer("confidence").notNull(),
  result: text("result").notNull().default("PENDING"),
  indicators: jsonb("indicators"),
  timeframe: text("timeframe").default("5m"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
