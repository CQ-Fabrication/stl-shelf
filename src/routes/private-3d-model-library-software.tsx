import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.private3dModelLibrarySoftware;

export const Route = createFileRoute("/private-3d-model-library-software")({
  component: Private3dModelLibrarySoftwarePage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function Private3dModelLibrarySoftwarePage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
