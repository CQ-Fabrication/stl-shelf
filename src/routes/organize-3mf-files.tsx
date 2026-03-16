import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.organize3mfFiles;

export const Route = createFileRoute("/organize-3mf-files")({
  component: Organize3mfFilesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function Organize3mfFilesPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
