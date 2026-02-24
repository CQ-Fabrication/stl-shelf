import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, createMarketingHead } from "@/components/marketing/guides/guide-page";
import { guidePages } from "@/components/marketing/guides/guides-data";
import { getSessionFn } from "@/server/functions/auth";

const guide = guidePages.versionControlForStlFiles;

export const Route = createFileRoute("/version-control-for-stl-files")({
  component: VersionControlForStlFilesPage,
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

function VersionControlForStlFilesPage() {
  const { session } = Route.useLoaderData();
  return <GuidePage guide={guide} session={session} />;
}
