import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '@/lib/orpc';
import { tagService } from '@/services/tags/tag.service';

export const tagsRouter = {
  getAllTags: protectedProcedure.handler(async ({ context }) => {
    const { organizationId } = context;

    const tags = await tagService.getAllTagsForOrganization(organizationId);
    return tags;
  }),
};