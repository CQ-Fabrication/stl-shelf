import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.private3dModelLibrary;

export const Route = createFileRoute("/private-3d-model-library")({
  component: Private3dModelLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function Private3dModelLibraryPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
