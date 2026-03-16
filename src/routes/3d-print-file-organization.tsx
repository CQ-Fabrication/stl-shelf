import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.threeDPrintFileOrganization;

export const Route = createFileRoute("/3d-print-file-organization")({
  component: ThreeDPrintFileOrganizationPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function ThreeDPrintFileOrganizationPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
