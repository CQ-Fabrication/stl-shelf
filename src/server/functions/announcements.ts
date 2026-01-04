import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { announcements, userAnnouncementReads } from "@/lib/db/schema/announcements";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";

// Zod validators
const listAnnouncementsSchema = z.object({
  cursor: z.number().min(0).optional(),
  limit: z.number().min(1).max(50).default(20),
});

const recentAnnouncementsSchema = z.object({
  limit: z.number().min(1).max(20).default(5),
  gracePeriodDays: z.number().min(1).max(30).default(7),
});

const markAsReadSchema = z.object({
  announcementIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Get unread announcements for the current user
 * Used by the header dropdown - shows only unread
 */
export const getUnreadAnnouncements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const result = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        ctaUrl: announcements.ctaUrl,
        ctaLabel: announcements.ctaLabel,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .leftJoin(
        userAnnouncementReads,
        and(
          eq(userAnnouncementReads.announcementId, announcements.id),
          eq(userAnnouncementReads.userId, context.userId),
        ),
      )
      .where(and(eq(announcements.isDeleted, false), isNull(userAnnouncementReads.readAt)))
      .orderBy(desc(announcements.createdAt));

    return {
      announcements: result.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      unreadCount: result.length,
    };
  });

/**
 * Get recent announcements for the dropdown
 * Shows unread + recently read (within graceful period)
 * This prevents announcements from disappearing immediately after being read
 */
export const getRecentAnnouncements = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(recentAnnouncementsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof recentAnnouncementsSchema>;
      context: AuthenticatedContext;
    }) => {
      const { limit, gracePeriodDays } = data;
      const gracePeriodCutoff = new Date();
      gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - gracePeriodDays);

      // Fetch announcements that are:
      // 1. Not deleted AND
      // 2. Either unread OR read within the graceful period
      const result = await db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          ctaUrl: announcements.ctaUrl,
          ctaLabel: announcements.ctaLabel,
          createdAt: announcements.createdAt,
          readAt: userAnnouncementReads.readAt,
        })
        .from(announcements)
        .leftJoin(
          userAnnouncementReads,
          and(
            eq(userAnnouncementReads.announcementId, announcements.id),
            eq(userAnnouncementReads.userId, context.userId),
          ),
        )
        .where(
          and(
            eq(announcements.isDeleted, false),
            or(
              isNull(userAnnouncementReads.readAt),
              gte(userAnnouncementReads.readAt, gracePeriodCutoff),
            ),
          ),
        )
        .orderBy(desc(announcements.createdAt))
        .limit(limit);

      // Count only truly unread for the badge
      const unreadCount = result.filter((a) => a.readAt === null).length;

      return {
        announcements: result.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          ctaUrl: a.ctaUrl,
          ctaLabel: a.ctaLabel,
          createdAt: a.createdAt.toISOString(),
          isRead: a.readAt !== null,
          readAt: a.readAt?.toISOString() ?? null,
        })),
        unreadCount,
      };
    },
  );

/**
 * Get all announcements with read status for the current user
 * Used by /announcements page - paginated with infinite scroll
 */
export const getAllAnnouncements = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listAnnouncementsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof listAnnouncementsSchema>;
      context: AuthenticatedContext;
    }) => {
      const { cursor, limit } = data;

      const result = await db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          ctaUrl: announcements.ctaUrl,
          ctaLabel: announcements.ctaLabel,
          createdAt: announcements.createdAt,
          readAt: userAnnouncementReads.readAt,
        })
        .from(announcements)
        .leftJoin(
          userAnnouncementReads,
          and(
            eq(userAnnouncementReads.announcementId, announcements.id),
            eq(userAnnouncementReads.userId, context.userId),
          ),
        )
        .where(eq(announcements.isDeleted, false))
        .orderBy(desc(announcements.createdAt))
        .limit(limit + 1)
        .offset(cursor ?? 0);

      const hasMore = result.length > limit;
      const items = hasMore ? result.slice(0, -1) : result;

      return {
        announcements: items.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          ctaUrl: a.ctaUrl,
          ctaLabel: a.ctaLabel,
          createdAt: a.createdAt.toISOString(),
          isRead: a.readAt !== null,
          readAt: a.readAt?.toISOString() ?? null,
        })),
        nextCursor: hasMore ? (cursor ?? 0) + limit : null,
      };
    },
  );

/**
 * Mark announcements as read for the current user
 * Called after 3-second delay, CTA click, or "View all" click
 */
export const markAnnouncementsAsRead = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(markAsReadSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof markAsReadSchema>;
      context: AuthenticatedContext;
    }) => {
      const { announcementIds } = data;

      // Use ON CONFLICT DO NOTHING to handle already-read announcements
      await db
        .insert(userAnnouncementReads)
        .values(
          announcementIds.map((id) => ({
            userId: context.userId,
            announcementId: id,
          })),
        )
        .onConflictDoNothing();

      return { success: true };
    },
  );

/**
 * Get unread count only (for badge indicator)
 * Lightweight query for initial page load
 */
export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(announcements)
      .leftJoin(
        userAnnouncementReads,
        and(
          eq(userAnnouncementReads.announcementId, announcements.id),
          eq(userAnnouncementReads.userId, context.userId),
        ),
      )
      .where(and(eq(announcements.isDeleted, false), isNull(userAnnouncementReads.readAt)));

    return { count: result[0]?.count ?? 0 };
  });
