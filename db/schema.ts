import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const researchData = pgTable("research_data", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  collectedData: jsonb("collected_data"),
  thesis: text("thesis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentConfigs = pgTable("agent_configs", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  prompt: text("prompt").notNull(),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResearchDataSchema = createInsertSchema(researchData);
export const selectResearchDataSchema = createSelectSchema(researchData);
export const insertAgentConfigSchema = createInsertSchema(agentConfigs);
export const selectAgentConfigSchema = createSelectSchema(agentConfigs);

export type InsertResearchData = typeof researchData.$inferInsert;
export type SelectResearchData = typeof researchData.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;
export type SelectAgentConfig = typeof agentConfigs.$inferSelect;
