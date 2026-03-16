import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.taggingStlFilesForFastSearch;

export const Route = createFileRoute("/tagging-stl-files-for-fast-search")({
  component: TaggingStlFilesForFastSearchPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function TaggingStlFilesForFastSearchPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
