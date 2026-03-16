import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.selfHosted3dModelLibrarySoftware;

export const Route = createFileRoute("/self-hosted-3d-model-library-software")({
  component: SelfHosted3dModelLibrarySoftwarePage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function SelfHosted3dModelLibrarySoftwarePage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
