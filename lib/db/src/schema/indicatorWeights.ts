import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const indicatorWeightsTable = pgTable("indicator_weights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weight: numeric("weight").notNull().default("1.0"),
  correctPredictions: integer("correct_predictions").notNull().default(0),
  totalPredictions: integer("total_predictions").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIndicatorWeightSchema = createInsertSchema(indicatorWeightsTable).omit({ id: true, updatedAt: true });
export type InsertIndicatorWeight = z.infer<typeof insertIndicatorWeightSchema>;
export type IndicatorWeight = typeof indicatorWeightsTable.$inferSelect;
