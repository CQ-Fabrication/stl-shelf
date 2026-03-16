import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.privateSelfHostedStlLibrary;

export const Route = createFileRoute("/private-self-hosted-stl-library")({
  component: PrivateSelfHostedStlLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function PrivateSelfHostedStlLibraryPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
