import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.organizeStlFiles;

export const Route = createFileRoute("/organize-stl-files")({
  component: OrganizeStlFilesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function OrganizeStlFilesPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
