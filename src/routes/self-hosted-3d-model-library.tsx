import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.selfHosted3dModelLibrary;

export const Route = createFileRoute("/self-hosted-3d-model-library")({
  component: SelfHosted3dModelLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function SelfHosted3dModelLibraryPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
