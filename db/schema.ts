import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyticsDaily = sqliteTable("analytics_daily", {
  day: text("day").notNull(),
  event: text("event").notNull(),
  path: text("path").notNull().default("/"),
  source: text("source").notNull().default("direct"),
  campaign: text("campaign").notNull().default("untagged"),
  referrer: text("referrer").notNull().default("direct"),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.day, table.event, table.path, table.source, table.campaign, table.referrer] })]);

export const analyticsVisitors = sqliteTable("analytics_visitors", {
  day: text("day").notNull(),
  visitorId: text("visitor_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.day, table.visitorId] })]);

export const analyticsBudget = sqliteTable("analytics_budget", {
  id: integer("id").primaryKey(),
  minute: integer("minute").notNull(),
  minuteCount: integer("minute_count").notNull(),
  day: text("day").notNull(),
  dayCount: integer("day_count").notNull(),
});
