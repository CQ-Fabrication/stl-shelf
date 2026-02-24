import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, createMarketingHead } from "@/components/marketing/guides/guide-page";
import { guidePages } from "@/components/marketing/guides/guides-data";
import { getSessionFn } from "@/server/functions/auth";

const guide = guidePages.organize3mfFiles;

export const Route = createFileRoute("/organize-3mf-files")({
  component: Organize3mfFilesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () =>
    createMarketingHead({
      path: guide.path,
      title: guide.title,
      description: guide.description,
      faqs: guide.faqs,
    }),
});

function Organize3mfFilesPage() {
  const { session } = Route.useLoaderData();
  return <GuidePage guide={guide} session={session} />;
}
