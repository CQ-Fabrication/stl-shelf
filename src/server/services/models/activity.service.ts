import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { modelFileEvents, models, modelVersions } from "@/lib/db/schema/models";

export type ActivityCursor = {
  createdAt: string;
  id: string;
};

export type ActivityActor = {
  id: string;
  name: string;
  image: string | null;
};

export type ActivityModel = {
  id: string;
  name: string;
  slug: string;
};

export type ActivityVersion = {
  id: string;
  label: string;
};

export type OrgActivityItem = {
  id: string;
  event: string;
  createdAt: string;
  actor: ActivityActor | null;
  ipAddress: string | null;
  // Live entities, present only when they still exist (soft-deleted models are
  // treated as gone so the feed falls back to the denormalized tombstone label).
  model: ActivityModel | null;
  version: ActivityVersion | null;
  // Denormalized tombstone fields — the source of truth for deleted entities.
  filename: string;
  originalName: string;
  modelName: string | null;
  versionLabel: string | null;
};

export type ListOrgActivityInput = {
  organizationId: string;
  cursor?: ActivityCursor;
  limit?: number;
};

export type ListOrgActivityOutput = {
  events: OrgActivityItem[];
  nextCursor: ActivityCursor | null;
};

/**
 * Reverse-chronological feed of destructive events (tombstones) for an org.
 * Keyset-paginated on (createdAt DESC, id DESC) via model_file_events_org_created_idx.
 */
export async function listOrgActivity({
  organizationId,
  cursor,
  limit = 20,
}: ListOrgActivityInput): Promise<ListOrgActivityOutput> {
  const safeLimit = Math.min(100, Math.max(1, limit));

  const conditions = [eq(modelFileEvents.organizationId, organizationId)];

  if (cursor && !Number.isNaN(Date.parse(cursor.createdAt))) {
    conditions.push(sql<boolean>`
      ROW(${modelFileEvents.createdAt}, ${modelFileEvents.id})
      < ROW(CAST(${cursor.createdAt} AS timestamptz), CAST(${cursor.id} AS uuid))
    `);
  }

  const rows = await db
    .select({
      id: modelFileEvents.id,
      event: modelFileEvents.event,
      createdAt: modelFileEvents.createdAt,
      ipAddress: modelFileEvents.ipAddress,
      filename: modelFileEvents.filename,
      originalName: modelFileEvents.originalName,
      modelName: modelFileEvents.modelName,
      versionLabel: modelFileEvents.versionLabel,
      actorId: user.id,
      actorName: user.name,
      actorImage: user.image,
      liveModelId: models.id,
      liveModelName: models.name,
      liveModelSlug: models.slug,
      liveVersionId: modelVersions.id,
      liveVersionLabel: modelVersions.version,
    })
    .from(modelFileEvents)
    .leftJoin(user, eq(user.id, modelFileEvents.actorId))
    .leftJoin(
      models,
      and(
        eq(models.id, modelFileEvents.modelId),
        eq(models.organizationId, organizationId),
        isNull(models.deletedAt),
      ),
    )
    .leftJoin(modelVersions, eq(modelVersions.id, modelFileEvents.versionId))
    .where(and(...conditions))
    .orderBy(desc(modelFileEvents.createdAt), desc(modelFileEvents.id))
    .limit(safeLimit + 1);

  const hasMore = rows.length > safeLimit;
  const items = hasMore ? rows.slice(0, safeLimit) : rows;
  const lastItem = items.at(-1);
  const nextCursor =
    hasMore && lastItem
      ? {
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        }
      : null;

  const events: OrgActivityItem[] = items.map((row) => {
    // leftJoin widens every joined column to `| null`; the DB guarantees the
    // sibling columns are non-null whenever the key column is, so narrow on each.
    const actor: ActivityActor | null =
      row.actorId !== null && row.actorName !== null
        ? { id: row.actorId, name: row.actorName, image: row.actorImage }
        : null;

    const model: ActivityModel | null =
      row.liveModelId !== null && row.liveModelName !== null && row.liveModelSlug !== null
        ? { id: row.liveModelId, name: row.liveModelName, slug: row.liveModelSlug }
        : null;

    const version: ActivityVersion | null =
      row.liveVersionId !== null && row.liveVersionLabel !== null
        ? { id: row.liveVersionId, label: row.liveVersionLabel }
        : null;

    return {
      id: row.id,
      event: row.event,
      createdAt: row.createdAt.toISOString(),
      actor,
      ipAddress: row.ipAddress,
      model,
      version,
      filename: row.filename,
      originalName: row.originalName,
      modelName: row.modelName,
      versionLabel: row.versionLabel,
    };
  });

  return { events, nextCursor };
}

export const activityService = {
  listOrgActivity,
};
