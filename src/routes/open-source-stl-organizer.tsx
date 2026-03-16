import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.openSourceStlOrganizer;

export const Route = createFileRoute("/open-source-stl-organizer")({
  component: OpenSourceStlOrganizerPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function OpenSourceStlOrganizerPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
