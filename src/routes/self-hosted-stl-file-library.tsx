import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.selfHostedStlFileLibrary;

export const Route = createFileRoute("/self-hosted-stl-file-library")({
  component: SelfHostedStlFileLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function SelfHostedStlFileLibraryPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
