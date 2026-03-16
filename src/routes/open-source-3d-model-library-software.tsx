import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.openSource3dModelLibrarySoftware;

export const Route = createFileRoute("/open-source-3d-model-library-software")({
  component: OpenSource3dModelLibrarySoftwarePage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function OpenSource3dModelLibrarySoftwarePage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
