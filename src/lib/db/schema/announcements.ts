import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user as authUser } from "./auth";

/**
 * Announcements table - broadcast messages to all users
 */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 80 }).notNull(),
    body: varchar("body", { length: 500 }),
    // CTA URL with prefix constraint: internal:/path or external:https://...
    ctaUrl: varchar("cta_url", { length: 500 }),
    ctaLabel: varchar("cta_label", { length: 30 }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("announcements_is_deleted_idx").on(table.isDeleted),
    index("announcements_created_at_idx").on(table.createdAt),
    // Composite index for common query: active announcements by date
    index("announcements_active_idx").on(table.isDeleted, table.createdAt),
  ],
);

/**
 * User announcement reads - tracks when a user has read an announcement
 */
export const userAnnouncementReads = pgTable(
  "user_announcement_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.announcementId] }),
    index("user_announcement_reads_user_idx").on(table.userId),
    index("user_announcement_reads_announcement_idx").on(table.announcementId),
  ],
);

// Relations
export const announcementsRelations = relations(announcements, ({ many }) => ({
  reads: many(userAnnouncementReads),
}));

export const userAnnouncementReadsRelations = relations(userAnnouncementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [userAnnouncementReads.announcementId],
    references: [announcements.id],
  }),
}));

// Type exports
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type UserAnnouncementRead = typeof userAnnouncementReads.$inferSelect;
export type NewUserAnnouncementRead = typeof userAnnouncementReads.$inferInsert;
