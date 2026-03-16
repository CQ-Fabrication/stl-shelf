import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, createSeoPageHead } from "@/components/marketing/seo/seo-page";
import { seoPages } from "@/components/marketing/seo/seo-pages-data";
import { getSessionFn } from "@/server/functions/auth";

const page = seoPages.organizeObjFilesFor3dPrinting;

export const Route = createFileRoute("/organize-obj-files-for-3d-printing")({
  component: OrganizeObjFilesFor3dPrintingPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => createSeoPageHead(page),
});

function OrganizeObjFilesFor3dPrintingPage() {
  const { session } = Route.useLoaderData();
  return <SeoPage page={page} session={session} />;
}
