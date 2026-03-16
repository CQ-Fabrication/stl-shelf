import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.stlShelfVsFolders;

export const Route = createFileRoute("/stl-shelf-vs-folders")({
  component: StlShelfVsFoldersPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function StlShelfVsFoldersPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
