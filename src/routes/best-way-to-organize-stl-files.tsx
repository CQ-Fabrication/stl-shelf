import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.bestWayToOrganizeStlFiles;

export const Route = createFileRoute("/best-way-to-organize-stl-files")({
  component: BestWayToOrganizeStlFilesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function BestWayToOrganizeStlFilesPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
