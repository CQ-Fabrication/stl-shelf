import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, createMarketingHead } from "@/components/marketing/guides/guide-page";
import { guidePages } from "@/components/marketing/guides/guides-data";
import { getSessionFn } from "@/server/functions/auth";

const guide = guidePages.modelPreviewInBrowser;

export const Route = createFileRoute("/3d-model-preview-in-browser")({
  component: ModelPreviewInBrowserPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () =>
    createMarketingHead({
      path: guide.path,
      title: guide.title,
      description: guide.description,
      faqs: guide.faqs,
    }),
});

function ModelPreviewInBrowserPage() {
  const { session } = Route.useLoaderData();
  return <GuidePage guide={guide} session={session} />;
}
